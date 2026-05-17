/**
 * Mobile Workouts Endpoint
 * 
 * GET /api/mobile/v1/workouts
 * 
 * Returns workouts with optional filtering by goal or date range.
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { enrichWorkoutForResponse } from '@/lib/api/workoutSerializer';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const goalId = searchParams.get('goalId');
        const weekStart = searchParams.get('weekStart');
        const weekEnd = searchParams.get('weekEnd');

        // Build where clause
        const where: any = {};

        if (goalId) {
            // Verify goal ownership
            const goal = await prisma.goal.findFirst({
                where: { id: goalId, userId: user.id }
            });
            if (!goal) {
                return errorResponses.notFound('Goal');
            }
            where.goalId = goalId;
        } else {
            // Get all goals for user
            const userGoals = await prisma.goal.findMany({
                where: { userId: user.id },
                select: { id: true }
            });
            where.goalId = { in: userGoals.map(g => g.id) };
        }

        // Date range filter
        if (weekStart && weekEnd) {
            where.scheduledDate = {
                gte: parseISO(weekStart),
                lte: parseISO(weekEnd)
            };
        } else {
            // Default to current week
            const now = new Date();
            where.scheduledDate = {
                gte: startOfWeek(now, { weekStartsOn: 1 }),
                lte: endOfWeek(now, { weekStartsOn: 1 })
            };
        }

        const workouts = await prisma.workout.findMany({
            where,
            orderBy: { scheduledDate: 'asc' },
            include: {
                goal: {
                    select: { name: true, raceType: true }
                }
            }
        });

        // Serialize
        const serialized = workouts.map(w => ({
            ...enrichWorkoutForResponse(w),
            scheduledDate: w.scheduledDate.toISOString(),
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
            completedAt: w.completedAt?.toISOString() || null
        }));

        return NextResponse.json({ workouts: serialized }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/workouts'
        });
    }
}
