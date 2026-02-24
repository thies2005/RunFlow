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
        const days = parseInt(searchParams.get('days') || '30', 10);

        if (!supplementId && !stackId) {
            return NextResponse.json({ error: 'Missing supplementId or stackId' }, { status: 400 });
        }

        // Calculate the date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

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
        const successRate = Math.round((logs.length / days) * 100);

        return NextResponse.json({
            successRate,
            logs
        });
    } catch (error) {
        return handleError(error);
    }
}
