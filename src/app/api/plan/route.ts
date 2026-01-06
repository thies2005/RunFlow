import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
            include: {
                workouts: {
                    orderBy: { scheduledDate: 'asc' }
                }
            }
        });

        if (!activeGoal) {
            return NextResponse.json({ goal: null });
        }

        return NextResponse.json({ goal: activeGoal });
    } catch (error) {
        console.error('Plan fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
