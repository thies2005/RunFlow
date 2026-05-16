import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { generateTrainingPlan } from '@/lib/plans';
import { RaceType } from '@/generated/prisma/browser';
import { mapWorkoutsForDb } from '@/lib/services/plan-creation';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

type RouteContext = { params: Promise<{ goalId: string }> };

async function authenticateUser(request: NextRequest | Request): Promise<string | null> {
    const user = await getAuthenticatedUser(request as NextRequest);
    if (user) return user.id;
    const session = await auth();
    return session?.user?.id ?? null;
}

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const userId = await authenticateUser(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const subGoals = await prisma.goal.findMany({
            where: { parentGoalId: goalId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { workouts: true } },
            },
        });

        return NextResponse.json({ subGoals });
    } catch (error) {
        console.error('Sub-goals list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const userId = await authenticateUser(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { name, raceType, raceDate, priority, sport, targetTime, generateWorkouts } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Sub-goal name is required' }, { status: 400 });
        }

        try {
            await createSnapshot(goalId, 'Before adding sub-goal', 'add_sub_goal');
        } catch {
            // Snapshot creation is optional
        }

        const subGoal = await prisma.goal.create({
            data: {
                userId,
                name: name.trim(),
                parentGoalId: goalId,
                sport: sport || goal.sport,
                raceType: raceType || null,
                raceDate: raceDate ? new Date(raceDate) : null,
                targetTime: targetTime || null,
                priority: priority || 'SECONDARY',
                planSource: goal.planSource || 'standard',
                creationMode: 'EXPERT_MANUAL',
                currentVdot: goal.currentVdot,
                runsPerWeek: goal.runsPerWeek,
                ridesPerWeek: goal.ridesPerWeek,
                swimsPerWeek: goal.swimsPerWeek,
                strengthPerWeek: goal.strengthPerWeek,
                weeklyMileageGoal: goal.weeklyMileageGoal,
            },
        });

        let workoutsCreated = 0;

        if (generateWorkouts && raceType && raceDate) {
            try {
                const subRaceDate = new Date(raceDate);
                const parentRaceDate = goal.raceDate ? new Date(goal.raceDate) : null;

                const now = new Date();
                const planStart = goal.planStartDate ? new Date(goal.planStartDate) : now;
                const startDate = planStart > now ? planStart : now;

                if (subRaceDate > now) {
                    const vdot = goal.currentVdot || 30;
                    const weeksAvailable = Math.max(1, Math.ceil((subRaceDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                    const taperWeeks = priority === 'TUNE_UP' ? 1 : Math.min(2, Math.floor(weeksAvailable / 4));

                    const workouts = generateTrainingPlan({
                        vdot,
                        raceType: raceType as RaceType,
                        raceDate: subRaceDate,
                        startDate,
                        runsPerWeek: goal.runsPerWeek || 4,
                        ridesPerWeek: goal.ridesPerWeek || 0,
                        strengthPerWeek: goal.strengthPerWeek || 0,
                        swimsPerWeek: goal.swimsPerWeek || 0,
                        weeklyMileageGoal: goal.weeklyMileageGoal || null,
                        taperWeeks,
                        peakWeeks: Math.min(goal.peakWeeks || 2, Math.floor(weeksAvailable / 3)),
                        buildWeeks: Math.min(goal.buildWeeks || 4, Math.floor(weeksAvailable / 3)),
                        longRunDay: goal.longRunDay ?? 0,
                        workoutDay: goal.workoutDay ?? 3,
                    });

                    if (workouts.length > 0) {
                        const filteredWorkouts = parentRaceDate
                            ? workouts.filter(w => w.date <= parentRaceDate)
                            : workouts;

                        if (filteredWorkouts.length > 0) {
                            await prisma.workout.createMany({
                                data: mapWorkoutsForDb(filteredWorkouts, {
                                    goalId: goalId,
                                    subGoalId: subGoal.id,
                                    descriptionPrefix: `[${name.trim()}] `,
                                }),
                            });
                            workoutsCreated = filteredWorkouts.length;
                        }
                    }
                }
            } catch (genError) {
                console.error('Failed to generate sub-goal workouts:', genError);
            }
        }

        return NextResponse.json({ subGoal, workoutsCreated }, { status: 201 });
    } catch (error) {
        console.error('Sub-goal create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
