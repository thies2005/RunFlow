/**
 * External API - Training Plan Endpoint
 *
 * GET /api/external/v1/plan
 *
 * Read-only access to the active training plan and scheduled workouts.
 * Returns the active goal details and a list of upcoming/recent workouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getExternalApiUser } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

// Rate limit for external API
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external-plan' };

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
            );
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            return NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401, headers: corsHeaders }
            );
        }

        const { userId } = authResult;
        const { searchParams } = new URL(request.url);

        // Date filtering for workouts
        const fromDateParam = searchParams.get('from');
        const toDateParam = searchParams.get('to');

        let fromDate = fromDateParam ? new Date(fromDateParam) : new Date();
        // Default to today if no from date
        if (!fromDateParam) {
            fromDate.setHours(0, 0, 0, 0);
        }

        let toDate = toDateParam ? new Date(toDateParam) : new Date();
        // Default to +14 days if no to date
        if (!toDateParam) {
            toDate.setDate(toDate.getDate() + 14);
            toDate.setHours(23, 59, 59, 999);
        }

        // Fetch active goal
        const activeGoal = await prisma.goal.findFirst({
            where: {
                userId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                raceType: true,
                raceDate: true,
                targetTime: true,
                predictedTime: true,
                planWeeks: true,
                currentVdot: true,
                weeklyMileageGoal: true,
                runsPerWeek: true,
                taperWeeks: true,
                peakWeeks: true,
                buildWeeks: true,
                longRunDay: true,
                workoutDay: true,
                restDays: true,
            }
        });

        if (!activeGoal) {
            return NextResponse.json(
                { message: 'No active training plan found', plan: null },
                { headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
            );
        }

        // Fetch workouts for the active goal in the date range
        const workouts = await prisma.workout.findMany({
            where: {
                goalId: activeGoal.id,
                scheduledDate: {
                    gte: fromDate,
                    lte: toDate,
                }
            },
            orderBy: { scheduledDate: 'asc' },
            select: {
                id: true,
                scheduledDate: true,
                workoutType: true,
                description: true,
                phase: true,
                order: true,
                notes: true,
                targetDistance: true,
                targetDuration: true,
                targetPace: true,
                targetHrZone: true,
                isCompleted: true,
                completedAt: true,
                linkedActivityId: true,
            }
        });

        return NextResponse.json(
            {
                plan: {
                    ...activeGoal,
                    race: {
                        type: activeGoal.raceType,
                        date: activeGoal.raceDate,
                        daysUntil: Math.ceil((new Date(activeGoal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                    }
                },
                workouts: workouts.map(w => ({
                    id: w.id,
                    date: w.scheduledDate.toISOString().split('T')[0],
                    dayOfWeek: w.scheduledDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    type: w.workoutType,
                    description: w.description,
                    phase: w.phase,
                    targets: {
                        distance: w.targetDistance, // meters
                        duration: w.targetDuration ? formatDuration(w.targetDuration) : null,
                        durationSeconds: w.targetDuration,
                        pace: w.targetPace ? formatPace(w.targetPace) : null, // min/km
                        paceSeconds: w.targetPace,
                        hrZone: w.targetHrZone,
                    },
                    status: {
                        isCompleted: w.isCompleted,
                        completedAt: w.completedAt,
                        linkedActivityId: w.linkedActivityId
                    },
                    notes: w.notes
                })),
                range: {
                    from: fromDate.toISOString().split('T')[0],
                    to: toDate.toISOString().split('T')[0]
                }
            },
            { headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
        );
    } catch (error) {
        console.error('External API plan error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Helpers
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPace(secondsPerKm: number): string {
    const m = Math.floor(secondsPerKm / 60);
    const s = Math.round(secondsPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
}
