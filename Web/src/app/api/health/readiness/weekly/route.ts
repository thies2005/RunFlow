import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { serializeWeeklyRecord, parseDateOnly } from '@/lib/readiness/serialization';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const weekStartStr = searchParams.get('weekStart');
        if (!weekStartStr) return NextResponse.json({ error: 'Missing weekStart' }, { status: 400 });

        const weekStartDate = parseDateOnly(weekStartStr);

        const record = await prisma.weeklyReconciliationRecord.findUnique({
            where: { userId_weekStartDate: { userId: session.user.id, weekStartDate } },
        });

        if (!record) {
            return NextResponse.json(null);
        }

        return NextResponse.json(serializeWeeklyRecord(record));
    } catch (error) {
        return handleError(error);
    }
}
