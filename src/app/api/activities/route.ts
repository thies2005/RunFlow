import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error('Activities GET: No session or user ID');
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
                    trainingType: true,
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
    } catch (error) {
        console.error('Activities error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activities', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, date, type, distance, duration, hr } = body;

        // Validation
        if (!name || !date || !distance || !duration) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate fake Strava ID (use timestamp)
        const stravaId = BigInt(Date.now());

        const activity = await prisma.activity.create({
            data: {
                userId: session.user.id,
                stravaId,
                name,
                type: type || 'RUN',
                startDate: new Date(date),
                distance: parseFloat(distance) * 1000, // km -> meters
                movingTime: parseInt(duration) * 60,   // min -> seconds
                elapsedTime: parseInt(duration) * 60,
                averageHr: hr ? parseFloat(hr) : null,
                hasHeartrate: !!hr,

                // Defaults for manual entry
                totalElevation: 0,
            },
        });

        // Convert BigInt for response
        return NextResponse.json({
            ...activity,
            stravaId: activity.stravaId.toString(),
        });

    } catch (error) {
        console.error('Create Activity Error:', error);
        return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }
}
