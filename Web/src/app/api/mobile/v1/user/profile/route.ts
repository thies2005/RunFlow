/**
 * Mobile User Profile Endpoint
 * 
 * GET /api/mobile/v1/user/profile - Get user profile
 * PUT /api/mobile/v1/user/profile - Update user profile
 * PATCH /api/mobile/v1/user/profile - Update user profile (Alias for PUT)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

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
        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                sex: true,
                birthDate: true,
                hrMax: true,
                hrRest: true,
                weight: true,
                height: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                thresholdHeartRate: true,
                thresholdPace: true,
                vdotCorrectionFactor: true,
                lastSyncAt: true,
                createdAt: true,
            }
        });

        if (!user) {
            return errorResponses.notFound('User');
        }

        return NextResponse.json({
            user: {
                ...user,
                birthDate: user.birthDate?.toISOString() || null,
                lastSyncAt: user.lastSyncAt?.toISOString() || null,
                createdAt: user.createdAt.toISOString()
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/user/profile'
        });
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(
                rateLimitResult.retryAfter
            );
        }

        // Authenticate
        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const {
            name, sex, birthDate, hrMax, hrRest, weight, height,
            hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max,
            thresholdHeartRate, thresholdPace,
            vdotCorrectionFactor
        } = body;

        // Validate HR zones if provided
        if (hrMax !== undefined && (typeof hrMax !== 'number' || hrMax < 100 || hrMax > 250)) {
            return errorResponses.validation(
                'HR Max must be between 100 and 250',
                { field: 'hrMax', min: 100, max: 250 }
            );
        }

        const user = await prisma.user.update({
            where: { id: authUser.id },
            data: {
                name: name !== undefined ? name : undefined,
                sex: sex !== undefined ? sex : undefined,
                birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
                hrMax: hrMax !== undefined ? hrMax : undefined,
                hrRest: hrRest !== undefined ? hrRest : undefined,
                weight: weight !== undefined ? weight : undefined,
                height: height !== undefined ? height : undefined,
                hrZone1Max: undefined !== hrZone1Max ? hrZone1Max : undefined,
                hrZone2Max: undefined !== hrZone2Max ? hrZone2Max : undefined,
                hrZone3Max: undefined !== hrZone3Max ? hrZone3Max : undefined,
                hrZone4Max: undefined !== hrZone4Max ? hrZone4Max : undefined,
                hrZone5Max: undefined !== hrZone5Max ? hrZone5Max : undefined,
                hrZone6Max: undefined !== hrZone6Max ? hrZone6Max : undefined,
                thresholdHeartRate: undefined !== thresholdHeartRate ? thresholdHeartRate : undefined,
                thresholdPace: undefined !== thresholdPace ? thresholdPace : undefined,
                vdotCorrectionFactor: undefined !== vdotCorrectionFactor ? vdotCorrectionFactor : undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                sex: true,
                birthDate: true,
                hrMax: true,
                hrRest: true,
                weight: true,
                height: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                thresholdHeartRate: true,
                thresholdPace: true,
                vdotCorrectionFactor: true,
            }
        });

        return NextResponse.json({
            user: {
                ...user,
                birthDate: user.birthDate?.toISOString() || null
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/user/profile'
        });
    }
}

// Alias PATCH to PUT since they perform the same update logic here
export async function PATCH(request: NextRequest) {
    return PUT(request);
}
