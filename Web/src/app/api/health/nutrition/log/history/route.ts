import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's nutrition logs, ordered by newest first mapping to prisma
        const logs = await prisma.nutritionLog.findMany({
            where: {
                userId: session.user.id
            },
            include: {
                foodItem: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100 // limit to last 100 for now to prevent massive payloads
        });

        // Group by date (the 'date' string field in NutritionLog, e.g., '2023-10-01')
        const groupedLogs: Record<string, any[]> = {};
        for (const log of logs) {
            if (!groupedLogs[log.date]) {
                groupedLogs[log.date] = [];
            }
            groupedLogs[log.date].push(log);
        }

        return NextResponse.json(groupedLogs);
    } catch (error) {
        return handleError(error);
    }
}
