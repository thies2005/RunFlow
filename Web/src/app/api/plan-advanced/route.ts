import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { generateTrainingPlan } from '@/lib/plans';
import { WorkoutType, RaceType } from '@/generated/prisma/browser';

export async function GET(req: Request) {
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

        const url = new URL(req.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

        const goals = await prisma.goal.findMany({
            where: {
                userId: session.user.id,
                planSource: 'advanced',
                parentGoalId: null,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                subGoals: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: { workouts: true, snapshots: true },
                },
            },
        });

        return NextResponse.json({ plans: goals });
    } catch (error) {
        console.error('Advanced plans list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
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

        const body = await req.json();
        const { name, sport, raceType, raceDate, planStartDate, planSource, creationMode, customDistanceM, customSwimDistM, customBikeDistM, customRunDistM, backyardLoopDistM, backyardLoopTimeS, targetLaps, subGoals } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
        }

        if (!sport || !['RUN', 'TRIATHLON'].includes(sport)) {
            return NextResponse.json({ error: 'Valid sport is required (RUN or TRIATHLON)' }, { status: 400 });
        }

        if (planStartDate) {
            const d = new Date(planStartDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: 'Invalid planStartDate' }, { status: 400 });
            }
        }

        if (raceDate) {
            const d = new Date(raceDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: 'Invalid raceDate' }, { status: 400 });
            }
        }

        const recentGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, currentVdot: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        const currentVdot = recentGoal?.currentVdot || 30.0;

        const goal = await prisma.goal.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                sport,
                planSource: planSource || 'advanced',
                creationMode: creationMode || 'EXPERT_MANUAL',
                planStartDate: planStartDate ? new Date(planStartDate) : null,
                raceType: raceType || null,
                raceDate: raceDate ? new Date(raceDate) : null,
                customDistanceM: customDistanceM ?? null,
                customSwimDistM: customSwimDistM ?? null,
                customBikeDistM: customBikeDistM ?? null,
                customRunDistM: customRunDistM ?? null,
                backyardLoopDistM: backyardLoopDistM ?? null,
                backyardLoopTimeS: backyardLoopTimeS ?? null,
                targetLaps: targetLaps ?? null,
                isActive: true,
                currentVdot,
            },
        });

        // Generate main plan workouts if raceType or sport NO_RACE exists
        try {
            if (raceType || (sport === 'NO_RACE')) {
                const now = new Date();
                const pStartDate = planStartDate ? new Date(planStartDate) : now;
                const startDate = pStartDate > now ? pStartDate : now;
                const rDate = raceDate ? new Date(raceDate) : null;
                const totalWeeks = Math.max(4, body.durationWeeks || 12);
                const finalRaceDate = rDate || new Date(startDate.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000);
                
                const taperWeeks = sport === 'TRIATHLON' ? 1 : 2;

                const workouts = generateTrainingPlan({
                    vdot: currentVdot,
                    raceType: (raceType as RaceType) || null,
                    raceDate: finalRaceDate,
                    startDate,
                    runsPerWeek: 4,
                    ridesPerWeek: sport === 'TRIATHLON' ? 2 : 0,
                    swimsPerWeek: sport === 'TRIATHLON' ? 2 : 0,
                    strengthPerWeek: 0,
                    weeklyMileageGoal: null,
                    taperWeeks,
                    peakWeeks: Math.min(4, Math.floor(totalWeeks / 3)),
                    buildWeeks: Math.min(4, Math.floor(totalWeeks / 3)),
                    longRunDay: 0,
                    workoutDay: 3,
                });

                if (workouts.length > 0) {
                    await prisma.workout.createMany({
                        data: workouts.map(w => ({
                            goalId: goal.id,
                            scheduledDate: w.date,
                            workoutType: w.type as WorkoutType,
                            description: w.description,
                            targetDistance: w.totalDistance,
                            targetPace: w.targetPace ?? 0,
                            targetDuration: w.targetDuration ?? 0,
                            targetHrZone: w.targetHrZone ?? null,
                            phase: w.phase ?? 'BASE',
                            isCompleted: false
                        })),
                    });
                }
            }
        } catch (error) {
            console.error('Failed to generate main plan workouts:', error);
        }

        if (subGoals && Array.isArray(subGoals) && subGoals.length > 0) {
            for (const sg of subGoals) {
                if (!sg.name || typeof sg.name !== 'string' || !sg.name.trim()) continue;

                const subGoal = await prisma.goal.create({
                    data: {
                        userId: session.user.id,
                        name: sg.name.trim(),
                        parentGoalId: goal.id,
                        sport: sg.sport || sport,
                        raceType: sg.raceType || null,
                        raceDate: sg.raceDate ? new Date(sg.raceDate) : null,
                        priority: sg.priority || 'SECONDARY',
                        planSource: 'advanced',
                        creationMode: 'EXPERT_MANUAL',
                        currentVdot,
                    },
                });

                // Generate sub-goal workouts
                if (sg.raceType && sg.raceDate) {
                    try {
                        const subRaceDate = new Date(sg.raceDate);
                        const now = new Date();
                        const pStartDate = planStartDate ? new Date(planStartDate) : now;
                        const startDate = pStartDate > now ? pStartDate : now;

                        if (subRaceDate > now) {
                            const weeksAvailable = Math.max(1, Math.ceil((subRaceDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                            const priority = sg.priority || 'SECONDARY';
                            const taperWeeks = priority === 'TUNE_UP' ? 1 : Math.min(2, Math.floor(weeksAvailable / 4));

                            const subWorkouts = generateTrainingPlan({
                                vdot: currentVdot,
                                raceType: sg.raceType as RaceType,
                                raceDate: subRaceDate,
                                startDate,
                                runsPerWeek: 4,
                                ridesPerWeek: sg.sport === 'TRIATHLON' ? 2 : 0,
                                swimsPerWeek: sg.sport === 'TRIATHLON' ? 2 : 0,
                                strengthPerWeek: 0,
                                weeklyMileageGoal: null,
                                taperWeeks,
                                peakWeeks: Math.min(2, Math.floor(weeksAvailable / 3)),
                                buildWeeks: Math.min(4, Math.floor(weeksAvailable / 3)),
                                longRunDay: 0,
                                workoutDay: 3,
                            });

                            const parentRaceDate = raceDate ? new Date(raceDate) : null;
                            const filteredWorkouts = parentRaceDate
                                ? subWorkouts.filter(w => w.date <= parentRaceDate)
                                : subWorkouts;

                            if (filteredWorkouts.length > 0) {
                                await prisma.workout.createMany({
                                    data: filteredWorkouts.map(w => ({
                                        goalId: goal.id, // Workouts belong to parent plan
                                        subGoalId: subGoal.id,
                                        scheduledDate: w.date,
                                        workoutType: w.type as WorkoutType,
                                        description: `[${sg.name.trim()}] ${w.description}`,
                                        targetDistance: w.totalDistance,
                                        targetPace: w.targetPace ?? 0,
                                        targetDuration: w.targetDuration ?? 0,
                                        targetHrZone: w.targetHrZone ?? null,
                                        phase: w.phase ?? 'BASE',
                                        isCompleted: false,
                                    })),
                                });
                            }
                        }
                    } catch (err) {
                        console.error('Failed to generate sub-goal workouts:', err);
                    }
                }
            }
        }

        const created = await prisma.goal.findUnique({
            where: { id: goal.id },
            include: {
                subGoals: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
            },
        });

        return NextResponse.json({ plan: created }, { status: 201 });
    } catch (error) {
        console.error('Advanced plan create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
