/**
 * Mobile Email Login Endpoint
 * 
 * POST /api/mobile/v1/auth/email-login
 * Authenticates a user with email and password and returns JWT tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/auth-email';
import { generateTokenPair } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, {
            limit: 5,
            windowSeconds: 60,
            prefix: 'mobile-email-login'
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const emailRateLimit = await checkRateLimitAsync(email.toLowerCase(), {
            limit: 5,
            windowSeconds: 300,
            prefix: 'mobile-email-login-email'
        });

        if (!emailRateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts for this account. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(emailRateLimit) }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Generate JWT tokens
        const tokens = await generateTokenPair(user.id);

        return NextResponse.json({
            ...tokens,
            tokenType: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: user.emailVerified
            }
        }, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        console.error('[Mobile Auth] Email login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
