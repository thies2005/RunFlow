import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { formatUtcDayKey, getCurrentUtcDayKey, parseUtcDayKey, shiftUtcDayKey, toUtcDayKey } from '@/lib/health/dates';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '1Y'; // 1W, 1M, 6M, 1Y, ALL

        const todayDayKey = getCurrentUtcDayKey();
        let cutoffDayKey = todayDayKey;

        switch (range) {
            case '1W':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -7);
                break;
            case '1M':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -30);
                break;
            case '6M':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -183);
                break;
            case '1Y':
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -365);
                break;
            case 'ALL':
                cutoffDayKey = '2000-01-01';
                break;
            default:
                cutoffDayKey = shiftUtcDayKey(todayDayKey, -365);
        }

        const cutoffDate = parseUtcDayKey(cutoffDayKey);

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
            },
            take: 1000,
        });

        // Format dates consistently for the frontend charts
        const formattedHistory = history.map((log: { date: Date; steps: number | null; weight: number | null }) => ({
            ...log,
            dateStr: toUtcDayKey(log.date),
            dateLabel: formatUtcDayKey(toUtcDayKey(log.date), { month: 'short', day: 'numeric' })
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
