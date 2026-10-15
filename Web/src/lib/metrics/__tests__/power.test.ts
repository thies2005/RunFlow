import {
    calculateCogganPowerZones,
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculatePowerCurve,
    calculateCriticalPower,
    estimateFtpFromPowerCurve,
    estimateBikeFtpFromVdot,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
} from '../power';

describe('Cycling Power Engine', () => {
    describe('calculateCogganPowerZones', () => {
        it('calculates 7 Coggan zones accurately for 250W FTP and 70kg weight', () => {
            const zones = calculateCogganPowerZones(250, 70);
            expect(zones).toHaveLength(7);

            // Z1: <= 55% (<= 138W)
            expect(zones[0]).toEqual({
                zone: 1,
                name: 'Active Recovery',
                minWatts: 0,
                maxWatts: 138,
                minWkg: 0,
                maxWkg: 1.97,
            });

            // Z2: 56-75% (139 - 188W)
            expect(zones[1]).toEqual({
                zone: 2,
                name: 'Endurance',
                minWatts: 139,
                maxWatts: 188,
                minWkg: 1.99,
                maxWkg: 2.69,
            });

            // Z3: 76-90% (189 - 225W)
            expect(zones[2]).toEqual({
                zone: 3,
                name: 'Tempo',
                minWatts: 189,
                maxWatts: 225,
                minWkg: 2.7,
                maxWkg: 3.21,
            });

            // Z4: 91-105% (226 - 263W)
            expect(zones[3]).toEqual({
                zone: 4,
                name: 'Lactate Threshold',
                minWatts: 226,
                maxWatts: 263,
                minWkg: 3.23,
                maxWkg: 3.76,
            });

            // Z5: 106-120% (264 - 300W)
            expect(zones[4]).toEqual({
                zone: 5,
                name: 'VO2max',
                minWatts: 264,
                maxWatts: 300,
                minWkg: 3.77,
                maxWkg: 4.29,
            });

            // Z6: 121-150% (301 - 375W)
            expect(zones[5]).toEqual({
                zone: 6,
                name: 'Anaerobic Capacity',
                minWatts: 301,
                maxWatts: 375,
                minWkg: 4.3,
                maxWkg: 5.36,
            });

            // Z7: > 150% (> 375W)
            expect(zones[6]).toEqual({
                zone: 7,
                name: 'Neuromuscular Power',
                minWatts: 376,
                maxWatts: 9999,
                minWkg: 5.37,
                maxWkg: null,
            });
        });

        it('handles null or missing weight cleanly', () => {
            const zones = calculateCogganPowerZones(200);
            expect(zones[0].minWkg).toBe(0);
            expect(zones[0].maxWkg).toBeNull();
            expect(zones[1].minWkg).toBeNull();
        });

        it('returns empty array for invalid FTP', () => {
            expect(calculateCogganPowerZones(0)).toEqual([]);
            expect(calculateCogganPowerZones(-50)).toEqual([]);
        });
    });

    describe('calculateNormalizedPower', () => {
        it('returns exact power for constant power output', () => {
            const constantWatts = Array(120).fill(200);
            const np = calculateNormalizedPower(constantWatts);
            expect(np).toBe(200);
        });

        it('gives higher NP than average power for variable power intervals', () => {
            // Alternating 100W and 300W in 30s blocks for 120s
            const intervalWatts = [
                ...Array(30).fill(100),
                ...Array(30).fill(300),
                ...Array(30).fill(100),
                ...Array(30).fill(300),
            ];
            const avgWatts = intervalWatts.reduce((a, b) => a + b, 0) / intervalWatts.length; // 200W
            const np = calculateNormalizedPower(intervalWatts);
            expect(np).toBeGreaterThan(avgWatts);
        });

        it('handles non-uniform time streams', () => {
            // 60 seconds with 2-second steps (30 samples)
            const timeStream = Array.from({ length: 30 }, (_, i) => i * 2);
            const wattsStream = Array(30).fill(250);
            const np = calculateNormalizedPower(wattsStream, timeStream);
            expect(np).toBe(250);
        });

        it('falls back to weighted average or average when stream < 30s', () => {
            const shortWatts = [200, 210, 220];
            expect(calculateNormalizedPower(shortWatts, undefined, 215, 210)).toBe(215);
            expect(calculateNormalizedPower([], undefined, null, 205)).toBe(205);
            expect(calculateNormalizedPower(undefined, undefined, null, null)).toBeNull();
        });
    });

    describe('calculateIntensityFactor and VariabilityIndex', () => {
        it('computes Intensity Factor correctly to 3 decimals', () => {
            expect(calculateIntensityFactor(250, 250)).toBe(1);
            expect(calculateIntensityFactor(200, 250)).toBe(0.8);
            expect(calculateIntensityFactor(275, 250)).toBe(1.1);
            expect(calculateIntensityFactor(0, 250)).toBeNull();
            expect(calculateIntensityFactor(250, 0)).toBeNull();
        });

        it('computes Variability Index correctly to 2 decimals', () => {
            expect(calculateVariabilityIndex(250, 200)).toBe(1.25);
            expect(calculateVariabilityIndex(200, 200)).toBe(1);
            expect(calculateVariabilityIndex(200, 0)).toBeNull();
        });
    });

    describe('calculateBikeTss', () => {
        it('calculates exactly 100 TSS for 1 hour at threshold (IF = 1.0)', () => {
            // 3600 seconds at FTP 250W, NP 250W, IF 1.0
            const tss = calculateBikeTss(3600, 250, 1.0, 250);
            expect(tss).toBe(100);
        });

        it('calculates 50 TSS for 2 hours at IF 0.5', () => {
            // movingTime: 7200s, NP: 100, IF: 0.5, FTP: 200
            // ((7200 * 100 * 0.5) / (200 * 3600)) * 100 = (360000 / 720000) * 100 = 50
            const tss = calculateBikeTss(7200, 100, 0.5, 200);
            expect(tss).toBe(50);
        });

        it('returns 0 for non-positive parameters', () => {
            expect(calculateBikeTss(0, 250, 1.0, 250)).toBe(0);
            expect(calculateBikeTss(3600, 0, 1.0, 250)).toBe(0);
            expect(calculateBikeTss(3600, 250, 1.0, 0)).toBe(0);
        });
    });

    describe('calculatePowerCurve and eFTP', () => {
        it('computes peak power across standard durations', () => {
            // Create a 1-hour ride (3600s) with a 5-second sprint of 600W, rest 200W
            const watts = Array(3600).fill(200);
            for (let i = 100; i < 105; i++) {
                watts[i] = 600;
            }

            const curve = calculatePowerCurve(watts);
            expect(curve).toHaveLength(10); // [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]

            const peak5 = curve.find(c => c.durationSec === 5);
            expect(peak5?.peakWatts).toBe(600);

            const peak3600 = curve.find(c => c.durationSec === 3600);
            // 5s of 600W + 3595s of 200W = (3000 + 719000) / 3600 = 722000 / 3600 = 200.56 -> 201W
            expect(peak3600?.peakWatts).toBe(201);
        });

        it('estimates FTP from 20-minute (1200s) peak power (95%)', () => {
            const curve = [
                { durationSec: 300, peakWatts: 350 },
                { durationSec: 1200, peakWatts: 300 },
            ];

            const eFtp = estimateFtpFromPowerCurve(curve);
            expect(eFtp).toBe(Math.round(0.95 * 300)); // 285W
        });

        it('calculates Critical Power via 2-parameter model', () => {
            // peak 5m (300s): 350W, peak 20m (1200s): 300W
            // CP = (300 * 1200 - 350 * 300) / 900 = (360000 - 105000) / 900 = 255000 / 900 = 283.33 -> 283W
            const cp = calculateCriticalPower(350, 300);
            expect(cp).toBe(283);

            const curve = [
                { durationSec: 300, peakWatts: 350 },
                { durationSec: 1200, peakWatts: 300 },
            ];
            const eFtpCp = estimateFtpFromPowerCurve(curve, null, { useCriticalPower: true });
            expect(eFtpCp).toBe(283);
        });

        it('falls back to weighted average watts for eFTP estimation', () => {
            const eFtp = estimateFtpFromPowerCurve([], 250);
            expect(eFtp).toBe(Math.round(0.95 * 250)); // 238W
        });

        it('estimates cycling FTP from running VDOT', () => {
            const ftp = estimateBikeFtpFromVdot(50, 70);
            expect(ftp).toBeGreaterThan(150);
            expect(ftp).toBeLessThan(350);
            expect(estimateBikeFtpFromVdot(0)).toBeNull();
        });
    });

    describe('calculateEfficiencyFactor and calculateAerobicDecoupling', () => {
        it('calculates Efficiency Factor (EF)', () => {
            expect(calculateEfficiencyFactor(240, 150)).toBe(1.6);
            expect(calculateEfficiencyFactor(0, 150)).toBeNull();
            expect(calculateEfficiencyFactor(240, 0)).toBeNull();
        });

        it('calculates 0% decoupling when both halves have identical power and HR', () => {
            const watts = Array(120).fill(200);
            const hr = Array(120).fill(140);
            const decoupling = calculateAerobicDecoupling(watts, hr);
            expect(decoupling).toBe(0.0);
        });

        it('detects cardiac drift / aerobic decoupling when HR rises or power drops in 2nd half', () => {
            // First half: 200W at 140 bpm -> EF = 200 / 140 = 1.4286
            // Second half: 180W at 140 bpm -> EF = 180 / 140 = 1.2857
            // Decoupling % = ((1.4286 - 1.2857) / 1.4286) * 100 = 10.0%
            const watts = [...Array(60).fill(200), ...Array(60).fill(180)];
            const hr = Array(120).fill(140);
            const decoupling = calculateAerobicDecoupling(watts, hr);
            expect(decoupling).toBe(10.0);
        });

        it('returns null if stream is shorter than 60s', () => {
            expect(calculateAerobicDecoupling(Array(40).fill(200), Array(40).fill(140))).toBeNull();
        });
    });

    describe('calculatePowerZoneTimes', () => {
        it('categorizes time into the 7 Coggan power zones', () => {
            // FTP = 200W
            // Z1: <= 110W
            // Z2: 111 - 150W
            // Z3: 151 - 180W
            // Z4: 181 - 210W
            // Z5: 211 - 240W
            // Z6: 241 - 300W
            // Z7: > 300W
            const watts = [
                50, 100, // 2s in Z1
                120, 140, // 2s in Z2
                160, 170, // 2s in Z3
                190, 200, // 2s in Z4
                220, 230, // 2s in Z5
                260, 280, // 2s in Z6
                350, 400, // 2s in Z7
            ];

            const zoneTimes = calculatePowerZoneTimes(watts, undefined, 200);
            expect(zoneTimes).toEqual([2, 2, 2, 2, 2, 2, 2]);
        });

        it('returns 7 zeros when ftp is missing or invalid', () => {
            expect(calculatePowerZoneTimes([100, 200], undefined, null)).toEqual([0, 0, 0, 0, 0, 0, 0]);
            expect(calculatePowerZoneTimes([], undefined, 200)).toEqual([0, 0, 0, 0, 0, 0, 0]);
        });
    });

    describe('getCyclingAnalytics', () => {
        it('aggregates user rides and returns structured cycling analytics data', async () => {
            const { getCyclingAnalytics } = await import('../cyclingAnalytics');
            const mockUser = {
                ftpWatts: 260,
                autoEstimateFtp: true,
                weight: 72,
            };

            const mockRide = {
                id: 'ride-1',
                startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                name: 'Morning Hills',
                distance: 40000,
                movingTime: 3600,
                totalElevation: 450,
                averageWatts: 200,
                weightedAverageWatts: 220,
                maxWatts: 550,
                kilojoules: 720,
                npWatts: 230,
                intensityFactor: 0.885,
                variabilityIndex: 1.15,
                bikeTss: 78,
                efficiencyFactor: 1.55,
                aerobicDecoupling: 3.2,
                deviceWatts: true,
                powerZone1Time: 600,
                powerZone2Time: 1200,
                powerZone3Time: 900,
                powerZone4Time: 600,
                powerZone5Time: 200,
                powerZone6Time: 80,
                powerZone7Time: 20,
                streams: {
                    watts: Array(3600).fill(200),
                    time: Array.from({ length: 3600 }, (_, i) => i),
                },
            };

            const mockDailyFitness = {
                date: new Date(),
                ctl: 45.2,
                atl: 52.1,
                tsb: -6.9,
                ctlRunning: 20.0,
                ctlBike: 25.2,
                atlBike: 32.1,
                tsbBike: -6.9,
                runningTss: 0,
                bikeTss: 78,
                trimp: 85,
            };

            const { prisma } = await import('@/lib/db');
            (prisma.user.findUnique as jest.Mock) = jest.fn().mockResolvedValue(mockUser);
            (prisma.activity.findMany as jest.Mock) = jest.fn().mockResolvedValue([mockRide]);
            (prisma.dailyFitness.findMany as jest.Mock) = jest.fn().mockResolvedValue([mockDailyFitness]);
            (prisma.dailyFitness.findFirst as jest.Mock) = jest.fn().mockResolvedValue(mockDailyFitness);
            (prisma.dailyFitness.createMany as jest.Mock) = jest.fn().mockResolvedValue({ count: 0 });

            const result = await getCyclingAnalytics('user-1', '90d');

            expect(result.ftp.ftpWatts).toBe(260);
            expect(result.ftp.weightKg).toBe(72);
            expect(result.ftp.wPerKg).toBe(3.61);
            expect(result.ftp.zones).toHaveLength(7);

            expect(result.summary.totalRides).toBe(1);
            expect(result.summary.totalDistanceM).toBe(40000);
            expect(result.summary.totalMovingTimeSec).toBe(3600);
            expect(result.summary.totalKilojoules).toBe(720);
            expect(result.summary.avgWatts).toBe(200);
            expect(result.summary.maxWatts).toBe(550);
            expect(result.summary.avgNpWatts).toBe(230);
            expect(result.summary.totalBikeTss).toBe(78);

            expect(result.powerCurve.durationsSec).toEqual([5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]);
            expect(result.powerCurve.peakWatts).toHaveLength(10);
            expect(result.zoneDistributionSec).toEqual([600, 1200, 900, 600, 200, 80, 20]);

            expect(result.ridesSeries).toHaveLength(1);
            expect(result.ridesSeries[0].id).toBe('ride-1');
            expect(result.ridesSeries[0].avgWatts).toBe(200);
            expect(result.ridesSeries[0].npWatts).toBe(230);

            expect(result.pmcSeries).toHaveLength(1);
            expect(result.pmcSeries[0].ctlCombined).toBe(45.2);
            expect(result.pmcSeries[0].ctlBike).toBe(25.2);
            expect(result.pmcSeries[0].bikeTss).toBe(78);
        });
    });
});
