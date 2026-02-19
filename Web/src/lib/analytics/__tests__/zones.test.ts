import { calculateZoneDistribution, calculateZonePercentages, calculateUserZones } from '../zones';
import { Activity } from '@prisma/client';

describe('Zone Analytics', () => {
    describe('calculateZoneDistribution', () => {
        it('should return zero distribution for empty activities', () => {
            const result = calculateZoneDistribution([]);
            expect(result).toEqual({
                z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0, total: 0
            });
        });

        it('should ignore activities without heart rate data', () => {
            const activities = [
                { hasHeartrate: false, hrZone1Time: 100 } as unknown as Activity
            ];
            const result = calculateZoneDistribution(activities);
            expect(result.total).toBe(0);
        });

        it('should aggregate zone times correctly', () => {
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
                } as unknown as Activity
            ];

            const result = calculateZoneDistribution(activities);
            expect(result).toEqual({
                z1: 15, z2: 25, z3: 35, z4: 45, z5: 55, z6: 65, z7: 75,
                total: 315
            });
        });

        it('should handle null zone times as 0', () => {
             const activities = [
                {
                    hasHeartrate: true,
                    hrZone1Time: null,
                    hrZone2Time: undefined,
                    hrZone3Time: 10
                } as unknown as Activity
            ];
            const result = calculateZoneDistribution(activities);
            expect(result.z1).toBe(0);
            expect(result.z2).toBe(0);
            expect(result.z3).toBe(10);
            expect(result.total).toBe(10);
        });
    });

    describe('calculateZonePercentages', () => {
        it('should return all zeros if total time is 0', () => {
            const distribution = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0, total: 0 };
            const result = calculateZonePercentages(distribution);
            expect(result).toEqual({ z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 });
        });

        it('should calculate percentages correctly', () => {
            const distribution = {
                z1: 10, z2: 20, z3: 30, z4: 40, z5: 0, z6: 0, z7: 0,
                total: 100
            };
            const result = calculateZonePercentages(distribution);
            expect(result).toEqual({ z1: 10, z2: 20, z3: 30, z4: 40, z5: 0, z6: 0, z7: 0 });
        });

        it('should round percentages', () => {
             const distribution = {
                z1: 1, z2: 1, z3: 1, z4: 0, z5: 0, z6: 0, z7: 0,
                total: 3
            };
            // 1/3 = 33.33... -> 33
            const result = calculateZonePercentages(distribution);
            expect(result.z1).toBe(33);
            expect(result.z2).toBe(33);
            expect(result.z3).toBe(33);
        });
    });

    describe('calculateUserZones', () => {
        it('should calculate zones correctly using Karvonen formula', () => {
            const hrMax = 200;
            const hrRest = 50;
            // HRR = 150
            // Z1: 50-60% -> 75-90 + 50 -> 125-140
            // Z2: 60-70% -> 90-105 + 50 -> 140-155
            // Z3: 70-80% -> 105-120 + 50 -> 155-170
            // Z4: 80-90% -> 120-135 + 50 -> 170-185
            // Z5: 90-95% -> 135-142.5 + 50 -> 185-192.5 -> 185-193 (round)
            // Z6: 95-100% -> 142.5-150 + 50 -> 192.5-200 -> 193-200
            // Z7: >100% -> 150 + 50 -> 200 -> min:200, max:200

            const zones = calculateUserZones(hrMax, hrRest);

            expect(zones.z1).toEqual({ min: 125, max: 140 });
            expect(zones.z2).toEqual({ min: 140, max: 155 });
            expect(zones.z3).toEqual({ min: 155, max: 170 });
            expect(zones.z4).toEqual({ min: 170, max: 185 });
            // Rounding check
            expect(zones.z5.min).toBe(185);
            expect(zones.z5.max).toBe(193); // 192.5 rounds to 193
            expect(zones.z6.min).toBe(193); // 192.5 rounds to 193
            expect(zones.z6.max).toBe(200);
            expect(zones.z7.min).toBe(200);
            expect(zones.z7.max).toBe(200);
        });
    });
});
