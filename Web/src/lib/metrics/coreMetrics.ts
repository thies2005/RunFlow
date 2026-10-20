import { AnalyticsService } from '@/lib/services/analytics';
import { bestEffortVdot } from './effectiveVdot';
import type { ActivityForShape } from './runalyze';

export interface CoreMetrics {
    bestEffortVdot: number;
    aerobicVo2max: number;
    rawVo2max: number;
    effectiveVo2maxCorrectionFactor: number;
    vdotCorrectionFactor: number;
}

/**
 * Two-Metric Pipeline (pace-first):
 * 1. aerobicVo2max = rawVo2max * effectiveVo2maxCorrectionFactor (HR-based)
 *    -> Drives Dashboard VO2max and Race Predictions (+ Marathon Shape penalty)
 * 2. bestEffortVdot = pace-based Daniels-Gilbert VDOT of the best qualifying
 *    run (>= 5 km within 90 days) * vdotCorrectionFactor
 *    -> Drives Training Paces; falls back to the HR-based effectiveVO2max ONLY
 *       when no qualifying pace performance exists, so a single outlier HR run
 *       can no longer inflate the training-pace VDOT.
 */
export function computeCoreMetrics(
    runActivities: ActivityForShape[],
    maxHr: number,
    vdotCorrectionFactor: number = 1.0,
    effectiveVo2maxCorrectionFactor: number = 1.0,
): CoreMetrics {
    const effFactor = effectiveVo2maxCorrectionFactor > 0 ? effectiveVo2maxCorrectionFactor : 1.0;
    const paceFactor = vdotCorrectionFactor > 0 ? vdotCorrectionFactor : 1.0;

    const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(
        runActivities,
        maxHr,
        effFactor
    );

    const paceVdot = bestEffortVdot(runActivities, 1.0);
    const baselineForPaces = paceVdot > 0 ? paceVdot : effectiveVO2max;
    const trainingVdot = baselineForPaces > 0
        ? parseFloat((baselineForPaces * paceFactor).toFixed(1))
        : 0;

    return {
        bestEffortVdot: trainingVdot,
        aerobicVo2max: effectiveVO2max,
        rawVo2max: rawVO2max,
        effectiveVo2maxCorrectionFactor: effFactor,
        vdotCorrectionFactor: paceFactor,
    };
}
