import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Optional filter

    const where: any = { userId: session.user.id };
    if (type) {
        where.type = type;
    }

    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where,
            orderBy: { startDate: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                stravaId: true,
                type: true,
                sportType: true,
                name: true,
                startDate: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                averageHr: true,
                maxHr: true,
                hasHeartrate: true,
                totalElevation: true,
                trimp: true,
                runningTss: true,
                estimatedVdot: true,
            },
        }),
        prisma.activity.count({ where }),
    ]);

    // Convert BigInt to string for JSON serialization
    const serialized = activities.map(a => ({
        ...a,
        stravaId: a.stravaId.toString(),
    }));

    return NextResponse.json({
        activities: serialized,
        total,
        limit,
        offset,
    });
}
