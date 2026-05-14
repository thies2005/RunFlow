import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { generateTrainingPlan } from '@/lib/plans';
import { WorkoutType, RaceType, PlanCreationMode, type PlanSport } from '@/generated/prisma/browser';
import { z } from 'zod';
import { analyzeRace, calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';

const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
});

const TRIATHLON_RACE_TYPES = new Set<RaceType>([
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI',
]);

function resolveDbSport(sport: 'RUN' | 'TRIATHLON' | 'NO_RACE'): PlanSport {
    return sport === 'NO_RACE' ? 'RUN' : sport;
}

function resolveSubGoalSport(
    parentSport: 'RUN' | 'TRIATHLON' | 'NO_RACE',
    subGoalSport?: 'RUN' | 'TRIATHLON' | 'NO_RACE',
    raceType?: RaceType | null,
): PlanSport {
    if (subGoalSport) return resolveDbSport(subGoalSport);
    if (raceType) return TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : 'RUN';
    return resolveDbSport(parentSport);
}

const advancedPlanSchema = z.object({
    name: z.string().min(1).max(255),
    sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']),
    raceType: z.nativeEnum(RaceType).nullable().optional(),
    raceDate: dateStringSchema.nullable().optional(),
    planStartDate: dateStringSchema.nullable().optional(),
    planSource: z.string().optional(),
    creationMode: z.nativeEnum(PlanCreationMode).optional(),
    customDistanceM: z.number().nullable().optional(),
    customSwimDistM: z.number().nullable().optional(),
    customBikeDistM: z.number().nullable().optional(),
    customRunDistM: z.number().nullable().optional(),
    backyardLoopDistM: z.number().min(100).nullable().optional(),
    backyardLoopTimeS: z.number().nullable().optional(),
    targetLaps: z.number().int().min(1).max(100).nullable().optional(),
    durationWeeks: z.number().int().min(4).max(52).optional(),
    runsPerWeek: z.number().int().nonnegative().max(7).optional(),
    ridesPerWeek: z.number().int().nonnegative().max(7).optional(),
    swimsPerWeek: z.number().int().nonnegative().max(7).optional(),
    strengthPerWeek: z.number().int().nonnegative().max(7).optional(),
    weeklyMileageGoal: z.number().positive().optional(),
    maxLongRunKm: z.number().min(6).max(200).optional(),
    taperWeeks: z.number().int().nonnegative().optional(),
    peakWeeks: z.number().int().nonnegative().optional(),
    buildWeeks: z.number().int().nonnegative().optional(),
    longRunDay: z.number().int().min(0).max(6).optional(),
    workoutDay: z.number().int().min(0).max(6).optional(),
    swimDay: z.number().int().min(0).max(6).optional(),
    restDays: z.array(z.number().int().min(0).max(6)).optional(),
    targetTime: z.number().int().positive().optional(),
    calibrationTime: z.number().int().positive().optional(),
    calibrationDistance: z.enum(['5K', '10K', 'HALF', 'MARATHON']).optional(),
    calibrationFactor: z.number().min(0.5).max(2.0).optional(),
    subGoals: z.array(z.object({
        name: z.string().min(1).max(255),
        sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']).optional(),
        raceType: z.nativeEnum(RaceType).nullable().optional(),
        raceDate: dateStringSchema.nullable().optional(),
        priority: z.enum(['SECONDARY', 'TUNE_UP', 'MILESTONE']).optional(),
        targetTime: z.number().int().positive().optional(),
    })).optional(),
});

function predictTimeForDist(vdot: number, distM: number): number {
    let low = 600;
    let high = 18000;
    for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2;
        const tv = calculateVdot({ distance: distM, timeSeconds: mid });
        if (Math.abs(tv - vdot) < 0.01) return Math.round(mid);
        if (tv > vdot) low = mid;
        else high = mid;
    }
    return Math.round((low + high) / 2);
}

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
        const parsed = advancedPlanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const {
            name, sport, raceType, raceDate, planStartDate, planSource, creationMode,
            customDistanceM, customSwimDistM, customBikeDistM, customRunDistM,
            backyardLoopDistM, backyardLoopTimeS, targetLaps, subGoals,
            durationWeeks, runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek,
            weeklyMileageGoal, maxLongRunKm, taperWeeks, peakWeeks, buildWeeks,
            longRunDay, workoutDay, swimDay, restDays, targetTime,
            calibrationTime, calibrationDistance, calibrationFactor,
        } = parsed.data;

        if (sport !== 'NO_RACE' && !raceType) {
            return NextResponse.json({ error: 'raceType is required for RUN and TRIATHLON sports' }, { status: 400 });
        }

        if (sport !== 'NO_RACE' && !raceDate) {
            return NextResponse.json({ error: 'raceDate is required for RUN and TRIATHLON sports' }, { status: 400 });
        }

        const recentGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, currentVdot: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        const currentVdot = recentGoal?.currentVdot || 30.0;

        let effectiveVdot = currentVdot;

        if (calibrationTime && calibrationDistance) {
            const map: Record<string, RaceDistance> = {
                '5K': '5K',
                '10K': '10K',
                'HALF': 'HALF',
                'MARATHON': 'MARATHON',
            };
            effectiveVdot = analyzeRace({
                distance: map[calibrationDistance] || '5K',
                timeSeconds: calibrationTime,
            }).vdot;
        } else if (calibrationFactor && calibrationFactor > 0) {
            effectiveVdot = currentVdot * calibrationFactor;
        }

        const computedBackyardLoopTimeS = backyardLoopDistM && backyardLoopDistM > 0
            ? predictTimeForDist(effectiveVdot, backyardLoopDistM)
            : null;

        if (calibrationFactor && calibrationFactor > 0) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    vdotCorrectionFactor: calibrationFactor,
                    ...(calibrationFactor !== 1.0 && {
                        autoRevolvingVo2max: null,
                        autoRevolvingCalculatedAt: null,
                    }),
                },
            });
        }

        const now = new Date();
        const pStartDate = planStartDate ? new Date(planStartDate) : now;
        const startDate = pStartDate > now ? pStartDate : now;
        const rDate = raceDate ? new Date(raceDate) : null;

        if (sport !== 'NO_RACE' && rDate && rDate <= startDate) {
            return NextResponse.json({ error: 'raceDate must be after the plan start date' }, { status: 400 });
        }

        let totalWeeks: number;
        if (sport === 'NO_RACE') {
            totalWeeks = durationWeeks || 12;
        } else if (rDate) {
            totalWeeks = Math.max(4, Math.ceil((rDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        } else {
            totalWeeks = 12;
        }

        const resolvedTotalWeeks = Math.max(4, totalWeeks);

        let safeTaper = taperWeeks ?? (sport === 'TRIATHLON' ? 1 : 2);
        let safePeak = peakWeeks ?? Math.min(4, Math.floor(resolvedTotalWeeks / 3));
        let safeBuild = buildWeeks ?? Math.min(4, Math.floor(resolvedTotalWeeks / 3));

        const availablePhaseWeeks = sport === 'NO_RACE' ? resolvedTotalWeeks : Math.max(1, resolvedTotalWeeks - 1);

        if (safeTaper + safePeak + safeBuild > availablePhaseWeeks) {
            const proportion = availablePhaseWeeks / (safeTaper + safePeak + safeBuild);
            safeTaper = Math.max(1, Math.round(safeTaper * proportion));
            safePeak = Math.max(1, Math.round(safePeak * proportion));
            safeBuild = Math.max(0, availablePhaseWeeks - safeTaper - safePeak);
        }

        const finalRaceDate = rDate || new Date(startDate.getTime() + resolvedTotalWeeks * 7 * 24 * 60 * 60 * 1000);

        const dbSport = resolveDbSport(sport);

        const goal = await prisma.goal.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                sport: dbSport,
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
                backyardLoopTimeS: computedBackyardLoopTimeS ?? backyardLoopTimeS ?? null,
                targetLaps: targetLaps ?? null,
                isActive: true,
                targetTime: targetTime ?? null,
                weeklyMileageGoal: weeklyMileageGoal ?? null,
                planWeeks: resolvedTotalWeeks,
                runsPerWeek: runsPerWeek ?? 4,
                ridesPerWeek: ridesPerWeek ?? 0,
                swimsPerWeek: swimsPerWeek ?? 0,
                strengthPerWeek: strengthPerWeek ?? 0,
                taperWeeks: safeTaper,
                peakWeeks: safePeak,
                buildWeeks: safeBuild,
                longRunDay: longRunDay ?? 0,
                workoutDay: workoutDay ?? 3,
                swimDay: typeof swimDay === 'number' ? swimDay : null,
                restDays: Array.isArray(restDays) ? restDays : undefined,
                currentVdot: effectiveVdot,
            },
        });

        try {
            if (raceType || sport === 'NO_RACE') {
                const workouts = generateTrainingPlan({
                    vdot: effectiveVdot,
                    raceType: (raceType as RaceType) || null,
                    raceDate: finalRaceDate,
                    startDate,
                    sport: dbSport,
                    runsPerWeek: runsPerWeek ?? 4,
                    ridesPerWeek: ridesPerWeek ?? (sport === 'TRIATHLON' ? 2 : 0),
                    swimsPerWeek: swimsPerWeek ?? (sport === 'TRIATHLON' ? 2 : 0),
                    strengthPerWeek: strengthPerWeek ?? 0,
                    weeklyMileageGoal: weeklyMileageGoal ?? null,
                    taperWeeks: safeTaper,
                    peakWeeks: safePeak,
                    buildWeeks: safeBuild,
                    maxLongRunKm: maxLongRunKm,
                    longRunDay: longRunDay ?? 0,
                    workoutDay: workoutDay ?? 3,
                    swimDay,
                    restDays,
                    weeksTotal: resolvedTotalWeeks,
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

                const subGoalSport = resolveSubGoalSport(sport, sg.sport, sg.raceType);

                const subGoal = await prisma.goal.create({
                    data: {
                        userId: session.user.id,
                        name: sg.name.trim(),
                        parentGoalId: goal.id,
                        sport: subGoalSport,
                        raceType: sg.raceType || null,
                        raceDate: sg.raceDate ? new Date(sg.raceDate) : null,
                        priority: sg.priority || 'SECONDARY',
                        planSource: 'advanced',
                        creationMode: 'EXPERT_MANUAL',
                        currentVdot: effectiveVdot,
                        targetTime: sg.targetTime ?? null,
                    },
                });

                if (sg.raceType && sg.raceDate) {
                    try {
                        const subRaceDate = new Date(sg.raceDate);

                        if (subRaceDate > now) {
                            const weeksAvailable = Math.max(1, Math.ceil((subRaceDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                            const priority = sg.priority || 'SECONDARY';
                            const subPhaseWeeks = Math.max(1, weeksAvailable - 1);
                            const subTaper = Math.min(priority === 'TUNE_UP' ? 1 : safeTaper, subPhaseWeeks);
                            const subPeak = Math.min(safePeak, Math.max(0, Math.floor(subPhaseWeeks / 3)));
                            const subBuild = Math.min(safeBuild, Math.max(0, subPhaseWeeks - subTaper - subPeak));

                            const subWorkouts = generateTrainingPlan({
                                vdot: effectiveVdot,
                                raceType: sg.raceType as RaceType,
                                raceDate: subRaceDate,
                                startDate,
                                sport: subGoalSport,
                                runsPerWeek: runsPerWeek ?? 4,
                                ridesPerWeek: ridesPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                                swimsPerWeek: swimsPerWeek ?? (subGoalSport === 'TRIATHLON' ? 2 : 0),
                                strengthPerWeek: strengthPerWeek ?? 0,
                                weeklyMileageGoal: weeklyMileageGoal ?? null,
                                taperWeeks: subTaper,
                                peakWeeks: subPeak,
                                buildWeeks: subBuild,
                                longRunDay: longRunDay ?? 0,
                                workoutDay: workoutDay ?? 3,
                                swimDay,
                                restDays,
                                weeksTotal: weeksAvailable,
                            });

                            const parentRaceDate = raceDate ? new Date(raceDate) : null;
                            const filteredWorkouts = parentRaceDate
                                ? subWorkouts.filter(w => w.date <= parentRaceDate)
                                : subWorkouts;

                            if (filteredWorkouts.length > 0) {
                                await prisma.workout.createMany({
                                    data: filteredWorkouts.map(w => ({
                                        goalId: goal.id,
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
