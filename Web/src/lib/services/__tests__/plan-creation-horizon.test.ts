/**
 * Regression tests for the plan-length ceiling enforced at the service layer:
 * every creation path (web plans, web goals, mobile goals, sub-goals) goes
 * through createPlanWithWorkouts, so clamping the derived week count and
 * capping the persisted/returned workout count here bounds every caller —
 * even ones that bypass the zod schemas.
 */

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            updateMany: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
        },
        workout: {
            createMany: jest.fn(),
        },
        activity: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            aggregate: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

// Enum objects the schemas need at module load (z.nativeEnum).
jest.mock('@/generated/prisma/browser', () => ({
    WorkoutType: {
        EASY: 'EASY', LONG_RUN: 'LONG_RUN', TEMPO: 'TEMPO', INTERVALS: 'INTERVALS',
        FARTLEK: 'FARTLEK', REPETITIONS: 'REPETITIONS', RECOVERY: 'RECOVERY', RACE: 'RACE',
        REST: 'REST', CROSS_TRAIN: 'CROSS_TRAIN', RIDE: 'RIDE', SWIM: 'SWIM',
        STRENGTH: 'STRENGTH', OTHER: 'OTHER', BRICK: 'BRICK',
        OPEN_WATER_SWIM: 'OPEN_WATER_SWIM', LONG_RIDE: 'LONG_RIDE',
        RIDE_INTERVALS: 'RIDE_INTERVALS', SWIM_DRILL: 'SWIM_DRILL',
        TRANSITION_PRACTICE: 'TRANSITION_PRACTICE', DOUBLE_DAY: 'DOUBLE_DAY',
    },
    PlanPhase: {
        BASE: 'BASE', BUILD: 'BUILD', PEAK: 'PEAK', TAPER: 'TAPER',
        RACE_WEEK: 'RACE_WEEK', RECOVERY: 'RECOVERY', ENDURANCE: 'ENDURANCE',
        MENTAL_PREP: 'MENTAL_PREP', TUNE_UP: 'TUNE_UP', MAINTAIN: 'MAINTAIN',
    },
    RaceType: {
        FIVE_K: 'FIVE_K', TEN_K: 'TEN_K', HALF_MARATHON: 'HALF_MARATHON', MARATHON: 'MARATHON',
        FIFTY_K: 'FIFTY_K', FIFTY_MILE: 'FIFTY_MILE', HUNDRED_K: 'HUNDRED_K',
        HUNDRED_MILE: 'HUNDRED_MILE', TWELVE_HOUR: 'TWELVE_HOUR',
        TWENTY_FOUR_HOUR: 'TWENTY_FOUR_HOUR', BACKYARD_ULTRA: 'BACKYARD_ULTRA',
        CUSTOM_DISTANCE: 'CUSTOM_DISTANCE', SPRINT_TRI: 'SPRINT_TRI',
        OLYMPIC_TRI: 'OLYMPIC_TRI', HALF_IRONMAN: 'HALF_IRONMAN',
        FULL_IRONMAN: 'FULL_IRONMAN', CUSTOM_TRI: 'CUSTOM_TRI',
    },
    PlanSport: { RUN: 'RUN', TRIATHLON: 'TRIATHLON' },
    PlanCreationMode: {
        EXPERT_MANUAL: 'EXPERT_MANUAL', GUIDED: 'GUIDED', AI_ASSISTED: 'AI_ASSISTED',
        STANDARD_BUILDER: 'STANDARD_BUILDER', CSV_IMPORT: 'CSV_IMPORT',
    },
}));

import { prisma } from '@/lib/db';
import {
    createPlanWithWorkouts,
    normalizePlanInput,
    PlanCreateInputSchema,
    MAX_PERSISTED_WORKOUTS,
    MAX_PLAN_WEEKS,
} from '../plan-creation';
import { PLAN_CONSTANTS } from '@/lib/plans';

const mockedPrisma = prisma as unknown as {
    goal: { updateMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock };
    workout: { createMany: jest.Mock };
    activity: { findFirst: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock };
    user: { findUnique: jest.Mock };
};

const FAR_FUTURE = '9999-12-31T00:00:00.000Z';

function setupDbMocks() {
    jest.clearAllMocks();
    mockedPrisma.goal.updateMany.mockResolvedValue({ count: 0 });
    mockedPrisma.goal.create.mockImplementation(({ data }: { data: { id?: string } }) =>
        Promise.resolve({ id: data.id ?? 'goal-1', ...data }));
    mockedPrisma.goal.findUnique.mockResolvedValue({ id: 'goal-1', workouts: [] });
    mockedPrisma.workout.createMany.mockResolvedValue({ count: 0 });
    mockedPrisma.activity.findFirst.mockResolvedValue(null);
    mockedPrisma.activity.findMany.mockResolvedValue([]);
    mockedPrisma.activity.aggregate.mockResolvedValue({ _sum: { distance: 0 } });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
}

describe('PlanCreateInputSchema horizon caps', () => {
    it('rejects planWeeks above MAX_PLAN_WEEKS', () => {
        const parsed = PlanCreateInputSchema.safeParse({ name: 'a', sport: 'NO_RACE', planWeeks: 2_000_000 });
        expect(parsed.success).toBe(false);
    });

    it('rejects a far-future raceDate but accepts a near one', () => {
        expect(PlanCreateInputSchema.safeParse({ name: 'a', raceType: 'MARATHON', raceDate: FAR_FUTURE }).success).toBe(false);
        expect(PlanCreateInputSchema.safeParse({ name: 'a', raceType: 'MARATHON', raceDate: '+275760-09-13' }).success).toBe(false);

        const near = new Date(Date.now() + 20 * 7 * 24 * 60 * 60 * 1000).toISOString();
        expect(PlanCreateInputSchema.safeParse({ name: 'a', raceType: 'MARATHON', raceDate: near }).success).toBe(true);
    });

    it('rejects more than 10 sub-goals', () => {
        const subGoals = Array.from({ length: 11 }, () => ({ name: 's' }));
        const parsed = PlanCreateInputSchema.safeParse({ name: 'a', sport: 'NO_RACE', planWeeks: 12, subGoals });
        expect(parsed.success).toBe(false);
    });
});

describe('normalizePlanInput derived-weeks clamp', () => {
    it('clamps a raceDate-derived week count to MAX_PLAN_WEEKS', () => {
        const normalized = normalizePlanInput(
            {
                name: 'a',
                sport: 'RUN',
                raceType: 'MARATHON',
                raceDate: FAR_FUTURE,
                planStartDate: new Date().toISOString(),
            } as never,
            'user-1',
        );
        expect(normalized.planWeeks).toBeLessThanOrEqual(MAX_PLAN_WEEKS);
    });

    it('clamps an over-limit explicit planWeeks (schema bypass backstop)', () => {
        const normalized = normalizePlanInput(
            { name: 'a', sport: 'NO_RACE', planWeeks: 2_000_000 } as never,
            'user-1',
        );
        expect(normalized.planWeeks).toBe(MAX_PLAN_WEEKS);
    });
});

describe('createPlanWithWorkouts bounded generation', () => {
    beforeEach(setupDbMocks);

    it('bounds the NO_RACE path: absurd planWeeks yields a capped plan and a bounded createMany', async () => {
        await createPlanWithWorkouts({
            userId: 'user-1',
            name: 'a',
            raceType: null, // no race type → the NO_RACE generator path
            planWeeks: 2_000_000, // schema would reject; service must still be bounded
            runsPerWeek: 4,
            deactivateExisting: false,
        });

        expect(mockedPrisma.goal.create).toHaveBeenCalledTimes(1);
        const goalData = mockedPrisma.goal.create.mock.calls[0][0].data;
        expect(goalData.planWeeks).toBeLessThanOrEqual(MAX_PLAN_WEEKS);

        expect(mockedPrisma.workout.createMany).toHaveBeenCalledTimes(1);
        const batch = mockedPrisma.workout.createMany.mock.calls[0][0].data;
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(MAX_PERSISTED_WORKOUTS);
    });

    it('bounds the raceDate path: a far-future race date yields a capped plan and a bounded createMany', async () => {
        await createPlanWithWorkouts({
            userId: 'user-1',
            name: 'a',
            raceType: 'MARATHON',
            raceDate: FAR_FUTURE, // ~416k weeks of horizon unclamped
            runsPerWeek: 4,
            deactivateExisting: false,
        });

        const goalData = mockedPrisma.goal.create.mock.calls[0][0].data;
        expect(goalData.planWeeks).toBeLessThanOrEqual(MAX_PLAN_WEEKS);

        const batch = mockedPrisma.workout.createMany.mock.calls[0][0].data;
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(MAX_PERSISTED_WORKOUTS);
    });

    it('bounds each sub-goal batch and the total persisted rows', async () => {
        await createPlanWithWorkouts({
            userId: 'user-1',
            name: 'a',
            raceType: null,
            planWeeks: 12,
            subGoals: [
                { name: 'b', raceType: 'MARATHON', raceDate: FAR_FUTURE },
                { name: 'c', raceType: 'MARATHON', raceDate: FAR_FUTURE },
            ],
            deactivateExisting: false,
        });

        // parent + 2 sub-goal rows
        expect(mockedPrisma.goal.create).toHaveBeenCalledTimes(3);

        const totalRows = mockedPrisma.workout.createMany.mock.calls.reduce(
            (sum, call) => sum + call[0].data.length, 0);
        expect(totalRows).toBeGreaterThan(0);
        expect(totalRows).toBeLessThanOrEqual(MAX_PERSISTED_WORKOUTS * 3);
        for (const call of mockedPrisma.workout.createMany.mock.calls) {
            expect(call[0].data.length).toBeLessThanOrEqual(MAX_PERSISTED_WORKOUTS);
        }
    });

    it('bounds the response include with take: MAX_PERSISTED_WORKOUTS', async () => {
        await createPlanWithWorkouts({
            userId: 'user-1',
            name: 'a',
            raceType: 'MARATHON',
            raceDate: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toISOString(),
            deactivateExisting: false,
        });

        const findUniqueArgs = mockedPrisma.goal.findUnique.mock.calls[0][0];
        expect(findUniqueArgs.include.workouts.take).toBe(MAX_PERSISTED_WORKOUTS);
    });

    it('keeps the ceiling in sync with the engine clamp', () => {
        expect(MAX_PLAN_WEEKS).toBe(PLAN_CONSTANTS.MAX_TOTAL_WEEKS);
    });
});
