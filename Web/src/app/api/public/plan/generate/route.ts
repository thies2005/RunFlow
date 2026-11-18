import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateTrainingPlan, type PlanConfig } from '@/lib/plans';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig } from '@/lib/rateLimit';
import { adjustDefaultsForVdot, getRaceDefaults } from '@/lib/plans/defaults';
import { RaceType } from '@/generated/prisma/browser';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';
import { escapeHtml, groupWorkoutsByWeek, parseStrictRaceDate } from '../shared';

const PUBLIC_PLAN_RATE_LIMIT: RateLimitConfig = {
    limit: 10,
    windowSeconds: 3600,
    prefix: 'public-plan',
};

const FITNESS_VDOT_MAP: Record<string, number> = {
    beginner: 30,
    intermediate: 40,
    advanced: 50,
};

const RACE_TYPE_OPTIONS = [
    'FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON',
    'FIFTY_K', 'FIFTY_MILE', 'HUNDRED_K', 'HUNDRED_MILE',
    'SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN',
] as const;

const planRequestSchema = z.object({
    raceType: z.enum(RACE_TYPE_OPTIONS),
    raceDate: z.string().min(1),
    fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    runsPerWeek: z.number().int().min(2).max(7).optional(),
    weeklyVolumeKm: z.number().min(10).max(200).optional(),
});

export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, PUBLIC_PLAN_RATE_LIMIT);
    const headers = rateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Try again later.', retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers }
        );
    }

    try {
        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers });
        }
        const body = JSON.parse(rawBody);
        const parsed = planRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
                { status: 400, headers }
            );
        }

        const { raceType, raceDate, fitnessLevel, runsPerWeek, weeklyVolumeKm } = parsed.data;

        const parsedRaceDate = parseStrictRaceDate(raceDate);
        if ('error' in parsedRaceDate) {
            return NextResponse.json(
                { error: parsedRaceDate.error },
                { status: 400, headers }
            );
        }
        const raceDateObj = parsedRaceDate.date;

        const vdot = FITNESS_VDOT_MAP[fitnessLevel];
        const defaults = getRaceDefaults(raceType);
        const adjusted = adjustDefaultsForVdot(defaults, vdot);

        const config: PlanConfig = {
            vdot,
            raceType: raceType as RaceType,
            raceDate: raceDateObj,
            runsPerWeek: runsPerWeek || adjusted.runsPerWeek,
            weeklyMileageGoal: (weeklyVolumeKm || adjusted.weeklyVolumeKm) * 1000,
        };

        const rawWorkouts = generateTrainingPlan(config);
        const weeks = groupWorkoutsByWeek(rawWorkouts);

        const totalDistance = rawWorkouts.reduce((s, w) => s + w.totalDistance, 0);
        const totalWeeks = weeks.length;
        const raceTypeLabel = escapeHtml(raceType.replace(/_/g, ' ').toLowerCase());

        return NextResponse.json({
            plan: {
                raceType: raceTypeLabel,
                raceDate: escapeHtml(raceDateObj.toISOString().split('T')[0]),
                fitnessLevel: escapeHtml(fitnessLevel),
                vdot,
                totalWeeks,
                totalDistanceKm: (totalDistance / 1000).toFixed(1),
                runsPerWeek: config.runsPerWeek,
                weeks,
            },
        }, { headers });
    } catch (err) {
        console.error('Public plan generation error:', err);
        return NextResponse.json(
            { error: 'Failed to generate plan. Please try again.' },
            { status: 500, headers }
        );
    }
}


