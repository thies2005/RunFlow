import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const chatSessions = await prisma.chatSession.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });

        return NextResponse.json({ sessions: chatSessions });
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { title } = await req.json().catch(() => ({ title: 'New Chat' })); // Optional title

        const newSession = await prisma.chatSession.create({
            data: {
                userId: user.id,
                title: title || 'New Chat'
            }
        });

        return NextResponse.json({ session: newSession });
    } catch (error) {
        console.error('Error creating chat session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Verify ownership
        const chatSession = await prisma.chatSession.findUnique({
            where: { id: sessionId },
        });

        if (!chatSession || chatSession.userId !== user.id) {
            return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
        }

        await prisma.chatSession.delete({
            where: { id: sessionId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
