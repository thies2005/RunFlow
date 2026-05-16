import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateTrainingPlan, type PlanConfig, type GeneratedWorkout } from '@/lib/plans';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig } from '@/lib/rateLimit';
import { adjustDefaultsForVdot, getRaceDefaults } from '@/lib/plans/defaults';
import { RaceType } from '@/generated/prisma/browser';

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

type PlanWorkout = {
    date: string;
    dayOfWeek: string;
    type: string;
    description: string;
    displayDescription: string;
    distanceKm: string;
    durationMin: string;
    pace: string;
    phase: string;
    intensityZone: string | null;
};

type PlanWeek = {
    weekNumber: number;
    phase: string;
    workouts: PlanWorkout[];
    totalDistanceKm: string;
};

function formatPace(secPerKm: number | undefined): string {
    if (!secPerKm || secPerKm <= 0) return '-';
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.round(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds <= 0) return '-';
    return `${Math.round(seconds / 60)}min`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function groupWorkoutsByWeek(workouts: GeneratedWorkout[]): PlanWeek[] {
    const weeks: PlanWeek[] = [];
    let currentWeek: PlanWorkout[] = [];
    let currentWeekStart: Date | null = null;
    let weekNum = 0;

    const sorted = [...workouts].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const w of sorted) {
        const d = new Date(w.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());

        if (!currentWeekStart || weekStart.getTime() !== currentWeekStart.getTime()) {
            if (currentWeek.length > 0) {
                const totalDist = currentWeek.reduce((s, w) => s + parseFloat(w.distanceKm) || 0, 0);
                weeks.push({
                    weekNumber: weekNum,
                    phase: currentWeek[0]?.phase || 'BASE',
                    workouts: currentWeek,
                    totalDistanceKm: totalDist.toFixed(1),
                });
            }
            currentWeekStart = weekStart;
            weekNum++;
            currentWeek = [];
        }

        currentWeek.push({
            date: d.toISOString().split('T')[0],
            dayOfWeek: DAY_NAMES[d.getDay()],
            type: w.type,
            description: w.description,
            displayDescription: w.displayDescription || w.description,
            distanceKm: (w.totalDistance / 1000).toFixed(1),
            durationMin: formatDuration(w.targetDuration),
            pace: formatPace(w.targetPace),
            phase: w.phase || 'BASE',
            intensityZone: w.intensityZone || null,
        });
    }

    if (currentWeek.length > 0) {
        const totalDist = currentWeek.reduce((s, w) => s + parseFloat(w.distanceKm) || 0, 0);
        weeks.push({
            weekNumber: weekNum,
            phase: currentWeek[0]?.phase || 'BASE',
            workouts: currentWeek,
            totalDistanceKm: totalDist.toFixed(1),
        });
    }

    return weeks;
}

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
        const body = await request.json();
        const parsed = planRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
                { status: 400, headers }
            );
        }

        const { raceType, raceDate, fitnessLevel, runsPerWeek, weeklyVolumeKm } = parsed.data;

        const raceDateObj = new Date(raceDate);
        if (isNaN(raceDateObj.getTime())) {
            return NextResponse.json(
                { error: 'Invalid race date' },
                { status: 400, headers }
            );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (raceDateObj <= today) {
            return NextResponse.json(
                { error: 'Race date must be in the future' },
                { status: 400, headers }
            );
        }

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
        const raceTypeLabel = raceType.replace(/_/g, ' ').toLowerCase();

        return NextResponse.json({
            plan: {
                raceType: raceTypeLabel,
                raceDate: raceDateObj.toISOString().split('T')[0],
                fitnessLevel,
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

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
