import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { analyzeRace, type RaceDistance } from '@/lib/metrics/vdot';

// GET - List goals
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await prisma.goal.findMany({
        where: { userId: session.user.id },
        orderBy: { raceDate: 'asc' },
        include: {
            workouts: {
                where: {
                    scheduledDate: {
                        gte: new Date(),
                    },
                },
                orderBy: { scheduledDate: 'asc' },
                take: 7, // Next 7 workouts
            },
        },
    });

    return NextResponse.json({ goals });
}

// POST - Create goal
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, raceType, raceDate, targetTime, weeklyMileageGoal, planWeeks } = body;

    if (!name || !raceType || !raceDate) {
        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );
    }

    // Calculate current VDOT from recent race effort if available
    let currentVdot: number | null = null;
    let predictedTime: number | null = null;

    // Look for a recent "race-like" run (similar distance, high effort)
    const distanceMap: Record<string, number> = {
        'FIVE_K': 5000,
        'TEN_K': 10000,
        'HALF_MARATHON': 21097,
        'MARATHON': 42195,
    };

    const targetDistance = distanceMap[raceType];

    const recentRaceEffort = await prisma.activity.findFirst({
        where: {
            userId: session.user.id,
            type: 'RUN',
            distance: {
                gte: targetDistance * 0.9,
                lte: targetDistance * 1.1,
            },
            startDate: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
        },
        orderBy: { startDate: 'desc' },
    });

    if (recentRaceEffort) {
        // Map database enum to RaceDistance type
        const raceDistanceMap: Record<string, RaceDistance> = {
            'FIVE_K': '5K',
            'TEN_K': '10K',
            'HALF_MARATHON': 'HALF',
            'MARATHON': 'MARATHON',
        };

        const targetRaceDistance = raceDistanceMap[raceType] || '5K';
        const result = analyzeRace({
            distance: targetRaceDistance,
            timeSeconds: recentRaceEffort.movingTime,
        });
        currentVdot = result.vdot;
        predictedTime = result.predictions[targetRaceDistance];
    }

    const goal = await prisma.goal.create({
        data: {
            userId: session.user.id,
            name,
            raceType,
            raceDate: new Date(raceDate),
            targetTime: targetTime || null,
            weeklyMileageGoal: weeklyMileageGoal || null,
            planWeeks: planWeeks || 12,
            currentVdot,
            predictedTime,
        },
    });

    // Generate Training Plan Workouts
    if (currentVdot) {
        // Import dynamically to avoid circular dependencies if any (though here it's fine)
        const { generateTrainingPlan } = await import('@/lib/plans');

        try {
            const workouts = generateTrainingPlan({
                vdot: currentVdot,
                raceType: raceType as any,
                raceDate: new Date(raceDate),
                startDate: new Date(),
            });

            if (workouts.length > 0) {
                await prisma.workout.createMany({
                    data: workouts.map(w => ({
                        goalId: goal.id,
                        scheduledDate: w.date,
                        workoutType: w.type,
                        description: w.description,
                        targetDistance: w.totalDistance,
                        targetPace: w.targetPace,
                    })),
                });
                console.log(`Generated ${workouts.length} workouts for goal ${goal.id}`);
            }
        } catch (error) {
            console.error('Failed to generate training plan:', error);
            // Don't fail the request, just log it. Plan can be regenerated later.
        }
    }

    return NextResponse.json({ goal });
}
