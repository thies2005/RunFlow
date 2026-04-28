import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { AuthCodeType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { logger } from '@/lib/logging/logger';
import { handleError } from '@/lib/errors/handler';

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 3, windowSeconds: 900, prefix: 'mobile_forgot_pw' });

        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (user) {
            const code = await createAuthCode(user.email!, AuthCodeType.PASSWORD_RESET);

            sendPasswordResetEmail(user.email!, code).catch((emailError) => {
                logger.error('Failed to send reset email', {
                    email: user.email,
                    error: emailError instanceof Error ? emailError.message : String(emailError)
                });
            });
        }

        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset code has been sent.'
        });

    } catch (error) {
        return handleError(error);
    }
}
