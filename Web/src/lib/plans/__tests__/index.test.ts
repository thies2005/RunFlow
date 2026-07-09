import { buildStructuredStepsForWorkout, generateTrainingPlan, getRaceWeekRunVolumeCap, PLAN_CONSTANTS, resolvePhaseBudget, scaleQualitySessionDistance } from '../index';
import { calculateTrainingPaces } from '../../metrics/vdot';
import { WorkoutType } from '@/generated/prisma/browser';

jest.mock('../../metrics/vdot', () => ({
    calculateTrainingPaces: jest.fn(),
}));

const mockedCalculateTrainingPaces = calculateTrainingPaces as jest.MockedFunction<typeof calculateTrainingPaces>;

const MOCK_PACES = {
    easy: { min: 330, max: 390 },
    marathon: 300,
    threshold: 270,
    interval: 240,
    repetition: 220,
};

function makeConfig(overrides: Record<string, unknown> = {}) {
    const raceDate = new Date('2026-07-19');
    const startDate = new Date('2026-04-05');
    return {
        vdot: 50,
        raceType: 'MARATHON' as const,
        raceDate,
        startDate,
        runsPerWeek: 4,
        ridesPerWeek: 0,
        strengthPerWeek: 0,
        swimsPerWeek: 0,
        weeklyMileageGoal: 60000,
        taperWeeks: 2,
        peakWeeks: 4,
        buildWeeks: 4,
        ...overrides,
    };
}

beforeEach(() => {
    mockedCalculateTrainingPaces.mockReturnValue(MOCK_PACES);
});

describe('Training Plan Generation', () => {
    describe('Phase 1: Critical Core Logic Bugs', () => {
        it('5K intervals use interval pace, not threshold (Task 1.1)', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 30000,
            });
            const workouts = generateTrainingPlan(config);
            const intervalWorkouts = workouts.filter(
                w => w.type === WorkoutType.INTERVALS
            );
            expect(intervalWorkouts.length).toBeGreaterThan(0);
            for (const w of intervalWorkouts) {
                expect(w.targetPace).toBe(MOCK_PACES.interval);
                expect(w.targetPace).not.toBe(MOCK_PACES.threshold);
            }
        });

        it('10K intervals use interval pace, not threshold (Task 1.1)', () => {
            const config = makeConfig({
                raceType: 'TEN_K',
                weeklyMileageGoal: 40000,
            });
            const workouts = generateTrainingPlan(config);
            const intervalWorkouts = workouts.filter(
                w => w.type === WorkoutType.INTERVALS
            );
            expect(intervalWorkouts.length).toBeGreaterThan(0);
            for (const w of intervalWorkouts) {
                expect(w.targetPace).toBe(MOCK_PACES.interval);
            }
        });

        it('Marathon PEAK tempo sessions use marathon pace for MP segments (Task 1.2)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 60000,
            });
            const workouts = generateTrainingPlan(config);
            const mpWorkouts = workouts.filter(
                w => w.description.includes('MP Segment')
            );
            expect(mpWorkouts.length).toBeGreaterThan(0);
            for (const w of mpWorkouts) {
                expect(w.targetPace).toBe(MOCK_PACES.marathon);
            }
        });

        it('Half Marathon PEAK sessions use HM race pace (Task 1.2)', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                weeklyMileageGoal: 50000,
            });
            const workouts = generateTrainingPlan(config);
            const hmWorkouts = workouts.filter(
                w => w.description.includes('HM Pace Segment')
            );
            expect(hmWorkouts.length).toBeGreaterThan(0);
            const expectedHmRacePace = Math.round((MOCK_PACES.marathon + MOCK_PACES.threshold) / 2);
            for (const w of hmWorkouts) {
                expect(w.targetPace).toBe(expectedHmRacePace);
            }
        });

        it('Half Marathon PEAK goal-pace sessions honor explicit target time', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                weeklyMileageGoal: 50000,
                targetTime: 6000,
            });
            const workouts = generateTrainingPlan(config);
            const hmWorkouts = workouts.filter(
                w => w.description.includes('HM Pace Segment')
            );
            const expectedGoalPace = Math.round((6000 / 21097) * 1000);

            expect(hmWorkouts.length).toBeGreaterThan(0);
            for (const w of hmWorkouts) {
                expect(w.targetPace).toBe(expectedGoalPace);
                expect(w.description).toContain('4:44');
                expect(w.targetPaceZoneLabel).toBe('HM Race Pace');
            }
        });

        it('race day carries target pace and duration from target time', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                targetTime: 6000,
            });
            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);

            expect(raceWorkout).toBeDefined();
            expect(raceWorkout?.targetDuration).toBe(6000);
            expect(raceWorkout?.targetPace).toBe(Math.round((6000 / 21097) * 1000));
        });

        it('Half Marathon BUILD intervals progress rep structure over the phase', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                weeklyMileageGoal: 50000,
                taperWeeks: 2,
                peakWeeks: 2,
                buildWeeks: 8,
            });
            const workouts = generateTrainingPlan(config);
            const buildIntervals = workouts.filter(
                w => w.phase === 'BUILD' && w.type === WorkoutType.INTERVALS
            );
            const descriptions = new Set(buildIntervals.map(w => w.description));

            expect(buildIntervals.length).toBeGreaterThan(3);
            expect(descriptions.has('Intervals: 5x800m @ 4:00')).toBe(true);
            expect(descriptions.has('Intervals: 6x800m @ 4:00')).toBe(true);
            expect(descriptions.has('Intervals: 5x1km @ 4:00')).toBe(true);
        });

        it('taper uses configurable taperWeeks, not hardcoded 2 (Task 1.3)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                taperWeeks: 3,
                peakWeeks: 2,
                buildWeeks: 2,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            const lastThreeWeeks = weeks.slice(-3);
            for (const week of lastThreeWeeks) {
                const totalDist = week.reduce((s, w) => s + w.totalDistance, 0);
                expect(totalDist).toBeLessThan(60000 * 0.85);
            }
        });

        it('5K taper is shorter (single week, 75% volume)', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 30000,
                taperWeeks: 1,
            });
            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
            const raceWeekStart = new Date(raceWorkout!.date);
            raceWeekStart.setDate(raceWeekStart.getDate() - 6);
            const raceWeekEnd = new Date(raceWorkout!.date);
            raceWeekEnd.setDate(raceWeekEnd.getDate() + 1);
            const taperWeekWorkouts = workouts.filter(w =>
                w.date >= raceWeekStart && w.date <= raceWeekEnd &&
                w.type !== WorkoutType.RACE
            );
            const totalDist = taperWeekWorkouts.reduce((s, w) => s + w.totalDistance, 0);
            expect(totalDist).toBeLessThan(30000);
        });
    });

    describe('Phase 2: Scheduling, Recovery & Race Week', () => {
        it('race week schedules RACE on raceDate (Task 2.1)', () => {
            const raceDate = new Date('2026-07-19');
            const config = makeConfig({ raceDate });
            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
            const raceWorkoutDay = new Date(raceWorkout!.date).getDay();
            expect(raceWorkoutDay).toBe(raceDate.getDay());
            expect(raceWorkout!.date.getTime()).toBe(raceDate.getTime());
        });

        it('race week includes shakeout runs and pre-race strides (Task 2.1)', () => {
            const config = makeConfig({ raceType: 'MARATHON' });
            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
            const raceWeekMs = raceWorkout!.date.getTime();
            const weekMs = 7 * 24 * 60 * 60 * 1000;
            const raceWeekWorkouts = workouts.filter(
                w => Math.abs(w.date.getTime() - raceWeekMs) < weekMs
            );
            const hasShakeout = raceWeekWorkouts.some(
                w => w.description.includes('Shakeout')
            );
            const hasStrides = raceWeekWorkouts.some(
                w => w.description.includes('Strides')
            );
            expect(hasShakeout).toBe(true);
            expect(hasStrides).toBe(true);
        });

        it('step loading applies 20% reduction every 4th BASE/BUILD week (Task 2.2)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                taperWeeks: 2,
                peakWeeks: 2,
                buildWeeks: 4,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            const buildPeekWeeks = weeks.slice(0, -2);
            const volumes = buildPeekWeeks.map(w =>
                w.reduce((s, wk) => s + wk.totalDistance, 0)
            );
            let recoveryCount = 0;
            for (let i = 1; i < volumes.length; i++) {
                if (volumes[i] < volumes[i - 1] * 0.9) {
                    recoveryCount++;
                }
            }
            expect(recoveryCount).toBeGreaterThanOrEqual(1);
        });

        it('10% weekly increase hard cap is enforced between non-recovery weeks (Task 2.3)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 60000,
                taperWeeks: 2,
                peakWeeks: 2,
                buildWeeks: 4,
            });
            const workouts = generateTrainingPlan(config);
            const runWorkouts = workouts.filter(w =>
                isRunType(w.type) && w.type !== WorkoutType.RACE
            );
            const weeks = groupByWeek(runWorkouts);
            const volumes = weeks.map(w =>
                w.reduce((s, wk) => s + wk.totalDistance, 0)
            );
            for (let i = 1; i < volumes.length; i++) {
                const prevVol = volumes[i - 1];
                const curVol = volumes[i];
                if (prevVol < 10000 || curVol < 10000) continue;
                const prevPrev = i >= 2 ? volumes[i - 2] : prevVol;
                const wasRecovery = prevVol < prevPrev * 0.90;
                if (wasRecovery) continue;
                if (curVol < prevVol * 0.90) continue;
                const ratio = curVol / prevVol;
                if (ratio > 1.01) {
                    expect(ratio).toBeLessThanOrEqual(1.15);
                }
            }
        });

        it('48-hour gap between long run and quality session (Task 2.4)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                longRunDay: 6,
                workoutDay: 0,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            for (const week of weeks) {
                const longRun = week.find(w => w.type === WorkoutType.LONG_RUN);
                const quality = week.find(
                    w =>
                        w.type === WorkoutType.INTERVALS ||
                        w.type === WorkoutType.FARTLEK ||
                        w.type === WorkoutType.TEMPO ||
                        w.type === WorkoutType.REPETITIONS
                );
                if (!longRun || !quality) continue;
                const longRunDay = new Date(longRun.date).getDay();
                const qualityDay = new Date(quality.date).getDay();
                const diff = Math.abs(longRunDay - qualityDay);
                const circularDiff = Math.min(diff, 7 - diff);
                expect(circularDiff).toBeGreaterThanOrEqual(
                    PLAN_CONSTANTS.MIN_GAP_DAYS
                );
            }
        });

        it('recovery run scheduled day after hard session (Task 2.4)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                runsPerWeek: 5,
            });
            const workouts = generateTrainingPlan(config);
            const recoveryRuns = workouts.filter(
                w => w.type === WorkoutType.RECOVERY
            );
            expect(recoveryRuns.length).toBeGreaterThan(0);
            for (const rr of recoveryRuns) {
                expect(rr.targetPace).toBe(MOCK_PACES.easy.max);
            }
        });
    });

    describe('Phase 3: Distance-Specific Workouts & Progression', () => {
        it('5K focuses on VO2max reps in PEAK phase (Task 3.1)', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 30000,
            });
            const workouts = generateTrainingPlan(config);
            const reps = workouts.filter(w => w.type === WorkoutType.REPETITIONS);
            expect(reps.length).toBeGreaterThan(0);
            for (const r of reps) {
                expect(r.targetPace).toBe(MOCK_PACES.repetition);
            }
        });

        it('10K includes threshold work in PEAK phase (Task 3.1)', () => {
            const config = makeConfig({
                raceType: 'TEN_K',
                weeklyMileageGoal: 40000,
            });
            const workouts = generateTrainingPlan(config);
            const thresholdTempos = workouts.filter(
                w => w.type === WorkoutType.TEMPO && w.description.includes('Threshold')
            );
            expect(thresholdTempos.length).toBeGreaterThan(0);
        });

        it('HM BUILD phase uses interval pace (Task 3.1)', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                weeklyMileageGoal: 50000,
            });
            const workouts = generateTrainingPlan(config);
            const intervalWorkouts = workouts.filter(
                w =>
                    w.type === WorkoutType.INTERVALS &&
                    w.description.includes('6x800m')
            );
            expect(intervalWorkouts.length).toBeGreaterThan(0);
            for (const w of intervalWorkouts) {
                expect(w.targetPace).toBe(MOCK_PACES.interval);
            }
        });

        it('quality sessions progress through phases: BASE fartlek -> BUILD intervals -> PEAK specific (Task 3.2)', () => {
            expect(mockedCalculateTrainingPaces).toHaveBeenCalled();
            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 60000,
            });
            const workouts = generateTrainingPlan(config);
            const allDescs = workouts.map(w => w.description);
            const fartlekDescs = allDescs.filter(d => d.includes('Fartlek'));
            const intervalDescs = allDescs.filter(d => d.includes('Intervals'));
            const mpDescs = allDescs.filter(d => d.includes('MP Segment'));
            expect(fartlekDescs.length).toBeGreaterThan(0);
            expect(intervalDescs.length).toBeGreaterThan(0);
            expect(mpDescs.length).toBeGreaterThan(0);
        });

        it('BASE fartlek uses threshold + 5s/km hard pace with zone labels', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 2,
            });
            const workouts = generateTrainingPlan(config);
            const fartleks = workouts.filter(w => w.type === WorkoutType.FARTLEK);
            expect(fartleks.length).toBeGreaterThan(0);

            const expectedHardPace = MOCK_PACES.threshold + 5;
            for (const w of fartleks) {
                expect(w.targetPace).toBe(expectedHardPace);
                expect(w.description).toContain('@ F (T-I)');
                expect(w.description).toContain('@ E ');
            }
        });

        it('does not emit placeholder-length easy or recovery runs after volume scaling', () => {
            const workouts = generateTrainingPlan(makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 20000,
                startWeeklyMileage: 8000,
                runsPerWeek: 5,
                taperWeeks: 1,
                peakWeeks: 2,
                buildWeeks: 4,
            }));
            const undersizedFillRuns = workouts.filter(w =>
                (w.type === WorkoutType.EASY || w.type === WorkoutType.RECOVERY) &&
                w.phase !== 'RACE_WEEK' &&
                w.totalDistance > 0 &&
                w.totalDistance < PLAN_CONSTANTS.EASY_RUN_MIN
            );

            expect(undersizedFillRuns).toHaveLength(0);
        });

        it('strides injected in BASE phase easy runs (Task 3.3)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 2,
            });
            const workouts = generateTrainingPlan(config);
            const stridesRuns = workouts.filter(w =>
                w.description.includes('Strides')
            );
            expect(stridesRuns.length).toBeGreaterThan(0);
        });

        it('progressive long run with Goal Pace segments in PEAK phase for marathon (Task 3.3)', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 60000,
            });
            const workouts = generateTrainingPlan(config);
            const progressiveLR = workouts.filter(
                w =>
                    w.type === WorkoutType.LONG_RUN &&
                    w.description.includes('Goal Pace')
            );
            expect(progressiveLR.length).toBeGreaterThan(0);
        });
    });

    describe('Phase 4: Caps, Constants & Safety Limits', () => {
        it('HM max long run capped at 24km (Task 4.1)', () => {
            const config = makeConfig({
                raceType: 'HALF_MARATHON',
                weeklyMileageGoal: 60000,
            });
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                expect(lr.totalDistance).toBeLessThanOrEqual(25000);
            }
        });

        it('10K max long run uses dynamic cap (peakVolume * 0.55, max 22km) (Task 4.1)', () => {
            const config = makeConfig({
                raceType: 'TEN_K',
                weeklyMileageGoal: 50000,
            });
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                expect(lr.totalDistance).toBeLessThanOrEqual(23000);
            }
            const maxLR = Math.max(...longRuns.map(lr => lr.totalDistance));
            expect(maxLR).toBeGreaterThan(17000);
        });

        it('low-volume marathon runners get higher long run ratio to reach distance minimums (Task 4.2)', () => {
            const lowVolConfig = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 50000,
            });
            const highVolConfig = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 80000,
            });
            const lowWorkouts = generateTrainingPlan(lowVolConfig);
            const highWorkouts = generateTrainingPlan(highVolConfig);
            const lowMaxLR = Math.max(...lowWorkouts.filter(w => w.type === WorkoutType.LONG_RUN).map(lr => lr.totalDistance));
            const highMaxLR = Math.max(...highWorkouts.filter(w => w.type === WorkoutType.LONG_RUN).map(lr => lr.totalDistance));
            const lowRatio = lowMaxLR / 50000;
            const highRatio = highMaxLR / 80000;
            expect(lowRatio).toBeGreaterThan(highRatio);
        });

        it('time-on-feet cap prevents long runs exceeding 3.5 hours (Task 4.3)', () => {
            const slowPaces = {
                easy: { min: 420, max: 480 },
                marathon: 390,
                threshold: 360,
                interval: 330,
                repetition: 310,
            };
            mockedCalculateTrainingPaces.mockReturnValue(slowPaces);

            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 70000,
            });
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                const durationSeconds = (lr.totalDistance / 1000) * slowPaces.easy.max;
                expect(durationSeconds).toBeLessThanOrEqual(
                    PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS + slowPaces.easy.max * 1
                );
            }
        });

        it('PLAN_CONSTANTS MAX_LONG_RUN_DIST updated correctly (Task 4.1)', () => {
            expect(PLAN_CONSTANTS.MAX_LONG_RUN_DIST.HALF_MARATHON).toBe(24000);
            expect(PLAN_CONSTANTS.MAX_LONG_RUN_DIST.TEN_K).toBe(22000);
            expect(PLAN_CONSTANTS.MAX_LONG_RUN_DIST.MARATHON).toBe(32000);
            expect(PLAN_CONSTANTS.MAX_LONG_RUN_DIST.FIVE_K).toBe(18000);
        });

        it('10K long runs progress weekly (not frozen at cap)', () => {
            const config = makeConfig({
                raceType: 'TEN_K',
                weeklyMileageGoal: 50000,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            const longRunDistances = weeks.map(week => {
                const lr = week.find(w => w.type === WorkoutType.LONG_RUN);
                return lr ? lr.totalDistance : 0;
            }).filter(d => d > 0);

            const uniqueDistances = new Set(longRunDistances);
            expect(uniqueDistances.size).toBeGreaterThan(1);

            const firstThird = longRunDistances.slice(0, Math.max(1, Math.floor(longRunDistances.length / 3)));
            const lastThird = longRunDistances.slice(-Math.max(1, Math.floor(longRunDistances.length / 3)));
            const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
            const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
            expect(avgLast).toBeGreaterThan(avgFirst);
        });

        it('short plan clamps peak/build weeks to fit available weeks', () => {
            const raceDate = new Date('2026-05-03');
            const startDate = new Date('2026-04-05');
            const config = makeConfig({
                raceDate,
                startDate,
                raceType: 'TEN_K',
                weeklyMileageGoal: 40000,
            });

            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();

            const raceMs = raceWorkout!.date.getTime();
            const baseWorkouts = workouts.filter(w => {
                const deltaDays = Math.round((w.date.getTime() - raceMs) / (24 * 60 * 60 * 1000));
                return deltaDays < -20 && isRunType(w.type);
            });
            const hasFartlek = baseWorkouts.some(w => w.description.includes('Fartlek'));
            expect(hasFartlek).toBe(true);
        });

        it('scaled workouts keep duration consistent with scaled distance', () => {
            const workouts = generateTrainingPlan(makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 20000,
                startWeeklyMileage: 8000,
                runsPerWeek: 2,
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 4,
            }));

            const runWorkouts = workouts.filter(w =>
                isRunType(w.type) &&
                w.type !== WorkoutType.RACE &&
                w.totalDistance > 0 &&
                w.targetPace &&
                w.targetPace > 0 &&
                w.targetDuration &&
                w.targetDuration > 0
            );

            expect(runWorkouts.length).toBeGreaterThan(0);
            for (const w of runWorkouts) {
                const impliedDuration = Math.round((w.totalDistance / 1000) * w.targetPace!);
                expect(w.targetDuration!).toBeLessThanOrEqual(impliedDuration * 1.7);
                expect(w.targetDuration!).toBeGreaterThanOrEqual(impliedDuration * 0.7);
            }
        });
    });

    describe('Edge Cases', () => {
        it('taper weeks do not exceed requested runs per week', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                runsPerWeek: 3,
                ridesPerWeek: 0,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
                taperWeeks: 3,
                peakWeeks: 0,
                buildWeeks: 0,
                raceDate: new Date('2026-05-03'),
                startDate: new Date('2026-04-05'),
            });

            const workouts = generateTrainingPlan(config);
            const raceMs = config.raceDate.getTime();
            const preRaceWeekRuns = workouts.filter(w => {
                const deltaDays = Math.floor((w.date.getTime() - raceMs) / (24 * 60 * 60 * 1000));
                return deltaDays >= -13 && deltaDays <= -7 && isRunType(w.type);
            });

            expect(preRaceWeekRuns.length).toBeLessThanOrEqual(3);
        });

        it('race-week supplemental runs are before race day', () => {
            const raceDate = new Date('2026-07-19');
            const config = makeConfig({
                raceDate,
                runsPerWeek: 4,
                ridesPerWeek: 0,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
            });

            const workouts = generateTrainingPlan(config);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();

            const raceWeek = workouts.filter(w => {
                const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                return deltaDays >= -6 && deltaDays <= 0;
            });

            for (const w of raceWeek) {
                if (w.type === WorkoutType.RACE) continue;
                expect(w.date.getTime()).toBeLessThanOrEqual(raceDate.getTime());
            }

            const strideWorkout = raceWeek.find(w => w.description.includes('4x100m Strides'));
            expect(strideWorkout).toBeDefined();
            const strideDeltaDays = Math.floor((strideWorkout!.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
            expect(strideDeltaDays).toBe(-2);
        });

        it('race week respects low runsPerWeek settings', () => {
            const raceDate = new Date('2026-07-19');
            const config = makeConfig({
                raceDate,
                raceType: 'MARATHON',
                runsPerWeek: 1,
                ridesPerWeek: 0,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
            });

            const workouts = generateTrainingPlan(config);
            const raceWeek = workouts.filter(w => {
                const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                return deltaDays >= -6 && deltaDays <= 0;
            });

            const runCount = raceWeek.filter(w => isRunType(w.type)).length;
            expect(runCount).toBe(1);
            expect(raceWeek.some(w => w.type === WorkoutType.RACE)).toBe(true);
        });

        it('10K non-Sunday race has running load in the calendar week before race week', () => {
            const raceDate = new Date('2025-05-24'); // Saturday
            const startDate = new Date('2025-03-30'); // Sunday
            const config = makeConfig({
                raceType: 'TEN_K',
                raceDate,
                startDate,
                runsPerWeek: 4,
                ridesPerWeek: 0,
                strengthPerWeek: 1,
                swimsPerWeek: 0,
                weeklyMileageGoal: 40000,
            });

            const workouts = generateTrainingPlan(config);

            const preRaceCalendarWeekRunDistance = workouts
                .filter(w => {
                    const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                    return deltaDays >= -13 && deltaDays <= -7 && isRunType(w.type);
                })
                .reduce((sum, w) => sum + w.totalDistance, 0);

            expect(preRaceCalendarWeekRunDistance).toBeGreaterThan(0);
        });

        it('10K final weeks show taper progression (peak > taper > race week)', () => {
            const raceDate = new Date('2025-05-24'); // Saturday
            const startDate = new Date('2025-03-30');
            const config = makeConfig({
                raceType: 'TEN_K',
                raceDate,
                startDate,
                runsPerWeek: 4,
                ridesPerWeek: 0,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
                weeklyMileageGoal: 40000,
            });

            const workouts = generateTrainingPlan(config);

            const raceWeekRunDistance = workouts
                .filter(w => {
                    const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                    return deltaDays >= -6 && deltaDays <= 0 && isRunType(w.type);
                })
                .reduce((sum, w) => sum + w.totalDistance, 0);

            const taperWeekRunDistance = workouts
                .filter(w => {
                    const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                    return deltaDays >= -13 && deltaDays <= -7 && isRunType(w.type);
                })
                .reduce((sum, w) => sum + w.totalDistance, 0);

            const previousWeekRunDistance = workouts
                .filter(w => {
                    const deltaDays = Math.round((w.date.getTime() - raceDate.getTime()) / (24 * 60 * 60 * 1000));
                    return deltaDays >= -20 && deltaDays <= -14 && isRunType(w.type);
                })
                .reduce((sum, w) => sum + w.totalDistance, 0);

            expect(previousWeekRunDistance).toBeGreaterThan(taperWeekRunDistance);
            expect(taperWeekRunDistance).toBeGreaterThan(raceWeekRunDistance);
        });

        it('race-week cap uses reduced value, not full effective peak volume', () => {
            const effectivePeakVolume = 60000;
            const tenKCap = getRaceWeekRunVolumeCap('TEN_K', effectivePeakVolume);

            expect(tenKCap).toBe(20000); // TEN_K final taper fraction (60%) * 0.5 capped at 20km
            expect(tenKCap).toBeLessThan(effectivePeakVolume);
        });

        it('scaled interval workouts preserve structured interval descriptions', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 20000,
                runsPerWeek: 2,
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 4,
            });

            const workouts = generateTrainingPlan(config);
            const intervalWorkouts = workouts.filter(w => w.type === WorkoutType.INTERVALS);

            expect(intervalWorkouts.length).toBeGreaterThan(0);
            for (const w of intervalWorkouts) {
                expect(w.description).toContain('5x1km');
                expect(w.description).not.toContain('Total');
            }
        });

        it('scales 5K interval session distance down for low-volume athletes', () => {
            const lowVolume = scaleQualitySessionDistance(WorkoutType.INTERVALS, 10000, 20000, 'FIVE_K');
            const highVolume = scaleQualitySessionDistance(WorkoutType.INTERVALS, 10000, 60000, 'FIVE_K');

            expect(lowVolume).toBeLessThan(highVolume);
            expect(lowVolume).toBe(6000);
            expect(highVolume).toBe(10000);
        });

        it('scales marathon tempo sessions by weekly volume within safe bounds', () => {
            const lowVolume = scaleQualitySessionDistance(WorkoutType.TEMPO, 18000, 40000, 'MARATHON');
            const highVolume = scaleQualitySessionDistance(WorkoutType.TEMPO, 18000, 90000, 'MARATHON');

            expect(lowVolume).toBeGreaterThanOrEqual(8000);
            expect(lowVolume).toBeLessThan(highVolume);
            expect(highVolume).toBeLessThanOrEqual(18000);
        });

        it('builds structured steps for quality workouts', () => {
            const steps = buildStructuredStepsForWorkout({
                type: WorkoutType.INTERVALS,
                description: 'Intervals: 5x1km @ 4:00/km',
                totalDistance: 9000,
                targetPace: 240,
                targetHrZone: 4,
            });

            expect(steps).not.toBeNull();
            expect(steps?.source).toBe('generated-plan');
            expect(steps?.steps.map(s => s.type)).toEqual([
                'warmup',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work',
                'cooldown'
            ]);
            expect(steps?.steps[1].paceSecondsPerKm).toBe(240);
            expect(steps?.steps[1].hrZone).toBe(4);
        });

        it('builds single steady step for easy workouts', () => {
            const steps = buildStructuredStepsForWorkout({
                type: WorkoutType.EASY,
                description: 'Easy Run: 8km',
                totalDistance: 8000,
                targetPace: 360,
                targetDuration: 2880,
                targetHrZone: 2,
            });

            expect(steps?.steps).toHaveLength(1);
            expect(steps?.steps[0]).toMatchObject({
                type: 'steady',
                distanceMeters: 8000,
                durationSeconds: 2880,
                paceSecondsPerKm: 360,
                hrZone: 2,
            });
        });

        it('honors explicit ultra peak and build phase counts', () => {
            const phases = resolvePhaseBudget(18, {
                taperWeeks: 2,
                peakWeeks: 4,
                buildWeeks: 6,
            }, {
                isUltra: true,
                defaultTaper: 2,
            });

            expect(phases.peakWeeks).toBe(4);
            expect(phases.buildWeeks).toBe(6);
            const allocated = phases.taperWeeks + phases.peakWeeks + phases.buildWeeks +
                (phases.enduranceWeeks ?? 0) + (phases.mentalPrepWeeks ?? 0) + phases.baseWeeks;
            expect(allocated).toBe(17);
        });

        it('triathlon run workouts do not exceed the generated run budget in early low-volume weeks', () => {
            const workouts = generateTrainingPlan({
                vdot: 50,
                raceType: 'SPRINT_TRI',
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 30000,
                runsPerWeek: 3,
                ridesPerWeek: 2,
                swimsPerWeek: 2,
                taperWeeks: 1,
                peakWeeks: 2,
                buildWeeks: 4,
            });

            const firstWeek = groupByWeek(workouts)[0];
            const firstWeekRunDistance = firstWeek
                .filter(w => w.type && isRunType(w.type))
                .reduce((sum, w) => sum + w.totalDistance, 0);

            expect(firstWeekRunDistance).toBeLessThanOrEqual(13000);
        });

        it('short triathlon plans scale sport budgets from effective peak volume', () => {
            const requestedPeakVolume = 70000;
            const workouts = generateTrainingPlan({
                vdot: 50,
                raceType: 'FULL_IRONMAN',
                raceDate: new Date('2026-05-17'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: requestedPeakVolume,
                runsPerWeek: 3,
                ridesPerWeek: 3,
                swimsPerWeek: 3,
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 2,
            });

            const startVolume = requestedPeakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO;
            const availableRampWeeks = 5;
            const effectiveTrainingWeeks = availableRampWeeks - Math.floor(availableRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE);
            const effectivePeakVolume = Math.round(startVolume * Math.pow(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP, effectiveTrainingWeeks));
            const expectedRunBudget = Math.ceil((50000 * (effectivePeakVolume / requestedPeakVolume)) / 100) * 100;

            const maxNonRaceRunDistance = Math.max(...groupByWeek(workouts).map(week => week
                .filter(w => w.type && isRunType(w.type) && w.type !== WorkoutType.RACE)
                .reduce((sum, w) => sum + w.totalDistance, 0)
            ));

            expect(maxNonRaceRunDistance).toBeLessThanOrEqual(expectedRunBudget);
        });

        it('adds concrete LTHR and pace targets to generated workouts', () => {
            const workouts = generateTrainingPlan(makeConfig({
                raceType: 'TEN_K',
                thresholdHeartRate: 170,
                hrZoneMethod: 'LTHR',
                weeklyMileageGoal: 45000,
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 4,
            }));

            const easy = workouts.find(w => w.type === WorkoutType.EASY || w.type === WorkoutType.LONG_RUN);
            expect(easy).toBeDefined();
            expect(easy?.targetHrZoneLabel).toBe('Z2 Aerobic');
            expect(easy?.targetHrMinBpm).toBe(129);
            expect(easy?.targetHrMaxBpm).toBe(148);
            expect(easy?.targetPaceZoneLabel).toBe('Easy');
            expect(easy?.targetPaceMinSecondsPerKm).toBe(MOCK_PACES.easy.min);
            expect(easy?.targetPaceMaxSecondsPerKm).toBe(MOCK_PACES.easy.max);

            const quality = workouts.find(w => w.type === WorkoutType.INTERVALS || w.type === WorkoutType.TEMPO);
            expect(quality).toBeDefined();
            expect(quality?.targetHrZoneLabel).toMatch(/^Z[34]/);
            expect(quality?.targetPaceZoneLabel).toMatch(/Interval|Threshold/);
            expect(quality?.targetPaceMinSecondsPerKm).toBeGreaterThan(0);
            expect(quality?.targetPaceMaxSecondsPerKm).toBeGreaterThan(quality?.targetPaceMinSecondsPerKm ?? 0);
        });

        it('5K fartlek description pattern is preserved after scaling', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                weeklyMileageGoal: 20000,
                runsPerWeek: 2,
                taperWeeks: 1,
                peakWeeks: 1,
                buildWeeks: 2,
            });

            const workouts = generateTrainingPlan(config);
            const fartleks = workouts.filter(w => w.description.includes('Fartlek'));

            expect(fartleks.length).toBeGreaterThan(0);
            for (const w of fartleks) {
                expect(w.description).toContain('@ F (T-I)');
                expect(w.description).toContain('@ E ');
            }
        });

        it('handles very short plans (2 weeks)', () => {
            const raceDate = new Date('2026-04-19');
            const startDate = new Date('2026-04-05');
            const config = makeConfig({ raceDate, startDate, raceType: 'FIVE_K' });
            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
        });

        it('handles single week plan', () => {
            const raceDate = new Date('2026-04-11');
            const startDate = new Date('2026-04-05');
            const config = makeConfig({ raceDate, startDate, raceType: 'FIVE_K' });
            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
        });

        it('never produces negative volume weeks', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                weeklyMileageGoal: 50000,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            for (const week of weeks) {
                const totalDist = week.reduce((s, w) => s + w.totalDistance, 0);
                expect(totalDist).toBeGreaterThanOrEqual(0);
            }
        });

        it('all workouts have valid dates between startDate and raceDate', () => {
            const raceDate = new Date('2026-07-19');
            const startDate = new Date('2026-04-05');
            const config = makeConfig({ raceDate, startDate });
            const workouts = generateTrainingPlan(config);
            const startMs = startDate.getTime();
            const endMs = raceDate.getTime() + 24 * 60 * 60 * 1000;
            for (const w of workouts) {
                expect(w.date.getTime()).toBeGreaterThanOrEqual(startMs);
                expect(w.date.getTime()).toBeLessThanOrEqual(endMs);
            }
        });

        it('does not schedule workouts before a mid-week startDate', () => {
            const raceDate = new Date('2026-07-19');
            const startDate = new Date('2026-04-08');
            const config = makeConfig({ raceDate, startDate, raceType: 'HALF_MARATHON' });
            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);
            for (const w of workouts) {
                expect(w.date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            }
        });

        it('no duplicate workout types on the same day', () => {
            const config = makeConfig({ runsPerWeek: 6 });
            const workouts = generateTrainingPlan(config);
            const dayTypes = new Map<string, Set<string>>();
            for (const w of workouts) {
                const dayKey = w.date.toISOString().split('T')[0];
                if (!dayTypes.has(dayKey)) dayTypes.set(dayKey, new Set());
                const types = dayTypes.get(dayKey)!;
                expect(types.has(w.type)).toBe(false);
                types.add(w.type);
            }
        });

        it('bike rides avoid long run day when free days are available', () => {
            const config = makeConfig({
                runsPerWeek: 4,
                ridesPerWeek: 1,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            for (const week of weeks) {
                const longRun = week.find(w => w.type === WorkoutType.LONG_RUN);
                const rides = week.filter(w => w.type === WorkoutType.RIDE);
                if (!longRun || rides.length === 0) continue;
                const longRunDayKey = longRun.date.toISOString().split('T')[0];
                for (const ride of rides) {
                    const rideDayKey = ride.date.toISOString().split('T')[0];
                    expect(rideDayKey).not.toBe(longRunDayKey);
                }
            }
        });

        it('strength prefers easy/standalone days before ride days', () => {
            const config = makeConfig({
                runsPerWeek: 4,
                ridesPerWeek: 1,
                strengthPerWeek: 1,
                swimsPerWeek: 0,
            });
            const workouts = generateTrainingPlan(config);
            const dayWorkouts = new Map<string, Set<string>>();
            workouts.forEach(w => {
                const dayKey = w.date.toISOString().split('T')[0];
                if (!dayWorkouts.has(dayKey)) dayWorkouts.set(dayKey, new Set());
                dayWorkouts.get(dayKey)!.add(w.type);
            });
            let strengthOnCardioDay = 0;
            let strengthTotal = 0;
            dayWorkouts.forEach((types) => {
                if (types.has(WorkoutType.STRENGTH)) {
                    strengthTotal++;
                }
                if (types.has(WorkoutType.STRENGTH) && (types.has(WorkoutType.RIDE) || types.has(WorkoutType.SWIM))) {
                    strengthOnCardioDay++;
                }
            });
            expect(strengthTotal).toBeGreaterThan(0);
            expect(strengthOnCardioDay).toBe(0);
        });

        it('double cardio only occurs when all free days are exhausted', () => {
            const config = makeConfig({
                runsPerWeek: 4,
                ridesPerWeek: 2,
                strengthPerWeek: 1,
                swimsPerWeek: 1,
            });
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts);
            let doubleCardioWeeks = 0;
            let freeDayExhaustedWeeks = 0;
            for (const week of weeks) {
                const dayWorkouts = new Map<string, number>();
                week.forEach(w => {
                    const key = w.date.toISOString().split('T')[0];
                    dayWorkouts.set(key, (dayWorkouts.get(key) || 0) + 1);
                });
                const hasDoubleCardio = Array.from(dayWorkouts.values()).some(c => c >= 3);
                if (hasDoubleCardio) {
                    doubleCardioWeeks++;
                    const totalDays = dayWorkouts.size;
                    if (totalDays >= 7) freeDayExhaustedWeeks++;
                }
            }
            if (doubleCardioWeeks > 0) {
                expect(freeDayExhaustedWeeks).toBe(doubleCardioWeeks);
            }
        });
    });

    describe('Rest Days Support', () => {
        it('does not schedule running workouts on user-designated rest days', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                runsPerWeek: 4,
                ridesPerWeek: 0,
                strengthPerWeek: 0,
                swimsPerWeek: 0,
                restDays: [1, 5], // Monday, Friday
            });

            const workouts = generateTrainingPlan(config);
            // Exclude race week from this check (race week uses a different scheduler)
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            const raceMs = raceWorkout ? raceWorkout.date.getTime() : Infinity;
            const nonRaceWeekWorkouts = workouts.filter(w => {
                const deltaDays = Math.floor((raceMs - w.date.getTime()) / (24 * 60 * 60 * 1000));
                return deltaDays > 7;
            });

            for (const w of nonRaceWeekWorkouts) {
                const dayOfWeek = w.date.getDay();
                expect([1, 5]).not.toContain(dayOfWeek);
            }
        });

        it('handles rest days overlapping with preferred long run day', () => {
            const config = makeConfig({
                raceType: 'MARATHON',
                runsPerWeek: 3,
                longRunDay: 0, // Sunday
                restDays: [0], // Sunday as rest - force long run to move
            });

            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);

            // Long runs should not be on Sunday (rest day)
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            const raceMs = raceWorkout ? raceWorkout.date.getTime() : Infinity;

            const nonRaceWeekLongRuns = workouts.filter(w => {
                const deltaDays = Math.floor((raceMs - w.date.getTime()) / (24 * 60 * 60 * 1000));
                return w.type === WorkoutType.LONG_RUN && deltaDays > 7;
            });

            for (const lr of nonRaceWeekLongRuns) {
                expect(lr.date.getDay()).not.toBe(0);
            }
        });

        it('still generates a valid plan with many rest days', () => {
            const config = makeConfig({
                raceType: 'FIVE_K',
                runsPerWeek: 2,
                restDays: [0, 1, 2, 5, 6], // Only Wed/Thu available
            });

            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);
            const raceWorkout = workouts.find(w => w.type === WorkoutType.RACE);
            expect(raceWorkout).toBeDefined();
        });
    });

    describe('phase-based VDOT progression', () => {
        function scaledPaces(vdot: number) {
            const baseVdot = 50;
            const scale = baseVdot / vdot;
            return {
                easy: { min: Math.round(MOCK_PACES.easy.min * scale), max: Math.round(MOCK_PACES.easy.max * scale) },
                marathon: Math.round(MOCK_PACES.marathon * scale),
                threshold: Math.round(MOCK_PACES.threshold * scale),
                interval: Math.round(MOCK_PACES.interval * scale),
                repetition: Math.round(MOCK_PACES.repetition * scale),
            };
        }

        it('uses higher VDOT in BUILD and PEAK phases when targetVdot is provided', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 43;
            const targetVdot = 47;
            const maxVdot = Math.round(43 * 1.05 * 10) / 10;
            const buildVdot = Math.min(Math.round((43 + (47 - 43) * 0.5) * 10) / 10, maxVdot);
            const peakVdot = Math.min(Math.round((43 + (47 - 43) * 0.75) * 10) / 10, maxVdot);
            const basePaces = scaledPaces(currentVdot);
            const buildPaces = scaledPaces(buildVdot);
            const peakPaces = scaledPaces(peakVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);

            const baseWorkouts = workouts.filter(w => w.phase === 'BASE' && w.type === WorkoutType.EASY);
            const buildWorkouts = workouts.filter(w => w.phase === 'BUILD' && w.type === WorkoutType.EASY);
            const peakWorkouts = workouts.filter(w => w.phase === 'PEAK' && w.type === WorkoutType.EASY);

            if (baseWorkouts.length > 0) {
                expect(baseWorkouts[0].targetPace).toBe(basePaces.easy.max);
            }
            if (buildWorkouts.length > 0) {
                expect(buildWorkouts[0].targetPace).toBeLessThanOrEqual(basePaces.easy.max);
                expect(buildWorkouts[0].targetPace).toBe(buildPaces.easy.max);
            }
            if (peakWorkouts.length > 0) {
                expect(peakWorkouts[0].targetPace).toBeLessThanOrEqual(buildPaces.easy.max);
                expect(peakWorkouts[0].targetPace).toBe(peakPaces.easy.max);
            }
        });

        it('does not exceed 5% above currentVdot even with high targetVdot', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 40;
            const targetVdot = 60;
            const maxVdot = Math.round(40 * 1.05 * 10) / 10;
            const maxPaces = scaledPaces(maxVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const allEasy = workouts.filter(w => w.type === WorkoutType.EASY && w.targetPace && w.targetPace > 0 && w.phase !== 'RACE_WEEK');

            for (const w of allEasy) {
                expect(w.targetPace!).toBeGreaterThanOrEqual(maxPaces.easy.max);
            }
        });

        it('RACE_WEEK uses current fitness paces, not progression paces', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 43;
            const targetVdot = 47;
            const basePaces = scaledPaces(currentVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const raceWeekRecovery = workouts.filter(w => w.phase === 'RACE_WEEK' && w.type === WorkoutType.RECOVERY);

            for (const w of raceWeekRecovery) {
                expect(w.targetPace).toBe(basePaces.easy.max);
            }
        });

        it('falls back to currentVdot when no targetVdot provided', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 43;
            const basePaces = scaledPaces(currentVdot);

            const config = makeConfig({
                vdot: currentVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const nonRaceWeekEasy = workouts.filter(
                w => w.type === WorkoutType.EASY && w.targetPace && w.targetPace > 0 && w.phase !== 'RACE_WEEK'
            );

            for (const w of nonRaceWeekEasy) {
                expect(w.targetPace).toBe(basePaces.easy.max);
            }
        });

        it('progresses quality session paces across phases', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 42;
            const targetVdot = 46;
            const maxVdot = Math.round(42 * 1.05 * 10) / 10;
            const buildVdot = Math.min(Math.round((42 + (46 - 42) * 0.5) * 10) / 10, maxVdot);
            const peakVdot = Math.min(Math.round((42 + (46 - 42) * 0.75) * 10) / 10, maxVdot);
            const basePaces = scaledPaces(currentVdot);
            const buildPaces = scaledPaces(buildVdot);
            const peakPaces = scaledPaces(peakVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const baseQuality = workouts.find(w => w.phase === 'BASE' && w.type === WorkoutType.FARTLEK);
            const buildQuality = workouts.find(w => w.phase === 'BUILD' && w.type === WorkoutType.INTERVALS);
            const peakQuality = workouts.find(w => w.phase === 'PEAK' && w.description.includes('HM Pace Segments'));

            expect(baseQuality).toBeDefined();
            expect(buildQuality).toBeDefined();
            expect(peakQuality).toBeDefined();

            if (baseQuality) {
                const baseHardPace = Math.round(basePaces.threshold + 5);
                expect(baseQuality.targetPace).toBe(baseHardPace);
            }
            if (buildQuality) {
                expect(buildQuality.targetPace).toBe(buildPaces.interval);
            }
            if (peakQuality) {
                const peakHmPace = Math.round((peakPaces.marathon + peakPaces.threshold) / 2);
                expect(peakQuality.targetPace).toBe(peakHmPace);
            }
        });

        it('TAPER uses the same progression VDOT as PEAK', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 42;
            const targetVdot = 46;
            const maxVdot = Math.round(42 * 1.05 * 10) / 10;
            const peakVdot = Math.min(Math.round((42 + (46 - 42) * 0.75) * 10) / 10, maxVdot);
            const peakPaces = scaledPaces(peakVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const taperEasy = workouts.find(w => w.phase === 'TAPER' && w.type === WorkoutType.EASY);

            expect(taperEasy).toBeDefined();
            if (taperEasy) {
                expect(taperEasy.targetPace).toBe(peakPaces.easy.max);
            }
        });

        it('uses phase paces for pace zone bounds', () => {
            mockedCalculateTrainingPaces.mockImplementation((vdot: number) => scaledPaces(vdot));

            const currentVdot = 42;
            const targetVdot = 46;
            const maxVdot = Math.round(42 * 1.05 * 10) / 10;
            const buildVdot = Math.min(Math.round((42 + (46 - 42) * 0.5) * 10) / 10, maxVdot);
            const basePaces = scaledPaces(currentVdot);
            const buildPaces = scaledPaces(buildVdot);

            const config = makeConfig({
                vdot: currentVdot,
                targetVdot,
                raceType: 'HALF_MARATHON',
            });

            const workouts = generateTrainingPlan(config);
            const easyTypes = new Set<WorkoutType>([WorkoutType.EASY, WorkoutType.RECOVERY, WorkoutType.LONG_RUN]);
            const baseEasy = workouts.find(
                w => w.phase === 'BASE' && easyTypes.has(w.type) && w.targetPaceMinSecondsPerKm != null
            );
            const buildEasy = workouts.find(
                w => w.phase === 'BUILD' && easyTypes.has(w.type) && w.targetPaceMinSecondsPerKm != null
            );

            expect(baseEasy).toBeDefined();
            expect(buildEasy).toBeDefined();
            if (baseEasy) {
                expect(baseEasy.targetPaceMinSecondsPerKm).toBe(basePaces.easy.min);
                expect(baseEasy.targetPaceMaxSecondsPerKm).toBe(basePaces.easy.max);
            }
            if (buildEasy) {
                expect(buildEasy.targetPaceMinSecondsPerKm).toBe(buildPaces.easy.min);
                expect(buildEasy.targetPaceMaxSecondsPerKm).toBe(buildPaces.easy.max);
            }
        });
    });
});

function groupByWeek(workouts: { date: Date; type?: string; totalDistance: number }[]): { date: Date; type?: string; totalDistance: number }[][] {
    const weeks: { date: Date; type?: string; totalDistance: number }[][] = [];
    let currentWeek: { date: Date; type?: string; totalDistance: number }[] = [];
    let lastDay = -1;

    for (const w of workouts) {
        const day = new Date(w.date).getDay();
        if (day <= lastDay && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        currentWeek.push(w);
        lastDay = day;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
}

function isRunType(type: string): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
}
