import { calculateVdot, predictRaceTime, calculateTrainingPaces } from '../vdot';

describe('VDOT Calculator', () => {
    describe('calculateVdot', () => {
        it('should calculate correct VDOT for 5K', () => {
            // 20:00 5K is roughly VDOT 49.8
            const vdot = calculateVdot({ distance: '5K', timeSeconds: 1200 });
            expect(vdot).toBeCloseTo(49.8, 1);
        });

        it('should return 0 for invalid inputs', () => {
            expect(calculateVdot({ distance: '5K', timeSeconds: 0 })).toBe(0);
        });
    });

    describe('predictRaceTime', () => {
        it('should predict reasonable marathon time for VDOT 50', () => {
            // VDOT 50 -> Marathon ~3:10:49 (11449s)
            const time = predictRaceTime(50, 'MARATHON');
            const hours = time / 3600;
            expect(hours).toBeCloseTo(3.18, 2); // ~3:11
        });
    });

    describe('calculateTrainingPaces', () => {
        it('should return zones for valid VDOT', () => {
            const zones = calculateTrainingPaces(50);
            expect(zones.easy).toBeDefined();
            expect(zones.interval).toBeDefined();
            expect(zones.easy.min).toBeGreaterThan(zones.interval); // Easy is slower (higher sec/km)
        });

        it('should handle invalid VDOT gracefully', () => {
            const zones = calculateTrainingPaces(0);
            expect(zones.easy.min).toBeDefined();
        });
    });
});


