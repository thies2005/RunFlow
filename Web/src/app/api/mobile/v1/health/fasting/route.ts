import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const userId = authUser.id;

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId }
        });

        const currentSession = await prisma.fastingSession.findFirst({
            where: { userId, endTime: null },
            orderBy: { startTime: 'desc' }
        });

        const history = await prisma.fastingSession.findMany({
            where: { userId, endTime: { not: null } },
            orderBy: { endTime: 'desc' },
            take: 10
        });

        return NextResponse.json({
            currentSession,
            history,
            goalHours: target?.fastingGoalHours || 16,
            enabled: target?.fastingEnabled || false
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/fasting' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const userId = authUser.id;
        const body = await request.json();
        const { action } = body;

        const activeSession = await prisma.fastingSession.findFirst({
            where: { userId, endTime: null }
        });

        if (action === 'start') {
            if (activeSession) {
                return errorResponses.badRequest('A fasting session is already active.');
            }

            const newSession = await prisma.fastingSession.create({
                data: {
                    userId,
                    startTime: new Date()
                }
            });
            return NextResponse.json(newSession, { headers: rateLimitHeaders(rateLimitResult) });
        }

        if (action === 'end') {
            if (!activeSession) {
                return errorResponses.badRequest('No active fasting session found to end.');
            }

            const endTime = new Date();

            const updatedSession = await prisma.fastingSession.update({
                where: { id: activeSession.id },
                data: {
                    endTime
                }
            });
            return NextResponse.json(updatedSession, { headers: rateLimitHeaders(rateLimitResult) });
        }

        if (action === 'cancel') {
            if (!activeSession) {
                return errorResponses.badRequest('No active fasting session to cancel.');
            }

            await prisma.fastingSession.delete({
                where: { id: activeSession.id }
            });

            return NextResponse.json({ success: true, message: 'Session cancelled' }, { headers: rateLimitHeaders(rateLimitResult) });
        }

        return errorResponses.badRequest('Invalid action');

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/fasting' });
    }
}
