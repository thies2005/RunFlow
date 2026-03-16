import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { generateAndSaveActivityFeedback } from '@/lib/ai/feedback';
import { setApiVersionHeaders } from '@/lib/api/version';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
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
        const session = await getServerSession(authOptions);
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
        } catch (error: any) {
            if (controller.signal.aborted) {
                await prisma.feedbackJob.upsert({
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
                const response = NextResponse.json({
                    queued: true,
                    message: 'Generation is taking longer than expected. It has been queued and will appear shortly.'
                });
                setApiVersionHeaders(response.headers);
                return response;
            }

            if (error.message === 'Activity not found') {
                const response = NextResponse.json({ error: error.message }, { status: 404 });
                setApiVersionHeaders(response.headers);
                return response;
            }
            if (error.message.includes('AI features not enabled or no provider configured')) {
                 const response = NextResponse.json({ error: error.message }, { status: 403 });
                 setApiVersionHeaders(response.headers);
                 return response;
            }
            if (error.message.includes('Usage limit reached') || error.message.includes('No tokens remaining') || error.message.includes('Quota exhausted')) {
                const response = NextResponse.json({ error: error.message }, { status: 429 });
                setApiVersionHeaders(response.headers);
                return response;
            }
            throw error; // Let generic handler catch it
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
