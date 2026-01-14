import { Activity, MarathonShape } from '@/lib/types';
import { METRICS } from '@/lib/constants';
import { calculateWeightedEffectiveVO2max, calculateMarathonShape } from '@/lib/metrics/runalyze';

/**
 * Service to handle analytics calculations
 * 
 * Note on Calibration/Correction Factor (H-05):
 * The vdotCorrectionFactor is applied ONLY in calculateVO2max().
 * Raw VO2max is calculated first, then multiplied by the correction factor.
 * This ensures calibration is applied consistently in one place.
 */
export class AnalyticsService {
    /**
     * Calculate Fitness (CTL), Fatigue (ATL), and Form (TSB)
     * using the standard exponential weighted moving average method.
     * 
     * M-01: Uses stored TRIMP when available from HR data,
     * falls back to simplistic approximation when no HR data.
     */
    static calculateFitnessMetrics(
        activities: Pick<Activity, 'startDate' | 'movingTime' | 'trimp'>[],
        referenceDate: Date = new Date()
    ) {
        const dailyLoads = new Map<string, number>();
        const ninetyDaysAgo = new Date(referenceDate);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - METRICS.CTL_DECAY_DAYS * 2); // Look back enough to stabilize

        // 1. Aggregation: Sum daily load (TRIMP)
        activities.forEach(activity => {
            const date = new Date(activity.startDate);
            if (date < ninetyDaysAgo) return;

            const dateKey = date.toISOString().split('T')[0];
            // Use stored TRIMP if available, otherwise fall back to simplistic approximation
            const trimp = activity.trimp ?? (activity.movingTime / 60);
            dailyLoads.set(dateKey, (dailyLoads.get(dateKey) || 0) + trimp);
        });

        // 2. Calculation: EWMA
        let ctl = 0;
        let atl = 0;

        // Iterate day by day from start of window to today
        // We start comfortably before the "90 days ago" window to let values build up, 
        // but for display purposes usually we just care about "now".
        // For accurate "now" values, we should simulate at least 2-3x the time constant.
        const simulationStartDate = new Date(ninetyDaysAgo);

        for (let d = new Date(simulationStartDate); d <= referenceDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const todayLoad = dailyLoads.get(dateKey) || 0;

            ctl = ctl + (todayLoad - ctl) / METRICS.CTL_DECAY_DAYS;
            atl = atl + (todayLoad - atl) / METRICS.ATL_DECAY_DAYS;
        }

        const tsb = ctl - atl;
        const workloadRatio = ctl > 0 ? parseFloat((atl / ctl).toFixed(2)) : 0;

        return {
            ctl: Math.round(ctl),
            atl: Math.round(atl),
            tsb: Math.round(tsb),
            workloadRatio
        };
    }

    /**
     * Calculate mileage for the current week (from Monday)
     */
    static calculateCurrentWeekMileage(activities: Pick<Activity, 'startDate' | 'distance'>[], referenceDate: Date = new Date()): number {
        const day = referenceDate.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
        const monday = new Date(referenceDate);
        monday.setDate(referenceDate.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        const weeklyDistanceMeters = activities
            .filter(a => new Date(a.startDate) >= monday)
            .reduce((sum, a) => sum + (a.distance || 0), 0);

        return parseFloat((weeklyDistanceMeters / 1000).toFixed(1));
    }

    static calculateEasyTrimp(activities: Pick<Activity, 'startDate' | 'movingTime'>[], referenceDate: Date = new Date()): number {
        const windowStart = new Date(referenceDate);
        windowStart.setDate(windowStart.getDate() - METRICS.EASY_TRIMP_WINDOW_DAYS);

        const trimpSum = activities
            .filter(a => new Date(a.startDate) >= windowStart)
            .reduce((sum, a) => sum + (a.movingTime / 60), 0);

        return Math.round(trimpSum);
    }

    /**
     * Wrapper for Runalyze VO2max calculations
     */
    static calculateVO2max(activities: any[], maxHr: number, correctionFactor: number): { rawVO2max: number, effectiveVO2max: number } {
        const rawVO2max = calculateWeightedEffectiveVO2max(activities, maxHr, 1.0); // 1.0 for raw
        // The original logic applied the user's correction factor to the raw value
        // "calibrationFactor" in the original code passed to calculateWeightedEffectiveVO2max was actually 'marathonShapeFactor' which seems wrong for VO2max calc?
        // Let's stick to the previous behavior: Raw * UserCorrection = Effective

        const effectiveVO2max = parseFloat((rawVO2max * correctionFactor).toFixed(1));

        return { rawVO2max, effectiveVO2max };
    }

    static calculateShape(runActivities: any[], crossTrainingActivities: any[], effectiveVO2max: number): MarathonShape {
        return calculateMarathonShape(
            runActivities,
            effectiveVO2max,
            crossTrainingActivities
        );
    }
}
