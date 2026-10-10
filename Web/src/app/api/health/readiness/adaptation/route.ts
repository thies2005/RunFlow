import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { serializeAdaptedWorkout, parseDateOnly } from '@/lib/readiness/serialization';

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
        const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        // AdaptedWorkout rows are written by the mobile readiness sync; the
        // web card treats a null response as "no adaptation today".
        const record = await prisma.adaptedWorkout.findFirst({
            where: {
                userId: session.user.id,
                date: { gte: date, lt: dayEnd },
            },
            orderBy: { date: 'desc' },
        });

        if (!record) {
            return NextResponse.json(null);
        }

        return NextResponse.json(serializeAdaptedWorkout(record));
    } catch (error) {
        return handleError(error);
    }
}
