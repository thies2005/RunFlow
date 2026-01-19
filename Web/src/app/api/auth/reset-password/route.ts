
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { hashPassword } from '@/lib/auth/auth-email';
import { AuthCodeType } from '@prisma/client';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 5, windowSeconds: 900, prefix: 'reset_pw' }); // 5 attempts per 15 mins

        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { email, code, password } = await request.json();

        if (!email || !code || !password) {
            return NextResponse.json(
                { error: 'Email, code, and new password are required' },
                { status: 400 }
            );
        }

        const isValid = await verifyAuthCode(email, code, AuthCodeType.PASSWORD_RESET);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        // specific password validation could go here, but assumed frontend does it too
        // or we rely on the auth-email lib
        const passwordHash = await hashPassword(password);

        await prisma.user.update({
            where: { email },
            data: {
                passwordHash,
                // Also verify email if not already verified, as they proved ownership via email code
                emailVerified: new Date()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
