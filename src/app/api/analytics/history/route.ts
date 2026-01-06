import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { calculateTrimpFromZones } from '@/lib/metrics/trimp';
import { calculateFitnessHistory, getActivityContribution, calculateRunningTss, type DailyLoad } from '@/lib/metrics/fitness';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1_YEAR'; // Default to 1 year

        // Determine cutoff date
        const now = new Date();
        let cutoff = new Date(now);
        switch (range) {
            case 'ALL': cutoff = new Date(0); break;
            case '6_MONTHS': cutoff.setMonth(now.getMonth() - 6); break;
            case '4_WEEKS': cutoff.setDate(now.getDate() - 28); break;
            case '1_YEAR': default: cutoff.setFullYear(now.getFullYear() - 1); break;
        }

        // Fetch activities
        // For fitness calculation (CTL/ATL), we arguably need *more* history than the requested range 
        // to establish a baseline. Ideally we fetch generous history (e.g. 6 months prior to start) 
        // or ALL history if feasible. Let's fetch ALL for now as aggregated data is small,
        // but for high scale we'd optimize this.
        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: range === 'ALL' ? undefined : new Date(now.getFullYear() - 2, 0, 1) } // Fetch extra context (2 years)
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
                estimatedVdot: true,
            },
            orderBy: { startDate: 'asc' },
        });

        // --- Aggregations ---

        // 1. Weekly Volume
        const weeklyVolumeMap: Record<string, number> = {};

        // 2. Zone Trend (Weekly)
        const weeklyZonesMap: Record<string, { z1: number; z2: number; z3: number; z4: number; z5: number }> = {};

        // 3. Fitness Calculations
        const dailyLoadsMap: Map<string, DailyLoad> = new Map();

        // Initialize summaries
        let totalDistance = 0;
        let totalMovingTime = 0;
        let totalActivities = 0;

        activities.forEach(a => {
            const date = new Date(a.startDate);
            const dateKey = date.toISOString().split('T')[0];

            // Week grouping (ISO Mon-Sun would be ideal but simplistic Monday-start is fine)
            // Clone date to get week start
            const weekDate = new Date(date);
            const day = weekDate.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            weekDate.setDate(weekDate.getDate() + diff);
            const weekKey = weekDate.toISOString().split('T')[0];

            // Filter for display range (metrics calculation uses all, but charts use range)
            const isInRange = date >= cutoff;

            if (isInRange) {
                // Summaries (Runs only for consistency)
                if (a.type === 'RUN') {
                    totalDistance += a.distance;
                    totalMovingTime += a.movingTime;
                    totalActivities++;

                    weeklyVolumeMap[weekKey] = (weeklyVolumeMap[weekKey] || 0) + (a.distance / 1000);
                }

                // Zone Trend
                if (!weeklyZonesMap[weekKey]) weeklyZonesMap[weekKey] = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
                weeklyZonesMap[weekKey].z1 += (a.hrZone1Time || 0) / 60;
                weeklyZonesMap[weekKey].z2 += (a.hrZone2Time || 0) / 60;
                weeklyZonesMap[weekKey].z3 += (a.hrZone3Time || 0) / 60;
                weeklyZonesMap[weekKey].z4 += (a.hrZone4Time || 0) / 60;
                weeklyZonesMap[weekKey].z5 += (a.hrZone5Time || 0) / 60;
            }

            // Fitness Load Calculation
            const contribution = getActivityContribution(a.type || 'RUN');
            let trimp = calculateTrimpFromZones(a.hrZone1Time, a.hrZone2Time, a.hrZone3Time, a.hrZone4Time, a.hrZone5Time);
            if (trimp === 0 && a.movingTime > 0) {
                // Fallback TRIMP
                trimp = (a.movingTime / 60) * 2.5;
            }

            const runningTss = contribution.contributesToRunningTss
                ? calculateRunningTss(a.movingTime, a.distance, 300) // Default threshold
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
            }));

        const fitnessHistory = calculateFitnessHistory(Array.from(dailyLoadsMap.values()));

        // Filter fitness history for range
        const filteredFitness = fitnessHistory
            .filter(h => h.date >= cutoff)
            .map(h => ({
                date: h.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                ctl: h.metrics.ctl,
                atl: h.metrics.atl,
                tsb: h.metrics.tsb,
            }));

        const vdotTrend = activities
            .filter(a => new Date(a.startDate) >= cutoff && a.estimatedVdot && a.estimatedVdot > 0)
            .map(a => ({
                date: new Date(a.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                vdot: Math.round(a.estimatedVdot! * 10) / 10,
            }));

        const averagePace = totalDistance > 0 ? (totalMovingTime / totalDistance) * 1000 : 0; // sec/km

        return NextResponse.json({
            weeklyVolume,
            zoneTrend,
            fitnessTrend: filteredFitness,
            vdotTrend,
            totals: {
                distance: Math.round(totalDistance / 1000), // km
                activities: totalActivities,
                averagePace, // sec/km
            }
        });

    } catch (error) {
        console.error('History API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
