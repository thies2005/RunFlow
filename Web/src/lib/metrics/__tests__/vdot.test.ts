import { calculateVdot, predictRaceTime, calculateTrainingPaces, analyzeRace, formatTime, formatPace, DISTANCES } from '../vdot';

describe('VDOT Calculator', () => {
    describe('calculateVdot', () => {
        it('should calculate correct VDOT for 5K', () => {
            // 20:00 5K is roughly VDOT 49.8
            const vdot = calculateVdot({ distance: '5K', timeSeconds: 1200 });
            expect(vdot).toBeCloseTo(49.8, 0);
        });

        it('should calculate correct VDOT for 10K', () => {
            // 42:00 10K is roughly VDOT 49.1
            const vdot = calculateVdot({ distance: '10K', timeSeconds: 2520 });
            expect(vdot).toBeCloseTo(49.1, 0);
        });

        it('should calculate correct VDOT for half marathon', () => {
            // 1:33:00 (5580s) Half is roughly VDOT 49.1
            const vdot = calculateVdot({ distance: 'HALF', timeSeconds: 5580 });
            expect(vdot).toBeCloseTo(49.1, 0);
        });

        it('should calculate correct VDOT for marathon', () => {
            // 3:15:00 (11700s) Marathon is roughly VDOT 48.7
            const vdot = calculateVdot({ distance: 'MARATHON', timeSeconds: 11700 });
            expect(vdot).toBeCloseTo(48.7, 0);
        });

        it('should return 0 for invalid inputs', () => {
            expect(calculateVdot({ distance: '5K', timeSeconds: 0 })).toBe(0);
            expect(calculateVdot({ distance: '5K', timeSeconds: -100 })).toBe(0);
        });

        it('should handle extremely fast times', () => {
            // World record 5K is ~12:35 (755s) -> VDOT ~85
            const vdot = calculateVdot({ distance: '5K', timeSeconds: 755 });
            expect(vdot).toBeGreaterThan(80);
        });

        it('should handle very slow times', () => {
            // Very slow 5K (60 min) should still produce positive VDOT
            const vdot = calculateVdot({ distance: '5K', timeSeconds: 3600 });
            expect(vdot).toBeGreaterThan(0);
            expect(vdot).toBeLessThan(30);
        });

        it('should accept numeric distance in meters', () => {
            const vdot = calculateVdot({ distance: 5000, timeSeconds: 1200 });
            expect(vdot).toBeCloseTo(49.8, 1);
        });
    });

    describe('predictRaceTime', () => {
        it('should predict reasonable marathon time for VDOT 50', () => {
            // VDOT 50 -> Marathon ~3:10:49 (11449s)
            const time = predictRaceTime(50, 'MARATHON');
            const hours = time / 3600;
            expect(hours).toBeCloseTo(3.18, 1); // ~3:11
        });

        it('should predict reasonable 5K time for VDOT 50', () => {
            // VDOT 50 -> 5K ~19:57 (1197s)
            const time = predictRaceTime(50, '5K');
            expect(time).toBeCloseTo(1197, 30); // Within 30 seconds
        });

        it('should predict reasonable half marathon time for VDOT 50', () => {
            // VDOT 50 -> Half ~1:29:xx
            const time = predictRaceTime(50, 'HALF');
            const minutes = time / 60;
            expect(minutes).toBeCloseTo(91.6, 1); // ~1:31:30
        });

        it('should predict faster time for higher VDOT', () => {
            const time40 = predictRaceTime(40, 'MARATHON');
            const time50 = predictRaceTime(50, 'MARATHON');
            const time60 = predictRaceTime(60, 'MARATHON');

            expect(time60).toBeLessThan(time50);
            expect(time50).toBeLessThan(time40);
        });

        it('should be inverse of calculateVdot', () => {
            // If we predict a time from VDOT, calculating VDOT from that time
            // should give us back the original VDOT
            const originalVdot = 50;
            const predictedTime = predictRaceTime(originalVdot, '10K');
            const calculatedVdot = calculateVdot({ distance: '10K', timeSeconds: predictedTime });

            expect(calculatedVdot).toBeCloseTo(originalVdot, 0);
        });
    });

    describe('calculateTrainingPaces', () => {
        it('should return zones for valid VDOT', () => {
            const zones = calculateTrainingPaces(50);
            expect(zones.easy).toBeDefined();
            expect(zones.interval).toBeDefined();
            expect(zones.easy.min).toBeGreaterThan(zones.interval); // Easy is slower (higher sec/km)
        });

        it('should have correct pace hierarchy', () => {
            const zones = calculateTrainingPaces(50);

            // From slowest to fastest: Easy > Marathon > Threshold > Interval > Repetition
            expect(zones.easy.max).toBeGreaterThan(zones.marathon);
            expect(zones.marathon).toBeGreaterThan(zones.threshold);
            expect(zones.threshold).toBeGreaterThan(zones.interval);
            expect(zones.interval).toBeGreaterThan(zones.repetition);
        });

        it('should handle invalid VDOT gracefully', () => {
            const zones = calculateTrainingPaces(0);
            expect(zones.easy.min).toBeDefined();
        });

        it('should produce faster paces for higher VDOT', () => {
            const zones40 = calculateTrainingPaces(40);
            const zones60 = calculateTrainingPaces(60);

            // Lower sec/km = faster pace
            expect(zones60.easy.min).toBeLessThan(zones40.easy.min);
            expect(zones60.threshold).toBeLessThan(zones40.threshold);
        });
    });

    describe('analyzeRace', () => {
        it('should return complete analysis', () => {
            const result = analyzeRace({ distance: '5K', timeSeconds: 1200 });

            expect(result.vdot).toBeGreaterThan(0);
            expect(result.predictions).toBeDefined();
            expect(result.trainingPaces).toBeDefined();
            expect(result.predictions['5K']).toBeDefined();
            expect(result.predictions['MARATHON']).toBeDefined();
        });
    });

    describe('formatTime', () => {
        it('should format seconds to MM:SS', () => {
            expect(formatTime(1200)).toBe('20:00');
            expect(formatTime(1234)).toBe('20:34');
        });

        it('should format hours correctly', () => {
            expect(formatTime(3661)).toBe('1:01:01');
            expect(formatTime(7200)).toBe('2:00:00');
        });
    });

    describe('formatPace', () => {
        it('should format pace correctly', () => {
            expect(formatPace(300)).toBe('5:00/km');
            expect(formatPace(330)).toBe('5:30/km');
        });
    });

    describe('DISTANCES constant', () => {
        it('should have correct distances in meters', () => {
            expect(DISTANCES['5K']).toBe(5000);
            expect(DISTANCES['10K']).toBe(10000);
            expect(DISTANCES['HALF']).toBe(21097.5);
            expect(DISTANCES['MARATHON']).toBe(42195);
        });
    });
});
