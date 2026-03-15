import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;

        // Fetch recent unique foods
        const recentLogs = await prisma.nutritionLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            distinct: ['foodItemId'],
            take: 15,
            include: { foodItem: true }
        });

        const recent = recentLogs.map(log => log.foodItem);

        // Fetch frequent foods
        const frequentGroup = await prisma.nutritionLog.groupBy({
            by: ['foodItemId'],
            where: { userId },
            _count: { foodItemId: true },
            orderBy: { _count: { foodItemId: 'desc' } },
            take: 15
        });

        const frequentFoodIds = frequentGroup.map(g => g.foodItemId);

        // Need to fetch actual food items for the frequent ids
        let frequent: any[] = [];
        if (frequentFoodIds.length > 0) {
            const frequentItems = await prisma.foodItem.findMany({
                where: { id: { in: frequentFoodIds } }
            });
            // Map items back to the ordered array
            frequent = frequentFoodIds
                .map(id => frequentItems.find(item => item.id === id))
                .filter(Boolean);
        }

        return NextResponse.json({ recent, frequent });

    } catch (error) {
        console.error("Error fetching recent/frequent foods:", error);
        return NextResponse.json({ error: 'Failed to fetch recent foods' }, { status: 500 });
    }
}
