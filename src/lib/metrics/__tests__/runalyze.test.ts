import { calculateEffectiveVO2max, calculateMarathonShape, solveCalibrationFactor } from '../runalyze';

describe('Runalyze Metrics', () => {
    describe('calculateEffectiveVO2max', () => {
        it('should calculate VO2max from run', () => {
            // 5k (5000m) in 20min (1200s), HR 180, MaxHR 200
            // this is a fast run, should have high VO2max
            const vo2 = calculateEffectiveVO2max(5000, 1200, 180, 200);
            expect(vo2).toBeGreaterThan(40);
        });

        it('should return 0 for invalid data', () => {
            expect(calculateEffectiveVO2max(0, 0, 0, 0)).toBe(0);
        });
    });

    describe('calculateMarathonShape', () => {
        it('should return 0 shape for empty history', () => {
            const result = calculateMarathonShape([], 50);
            expect(result.shape).toBe(0);
        });

        // Mock more complex scenarios if needed, but basic verify is good for now
    });

    describe('solveCalibrationFactor', () => {
        it('should return > 1.0 if actual time is slower than predicted', () => {
            // Optimal for VDOT 50 is ~3:10 (11449s)
            // Shape 50% -> +15% penalty -> Predicted ~3:39 (13166s)

            // If actual is 3:50 (13800s), we are slower than predicted -> Factor > 1
            const factor = solveCalibrationFactor(50, 50, 13800, 'MARATHON');
            expect(factor).toBeGreaterThan(1.0);
        });

        it('should return < 1.0 if actual time is faster than predicted', () => {
            // Predicted ~13166s
            // If actual is 3:30 (12600s), we are faster than predicted -> Factor < 1
            const factor = solveCalibrationFactor(50, 50, 12600, 'MARATHON');
            expect(factor).toBeLessThan(1.0);
        });
    });
});
