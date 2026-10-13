/**
 * Best-effort VDOT (performance metric)
 * =====================================
 *
 * VDOT here is a PERFORMANCE number: computed purely from run distance and
 * moving time (Daniels-Gilbert, see vdot.ts calculateVdot). No heart-rate
 * input anywhere in this path. It is THE metric that drives plan creation,
 * starting/target VDOT progression, workout paces and race projections.
 *
 * This mirrors the Android app exactly:
 * - android/.../core/math/VdotMath.kt (vdot formula)
 * - android/.../domain/analytics/AnalyticsEngine.kt (~81-87): keep runs from
 *   the last 90 days that are >= 5 km, drop computed VDOTs <= 20, take the
 *   MAX (best effort), then multiply by the VDOT correction factor.
 *
 * Do NOT confuse this with the HR-based aerobic-fitness trend in runalyze.ts
 * (calculateWeightedEffectiveVO2max) — that metric is display-only and never
 * feeds paces or planning.
 */

import { calculateVdot } from './vdot';
import { DAY_MS } from '@/lib/constants';

/** Lookback window for qualifying efforts (mirrors Android: 90 days) */
export const BEST_EFFORT_VDOT_LOOKBACK_DAYS = 90;

/** Minimum run distance in meters for a qualifying effort (mirrors Android: 5 km) */
export const BEST_EFFORT_VDOT_MIN_DISTANCE_M = 5000;

/** Computed VDOTs at or below this are discarded (mirrors Android: > 20) */
export const BEST_EFFORT_VDOT_MIN_VDOT = 20;

/** Activity type stored for runs (see strava/transform.ts mapActivityType) */
const RUN_TYPE = 'RUN';

/**
 * Minimal activity data needed for the best-effort VDOT calculation
 */
export interface ActivityForVdot {
    startDate: string | Date;
    distance: number;
    movingTime: number;
    type?: string;
}

/**
 * Compute the best-effort VDOT from recent running activities.
 *
 * Filters: running activities only, within the last 90 days,
 * distance >= 5000 m, movingTime > 0. Each qualifying activity's VDOT is
 * computed from the raw (distance, movingTime); VDOTs <= 20 are dropped;
 * the MAX is taken and multiplied by vdotCorrectionFactor.
 *
 * @returns The best-effort VDOT, or 0 when no activity qualifies.
 */
export function bestEffortVdot(activities: ActivityForVdot[], vdotCorrectionFactor: number = 1.0): number {
    const cutoff = Date.now() - BEST_EFFORT_VDOT_LOOKBACK_DAYS * DAY_MS;

    const bestRawVdot = activities
        .filter(a =>
            (a.type?.toUpperCase() || '') === RUN_TYPE &&
            new Date(a.startDate).getTime() > cutoff &&
            a.distance >= BEST_EFFORT_VDOT_MIN_DISTANCE_M &&
            a.movingTime > 0
        )
        .map(a => calculateVdot({ distance: a.distance, timeSeconds: a.movingTime }))
        .filter(v => v > BEST_EFFORT_VDOT_MIN_VDOT)
        .reduce((max, v) => (v > max ? v : max), 0);

    return bestRawVdot * vdotCorrectionFactor;
}
