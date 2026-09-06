/**
 * Strava Persistence Module
 * 
 * Handles all database operations for Strava sync:
 * - Activity creation and updates
 * - Batch operations
 * - User profile updates
 * - Sync state management
 */

import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import { safeBigInt } from '@/lib/utils/bigint';
import type { ActivityData } from './transform';
import { logger } from '@/lib/logging/logger';
import { ActivityType } from '@/generated/prisma/browser';

export function validateActivityType(type: string): ActivityType {
    const valid: ActivityType[] = ['RUN', 'RIDE', 'VIRTUAL_RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
    if (valid.includes(type as ActivityType)) return type as ActivityType;
    return 'OTHER';
}

export async function saveActivitiesToDatabase(
    userId: string,
    activities: Array<{ activityId: number; data: ActivityData; isNew: boolean }>
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
        // Batch fetch all existing activities by stravaId to avoid N+1
        const stravaIds = activities.map(a => safeBigInt(a.activityId));
        const existingActivities = await tx.activity.findMany({
            where: { stravaId: { in: stravaIds } },
            select: { id: true, stravaId: true }
        });
        const existingMap = new Map(existingActivities.map(a => [a.stravaId.toString(), a]));

        // Batch fetch potential duplicates for new activities
        const newActivities = activities.filter(a => a.isNew);
        const fiveMinutes = 5 * 60 * 1000;
        const duplicateCandidates = newActivities.length > 0 ? await tx.activity.findMany({
            where: {
                userId,
                stravaId: { lt: BigInt(0) },
                startDate: {
                    gte: new Date(Math.min(...newActivities.map(a => a.data.startDate.getTime())) - fiveMinutes),
                    lte: new Date(Math.max(...newActivities.map(a => a.data.startDate.getTime())) + fiveMinutes),
                }
            },
            select: { id: true, type: true, startDate: true }
        }) : [];

        for (const { activityId, data, isNew } of activities) {
            if (isNew) {
                const duplicate = duplicateCandidates.find(d => {
                    const activityTimestamp = data.startDate.getTime();
                    return d.type === validateActivityType(data.type) &&
                        Math.abs(d.startDate.getTime() - activityTimestamp) <= fiveMinutes;
                });

                if (duplicate) {
                    await tx.activity.update({
                        where: { id: duplicate.id },
                        data: {
                            stravaId: safeBigInt(activityId),
                            ...data,
                            type: validateActivityType(data.type),
                            updatedAt: new Date()
                        }
                    });
                    updated++;
                } else {
                    await tx.activity.create({
                        data: {
                            userId,
                            stravaId: safeBigInt(activityId),
                            ...data,
                            type: validateActivityType(data.type),
                        },
                    });
                    created++;
                }
            } else {
                const existing = existingMap.get(activityId.toString());

                if (existing) {
                    await tx.activity.update({
                        where: { id: existing.id },
                        data: {
                            ...data,
                            type: validateActivityType(data.type),
                            updatedAt: new Date()
                        }
                    });
                    updated++;
                }
            }
        }
    });

    return { created, updated };
}

export async function updateExistingActivity(
    activityId: number,
    data: ActivityData
): Promise<void> {
    const existing = await prisma.activity.findUnique({
        where: { stravaId: safeBigInt(activityId) },
        select: { id: true }
    });

    if (existing) {
        await prisma.activity.update({
            where: { id: existing.id },
            data: {
                ...data,
                type: validateActivityType(data.type),
                updatedAt: new Date()
            }
        });
    }
}

export async function upsertActivity(
    userId: string,
    activityId: number,
    data: ActivityData
): Promise<{ created: boolean }> {
    const existing = await prisma.activity.findUnique({
        where: { stravaId: safeBigInt(activityId) },
        select: { id: true }
    });

    if (existing) {
        await prisma.activity.update({
            where: { id: existing.id },
            data: {
                ...data,
                type: validateActivityType(data.type),
                updatedAt: new Date()
            }
        });
        return { created: false };
    } else {
        // Deduplicate against manual/Health Connect activities (stravaId < 0)
        const fiveMinutes = 5 * 60 * 1000;
        const activityTimestamp = data.startDate.getTime();

        const duplicate = await prisma.activity.findFirst({
            where: {
                userId,
                stravaId: { lt: BigInt(0) },
                type: validateActivityType(data.type),
                startDate: {
                    gte: new Date(activityTimestamp - fiveMinutes),
                    lte: new Date(activityTimestamp + fiveMinutes),
                }
            },
            select: { id: true }
        });

        if (duplicate) {
            await prisma.activity.update({
                where: { id: duplicate.id },
                data: {
                    stravaId: safeBigInt(activityId),
                    ...data,
                    type: validateActivityType(data.type),
                    updatedAt: new Date()
                }
            });
            return { created: false };
        } else {
            await prisma.activity.create({
                data: {
                    userId,
                    stravaId: safeBigInt(activityId),
                    ...data,
                    type: validateActivityType(data.type),
                }
            });
            return { created: true };
        }
    }
}

export async function createNewActivityNotification(
    userId: string,
    activityName: string
): Promise<void> {
    try {
        await prisma.notification.create({
            data: {
                userId,
                message: `New activity imported: ${activityName}`,
            }
        });
    } catch (err) {
        logger.warn('Failed to create notification', { userId, activityName, error: err instanceof Error ? err.message : String(err) });
    }
}

export async function updateUserProfile(
    userId: string,
    data: {
        hrMax?: number;
        sex?: 'MALE' | 'FEMALE';
    }
): Promise<void> {
    const updateData: any = {};
    if (data.hrMax !== undefined) updateData.hrMax = data.hrMax;
    if (data.sex !== undefined) updateData.sex = data.sex;

    if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
    }
}

export async function updateSyncStatus(
    userId: string,
    status: {
        syncInProgress?: boolean;
        lastSyncAt?: Date;
    }
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: status,
    });

    // Bust the dashboard Redis cache: the cache key embeds this version, so
    // sync start/completion is reflected immediately instead of after the
    // 60s TTL (fixes "new activities only appear after page reload").
    try {
        const redisClient = await getRedisClient();
        await redisClient?.incr(`dashboard:cachever:${userId}`);
    } catch {
        // Best-effort: entries still expire via TTL if this fails.
    }
}

export async function fetchExistingActivities(stravaIds: bigint[]): Promise<Map<string, any>> {
    const existingActivities = await prisma.activity.findMany({
        where: { stravaId: { in: stravaIds } },
    });

    const existingMap = new Map();
    for (const a of existingActivities) {
        existingMap.set(a.stravaId.toString(), a);
    }
    return existingMap;
}

export async function getLastActivityDate(userId: string): Promise<Date | null> {
    const lastActivity = await prisma.activity.findFirst({
        where: { userId },
        orderBy: { startDate: 'desc' },
        select: { startDate: true }
    });
    return lastActivity?.startDate ?? null;
}
