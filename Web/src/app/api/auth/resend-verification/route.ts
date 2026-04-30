import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { logger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, {
            limit: 10,
            windowSeconds: 3600,
            prefix: 'resend-verification',
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429 }
            );
        }

        const { email: rawEmail } = await request.json();
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : '';

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { email: true, emailVerified: true },
        });

        if (!user || user.emailVerified) {
            return NextResponse.json({ success: true });
        }

        try {
            const code = await createAuthCode(user.email!, AuthCodeType.VERIFY_EMAIL);
            await sendWelcomeEmail(user.email!, code);
        } catch (error) {
            logger.error('[ResendVerification] Failed to send verification email', { error });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[ResendVerification] Unexpected error', { error });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
