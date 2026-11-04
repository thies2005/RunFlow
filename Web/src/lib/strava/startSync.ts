import { enqueueFeedbackJobsForActivities } from '@/lib/ai/feedback';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { invalidateUserDashboardCache } from '@/lib/redis';
import { runBackgroundTask } from '@/lib/utils/backgroundTask';
import { getSyncProgress, syncUserActivities } from './sync';
import { AUTO_SYNC_THRESHOLD_MS } from './autoSync';
import { acquireStravaSync, runWithStravaSyncLease } from './syncLease';

const AUTOMATIC_CATCH_UP_MS = 6 * 60 * 60_000;
const RECENT_WEBHOOK_MS = 7 * 24 * 60 * 60_000;
const ALLOWED_RANGES = new Set(['SINCE_LAST_ACTIVITY', '1_MONTH', '3_MONTHS', '6_MONTHS', '1_YEAR', '2_YEARS', 'ALL']);

export function normalizeStravaSyncRange(range: unknown): string {
    return typeof range === 'string' && ALLOWED_RANGES.has(range) ? range : 'SINCE_LAST_ACTIVITY';
}

export async function startStravaSync(userId: string, requestedRange: unknown, automatic: boolean) {
    const range = normalizeStravaSyncRange(requestedRange);
    const progress = await getSyncProgress(userId);
    if (progress.syncInProgress) return { status: 'busy' as const, ...progress };

    // Reduce client-triggered polling only for accounts with recent proof that
    // webhook delivery and processing work. Manual and backfill requests bypass this.
    if (automatic && range === 'SINCE_LAST_ACTIVITY' && progress.lastSyncAt) {
        const elapsed = Date.now() - progress.lastSyncAt.getTime();
        if (elapsed < AUTO_SYNC_THRESHOLD_MS) return { status: 'skipped' as const, ...progress };
        if (elapsed < AUTOMATIC_CATCH_UP_MS) {
            const webhookWorked = await prisma.stravaWebhookJob.findFirst({
                where: { userId, completedAt: { gte: new Date(Date.now() - RECENT_WEBHOOK_MS) } },
                select: { version: true },
            });
            if (webhookWorked) return { status: 'skipped' as const, ...progress };
        }
    }

    const token = await acquireStravaSync(userId, {
        range,
        expectedLastSyncAt: automatic ? progress.lastSyncAt : undefined,
    });
    if (!token) {
        const latest = await getSyncProgress(userId);
        return { ...latest, status: latest.syncInProgress ? 'busy' as const : 'skipped' as const };
    }

    runBackgroundTask(() => runSyncRequest(userId, range, token));
    return { ...progress, status: 'started' as const, syncInProgress: true };
}

async function runSyncRequest(userId: string, range: string, token: string, recovering = false) {
    await runWithStravaSyncLease(userId, token, async assertLease => {
        await invalidateUserDashboardCache(userId);
        const result = await syncUserActivities(userId, range, assertLease, recovering);
        if (result.syncedActivityIds.length) {
            try {
                await enqueueFeedbackJobsForActivities(userId, result.syncedActivityIds);
            } catch (error) {
                logger.error('Failed to enqueue feedback after Strava sync', { userId, error: String(error) });
            }
        }
    });
}

// An accepted request is stored alongside its lease. The cron worker can
// replay requests interrupted by process restarts, without accepting a second
// manual request or competing with an active webhook worker.
export async function recoverStravaSyncRequests() {
    const expired = await prisma.user.findMany({
        where: {
            stravaSyncRange: { not: null },
            OR: [{ stravaSyncExpiresAt: null }, { stravaSyncExpiresAt: { lte: new Date() } }],
        },
        select: { id: true, stravaSyncRange: true },
        orderBy: { stravaSyncExpiresAt: 'asc' },
        take: 8,
    });
    await Promise.allSettled(expired.map(async ({ id, stravaSyncRange: range }) => {
        if (range === null) return;
        const token = await acquireStravaSync(id, { range, resume: true });
        if (token) runBackgroundTask(() => runSyncRequest(id, range, token, true));
    }));
}
