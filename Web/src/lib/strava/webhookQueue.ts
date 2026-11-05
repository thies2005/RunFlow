import { createHash, randomUUID } from 'node:crypto';
import { enqueueFeedbackJobsForActivities } from '@/lib/ai/feedback';
import { prisma } from '@/lib/db';
import type { StravaWebhookJob } from '@/generated/prisma/client';
import { logger } from '@/lib/logging/logger';
import { StravaActivityUnavailableError } from './fetch';
import { recomputeStravaFitness, syncActivityById } from './sync';
import { acquireStravaSync, runWithStravaSyncLease } from './syncLease';

const COALESCE_MS = 750;
const JOBS_PER_USER = 20;
const USER_BATCH = 8;
const RETAIN_COMPLETED_MS = 8 * 24 * 60 * 60_000;

export function classifyActivityEvent(aspect: 'create' | 'update' | 'delete', updates?: Record<string, unknown>) {
    if (aspect === 'delete') return { kind: 'delete', title: null };
    if (aspect === 'update' && updates && Object.keys(updates).length === 1 &&
        typeof updates.title === 'string' && updates.title.length > 0 && updates.title.length <= 255) {
        return { kind: 'title', title: updates.title };
    }
    return { kind: 'upsert', title: null };
}

export async function enqueueStravaWebhook(
    userId: string, ownerId: string, activityId: number, eventTime: number,
    aspect: 'create' | 'update' | 'delete', updates?: Record<string, unknown>,
): Promise<boolean> {
    const { kind, title } = classifyActivityEvent(aspect, updates);
    const key = createHash('sha256').update(JSON.stringify([
        eventTime, aspect, Object.entries(updates ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    ])).digest('hex');
    const version = randomUUID();
    const dueAt = new Date(Date.now() + (kind === 'delete' ? 0 : COALESCE_MS));

    // Merge pending changes atomically across replicas. A title update can't
    // replace pending full import work; an ambiguous same-second update also
    // uses current upstream data instead of trusting arrival order.
    const written = await prisma.$executeRaw`
        INSERT INTO "StravaWebhookJob" (
            "userId", "activityId", "ownerId", "eventTime", "eventKey", "kind", "title", "version", "dueAt"
        ) VALUES (${userId}, ${BigInt(activityId)}, ${ownerId}, ${BigInt(eventTime)}, ${key}, ${kind}, ${title}, ${version}, ${dueAt})
        ON CONFLICT ("userId", "activityId") DO UPDATE SET
            "ownerId" = EXCLUDED."ownerId",
            "eventTime" = EXCLUDED."eventTime",
            "eventKey" = EXCLUDED."eventKey",
            "kind" = CASE
                WHEN EXCLUDED."kind" = 'delete' THEN 'delete'
                WHEN EXCLUDED."eventTime" = "StravaWebhookJob"."eventTime" THEN 'upsert'
                WHEN EXCLUDED."kind" = 'title' AND (
                    "StravaWebhookJob"."kind" = 'delete' OR
                    ("StravaWebhookJob"."kind" = 'upsert' AND "StravaWebhookJob"."completedAt" IS NULL)
                ) THEN 'upsert'
                ELSE EXCLUDED."kind"
            END,
            "title" = EXCLUDED."title",
            "version" = EXCLUDED."version",
            "dueAt" = EXCLUDED."dueAt",
            "attempts" = 0,
            "completedAt" = NULL
        WHERE "StravaWebhookJob"."eventKey" <> EXCLUDED."eventKey" AND (
            "StravaWebhookJob"."eventTime" < EXCLUDED."eventTime" OR
            ("StravaWebhookJob"."eventTime" = EXCLUDED."eventTime" AND "StravaWebhookJob"."kind" <> 'delete')
        )
    `;
    return written > 0;
}

function jobVersion(job: StravaWebhookJob) {
    return { userId: job.userId, activityId: job.activityId, version: job.version };
}

async function removeActivity(job: StravaWebhookJob): Promise<Date | null> {
    return prisma.$transaction(async tx => {
        const where = { userId: job.userId, stravaId: job.activityId };
        const activity = await tx.activity.findFirst({ where, select: { startDate: true } });
        const date = job.fitnessFrom && activity
            ? new Date(Math.min(+job.fitnessFrom, +activity.startDate))
            : job.fitnessFrom ?? activity?.startDate ?? null;
        // Save the affected date before deletion so a crash or failed
        // recalculation still repairs fitness on the next attempt.
        const marked = await tx.stravaWebhookJob.updateMany({
            where: jobVersion(job), data: { fitnessFrom: date },
        });
        if (marked.count === 0) return null;
        await tx.activity.deleteMany({ where });
        return date;
    });
}

async function processJob(job: StravaWebhookJob, assertLease: () => void) {
    assertLease();
    if (job.kind === 'delete') return { startDate: await removeActivity(job) };

    if (job.kind === 'title' && job.title) {
        const updated = await prisma.activity.updateMany({
            where: { userId: job.userId, stravaId: job.activityId },
            data: { name: job.title },
        });
        if (updated.count > 0) return { startDate: job.fitnessFrom };
        // A title update can precede initial import. Fetch the missing activity.
    }

    try {
        const result = await syncActivityById(job.userId, Number(job.activityId), assertLease);
        return {
            id: result.id,
            startDate: job.fitnessFrom ? new Date(Math.min(+job.fitnessFrom, +result.startDate)) : result.startDate,
        };
    } catch (error) {
        // Allow Strava's activity to become readable just after upload.
        // An activity that's still unavailable may have become private.
        if (!(error instanceof StravaActivityUnavailableError) || job.attempts < 2) throw error;
        assertLease();
        return { startDate: await removeActivity(job) };
    }
}

async function postpone(job: StravaWebhookJob, error: unknown) {
    const delay = Math.min(60 * 60_000, 15_000 * (2 ** Math.min(job.attempts, 8)));
    logger.warn('Strava webhook job delayed', {
        userId: job.userId, activityId: job.activityId.toString(), attempt: job.attempts + 1,
        error: error instanceof Error ? error.message : String(error),
    });
    await prisma.stravaWebhookJob.updateMany({
        where: jobVersion(job),
        data: { attempts: { increment: 1 }, dueAt: new Date(Date.now() + delay) },
    });
}

export async function drainStravaWebhooks(userId: string) {
    // Check for work before acquiring the user lease, including after a burst
    // where another request may already have drained it.
    const pending = await prisma.stravaWebhookJob.findFirst({
        where: { userId, completedAt: null, dueAt: { lte: new Date() } }, select: { version: true },
    });
    if (!pending) return;
    const token = await acquireStravaSync(userId);
    if (!token) return;

    await runWithStravaSyncLease(userId, token, async assertLease => {
        const jobs = await prisma.stravaWebhookJob.findMany({
            where: { userId, completedAt: null, dueAt: { lte: new Date() } },
            orderBy: { dueAt: 'asc' }, take: JOBS_PER_USER,
        });
        const accounts = await prisma.account.findMany({
            where: { userId, provider: 'strava' }, select: { providerAccountId: true },
        });
        const owners = new Set(accounts.map(a => a.providerAccountId));
        const done: StravaWebhookJob[] = [];
        const feedbackIds: string[] = [];
        const modified: { startDate: Date }[] = [];

        for (const job of jobs) {
            assertLease();
            try {
                if (owners.has(job.ownerId)) {
                    const result = await processJob(job, assertLease);
                    if (result.id) feedbackIds.push(result.id);
                    if (result.startDate) {
                        modified.push({ startDate: result.startDate });
                        await prisma.stravaWebhookJob.updateMany({
                            where: jobVersion(job), data: { fitnessFrom: result.startDate },
                        });
                    }
                }
                done.push(job);
            } catch (error) {
                await postpone(job, error);
            }
        }
        assertLease();
        try {
            await recomputeStravaFitness(userId, modified, true);
        } catch (error) {
            await Promise.all(done.map(job => postpone(job, error)));
            return;
        }
        assertLease();
        if (done.length > 0) {
            await prisma.stravaWebhookJob.updateMany({
                where: { OR: done.map(jobVersion) }, data: { completedAt: new Date(), fitnessFrom: null },
            });
        }
        if (feedbackIds.length > 0) {
            try {
                await enqueueFeedbackJobsForActivities(userId, feedbackIds);
            } catch (error) {
                logger.error('Failed to enqueue webhook feedback', { userId, error: String(error) });
            }
        }
    });
}

// One immediate drain per user/process absorbs bursts; the database lease
// provides cross-process exclusion, and cron retries after crashes or contention.
const scheduled = new Map<string, { rerun: boolean }>();
export async function scheduleStravaWebhookDrain(userId: string, urgent = false) {
    if (urgent) return drainStravaWebhooks(userId);
    const current = scheduled.get(userId);
    if (current) {
        current.rerun = true;
        return;
    }
    const state = { rerun: false };
    scheduled.set(userId, state);
    try {
        await new Promise(resolve => setTimeout(resolve, COALESCE_MS));
        await drainStravaWebhooks(userId);
        // A job arriving during the first wait/drain may not be due yet.
        // Bound local follow-up work; cron picks up sustained traffic.
        if (state.rerun) {
            await new Promise(resolve => setTimeout(resolve, COALESCE_MS));
            await drainStravaWebhooks(userId);
        }
    } finally {
        scheduled.delete(userId);
    }
}

export async function retryStravaWebhooks() {
    const users = await prisma.$queryRaw<{ userId: string }[]>`
        SELECT j."userId" FROM "StravaWebhookJob" j
        JOIN "User" u ON u."id" = j."userId"
        WHERE j."completedAt" IS NULL AND j."dueAt" <= CURRENT_TIMESTAMP
          AND u."stravaSyncRange" IS NULL
          AND (u."stravaSyncExpiresAt" IS NULL OR u."stravaSyncExpiresAt" <= CURRENT_TIMESTAMP)
        GROUP BY j."userId"
        ORDER BY MIN(j."dueAt")
        LIMIT ${USER_BATCH}
    `;
    const results = await Promise.allSettled(users.map(({ userId }) => drainStravaWebhooks(userId)));
    const failed = results.filter(result => result.status === 'rejected').length;
    if (failed) logger.warn('Some Strava webhook drains failed', { failed });
    await prisma.stravaWebhookJob.deleteMany({
        where: { completedAt: { lt: new Date(Date.now() - RETAIN_COMPLETED_MS) } },
    });
    return { scheduled: users.length, failed };
}
