import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { bestEffortVdot } from '@/lib/metrics/effectiveVdot';
import { calculateCyclingVo2Max, calculateBikeTss, calculateIntensityFactor } from '@/lib/metrics/power';
import { startOfWeek, endOfWeek, subDays, addDays, format } from 'date-fns';
import { getSyncStatus } from '@/lib/strava/sync';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ensureFitnessCacheUpToDate, resolveActivityEffectiveTss } from '@/lib/metrics/fitnessCache';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { estimateFallbackWorkoutTss } from '@/lib/plan/sportDetection';
import { handleError } from '@/lib/errors/handler';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Parse 'date' query param to anchor "current week"
        const url = new URL(req.url);
        const dateParam = url.searchParams.get('date');
        const refDate = dateParam ? new Date(dateParam) : new Date();

        // Check if refDate is valid
        const validRefDate = !isNaN(refDate.getTime()) ? refDate : new Date();

        // 4-week mesocycle window around validRefDate (subDays(weekStart, 7) to addDays(weekEnd, 14))
        const weekStart = startOfWeek(validRefDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(validRefDate, { weekStartsOn: 1 });
        const mesoStart = subDays(weekStart, 7);
        const mesoEnd = addDays(weekEnd, 14);

        // Try Redis Cache
        // The cache key embeds a per-user version counter that updateSyncStatus()
        // bumps whenever a Strava sync starts or completes, so a sync is never
        // shadowed by a stale cached response.
        const redisClient = await getRedisClient();
        let cacheVersion = '0';
        try {
            cacheVersion = (await redisClient?.get(`dashboard:cachever:${userId}`)) ?? '0';
        } catch (e) {
            console.error('Redis cache version read error:', e);
        }
        const cacheKey = `dashboard:v3:${userId}:${validRefDate.toISOString().split('T')[0]}:${cacheVersion}`;

        try {
            const cachedData = await redisClient?.get(cacheKey);
            if (cachedData) {
                return NextResponse.json(JSON.parse(cachedData), {
                    headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' },
                });
            }
        } catch (e) {
            console.error('Redis cache error:', e);
        }

        // --- PARALLEL DATA FETCHING ---

        // Auto-archive goals where race date was 14+ days ago and no race result linked
        prisma.goal.updateMany({
            where: {
                userId,
                isActive: true,
                raceDate: { lt: subDays(new Date(), 14) },
                raceResult: { is: null },
            },
            data: { isActive: false, completedAt: new Date() },
        }).then(result => {
            if (result.count > 0) {
                logger.info(`Auto-archived ${result.count} overdue goals for user ${userId}`);
            }
        }).catch(() => {
            // Non-critical, don't block the dashboard response
        });

        // 1. User Settings & Active Goals
        const userPromise = prisma.user.findUnique({
            where: { id: userId },
            select: {
                hrMax: true,
                weight: true,
                ftpWatts: true,
                vdotCorrectionFactor: true,
                effectiveVo2maxCorrectionFactor: true,
                includeCrossTraining: true,
                healthTrackingEnabled: true,
                vdotReferenceRaceDate: true,
                autoRevolvingVo2max: true,
                primaryLoadMetric: true,
                uiPreferences: true,
            }
        });

        const activeGoalsPromise = prisma.goal.findMany({
            where: { userId, isActive: true, deletedAt: null },
            orderBy: { raceDate: 'asc' },
            include: {
                workouts: {
                    where: {
                        scheduledDate: {
                            gte: mesoStart,
                            lte: mesoEnd,
                        }
                    },
                    orderBy: { scheduledDate: 'asc' }
                },
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
            }
        });

        const incompleteGoalsPromise = prisma.goal.findMany({
            where: {
                userId,
                isActive: false,
                completedAt: { not: null },
                deletedAt: null,
                raceResult: { is: null },
            },
            orderBy: { completedAt: 'desc' },
            take: 1,
            select: {
                id: true,
                name: true,
                raceType: true,
                raceDate: true,
                targetTime: true,
                planWeeks: true,
                isActive: true,
                completedAt: true,
            },
        });

        // 2. Recent Activities (Limit 10)
        // Optimized: Select only necessary fields for dashboard list
        const recentActivitiesPromise = prisma.activity.findMany({
            where: { userId },
            orderBy: { startDate: 'desc' },
            take: 10,
            select: {
                id: true,
                type: true,
                sportType: true,
                name: true,
                description: true,
                startDate: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                maxSpeed: true,
                gradeAdjustedSpeed: true,
                averageHr: true,
                maxHr: true,
                averageCadence: true,
                hasHeartrate: true,
                totalElevation: true,
                elevHigh: true,
                elevLow: true,
                calories: true,
                trimp: true,
                runningTss: true,
                estimatedVdot: true,
                trainingType: true,
                stravaId: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
                averageWatts: true,
                weightedAverageWatts: true,
                npWatts: true,
                maxWatts: true,
                bikeTss: true,
                intensityFactor: true,
                efficiencyFactor: true,
            }
        });

        // 3. Stats Data Source (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
        const statsActivitiesPromise = prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                id: true,
                name: true,
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true, // M-01: Include stored TRIMP for fitness calculations
                runningTss: true,
                averageHr: true,
                hasHeartrate: true,
                averageWatts: true,
                weightedAverageWatts: true,
                npWatts: true,
                bikeTss: true,
                efficiencyFactor: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            },
            orderBy: { startDate: 'desc' },
            take: 2000,
        });

        // 4. Sync Status
        const syncStatusPromise = getSyncStatus(userId);

        // Execute all promises in parallel
        const [user, goals, recentActivities, statsActivities, syncStatus, incompleteGoals] = await Promise.all([
            userPromise,
            activeGoalsPromise,
            recentActivitiesPromise,
            statsActivitiesPromise,
            syncStatusPromise,
            incompleteGoalsPromise,
        ]);

        // --- METRIC CALCULATION (Server-Side) ---
        const maxHR = user?.hrMax || 185;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;
        const effectiveVo2maxCorrectionFactor = user?.effectiveVo2maxCorrectionFactor ?? 1.0;
        const includeCrossTraining = user?.includeCrossTraining ?? false;
        const autoRevolvingVo2max = user?.autoRevolvingVo2max || null;

        // Split for stats logic
        const runActivities = statsActivities.filter(a => a.type === 'RUN');
        const crossTrainingActivities = statsActivities.filter(a =>
            ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type)
        );

        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);

        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
        const threeMonthRunDist = runActivities
            .filter(a => new Date(a.startDate) >= twelveWeeksAgo)
            .reduce((sum, a) => sum + (a.distance || 0), 0);
        const monday = (date: Date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const threeMonthPeriodStart = monday(twelveWeeksAgo);
        const threeMonthPeriodEnd = monday(new Date());
        const weeksInThreeMonths = Math.max(1, Math.round((threeMonthPeriodEnd.getTime() - threeMonthPeriodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const avgWeeklyKmLast3Months = Math.round(((threeMonthRunDist / weeksInThreeMonths / 1000) * 10)) / 10;
        // Aerobic-fitness trend (HR-based). Display/trend only — never
        // feeds paces or planning. Scaled by the effective VO2max correction
        // factor (Shared-Baseline pipeline), not the pace factor.
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHR, effectiveVo2maxCorrectionFactor);

        // Planning VDOT: best-effort performance VDOT, computed live so it can
        // never lag behind the latest activities. The persisted
        // autoRevolvingVo2max (which stores the best-effort VDOT since the
        // two-metric change) is only a fallback for when no run qualifies
        // (>= 5 km within 90 days).
        const computedVdot = bestEffortVdot(runActivities, vdotCorrectionFactor);
        const vdot = computedVdot > 0
            ? computedVdot
            : (autoRevolvingVo2max || 0);

        // Conditionally include cross-training based on user preference
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );

        // --- Fitness Metrics Logic Updated ---
        // Use cached DailyFitness for accurate long-term values, consistent with Analytics page.
        let ctl = 0;
        let atl = 0;
        let tsb = 0;
        let workloadRatio = 0;
        let maxCtl = 0;
        let maxAtl = 0;

        // First ensure cache is up to date, THEN fetch max values
        const currentFitness = await ensureFitnessCacheUpToDate(userId);

        // Now fetch max (after cache is updated)
        const maxFitnessValues = await prisma.dailyFitness.aggregate({
            where: { userId },
            _max: {
                ctl: true,
                atl: true
            }
        });

        if (currentFitness) {
            ctl = Math.round(currentFitness.ctl);
            atl = Math.round(currentFitness.atl);
            tsb = Math.round(currentFitness.tsb);
            // Re-calculate ratio from the source values to ensure precision
            workloadRatio = currentFitness.ctl > 0 ? parseFloat((currentFitness.atl / currentFitness.ctl).toFixed(2)) : 0;
        } else {
            // Fallback for brand new users with no history cache yet
            const { ctl: calcCtl, atl: calcAtl, tsb: calcTsb, workloadRatio: calcRatio } = AnalyticsService.calculateFitnessMetrics(runActivities);
            ctl = calcCtl;
            atl = calcAtl;
            tsb = calcTsb;
            workloadRatio = calcRatio;
        }

        // Ensure max values are at least the current values
        maxCtl = Math.max(Math.round(maxFitnessValues._max.ctl || 0), ctl);
        maxAtl = Math.max(Math.round(maxFitnessValues._max.atl || 0), atl);

        const easyTrimp = AnalyticsService.calculateEasyTrimp(runActivities);

        // Compute Cycling Dashboard Metrics
        const weightKg = user?.weight && user.weight > 0 ? user.weight : 75;
        let bestRideFtp = user?.ftpWatts ?? null;
        let weeklyBikeMeters = 0;
        let weeklyBikeTss = 0;
        let efSum = 0;
        let efCount = 0;

        for (const ca of crossTrainingActivities) {
            if (ca.type === 'RIDE' || ca.type === 'VIRTUAL_RIDE') {
                const titleMatch = (ca.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
                const titleW = titleMatch ? parseInt(titleMatch[1], 10) : null;
                const validTitleW = titleW && titleW >= 40 && titleW <= 1500 ? titleW : null;
                const rideSustained = ca.npWatts ?? ca.weightedAverageWatts ?? ca.averageWatts ?? validTitleW;
                if (rideSustained && rideSustained > 0) {
                    const estFtp = /\bftp\s*test\b/i.test(ca.name || '') && validTitleW
                        ? validTitleW
                        : Math.round(rideSustained * 0.95);
                    if (!bestRideFtp || estFtp > bestRideFtp) {
                        bestRideFtp = estFtp;
                    }
                }
            }
        }

        const resolvedFtp = bestRideFtp || 200;
        for (const ca of crossTrainingActivities) {
            if (ca.type === 'RIDE' || ca.type === 'VIRTUAL_RIDE') {
                const rideDate = new Date(ca.startDate);
                const np = ca.npWatts ?? ca.weightedAverageWatts ?? ca.averageWatts ?? null;
                const tss = ca.bikeTss ?? (np && ca.movingTime > 0
                    ? calculateBikeTss(ca.movingTime, np, calculateIntensityFactor(np, resolvedFtp) || 0, resolvedFtp)
                    : Math.round((ca.movingTime / 3600) * 50));
                if (rideDate >= weekStart) {
                    weeklyBikeMeters += ca.distance || 0;
                    weeklyBikeTss += tss || 0;
                }
                const ef = ca.efficiencyFactor ?? (np && ca.averageHr && ca.averageHr > 0 ? Number((np / ca.averageHr).toFixed(2)) : null);
                if (ef && ef > 0) {
                    efSum += ef;
                    efCount++;
                }
            }
        }

        const cyclingVo2max = bestRideFtp
            ? calculateCyclingVo2Max({ ftpWatts: bestRideFtp, weightKg })
            : null;
        const wPerKg = bestRideFtp ? Number((bestRideFtp / weightKg).toFixed(2)) : null;
        const weeklyBikeKm = Math.round((weeklyBikeMeters / 1000) * 10) / 10;
        const avgEfficiencyFactor = efCount > 0 ? Number((efSum / efCount).toFixed(2)) : null;
        const ctlBike = Math.round((currentFitness as { ctlBike?: number } | null)?.ctlBike || 0);
        const atlBike = Math.round((currentFitness as { atlBike?: number } | null)?.atlBike || 0);
        const tsbBike = Math.round((currentFitness as { tsbBike?: number } | null)?.tsbBike ?? (ctlBike - atlBike));

        // --- AUTO-LINK SUGGESTIONS (Decision U2) ---
        const isSameSport = (workoutSport: string | undefined | null, workoutType: string, actType: string) => {
            const wSport = (workoutSport || '').toUpperCase();
            const wType = (workoutType || '').toUpperCase();
            const aType = (actType || '').toUpperCase();

            if (wSport === 'BIKE' || wType === 'LONG_RIDE' || wType === 'RIDE_INTERVALS' || wType === 'RECOVERY_SPIN') {
                return aType === 'RIDE' || aType === 'VIRTUAL_RIDE';
            }
            if (wSport === 'SWIM' || wType === 'SWIM') {
                return aType === 'SWIM';
            }
            if (wSport === 'STRENGTH' || wType === 'STRENGTH' || wType === 'WORKOUT') {
                return aType === 'WORKOUT' || aType === 'OTHER';
            }
            return aType === 'RUN';
        };

        const computeDiffRatio = (
            workout: { targetDistance?: number | null; targetDuration?: number | null },
            activity: { distance?: number | null; movingTime?: number | null }
        ) => {
            const actDist = activity.distance || 0;
            const actDur = activity.movingTime || 0;
            const planDist = workout.targetDistance || 0;
            const planDur = workout.targetDuration || 0;

            if (planDist > 0 && actDist > 0) {
                return Math.abs(actDist - planDist) / planDist;
            }
            if (planDur > 0 && actDur > 0) {
                return Math.abs(actDur - planDur) / planDur;
            }
            if (planDist === 0 && planDur === 0) {
                return 0;
            }
            return 1.0;
        };

        const allWorkouts = goals.flatMap(g => g.workouts);
        const linkedActivityIds = new Set<string>();
        for (const w of allWorkouts) {
            if (w.linkedActivityId) {
                linkedActivityIds.add(w.linkedActivityId);
            }
        }

        const suggestedActIds = new Set<string>();
        for (const w of allWorkouts) {
            if (!w.isCompleted && !w.linkedActivityId) {
                const workoutDay = format(new Date(w.scheduledDate), 'yyyy-MM-dd');
                const candidates = statsActivities.filter(a => {
                    if (!a.id || linkedActivityIds.has(a.id) || suggestedActIds.has(a.id)) return false;
                    const actDay = format(new Date(a.startDate), 'yyyy-MM-dd');
                    if (actDay !== workoutDay) return false;
                    if (!isSameSport(w.sport, w.workoutType, a.type)) return false;
                    const diff = computeDiffRatio(w, a);
                    return diff <= 0.60;
                });

                if (candidates.length > 0) {
                    candidates.sort((c1, c2) => computeDiffRatio(w, c1) - computeDiffRatio(w, c2));
                    const best = candidates[0];
                    suggestedActIds.add(best.id);
                    (w as any).suggestedActivity = {
                        id: best.id,
                        name: best.name,
                        distance: best.distance,
                        movingTime: best.movingTime,
                    };
                } else {
                    (w as any).suggestedActivity = null;
                }
            } else {
                (w as any).suggestedActivity = null;
            }
        }

        // --- WEEKLY & 4-WEEK BLOCK EFFORT (Task 4.3) ---
        const w1Start = subDays(weekStart, 7);
        const w1End = endOfWeek(w1Start, { weekStartsOn: 1 });
        const w2Start = weekStart;
        const w2End = weekEnd;
        const w3Start = addDays(weekStart, 7);
        const w3End = endOfWeek(w3Start, { weekStartsOn: 1 });
        const w4Start = addDays(weekStart, 14);
        const w4End = endOfWeek(w4Start, { weekStartsOn: 1 });

        const mesoWeeks = [
            { label: 'W1', index: 1, start: w1Start, end: w1End, isCurrent: false },
            { label: 'W2', index: 2, start: w2Start, end: w2End, isCurrent: true },
            { label: 'W3', index: 3, start: w3Start, end: w3End, isCurrent: false },
            { label: 'W4', index: 4, start: w4Start, end: w4End, isCurrent: false },
        ];

        let weeklyPlannedTss = 0;
        let weeklyActualTss = 0;
        let weeklyPlannedBikeTss = 0;
        let weeklyPlannedDurationSec = 0;
        let weeklyActualDurationSec = 0;
        let weeklyPlannedTrimp = 0;
        let weeklyActualTrimp = 0;

        let monthlyPlannedTss = 0;
        let monthlyActualTss = 0;
        let monthlyPlannedDurationSec = 0;
        let monthlyActualDurationSec = 0;

        const getEffectiveTss = typeof resolveActivityEffectiveTss === 'function'
            ? resolveActivityEffectiveTss
            : (a: any, rTss: number, bTss: number, trimp: number) => {
                const type = (a.type || '').toUpperCase();
                if (type === 'RIDE' || type === 'VIRTUAL_RIDE') return bTss > 0 ? bTss : Math.round(trimp * 0.85);
                if (type === 'RUN') return rTss > 0 ? rTss : Math.round(trimp * 0.85);
                if (type === 'WORKOUT' || type === 'STRENGTH') return Math.max(trimp, Math.round(((a.movingTime || 0) / 3600) * 36));
                return trimp > 0 ? Math.round(trimp * 0.85) : Math.round(((a.movingTime || 0) / 3600) * 40);
            };

        const getWorkoutPlannedTss = typeof calculateWorkoutPlannedTss === 'function'
            ? calculateWorkoutPlannedTss
            : (_w: any) => 0;

        const monthlyWeeksBreakdown = mesoWeeks.map(mw => {
            const weekWorkouts = allWorkouts.filter(w => {
                const wd = new Date(w.scheduledDate);
                return wd >= mw.start && wd <= mw.end;
            });

            let wPlannedTss = 0;
            let wPlannedDur = 0;
            let wPlannedBikeTss = 0;
            let wPlannedTrimp = 0;

            for (const w of weekWorkouts) {
                const pTss: number = (w.plannedTss != null && w.plannedTss > 0)
                    ? w.plannedTss
                    : (getWorkoutPlannedTss(w as any) || 0);
                let pDur = w.targetDuration ?? 0;
                if (pDur <= 0 && w.targetDistance && w.targetPace) {
                    pDur = Math.round((w.targetDistance * w.targetPace) / 1000);
                }
                const isBike = w.sport === 'BIKE' || w.workoutType === 'LONG_RIDE' || w.workoutType === 'RIDE_INTERVALS';

                wPlannedTss += pTss;
                wPlannedDur += pDur;
                if (isBike) {
                    wPlannedBikeTss += pTss;
                }
                wPlannedTrimp += Math.round(pTss / 0.85);
            }

            const weekActs = statsActivities.filter(a => {
                const ad = new Date(a.startDate);
                return ad >= mw.start && ad <= mw.end;
            });

            let wActualTss = 0;
            let wActualDur = 0;
            let wActualTrimp = 0;

            const countedActivityIds = new Set(weekActs.map(a => a.id));

            for (const a of weekActs) {
                const effTss = getEffectiveTss(a, a.runningTss ?? 0, a.bikeTss ?? 0, a.trimp ?? 0);
                wActualTss += effTss;
                wActualDur += a.movingTime || 0;
                wActualTrimp += a.trimp ? Math.round(a.trimp) : (a.movingTime ? Math.round((a.movingTime / 60) * 2.5) : 0);
            }

            // Include completed workouts that don't already have a counted activity in this week
            for (const w of weekWorkouts) {
                if (w.isCompleted && (!w.linkedActivityId || !countedActivityIds.has(w.linkedActivityId))) {
                    const fallbackTss = estimateFallbackWorkoutTss(w as any);
                    wActualTss += fallbackTss;
                    wActualDur += w.targetDuration || 0;
                    wActualTrimp += Math.round(fallbackTss / 0.85);
                }
            }

            if (mw.isCurrent) {
                weeklyPlannedTss = wPlannedTss;
                weeklyActualTss = wActualTss;
                weeklyPlannedBikeTss = wPlannedBikeTss;
                weeklyPlannedDurationSec = wPlannedDur;
                weeklyActualDurationSec = wActualDur;
                weeklyPlannedTrimp = wPlannedTrimp;
                weeklyActualTrimp = wActualTrimp;
            }

            monthlyPlannedTss += wPlannedTss;
            monthlyActualTss += wActualTss;
            monthlyPlannedDurationSec += wPlannedDur;
            monthlyActualDurationSec += wActualDur;

            return {
                weekLabel: mw.label,
                weekIndex: mw.index,
                startDate: format(mw.start, 'yyyy-MM-dd'),
                endDate: format(mw.end, 'yyyy-MM-dd'),
                plannedTss: Math.round(wPlannedTss),
                actualTss: Math.round(wActualTss),
                plannedDurationSec: Math.round(wPlannedDur),
                actualDurationSec: Math.round(wActualDur),
                isCurrentWeek: mw.isCurrent,
            };
        });

        const stats = {
            currentWeekMileage,
            vdot,
            effectiveVO2max,
            rawVO2max,
            cyclingVo2max,
            activeFtpWatts: bestRideFtp,
            wPerKg,
            weeklyBikeTss: Math.round(weeklyBikeTss),
            weeklyBikeKm,
            ctlBike,
            atlBike,
            tsbBike,
            avgEfficiencyFactor,
            vdotCorrectionFactor,
            effectiveVo2maxCorrectionFactor,
            autoRevolvingVo2max,
            marathonShape,
            currentVdot: goals[0]?.currentVdot || null,
            ctl,
            atl,
            tsb,
            workloadRatio,
            easyTrimp,
            hrMax: maxHR,
            maxCtl,
            maxAtl,
            avgWeeklyKmLast3Months,
            healthTrackingEnabled: user?.healthTrackingEnabled ?? false,
            primaryLoadMetric: user?.primaryLoadMetric ?? 'TSS',
            uiPreferences: user?.uiPreferences ?? null,
            weeklyPlannedTss: Math.round(weeklyPlannedTss),
            weeklyActualTss: Math.round(weeklyActualTss),
            weeklyPlannedBikeTss: Math.round(weeklyPlannedBikeTss),
            weeklyPlannedDurationSec: Math.round(weeklyPlannedDurationSec),
            weeklyActualDurationSec: Math.round(weeklyActualDurationSec),
            weeklyPlannedTrimp: Math.round(weeklyPlannedTrimp),
            weeklyActualTrimp: Math.round(weeklyActualTrimp),
            monthlyPlannedTss: Math.round(monthlyPlannedTss),
            monthlyActualTss: Math.round(monthlyActualTss),
            monthlyPlannedDurationSec: Math.round(monthlyPlannedDurationSec),
            monthlyActualDurationSec: Math.round(monthlyActualDurationSec),
            monthlyWeeksBreakdown,
            blockWeeksBreakdown: monthlyWeeksBreakdown,
        };

        // Serialize BigInt for recent activities
        const serializedActivities = recentActivities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString()
        }));

        const responseData = {
            stats,
            recentActivities: { activities: serializedActivities },
            goals: { goals },
            incompleteGoal: incompleteGoals[0] || null,
            syncStatus
        };

        try {
            await redisClient?.set(cacheKey, JSON.stringify(responseData), { ex: 60 });
        } catch (e) {
            console.error('Redis cache set error:', e);
        }

        return NextResponse.json(responseData, {
            headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' },
        });

    } catch (error) {
        return handleError(error);
    }
}
