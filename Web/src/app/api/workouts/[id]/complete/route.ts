import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: { isCompleted: true, completedAt: new Date() }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Complete workout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
