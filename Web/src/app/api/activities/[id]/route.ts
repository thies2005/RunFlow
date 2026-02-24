import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';

type ActivityUpdateData = {
    name?: string;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activity = await prisma.activity.findUnique({
            where: { id, userId: session.user.id },
            include: {
                laps: {
                    orderBy: { index: 'asc' },
                },
                splits: {
                    orderBy: { index: 'asc' },
                },
            },
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        const serialized = {
            ...activity,
            stravaId: activity.stravaId.toString(),
        };

        return NextResponse.json(serialized);
    } catch (error) {
        return handleError(error);
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        // Basic validation
        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
        }

        const activity = await prisma.activity.findUnique({
            where: { id, userId: session.user.id },
            select: { userId: true }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        const dataToUpdate: ActivityUpdateData = {};
        if (name !== undefined) {
            // Sanitize: trim and limit length
            dataToUpdate.name = name.trim().substring(0, 200);
        }

        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: dataToUpdate,
        });

        return NextResponse.json(updatedActivity);
    } catch (error) {
        return handleError(error);
    }
}
