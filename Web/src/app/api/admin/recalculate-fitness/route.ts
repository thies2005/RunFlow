
/**
 * Admin Endpoint: Recalculate Fitness
 * 
 * POST /api/admin/recalculate-fitness
 * 
 * Triggers a full recalculation of fitness history for all users.
 * Useful for fixing data corruption or applying new calculation logic retroactively.
 * 
 * Requires Admin Authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'sensitive');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        // Check for specific userId in body (optional)
        let targetUserId: string | null = null;
        try {
            const body = await request.json();
            if (body && body.userId) {
                targetUserId = body.userId;
            }
        } catch (e) {
            // Ignore JSON parse error, assume no body -> all users
        }

        console.log(targetUserId
            ? `[Admin] Starting fitness recalculation for user ${targetUserId}...`
            : '[Admin] Starting fitness recalculation for ALL users...');

        // 2. Fetch users (all or specific)
        const users = await prisma.user.findMany({
            where: targetUserId ? { id: targetUserId } : undefined,
            select: { id: true, email: true }
        });

        console.log(`[Admin] Found ${users.length} users to process.`);

        const results = [];

        // 3. Process each user
        for (const user of users) {
            try {
                // Find earliest activity date for this user
                const firstActivity = await prisma.activity.findFirst({
                    where: { userId: user.id },
                    orderBy: { startDate: 'asc' },
                    select: { startDate: true }
                });

                if (firstActivity) {
                    console.log(`[Admin] Recalculating for user ${user.email} (Start: ${firstActivity.startDate.toISOString()})`);

                    // We pass the earliest activity as a "modified activity".
                    // The updateFitnessCache logic will:
                    // 1. Look for baseline before this date (likely none).
                    // 2. Start from 0/0.
                    // 3. Recalculate everything from that date forward to today.
                    await updateFitnessCache(user.id, [{ startDate: firstActivity.startDate }]);

                    results.push({ userId: user.id, email: user.email, status: 'success', startDate: firstActivity.startDate });
                } else {
                    console.log(`[Admin] User ${user.email} has no activities. Skipping.`);
                    results.push({ userId: user.id, email: user.email, status: 'skipped', reason: 'no_activities' });
                }
            } catch (err: any) {
                console.error(`[Admin] Failed to recalculate for user ${user.email}:`, err);
                results.push({ userId: user.id, email: user.email, status: 'error', error: err.message });
            }
        }

        const response = NextResponse.json({
            message: 'Recalculation complete',
            totalUsers: users.length,
            results
        });

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error: any) {
        console.error('[Admin] Global error during recalculation:', error);
        return NextResponse.json(
            { error: 'Internal server error during recalculation: ' + error.message },
            { status: 500 }
        );
    }
}
