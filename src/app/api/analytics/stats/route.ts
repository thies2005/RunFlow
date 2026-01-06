import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth'; // Adjust path if needed, confirmed in previous steps it's likely here or lib/auth
import { prisma } from '@/lib/db';
import { calculateWeightedEffectiveVO2max, calculateMarathonShape } from '@/lib/metrics/runalyze';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Fetch user for maxHR and vdotCorrectionFactor
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true, vdotCorrectionFactor: true }
        });
        const maxHR = user?.hrMax || 185;
        const vdotCorrectionFactor = user?.vdotCorrectionFactor || 1.0;

        // Fetch active goal for VDOT
        const activeGoal = await prisma.goal.findFirst({
            where: { userId, isActive: true },
        });
        const currentVdot = activeGoal?.currentVdot || null;
        const calibrationFactor = activeGoal?.marathonShapeFactor || 1.0;

        // Fetch activities for calculations
        // We need enough history for VO2max (recent) and Shape (6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Fetch running activities
        const runActivities = await prisma.activity.findMany({
            where: {
                userId,
                type: 'RUN', // Only runs for main stats
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                averageHr: true,
                hasHeartrate: true,
                type: true,
            },
            orderBy: { startDate: 'desc' },
        });

        // Fetch cross-training activities with zone data
        const crossTrainingActivities = await prisma.activity.findMany({
            where: {
                userId,
                type: { in: ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'] },
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                startDate: true,
                distance: true,
                movingTime: true,
                averageHr: true,
                hasHeartrate: true,
                type: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        // 1. Calculate Weekly Mileage (Current Week)
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const currentWeekMileage = runActivities
            .filter(a => new Date(a.startDate) >= monday)
            .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;

        // 2. Calculate VO2max (raw) and apply correction factor
        const rawVO2max = calculateWeightedEffectiveVO2max(runActivities, maxHR, calibrationFactor);
        const effectiveVO2max = Math.round(rawVO2max * vdotCorrectionFactor * 10) / 10;

        // 3. Calculate Marathon Shape (with cross-training support)
        const marathonShape = calculateMarathonShape(
            runActivities,
            effectiveVO2max,
            crossTrainingActivities.map(a => ({
                ...a,
                hrZone2Time: a.hrZone2Time ?? undefined,
                hrZone3Time: a.hrZone3Time ?? undefined,
                hrZone4Time: a.hrZone4Time ?? undefined,
            }))
        );

        // 4. Calculate CTL/ATL/TSB (Fitness/Fatigue/Form)
        const dailyLoads = new Map<string, number>();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        runActivities
            .filter(a => new Date(a.startDate) >= ninetyDaysAgo)
            .forEach(run => {
                const dateKey = new Date(run.startDate).toISOString().split('T')[0];
                const trimp = run.movingTime / 60; // Simplified TRIMP
                dailyLoads.set(dateKey, (dailyLoads.get(dateKey) || 0) + trimp);
            });

        let ctl = 0, atl = 0;
        for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const load = dailyLoads.get(dateKey) || 0;
            ctl = ctl + (load - ctl) / 42;
            atl = atl + (load - atl) / 7;
        }
        const tsb = ctl - atl;

        // 5. Calculate Workload Ratio (Acute:Chronic = ATL:CTL)
        const workloadRatio = ctl > 0 ? Math.round((atl / ctl) * 100) / 100 : 0;

        // 6. Calculate Easy TRIMP (sum of last 7 days training load)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const easyTrimp = runActivities
            .filter(a => new Date(a.startDate) >= sevenDaysAgo)
            .reduce((sum, a) => sum + (a.movingTime / 60), 0);

        return NextResponse.json({
            currentWeekMileage,
            effectiveVO2max,
            rawVO2max,
            vdotCorrectionFactor,
            marathonShape,
            currentVdot,
            ctl: Math.round(ctl),
            atl: Math.round(atl),
            tsb: Math.round(tsb),
            workloadRatio,
            easyTrimp: Math.round(easyTrimp)
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
