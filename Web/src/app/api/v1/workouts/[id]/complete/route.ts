import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { setApiVersionHeaders } from '@/lib/api/version';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.findUnique({
            where: { id },
            include: { goal: true }
        });

        if (!workout || workout.goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: { isCompleted: true, completedAt: new Date() }
        });

        const response = NextResponse.json(updated);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Complete workout error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
