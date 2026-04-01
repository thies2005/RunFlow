import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');

        if (!activityId) {
            return NextResponse.json({ error: 'activityId required' }, { status: 400 });
        }

        const activity = await prisma.activity.findFirst({
            where: { id: activityId, userId: session.user.id },
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        const feedback = await prisma.activityAiFeedback.findUnique({
            where: { activityId },
        });

        return NextResponse.json({
            feedback: feedback || null,
            cached: !!feedback,
        });
    } catch (error) {
        console.error('Get activity feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { activityId, regenerate = false } = body as { activityId: string; regenerate?: boolean };

        if (!activityId) {
            return NextResponse.json({ error: 'activityId required' }, { status: 400 });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        try {
            const result = await generateAndSaveActivityFeedback(activityId, userId, regenerate, controller.signal);
            return NextResponse.json(result);
        } catch (error: unknown) {
            if (controller.signal.aborted) {
                // Enqueue as fallback if it timed out but might still succeed in background
                await prisma.feedbackJob.upsert({
                    where: { activityId },
                    create: {
                        userId,
                        activityId,
                        priority: 1 // High priority since user is waiting
                    },
                    update: {
                        status: 'PENDING',
                        retryCount: 0,
                        nextRunAt: new Date(),
                        errorLog: 'Timed out during on-demand request'
                    }
                });
                return NextResponse.json({ 
                    queued: true, 
                    message: 'Generation is taking longer than expected. It has been queued and will appear shortly.' 
                });
            }

            const message = error instanceof Error ? error.message : String(error);
            if (message === 'Activity not found') {
                return NextResponse.json({ error: message }, { status: 404 });
            }
            if (message.includes('AI features not enabled or no provider configured')) {
                return NextResponse.json({ error: message }, { status: 403 });
            }
            if (message.includes('rate limited') || message.includes('(429)')) {
                await prisma.feedbackJob.upsert({
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
                        errorLog: 'Rate limited during on-demand request'
                    }
                });
                return NextResponse.json({
                    queued: true,
                    message: 'Server rate limited. Your feedback is being prepared and will appear shortly.'
                }, { status: 429 });
            }
            if (message.includes('Usage limit reached') || message.includes('No tokens remaining') || message.includes('Quota exhausted')) {
                return NextResponse.json({ error: message }, { status: 429 });
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }

    } catch (error) {
        console.error('Generate activity feedback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
