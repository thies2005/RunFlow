import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        const chatSessions = await prisma.chatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 50,
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
        const user = await getAuthenticatedUser(req);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
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
        const user = await getAuthenticatedUser(req);
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        const { searchParams } = new URL(req.url);
        const deleteAll = searchParams.get('all') === 'true';

        if (deleteAll) {
            await prisma.chatSession.deleteMany({
                where: { userId },
            });
            return NextResponse.json({ success: true, count: 'all' });
        }

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
