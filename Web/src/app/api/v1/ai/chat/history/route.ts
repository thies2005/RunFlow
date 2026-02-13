import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { setApiVersionHeaders } from '@/lib/api/version';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');
        const sessionId = searchParams.get('sessionId');

        const messagesStart = await prisma.chatMessage.findMany({
            where: {
                userId,
                ...(activityId ? { activityId } : {}),
                ...(sessionId ? { sessionId } : {
                    sessionId: null
                }),
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        const messages = messagesStart.reverse();

        const response = new Response(JSON.stringify({ messages }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error fetching chat history:', error);
        const response = new Response(JSON.stringify({ error: 'Failed to fetch chat history' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');
        const sessionId = searchParams.get('sessionId');

        await prisma.chatMessage.deleteMany({
            where: {
                userId,
                ...(activityId ? { activityId } : {}),
                ...(sessionId ? { sessionId } : { sessionId: null }),
            },
        });

        const response = new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error clearing chat history:', error);
        const response = new Response(JSON.stringify({ error: 'Failed to clear chat history' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
