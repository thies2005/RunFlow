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
import { validateOrigin, setCorsHeaders } from '@/lib/security/cors';

// Rate limit for external API
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external-plan' };

export async function OPTIONS(request: NextRequest) {
    if (!validateOrigin(request)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(request, response.headers);
    return response;
}

export async function GET(request: NextRequest) {
    try {
        if (!validateOrigin(request)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429 }
            );
            setCorsHeaders(request, response.headers);
            Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            const response = NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
            setCorsHeaders(request, response.headers);
            return response;
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
            const response = NextResponse.json(
                { message: 'No active training plan found', plan: null }
            );
            setCorsHeaders(request, response.headers);
            Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
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

        const response = NextResponse.json(
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
            }
        );
        setCorsHeaders(request, response.headers);
        Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    } catch (error) {
        console.error('External API plan error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
        setCorsHeaders(request, response.headers);
        return response;
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
