import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { serializeDailyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startStr = searchParams.get('start');
        const endStr = searchParams.get('end');
        if (!startStr || !endStr) return NextResponse.json({ error: 'Missing start or end' }, { status: 400 });

        const startDate = parseDateOnly(startStr);
        const endDate = parseDateOnly(endStr);

        const records = await prisma.dailyReadinessRecord.findMany({
            where: {
                userId: session.user.id,
                date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(records.map(serializeDailyRecord));
    } catch (error) {
        return handleError(error);
    }
}
