
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');

        // Fetch messages
        const messagesStart = await prisma.chatMessage.findMany({
            where: {
                userId,
                activityId: activityId || null,
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
