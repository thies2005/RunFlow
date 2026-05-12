import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { serializeBaseline } from '@/lib/readiness/serialization';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const baseline = await prisma.readinessBaseline.findUnique({
            where: { userId: session.user.id },
        });

        if (!baseline) {
            return NextResponse.json(null);
        }

        return NextResponse.json(serializeBaseline(baseline));
    } catch (error) {
        return handleError(error);
    }
}
