import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1Y'; // 1W, 1M, 6M, 1Y, ALL

        const now = new Date();
        const cutoffDate = new Date();

        switch (range) {
            case '1W':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '1M':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case '6M':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
            case '1Y':
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'ALL':
                cutoffDate.setFullYear(2000); // effectively no cutoff
                break;
            default:
                cutoffDate.setFullYear(now.getFullYear() - 1);
        }

        const history = await prisma.dailyHealthLog.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: cutoffDate
                }
            },
            select: {
                date: true,
                steps: true,
                weight: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Format dates consistently for the frontend charts
        const formattedHistory = history.map((log: { date: Date; steps: number | null; weight: number | null }) => ({
            ...log,
            dateStr: log.date.toISOString().split('T')[0]
        }));

        return NextResponse.json({
            range,
            history: formattedHistory
        });

    } catch (error) {
        console.error('Error fetching health history:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
