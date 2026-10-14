import {
    calculateWorkoutPlannedTss,
    calculateProjectedFitness,
    calculatePlanPlannedTss,
} from '../plannedTss';
import { calculateDecayFactor } from '../fitness';
import { WorkoutType } from '@/generated/prisma/client';

describe('calculateWorkoutPlannedTss', () => {
    it('returns persisted plannedTss directly when present', () => {
        const w = {
            workoutType: WorkoutType.TEMPO,
            targetDuration: 3600,
            plannedTss: 42.5,
        };
        expect(calculateWorkoutPlannedTss(w)).toBe(42.5);
    });

    it('returns null when targetDuration is missing', () => {
        const w = {
            workoutType: WorkoutType.EASY,
            targetDuration: null,
        };
        expect(calculateWorkoutPlannedTss(w)).toBeNull();
    });

    it('estimates a TEMPO (threshold-ish) workout at IF 0.85 for 3600s', () => {
        // 1h * 0.85^2 * 100 = 72.25
        const w = {
            workoutType: WorkoutType.TEMPO,
            targetDuration: 3600,
        };
        const expected = Math.round((1 * Math.pow(0.85, 2) * 100) * 10) / 10;
        expect(calculateWorkoutPlannedTss(w)).toBeCloseTo(expected, 1);
    });

    it('estimates an EASY run 60min at IF 0.75', () => {
        // 1h * 0.75^2 * 100 = 56.25 -> round1 = 56.3
        const w = {
            workoutType: WorkoutType.EASY,
            targetDuration: 3600,
        };
        expect(calculateWorkoutPlannedTss(w)).toBeCloseTo(56.3, 1);
        // Sanity: matches the closed-form value.
        expect(1 * Math.pow(0.75, 2) * 100).toBeCloseTo(56.25, 5);
    });

    it('estimates a RACE at IF 1.0 for 1h', () => {
        // 1h * 1.0^2 * 100 = 100
        const w = {
            workoutType: WorkoutType.RACE,
            targetDuration: 3600,
        };
        expect(calculateWorkoutPlannedTss(w)).toBe(100);
    });

    it('uses structuredSteps duration when present and overrides targetDuration', () => {
        // targetDuration says 3600s but steps actually sum to 5400s (1.5h)
        // EASY IF 0.75 -> 1.5 * 0.75^2 * 100 = 84.375 -> 84.4
        const w = {
            workoutType: WorkoutType.EASY,
            targetDuration: 3600,
            structuredSteps: [
                { durationSeconds: 1800 },
                { durationSeconds: 1800 },
                { durationSeconds: 1800 },
            ],
        };
        expect(calculateWorkoutPlannedTss(w)).toBeCloseTo(84.4, 1);
    });

    it('falls back to targetDuration when structuredSteps are unparseable', () => {
        const w = {
            workoutType: WorkoutType.EASY,
            targetDuration: 3600,
            structuredSteps: [{ note: 'warmup' }],
        };
        // 1h * 0.75^2 * 100 = 56.25 -> 56.3
        expect(calculateWorkoutPlannedTss(w)).toBeCloseTo(56.3, 1);
    });

    it('returns null for REST days (zero duration)', () => {
        const w = {
            workoutType: WorkoutType.REST,
            targetDuration: 0,
        };
        expect(calculateWorkoutPlannedTss(w)).toBeNull();
    });
});

describe('calculateWorkoutPlannedTss — canonical v2 structuredSteps', () => {
    it('sums RepeatGroup durations recursively: times * work + (times - 1) * setRest', () => {
        // 5 × (1000m @ 300s/km = 300s) + 4 × 120s recovery = 1980s
        // INTERVALS IF 0.95 -> 1980/3600 * 0.9025 * 100 = 49.6
        const w = {
            workoutType: WorkoutType.INTERVALS,
            targetDuration: 3600, // ignored — the v2 tree wins
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [{
                    kind: 'repeat',
                    times: 5,
                    setRest: { type: 'time', seconds: 120 },
                    steps: [{
                        kind: 'work',
                        duration: { type: 'distance', meters: 1000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 300 },
                    }],
                }],
            },
        };
        const expected = Math.round((1980 / 3600 * Math.pow(0.95, 2) * 100) * 10) / 10;
        expect(calculateWorkoutPlannedTss(w)).toBe(expected);
    });

    it('converts distance steps via workout.targetPace and slows warmup/recovery by 1.15x', () => {
        // warmup 2000m @ 300*1.15 = 690s; steady 3000m @ 300 = 900s -> 1590s
        // EASY IF 0.75 -> 1590/3600 * 0.5625 * 100 = 24.8
        const w = {
            workoutType: WorkoutType.EASY,
            targetPace: 300,
            targetDuration: 99999, // ignored — the v2 tree wins
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [
                    { kind: 'warmup', duration: { type: 'distance', meters: 2000 } },
                    { kind: 'steady', duration: { type: 'distance', meters: 3000 } },
                ],
            },
        };
        const expected = Math.round((1590 / 3600 * Math.pow(0.75, 2) * 100) * 10) / 10;
        expect(calculateWorkoutPlannedTss(w)).toBe(expected);
    });

    it('respects sec_per_100m units for swim distance steps', () => {
        // 1000m @ 100s/100m = 1000s; SWIM IF 0.8 -> 1000/3600 * 0.64 * 100 = 17.8
        const w = {
            workoutType: WorkoutType.SWIM,
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [{
                    kind: 'work',
                    duration: { type: 'distance', meters: 1000 },
                    target: { type: 'pace', unit: 'sec_per_100m', min: 100, max: 100 },
                }],
            },
        };
        const expected = Math.round((1000 / 3600 * Math.pow(0.8, 2) * 100) * 10) / 10;
        expect(calculateWorkoutPlannedTss(w)).toBe(expected);
    });

    it('falls back to targetDuration when the tree contains a lap_press step', () => {
        const w = {
            workoutType: WorkoutType.EASY,
            targetDuration: 3600,
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [
                    { kind: 'warmup', duration: { type: 'time', seconds: 300 } },
                    { kind: 'work', duration: { type: 'lap_press' }, target: { type: 'free' } },
                ],
            },
        };
        // 1h * 0.75^2 * 100 = 56.3 (targetDuration fallback)
        expect(calculateWorkoutPlannedTss(w)).toBeCloseTo(56.3, 1);
    });

    it('computes true power-based TSS for power-targeted steps when ftpWatts is known', () => {
        // 3600s @ 90% of 200W FTP -> watts 180
        // (3600 * 180 * (180/200)) / (200 * 3600) * 100 = 81.0
        const w = {
            workoutType: WorkoutType.RIDE,
            ftpWatts: 200,
            targetDuration: 3600,
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [{
                    kind: 'work',
                    duration: { type: 'time', seconds: 3600 },
                    target: { type: 'power', ftpPercent: 90 },
                }],
            },
        };
        expect(calculateWorkoutPlannedTss(w)).toBe(81.0);
    });

    it('uses the power formula over the whole duration for bike workouts with targetPowerWatts', () => {
        // (3600 * 200 * (200/200)) / (200 * 3600) * 100 = 100
        const w = {
            workoutType: WorkoutType.RIDE,
            targetDuration: 3600,
            targetPowerWatts: 200,
            ftpWatts: 200,
        };
        expect(calculateWorkoutPlannedTss(w)).toBe(100);
    });

    it('derives watts from targetFtpPercent for bike workouts without absolute watts', () => {
        // watts = 90% of 200 = 180 -> (3600*180*0.9)/(200*3600)*100 = 81
        // (distinct from the RIDE type-IF fallback, 56.3)
        const w = {
            workoutType: WorkoutType.RIDE,
            targetDuration: 3600,
            targetFtpPercent: 90,
            ftpWatts: 200,
        };
        expect(calculateWorkoutPlannedTss(w)).toBe(81);
    });
});

describe('calculateProjectedFitness', () => {
    it('returns empty for empty input', () => {
        expect(calculateProjectedFitness([])).toEqual([]);
    });

    it('applies Banister decay correctly and matches the closed-form formula', () => {
        // Seed initial CTL/ATL = 0, single planned day of 100 TSS.
        const loads = [
            {
                date: new Date('2024-01-01T00:00:00.000Z'),
                plannedTss: 100,
                actualTss: 0,
            },
        ];
        const result = calculateProjectedFitness(loads, {
            ctlDays: 42,
            atlDays: 7,
            initialCtl: 0,
            initialAtl: 0,
        });

        const ctlDecay = calculateDecayFactor(42);
        const atlDecay = calculateDecayFactor(7);
        // Impl computes raw ctl/atl, then tsb = ctl - atl, then rounds each to 1dp.
        const rawCtl = 0 * ctlDecay + 100 * (1 - ctlDecay);
        const rawAtl = 0 * atlDecay + 100 * (1 - atlDecay);
        const expectedCtl = Math.round(rawCtl * 10) / 10;
        const expectedAtl = Math.round(rawAtl * 10) / 10;
        const expectedTsb = Math.round((rawCtl - rawAtl) * 10) / 10;

        expect(result).toHaveLength(1);
        expect(result[0].plannedCtl).toBe(expectedCtl);
        expect(result[0].plannedAtl).toBe(expectedAtl);
        expect(result[0].plannedTsb).toBe(expectedTsb);
        // ATL rises faster than CTL -> TSB negative on a fresh-start single load.
        expect(expectedAtl).toBeGreaterThan(expectedCtl);
        expect(expectedTsb).toBeLessThan(0);
    });

    it('decays across multiple contiguous days (gap-filled)', () => {
        // Two planned days a week apart; the function fills the intervening days.
        const d1 = new Date('2024-01-01T00:00:00.000Z');
        const d8 = new Date('2024-01-08T00:00:00.000Z');
        const loads = [
            { date: d1, plannedTss: 100, actualTss: 0 },
            { date: d8, plannedTss: 100, actualTss: 0 },
        ];
        const result = calculateProjectedFitness(loads);
        // 8 days inclusive (Jan 1 .. Jan 8).
        expect(result).toHaveLength(8);
        // ATL should decay toward 0 between the two load days (7-day TC).
        const midAtl = result[6].plannedAtl;
        expect(midAtl).toBeGreaterThan(0);
        expect(midAtl).toBeLessThan(result[0].plannedAtl);
    });

    it('uses actualTss over plannedTss when actual is present', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const loads = [{ date, plannedTss: 100, actualTss: 60 }];
        const result = calculateProjectedFitness(loads, { initialCtl: 0, initialAtl: 0 });
        const atlDecay = calculateDecayFactor(7);
        const expectedAtl = Math.round((0 * atlDecay + 60 * (1 - atlDecay)) * 10) / 10;
        expect(result[0].plannedAtl).toBe(expectedAtl);
        expect(result[0].actualTss).toBe(60);
        expect(result[0].plannedTss).toBe(100);
    });

    it('respects custom ctlDays / atlDays', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const loads = [{ date, plannedTss: 100, actualTss: 0 }];
        const result = calculateProjectedFitness(loads, { ctlDays: 10, atlDays: 3 });
        const ctlDecay = calculateDecayFactor(10);
        const expectedCtl = Math.round((0 * ctlDecay + 100 * (1 - ctlDecay)) * 10) / 10;
        expect(result[0].plannedCtl).toBe(expectedCtl);
    });
});

describe('calculatePlanPlannedTss', () => {
    const baseDate = new Date('2024-01-01T00:00:00.000Z');

    it('maps date -> total planned TSS and skips completed workouts', () => {
        const workouts = [
            // Planned easy run on Jan 1 (1h, IF 0.75 -> 56.3)
            {
                workoutType: WorkoutType.EASY,
                scheduledDate: new Date('2024-01-01T00:00:00.000Z'),
                targetDuration: 3600,
                isCompleted: false,
            },
            // Completed threshold workout on Jan 1 -> skipped (has actual TSS)
            {
                workoutType: WorkoutType.INTERVALS,
                scheduledDate: new Date('2024-01-01T00:00:00.000Z'),
                targetDuration: 3600,
                isCompleted: true,
            },
            // Planned race on Jan 3 (1h, IF 1.0 -> 100)
            {
                workoutType: WorkoutType.RACE,
                scheduledDate: new Date('2024-01-03T00:00:00.000Z'),
                targetDuration: 3600,
                isCompleted: false,
            },
        ];
        const map = calculatePlanPlannedTss(workouts);
        expect(map.get('2024-01-01')).toBeCloseTo(56.3, 1);
        expect(map.get('2024-01-03')).toBe(100);
        expect(map.has('2024-01-02')).toBe(false);
    });

    it('sums multiple planned workouts on the same day', () => {
        const workouts = [
            {
                workoutType: WorkoutType.EASY,
                scheduledDate: baseDate,
                targetDuration: 3600, // 56.3
                isCompleted: false,
            },
            {
                workoutType: WorkoutType.RACE,
                scheduledDate: baseDate,
                targetDuration: 3600, // 100
                isCompleted: false,
            },
        ];
        const map = calculatePlanPlannedTss(workouts);
        // 56.25 + 100 = 156.25 -> 156.3
        expect(map.get('2024-01-01')).toBeCloseTo(156.3, 1);
    });

    it('ignores workouts without a scheduledDate or valid duration', () => {
        const workouts = [
            { workoutType: WorkoutType.EASY, targetDuration: 3600, isCompleted: false } as never,
            {
                workoutType: WorkoutType.EASY,
                scheduledDate: baseDate,
                targetDuration: null,
                isCompleted: false,
            },
        ];
        const map = calculatePlanPlannedTss(workouts);
        expect(map.size).toBe(0);
    });
});
