import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { healthTrackingEnabled } = body;

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: { healthTrackingEnabled: Boolean(healthTrackingEnabled) }
        });

        return NextResponse.json({ healthTrackingEnabled: user.healthTrackingEnabled });
    } catch (error) {
        return handleError(error);
    }
}
