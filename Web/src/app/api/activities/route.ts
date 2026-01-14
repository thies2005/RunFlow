import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { ActivityType } from '@prisma/client';

// Type for Prisma where clause with optional filters
type ActivityWhereClause = {
    userId: string;
    type?: ActivityType;
    distance?: { gte: number };
    startDate?: { gte: Date };
};

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
        const raceEligible = searchParams.get('raceEligible') === 'true';

        const where: ActivityWhereClause = { userId: session.user.id };
        if (type) {
            // Validate type against allowed values to prevent Prisma errors
            const validTypes: ActivityType[] = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
            const upperType = type.toUpperCase() as ActivityType;
            if (validTypes.includes(upperType)) {
                where.type = upperType;
            }
        }

        // Race-eligible filter: runs >= 4.5km from last 6 months
        if (raceEligible) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
            where.type = 'RUN';
            where.distance = { gte: 4500 }; // >= 4.5km
            where.startDate = { gte: sixMonthsAgo };
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
                    averageCadence: true,
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

        const activityIds = activities.map(a => a.id);
        const linkedWorkouts = await prisma.workout.findMany({
            where: {
                linkedActivityId: { in: activityIds }
            },
            select: { linkedActivityId: true }
        });
        const linkedActivityIds = new Set(linkedWorkouts.map(w => w.linkedActivityId));

        // Convert BigInt to string and add isLinked flag
        const serialized = activities.map(a => ({
            ...a,
            stravaId: a.stravaId.toString(),
            isLinked: linkedActivityIds.has(a.id)
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
            { error: 'Failed to fetch activities' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.activities);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, date, type, distance, duration, hr } = body;

        // === Input Validation ===

        // Required fields check
        if (!name || !date || !distance || !duration) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Name: string, 1-200 characters
        if (typeof name !== 'string' || name.length < 1 || name.length > 200) {
            return NextResponse.json({ error: 'Name must be 1-200 characters' }, { status: 400 });
        }

        // Date: valid date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // Distance: positive number, max 500km
        const parsedDistance = parseFloat(String(distance));
        if (isNaN(parsedDistance) || parsedDistance <= 0 || parsedDistance > 500) {
            return NextResponse.json({ error: 'Distance must be between 0.001 and 500 km' }, { status: 400 });
        }

        // Duration: positive integer, max 48 hours in minutes
        const parsedDuration = parseInt(String(duration), 10);
        if (isNaN(parsedDuration) || parsedDuration <= 0 || parsedDuration > 2880) {
            return NextResponse.json({ error: 'Duration must be between 1 and 2880 minutes' }, { status: 400 });
        }

        // Type: validate against enum
        const validTypes = ['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER'];
        const activityType = type && validTypes.includes(String(type).toUpperCase())
            ? String(type).toUpperCase()
            : 'RUN';

        // HR: optional, positive number, 30-250 bpm
        let parsedHr: number | null = null;
        if (hr !== undefined && hr !== null && hr !== '') {
            parsedHr = parseFloat(String(hr));
            if (isNaN(parsedHr) || parsedHr < 30 || parsedHr > 250) {
                return NextResponse.json({ error: 'Heart rate must be between 30 and 250 bpm' }, { status: 400 });
            }
        }

        // Generate manual activity ID using negative BigInt
        // Negative IDs will never collide with real Strava IDs (which are positive)
        // Combine timestamp with random component for uniqueness across concurrent requests
        const randomSuffix = Math.floor(Math.random() * 1000000);
        const stravaId = BigInt(-1) * BigInt(`${Date.now()}${randomSuffix.toString().padStart(6, '0')}`);

        const activity = await prisma.activity.create({
            data: {
                userId: session.user.id,
                stravaId,
                name: name.trim().substring(0, 200), // Sanitize
                type: activityType as ActivityType,
                startDate: parsedDate,
                distance: parsedDistance * 1000, // km -> meters
                movingTime: parsedDuration * 60,   // min -> seconds
                elapsedTime: parsedDuration * 60,
                averageHr: parsedHr,
                hasHeartrate: parsedHr !== null,

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

