/**
 * Plan Adaptivity (audit G2)
 * ==========================
 *
 * When a workout is completed (or done differently), re-derive the runner's
 * effective VDOT from their recent activities and, if it has shifted
 * meaningfully, re-derive the paces of the remaining (future, not-yet-completed)
 * workouts in the plan.
 *
 * SCOPE — v1 (conservative and safe):
 *   - Recompute effective VDOT from completed activities (Runalyze-style
 *     weighted estimate over the last ~6 weeks, see runalyze.ts).
 *   - ONLY re-derive paces for future, incomplete workouts. We reuse the
 *     existing `recalculateWorkoutPaces` helper, which already skips
 *     `isCompleted === true` workouts, so completed workouts are never
 *     modified.
 *   - Apply a conservative threshold (>= VDOT_ADAPTIVITY_THRESHOLD points)
 *     so we do NOT churn the plan on every single workout completion.
 *
 * OUT OF SCOPE for v1 (deliberately deferred to avoid destabilising plans):
 *   - Redistributing training volume across the plan.
 *   - Rebuilding plan structure (adding/removing/restacking workouts).
 *   - Changing the goal's race date or race distance.
 *
 * These larger features require their own design, validation and rollout.
 * v1 is an incremental, genuinely useful first step.
 */

import { prisma } from '@/lib/db';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { calculateWeightedEffectiveVO2max, type ActivityForShape } from '@/lib/metrics/runalyze';
import type { HrZoneInput } from '@/lib/metrics/hr-zones';

/** Minimum VDOT delta (vs. the goal's current VDOT) required to trigger a pace re-derivation. */
export const VDOT_ADAPTIVITY_THRESHOLD = 2;

/** Look back window used to estimate the effective VDOT after a completion. */
const ADAPTIVITY_LOOKBACK_DAYS = 42; // ~6 weeks

export interface AdaptResult {
    adapted: boolean;
    reason: string;
    workoutsUpdated: number;
    newVdot?: number;
    previousVdot?: number;
}

/**
 * Re-derive future workout paces after a workout completion (or on demand).
 *
 * Pure DB-touching function: takes ids, does its own prisma work. Unit-testable
 * with a prisma mock (see `__tests__/adapt.test.ts`).
 *
 * @param goalId   The plan/goal to adapt.
 * @param userId   Owner of the plan (authorization / scoping).
 * @param asOfDate Optional cutoff (defaults to now); activities on or after this
 *                 date are excluded from the VDOT estimate, and workouts
 *                 scheduled after it are eligible for pace updates.
 */
export async function adaptPlanAfterCompletion(
    goalId: string,
    userId: string,
    asOfDate?: Date,
): Promise<AdaptResult> {
    const asOf = asOfDate ?? new Date();

    // --- 1. Load & scope the goal -------------------------------------------------
    const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId, deletedAt: null },
        select: {
            id: true,
            userId: true,
            currentVdot: true,
            createdAt: true,
        },
    });

    if (!goal) {
        return { adapted: false, reason: 'Goal not found', workoutsUpdated: 0 };
    }

    const previousVdot = goal.currentVdot ?? 0;

    // --- 2. Load the plan's workouts (ordered) ------------------------------------
    // Fetching workouts lets us reason about the plan, but the actual pace
    // writes are delegated to `recalculateWorkoutPaces`, which itself filters
    // to `isCompleted === false`. We still confirm there are future, incomplete
    // workouts to update so we can short-circuit cleanly.
    const workouts = await prisma.workout.findMany({
        where: { goalId },
        orderBy: { scheduledDate: 'asc' },
        select: { id: true, isCompleted: true, scheduledDate: true },
    });

    const hasFutureIncompleteWorkouts = workouts.some(
        (w) => !w.isCompleted && new Date(w.scheduledDate) >= asOf,
    );
    if (!hasFutureIncompleteWorkouts) {
        return { adapted: false, reason: 'No future workouts to adapt', workoutsUpdated: 0 };
    }

    // --- 3. Estimate effective VDOT from recent activities ------------------------
    const lookbackStart = new Date(asOf.getTime() - ADAPTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            hrMax: true,
            vdotCorrectionFactor: true,
            hrRest: true,
            thresholdHeartRate: true,
            hrZone1Max: true,
            hrZone2Max: true,
            hrZone3Max: true,
            hrZone4Max: true,
            hrZone5Max: true,
            hrZone6Max: true,
        },
    });

    const maxHR = user?.hrMax ?? 0;
    const calibrationFactor = user?.vdotCorrectionFactor ?? 1.0;

    // No max HR -> the Runalyze estimate cannot be computed.
    if (maxHR <= 0) {
        return { adapted: false, reason: 'No max HR on file for VDOT estimate', workoutsUpdated: 0 };
    }

    const recentActivities = await prisma.activity.findMany({
        where: {
            userId,
            type: 'RUN',
            startDate: { gte: lookbackStart, lte: asOf },
            hasHeartrate: true,
        },
        select: {
            startDate: true,
            distance: true,
            movingTime: true,
            averageHr: true,
            hasHeartrate: true,
            type: true,
        },
        orderBy: { startDate: 'desc' },
    });

    if (recentActivities.length === 0) {
        return { adapted: false, reason: 'No completed activities to estimate VDOT', workoutsUpdated: 0 };
    }

    const newVdot = calculateWeightedEffectiveVO2max(
        recentActivities as ActivityForShape[],
        maxHR,
        calibrationFactor,
    );

    if (newVdot <= 0) {
        return { adapted: false, reason: 'Could not estimate VDOT from activities', workoutsUpdated: 0 };
    }

    // --- 4. Threshold check: only adapt on meaningful shifts ----------------------
    if (previousVdot > 0 && Math.abs(newVdot - previousVdot) < VDOT_ADAPTIVITY_THRESHOLD) {
        return {
            adapted: false,
            reason: 'VDOT unchanged within threshold',
            workoutsUpdated: 0,
            newVdot,
            previousVdot,
        };
    }

    // --- 5. Re-derive future paces (skips completed workouts) --------------------
    const hrInput: HrZoneInput | undefined = user
        ? {
              thresholdHeartRate: user.thresholdHeartRate ?? null,
              hrZone1Max: user.hrZone1Max ?? null,
              hrZone2Max: user.hrZone2Max ?? null,
              hrZone3Max: user.hrZone3Max ?? null,
              hrZone4Max: user.hrZone4Max ?? null,
              hrZone5Max: user.hrZone5Max ?? null,
              hrZone6Max: user.hrZone6Max ?? null,
              hrMax: user.hrMax ?? null,
              hrRest: user.hrRest ?? null,
          }
        : undefined;

    const result = await prisma.$transaction(async () => {
        return recalculateWorkoutPaces(goalId, newVdot, hrInput);
    });

    return {
        adapted: true,
        reason: `VDOT shifted from ${previousVdot || 'n/a'} to ${newVdot}; future paces re-derived`,
        workoutsUpdated: result.updatedCount,
        newVdot,
        previousVdot: previousVdot > 0 ? previousVdot : undefined,
    };
}
