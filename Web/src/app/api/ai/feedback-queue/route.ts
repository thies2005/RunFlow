import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { processPendingFeedbackJobs } from '@/lib/ai/feedbackQueue';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        return NextResponse.json({ stats, recentJobs });
    } catch (error) {
        console.error('Queue status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            return NextResponse.json({ message: 'Retrying all failed jobs' });
        }

        if (action === 'process-now') {
            const result = await processPendingFeedbackJobs();
            return NextResponse.json(result);
        }

        if (action === 'clear-done') {
            await prisma.feedbackJob.deleteMany({
                where: { status: 'DONE' }
            });
            return NextResponse.json({ message: 'Cleared completed jobs' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Queue action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
