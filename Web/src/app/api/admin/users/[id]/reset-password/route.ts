/**
 * Admin User Reset Password API Endpoint
 * 
 * POST /api/admin/users/[id]/reset-password
 * 
 * Triggers a password reset email for the specified user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { AuthCodeType } from '@prisma/client';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const { id: userId } = await params;

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true }
        });

        if (!user || !user.email) {
            return NextResponse.json(
                { error: 'User not found or has no email address' },
                { status: 404 }
            );
        }

        // Generate reset code
        const code = await createAuthCode(user.email, AuthCodeType.PASSWORD_RESET);

        // Send reset email
        try {
            await sendPasswordResetEmail(user.email, code);

            console.log(`[Admin] Password reset triggered for user: ${user.email} (ID: ${userId})`);

            return NextResponse.json({
                success: true,
                message: `Password reset email sent to ${user.email}`,
            });
        } catch (emailError) {
            console.error(`[Admin] Failed to send reset email to ${user.email}:`, emailError);
            return NextResponse.json(
                { error: 'Failed to send reset email. Check server logs for details.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('[Admin User Reset Password] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
