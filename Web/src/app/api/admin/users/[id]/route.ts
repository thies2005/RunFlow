/**
 * Admin User Delete Endpoint
 * 
 * DELETE /api/admin/users/[id]
 * 
 * Deletes a user and all their associated data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logger } from '@/lib/logging/logger';
import { logAdminAction } from '@/lib/admin/auditLog';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimit = await adminRateLimit(request, 'sensitive');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

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

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Delete user (cascades to related records based on Prisma schema)
        await prisma.user.delete({
            where: { id: userId }
        });

        logger.info('User deleted', { userId, userName: user.name, userEmail: user.email });

        await logAdminAction(request, 'DELETE_USER', { type: 'USER', id: userId }, {
            deletedEmail: user.email,
            deletedName: user.name
        }, authResult.admin.username);

        const response = NextResponse.json({
            success: true,
            message: `User ${user.name || user.email || userId} deleted successfully`,
        });

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        logger.error('Failed to delete user', { userId: await (async () => (await params).id)(), error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
