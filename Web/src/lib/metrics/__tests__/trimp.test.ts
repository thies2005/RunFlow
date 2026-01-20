import {
    calculateHRReserve,
    calculateTrimp,
    calculateZoneTrimp,
    calculateTrimpFromZones,
    FALLBACK_TRIMP_PER_MINUTE,
    type TrimpInput
} from '../trimp';

describe('TRIMP Calculator', () => {
    describe('calculateHRReserve', () => {
        it('should calculate correct HR reserve percentage', () => {
            // 150 bpm avg, 190 max, 50 rest -> (150-50)/(190-50) = 100/140 = 0.714
            const hrr = calculateHRReserve(150, 190, 50);
            expect(hrr).toBeCloseTo(0.714, 2);
        });

        it('should return 0 for invalid HR max', () => {
            expect(calculateHRReserve(150, 0, 50)).toBe(0);
            expect(calculateHRReserve(150, -10, 50)).toBe(0);
        });

        it('should return 0 when HR max <= HR rest', () => {
            expect(calculateHRReserve(150, 50, 60)).toBe(0);
            expect(calculateHRReserve(150, 50, 50)).toBe(0);
        });

        it('should return 0 for invalid average HR', () => {
            expect(calculateHRReserve(0, 190, 50)).toBe(0);
            expect(calculateHRReserve(-10, 190, 50)).toBe(0);
        });

        it('should clamp result between 0 and 1', () => {
            // Very low avg HR (below rest) should clamp to 0
            const lowHrr = calculateHRReserve(40, 190, 50);
            expect(lowHrr).toBe(0);

            // Very high avg HR (above max) should clamp to 1
            const highHrr = calculateHRReserve(200, 190, 50);
            expect(highHrr).toBe(1);
        });

        it('should handle edge case of rest HR being 0', () => {
            // 100 avg, 200 max, 0 rest -> 100/200 = 0.5
            const hrr = calculateHRReserve(100, 200, 0);
            expect(hrr).toBeCloseTo(0.5, 2);
        });
    });

    describe('calculateTrimp', () => {
        it('should calculate TRIMP for typical male workout', () => {
            const input: TrimpInput = {
                durationMinutes: 60,
                averageHr: 150,
                hrMax: 190,
                hrRest: 50,
                sex: 'MALE'
            };

            const result = calculateTrimp(input);

            expect(result.trimp).toBeGreaterThan(0);
            expect(result.hrReservePercent).toBeCloseTo(71.4, 0); // ~71.4%
            expect(result.intensityFactor).toBeGreaterThan(1); // Exponential factor
        });

        it('should calculate higher TRIMP for male vs female at same intensity', () => {
            const baseInput = {
                durationMinutes: 60,
                averageHr: 160,
                hrMax: 190,
                hrRest: 50,
            };

            const maleResult = calculateTrimp({ ...baseInput, sex: 'MALE' as const });
            const femaleResult = calculateTrimp({ ...baseInput, sex: 'FEMALE' as const });

            // Male coefficient (1.92) > Female coefficient (1.67)
            expect(maleResult.trimp).toBeGreaterThan(femaleResult.trimp);
        });

        it('should return 0 TRIMP for 0 duration', () => {
            const input: TrimpInput = {
                durationMinutes: 0,
                averageHr: 150,
                hrMax: 190,
                hrRest: 50,
                sex: 'MALE'
            };

            const result = calculateTrimp(input);
            expect(result.trimp).toBe(0);
        });

        it('should handle low intensity workout', () => {
            const input: TrimpInput = {
                durationMinutes: 60,
                averageHr: 100, // Very easy HR
                hrMax: 190,
                hrRest: 50,
                sex: 'MALE'
            };

            const result = calculateTrimp(input);

            // Low intensity should still produce positive TRIMP
            expect(result.trimp).toBeGreaterThan(0);
            expect(result.hrReservePercent).toBeCloseTo(35.7, 0); // 50/140 = 35.7%
        });

        it('should handle max intensity workout', () => {
            const input: TrimpInput = {
                durationMinutes: 30,
                averageHr: 185, // Near max HR
                hrMax: 190,
                hrRest: 50,
                sex: 'MALE'
            };

            const result = calculateTrimp(input);

            // High intensity should produce significant TRIMP
            expect(result.trimp).toBeGreaterThan(100);
            expect(result.hrReservePercent).toBeCloseTo(96.4, 0); // 135/140 = 96.4%
        });
    });

    describe('calculateZoneTrimp', () => {
        it('should calculate zone-based TRIMP correctly', () => {
            const result = calculateZoneTrimp({
                zone1Minutes: 10,
                zone2Minutes: 20,
                zone3Minutes: 15,
                zone4Minutes: 10,
                zone5Minutes: 5
            });

            // 10*1 + 20*2 + 15*3 + 10*4 + 5*5 = 10 + 40 + 45 + 40 + 25 = 160
            expect(result).toBe(160);
        });

        it('should return 0 for zero zone times', () => {
            const result = calculateZoneTrimp({
                zone1Minutes: 0,
                zone2Minutes: 0,
                zone3Minutes: 0,
                zone4Minutes: 0,
                zone5Minutes: 0
            });

            expect(result).toBe(0);
        });

        it('should weight higher zones more', () => {
            // Same total time, different distribution
            const easyWorkout = calculateZoneTrimp({
                zone1Minutes: 60,
                zone2Minutes: 0,
                zone3Minutes: 0,
                zone4Minutes: 0,
                zone5Minutes: 0
            });

            const hardWorkout = calculateZoneTrimp({
                zone1Minutes: 0,
                zone2Minutes: 0,
                zone3Minutes: 0,
                zone4Minutes: 0,
                zone5Minutes: 60
            });

            expect(hardWorkout).toBe(easyWorkout * 5); // Zone 5 is 5x Zone 1
        });
    });

    describe('calculateTrimpFromZones', () => {
        it('should convert seconds to minutes and calculate TRIMP', () => {
            // 60 seconds in each zone = 1 minute each
            const result = calculateTrimpFromZones(60, 60, 60, 60, 60);

            // 1*1 + 1*2 + 1*3 + 1*4 + 1*5 = 15
            expect(result).toBe(15);
        });

        it('should handle null values as 0', () => {
            const result = calculateTrimpFromZones(600, null, null, null, null);

            // 10 minutes in zone 1 only = 10
            expect(result).toBe(10);
        });

        it('should handle all null values', () => {
            const result = calculateTrimpFromZones(null, null, null, null, null);
            expect(result).toBe(0);
        });
    });

    describe('FALLBACK_TRIMP_PER_MINUTE', () => {
        it('should be a reasonable fallback value', () => {
            // For a 60 min workout without HR data, should produce reasonable TRIMP
            const fallbackTrimp = 60 * FALLBACK_TRIMP_PER_MINUTE;

            expect(fallbackTrimp).toBe(150); // 60 * 2.5 = 150
            expect(FALLBACK_TRIMP_PER_MINUTE).toBeGreaterThan(0);
            expect(FALLBACK_TRIMP_PER_MINUTE).toBeLessThan(10);
        });
    });
});
