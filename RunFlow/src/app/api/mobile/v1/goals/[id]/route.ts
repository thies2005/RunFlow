/**
 * Mobile Goal Detail Endpoint
 * 
 * GET /api/mobile/v1/goals/[id] - Get goal details
 * PUT /api/mobile/v1/goals/[id] - Update goal
 * DELETE /api/mobile/v1/goals/[id] - Delete goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const goal = await prisma.goal.findFirst({
            where: { id: params.id, userId: user.id },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' }
                }
            }
        });

        if (!goal) {
            return errorResponses.notFound('Goal');
        }

        const serialized = {
            ...goal,
            raceDate: goal.raceDate.toISOString(),
            createdAt: goal.createdAt.toISOString(),
            updatedAt: goal.updatedAt.toISOString(),
            completedAt: goal.completedAt?.toISOString() || null,
            workouts: goal.workouts.map(w => ({
                ...w,
                scheduledDate: w.scheduledDate.toISOString(),
                createdAt: w.createdAt.toISOString(),
                updatedAt: w.updatedAt.toISOString(),
                completedAt: w.completedAt?.toISOString() || null
            }))
        };

        return NextResponse.json({ goal: serialized }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/goals/${params.id}`
        });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Verify ownership
        const existingGoal = await prisma.goal.findFirst({
            where: { id: params.id, userId: user.id }
        });

        if (!existingGoal) {
            return errorResponses.notFound('Goal');
        }

        const body = await request.json();
        const { name, targetTime, isActive, currentVdot } = body;

        const goal = await prisma.goal.update({
            where: { id: params.id },
            data: {
                name: name !== undefined ? name : undefined,
                targetTime: targetTime !== undefined ? targetTime : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                currentVdot: currentVdot !== undefined ? currentVdot : undefined,
            }
        });

        return NextResponse.json({
            goal: {
                ...goal,
                raceDate: goal.raceDate.toISOString(),
                createdAt: goal.createdAt.toISOString(),
                updatedAt: goal.updatedAt.toISOString(),
                completedAt: goal.completedAt?.toISOString() || null
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/goals/${params.id}`
        });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Verify ownership
        const goal = await prisma.goal.findFirst({
            where: { id: params.id, userId: user.id }
        });

        if (!goal) {
            return errorResponses.notFound('Goal');
        }

        await prisma.goal.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/goals/${params.id}`
        });
    }
}
