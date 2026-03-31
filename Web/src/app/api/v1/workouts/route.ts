import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { setApiVersionHeaders } from '@/lib/api/version';

export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
            setApiVersionHeaders(response.headers);
            return response;
        }

        const session = await auth();
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const body = await req.json();
        const { goalId, scheduledDate, type, description, targetDistance, targetDuration } = body;

        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: type as WorkoutType,
                description,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });

        const response = NextResponse.json(workout);
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Create workout error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
