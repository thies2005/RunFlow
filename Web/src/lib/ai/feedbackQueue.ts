import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';
import { logger } from '@/lib/logging/logger';

const CONCURRENCY = 5;
const TIMEOUT_MS = 90_000;
const BACKOFF_MINUTES = [5, 30, 180];

export async function processPendingFeedbackJobs() {
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

    const jobs = await prisma.$transaction(async (tx) => {
        const pending = await tx.feedbackJob.findMany({
            where: {
                status: 'PENDING',
                nextRunAt: { lte: new Date() }
            },
            orderBy: [
                { priority: 'asc' },
                { createdAt: 'asc' }
            ],
            take: CONCURRENCY
        });

        if (pending.length === 0) {
            return [];
        }

        await tx.feedbackJob.updateMany({
            where: { id: { in: pending.map((job) => job.id) } },
            data: {
                status: 'PROCESSING',
                startedAt: new Date()
            }
        });

        return pending;
    });

    if (jobs.length === 0) {
        return { processed: 0, success: 0, failed: 0, message: 'No jobs to process' };
    }

    logger.info(`[QueueWorker] Processing ${jobs.length} feedback jobs`);

    const results = { success: 0, failed: 0 };

    for (const job of jobs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            await generateAndSaveActivityFeedback(job.activityId, job.userId, false, controller.signal);

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

    return {
        processed: jobs.length,
        ...results
    };
}
