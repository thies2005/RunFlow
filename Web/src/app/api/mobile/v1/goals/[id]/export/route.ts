/**
 * Mobile Goal Export Endpoint
 *
 * GET /api/mobile/v1/goals/[id]/export?format=pdf|csv
 *
 * Renders the goal's training plan with the server-side export engine
 * (same layout engine as the web) and returns it as a download. The
 * Android app uses this when signed in and online; it falls back to its
 * on-device renderer when offline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { buildCsv, buildExportPlan, exportFileName } from '@/lib/export/plan-export';
import { buildPlanPdf } from '@/lib/export/plan-pdf';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const goal = await prisma.goal.findFirst({
            where: { id, userId: user.id, deletedAt: null },
            include: {
                workouts: {
                    orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
                },
            },
        });

        if (!goal) {
            return errorResponses.notFound('Goal');
        }

        const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'pdf';
        const disposition = `attachment; filename="${exportFileName(goal.raceType, format)}"`;
        const headers = rateLimitHeaders(rateLimitResult);

        if (format === 'csv') {
            const csv = buildCsv(buildExportPlan(goal));
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': disposition,
                    ...headers,
                },
            });
        }

        const bytes = await buildPlanPdf(buildExportPlan(goal));
        return new NextResponse(bytes as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': disposition,
                ...headers,
            },
        });
    } catch (error) {
        return handleApiError(error, {
            path: `/api/mobile/v1/goals/${id}/export`
        });
    }
}
