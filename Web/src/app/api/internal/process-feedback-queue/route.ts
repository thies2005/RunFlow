import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

const CONCURRENCY = 5;
const TIMEOUT_MS = 90_000;
const BACKOFF_MINUTES = [5, 30, 180]; // wait 5m, 30m, 3h before retries

/**
 * POST /api/internal/process-feedback-queue
 * Internal endpoint called by cron to process pending AI feedback jobs.
 */
export async function POST(req: NextRequest) {
    // Verify internal secret
    const secret = req.headers.get('x-internal-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Recovery: reset PROCESSING jobs that have been stuck for >120s (worker crash recovery)
        const staleThreshold = new Date(Date.now() - 120_000);
        await prisma.feedbackJob.updateMany({
            where: {
                status: 'PROCESSING',
                startedAt: { lt: staleThreshold }
            },
            data: {
                status: 'PENDING',
                startedAt: null,
                errorLog: 'Reset from stuck PROCESSING state'
            }
        });

        // Atomic claim of jobs
        // This transaction ensures we don't start the same job twice
        const jobs = await prisma.$transaction(async (tx) => {
            const pending = await tx.feedbackJob.findMany({
                where: {
                    status: 'PENDING',
                    nextRunAt: { lte: new Date() }
                },
                orderBy: [
                    { priority: 'asc' }, // high priority first
                    { createdAt: 'asc' } // oldest first
                ],
                take: CONCURRENCY
            });

            if (pending.length === 0) return [];

            // Mark as processing
            await tx.feedbackJob.updateMany({
                where: { id: { in: pending.map((j: { id: string }) => j.id) } },
                data: {
                    status: 'PROCESSING',
                    startedAt: new Date()
                }
            });

            return pending;
        });

        if (jobs.length === 0) {
            return NextResponse.json({ message: 'No jobs to process' });
        }

        logger.info(`[QueueWorker] Processing ${jobs.length} feedback jobs`);

        const results = { success: 0, failed: 0 };

        // Process serially to manage rate limits and stability
        for (const job of jobs) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                // Pass the signal all the way down to fetch
                await generateAndSaveActivityFeedback(job.activityId, job.userId, false, controller.signal);

                // Success
                await prisma.feedbackJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'DONE',
                        completedAt: new Date(),
                        errorLog: null
                    }
                });
                results.success++;
                logger.info(`[QueueWorker] Finished job ${job.id} for activity ${job.activityId}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const isTimeout = controller.signal.aborted;
                
                const newRetryCount = job.retryCount + 1;
                const isFinal = newRetryCount >= job.maxRetries;
                
                // Exponential backoff
                const backoffMinutes = BACKOFF_MINUTES[job.retryCount] || 180;
                const nextRunAt = isFinal ? undefined : new Date(Date.now() + backoffMinutes * 60 * 1000);

                await prisma.feedbackJob.update({
                    where: { id: job.id },
                    data: {
                        status: isFinal ? 'FAILED' : 'PENDING',
                        retryCount: newRetryCount,
                        nextRunAt,
                        errorLog: isTimeout ? 'Timeout after 90s' : errorMessage
                    }
                });

                results.failed++;
                logger.error(`[QueueWorker] Job ${job.id} failed (${newRetryCount}/${job.maxRetries}): ${errorMessage}`);
            } finally {
                clearTimeout(timer);
            }
        }

        return NextResponse.json({
            processed: jobs.length,
            ...results
        });
    } catch (error) {
        logger.error('[QueueWorker] Unexpected error in worker loop:', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
