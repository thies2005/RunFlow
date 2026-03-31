
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthCode } from '@/lib/auth/tokens';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - M-01 fix
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 10, windowSeconds: 3600, prefix: 'verify-email' });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 });
        }

        const { email: rawEmail, code } = await request.json();
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : rawEmail;

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }

        const isValid = await verifyAuthCode(email, code, AuthCodeType.VERIFY_EMAIL);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired verification code' },
                { status: 400 }
            );
        }

        // Mark user as verified
        await prisma.user.update({
            where: { email },
            data: {
                emailVerified: new Date(),
                authMethod: 'email' // Ensure auth method is set
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
