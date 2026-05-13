import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';
import { WorkoutType, PlanPhase } from '@/generated/prisma/client';
import { parseCsv, type ParsedCsvWorkout } from '@/lib/plans/csv-parser';
import { storePreview, getPreview, deletePreview } from '@/lib/plans/csv-preview-cache';
import { randomUUID } from 'crypto';

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

type PreviewData = {
    goalId: string;
    userId: string;
    workouts: ParsedCsvWorkout[];
    errors: Array<{ row: number; message: string }>;
    skipped: number;
    createdAt: number;
};

const VALID_WORKOUT_TYPES = new Set(Object.values(WorkoutType));

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

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const formatHint = formData.get('formatHint') as string | null;

            if (!file) {
                return NextResponse.json({ error: 'file is required' }, { status: 400 });
            }

            const csvText = await file.text();

            if (!csvText.trim()) {
                return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
            }

            const format = formatHint as 'trainingpeaks' | 'finalsurge' | 'runflow' | undefined;
            const { workouts, errors, skipped } = parseCsv(csvText, format);

            const validWorkouts = workouts.filter(w => VALID_WORKOUT_TYPES.has(w.workoutType as WorkoutType));

            const previewId = randomUUID();
            storePreview(previewId, {
                goalId,
                userId: session.user.id,
                workouts: validWorkouts,
                errors,
                skipped,
                createdAt: Date.now(),
            } satisfies PreviewData);

            return NextResponse.json({
                previewId,
                totalRows: workouts.length,
                validRows: validWorkouts.length,
                invalidRows: errors.length + skipped,
                errors,
                skipped,
                sampleWorkouts: validWorkouts.slice(0, 5),
            });
        }

        const body = await req.json();
        const { previewId, confirm } = body;

        if (confirm && previewId) {
            const previewData = getPreview<PreviewData>(previewId);

            if (!previewData) {
                return NextResponse.json({ error: 'Preview expired or not found. Please re-upload the CSV.' }, { status: 404 });
            }

            if (previewData.goalId !== goalId || previewData.userId !== session.user.id) {
                return NextResponse.json({ error: 'Preview does not match this plan' }, { status: 403 });
            }

            await createSnapshot(goalId, 'Before CSV import', 'csv_import');

            let createdCount = 0;
            await prisma.$transaction(async (tx) => {
                for (const w of previewData.workouts) {
                    const scheduledDate = new Date(w.date);
                    if (isNaN(scheduledDate.getTime())) continue;

                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            workoutType: w.workoutType as WorkoutType,
                            description: w.description || w.name,
                            phase: (w.phase as PlanPhase) || PlanPhase.BASE,
                            order: 0,
                            targetDistance: w.distanceM,
                            targetDuration: w.durationS,
                            targetPace: w.paceSKm,
                            targetHrZone: w.hrZone,
                            customName: w.name || null,
                            structuredSteps: w.structuredSteps,
                        },
                    });
                    createdCount++;
                }
            });

            deletePreview(previewId);

            return NextResponse.json({ success: true, created: createdCount });
        }

        return NextResponse.json({ error: 'Expected multipart/form-data with file field, or JSON { previewId, confirm: true }' }, { status: 400 });
    } catch (error) {
        console.error('CSV import error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
