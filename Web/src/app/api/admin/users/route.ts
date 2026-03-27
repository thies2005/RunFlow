/**
 * Admin Users List Endpoint
 * 
 * GET /api/admin/users
 * 
 * Returns paginated list of users with basic info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { handleError } from '@/lib/errors/handler';
import { logAdminAction } from '@/lib/admin/auditLog';

export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        // Build where clause
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ]
        } : {};

        // Get users with activity count
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    createdAt: true,
                    lastSyncAt: true,
                    _count: {
                        select: { activities: true }
                    },
                    aiSettings: {
                        select: {
                            usageTier: true,
                            adminAllowed: true,
                            aiEnabled: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.user.count({ where })
        ]);

        // Transform response
        const transformedUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt.toISOString(),
            lastSyncAt: user.lastSyncAt?.toISOString() ?? null,
            activityCount: user._count.activities,
            aiSettings: user.aiSettings,
        }));

        const response = NextResponse.json({
            users: transformedUsers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });

        await logAdminAction(request, 'VIEW_USERS', undefined, {
            page, limit, searchHasValue: !!search, returnedCount: transformedUsers.length
        }, authResult.admin.username);

        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        return handleError(error);
    }
}
