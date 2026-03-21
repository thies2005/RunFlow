export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;

        const latestInsight = await prisma.healthInsight.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Return null if none generated yet, handled gracefully by UI
        return NextResponse.json({ insight: latestInsight || null });

    } catch (error) {
        return handleError(error);
    }
}
