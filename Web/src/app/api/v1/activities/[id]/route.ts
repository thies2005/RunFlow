import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { setApiVersionHeaders } from '@/lib/api/version';

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
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const activity = await prisma.activity.findUnique({
            where: { id: params.id, userId: session.user.id },
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
            const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const serialized = {
            ...activity,
            stravaId: activity.stravaId.toString(),
        };

        const response = NextResponse.json(serialized);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error fetching activity:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const body = await request.json();
        const { name } = body;

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            const response = NextResponse.json({ error: 'Invalid name' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const activity = await prisma.activity.findUnique({
            where: { id: params.id },
            select: { userId: true }
        });

        if (!activity) {
            const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (activity.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const dataToUpdate: ActivityUpdateData = {};
        if (name !== undefined) {
            dataToUpdate.name = name.trim().substring(0, 200);
        }

        const updatedActivity = await prisma.activity.update({
            where: { id: params.id },
            data: dataToUpdate,
        });

        const response = NextResponse.json(updatedActivity);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Error updating activity:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
