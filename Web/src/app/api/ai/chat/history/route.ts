
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');
        const sessionId = searchParams.get('sessionId');

        // Fetch messages
        const messagesStart = await prisma.chatMessage.findMany({
            where: {
                userId,
                ...(activityId ? { activityId } : {}),
                ...(sessionId ? { sessionId } : {
                    // If no sessionId and no activityId, maybe we should return nothing or default?
                    // For now, if no session ID is provided, and no activity ID, we might want to return null to avoid mixing sessions.
                    // BUT for backward compatibility or "global" chat, we might need to handle it.
                    // However, avoiding "mix" is better. 
                    // Let's say: if sessionId is NOT provided, we only return if activityId IS provided (context chat).
                    // If neither, we return empty list to force frontend to create a session?
                    // Or we just return all non-session messages (legacy)?
                    // Let's stick to: filter if provided.
                    sessionId: null
                }),
            },
            orderBy: {
                createdAt: 'desc', // Get newest first
            },
            take: 50,
        });

        // Reverse to show oldest first (chronological)
        const messages = messagesStart.reverse();

        return new Response(JSON.stringify({ messages }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch chat history' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');
        const sessionId = searchParams.get('sessionId');

        // Delete messages
        await prisma.chatMessage.deleteMany({
            where: {
                userId,
                ...(activityId ? { activityId } : {}),
                ...(sessionId ? { sessionId } : { sessionId: null }),
            },
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        return new Response(JSON.stringify({ error: 'Failed to clear chat history' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
