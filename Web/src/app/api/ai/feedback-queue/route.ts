import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { prisma } from '@/lib/db';
import { processPendingFeedbackJobs } from '@/lib/ai/feedbackQueue';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
};

export async function GET(request: NextRequest) {
    try {
        const rateLimit = await adminRateLimit(request, 'read');
        if (!rateLimit.success) {
            return rateLimit.error!;
        }

        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            const errorResponse = authResult.error;
            Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
                errorResponse.headers.set(key, value);
            });
            return errorResponse;
        }

        const [stats, recentJobs] = await Promise.all([
            prisma.feedbackJob.groupBy({
                by: ['status'],
                _count: { _all: true }
            }),
            prisma.feedbackJob.findMany({
                orderBy: { updatedAt: 'desc' },
                take: 50,
                include: {
                    user: { select: { name: true, email: true } },
                    activity: { select: { name: true, startDate: true } }
                }
            })
        ]);

        const response = NextResponse.json({ stats, recentJobs }, { headers: NO_STORE_HEADERS });
        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Queue status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
    }
}

export async function POST(request: NextRequest) {
    try {
        const isBearer = request.headers.get('authorization')?.startsWith('Bearer ');
        if (!isBearer && !validateCsrfToken(request)) {
            return csrfValidationErrorResponse();
        }

        const rateLimit = await adminRateLimit(request, 'write');
        if (!rateLimit.success) {
            return rateLimit.error!;
        }

        const authResult = await requireAdmin(request);
        if ('error' in authResult) {
            const errorResponse = authResult.error;
            Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
                errorResponse.headers.set(key, value);
            });
            return errorResponse;
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'retry-failed') {
            await prisma.feedbackJob.updateMany({
                where: { status: 'FAILED' },
                data: {
                    status: 'PENDING',
                    retryCount: 0,
                    nextRunAt: new Date()
                }
            });
            await logAdminAction(request, 'MODIFY_FEEDBACK_QUEUE', { type: 'FEEDBACK_QUEUE' }, { action }, authResult.admin.username);
            const response = NextResponse.json({ message: 'Retrying all failed jobs' }, { headers: NO_STORE_HEADERS });
            return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        if (action === 'process-now') {
            const result = await processPendingFeedbackJobs();
            await logAdminAction(request, 'MODIFY_FEEDBACK_QUEUE', { type: 'FEEDBACK_QUEUE' }, { action }, authResult.admin.username);
            const response = NextResponse.json(result, { headers: NO_STORE_HEADERS });
            return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        if (action === 'clear-done') {
            await prisma.feedbackJob.deleteMany({
                where: { status: 'DONE' }
            });
            await logAdminAction(request, 'MODIFY_FEEDBACK_QUEUE', { type: 'FEEDBACK_QUEUE' }, { action }, authResult.admin.username);
            const response = NextResponse.json({ message: 'Cleared completed jobs' }, { headers: NO_STORE_HEADERS });
            return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: NO_STORE_HEADERS });
    } catch (error) {
        console.error('Queue action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
    }
}
