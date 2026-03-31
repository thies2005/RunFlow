import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const goal = await prisma.goal.findUnique({
            where: { id },
            include: { raceResult: true },
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const body = await request.json();

        const data: Record<string, unknown> = {};
        const allowedFields = [
            'actualTime', 'chipTime', 'placementOverall', 'placementGender',
            'placementAgeGroup', 'ageGroup', 'totalFinishers', 'notes',
            'weatherConditions', 'feltLike',
        ] as const;

        for (const field of allowedFields) {
            if (body[field] !== undefined && body[field] !== null) {
                data[field] = field === 'feltLike'
                    ? Math.min(10, Math.max(1, Math.round(body[field])))
                    : body[field];
            } else if (body[field] === null) {
                data[field] = null;
            }
        }

        if (body.raceActivityId !== undefined) {
            if (body.raceActivityId === null) {
                data.raceActivityId = null;
            } else {
                const activity = await prisma.activity.findUnique({
                    where: { id: body.raceActivityId },
                });
                if (!activity || activity.userId !== session.user.id) {
                    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
                }
                data.raceActivityId = body.raceActivityId;
            }
        }

        let raceResult;

        if (goal.raceResult) {
            raceResult = await prisma.raceResult.update({
                where: { goalId: id },
                data,
            });
        } else {
            raceResult = await prisma.raceResult.create({
                data: {
                    goalId: id,
                    ...data,
                },
            });
        }

        logger.info('Race result updated', {
            userId: session.user.id,
            goalId: id,
        });

        return NextResponse.json(raceResult, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
