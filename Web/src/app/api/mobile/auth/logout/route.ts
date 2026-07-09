/**
 * Mobile Auth Logout Endpoint
 * 
 * POST /api/mobile/auth/logout
 * 
 * Logs out the user. Currently a no-op since we use stateless JWTs,
 * but this endpoint exists for:
 * 1. API completeness
 * 2. Future token blacklisting if needed
 * 3. Any server-side cleanup operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        // Verify the user is authenticated
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // In the future, we could:
        // - Add the token to a blacklist
        // - Clear any server-side user state
        // - Log the logout event

        // Bump tokenVersion to invalidate all existing refresh+access tokens
        // issued for this user (token-version-based revocation).
        await prisma.user.update({
            where: { id: user.id },
            data: { tokenVersion: { increment: 1 } }
        });

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('[Mobile Auth] Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
