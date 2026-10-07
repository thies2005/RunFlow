import { generateTrainingPlan, PLAN_CONSTANTS } from '../index';
import { calculateTrainingPaces } from '../../metrics/vdot';

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

/**
 * A race date decades out must not drive an unbounded generation loop: every
 * generator clamps totalWeeks to PLAN_CONSTANTS.MAX_TOTAL_WEEKS (104 weeks,
 * ~2 years). Unclamped, this config would iterate ~3,800 weeks and build
 * ~25,000+ workouts.
 */
const START_DATE = new Date('2026-01-05');
const FAR_FUTURE_RACE_DATE = new Date('2100-01-01');

const MAX_WEEKLY_WORKOUT_SLACK = 8;

function weeksToWorkoutBound(runsPerWeek: number): number {
    return PLAN_CONSTANTS.MAX_TOTAL_WEEKS * runsPerWeek + MAX_WEEKLY_WORKOUT_SLACK;
}

beforeEach(() => {
    mockedCalculateTrainingPaces.mockReturnValue(MOCK_PACES);
});

describe('plan horizon clamp', () => {
    it('clamps the standard run plan to MAX_TOTAL_WEEKS for a far-future race date', () => {
        const workouts = generateTrainingPlan({
            vdot: 40,
            raceType: 'MARATHON',
            raceDate: FAR_FUTURE_RACE_DATE,
            startDate: START_DATE,
            runsPerWeek: 7,
            weeklyMileageGoal: 60000,
        });

        expect(workouts.length).toBeGreaterThan(0);
        expect(workouts.length).toBeLessThanOrEqual(weeksToWorkoutBound(7));
    });

    it('clamps the ultra plan to MAX_TOTAL_WEEKS for a far-future race date', () => {
        const workouts = generateTrainingPlan({
            vdot: 40,
            raceType: 'HUNDRED_K',
            raceDate: FAR_FUTURE_RACE_DATE,
            startDate: START_DATE,
            runsPerWeek: 5,
            strengthPerWeek: 0,
            weeklyMileageGoal: 70000,
        });

        expect(workouts.length).toBeGreaterThan(0);
        expect(workouts.length).toBeLessThanOrEqual(weeksToWorkoutBound(6));
    });

    it('clamps the triathlon plan to MAX_TOTAL_WEEKS for a far-future race date', () => {
        const workouts = generateTrainingPlan({
            vdot: 40,
            raceType: 'OLYMPIC_TRI',
            raceDate: FAR_FUTURE_RACE_DATE,
            startDate: START_DATE,
            runsPerWeek: 2,
            ridesPerWeek: 2,
            swimsPerWeek: 2,
            strengthPerWeek: 0,
            weeklyMileageGoal: 40000,
        });

        expect(workouts.length).toBeGreaterThan(0);
        expect(workouts.length).toBeLessThanOrEqual(weeksToWorkoutBound(7));
    });

    it('clamps the no-race plan to MAX_TOTAL_WEEKS for an absurd explicit week count', () => {
        // weeksTotal is caller-controlled (planWeeks on the creation paths);
        // an unclamped value would loop millions of weeks. This is the path
        // the plan-creation service feeds with input.planWeeks.
        const workouts = generateTrainingPlan({
            vdot: 40,
            raceType: null,
            raceDate: FAR_FUTURE_RACE_DATE, // unused by the no-race generator, required by PlanConfig
            startDate: START_DATE,
            runsPerWeek: 4,
            weeklyMileageGoal: 50000,
            weeksTotal: 2_000_000,
        });

        expect(workouts.length).toBeGreaterThan(0);
        expect(workouts.length).toBeLessThanOrEqual(weeksToWorkoutBound(4));
    });

    it('does not clamp plans shorter than the bound', () => {
        const raceDate = new Date('2026-07-19'); // ~28 weeks after START_DATE
        const workouts = generateTrainingPlan({
            vdot: 40,
            raceType: 'MARATHON',
            raceDate,
            startDate: START_DATE,
            runsPerWeek: 4,
            weeklyMileageGoal: 60000,
        });

        // 28 weeks of ~4 runs each: well below the clamp, and the plan must
        // actually cover the requested horizon rather than being truncated.
        expect(workouts.length).toBeGreaterThan(28);
        expect(workouts.length).toBeLessThanOrEqual(weeksToWorkoutBound(4));
    });
});
