import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';
import { AiProviderError, toSafeUserError } from '@/lib/ai/errors';
import { setApiVersionHeaders } from '@/lib/api/version';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');

        if (!activityId) {
            const response = NextResponse.json({ error: 'activityId required' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const activity = await prisma.activity.findFirst({
            where: { id: activityId, userId: session.user.id },
        });

        if (!activity) {
            const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const feedback = await prisma.activityAiFeedback.findUnique({
            where: { activityId },
        });

        const response = NextResponse.json({
            feedback: feedback || null,
            cached: !!feedback,
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Get activity feedback error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;
        const body = await request.json();
        const { activityId, regenerate = false } = body as { activityId: string; regenerate?: boolean };

        if (!activityId) {
            const response = NextResponse.json({ error: 'activityId required' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        try {
            const result = await generateAndSaveActivityFeedback(activityId, userId, regenerate, controller.signal);
            const response = NextResponse.json(result);
            setApiVersionHeaders(response.headers);
            return response;
        } catch (error: unknown) {
            const respond = (payload: Record<string, unknown>, status: number = 200) => {
                const response = NextResponse.json(payload, { status });
                setApiVersionHeaders(response.headers);
                return response;
            };

            if (controller.signal.aborted) {
                const job = await prisma.feedbackJob.upsert({
                    where: { activityId },
                    create: {
                        userId,
                        activityId,
                        priority: 1
                    },
                    update: {
                        status: 'PENDING',
                        retryCount: 0,
                        nextRunAt: new Date(),
                        errorLog: 'Timed out during on-demand request'
                    }
                });
                return respond({
                    queued: true,
                    jobId: job?.id,
                    status: 'pending',
                    message: 'Generation is taking longer than expected. It has been queued and will appear shortly.'
                });
            }

            if (error instanceof AiProviderError) {
                if (error.code === 'USER_LIMIT_REACHED') {
                    return respond({ error: error.userMessage, errorCode: error.code }, 429);
                }

                if (
                    error.code === 'RATE_LIMITED' ||
                    error.code === 'TIMEOUT' ||
                    error.code === 'PROVIDER_UNAVAILABLE'
                ) {
                    const job = await prisma.feedbackJob.upsert({
                        where: { activityId },
                        create: {
                            userId,
                            activityId,
                            priority: 1,
                        },
                        update: {
                            status: 'PENDING',
                            retryCount: 0,
                            nextRunAt: new Date(),
                            errorLog: `${error.code} during on-demand request`,
                        },
                    });
                    const safe = toSafeUserError(error);
                    return respond(
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
                        429
                    );
                }

                const safe = toSafeUserError(error);
                return respond(
                    {
                        error: safe.message,
                        errorCode: safe.code,
                        ...(safe.retryAfterSeconds !== undefined ? { retryAfterSeconds: safe.retryAfterSeconds } : {}),
                    },
                    safe.httpStatus
                );
            }

            const message = error instanceof Error ? error.message : String(error);
            if (message === 'Activity not found') {
                return respond({ error: message }, 404);
            }
            if (message.includes('AI features not enabled or no provider configured')) {
                return respond({ error: message, errorCode: 'AI_DISABLED' }, 403);
            }
            if (message.includes('Usage limit reached') || message.includes('No tokens remaining') || message.includes('Quota exhausted')) {
                return respond({ error: message, errorCode: 'USER_LIMIT_REACHED' }, 429);
            }
            if (message.includes('rate limited') || message.includes('(429)')) {
                const job = await prisma.feedbackJob.upsert({
                    where: { activityId },
                    create: {
                        userId,
                        activityId,
                        priority: 1,
                    },
                    update: {
                        status: 'PENDING',
                        retryCount: 0,
                        nextRunAt: new Date(),
                        errorLog: 'Rate limited during on-demand request',
                    },
                });
                return respond(
                    {
                        queued: true,
                        jobId: job?.id,
                        status: 'pending',
                        message: 'Server rate limited. Your feedback is being prepared and will appear shortly.',
                        error: 'AI provider is temporarily rate-limited. Please try again in a moment.',
                        errorCode: 'RATE_LIMITED',
                    },
                    429
                );
            }

            console.error('Generate activity feedback error:', error);
            const safe = toSafeUserError(error);
            return respond({ error: safe.message, errorCode: safe.code }, safe.httpStatus);
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        console.error('Generate activity feedback error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
