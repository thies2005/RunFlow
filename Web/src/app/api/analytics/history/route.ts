import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { calculateTrimpFromZones, FALLBACK_TRIMP_PER_MINUTE } from '@/lib/metrics/trimp';
import { calculateFitnessHistory, getActivityContribution, calculateRunningTss, type DailyLoad } from '@/lib/metrics/fitness';
import { calculateMarathonShape, calculateWeightedEffectiveVO2max, type ActivityForShape } from '@/lib/metrics/runalyze';
import { cachedResponse } from '@/lib/api/apiResponse';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Fetch user settings and calibration factor
        const [user, activeGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { hrMax: true, includeCrossTraining: true, vdotCorrectionFactor: true }
            }),
            prisma.goal.findFirst({
                where: { userId, isActive: true },
                select: { marathonShapeFactor: true }
            })
        ]);

        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;
        const maxHR = user?.hrMax || 185;
        const includeCrossTraining = user?.includeCrossTraining ?? true;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1_YEAR'; // Default to 1 year

        // Determine cutoff date for the RESPONSE data
        const now = new Date();
        let cutoff = new Date(now);
        switch (range) {
            case 'ALL': cutoff = new Date(0); break;
            case '6_MONTHS': cutoff.setMonth(now.getMonth() - 6); break;
            case '12_WEEKS': cutoff.setDate(now.getDate() - 84); break;
            case '4_WEEKS': cutoff.setDate(now.getDate() - 28); break;
            case '1_YEAR': default: cutoff.setFullYear(now.getFullYear() - 1); break;
        }

        // --- 1. Update Fitness Cache (Incremental) ---

        // Get the last cached date
        const lastCached = await prisma.dailyFitness.findFirst({
            where: { userId },
            orderBy: { date: 'desc' },
            select: { date: true, ctl: true, atl: true, ctlRunning: true }
        });

        // Determine where to start calculation
        // If we have a cache, start from the next day. 
        // If not, we want to start from the beginning of time (or reasonable history).
        let calcStart = new Date(0);
        let initialCtl = 0;
        let initialAtl = 0;
        let initialCtlRunning = 0;

        if (lastCached && lastCached.date) {
            calcStart = new Date(lastCached.date);
            calcStart.setDate(calcStart.getDate() + 1); // Start next day
            initialCtl = lastCached.ctl;
            initialAtl = lastCached.atl;
            initialCtlRunning = lastCached.ctlRunning;
        } else {
            // If no cache, maybe fetch first activity to define start? 
            // Or just use a default safe start like 2 years ago to avoid processing too much if user has ancient data?
            // Ideally we find the first activity date.
            const firstActivity = await prisma.activity.findFirst({
                where: { userId },
                orderBy: { startDate: 'asc' },
                select: { startDate: true }
            });
            if (firstActivity) {
                calcStart = new Date(firstActivity.startDate);
            }
        }

        // Only calculate if we are behind (calcStart <= now)
        // Normalize calcStart to midnight to compare dates safely
        const calcStartMidnight = new Date(calcStart);
        calcStartMidnight.setHours(0, 0, 0, 0);
        const nowMidnight = new Date();
        nowMidnight.setHours(0, 0, 0, 0);

        if (calcStartMidnight <= nowMidnight) {
            // Fetch NEW activities since the calculation start
            const newActivities = await prisma.activity.findMany({
                where: {
                    userId,
                    startDate: { gte: calcStartMidnight }
                },
                select: {
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    type: true,
                    hrZone1Time: true,
                    hrZone2Time: true,
                    hrZone3Time: true,
                    hrZone4Time: true,
                    hrZone5Time: true,
                    hrZone6Time: true,
                    hrZone7Time: true,
                },
                orderBy: { startDate: 'asc' }
            });

            // Prepare daily loads for the calculator
            const dailyLoadsMap: Map<string, DailyLoad> = new Map();

            newActivities.forEach(a => {
                const dateKey = new Date(a.startDate).toISOString().split('T')[0];

                // Fallback TRIMP
                let trimp = calculateTrimpFromZones(a.hrZone1Time, a.hrZone2Time, a.hrZone3Time, a.hrZone4Time, a.hrZone5Time, a.hrZone6Time, a.hrZone7Time);
                if (trimp === 0 && a.movingTime > 0) {
                    trimp = (a.movingTime / 60) * FALLBACK_TRIMP_PER_MINUTE;
                }

                // TSS Calc
                const contribution = getActivityContribution(a.type || 'RUN');
                const runningTss = contribution.contributesToRunningTss
                    ? calculateRunningTss(a.movingTime, a.distance, 300)
                    : 0;

                const existing = dailyLoadsMap.get(dateKey);
                if (existing) {
                    existing.trimp += trimp;
                    existing.runningTss += runningTss;
                    existing.activityTypes.push(a.type || 'RUN');
                } else {
                    dailyLoadsMap.set(dateKey, {
                        date: new Date(dateKey),
                        trimp,
                        runningTss,
                        activityTypes: [a.type || 'RUN']
                    });
                }
            });

            // Calculate new history
            // We pass the start date explicitly so it fills in gaps (decay) from the last cached date
            const newHistory = calculateFitnessHistory(
                Array.from(dailyLoadsMap.values()),
                initialCtl,
                initialAtl,
                initialCtlRunning,
                calcStartMidnight
            );

            // Batch update DB
            if (newHistory.length > 0) {
                // Prisma createMany is efficient
                await prisma.dailyFitness.createMany({
                    data: newHistory.map(h => ({
                        userId,
                        date: h.date,
                        ctl: h.metrics.ctl,
                        atl: h.metrics.atl,
                        tsb: h.metrics.tsb,
                        ctlRunning: h.metrics.ctlRunning,
                        // We also need to store source data if we want to be able to rebuild... 
                        // The current schema has trimp/runningTss/etc.
                        // We can get these from the dailyLoadsMap
                        trimp: dailyLoadsMap.get(h.date.toISOString().split('T')[0])?.trimp || 0,
                        runningTss: dailyLoadsMap.get(h.date.toISOString().split('T')[0])?.runningTss || 0,
                    })),
                    skipDuplicates: true, // Safety
                });
            }
        }

        // --- 1.5. Ensure Cache is Up-to-Date (Gap Filling) ---
        // If there were no new activities, the block above did nothing.
        // We need to fill gap days with decay up to today.
        await ensureFitnessCacheUpToDate(userId);

        // --- 2. Fetch Data for Response ---

        // A. Fetch Fitness Trends from Cache (now updated)
        const cachedFitness = await prisma.dailyFitness.findMany({
            where: {
                userId,
                date: { gte: cutoff }
            },
            orderBy: { date: 'asc' }
        });

        const filteredFitness = cachedFitness.map(h => ({
            date: h.date.toISOString().split('T')[0],
            ctl: Math.round(h.ctl),
            atl: Math.round(h.atl),
            tsb: Math.round(h.tsb),
        }));


        // B. Fetch All Required Activities (Consolidated Query)
        // We need activities for both the "view range" (cutoff) AND the "marathon shape" (6 months)
        // We fetch the superset and filter in memory to avoid redundant DB calls.
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const minDate = cutoff < sixMonthsAgo ? cutoff : sixMonthsAgo;

        const allActivities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: minDate }
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                type: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
                estimatedVdot: true,
                averageHr: true,
                hasHeartrate: true,
            },
            orderBy: { startDate: 'asc' },
            take: 2000,
        });

        // Filter for View (Volume/Zones)
        const viewActivities = allActivities.filter(a => new Date(a.startDate) >= cutoff);

        // Compute Volume/Zones from viewActivities
        const weeklyVolumeMap: Record<string, number> = {};
        const weeklyZonesMap: Record<string, { z1: number; z2: number; z3: number; z4: number; z5: number; z6: number; z7: number }> = {};
        let totalDistance = 0;
        let totalMovingTime = 0;
        let totalActivities = 0;

        viewActivities.forEach(a => {
            const date = new Date(a.startDate);
            // Week grouping
            const weekDate = new Date(date);
            const day = weekDate.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            weekDate.setDate(weekDate.getDate() + diff);
            const weekKey = weekDate.toISOString().split('T')[0];

            // Summaries (Runs only for consistency)
            if (a.type === 'RUN') {
                totalDistance += a.distance;
                totalMovingTime += a.movingTime;
                totalActivities++;
                weeklyVolumeMap[weekKey] = (weeklyVolumeMap[weekKey] || 0) + (a.distance / 1000);
            }

            // Zone Trend
            if (!weeklyZonesMap[weekKey]) weeklyZonesMap[weekKey] = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };
            weeklyZonesMap[weekKey].z1 += (a.hrZone1Time || 0) / 60;
            weeklyZonesMap[weekKey].z2 += (a.hrZone2Time || 0) / 60;
            weeklyZonesMap[weekKey].z3 += (a.hrZone3Time || 0) / 60;
            weeklyZonesMap[weekKey].z4 += (a.hrZone4Time || 0) / 60;
            weeklyZonesMap[weekKey].z5 += (a.hrZone5Time || 0) / 60;
            weeklyZonesMap[weekKey].z6 += (a.hrZone6Time || 0) / 60;
            weeklyZonesMap[weekKey].z7 += (a.hrZone7Time || 0) / 60;
        });

        // Format Outputs
        const weeklyVolume = Object.entries(weeklyVolumeMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, km]) => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                km: Math.round(km)
            }));

        const zoneTrend = Object.entries(weeklyZonesMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, zones]) => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                Z1: Math.round(zones.z1),
                Z2: Math.round(zones.z2),
                Z3: Math.round(zones.z3),
                Z4: Math.round(zones.z4),
                Z5: Math.round(zones.z5),
                Z6: Math.round(zones.z6),
                Z7: Math.round(zones.z7),
            }));

        const vdotTrend = viewActivities
            .filter(a => a.estimatedVdot && a.estimatedVdot > 0)
            .map(a => ({
                date: new Date(a.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                vdot: Math.round(a.estimatedVdot! * calibrationFactor * 10) / 10,
            }));

        const averagePace = totalDistance > 0 ? (totalMovingTime / totalDistance) * 1000 : 0; // sec/km

        // --- C. Calculate Marathon Shape & VO2max Trends ---

        // Filter for Shape
        const allActivitiesForShape = allActivities.filter(a => new Date(a.startDate) >= sixMonthsAgo);

        // Map to ActivityForShape type
        const runActivitiesForShape: ActivityForShape[] = allActivitiesForShape
            .filter(a => a.type === 'RUN')
            .map(a => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
            }));

        const crossTrainingActivitiesForShape: ActivityForShape[] = allActivitiesForShape
            .filter(a => ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type))
            .map(a => ({
                startDate: a.startDate,
                distance: a.distance,
                movingTime: a.movingTime,
                averageHr: a.averageHr,
                hasHeartrate: a.hasHeartrate,
                type: a.type,
                hrZone1Time: a.hrZone1Time ?? undefined,
                hrZone2Time: a.hrZone2Time ?? undefined,
                hrZone3Time: a.hrZone3Time ?? undefined,
                hrZone4Time: a.hrZone4Time ?? undefined,
                hrZone5Time: a.hrZone5Time ?? undefined,
                hrZone6Time: a.hrZone6Time ?? undefined,
                hrZone7Time: a.hrZone7Time ?? undefined,
            }));

        // Calculate weekly shape trend (last 12 weeks)
        const shapeTrend: { week: string; shape: number }[] = [];
        const vo2Trend: { week: string; vo2: number }[] = [];
        const now2 = new Date();

        let runStartIdx = 0;
        let runEndIdx = 0;
        let crossStartIdx = 0;
        let crossEndIdx = 0;

        for (let i = 11; i >= 0; i--) {
            const weekEnd = new Date(now2.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const weekStart = new Date(weekEnd.getTime() - 182 * 24 * 60 * 60 * 1000); // 6 month lookback for each point

            // Optimized sliding window for runs
            // Note: runActivitiesForShape is sorted by startDate ascending (from Prisma query), which is required for this logic
            while (runStartIdx < runActivitiesForShape.length && new Date(runActivitiesForShape[runStartIdx].startDate) < weekStart) {
                runStartIdx++;
            }
            if (runEndIdx < runStartIdx) runEndIdx = runStartIdx;
            while (runEndIdx < runActivitiesForShape.length && new Date(runActivitiesForShape[runEndIdx].startDate) <= weekEnd) {
                runEndIdx++;
            }
            const weekRuns = runActivitiesForShape.slice(runStartIdx, runEndIdx);

            // Optimized sliding window for cross-training
            while (crossStartIdx < crossTrainingActivitiesForShape.length && new Date(crossTrainingActivitiesForShape[crossStartIdx].startDate) < weekStart) {
                crossStartIdx++;
            }
            if (crossEndIdx < crossStartIdx) crossEndIdx = crossStartIdx;
            while (crossEndIdx < crossTrainingActivitiesForShape.length && new Date(crossTrainingActivitiesForShape[crossEndIdx].startDate) <= weekEnd) {
                crossEndIdx++;
            }
            const weekCrossTraining = crossTrainingActivitiesForShape.slice(crossStartIdx, crossEndIdx);

            // Calculate raw VO2 and apply correction factor (matching stats API)
            const rawVO2 = calculateWeightedEffectiveVO2max(weekRuns, maxHR);
            const effectiveVO2 = rawVO2 ? rawVO2 * vdotCorrectionFactor : 0;

            // Respect user's cross-training preference
            const tempShape = calculateMarathonShape(
                weekRuns,
                effectiveVO2 || 40, // fallback VO2 for calculation
                includeCrossTraining ? weekCrossTraining : undefined
            );

            const weekLabel = weekEnd.toISOString().split('T')[0];
            shapeTrend.push({ week: weekLabel, shape: tempShape.shape });

            if (effectiveVO2 > 0) {
                vo2Trend.push({ week: weekLabel, vo2: Math.round(effectiveVO2 * 10) / 10 });
            }
        }

        return cachedResponse({
            weeklyVolume,
            zoneTrend,
            fitnessTrend: filteredFitness,
            vdotTrend,
            shapeTrend,
            vo2Trend,
            includeCrossTraining, // Let client know the preference used
            totals: {
                distance: Math.round(totalDistance / 1000), // km
                activities: totalActivities,
                averagePace, // sec/km
            }
        }, { maxAge: 300, staleWhileRevalidate: 60 });

    } catch (error) {
        console.error('History API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
