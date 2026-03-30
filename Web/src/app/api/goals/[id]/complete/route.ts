import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';
import { getRedisClient } from '@/lib/redis';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const goal = await prisma.goal.findUnique({
            where: { id: params.id },
            include: { raceResult: true },
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        if (!goal.isActive) {
            return NextResponse.json({ error: 'Goal is already completed' }, { status: 400 });
        }

        const body = await request.json();

        let actualTime = body.actualTime ?? null;
        const raceActivityId = body.raceActivityId ?? null;

        if (raceActivityId) {
            const activity = await prisma.activity.findUnique({
                where: { id: raceActivityId },
            });
            if (!activity || activity.userId !== session.user.id) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }
            if (activity.type !== 'RUN') {
                return NextResponse.json({ error: 'Race activity must be a run' }, { status: 400 });
            }
            if (!actualTime) {
                actualTime = activity.movingTime;
            }
        }

        if (body.feltLike !== undefined && body.feltLike !== null) {
            body.feltLike = Math.min(10, Math.max(1, Math.round(body.feltLike)));
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.raceResult.create({
                data: {
                    goalId: goal.id,
                    raceActivityId,
                    actualTime,
                    chipTime: body.chipTime ?? null,
                    placementOverall: body.placementOverall ?? null,
                    placementGender: body.placementGender ?? null,
                    placementAgeGroup: body.placementAgeGroup ?? null,
                    ageGroup: body.ageGroup ?? null,
                    totalFinishers: body.totalFinishers ?? null,
                    notes: body.notes ?? null,
                    weatherConditions: body.weatherConditions ?? null,
                    feltLike: body.feltLike ?? null,
                },
            });

            await tx.goal.update({
                where: { id: goal.id },
                data: {
                    isActive: false,
                    completedAt: now,
                },
            });
        });

        try {
            const redisClient = await getRedisClient();
            if (redisClient) {
                const today = new Date().toISOString().split('T')[0];
                const userId = session.user.id;
                await redisClient.del(`dashboard:v2:${userId}:${today}`);
            }
        } catch {
            // Redis invalidation failure is non-critical
        }

        logger.info('Goal completed and archived', {
            userId: session.user.id,
            goalId: goal.id,
            goalName: goal.name,
            raceActivityId,
            actualTime,
        });

        const updatedGoal = await prisma.goal.findUnique({
            where: { id: params.id },
            include: { raceResult: true },
        });

        return NextResponse.json(updatedGoal, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
