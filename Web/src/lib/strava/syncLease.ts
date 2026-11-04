import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { invalidateUserDashboardCache } from '@/lib/redis';
import { logger } from '@/lib/logging/logger';

// The token makes release and heartbeat safe if a crashed worker's lease was taken over.
const LEASE_MS = 5 * 60_000;
const HEARTBEAT_MS = 30_000;

export async function acquireStravaSync(
    userId: string,
    request?: { range: string; resume?: boolean; expectedLastSyncAt?: Date | null },
): Promise<string | null> {
    const now = new Date();
    const token = randomUUID();
    const claimed = await prisma.user.updateMany({
        where: {
            id: userId,
            stravaSyncRange: request?.resume ? request.range : null,
            lastSyncAt: request?.expectedLastSyncAt,
            OR: [{ stravaSyncExpiresAt: null }, { stravaSyncExpiresAt: { lte: now } }],
        },
        data: {
            stravaSyncToken: token, stravaSyncExpiresAt: new Date(+now + LEASE_MS), syncInProgress: true,
            stravaSyncRange: request?.range,
        },
    });
    if (claimed.count === 0) return null;
    return token;
}

export async function runWithStravaSyncLease<T>(
    userId: string, token: string, work: (assertLease: () => void) => Promise<T>,
): Promise<T> {
    let lost = false;
    let stopped = false;
    let expiresAt = Date.now() + LEASE_MS;
    let heartbeat: Promise<void> | undefined;
    const timer = setInterval(() => {
        if (heartbeat || stopped) return;
        const next = Date.now() + LEASE_MS;
        heartbeat = prisma.user.updateMany({
            where: { id: userId, stravaSyncToken: token, stravaSyncExpiresAt: { gt: new Date() } },
            data: { stravaSyncExpiresAt: new Date(next) },
        }).then(result => {
            if (result.count === 0) lost = true;
            else expiresAt = next;
        }).catch(error => {
            logger.warn('Strava sync lease heartbeat failed', { userId, error: String(error) });
        }).finally(() => { heartbeat = undefined; });
    }, HEARTBEAT_MS);
    try {
        return await work(() => {
            if (lost || Date.now() >= expiresAt) throw new Error('Strava sync lease expired');
        });
    } finally {
        stopped = true;
        clearInterval(timer);
        await heartbeat;
        // Activity and metrics changes must be visible before the progress
        // endpoint tells a client its one dashboard refresh can run.
        if (!lost && Date.now() < expiresAt) await invalidateUserDashboardCache(userId);
        const released = await prisma.user.updateMany({
            where: { id: userId, stravaSyncToken: token, stravaSyncExpiresAt: { gt: new Date() } },
            data: { stravaSyncToken: null, stravaSyncExpiresAt: null, stravaSyncRange: null, syncInProgress: false },
        });
        if (released.count > 0) await invalidateUserDashboardCache(userId);
    }
}
