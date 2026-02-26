import { calculateZoneDistribution, calculateZonePercentages, calculateUserZones, ZoneDistribution } from '../zones';
import { Activity } from '@prisma/client';

describe('Zone Analytics', () => {
    describe('calculateZoneDistribution', () => {
        it('should return empty distribution for empty activities', () => {
            const activities: Activity[] = [];
            const result = calculateZoneDistribution(activities);
            expect(result).toEqual({
                z1: 0,
                z2: 0,
                z3: 0,
                z4: 0,
                z5: 0,
                z6: 0,
                z7: 0,
                total: 0
            });
        });

        it('should ignore activities without heart rate data', () => {
            // Mock activities without heartrate
            const activities = [
                { hasHeartrate: false, hrZone1Time: 100, hrZone2Time: 200 } as unknown as Activity,
                { hasHeartrate: false, hrZone2Time: 300 } as unknown as Activity,
            ];

            const result = calculateZoneDistribution(activities);

            expect(result).toEqual({
                z1: 0,
                z2: 0,
                z3: 0,
                z4: 0,
                z5: 0,
                z6: 0,
                z7: 0,
                total: 0
            });
        });

        it('should accumulate zone times correctly for activities with heart rate', () => {
            const activities = [
                {
                    hasHeartrate: true,
                    hrZone1Time: 10,
                    hrZone2Time: 20,
                    hrZone3Time: 30,
                    hrZone4Time: 40,
                    hrZone5Time: 50,
                    hrZone6Time: 60,
                    hrZone7Time: 70
                } as unknown as Activity,
                {
                    hasHeartrate: true,
                    hrZone1Time: 5,
                    hrZone2Time: 5,
                    hrZone3Time: 5,
                    hrZone4Time: 5,
                    hrZone5Time: 5,
                    hrZone6Time: 5,
                    hrZone7Time: 5
                } as unknown as Activity,
            ];

            const result = calculateZoneDistribution(activities);

            expect(result).toEqual({
                z1: 15,
                z2: 25,
                z3: 35,
                z4: 45,
                z5: 55,
                z6: 65,
                z7: 75,
                total: 315 // Sum of all zones
            });
        });

        it('should handle null or undefined zone times by treating them as 0', () => {
            const activities = [
                {
                    hasHeartrate: true,
                    hrZone1Time: null,
                    hrZone2Time: undefined,
                    hrZone3Time: 100
                } as unknown as Activity
            ];

            const result = calculateZoneDistribution(activities);

            expect(result.z1).toBe(0);
            expect(result.z2).toBe(0);
            expect(result.z3).toBe(100);
            expect(result.total).toBe(100);
        });
    });

    describe('calculateZonePercentages', () => {
        it('should return all zeros if total time is 0', () => {
            const distribution: ZoneDistribution = {
                z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0, total: 0
            };
            const result = calculateZonePercentages(distribution);
            expect(result).toEqual({
                z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0
            });
        });

        it('should calculate correct percentages', () => {
            const distribution: ZoneDistribution = {
                z1: 10, // 10%
                z2: 20, // 20%
                z3: 30, // 30%
                z4: 40, // 40%
                z5: 0,
                z6: 0,
                z7: 0,
                total: 100
            };
            const result = calculateZonePercentages(distribution);
            expect(result).toEqual({
                z1: 10,
                z2: 20,
                z3: 30,
                z4: 40,
                z5: 0,
                z6: 0,
                z7: 0
            });
        });

        it('should round percentages correctly', () => {
            // Total 300. 100/300 = 33.333... -> 33%
            const distribution: ZoneDistribution = {
                z1: 100,
                z2: 100,
                z3: 100,
                z4: 0,
                z5: 0,
                z6: 0,
                z7: 0,
                total: 300
            };
            const result = calculateZonePercentages(distribution);

            expect(result.z1).toBe(33);
            expect(result.z2).toBe(33);
            expect(result.z3).toBe(33);
        });
    });

    describe('calculateUserZones', () => {
        it('should calculate zones correctly based on Karvonen formula', () => {
            // Karvonen: ((max - rest) * intensity) + rest
            const hrMax = 200;
            const hrRest = 50;

            // Expected calculations:
            // Z1: 50-60% -> (0.5 * 150 + 50) to (0.6 * 150 + 50) -> 75+50=125 to 90+50=140
            // Z2: 60-70% -> 140 to 105+50=155
            // Z3: 70-80% -> 155 to 120+50=170
            // Z4: 80-90% -> 170 to 135+50=185
            // Z5: 90-95% -> 185 to 142.5+50=192.5 (round to 193)
            // Z6: 95-100% -> 193 to 150+50=200
            // Z7: >100% -> 200 to hrMax (200)

            const zones = calculateUserZones(hrMax, hrRest);

            expect(zones.z1).toEqual({ min: 125, max: 140 });
            expect(zones.z2).toEqual({ min: 140, max: 155 });
            expect(zones.z3).toEqual({ min: 155, max: 170 });
            expect(zones.z4).toEqual({ min: 170, max: 185 });
            expect(zones.z5.min).toBe(185);
            // 0.95 * 150 = 142.5. + 50 = 192.5. Math.round(192.5) is 193.
            expect(zones.z5.max).toBe(193);
            expect(zones.z6.min).toBe(193);
            expect(zones.z6.max).toBe(200);

            // Z7 handles over max? The code says max: hrMax.
            // Z7 min is same as Z6 max in the code?
            // Code: z7: { min: Math.round(hrr * 1.0 + hrRest), max: hrMax },
            // hrr * 1.0 + hrRest = 150 + 50 = 200.
            expect(zones.z7.min).toBe(200);
            expect(zones.z7.max).toBe(200);
        });
    });
});
