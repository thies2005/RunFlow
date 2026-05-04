/**
 * Mobile Auth Refresh Endpoint
 * 
 * POST /api/mobile/v1/auth/refresh
 * 
 * Exchanges a refresh token for new access and refresh tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, generateTokenPair } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, {
            limit: 20,
            windowSeconds: 60,
            prefix: 'mobile-auth-refresh'
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { refreshToken } = body;

        // Validate required fields
        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid refresh token' },
                { status: 400 }
            );
        }

        // Verify the refresh token
        const payload = await verifyJWT(refreshToken);

        if (!payload || payload.type !== 'refresh' || !payload.userId) {
            return NextResponse.json(
                { error: 'Invalid or expired refresh token' },
                { status: 401 }
            );
        }

        // Verify user still exists
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        // Generate new token pair
        const tokens = await generateTokenPair(user.id);

        return NextResponse.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer'
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        console.error('[Mobile Auth] Refresh error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
