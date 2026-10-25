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
                effectiveVo2maxCorrectionFactor: true,
                includeCrossTraining: true,
                ftpWatts: true,
                autoEstimateFtp: true,
                swimCssSecPer100m: true,
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
            vdotCorrectionFactor, effectiveVo2maxCorrectionFactor, includeCrossTraining,
            ftpWatts, autoEstimateFtp, swimCssSecPer100m
        } = body;

        // Validate HR zones if provided
        if (hrMax !== undefined && hrMax !== null && (typeof hrMax !== 'number' || hrMax < 100 || hrMax > 250)) {
            return errorResponses.validation(
                'HR Max must be between 100 and 250',
                { field: 'hrMax', min: 100, max: 250 }
            );
        }

        // Validate correction factors if provided
        if (effectiveVo2maxCorrectionFactor !== undefined && effectiveVo2maxCorrectionFactor !== null &&
            (typeof effectiveVo2maxCorrectionFactor !== 'number' || effectiveVo2maxCorrectionFactor < 0.5 || effectiveVo2maxCorrectionFactor > 1.5)) {
            return errorResponses.validation(
                'Effective VO2max correction factor must be between 0.5 and 1.5',
                { field: 'effectiveVo2maxCorrectionFactor', min: 0.5, max: 1.5 }
            );
        }

        if (includeCrossTraining !== undefined && includeCrossTraining !== null && typeof includeCrossTraining !== 'boolean') {
            return errorResponses.validation(
                'includeCrossTraining must be a boolean',
                { field: 'includeCrossTraining' }
            );
        }

        if (sex !== undefined && sex !== null && !['MALE', 'FEMALE', 'OTHER'].includes(sex)) {
            return errorResponses.validation('sex must be MALE, FEMALE, or OTHER', { field: 'sex' });
        }
        if (hrRest !== undefined && hrRest !== null && (typeof hrRest !== 'number' || !Number.isFinite(hrRest) || hrRest < 25 || hrRest > 150)) {
            return errorResponses.validation('hrRest must be between 25 and 150', { field: 'hrRest', min: 25, max: 150 });
        }
        if (weight !== undefined && weight !== null && (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 20 || weight > 300)) {
            return errorResponses.validation('weight must be between 20 and 300 kg', { field: 'weight', min: 20, max: 300 });
        }
        if (height !== undefined && height !== null && (typeof height !== 'number' || !Number.isFinite(height) || height < 80 || height > 260)) {
            return errorResponses.validation('height must be between 80 and 260 cm', { field: 'height', min: 80, max: 260 });
        }
        if (vdotCorrectionFactor !== undefined && vdotCorrectionFactor !== null && (typeof vdotCorrectionFactor !== 'number' || !Number.isFinite(vdotCorrectionFactor) || vdotCorrectionFactor < 0.5 || vdotCorrectionFactor > 1.5)) {
            return errorResponses.validation('vdotCorrectionFactor must be between 0.5 and 1.5', { field: 'vdotCorrectionFactor', min: 0.5, max: 1.5 });
        }
        if (ftpWatts !== undefined && ftpWatts !== null && (typeof ftpWatts !== 'number' || !Number.isInteger(ftpWatts) || ftpWatts < 40 || ftpWatts > 1000)) {
            return errorResponses.validation('ftpWatts must be an integer between 40 and 1000', { field: 'ftpWatts', min: 40, max: 1000 });
        }
        if (swimCssSecPer100m !== undefined && swimCssSecPer100m !== null && (typeof swimCssSecPer100m !== 'number' || !Number.isInteger(swimCssSecPer100m) || swimCssSecPer100m < 40 || swimCssSecPer100m > 600)) {
            return errorResponses.validation('swimCssSecPer100m must be an integer between 40 and 600', { field: 'swimCssSecPer100m', min: 40, max: 600 });
        }
        for (const [zoneField, zoneVal] of [
            ['hrZone1Max', hrZone1Max], ['hrZone2Max', hrZone2Max], ['hrZone3Max', hrZone3Max],
            ['hrZone4Max', hrZone4Max], ['hrZone5Max', hrZone5Max], ['hrZone6Max', hrZone6Max]
        ] as const) {
            if (zoneVal !== undefined && zoneVal !== null && (typeof zoneVal !== 'number' || !Number.isInteger(zoneVal) || zoneVal < 40 || zoneVal > 250)) {
                return errorResponses.validation(`${zoneField} must be between 40 and 250`, { field: zoneField, min: 40, max: 250 });
            }
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
                effectiveVo2maxCorrectionFactor: undefined !== effectiveVo2maxCorrectionFactor ? effectiveVo2maxCorrectionFactor : undefined,
                includeCrossTraining: undefined !== includeCrossTraining ? includeCrossTraining : undefined,
                ftpWatts: undefined !== ftpWatts ? ftpWatts : undefined,
                autoEstimateFtp: undefined !== autoEstimateFtp ? autoEstimateFtp : undefined,
                swimCssSecPer100m: undefined !== swimCssSecPer100m ? swimCssSecPer100m : undefined,
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
                effectiveVo2maxCorrectionFactor: true,
                includeCrossTraining: true,
                ftpWatts: true,
                autoEstimateFtp: true,
                swimCssSecPer100m: true,
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
