import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

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

const VALID_OPERATIONS = ['DELETE', 'MOVE', 'CHANGE_TYPE', 'SCALE', 'SHIFT', 'CHANGE_INTENSITY'] as const;

export async function PATCH(req: Request, ctx: RouteContext) {
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
        const { operation, workoutIds, params } = body;

        if (!operation || !VALID_OPERATIONS.includes(operation)) {
            return NextResponse.json({ error: `Invalid operation. Must be one of: ${VALID_OPERATIONS.join(', ')}` }, { status: 400 });
        }

        if (!Array.isArray(workoutIds) || workoutIds.length === 0) {
            return NextResponse.json({ error: 'workoutIds must be a non-empty array' }, { status: 400 });
        }

        const workouts = await prisma.workout.findMany({
            where: { id: { in: workoutIds }, goalId },
        });

        if (workouts.length !== workoutIds.length) {
            const foundIds = new Set(workouts.map(w => w.id));
            const missing = workoutIds.filter((id: string) => !foundIds.has(id));
            return NextResponse.json({ error: `${missing.length} workout(s) not found in this plan` }, { status: 404 });
        }

        await createSnapshot(goalId, `Before bulk ${operation}`, `bulk_${operation.toLowerCase()}`);

        const result = await prisma.$transaction(async (tx) => {
            switch (operation) {
                case 'DELETE': {
                    const count = await tx.workout.deleteMany({
                        where: { id: { in: workoutIds } },
                    });
                    return { deleted: count.count };
                }

                case 'MOVE': {
                    const { targetDate, dayOffset } = params || {};
                    let newDate: Date;

                    if (targetDate) {
                        newDate = new Date(targetDate);
                        if (isNaN(newDate.getTime())) {
                            throw new Error('Invalid targetDate');
                        }
                    } else if (typeof dayOffset === 'number') {
                        newDate = new Date();
                    } else {
                        throw new Error('params.targetDate or params.dayOffset is required for MOVE');
                    }

                    const updated = await Promise.all(
                        workouts.map(w => {
                            let date: Date;
                            if (targetDate) {
                                date = newDate;
                            } else {
                                date = new Date(w.scheduledDate);
                                date.setDate(date.getDate() + dayOffset);
                            }
                            return tx.workout.update({
                                where: { id: w.id },
                                data: { scheduledDate: date },
                            });
                        }),
                    );
                    return { updated: updated.length };
                }

                case 'CHANGE_TYPE': {
                    const { newType } = params || {};
                    if (!newType) {
                        throw new Error('params.newType is required for CHANGE_TYPE');
                    }
                    const updated = await tx.workout.updateMany({
                        where: { id: { in: workoutIds } },
                        data: { workoutType: newType },
                    });
                    return { updated: updated.count };
                }

                case 'SCALE': {
                    const { volumeFactor, intensityFactor } = params || {};
                    if (typeof volumeFactor !== 'number' || volumeFactor <= 0) {
                        throw new Error('params.volumeFactor must be a positive number for SCALE');
                    }
                    const updated = await Promise.all(
                        workouts.map(w => {
                            const updateData: Record<string, unknown> = {};
                            if (w.targetDistance != null) {
                                updateData.targetDistance = w.targetDistance * volumeFactor;
                            }
                            if (typeof intensityFactor === 'number' && w.targetPace != null) {
                                updateData.targetPace = w.targetPace / intensityFactor;
                            }
                            if (w.targetDuration != null) {
                                updateData.targetDuration = Math.round(w.targetDuration * Math.sqrt(volumeFactor));
                            }
                            return tx.workout.update({
                                where: { id: w.id },
                                data: updateData,
                            });
                        }),
                    );
                    return { updated: updated.length };
                }

                case 'SHIFT': {
                    const { days } = params || {};
                    if (typeof days !== 'number') {
                        throw new Error('params.days is required for SHIFT');
                    }
                    const updated = await Promise.all(
                        workouts.map(w => {
                            const date = new Date(w.scheduledDate);
                            date.setDate(date.getDate() + days);
                            return tx.workout.update({
                                where: { id: w.id },
                                data: { scheduledDate: date },
                            });
                        }),
                    );
                    return { updated: updated.length };
                }

                case 'CHANGE_INTENSITY': {
                    const { paceAdjustment } = params || {};
                    if (typeof paceAdjustment !== 'number') {
                        throw new Error('params.paceAdjustment is required for CHANGE_INTENSITY');
                    }
                    const updated = await tx.workout.updateMany({
                        where: { id: { in: workoutIds }, targetPace: { not: null } },
                        data: { targetPace: { increment: paceAdjustment } },
                    });
                    return { updated: updated.count };
                }

                default:
                    throw new Error('Unhandled operation');
            }
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Bulk workout operation error:', error);
        if (error instanceof Error && error.message.includes('Invalid') || error instanceof Error && error.message.includes('required')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
