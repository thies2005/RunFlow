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
        const dateStr = searchParams.get('date');
        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

        const date = parseDateOnly(dateStr);

        const record = await prisma.dailyReadinessRecord.findUnique({
            where: { userId_date: { userId: session.user.id, date } },
        });

        if (!record) {
            return NextResponse.json(null);
        }

        return NextResponse.json(serializeDailyRecord(record));
    } catch (error) {
        return handleError(error);
    }
}
