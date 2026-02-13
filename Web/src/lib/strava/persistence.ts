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
import { safeBigInt } from '@/lib/utils/bigint';
import type { ActivityData } from './transform';
import { logger } from '@/lib/logging/logger';

export async function saveActivitiesToDatabase(
    userId: string,
    activities: Array<{ activityId: number; data: ActivityData; isNew: boolean }>
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const { activityId, data, isNew } of activities) {
        if (isNew) {
            await prisma.activity.create({
                data: {
                    userId,
                    stravaId: safeBigInt(activityId),
                    ...data,
                    type: data.type as any,
                },
            });
            created++;
        } else {
            const existing = await prisma.activity.findFirst({
                where: { stravaId: safeBigInt(activityId) },
                select: { id: true }
            });

            if (existing) {
                await prisma.activity.update({
                    where: { id: existing.id },
                    data: {
                        ...data,
                        type: data.type as any,
                        updatedAt: new Date()
                    }
                });
                updated++;
            }
        }
    }

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
                type: data.type as any,
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
                type: data.type as any,
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
                type: data.type as any,
            }
        });
        return { created: true };
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
