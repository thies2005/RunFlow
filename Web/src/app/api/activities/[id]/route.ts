import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

type ActivityUpdateData = {
    name?: string;
};

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const activity = await prisma.activity.findUnique({
            where: { id: params.id },
            include: {
                // We'll rely on the default selection but ensure streams are included
                // Alternatively, explicit select if we want to be safe, but include usually gets everything
            }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (activity.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Handle BigInt serialization
        const serialized = {
            ...activity,
            stravaId: activity.stravaId.toString(),
            // Assuming streams might be large, we verify it's there
        };

        return NextResponse.json(serialized);
    } catch (error) {
        console.error('Error fetching activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
            where: { id: params.id },
            select: { userId: true }
        });

        if (!activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        }

        if (activity.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const dataToUpdate: ActivityUpdateData = {};
        if (name !== undefined) {
            // Sanitize: trim and limit length
            dataToUpdate.name = name.trim().substring(0, 200);
        }

        const updatedActivity = await prisma.activity.update({
            where: { id: params.id },
            data: dataToUpdate,
        });

        return NextResponse.json(updatedActivity);
    } catch (error) {
        console.error('Error updating activity:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
