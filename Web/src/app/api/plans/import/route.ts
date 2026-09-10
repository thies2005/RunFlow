import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { createSnapshot } from '@/lib/plan/snapshot';
import { RaceType, WorkoutType, PlanPhase, PlanCreationMode } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

// ─── POST /api/plans/import ───
//
// Creates a plan from an EXPLICIT workout list — no generation, no VDOT
// resolution, no phase math. This is the server side of the mobile app's
// offline-plan upload: the device generates a plan with the ported web
// engine and pushes it verbatim (raw web enum values included) so
// "local == server" holds in both directions.

/** Mirrors PlanCreateInputSchema's date refinement. */
const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid date',
});

/** Prisma Json accepts a plain object or an array (both shapes of structuredSteps). */
const jsonValueSchema = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]);

const ImportWorkoutSchema = z.object({
    // Client-minted id, echoed back in the response's idMap so the device
    // can re-point its local rows onto the server ids.
    localId: z.string().min(1).max(255),
    scheduledDate: dateStringSchema,
    workoutType: z.nativeEnum(WorkoutType),
    phase: z.nativeEnum(PlanPhase),
    description: z.string().max(2000).optional(),
    displayDesc: z.string().max(255).nullable().optional(),
    intensityZone: z.string().max(64).nullable().optional(),
    sport: z.string().max(32).nullable().optional(),
    customName: z.string().max(255).nullable().optional(),
    targetDistance: z.number().positive().nullable().optional(), // meters
    targetDuration: z.number().int().nonnegative().nullable().optional(), // seconds
    targetPace: z.number().nonnegative().nullable().optional(), // seconds per km
    targetHrZone: z.number().int().min(1).max(7).nullable().optional(),
    targetHrMinBpm: z.number().int().min(60).max(250).nullable().optional(),
    targetHrMaxBpm: z.number().int().min(60).max(250).nullable().optional(),
    targetPaceMinSecondsPerKm: z.number().nonnegative().nullable().optional(),
    targetPaceMaxSecondsPerKm: z.number().nonnegative().nullable().optional(),
    structuredSteps: jsonValueSchema.nullable().optional(),
    order: z.number().int().nonnegative().optional(),
});

const ImportPlanSchema = z.object({
    name: z.string().min(1).max(255),
    sport: z.enum(['RUN', 'TRIATHLON']).nullable().optional(),
    raceType: z.nativeEnum(RaceType).nullable().optional(),
    raceDate: dateStringSchema.nullable().optional(),
    planStartDate: dateStringSchema.nullable().optional(),
    targetTime: z.number().int().positive().nullable().optional(),
    planWeeks: z.number().int().min(1).max(104).nullable().optional(),
    taperWeeks: z.number().int().nonnegative().nullable().optional(),
    peakWeeks: z.number().int().nonnegative().nullable().optional(),
    buildWeeks: z.number().int().nonnegative().nullable().optional(),
    currentVdot: z.number().min(20).max(100).nullable().optional(),
    weeklyMileageGoal: z.number().int().positive().nullable().optional(), // meters
    runsPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    ridesPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    swimsPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    strengthPerWeek: z.number().int().nonnegative().max(7).nullable().optional(),
    longRunDay: z.number().int().min(0).max(6).nullable().optional(),
    workoutDay: z.number().int().min(0).max(6).nullable().optional(),
    restDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    creationMode: z.nativeEnum(PlanCreationMode).default('EXPERT_MANUAL'),
    workouts: z.array(ImportWorkoutSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
    try {
        // Dual auth: NextAuth session (web) or mobile JWT Bearer (app).
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const body = await request.json();
        const parsed = ImportPlanSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponses.validation('Validation failed', parsed.error.flatten());
        }

        const input = parsed.data;

        // The idMap contract needs distinct keys; a duplicate localId would
        // silently overwrite an entry and orphan the device-side remap.
        const localIds = new Set<string>();
        for (const w of input.workouts) {
            if (localIds.has(w.localId)) {
                return errorResponses.badRequest(`Duplicate localId: ${w.localId}`);
            }
            localIds.add(w.localId);
        }

        // Unit guard, same as PlanCreateInputSchema: weeklyMileageGoal is
        // stored in meters; values below 200 were almost certainly sent in km.
        let weeklyMileageGoal = input.weeklyMileageGoal ?? null;
        if (weeklyMileageGoal !== null && weeklyMileageGoal > 0 && weeklyMileageGoal < 200) {
            weeklyMileageGoal = weeklyMileageGoal * 1000;
        }

        // Idempotency: the import must be replayable. If the response is lost
        // after the server committed (flaky mobile network), the app retries
        // with the SAME client-minted workout localIds — so a key derived
        // from them identifies the plan without any extra client contract.
        // A retry that ADDED workouts locally hashes differently and falls
        // back to the normal e87db2dc dirty-create reconciliation path.
        const importKey = createHash('sha256')
            .update([...localIds].sort().join('\n'))
            .digest('hex');

        const existing = await prisma.goal.findFirst({
            where: { importKey, userId: user.id, deletedAt: null },
            select: { id: true, importIdMap: true },
        });
        if (existing) {
            // Unreachable in practice: rows with an importKey are always
            // written together with their idMap in one transaction.
            if (!existing.importIdMap) {
                throw new Error(`Imported plan ${existing.id} is missing its id map`);
            }
            return NextResponse.json(
                { goalId: existing.id, idMap: existing.importIdMap, replayed: true },
                { status: 200, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        let created: { goalId: string; idMap: Record<string, string> };
        try {
            created = await prisma.$transaction(async (tx) => {
                const goal = await tx.goal.create({
                    data: {
                        userId: user.id,
                        name: input.name.trim(),
                        sport: input.sport ?? 'RUN',
                        raceType: input.raceType ?? null,
                        raceDate: input.raceDate ? new Date(input.raceDate) : null,
                        planStartDate: input.planStartDate ? new Date(input.planStartDate) : null,
                        targetTime: input.targetTime ?? null,
                        currentVdot: input.currentVdot ?? null,
                        weeklyMileageGoal,
                        planWeeks: input.planWeeks ?? 12,
                        taperWeeks: input.taperWeeks ?? 2,
                        peakWeeks: input.peakWeeks ?? 4,
                        buildWeeks: input.buildWeeks ?? 4,
                        runsPerWeek: input.runsPerWeek ?? 4,
                        ridesPerWeek: input.ridesPerWeek ?? 0,
                        swimsPerWeek: input.swimsPerWeek ?? 0,
                        strengthPerWeek: input.strengthPerWeek ?? 0,
                        longRunDay: input.longRunDay ?? 0,
                        workoutDay: input.workoutDay ?? 3,
                        ...(input.restDays && { restDays: input.restDays }),
                        creationMode: input.creationMode,
                        planSource: 'mobile-import',
                        importKey,
                    },
                });

                // Individual creates (not createMany) so the server ids come back
                // for the idMap; insertion order preserves the caller's order.
                const idMap: Record<string, string> = {};
                for (const [index, w] of input.workouts.entries()) {
                    const workout = await tx.workout.create({
                        data: {
                            goalId: goal.id,
                            scheduledDate: new Date(w.scheduledDate),
                            workoutType: w.workoutType as WorkoutType,
                            description: w.description ?? w.customName ?? w.workoutType,
                            phase: w.phase as PlanPhase,
                            order: w.order ?? index,
                            displayDesc: w.displayDesc ?? null,
                            intensityZone: w.intensityZone ?? null,
                            sport: w.sport ?? 'RUN',
                            customName: w.customName ?? null,
                            targetDistance: w.targetDistance ?? null,
                            targetDuration: w.targetDuration ?? null,
                            targetPace: w.targetPace ?? null,
                            targetHrZone: w.targetHrZone ?? null,
                            targetHrMinBpm: w.targetHrMinBpm ?? null,
                            targetHrMaxBpm: w.targetHrMaxBpm ?? null,
                            targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm ?? null,
                            targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm ?? null,
                            structuredSteps: (w.structuredSteps ?? undefined) as Prisma.InputJsonValue | undefined,
                        },
                    });
                    idMap[w.localId] = workout.id;
                }

                // Persist the id map so a lost-response retry can be replayed
                // with the original localId -> serverId mapping.
                await tx.goal.update({
                    where: { id: goal.id },
                    data: { importIdMap: idMap as Prisma.InputJsonValue },
                });

                return { goalId: goal.id, idMap };
            });
        } catch (error) {
            // Concurrent duplicate import lost the unique-importKey race:
            // the winner's row is the plan this request describes — replay it.
            if ((error as { code?: string })?.code === 'P2002') {
                const winner = await prisma.goal.findFirst({
                    where: { importKey, userId: user.id, deletedAt: null },
                    select: { id: true, importIdMap: true },
                });
                if (winner?.importIdMap) {
                    return NextResponse.json(
                        { goalId: winner.id, idMap: winner.importIdMap, replayed: true },
                        { status: 200, headers: rateLimitHeaders(rateLimitResult) },
                    );
                }
            }
            throw error;
        }

        // Initial snapshot so the imported plan starts with a clean undo
        // baseline, same as the plan-advanced routes snapshot before mutations.
        await createSnapshot(created.goalId, 'Initial snapshot of imported plan', 'plan_import');

        return NextResponse.json(
            { goalId: created.goalId, idMap: created.idMap },
            { status: 201, headers: rateLimitHeaders(rateLimitResult) },
        );
    } catch (error) {
        return handleApiError(error, { path: '/api/plans/import' });
    }
}
