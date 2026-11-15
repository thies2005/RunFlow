import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';
import { invalidateUserDashboardCache } from '@/lib/redis';
import { serializeAdaptedWorkout, parseDateOnly } from '@/lib/readiness/serialization';
import type { WorkoutType } from '@/generated/prisma/client';

const VALID_WORKOUT_TYPES = new Set<string>([
    'EASY',
    'LONG_RUN',
    'TEMPO',
    'INTERVALS',
    'FARTLEK',
    'RECOVERY',
    'REST',
    'RIDE',
    'SWIM',
    'STRENGTH',
    'OTHER',
]);

function toWorkoutType(value: string, fallback: WorkoutType): WorkoutType {
    const upper = value.trim().toUpperCase();
    return VALID_WORKOUT_TYPES.has(upper) ? (upper as WorkoutType) : fallback;
}

const patchSchema = z
    .object({
        adaptationId: z.string().min(1).optional(),
        originalWorkoutId: z.string().min(1).optional(),
        action: z.enum(['APPLY', 'RESTORE', 'REDUCE', 'SWAP', 'DISMISS']),
    })
    .refine((v) => Boolean(v.adaptationId || v.originalWorkoutId), {
        message: 'adaptationId or originalWorkoutId is required',
    });

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        if (!dateStr) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

        const date = parseDateOnly(dateStr);
        const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        // AdaptedWorkout rows are written by the mobile readiness sync; the
        // web card treats a null response as "no adaptation today".
        const record = await prisma.adaptedWorkout.findFirst({
            where: {
                userId: session.user.id,
                date: { gte: date, lt: dayEnd },
            },
            orderBy: { date: 'desc' },
        });

        if (!record) {
            return NextResponse.json(null);
        }

        return NextResponse.json(serializeAdaptedWorkout(record));
    } catch (error) {
        return handleError(error);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid adaptation action payload', issues: parsed.error.issues },
                { status: 400 }
            );
        }

        const { adaptationId, originalWorkoutId, action } = parsed.data;
        const userId = session.user.id;

        const existing = await prisma.adaptedWorkout.findFirst({
            where: {
                userId,
                ...(adaptationId ? { id: adaptationId } : {}),
                ...(originalWorkoutId ? { originalWorkoutId } : {}),
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Adaptation not found' }, { status: 404 });
        }

        const workout = await prisma.workout.findFirst({
            where: {
                id: existing.originalWorkoutId,
                goal: { userId },
            },
        });

        const updated = await prisma.$transaction(async (tx) => {
            if (action === 'APPLY' || action === 'SWAP') {
                if (workout) {
                    await tx.workout.update({
                        where: { id: workout.id },
                        data: {
                            workoutType: toWorkoutType(existing.adaptedType, workout.workoutType),
                            ...(existing.adaptedTargetDistance != null
                                ? { targetDistance: existing.adaptedTargetDistance }
                                : {}),
                            ...(existing.adaptedTargetDuration != null
                                ? { targetDuration: existing.adaptedTargetDuration }
                                : {}),
                            ...(existing.adaptedTargetPace != null
                                ? { targetPace: existing.adaptedTargetPace }
                                : {}),
                        },
                    });
                }
                return tx.adaptedWorkout.update({
                    where: { id: existing.id },
                    data: { isAccepted: true },
                });
            }

            if (action === 'REDUCE') {
                if (workout) {
                    await tx.workout.update({
                        where: { id: workout.id },
                        data: {
                            ...(workout.targetDistance != null
                                ? { targetDistance: Math.round(workout.targetDistance * 0.75) }
                                : {}),
                            ...(workout.targetDuration != null
                                ? { targetDuration: Math.round(workout.targetDuration * 0.75) }
                                : {}),
                            ...(workout.plannedTss != null
                                ? { plannedTss: Math.round(workout.plannedTss * 0.75) }
                                : {}),
                        },
                    });
                }
                return tx.adaptedWorkout.update({
                    where: { id: existing.id },
                    data: { isAccepted: true, adaptationType: 'REDUCE' },
                });
            }

            if (action === 'RESTORE') {
                if (workout) {
                    await tx.workout.update({
                        where: { id: workout.id },
                        data: {
                            workoutType: toWorkoutType(existing.originalType, workout.workoutType),
                            ...(existing.originalTargetDistance > 0
                                ? { targetDistance: existing.originalTargetDistance }
                                : {}),
                            ...(existing.originalTargetDuration > 0
                                ? { targetDuration: existing.originalTargetDuration }
                                : {}),
                            ...(existing.originalTargetPace > 0
                                ? { targetPace: existing.originalTargetPace }
                                : {}),
                        },
                    });
                }
                return tx.adaptedWorkout.update({
                    where: { id: existing.id },
                    data: { isAccepted: false },
                });
            }

            // DISMISS
            return tx.adaptedWorkout.update({
                where: { id: existing.id },
                data: { isAccepted: false },
            });
        });

        await invalidateUserDashboardCache(userId);

        return NextResponse.json(serializeAdaptedWorkout(updated));
    } catch (error) {
        return handleError(error);
    }
}
