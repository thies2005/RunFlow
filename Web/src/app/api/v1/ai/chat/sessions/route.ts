import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { setApiVersionHeaders } from '@/lib/api/version';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
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

        const response = NextResponse.json({ sessions: chatSessions });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        const response = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;
        const { title } = await req.json().catch(() => ({ title: 'New Chat' }));

        const newSession = await prisma.chatSession.create({
            data: {
                userId,
                title: title || 'New Chat'
            }
        });

        const response = NextResponse.json({ session: newSession });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error creating chat session:', error);
        const response = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            const response = NextResponse.json({ error: 'Session ID required' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const chatSession = await prisma.chatSession.findUnique({
            where: { id: sessionId },
        });

        if (!chatSession || chatSession.userId !== userId) {
            const response = NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        await prisma.chatSession.delete({
            where: { id: sessionId },
        });

        const response = NextResponse.json({ success: true });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error deleting chat session:', error);
        const response = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
