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
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, resetRateLimit } from '@/lib/rateLimit';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';

export async function POST(request: NextRequest) {
    try {
        // Per-client gate (the guessing defense): keyed on the request's
        // client identifier, never on the caller-supplied email, so nothing
        // before credential verification can create denial state for an
        // account the caller does not control.
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

        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }
        const body = JSON.parse(rawBody);
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
            // Count only FAILED verifications, keyed per client + email, so an
            // anonymous caller cannot lock out someone else's account - and a
            // correct-password login never consults the limiter at all.
            const emailFailureLimit = await checkRateLimitAsync(`${clientId}|${normalizedEmail}`, {
                limit: 5,
                windowSeconds: 300,
                prefix: 'mobile-email-login-email'
            });

            if (!emailFailureLimit.allowed) {
                return NextResponse.json(
                    { error: 'Too many login attempts for this account. Please try again later.' },
                    { status: 429, headers: rateLimitHeaders(emailFailureLimit) }
                );
            }

            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Successful verification clears this client's failure counter for
        // the account.
        await resetRateLimit(`${clientId}|${normalizedEmail}`, 'mobile-email-login-email');

        // Generate JWT tokens
        const tokens = await generateTokenPair(user.id, user.tokenVersion);

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
