import { parseISO, isBefore, startOfDay } from 'date-fns';

export type ComplianceStatus =
    | 'ON_TARGET'
    | 'DEVIATED'
    | 'OFF_TARGET'
    | 'MISSED'
    | 'COMPLETED_UNLINKED'
    | 'PENDING';

export type ComplianceColor = 'green' | 'amber' | 'red' | 'gray';

export interface WorkoutComplianceInput {
    id?: string;
    scheduledDate: string | Date;
    isCompleted?: boolean;
    linkedActivityId?: string | null;
    plannedTss?: number | null;
    targetDistanceKm?: number | null;
    targetDistance?: number | null;
    targetDurationSec?: number | null;
    targetDuration?: number | null;
    // Actual stats (either passed on workout directly or resolved)
    actualTss?: number | null;
    actualDistanceKm?: number | null;
    actualDurationSec?: number | null;
}

export interface WorkoutComplianceResult {
    status: ComplianceStatus;
    color: ComplianceColor;
    ratio: number | null;
    label: string;
}

export interface WeeklyComplianceAggregate {
    plannedTss: number;
    actualTss: number;
    plannedKm: number;
    actualKm: number;
    plannedDurationSec: number;
    actualDurationSec: number;
    completedCount: number;
    totalCount: number;
    complianceRatio: number; // e.g. 0.85
    compliancePct: number; // e.g. 85 (%)
    status: ComplianceStatus;
    statusColor: ComplianceColor;
}

function normalizeDate(d: string | Date): Date {
    if (typeof d === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m - 1, day);
        }
        return parseISO(d);
    }
    return startOfDay(d);
}

/**
 * Maps ratio to compliance status and color.
 * - Green (ON_TARGET): 0.85 <= ratio <= 1.15
 * - Amber (DEVIATED): 0.60 <= ratio < 0.85 OR 1.15 < ratio <= 1.35
 * - Red (OFF_TARGET): ratio < 0.60 OR ratio > 1.35
 */
export function evaluateRatio(ratio: number): { status: ComplianceStatus; color: ComplianceColor } {
    if (ratio >= 0.85 && ratio <= 1.15) {
        return { status: 'ON_TARGET', color: 'green' };
    }
    if ((ratio >= 0.60 && ratio < 0.85) || (ratio > 1.15 && ratio <= 1.35)) {
        return { status: 'DEVIATED', color: 'amber' };
    }
    return { status: 'OFF_TARGET', color: 'red' };
}

/**
 * Computes compliance status for an individual workout.
 */
export function calculateWorkoutCompliance(
    workout: WorkoutComplianceInput,
    referenceDate: string | Date = new Date()
): WorkoutComplianceResult {
    const today = startOfDay(normalizeDate(referenceDate));
    const sched = startOfDay(normalizeDate(workout.scheduledDate));
    const isPast = isBefore(sched, today);

    if (!workout.isCompleted) {
        if (isPast) {
            return {
                status: 'MISSED',
                color: 'red',
                ratio: 0,
                label: 'Missed',
            };
        }
        return {
            status: 'PENDING',
            color: 'gray',
            ratio: null,
            label: 'Upcoming',
        };
    }

    // Workout is completed
    const plannedTss = workout.plannedTss ?? 0;
    const actualTss = workout.actualTss ?? 0;
    const plannedKm = workout.targetDistanceKm ?? workout.targetDistance ?? 0;
    const actualKm = workout.actualDistanceKm ?? 0;
    const plannedDur = workout.targetDurationSec ?? workout.targetDuration ?? 0;
    const actualDur = workout.actualDurationSec ?? 0;

    // Check if completed without any linked activity or measured stats
    const hasLinkedActivity = Boolean(workout.linkedActivityId);
    const hasActualStats = actualTss > 0 || actualKm > 0 || actualDur > 0;

    if (!hasLinkedActivity && !hasActualStats) {
        return {
            status: 'COMPLETED_UNLINKED',
            color: 'green',
            ratio: 1.0,
            label: 'Completed (unlinked)',
        };
    }

    // Determine ratio from TSS (preferred), else distance, else duration
    let ratio: number | null = null;
    if (plannedTss > 0 && actualTss > 0) {
        ratio = actualTss / plannedTss;
    } else if (plannedKm > 0 && actualKm > 0) {
        ratio = actualKm / plannedKm;
    } else if (plannedDur > 0 && actualDur > 0) {
        ratio = actualDur / plannedDur;
    } else if (hasActualStats) {
        // Workout had actual effort recorded but no planned targets
        ratio = 1.0;
    }

    if (ratio === null) {
        return {
            status: 'ON_TARGET',
            color: 'green',
            ratio: 1.0,
            label: 'Completed',
        };
    }

    const evaluated = evaluateRatio(ratio);
    return {
        status: evaluated.status,
        color: evaluated.color,
        ratio: Math.round(ratio * 100) / 100,
        label: evaluated.status === 'ON_TARGET' ? 'On Target' : (evaluated.status === 'DEVIATED' ? 'Deviated' : 'Off Target'),
    };
}

/**
 * Computes weekly aggregate compliance across an array of workouts.
 */
export function calculateWeeklyCompliance(
    workouts: WorkoutComplianceInput[],
    referenceDate: string | Date = new Date()
): WeeklyComplianceAggregate {
    let plannedTss = 0;
    let actualTss = 0;
    let plannedKm = 0;
    let actualKm = 0;
    let plannedDurationSec = 0;
    let actualDurationSec = 0;
    let completedCount = 0;

    for (const w of workouts) {
        const pTss = w.plannedTss ?? 0;
        const aTss = w.actualTss ?? 0;
        const pKm = w.targetDistanceKm ?? w.targetDistance ?? 0;
        const aKm = w.actualDistanceKm ?? 0;
        const pDur = w.targetDurationSec ?? w.targetDuration ?? 0;
        const aDur = w.actualDurationSec ?? 0;

        plannedTss += pTss;
        actualTss += aTss;
        plannedKm += pKm;
        actualKm += aKm;
        plannedDurationSec += pDur;
        actualDurationSec += aDur;

        if (w.isCompleted) {
            completedCount++;
        }
    }

    // Calculate primary compliance ratio
    let complianceRatio = 0;
    if (plannedTss > 0) {
        complianceRatio = actualTss / plannedTss;
    } else if (plannedKm > 0) {
        complianceRatio = actualKm / plannedKm;
    } else if (plannedDurationSec > 0) {
        complianceRatio = actualDurationSec / plannedDurationSec;
    } else if (completedCount > 0 && workouts.length > 0) {
        complianceRatio = completedCount / workouts.length;
    }

    const compliancePct = Math.round(complianceRatio * 100);
    const evaluated = evaluateRatio(complianceRatio);

    return {
        plannedTss: Math.round(plannedTss * 10) / 10,
        actualTss: Math.round(actualTss * 10) / 10,
        plannedKm: Math.round(plannedKm * 10) / 10,
        actualKm: Math.round(actualKm * 10) / 10,
        plannedDurationSec,
        actualDurationSec,
        completedCount,
        totalCount: workouts.length,
        complianceRatio: Math.round(complianceRatio * 100) / 100,
        compliancePct,
        status: evaluated.status,
        statusColor: evaluated.color,
    };
}
