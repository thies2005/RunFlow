import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

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

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
        }

        const start = getMidnightUTCDate(startDate);
        const end = getMidnightUTCDate(endDate);
        end.setUTCHours(23, 59, 59, 999);

        // Fetch all user supplements (including inactive for historical context)
        const allSupplements = await prisma.supplement.findMany({
            where: { userId },
            include: { stack: { select: { name: true } } }
        });

        const activeSupplements = allSupplements.filter(s => s.isActive);

        // Fetch all supplement logs in date range
        const supplementIds = allSupplements.map(s => s.id);
        const allLogs = await prisma.supplementLog.findMany({
            where: {
                supplementId: { in: supplementIds },
                date: { gte: start, lte: end },
                taken: true
            },
            select: { supplementId: true, date: true }
        });

        // Build daily data
        const diffTime = end.getTime() - start.getTime();
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const dailyData: { date: string; scheduled: number; taken: number }[] = [];
        let totalScheduled = 0;
        let totalTaken = 0;

        // Time-of-day stats
        const timeOfDayStats: Record<string, { scheduled: number; taken: number }> = {
            MORNING: { scheduled: 0, taken: 0 },
            NOON: { scheduled: 0, taken: 0 },
            EVENING: { scheduled: 0, taken: 0 },
        };

        // Per-supplement adherence
        const perSuppStats: Record<string, { name: string; amount: number; unit: string; timeOfDay: string; stackName: string | null; scheduled: number; taken: number }> = {};
        for (const s of activeSupplements) {
            perSuppStats[s.id] = {
                name: s.name,
                amount: s.amount,
                unit: s.unit,
                timeOfDay: s.timeOfDay,
                stackName: s.stack?.name || null,
                scheduled: 0,
                taken: 0
            };
        }

        // Logs lookup: map of "supplementId:dateStr" => true
        const logSet = new Set(
            allLogs.map(l => `${l.supplementId}:${l.date.toISOString().split('T')[0]}`)
        );

        for (let i = 0; i < totalDays; i++) {
            const d = new Date(start);
            d.setUTCDate(d.getUTCDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getUTCDay();

            let scheduledToday = 0;
            let takenToday = 0;

            for (const supp of activeSupplements) {
                const days = supp.daysOfWeek as number[] | null;
                const isScheduled = !days || (days as any[]).length === 0 || (days as number[]).includes(dayOfWeek);

                if (isScheduled) {
                    scheduledToday++;
                    totalScheduled++;
                    if (perSuppStats[supp.id]) perSuppStats[supp.id].scheduled++;
                    timeOfDayStats[supp.timeOfDay] = timeOfDayStats[supp.timeOfDay] || { scheduled: 0, taken: 0 };
                    timeOfDayStats[supp.timeOfDay].scheduled++;

                    if (logSet.has(`${supp.id}:${dateStr}`)) {
                        takenToday++;
                        totalTaken++;
                        if (perSuppStats[supp.id]) perSuppStats[supp.id].taken++;
                        timeOfDayStats[supp.timeOfDay].taken++;
                    }
                }
            }

            dailyData.push({ date: dateStr, scheduled: scheduledToday, taken: takenToday });
        }

        const overallAdherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
        const avgDailyDoses = totalDays > 0 ? Math.round((totalTaken / totalDays) * 10) / 10 : 0;

        // Most missed: sort by lowest adherence rate  
        const perSuppArray = Object.entries(perSuppStats).map(([id, s]) => ({
            id,
            ...s,
            adherence: s.scheduled > 0 ? Math.round((s.taken / s.scheduled) * 100) : 100,
            missed: s.scheduled - s.taken
        }));

        const mostMissed = perSuppArray
            .filter(s => s.missed > 0)
            .sort((a, b) => a.adherence - b.adherence)
            .slice(0, 5);

        // Time of day breakdown
        const timeOfDayBreakdown = Object.entries(timeOfDayStats).map(([time, stats]) => ({
            time,
            scheduled: stats.scheduled,
            taken: stats.taken,
            adherence: stats.scheduled > 0 ? Math.round((stats.taken / stats.scheduled) * 100) : 0
        }));

        return NextResponse.json({
            overallAdherence,
            avgDailyDoses,
            totalSupplements: activeSupplements.length,
            dailyData,
            mostMissed,
            timeOfDayBreakdown,
            totalScheduled,
            totalTaken,
            totalDays
        });
    } catch (error) {
        return handleError(error);
    }
}
