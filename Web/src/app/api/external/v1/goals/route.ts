/**
 * External API - Goals Endpoint
 * 
 * GET /api/external/v1/goals
 * 
 * Read-only access to user goals and race predictions for external AI assistants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getExternalApiUser } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';
import { validateOrigin, setCorsHeaders } from '@/lib/security/cors';

// Rate limit for external API
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external-goals' };

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
        const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default: true

        // Fetch goals
        const goals = await prisma.goal.findMany({
            where: {
                userId,
                ...(activeOnly ? { isActive: true } : {}),
            },
            orderBy: { raceDate: 'asc' },
            select: {
                id: true,
                name: true,
                raceType: true,
                raceDate: true,
                targetTime: true,
                currentVdot: true,
                predictedTime: true,
                marathonShapeFactor: true,
                weeklyMileageGoal: true,
                planWeeks: true,
                runsPerWeek: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Format goals for external consumption
        const formattedGoals = goals.map(goal => ({
            id: goal.id,
            name: goal.name,
            race: goal.raceType && goal.raceDate ? {
                type: goal.raceType,
                date: goal.raceDate,
                daysUntil: Math.ceil((new Date(goal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            } : null,
            times: {
                target: goal.targetTime ? formatTime(goal.targetTime) : null,
                targetSeconds: goal.targetTime,
                predicted: goal.predictedTime ? formatTime(goal.predictedTime) : null,
                predictedSeconds: goal.predictedTime,
            },
            training: {
                currentVdot: goal.currentVdot,
                marathonShapeFactor: goal.marathonShapeFactor,
                weeklyMileageGoalKm: goal.weeklyMileageGoal ? goal.weeklyMileageGoal / 1000 : null,
                runsPerWeek: goal.runsPerWeek,
            },
            isActive: goal.isActive,
        }));

        const response = NextResponse.json({
            goals: formattedGoals,
            total: formattedGoals.length,
        });
        setCorsHeaders(request, response.headers);
        Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    } catch (error) {
        console.error('External API goals error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
        setCorsHeaders(request, response.headers);
        return response;
    }
}

/**
 * Format seconds to HH:MM:SS string
 */
function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}
