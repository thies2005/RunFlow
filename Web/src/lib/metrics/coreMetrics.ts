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
 * Shared-Baseline Two-Stage Pipeline:
 * 1. calibratedEffectiveVo2max (aerobicVo2max) = rawVo2max * effectiveVo2maxCorrectionFactor
 *    -> Drives Dashboard VO2max and Race Predictions (+ Marathon Shape penalty)
 * 2. trainingVdot (bestEffortVdot) = calibratedEffectiveVo2max * vdotCorrectionFactor
 *    -> Drives Training Paces (falls back to pace-only bestEffortVdot if no HR data exists)
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

    const fallbackPaceVdot = bestEffortVdot(runActivities, 1.0);
    const baselineFitness = effectiveVO2max > 0 ? effectiveVO2max : fallbackPaceVdot;
    const trainingVdot = baselineFitness > 0
        ? parseFloat((baselineFitness * paceFactor).toFixed(1))
        : 0;

    return {
        bestEffortVdot: trainingVdot,
        aerobicVo2max: effectiveVO2max,
        rawVo2max: rawVO2max,
        effectiveVo2maxCorrectionFactor: effFactor,
        vdotCorrectionFactor: paceFactor,
    };
}
