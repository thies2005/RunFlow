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

        // Fetch user for maxHR
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { hrMax: true }
        });
        const maxHR = user?.hrMax || 185;

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

        const activities = await prisma.activity.findMany({
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

        // 1. Calculate Weekly Mileage (Current Week)
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const currentWeekMileage = activities
            .filter(a => new Date(a.startDate) >= monday)
            .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;

        // 2. Calculate VO2max
        const effectiveVO2max = calculateWeightedEffectiveVO2max(activities, maxHR, calibrationFactor);

        // 3. Calculate Marathon Shape
        const marathonShape = calculateMarathonShape(activities, effectiveVO2max);

        return NextResponse.json({
            currentWeekMileage,
            effectiveVO2max,
            marathonShape,
            currentVdot
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
