
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
        // Rate limiting check
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 3, windowSeconds: 900, prefix: 'forgot_pw' }); // 3 attempts per 15 mins

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

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        // We don't want to leak if a user exists or not, so we just return success
        // BUT we only send email if user exists and has a password (email auth) or is setting one up
        if (user) {
            // Generate and send code
            const code = await createAuthCode(user.email!, AuthCodeType.PASSWORD_RESET);

            // Send email (don't await to not block response? actually better to await to catch errors)
            try {
                await sendPasswordResetEmail(user.email!, code);
            } catch (emailError) {
                logger.error('Failed to send reset email', { email: user.email, error: emailError instanceof Error ? emailError.message : String(emailError) });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset code has been sent.'
        });

    } catch (error) {
        return handleError(error);
    }
}
