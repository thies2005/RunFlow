export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
        const action = searchParams.get('action');
        const offset = (page - 1) * limit;

        const where = action ? { action } : {};

        const [logs, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            prisma.adminAuditLog.count({ where })
        ]);

        const response = NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        return handleError(error);
    }
}
