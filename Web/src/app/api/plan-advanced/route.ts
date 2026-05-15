import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { RaceType, PlanCreationMode } from '@/generated/prisma/browser';
import { z } from 'zod';
import { resolveVdot, resolvePhases, createPlanWithWorkouts, predictTimeForDist, type SubGoalInput } from '@/lib/services/plan-creation';

const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
});

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

        const now = new Date();
        const pStartDate = planStartDate ? new Date(planStartDate) : now;
        const startDate = pStartDate > now ? pStartDate : now;
        const rDate = raceDate ? new Date(raceDate) : null;

        if (sport !== 'NO_RACE' && rDate && rDate <= startDate) {
            return NextResponse.json({ error: 'raceDate must be after the plan start date' }, { status: 400 });
        }

        const dbSport = sport === 'NO_RACE' ? 'RUN' as const : sport as 'RUN' | 'TRIATHLON';

        const result = await createPlanWithWorkouts({
            userId: session.user.id,
            name: name.trim(),
            raceType: raceType ?? null,
            raceDate: raceDate ?? null,
            targetTime: targetTime ?? null,
            weeklyMileageGoal: weeklyMileageGoal ?? null,
            planWeeks: sport === 'NO_RACE' ? (durationWeeks || 12) : undefined,
            runsPerWeek: runsPerWeek ?? 4,
            ridesPerWeek: ridesPerWeek ?? 0,
            strengthPerWeek: strengthPerWeek ?? 0,
            swimsPerWeek: swimsPerWeek ?? 0,
            taperWeeks: taperWeeks ?? null,
            peakWeeks: peakWeeks ?? null,
            buildWeeks: buildWeeks ?? null,
            maxLongRunKm: maxLongRunKm ?? null,
            longRunDay: longRunDay ?? 0,
            workoutDay: workoutDay ?? 3,
            swimDay,
            restDays,
            calibrationTime: calibrationTime ?? null,
            calibrationDistance: calibrationDistance ?? null,
            calibrationFactor: calibrationFactor ?? null,
            planStartDate: planStartDate ?? null,
            deactivateExisting: false,
            sport: dbSport,
            planSource: planSource || 'advanced',
            creationMode: creationMode || 'EXPERT_MANUAL',
            backyardLoopDistM: backyardLoopDistM ?? null,
            backyardLoopTimeS: backyardLoopTimeS ?? null,
            targetLaps: targetLaps ?? null,
            customDistanceM: customDistanceM ?? null,
            customSwimDistM: customSwimDistM ?? null,
            customBikeDistM: customBikeDistM ?? null,
            customRunDistM: customRunDistM ?? null,
            subGoals: (subGoals?.filter(sg => sg.name?.trim()) ?? []) as SubGoalInput[],
        });

        const created = await prisma.goal.findUnique({
            where: { id: result.goal.id },
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
