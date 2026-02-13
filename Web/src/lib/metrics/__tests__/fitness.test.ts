import { calculateFitnessHistory, calculateRunningTss, getActivityContribution, interpretTsb } from '../fitness';

describe('Fitness Metrics', () => {
    describe('calculateFitnessHistory', () => {
        it('should calculate Decay correctly', () => {
            const load = { date: new Date('2024-01-01'), trimp: 100, runningTss: 100, activityTypes: ['RUN'] };
            const history = calculateFitnessHistory([load], 0, 0);

            // CTL Decay (42 days) -> 100 * (1 - e^-1/42) approx 2.35
            // ATL Decay (7 days) -> 100 * (1 - e^-1/7) approx 13.3
            const day1 = history[0].metrics;
            expect(day1.ctl).toBeGreaterThan(0);
            expect(day1.atl).toBeGreaterThan(day1.ctl); // ATL rises faster
        });

        it('should handle empty input', () => {
            const history = calculateFitnessHistory([]);
            expect(history).toEqual([]);
        });
    });

    describe('calculateRunningTss', () => {
        it('should calculate rTSS correctly', () => {
            // 1 hour at threshold (IF 1.0) = 100 TSS
            const tss = calculateRunningTss(3600, 10000, 360); // 10k in 1h is 360s/km. Threshold 360s/km.
            expect(tss).toBeCloseTo(100, 0);
        });

        it('should return 0 for zero distance', () => {
            expect(calculateRunningTss(3600, 0, 300)).toBe(0);
        });
    });

    describe('getActivityContribution', () => {
        it('should identify Running correctly', () => {
            // The impl does `activityType.toUpperCase()`.
            expect(getActivityContribution('run').contributesToRunningTss).toBe(true);
            expect(getActivityContribution('Ride').contributesToRunningTss).toBe(false);
            expect(getActivityContribution('Ride').contributesToCtl).toBe(true);
        });
    });

    describe('interpretTsb', () => {
        it('should return fresh state for positive TSB', () => {
            expect(interpretTsb(10).status).toBe('fresh');
        });

        it('should return fatigued for very negative TSB', () => {
            expect(interpretTsb(-40).status).toBe('very_fatigued');
        });
    });
});
