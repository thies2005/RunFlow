import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const { token, platform } = body;

        if (!token || typeof token !== 'string') {
            return errorResponses.badRequest('token is required and must be a string');
        }

        if (!platform || typeof platform !== 'string') {
            return errorResponses.badRequest('platform is required and must be a string');
        }

        const validPlatforms = ['android', 'ios', 'web'];
        if (!validPlatforms.includes(platform.toLowerCase())) {
            return errorResponses.badRequest(`platform must be one of: ${validPlatforms.join(', ')}`);
        }

        await prisma.deviceToken.upsert({
            where: {
                userId_token: {
                    userId: authUser.id,
                    token,
                }
            },
            update: {
                platform: platform.toLowerCase(),
            },
            create: {
                userId: authUser.id,
                token,
                platform: platform.toLowerCase(),
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Device token registered'
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/device/token' });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return errorResponses.badRequest('token is required');
        }

        await prisma.deviceToken.deleteMany({
            where: {
                userId: authUser.id,
                token,
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Device token removed'
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/device/token' });
    }
}
