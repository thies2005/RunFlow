/**
 * Two-metric core computation
 * ===========================
 *
 * The single source of the two fitness metrics, shared by
 * /api/analytics/stats and /api/mobile/v1/analytics/stats so the two
 * endpoints can never disagree:
 *
 *  - bestEffortVdot: performance VDOT — THE planning metric (training paces,
 *    plan creation, race projections). 0 when no run qualifies (>= 5 km
 *    within 90 days). Already scaled by vdotCorrectionFactor.
 *  - aerobicVo2max: HR-based aerobic-fitness trend (display only, never
 *    feeds paces), scaled by vdotCorrectionFactor.
 *  - rawVo2max: the aerobic value before the correction factor.
 */
import { AnalyticsService } from '@/lib/services/analytics';
import { bestEffortVdot } from './effectiveVdot';
import type { ActivityForShape } from './runalyze';

export interface CoreMetrics {
    bestEffortVdot: number;
    aerobicVo2max: number;
    rawVo2max: number;
}

export function computeCoreMetrics(
    runActivities: ActivityForShape[],
    maxHr: number,
    vdotCorrectionFactor: number,
): CoreMetrics {
    const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(runActivities, maxHr, vdotCorrectionFactor);
    return {
        bestEffortVdot: bestEffortVdot(runActivities, vdotCorrectionFactor),
        aerobicVo2max: effectiveVO2max,
        rawVo2max: rawVO2max,
    };
}
