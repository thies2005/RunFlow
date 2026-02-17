/**
 * Serverless-safe background task execution
 * 
 * In serverless environments (Vercel, AWS Lambda), the runtime may freeze or terminate
 * immediately after the response is sent. This utility provides a safe way to run
 * background tasks that survive the response lifecycle.
 * 
 * On Vercel: Uses the built-in waitUntil API
 * Fallback: Standard Promise execution with error logging
 */

import { logger } from '@/lib/logging/logger';

// Type for Vercel's waitUntil context
interface WaitUntilContext {
    waitUntil: (_promise: Promise<unknown>) => void;
}

// Global store for pending promises (fallback mechanism)
const pendingTasks: Promise<unknown>[] = [];

/**
 * Execute a background task that survives the response lifecycle in serverless
 * 
 * @param task - Async function to execute in the background
 * @param context - Optional waitUntil context (passed from route handler)
 */
export function runBackgroundTask<T>(
    task: () => Promise<T>,
    context?: WaitUntilContext
): void {
    const taskPromise = task().catch((error) => {
        logger.error('Background task error', { error: error instanceof Error ? error.message : String(error) });
    });

    // Use Vercel's waitUntil if available
    if (context?.waitUntil) {
        context.waitUntil(taskPromise);
        return;
    }

    // Fallback: track promise but fire-and-forget
    // This is best-effort for non-Vercel environments
    pendingTasks.push(taskPromise);

    // Clean up completed tasks periodically
    taskPromise.finally(() => {
        const index = pendingTasks.indexOf(taskPromise);
        if (index > -1) {
            pendingTasks.splice(index, 1);
        }
    });
}

/**
 * Get the number of pending background tasks (for monitoring)
 */
export function getPendingTaskCount(): number {
    return pendingTasks.length;
}
