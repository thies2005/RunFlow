import { AnalyticsService } from '../analytics';
import { METRICS } from '@/lib/constants';

// Helper to create mock activities
const createActivity = (dateStr: string, trimp?: number | null, movingTime: number = 3600) => ({
    startDate: new Date(dateStr),
    movingTime, // default 60 mins
    trimp: trimp ?? undefined, // Use undefined for missing TRIMP to test fallback logic if needed, though types say null | number. The function signature says trimp is in the Pick.
});

// The actual signature in AnalyticsService.calculateFitnessMetrics expects:
// activities: Pick<Activity, 'startDate' | 'movingTime' | 'trimp'>[]
// In the source code: const trimp = activity.trimp ?? (activity.movingTime / 60);
// So if we pass null, it should trigger the fallback.

describe('AnalyticsService.calculateFitnessMetrics', () => {
    // Reference date for tests: 2024-06-01
    const refDate = new Date('2024-06-01T12:00:00Z');

    it('should return zeros for empty activities', () => {
        const result = AnalyticsService.calculateFitnessMetrics([], refDate);
        expect(result).toEqual({
            ctl: 0,
            atl: 0,
            tsb: 0,
            workloadRatio: 0
        });
    });

    it('should calculate metrics for a single recent activity', () => {
        // Activity on the reference date with TRIMP 100
        const activities = [
            createActivity('2024-06-01T08:00:00Z', 100)
        ];

        // CTL and ATL update logic:
        // day 1: load 100
        // ctl = 0 + (100 - 0) / 42 = 2.38
        // atl = 0 + (100 - 0) / 7 = 14.28
        // tsb = 2.38 - 14.28 = -11.9

        const result = AnalyticsService.calculateFitnessMetrics(activities, refDate);

        // Exact floating point values depend on the loop implementation details (start date, etc.)
        // The implementation iterates from (refDate - 90 days) to refDate.
        // So the load of 100 is applied on the last day.
        // Prior days have 0 load, so CTL/ATL stay 0 until the last day.

        expect(result.ctl).toBeGreaterThan(0);
        expect(result.atl).toBeGreaterThan(0);
        expect(result.tsb).toBeLessThan(0); // Fatigue > Fitness immediately after big effort
    });

    it('should use movingTime/60 as fallback when trimp is missing', () => {
        // 60 minutes moving time -> should be treated as TRIMP 1
        // Wait, logic is: activity.trimp ?? (activity.movingTime / 60)
        // If movingTime is 3600 (seconds), 3600/60 = 60 TRIMP.

        const activities = [
            createActivity('2024-06-01T08:00:00Z', null, 3600)
        ];

        const result = AnalyticsService.calculateFitnessMetrics(activities, refDate);

        // Should be equivalent to TRIMP 60
        expect(result.ctl).toBeGreaterThan(0);
    });

    it('should accumulate load over time (steady state)', () => {
        // Simulate daily running of 100 TRIMP for 60 days
        const activities = [];
        const startDate = new Date(refDate);
        startDate.setDate(startDate.getDate() - 60);

        for (let d = new Date(startDate); d <= refDate; d.setDate(d.getDate() + 1)) {
            activities.push(createActivity(d.toISOString(), 100));
        }

        const result = AnalyticsService.calculateFitnessMetrics(activities, refDate);

        // In steady state, CTL and ATL should approach the daily load (100)
        // CTL takes ~42 days (time constant) to reach 63% of steady state?
        // Actually EWMA converges to the input value eventually.
        // After 60 days (approx 1.5x CTL time constant), it should be close to 100.

        expect(result.ctl).toBeGreaterThan(70);
        expect(result.atl).toBeGreaterThan(90); // ATL (7 days) converges faster

        // TSB = CTL - ATL. If ATL > CTL (ramping up or steady high), TSB is negative?
        // If steady state 100, both should be 100, so TSB ~ 0.
        // But since we started from 0 60 days ago:
        // ATL converges to 100 in ~20 days (3*7).
        // CTL converges to 100 in ~120 days (3*42).
        // So at day 60, ATL is ~100, CTL is maybe ~75-80.
        // So TSB = 80 - 100 = -20.

        expect(result.tsb).toBeLessThan(0);
    });

    it('should handle zero division in workload ratio', () => {
        // No activities -> CTL 0 -> workloadRatio 0
        const result = AnalyticsService.calculateFitnessMetrics([], refDate);
        expect(result.workloadRatio).toBe(0);
    });

    it('should ignore activities older than the calculation window', () => {
        // Calculation window is roughly 90 days in the implementation:
        // const ninetyDaysAgo = new Date(referenceDate);
        // ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - METRICS.CTL_DECAY_DAYS * 2);
        // 42 * 2 = 84 days.

        // Let's create an activity 100 days ago.
        const oldDate = new Date(refDate);
        oldDate.setDate(oldDate.getDate() - 100);

        const activities = [
            createActivity(oldDate.toISOString(), 100)
        ];

        const result = AnalyticsService.calculateFitnessMetrics(activities, refDate);

        // Should be 0 because it was filtered out before the loop
        expect(result.ctl).toBe(0);
        expect(result.atl).toBe(0);
    });
});
