import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/admin/adminCheck';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get Daily Token Usage (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyUsage = await prisma.aiDailyTokenUsage.findMany({
            where: {
                date: {
                    gte: thirtyDaysAgo
                }
            },
            orderBy: {
                date: 'asc'
            },
            include: {
                provider: {
                    select: { name: true }
                }
            }
        });

        // 2. Get Top 20 Users by Monthly Usage
        const topUsers = await prisma.userAiSettings.findMany({
            where: {
                OR: [
                    { inputTokensUsedThisMonth: { gt: 0 } },
                    { outputTokensUsedThisMonth: { gt: 0 } }
                ]
            },
            orderBy: [
                { inputTokensUsedThisMonth: 'desc' },
                { outputTokensUsedThisMonth: 'desc' }
            ],
            take: 20,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        });

        const formattedTopUsers = topUsers.map(u => ({
            id: u.userId,
            name: u.user.name || 'Unknown',
            email: u.user.email || 'No Email',
            tier: u.usageTier,
            messages: u.messagesUsedThisMonth,
            inputTokens: u.inputTokensUsedThisMonth,
            outputTokens: u.outputTokensUsedThisMonth,
            totalTokens: (u.inputTokensUsedThisMonth || 0) + (u.outputTokensUsedThisMonth || 0)
        })).sort((a, b) => b.totalTokens - a.totalTokens);

        return NextResponse.json({
            dailyUsage: dailyUsage.map(d => ({
                date: d.date.toISOString().split('T')[0],
                provider: d.provider.name,
                input: d.inputTokens,
                output: d.outputTokens,
                total: d.inputTokens + d.outputTokens
            })),
            topUsers: formattedTopUsers
        });

    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
