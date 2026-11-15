import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';
import { AiProviderError, toSafeUserError } from '@/lib/ai/errors';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');

        if (!activityId) {
            return errorResponses.validation('activityId required');
        }

        const activity = await prisma.activity.findFirst({
            where: { id: activityId, userId: user.id },
        });

        if (!activity) {
            return errorResponses.notFound('Activity');
        }

        const feedback = await prisma.activityAiFeedback.findUnique({
            where: { activityId },
        });

        return NextResponse.json({
            feedback: feedback || null,
            cached: !!feedback,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/ai/activity-feedback' });
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { activityId, regenerate = false } = body as { activityId: string; regenerate?: boolean };

        if (!activityId) {
            return errorResponses.validation('activityId required');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        try {
            const result = await generateAndSaveActivityFeedback(activityId, user.id, regenerate, controller.signal);
            return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
        } catch (error: unknown) {
            const rlHeaders = rateLimitHeaders(rateLimitResult);

            if (controller.signal.aborted) {
                const job = await prisma.feedbackJob.upsert({
                    where: { activityId },
                    create: {
                        userId: user.id,
                        activityId,
                        priority: 1,
                    },
                    update: {
                        status: 'PENDING',
                        retryCount: 0,
                        nextRunAt: new Date(),
                        errorLog: 'Timed out during on-demand mobile request',
                    }
                });
                return NextResponse.json({
                    queued: true,
                    jobId: job?.id,
                    status: 'pending',
                    message: 'Generation is taking longer than expected. It has been queued and will appear shortly.',
                }, { headers: rlHeaders });
            }

            if (error instanceof AiProviderError) {
                if (error.code === 'USER_LIMIT_REACHED') {
                    return NextResponse.json(
                        { error: error.userMessage, errorCode: error.code },
                        { status: 429, headers: rlHeaders }
                    );
                }

                if (
                    error.code === 'RATE_LIMITED' ||
                    error.code === 'TIMEOUT' ||
                    error.code === 'PROVIDER_UNAVAILABLE'
                ) {
                    const job = await prisma.feedbackJob.upsert({
                        where: { activityId },
                        create: {
                            userId: user.id,
                            activityId,
                            priority: 1,
                        },
                        update: {
                            status: 'PENDING',
                            retryCount: 0,
                            nextRunAt: new Date(),
                            errorLog: `${error.code} during on-demand mobile request`,
                        },
                    });
                    const safe = toSafeUserError(error);
                    return NextResponse.json(
                        {
                            queued: true,
                            jobId: job?.id,
                            status: 'pending',
                            message: error.code === 'TIMEOUT'
                                ? 'Generation timed out. Your feedback has been queued and will appear shortly.'
                                : 'Server rate limited. Your feedback is being prepared and will appear shortly.',
                            error: safe.message,
                            errorCode: safe.code,
                        },
                        { status: 429, headers: rlHeaders }
                    );
                }

                const safe = toSafeUserError(error);
                return NextResponse.json(
                    {
                        error: safe.message,
                        errorCode: safe.code,
                        ...(safe.retryAfterSeconds !== undefined ? { retryAfterSeconds: safe.retryAfterSeconds } : {}),
                    },
                    { status: safe.httpStatus, headers: rlHeaders }
                );
            }

            const message = error instanceof Error ? error.message : String(error);
            if (message === 'Activity not found') {
                return errorResponses.notFound('Activity');
            }
            if (message.includes('AI features not enabled or no provider configured')) {
                return errorResponses.forbidden(message);
            }
            if (message.includes('Usage limit reached') || message.includes('No tokens remaining') || message.includes('Quota exhausted')) {
                return NextResponse.json(
                    { error: message, errorCode: 'USER_LIMIT_REACHED' },
                    { status: 429, headers: rlHeaders }
                );
            }
            if (message.includes('rate limited') || message.includes('(429)')) {
                const job = await prisma.feedbackJob.upsert({
                    where: { activityId },
                    create: {
                        userId: user.id,
                        activityId,
                        priority: 1,
                    },
                    update: {
                        status: 'PENDING',
                        retryCount: 0,
                        nextRunAt: new Date(),
                        errorLog: 'Rate limited during on-demand mobile request'
                    }
                });
                return NextResponse.json({
                    queued: true,
                    jobId: job?.id,
                    status: 'pending',
                    message: 'Server rate limited. Your feedback is being prepared and will appear shortly.',
                    error: 'AI provider is temporarily rate-limited. Please try again in a moment.',
                    errorCode: 'RATE_LIMITED',
                }, { status: 429, headers: rlHeaders });
            }

            const safe = toSafeUserError(error);
            if (safe.httpStatus >= 500) {
                return handleApiError(error, { path: '/api/mobile/v1/ai/activity-feedback' });
            }
            return NextResponse.json(
                { error: safe.message, errorCode: safe.code },
                { status: safe.httpStatus, headers: rlHeaders }
            );
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/ai/activity-feedback' });
    }
}
