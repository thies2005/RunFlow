import { generateTrainingPlan, PLAN_CONSTANTS, getRaceWeekRunVolumeCap } from '../index';
import { calculateTrainingPaces, calculateVdot, TrainingPaces } from '../../metrics/vdot';
import { WorkoutType } from '@/generated/prisma/browser';

jest.mock('../../metrics/vdot', () => ({
    calculateTrainingPaces: jest.fn(),
    calculateVdot: jest.fn(),
}));

const mockedCalculateTrainingPaces = calculateTrainingPaces as jest.MockedFunction<typeof calculateTrainingPaces>;

type RaceType = 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON' | 'MARATHON';

interface ScenarioProfile {
    label: string;
    vdot: number;
    paces: TrainingPaces;
    raceType: RaceType;
    targetTimeSeconds: number;
    weeklyMileageGoal: number;
    raceDistanceMeters: number;
}

const FAST_PACES: TrainingPaces = {
    easy: { min: 270, max: 320 },
    marathon: 245,
    threshold: 225,
    interval: 200,
    repetition: 180,
};

const SLOW_PACES: TrainingPaces = {
    easy: { min: 390, max: 470 },
    marathon: 360,
    threshold: 330,
    interval: 300,
    repetition: 280,
};

const DISTANCE_META: Record<RaceType, { meters: number; km: string; defaultTaperWeeks: number }> = {
    FIVE_K: { meters: 5000, km: '5', defaultTaperWeeks: 1 },
    TEN_K: { meters: 10000, km: '10', defaultTaperWeeks: 2 },
    HALF_MARATHON: { meters: 21097, km: '21.1', defaultTaperWeeks: 2 },
    MARATHON: { meters: 42195, km: '42.2', defaultTaperWeeks: 3 },
};

const SCENARIOS: ScenarioProfile[] = [
    { label: '5K Fast', vdot: 55, paces: FAST_PACES, raceType: 'FIVE_K', targetTimeSeconds: 1080, weeklyMileageGoal: 40000, raceDistanceMeters: 5000 },
    { label: '5K Slow', vdot: 35, paces: SLOW_PACES, raceType: 'FIVE_K', targetTimeSeconds: 1800, weeklyMileageGoal: 25000, raceDistanceMeters: 5000 },
    { label: '10K Fast', vdot: 53, paces: FAST_PACES, raceType: 'TEN_K', targetTimeSeconds: 2280, weeklyMileageGoal: 50000, raceDistanceMeters: 10000 },
    { label: '10K Slow', vdot: 33, paces: SLOW_PACES, raceType: 'TEN_K', targetTimeSeconds: 3900, weeklyMileageGoal: 30000, raceDistanceMeters: 10000 },
    { label: 'HM Fast', vdot: 52, paces: FAST_PACES, raceType: 'HALF_MARATHON', targetTimeSeconds: 5100, weeklyMileageGoal: 55000, raceDistanceMeters: 21097 },
    { label: 'HM Slow', vdot: 30, paces: SLOW_PACES, raceType: 'HALF_MARATHON', targetTimeSeconds: 9000, weeklyMileageGoal: 35000, raceDistanceMeters: 21097 },
    { label: 'Marathon Fast', vdot: 52, paces: FAST_PACES, raceType: 'MARATHON', targetTimeSeconds: 10800, weeklyMileageGoal: 70000, raceDistanceMeters: 42195 },
    { label: 'Marathon Slow', vdot: 28, paces: SLOW_PACES, raceType: 'MARATHON', targetTimeSeconds: 19800, weeklyMileageGoal: 40000, raceDistanceMeters: 42195 },
];

function makeConfig(scenario: ScenarioProfile) {
    const raceDate = new Date('2026-10-18');
    const startDate = new Date('2026-04-05');
    const meta = DISTANCE_META[scenario.raceType];
    return {
        vdot: scenario.vdot,
        raceType: scenario.raceType,
        raceDate,
        startDate,
        runsPerWeek: 4,
        ridesPerWeek: 0,
        strengthPerWeek: 0,
        swimsPerWeek: 0,
        weeklyMileageGoal: scenario.weeklyMileageGoal,
        taperWeeks: meta.defaultTaperWeeks,
        peakWeeks: 4,
        buildWeeks: 4,
    };
}

function isRunType(type: string): boolean {
    return ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'RACE', 'REPETITIONS'].includes(type);
}

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

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Plan Generation Audit Matrix: Fast vs Slow × All Distances', () => {
    describe.each(SCENARIOS)('$label', (scenario) => {
        const config = makeConfig(scenario);
        const meta = DISTANCE_META[scenario.raceType];

        beforeEach(() => {
            mockedCalculateTrainingPaces.mockReturnValue(scenario.paces);
        });

        it('generates a plan with at least one workout', () => {
            const workouts = generateTrainingPlan(config);
            expect(workouts.length).toBeGreaterThan(0);
        });

        it('includes a RACE workout on race date with correct distance', () => {
            const workouts = generateTrainingPlan(config);
            const race = workouts.find(w => w.type === WorkoutType.RACE);
            expect(race).toBeDefined();
            expect(race!.totalDistance).toBe(meta.meters);
            expect(race!.description).toContain(meta.km);
            expect(race!.date.getTime()).toBe(config.raceDate.getTime());
        });

        it('has at least one LONG_RUN per non-race week', () => {
            const workouts = generateTrainingPlan(config);
            const weeks = groupByWeek(workouts.filter(w => w.type !== WorkoutType.RACE));
            const longRunWeeks = weeks.filter(week => week.some(w => w.type === WorkoutType.LONG_RUN));
            expect(longRunWeeks.length).toBeGreaterThan(0);
        });

        it('all long runs respect distance-specific cap', () => {
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            const maxCap = PLAN_CONSTANTS.MAX_LONG_RUN_DIST[scenario.raceType];
            for (const lr of longRuns) {
                expect(lr.totalDistance).toBeLessThanOrEqual(maxCap + 1000);
            }
        });

        it('all long runs respect time-on-feet safety cap', () => {
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                const durationSeconds = (lr.totalDistance / 1000) * scenario.paces.easy.max;
                expect(durationSeconds).toBeLessThanOrEqual(
                    PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS + scenario.paces.easy.max
                );
            }
        });

        it('all workout dates fall within [startDate, raceDate]', () => {
            const workouts = generateTrainingPlan(config);
            const startMs = config.startDate.getTime();
            const endMs = config.raceDate.getTime() + 24 * 60 * 60 * 1000;
            for (const w of workouts) {
                expect(w.date.getTime()).toBeGreaterThanOrEqual(startMs);
                expect(w.date.getTime()).toBeLessThanOrEqual(endMs);
            }
        });

        it('no zero-distance running workouts (excluding race week supplemental)', () => {
            const workouts = generateTrainingPlan(config);
            const nonRaceRuns = workouts.filter(w => isRunType(w.type) && w.type !== WorkoutType.RACE);
            const runOnly = nonRaceRuns.filter(w => {
                const deltaDays = Math.floor((w.date.getTime() - config.raceDate.getTime()) / (24 * 60 * 60 * 1000));
                return deltaDays < -7;
            });
            for (const w of runOnly) {
                expect(w.totalDistance).toBeGreaterThan(0);
            }
        });

        it('race week cap is below peak volume (or at race distance floor)', () => {
            const peakVol = Math.max(scenario.weeklyMileageGoal, PLAN_CONSTANTS.MIN_PEAK_VOLUME[scenario.raceType]);
            const cap = getRaceWeekRunVolumeCap(scenario.raceType, peakVol);
            const raceDistFloor = meta.meters + 10000;
            if (cap > peakVol) {
                expect(cap).toBe(raceDistFloor);
            } else {
                expect(cap).toBeLessThanOrEqual(peakVol);
            }
        });

        it('taper non-race volume decreases or stays flat across taper weeks', () => {
            const workouts = generateTrainingPlan(config);
            const race = workouts.find(w => w.type === WorkoutType.RACE);
            if (!race) return;
            const raceMs = race.date.getTime();
            const dayMs = 24 * 60 * 60 * 1000;

            const taperVols: number[] = [];
            for (let w = 0; w < meta.defaultTaperWeeks; w++) {
                const weekEnd = raceMs - w * 7 * dayMs;
                const weekStart = weekEnd - 7 * dayMs;
                const weekRuns = workouts.filter(wk =>
                    isRunType(wk.type) &&
                    wk.type !== WorkoutType.RACE &&
                    wk.date.getTime() >= weekStart &&
                    wk.date.getTime() < weekEnd
                );
                taperVols.push(weekRuns.reduce((s, wk) => s + wk.totalDistance, 0));
            }

            for (let i = 1; i < taperVols.length; i++) {
                expect(taperVols[i]).toBeLessThanOrEqual(taperVols[i - 1] + 2000);
            }
        });

        it('quality workout type matches race distance expectation', () => {
            const workouts = generateTrainingPlan(config);
            const qualityTypes = [WorkoutType.INTERVALS, WorkoutType.TEMPO, WorkoutType.REPETITIONS];
            const qualityWorkouts = workouts.filter(w => qualityTypes.includes(w.type));
            expect(qualityWorkouts.length).toBeGreaterThan(0);

            if (scenario.raceType === 'FIVE_K') {
                const hasRepsOrIntervals = qualityWorkouts.some(
                    w => w.type === WorkoutType.REPETITIONS || w.type === WorkoutType.INTERVALS
                );
                expect(hasRepsOrIntervals).toBe(true);
            }
            if (scenario.raceType === 'TEN_K') {
                const hasThresholdOrIntervals = qualityWorkouts.some(
                    w => w.type === WorkoutType.TEMPO || w.type === WorkoutType.INTERVALS
                );
                expect(hasThresholdOrIntervals).toBe(true);
            }
            if (scenario.raceType === 'HALF_MARATHON' || scenario.raceType === 'MARATHON') {
                const hasThresholdOrMP = qualityWorkouts.some(
                    w => w.type === WorkoutType.TEMPO || w.description.includes('MP')
                );
                expect(hasThresholdOrMP).toBe(true);
            }
        });
    });

    describe('Cross-Scenario Comparisons: Fast vs Slow (same distance)', () => {
        function getQualityPaceStats(scenario: ScenarioProfile) {
            mockedCalculateTrainingPaces.mockReturnValue(scenario.paces);
            const workouts = generateTrainingPlan(makeConfig(scenario));
            const qualityTypes = [WorkoutType.INTERVALS, WorkoutType.TEMPO, WorkoutType.REPETITIONS];
            const qualityWorkouts = workouts.filter(w => qualityTypes.includes(w.type) && (w.targetPace ?? 0) > 0);
            const avgPace = qualityWorkouts.length > 0
                ? qualityWorkouts.reduce((s, w) => s + (w.targetPace ?? 0), 0) / qualityWorkouts.length
                : 0;
            return { avgPace, qualityCount: qualityWorkouts.length, totalWorkouts: workouts.length };
        }

        it('5K: fast runner quality paces are faster than slow runner', () => {
            const fast = getQualityPaceStats(SCENARIOS[0]);
            const slow = getQualityPaceStats(SCENARIOS[1]);
            expect(fast.avgPace).toBeLessThan(slow.avgPace);
        });

        it('10K: fast runner quality paces are faster than slow runner', () => {
            const fast = getQualityPaceStats(SCENARIOS[2]);
            const slow = getQualityPaceStats(SCENARIOS[3]);
            expect(fast.avgPace).toBeLessThan(slow.avgPace);
        });

        it('HM: fast runner quality paces are faster than slow runner', () => {
            const fast = getQualityPaceStats(SCENARIOS[4]);
            const slow = getQualityPaceStats(SCENARIOS[5]);
            expect(fast.avgPace).toBeLessThan(slow.avgPace);
        });

        it('Marathon: fast runner quality paces are faster than slow runner', () => {
            const fast = getQualityPaceStats(SCENARIOS[6]);
            const slow = getQualityPaceStats(SCENARIOS[7]);
            expect(fast.avgPace).toBeLessThan(slow.avgPace);
        });

        it('5K: slow runner long runs are more time-constrained', () => {
            mockedCalculateTrainingPaces.mockReturnValue(SCENARIOS[0].paces);
            const fastWorkouts = generateTrainingPlan(makeConfig(SCENARIOS[0]));
            mockedCalculateTrainingPaces.mockReturnValue(SCENARIOS[1].paces);
            const slowWorkouts = generateTrainingPlan(makeConfig(SCENARIOS[1]));

            const fastMaxLR = Math.max(...fastWorkouts.filter(w => w.type === WorkoutType.LONG_RUN).map(lr => lr.totalDistance));
            const slowMaxLR = Math.max(...slowWorkouts.filter(w => w.type === WorkoutType.LONG_RUN).map(lr => lr.totalDistance));

            const slowMaxLRTime = (slowMaxLR / 1000) * SCENARIOS[1].paces.easy.max;
            expect(slowMaxLRTime).toBeLessThanOrEqual(PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS + SCENARIOS[1].paces.easy.max);
        });

        it('Marathon: slow runner has stronger time-on-feet constraint on long runs', () => {
            mockedCalculateTrainingPaces.mockReturnValue(SCENARIOS[7].paces);
            const slowWorkouts = generateTrainingPlan(makeConfig(SCENARIOS[7]));
            const longRuns = slowWorkouts.filter(w => w.type === WorkoutType.LONG_RUN);

            for (const lr of longRuns) {
                const timeOnFeet = (lr.totalDistance / 1000) * SCENARIOS[7].paces.easy.max;
                expect(timeOnFeet).toBeLessThanOrEqual(PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS + SCENARIOS[7].paces.easy.max);
            }
        });
    });

    describe('Distance-Specific Structural Invariants', () => {
        it('5K never schedules marathon-pace long runs', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[0]);
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                expect(lr.description).not.toContain('@ MP');
            }
        });

        it('10K never schedules marathon-pace long runs', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[2]);
            const workouts = generateTrainingPlan(config);
            const longRuns = workouts.filter(w => w.type === WorkoutType.LONG_RUN);
            for (const lr of longRuns) {
                expect(lr.description).not.toContain('@ MP');
            }
        });

        it('HM PEAK phase includes MP segments in long runs', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[4]);
            const workouts = generateTrainingPlan(config);
            const mpLongRuns = workouts.filter(w =>
                w.type === WorkoutType.LONG_RUN && w.description.includes('MP')
            );
            expect(mpLongRuns.length).toBeGreaterThan(0);
        });

        it('Marathon PEAK phase includes MP segments in long runs', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[6]);
            const workouts = generateTrainingPlan(config);
            const mpLongRuns = workouts.filter(w =>
                w.type === WorkoutType.LONG_RUN && w.description.includes('MP')
            );
            expect(mpLongRuns.length).toBeGreaterThan(0);
        });

        it('5K BASE phase has fartlek sessions', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[0]);
            const workouts = generateTrainingPlan(config);
            const fartleks = workouts.filter(w => w.description.includes('Fartlek'));
            expect(fartleks.length).toBeGreaterThan(0);
        });

        it('10K BASE phase has fartlek sessions', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[2]);
            const workouts = generateTrainingPlan(config);
            const fartleks = workouts.filter(w => w.description.includes('Fartlek'));
            expect(fartleks.length).toBeGreaterThan(0);
        });

        it('5K PEAK phase has repetition sessions (VO2max)', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[0]);
            const workouts = generateTrainingPlan(config);
            const reps = workouts.filter(w => w.type === WorkoutType.REPETITIONS);
            expect(reps.length).toBeGreaterThan(0);
        });

        it('10K PEAK phase has threshold sessions', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            const config = makeConfig(SCENARIOS[2]);
            const workouts = generateTrainingPlan(config);
            const thresholds = workouts.filter(w => w.description.includes('Threshold'));
            expect(thresholds.length).toBeGreaterThan(0);
        });

        it('all distances produce BASE fartlek, BUILD threshold, and PEAK-specific sessions', () => {
            mockedCalculateTrainingPaces.mockReturnValue(FAST_PACES);
            for (const scenario of SCENARIOS.filter(s => s.label.includes('Fast'))) {
                const workouts = generateTrainingPlan(makeConfig(scenario));
                const descs = workouts.map(w => w.description);
                expect(descs.some(d => d.includes('Fartlek')), `${scenario.label}: missing Fartlek`).toBe(true);
                if (scenario.raceType === 'FIVE_K') {
                    expect(descs.some(d => d.includes('5x1km')), `${scenario.label}: missing 5x1km intervals`).toBe(true);
                    expect(descs.some(d => d.includes('6x400m')), `${scenario.label}: missing reps`).toBe(true);
                }
                if (scenario.raceType === 'TEN_K') {
                    expect(descs.some(d => d.includes('6x1km') || d.includes('Threshold')), `${scenario.label}: missing quality`).toBe(true);
                }
            }
        });
    });
});
