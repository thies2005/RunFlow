import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

// Helper to ensure dates are handled as midnight UTC
function getMidnightUTCDate(dateStr: string) {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const supplementId = searchParams.get('supplementId');
        const stackId = searchParams.get('stackId');
        const range = searchParams.get('range') || '1M';

        if (!supplementId && !stackId) {
            return NextResponse.json({ error: 'Missing supplementId or stackId' }, { status: 400 });
        }

        // Calculate the date range
        const now = new Date();
        const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

        switch (range) {
            case '1W':
                startDate.setUTCDate(startDate.getUTCDate() - 7);
                break;
            case '1M':
                startDate.setUTCMonth(startDate.getUTCMonth() - 1);
                break;
            case '6M':
                startDate.setUTCMonth(startDate.getUTCMonth() - 6);
                break;
            case '1Y':
                startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
                break;
            case 'ALL':
                startDate.setUTCFullYear(2000); // effectively no cutoff
                break;
            default:
                startDate.setUTCMonth(startDate.getUTCMonth() - 1);
        }

        // Calculate total days for adherence
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const daysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let logs: { date: Date; taken: boolean }[] = [];

        if (stackId) {
            // Verify ownership
            const stack = await prisma.supplementStack.findUnique({
                where: { id: stackId },
                include: { supplements: true }
            });

            if (!stack || stack.userId !== session.user.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }

            const supplementIds = stack.supplements.map(s => s.id);
            if (supplementIds.length === 0) {
                return NextResponse.json({ successRate: 0, logs: [] });
            }

            // A stack is considered "taken" on a day if ALL of its supplements were taken
            const rawLogs = await prisma.supplementLog.findMany({
                where: {
                    supplementId: { in: supplementIds },
                    date: { gte: startDate, lte: endDate },
                    taken: true
                }
            });

            // Group logs by date
            const logsByDate = rawLogs.reduce((acc, log) => {
                const dateStr = log.date.toISOString().split('T')[0];
                if (!acc[dateStr]) acc[dateStr] = 0;
                acc[dateStr]++;
                return acc;
            }, {} as Record<string, number>);

            // Find dates where the count matches the number of supplements in the stack
            for (const [dateStr, count] of Object.entries(logsByDate)) {
                if (count === supplementIds.length) {
                    logs.push({ date: new Date(dateStr), taken: true });
                }
            }

        } else if (supplementId) {
            // Verify ownership
            const supp = await prisma.supplement.findUnique({ where: { id: supplementId } });
            if (!supp || supp.userId !== session.user.id) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }

            logs = await prisma.supplementLog.findMany({
                where: {
                    supplementId,
                    date: { gte: startDate, lte: endDate },
                    taken: true
                },
                select: { date: true, taken: true },
                orderBy: { date: 'asc' }
            });
        }

        // Calculate a simple success rate over the requested window
        const successRate = daysInRange > 0 ? Math.round((logs.length / daysInRange) * 100) : 0;

        return NextResponse.json({
            range,
            successRate,
            logs: logs.map(l => ({
                ...l,
                dateStr: l.date.toISOString().split('T')[0],
                value: 1 // for easy graphing
            }))
        });
    } catch (error) {
        return handleError(error);
    }
}
