
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
        const messages = await prisma.chatMessage.findMany({
            where: {
                userId,
                // If activityId is provided, filter by it. 
                // If not, we might want to show global chat or all chat? 
                // For now, let's say if no activityId, we show non-activity specific chat?
                // Or maybe just all chat?
                // Let's go with: if activityId is present, show for that activity.
                // If not, show general chat (where activityId is null).
                activityId: activityId || null,
            },
            orderBy: {
                createdAt: 'asc',
            },
            take: 50, // Limit to last 50 messages for performance
        });

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
