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

export async function DELETE(
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

        console.log(`[Admin] User deleted: ${userId} (${user.name || user.email})`);

        return NextResponse.json({
            success: true,
            message: `User ${user.name || user.email || userId} deleted successfully`,
        });

    } catch (error) {
        console.error('[Admin User Delete] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
