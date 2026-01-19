
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { AuthCodeType } from '@prisma/client';

export async function POST(request: NextRequest) {
    try {
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
            await sendPasswordResetEmail(user.email!, code);
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset code has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
