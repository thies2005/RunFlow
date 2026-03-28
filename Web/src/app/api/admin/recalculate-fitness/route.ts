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
import { logger } from '@/lib/logging/logger';

import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import pLimit from 'p-limit';

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

        if (targetUserId) {
            logger.info('Starting fitness recalculation for user', { targetUserId });
        } else {
            logger.info('Starting fitness recalculation for ALL users');
        }

        // 2. Fetch users (all or specific)
        const users = await prisma.user.findMany({
            where: targetUserId ? { id: targetUserId } : undefined,
            select: { id: true, email: true }
        });

        logger.info('Found users to process', { count: users.length });

        // 3. Fetch earliest activities for relevant users efficiently
        // Use groupBy to get the earliest activity date for each user in one query
        const whereClause = targetUserId ? { userId: targetUserId } : undefined;

        const userActivities = await prisma.activity.groupBy({
            by: ['userId'],
            _min: {
                startDate: true
            },
            where: whereClause
        });

        // Create a map for O(1) lookup: userId -> earliestDate
        const activityMap = new Map<string, Date>();
        userActivities.forEach(group => {
            if (group._min.startDate) {
                activityMap.set(group.userId, group._min.startDate);
            }
        });

        // 4. Process users concurrently with rate limiting
        const limit = pLimit(5); // limit concurrency to avoid overloading the database

        const promises = users.map(user => limit(async () => {
            try {
                const startDate = activityMap.get(user.id);

                if (startDate) {
                    logger.info('Recalculating for user', { userEmail: user.email, startDate: startDate.toISOString() });

                    // 0. Clean up any past duplicate activities before recalculating
                    const deletedCount = await cleanupDuplicateActivities(user.id);
                    if (deletedCount > 0) {
                        logger.info('Cleaned up duplicate activities for user', { userEmail: user.email, deletedCount });
                    }

                    // We pass the earliest activity as a "modified activity".
                    // The updateFitnessCache logic will:
                    // 1. Look for baseline before this date (likely none).
                    // 2. Start from 0/0.
                    // 3. Recalculate everything from that date forward to today.
                    await updateFitnessCache(user.id, [{ startDate: startDate }]);

                    return { userId: user.id, email: user.email, status: 'success', startDate: startDate };
                } else {
                    logger.info('User has no activities, skipping', { userEmail: user.email });
                    return { userId: user.id, email: user.email, status: 'skipped', reason: 'no_activities' };
                }
            } catch (err: unknown) {
                logger.error('Failed to recalculate for user', { userEmail: user.email, error: err });
                return { userId: user.id, email: user.email, status: 'error', error: err instanceof Error ? err.message : String(err) };
            }
        }));

        const results = await Promise.all(promises);

        await logAdminAction(request, 'RECALCULATE_FITNESS', targetUserId ? { type: 'USER', id: targetUserId } : { type: 'SYSTEM' }, {
            totalUsersProcessed: users.length,
            targetUserId: targetUserId || 'ALL',
        }, authResult.admin.username);

        const response = NextResponse.json({
            message: 'Recalculation complete',
            totalUsers: users.length,
            results
        });

        return applyRateLimitHeaders(response, 'sensitive', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error: unknown) {
        logger.error('Global error during recalculation', { error });
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: 'Internal server error during recalculation: ' + message },
            { status: 500 }
        );
    }
}

/**
 * Helper to clean up past duplicate activities.
 * Deletes any Health Connect/manual activity (stravaId < 0) that has a 
 * corresponding Strava activity (stravaId > 0) within a 5-minute window.
 */
async function cleanupDuplicateActivities(userId: string): Promise<number> {
    try {
        const negativeActivities = await prisma.activity.findMany({
            where: {
                userId,
                stravaId: { lt: BigInt(0) }
            },
            select: {
                id: true,
                type: true,
                startDate: true
            }
        });

        if (negativeActivities.length === 0) return 0;

        let deletedCount = 0;
        const fiveMinutes = 5 * 60 * 1000;

        const timestamps = negativeActivities.map(a => a.startDate.getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        const potentialDuplicates = await prisma.activity.findMany({
            where: {
                userId,
                stravaId: { gt: BigInt(0) },
                startDate: {
                    gte: new Date(minTime - fiveMinutes),
                    lte: new Date(maxTime + fiveMinutes),
                }
            },
            select: {
                type: true,
                startDate: true
            }
        });

        const idsToDelete: string[] = [];

        for (const negAct of negativeActivities) {
            const timestamp = negAct.startDate.getTime();

            const duplicate = potentialDuplicates.find(posAct =>
                posAct.type === negAct.type &&
                posAct.startDate.getTime() >= timestamp - fiveMinutes &&
                posAct.startDate.getTime() <= timestamp + fiveMinutes
            );

            if (duplicate) {
                idsToDelete.push(negAct.id);
            }
        }

        if (idsToDelete.length > 0) {
            await prisma.activity.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            });
            deletedCount = idsToDelete.length;
        }

        return deletedCount;
    } catch (err) {
        logger.error('Error cleaning up duplicates for user', { userId, error: err });
        return 0;
    }
}
