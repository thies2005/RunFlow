import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: { scheduledDate: 'asc' },
            select: {
                workoutType: true,
                scheduledDate: true,
                targetDistance: true,
                targetDuration: true,
                phase: true,
                isCompleted: true,
            },
        });

        const totalDistance = workouts.reduce((sum, w) => sum + (w.targetDistance || 0), 0);
        const totalDuration = workouts.reduce((sum, w) => sum + (w.targetDuration || 0), 0);
        const completedCount = workouts.filter(w => w.isCompleted).length;
        const totalCount = workouts.length;

        const typeDistribution: Record<string, number> = {};
        const phaseDistribution: Record<string, number> = {};
        const weeklyVolume: Record<string, { distance: number; duration: number; count: number }> = {};

        for (const w of workouts) {
            typeDistribution[w.workoutType] = (typeDistribution[w.workoutType] || 0) + 1;
            phaseDistribution[w.phase] = (phaseDistribution[w.phase] || 0) + 1;

            const date = new Date(w.scheduledDate);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyVolume[weekKey]) {
                weeklyVolume[weekKey] = { distance: 0, duration: 0, count: 0 };
            }
            weeklyVolume[weekKey].distance += w.targetDistance || 0;
            weeklyVolume[weekKey].duration += w.targetDuration || 0;
            weeklyVolume[weekKey].count += 1;
        }

        const weeklyVolumeArray = Object.entries(weeklyVolume)
            .map(([week, data]) => ({ week, ...data }))
            .sort((a, b) => a.week.localeCompare(b.week));

        const avgWeeklyDistance = weeklyVolumeArray.length > 0
            ? weeklyVolumeArray.reduce((sum, w) => sum + w.distance, 0) / weeklyVolumeArray.length
            : 0;

        const peakWeek = weeklyVolumeArray.reduce<{ week: string; distance: number } | null>((peak, w) => {
            if (!peak || w.distance > peak.distance) {
                return w;
            }
            return peak;
        }, null)?.week ?? null;

        return NextResponse.json({
            analysis: {
                totalDistance,
                totalDuration,
                totalWorkouts: totalCount,
                completedWorkouts: completedCount,
                completionRate: totalCount > 0 ? completedCount / totalCount : 0,
                typeDistribution,
                phaseDistribution,
                weeklyVolume: weeklyVolumeArray,
                avgWeeklyDistance: Math.round(avgWeeklyDistance * 100) / 100,
                peakWeek,
                planStartDate: goal.planStartDate,
                raceDate: goal.raceDate,
            },
        });
    } catch (error) {
        console.error('Plan analysis error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
