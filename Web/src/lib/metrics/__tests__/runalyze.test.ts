import { calculateEffectiveVO2max, calculateMarathonShape, solveCalibrationFactor, calculateGeneralAerobicScore, calculateWeightedEffectiveVO2max } from '../runalyze';

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

        it('should return 0 for low intensity runs (HR < 60% maxHR)', () => {
            // HR 110/200 = 55%
            expect(calculateEffectiveVO2max(5000, 1200, 110, 200)).toBe(0);
        });

        it('should return 0 for very short durations or distances', () => {
            // 5 minutes (300s)
            expect(calculateEffectiveVO2max(5000, 300, 180, 200)).toBe(0);
            // 1km (1000m)
            expect(calculateEffectiveVO2max(1000, 1200, 180, 200)).toBe(0);
        });
    });

    describe('calculateGeneralAerobicScore', () => {
        it('should return 0 for empty activities', () => {
            const result = calculateGeneralAerobicScore([]);
            expect(result.score).toBe(0);
            expect(result.totalMinutes).toBe(0);
        });

        it('should calculate score from cross-training zone times', () => {
            const activities = [
                {
                    startDate: new Date(),
                    distance: 30000,
                    movingTime: 3600,
                    hasHeartrate: true,
                    type: 'RIDE',
                    hrZone2Time: 1800, // 30 min
                    hrZone3Time: 900,  // 15 min
                    hrZone4Time: 300,  // 5 min
                }
            ];
            const result = calculateGeneralAerobicScore(activities, 7);
            expect(result.score).toBeGreaterThan(0);
            expect(result.totalMinutes).toBe(50); // 30 + 15 + 5
            expect(result.activityTypes).toContain('RIDE');
        });

        it('should filter out running activities', () => {
            const activities = [
                {
                    startDate: new Date(),
                    distance: 10000,
                    movingTime: 3600,
                    hasHeartrate: true,
                    type: 'RUN',
                    hrZone2Time: 1800,
                    hrZone3Time: 900,
                }
            ];
            const result = calculateGeneralAerobicScore(activities, 7);
            expect(result.score).toBe(0);
            expect(result.totalMinutes).toBe(0);
        });
    });

    describe('calculateMarathonShape', () => {
        it('should return 0 shape for empty history', () => {
            const result = calculateMarathonShape([], 50);
            expect(result.shape).toBe(0);
            expect(result.crossTrainingScore).toBe(0);
        });

        it('should include cross-training score when provided', () => {
            const runActivities = [
                {
                    startDate: new Date(),
                    distance: 10000,
                    movingTime: 3600,
                    hasHeartrate: true,
                }
            ];
            const crossTrainingActivities = [
                {
                    startDate: new Date(),
                    distance: 30000,
                    movingTime: 3600,
                    hasHeartrate: true,
                    type: 'RIDE',
                    hrZone2Time: 1800,
                    hrZone3Time: 900,
                    hrZone4Time: 300,
                }
            ];

            const resultWithCrossTraining = calculateMarathonShape(runActivities, 50, crossTrainingActivities);
            const resultWithoutCrossTraining = calculateMarathonShape(runActivities, 50);

            expect(resultWithCrossTraining.crossTrainingScore).toBeGreaterThan(0);
            expect(resultWithoutCrossTraining.crossTrainingScore).toBe(0);
        });

        it('should cap shape at 100%', () => {
            // Create lots of training data
            const runActivities = Array.from({ length: 100 }, (_, i) => ({
                startDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                distance: 20000, // 20km per day
                movingTime: 6000,
                hasHeartrate: true,
            }));

            const result = calculateMarathonShape(runActivities, 30); // Low VO2max = low target
            expect(result.shape).toBeLessThanOrEqual(100);
        });
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

    describe('calculateWeightedEffectiveVO2max', () => {
        const makeActivity = (daysAgo: number, distance: number, time: number, hr: number) => ({
            startDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
            distance,
            movingTime: time,
            averageHr: hr,
            hasHeartrate: true,
        });

        it('should return 0 for empty activities', () => {
            expect(calculateWeightedEffectiveVO2max([], 200)).toBe(0);
        });

        it('should be stable across short time periods', () => {
            const activities = Array.from({ length: 20 }, (_, i) =>
                makeActivity(i, 5000, 1200, 170)
            );
            const result = calculateWeightedEffectiveVO2max(activities, 200);
            const singleDay = calculateWeightedEffectiveVO2max(
                [makeActivity(0, 5000, 1200, 170)], 200
            );
            const diff = Math.abs(result - singleDay);
            expect(diff).toBeLessThan(3);
        });

        it('should filter out outlier activities using IQR', () => {
            const normal = Array.from({ length: 8 }, (_, i) =>
                makeActivity(i, 5000, 1200, 170)
            );
            const outlier = makeActivity(1, 5000, 1200, 195);
            const withOutlier = calculateWeightedEffectiveVO2max([...normal, outlier], 200);
            const withoutOutlier = calculateWeightedEffectiveVO2max(normal, 200);
            const diff = Math.abs(withOutlier - withoutOutlier);
            expect(diff).toBeLessThan(2);
        });

        it('should exclude activities older than 120 days', () => {
            const recent = makeActivity(30, 5000, 1200, 170);
            const old = makeActivity(150, 5000, 1200, 170);
            const resultRecent = calculateWeightedEffectiveVO2max([recent], 200);
            const resultBoth = calculateWeightedEffectiveVO2max([recent, old], 200);
            expect(resultBoth).toBe(resultRecent);
        });

        it('should weight recent activities higher than older ones', () => {
            const recent = makeActivity(1, 5000, 1200, 170);
            const older = makeActivity(60, 5000, 1200, 180);
            const recentOnly = calculateWeightedEffectiveVO2max([recent], 200);
            const both = calculateWeightedEffectiveVO2max([recent, older], 200);
            expect(both).not.toBe(recentOnly);
        });
    });
});
