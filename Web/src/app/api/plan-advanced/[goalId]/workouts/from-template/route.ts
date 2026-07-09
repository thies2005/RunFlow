import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { WorkoutType as WT, PlanPhase, Prisma } from '@/generated/prisma/client';

type RouteContext = { params: Promise<{ goalId: string }> };

const VALID_WORKOUT_TYPES = new Set(Object.values(WT));

/**
 * POST /api/plan-advanced/[goalId]/workouts/from-template
 *
 * Apply a shared/global WorkoutTemplate to a goal on a specific date.
 * Body: { templateId: string, scheduledDate: string (ISO) }
 *
 * - Verifies goal ownership.
 * - Fetches the published (or admin-created) template by id.
 * - Creates a single Workout on the goal derived from the template fields.
 *
 * This is distinct from the WeekTemplate apply-template route, which applies a
 * full per-user week template across multiple weeks.
 */
export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { templateId, scheduledDate } = body;

        if (!templateId || typeof templateId !== 'string') {
            return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
        }

        if (!scheduledDate || isNaN(new Date(scheduledDate).getTime())) {
            return NextResponse.json({ error: 'Valid scheduledDate is required' }, { status: 400 });
        }

        const template = await prisma.workoutTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template || !template.isPublished) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Sanity-check the enum value is valid (seeded data should always be).
        if (!VALID_WORKOUT_TYPES.has(template.workoutType)) {
            return NextResponse.json({ error: 'Template has an invalid workoutType' }, { status: 400 });
        }

        await createSnapshot(goalId, 'Before apply workout template', 'apply_workout_template');

        const description = template.description || template.name;

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: template.workoutType,
                description,
                phase: PlanPhase.BASE,
                order: 0,
                customName: template.name,
                targetDistance: template.targetDistance,
                targetDuration: template.targetDuration,
                targetPace: template.targetPace,
                structuredSteps: template.structuredSteps ?? Prisma.JsonNull,
                sport: template.sport,
            },
        });

        return NextResponse.json({ workout }, { status: 201 });
    } catch (error) {
        console.error('Apply workout template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
