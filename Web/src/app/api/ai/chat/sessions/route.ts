import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        const chatSessions = await prisma.chatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });

        return NextResponse.json({ sessions: chatSessions });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const { title } = await req.json().catch(() => ({ title: 'New Chat' }));

        const newSession = await prisma.chatSession.create({
            data: {
                userId,
                title: title || 'New Chat'
            }
        });

        return NextResponse.json({ session: newSession });
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        // Verify ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: { id: sessionId },
        });

        if (!chatSession || chatSession.userId !== userId) {
            return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
        }

        await prisma.chatSession.delete({
            where: { id: sessionId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
