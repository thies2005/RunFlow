import { calculateShapePenalty, applyShapePenalty, SHAPE_IMPACTS } from '../calibration';
import type { RaceDistance } from '../vdot';

describe('Calibration Metrics', () => {
    describe('calculateShapePenalty', () => {
        it('should return 0 penalty for 100% shape', () => {
            const result = calculateShapePenalty(100, 0.1);
            expect(result).toBe(0);
        });

        it('should return full impact penalty for 0% shape', () => {
            const result = calculateShapePenalty(0, 0.1);
            expect(result).toBe(0.1);
        });

        it('should return half impact penalty for 50% shape', () => {
            const result = calculateShapePenalty(50, 0.1);
            expect(result).toBeCloseTo(0.05);
        });

        it('should clamp shape percentage greater than 100', () => {
            const result = calculateShapePenalty(150, 0.1);
            expect(result).toBe(0);
        });

        it('should clamp shape percentage less than 0', () => {
            const result = calculateShapePenalty(-50, 0.1);
            expect(result).toBe(0.1);
        });

        it('should apply calibration factor', () => {
            // 50% shape -> 0.5 multiplier. Impact 0.1. Calibration 2.0.
            // Result = 0.5 * 0.1 * 2.0 = 0.1
            const result = calculateShapePenalty(50, 0.1, 2.0);
            expect(result).toBeCloseTo(0.1);
        });

        it('should use default calibration factor of 1.0', () => {
            const result = calculateShapePenalty(50, 0.1);
            expect(result).toBeCloseTo(0.05);
        });
    });

    describe('applyShapePenalty', () => {
        it('should apply correct penalty for 5K', () => {
            // 5K impact is 0.05
            // 0% shape -> full penalty (0.05)
            // Time 1000s -> 1000 * (1 + 0.05) = 1050s
            const result = applyShapePenalty(1000, 0, '5K');
            expect(result).toBeCloseTo(1050);
        });

        it('should apply correct penalty for Marathon', () => {
            // Marathon impact is 0.30
            // 50% shape -> half penalty (0.15)
            // Time 10000s -> 10000 * (1 + 0.15) = 11500s
            const result = applyShapePenalty(10000, 50, 'MARATHON');
            expect(result).toBeCloseTo(11500);
        });

        it('should apply no penalty at 100% shape', () => {
            const result = applyShapePenalty(1000, 100, '10K');
            expect(result).toBe(1000);
        });

        it('should handle custom calibration factor', () => {
            // 5K impact 0.05
            // 0% shape -> base penalty 0.05
            // Calibration 2.0 -> final penalty 0.10
            // Time 1000s -> 1100s
            const result = applyShapePenalty(1000, 0, '5K', 2.0);
            expect(result).toBeCloseTo(1100);
        });

        it('should handle unknown distance gracefully', () => {
            // Unknown distance impact defaults to 0
            // result should be equal to optimalSeconds
             const result = applyShapePenalty(1000, 0, 'UNKNOWN' as RaceDistance);
             expect(result).toBe(1000);
        });

        it('should use defined impacts from SHAPE_IMPACTS', () => {
            expect(SHAPE_IMPACTS['5K']).toBe(0.05);
            expect(SHAPE_IMPACTS['10K']).toBe(0.08);
            expect(SHAPE_IMPACTS['HALF']).toBe(0.15);
            expect(SHAPE_IMPACTS['MARATHON']).toBe(0.30);
        });
    });
});
