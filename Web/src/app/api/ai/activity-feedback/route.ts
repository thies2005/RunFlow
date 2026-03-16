import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
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
        const session = await getServerSession(authOptions);
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
        } catch (error: any) {
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

            if (error.message === 'Activity not found') {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            if (error.message === 'AI features not enabled or no provider configured') {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
            if (error.message.includes('Usage limit reached') || error.message.includes('No tokens remaining') || error.message.includes('Quota exhausted')) {
                return NextResponse.json({ error: error.message }, { status: 429 });
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
