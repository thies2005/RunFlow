import {
    calculateProgressionCoefficient,
    calculateShapePenalty,
    calculateProjectedGoalTime,
    calculateWeeksUntilRace,
    type PlanSettings,
} from '../goalProjection';

describe('Goal Projection Calculator', () => {
    describe('calculateProgressionCoefficient', () => {
        it('should return 1.0 for zero duration', () => {
            expect(calculateProgressionCoefficient(0, 4, 50)).toBe(1.0);
        });

        it('should return 1.0 for negative duration', () => {
            expect(calculateProgressionCoefficient(-5, 4, 50)).toBe(1.0);
        });

        it('should increase with longer duration', () => {
            const short = calculateProgressionCoefficient(4, 4, 50);
            const long = calculateProgressionCoefficient(16, 4, 50);

            expect(long).toBeGreaterThan(short);
        });

        it('should increase with higher frequency', () => {
            const lowFreq = calculateProgressionCoefficient(12, 3, 50);
            const highFreq = calculateProgressionCoefficient(12, 6, 50);

            expect(highFreq).toBeGreaterThan(lowFreq);
        });

        it('should increase with higher volume', () => {
            const lowVol = calculateProgressionCoefficient(12, 4, 30);
            const highVol = calculateProgressionCoefficient(12, 4, 80);

            expect(highVol).toBeGreaterThan(lowVol);
        });

        it('should cap at MAX_IMPROVEMENT_FACTOR (1.15)', () => {
            // Very aggressive plan
            const result = calculateProgressionCoefficient(52, 7, 150);

            expect(result).toBeLessThanOrEqual(1.15);
        });

        it('should return reasonable values for typical plans', () => {
            // 12-week plan, 4 runs/week, 50km/week
            const typical = calculateProgressionCoefficient(12, 4, 50);

            expect(typical).toBeGreaterThan(1.0);
            expect(typical).toBeLessThan(1.10); // Reasonable improvement
        });
    });

    describe('calculateShapePenalty', () => {
        it('should return 0 penalty at 100% shape', () => {
            expect(calculateShapePenalty('MARATHON', 100)).toBe(0);
            expect(calculateShapePenalty('5K', 100)).toBe(0);
        });

        it('should return max penalty at 0% shape', () => {
            // Marathon: 30% penalty at 0% shape
            expect(calculateShapePenalty('MARATHON', 0)).toBeCloseTo(0.30, 2);

            // 5K: 5% penalty at 0% shape
            expect(calculateShapePenalty('5K', 0)).toBeCloseTo(0.05, 2);
        });

        it('should have higher penalty for longer distances', () => {
            const shape = 50;
            const fiveK = calculateShapePenalty('5K', shape);
            const half = calculateShapePenalty('HALF', shape);
            const marathon = calculateShapePenalty('MARATHON', shape);

            expect(marathon).toBeGreaterThan(half);
            expect(half).toBeGreaterThan(fiveK);
        });

        it('should cap shape at 100%', () => {
            // Even if shape > 100, penalty should be 0
            expect(calculateShapePenalty('MARATHON', 120)).toBe(0);
        });
    });

    describe('calculateProjectedGoalTime', () => {
        const basePlanSettings: PlanSettings = {
            durationWeeks: 16,
            runsPerWeek: 4,
            weeklyMileageGoal: 60,
            raceDistance: 'MARATHON',
        };

        it('should return zeros for invalid VO2max', () => {
            const result = calculateProjectedGoalTime(0, basePlanSettings);

            expect(result.optimalTime).toBe(0);
            expect(result.projectedTime).toBe(0);
            expect(result.projectedVdot).toBe(0);
        });

        it('should return zeros for invalid duration', () => {
            const result = calculateProjectedGoalTime(50, { ...basePlanSettings, durationWeeks: 0 });

            expect(result.optimalTime).toBe(0);
            expect(result.projectedTime).toBe(0);
        });

        it('should project improvement with valid inputs', () => {
            const result = calculateProjectedGoalTime(50, basePlanSettings, 70);

            expect(result.projectedVdot).toBeGreaterThan(50);
            expect(result.improvementPercent).toBeGreaterThan(0);
            expect(result.optimalTime).toBeGreaterThan(0);
            expect(result.projectedTime).toBeGreaterThan(result.optimalTime);
        });

        it('should have conservative time slower than projected', () => {
            const result = calculateProjectedGoalTime(50, basePlanSettings, 70);

            expect(result.conservativeTime).toBeGreaterThan(result.projectedTime);
        });

        it('should improve shape over training period', () => {
            const result = calculateProjectedGoalTime(50, basePlanSettings, 70);

            expect(result.projectedShape).toBeGreaterThan(70);
            expect(result.shapeImprovementPercent).toBeGreaterThan(0);
        });

        it('should cap shape at 100%', () => {
            const result = calculateProjectedGoalTime(50, basePlanSettings, 95, 20);

            expect(result.projectedShape).toBeLessThanOrEqual(100);
        });

        it('should handle 5K projections', () => {
            const planSettings: PlanSettings = {
                durationWeeks: 8,
                runsPerWeek: 4,
                weeklyMileageGoal: 40,
                raceDistance: '5K',
            };

            const result = calculateProjectedGoalTime(50, planSettings, 80);

            expect(result.optimalTime).toBeGreaterThan(0);
            expect(result.optimalTime).toBeLessThan(1800); // Under 30 min for VDOT 50+
        });

        it('should handle half marathon projections', () => {
            const planSettings: PlanSettings = {
                durationWeeks: 12,
                runsPerWeek: 4,
                weeklyMileageGoal: 50,
                raceDistance: 'HALF',
            };

            const result = calculateProjectedGoalTime(50, planSettings, 70);

            expect(result.optimalTime).toBeGreaterThan(0);
            expect(result.optimalTime).toBeLessThan(7200); // Under 2 hours for VDOT 50+
        });
    });

    describe('calculateWeeksUntilRace', () => {
        it('should calculate correct weeks for future date', () => {
            const today = new Date('2024-01-01');
            const raceDate = new Date('2024-04-01'); // ~13 weeks

            const weeks = calculateWeeksUntilRace(raceDate, today);

            expect(weeks).toBe(13);
        });

        it('should return 0 for past dates', () => {
            const today = new Date('2024-04-01');
            const raceDate = new Date('2024-01-01');

            const weeks = calculateWeeksUntilRace(raceDate, today);

            expect(weeks).toBe(0);
        });

        it('should return 0 for same date', () => {
            const date = new Date('2024-01-01');

            const weeks = calculateWeeksUntilRace(date, date);

            expect(weeks).toBe(0);
        });

        it('should floor partial weeks', () => {
            const today = new Date('2024-01-01');
            const raceDate = new Date('2024-01-10'); // 9 days = 1 full week + 2 days

            const weeks = calculateWeeksUntilRace(raceDate, today);

            expect(weeks).toBe(1);
        });
    });
});
