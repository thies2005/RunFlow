import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { PlanPhase, Prisma } from '@/generated/prisma/client';

async function checkPremium(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    return true;
}

type RouteContext = { params: Promise<{ goalId: string }> };

type ProgressionWeek = {
    week: number;
    warmup?: string;
    main?: string;
    cooldown?: string;
    totalDistance?: number;
    repetitions?: number;
    workDistance?: number;
    restInterval?: number;
    recoveryInterval?: number;
};

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { progressionId, planStartDate } = body;

        if (!progressionId) {
            return NextResponse.json({ error: 'progressionId is required' }, { status: 400 });
        }

        if (!planStartDate || isNaN(new Date(planStartDate).getTime())) {
            return NextResponse.json({ error: 'Valid planStartDate is required' }, { status: 400 });
        }

        const progression = await prisma.intervalProgression.findFirst({
            where: { id: progressionId, goalId },
        });

        if (!progression) {
            return NextResponse.json({ error: 'Progression not found' }, { status: 404 });
        }

        const weeks = progression.weeks as ProgressionWeek[];
        if (!Array.isArray(weeks)) {
            return NextResponse.json({ error: 'Progression has no valid weeks data' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before apply progression', 'apply_progression');

        const planStart = new Date(planStartDate);
        const workoutDay = goal.workoutDay ?? 3;
        let createdCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const weekData of weeks) {
                const weekNum = weekData.week || 1;
                const weekOffset = (weekNum - 1) * 7;
                const scheduledDate = new Date(planStart);
                scheduledDate.setDate(scheduledDate.getDate() + weekOffset + workoutDay);

                const existing = await tx.workout.findFirst({
                    where: {
                        goalId,
                        scheduledDate: {
                            gte: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()),
                            lt: new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate() + 1),
                        },
                        workoutType: progression.workoutType,
                    },
                });

                const steps: Array<Record<string, unknown>> = [];
                if (weekData.warmup) {
                    steps.push({ type: 'warmup', description: weekData.warmup });
                }
                if (weekData.main) {
                    steps.push({ type: 'main', description: weekData.main });
                }
                if (weekData.cooldown) {
                    steps.push({ type: 'cooldown', description: weekData.cooldown });
                }

                const structuredSteps = steps.length > 0 ? (steps as unknown as Prisma.InputJsonValue) : Prisma.DbNull;

                const workoutData: Record<string, unknown> = {
                    workoutType: progression.workoutType,
                    description: weekData.main || `${progression.name} - Week ${weekNum}`,
                    phase: PlanPhase.BUILD,
                    targetDistance: weekData.totalDistance || null,
                    structuredSteps,
                    intervalProgressionId: progressionId,
                };

                if (existing) {
                    await tx.workout.update({
                        where: { id: existing.id },
                        data: {
                            workoutType: progression.workoutType,
                            description: weekData.main || `${progression.name} - Week ${weekNum}`,
                            phase: PlanPhase.BUILD,
                            targetDistance: weekData.totalDistance || null,
                            structuredSteps,
                            intervalProgressionId: progressionId,
                        },
                    });
                } else {
                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            order: workoutDay,
                            workoutType: progression.workoutType,
                            description: weekData.main || `${progression.name} - Week ${weekNum}`,
                            phase: PlanPhase.BUILD,
                            targetDistance: weekData.totalDistance || null,
                            structuredSteps,
                            intervalProgressionId: progressionId,
                        },
                    });
                }
                createdCount++;
            }
        });

        return NextResponse.json({ success: true, created: createdCount });
    } catch (error) {
        console.error('Apply progression error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
