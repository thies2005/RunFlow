
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { hashPassword, validatePassword } from '@/lib/auth/auth-email';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';
import { handleError } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 5, windowSeconds: 900, prefix: 'reset_pw' }); // 5 attempts per 15 mins

        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const rawBody = await readBodyWithLimit(request);
        if (rawBody === null) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
        }
        const { email: rawEmail, code, password } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : rawEmail;

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

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.errors[0] },
                { status: 400 }
            );
        }

        const passwordHash = await hashPassword(password);

        await prisma.user.update({
            where: { email },
            data: {
                passwordHash,
                // Bump tokenVersion to invalidate all existing mobile refresh+access
                // tokens AND all outstanding web sessions (the NextAuth session JWT
                // carries the version and is revoked on mismatch in the session
                // callback)
                tokenVersion: { increment: 1 },
                // Also verify email if not already verified, as they proved ownership via email code
                emailVerified: new Date()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return handleError(error);
    }
}
