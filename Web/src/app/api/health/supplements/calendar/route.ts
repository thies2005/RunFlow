import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

function getMidnightUTCDate(dateStr: string) {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

        // Build month range (1-indexed month)
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // last day of month

        // Fetch all active supplements for the user
        const supplements = await prisma.supplement.findMany({
            where: { userId, isActive: true },
            include: { stack: { select: { name: true } } },
            orderBy: [{ timeOfDay: 'asc' }, { order: 'asc' }]
        });

        const supplementIds = supplements.map(s => s.id);

        // Fetch all logs in the month
        const logs = await prisma.supplementLog.findMany({
            where: {
                supplementId: { in: supplementIds },
                date: { gte: start, lte: end }
            },
            select: { supplementId: true, date: true, taken: true }
        });

        // Build a lookup: "supplementId:dateStr" => taken
        const logMap: Record<string, boolean> = {};
        for (const log of logs) {
            const dateStr = log.date.toISOString().split('T')[0];
            logMap[`${log.supplementId}:${dateStr}`] = log.taken;
        }

        // Build per-day summary
        const daysInMonth = end.getUTCDate();
        const days: Array<{ date: string; scheduled: number; taken: number; missed: number }> = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(Date.UTC(year, month - 1, day));
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getUTCDay();

            let scheduled = 0;
            let taken = 0;

            for (const supp of supplements) {
                const daysArr = supp.daysOfWeek as number[] | null;
                const isScheduled = !daysArr || !Array.isArray(daysArr) || daysArr.length === 0 || (daysArr as number[]).includes(dayOfWeek);

                if (isScheduled) {
                    scheduled++;
                    if (logMap[`${supp.id}:${dateStr}`]) {
                        taken++;
                    }
                }
            }

            days.push({ date: dateStr, scheduled, taken, missed: scheduled - taken });
        }

        return NextResponse.json({
            year,
            month,
            days,
            supplements: supplements.map(s => ({
                id: s.id,
                name: s.name,
                amount: s.amount,
                unit: s.unit,
                timeOfDay: s.timeOfDay,
                daysOfWeek: s.daysOfWeek,
                stackName: s.stack?.name || null
            })),
            logMap
        });
    } catch (error) {
        return handleError(error);
    }
}
