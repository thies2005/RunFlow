/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { MAX_PERSISTED_WORKOUTS } from '@/lib/services/plan-creation';
import { PLAN_CONSTANTS } from '@/lib/plans';

// Enum objects the plan-creation service needs at module load (z.nativeEnum).
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

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        workout: {
            createMany: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { general: { limit: 100, windowSeconds: 60 }, settings: { limit: 20, windowSeconds: 60 } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/plan/snapshot', () => ({
    createSnapshot: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { createSnapshot } from '@/lib/plan/snapshot';

const mockedPrisma = prisma as unknown as {
    goal: { findFirst: jest.Mock; create: jest.Mock };
    workout: { createMany: jest.Mock };
};

const PARENT_GOAL = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Base plan',
    sport: 'RUN',
    raceType: null,
    raceDate: null, // no parent raceDate → the persistence filter never trims
    planStartDate: null,
    currentVdot: 40,
    runsPerWeek: 4,
    ridesPerWeek: 0,
    swimsPerWeek: 0,
    strengthPerWeek: 0,
    weeklyMileageGoal: 50000,
    peakWeeks: 2,
    buildWeeks: 4,
    longRunDay: 0,
    workoutDay: 3,
};

function buildRequest(body: unknown): [NextRequest, { params: Promise<{ goalId: string }> }] {
    const req = new NextRequest('http://localhost:3000/api/plan-advanced/goal-1/sub-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return [req, { params: Promise.resolve({ goalId: 'goal-1' }) }];
}

describe('POST /api/plan-advanced/[goalId]/sub-goals — horizon bound', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (createSnapshot as jest.Mock).mockResolvedValue(undefined);
        mockedPrisma.goal.findFirst.mockResolvedValue(PARENT_GOAL);
        mockedPrisma.goal.create.mockResolvedValue({ id: 'sg-1', name: 'B race' });
        mockedPrisma.workout.createMany.mockResolvedValue({ count: 0 });
    });

    it('rejects a far-future raceDate with 400 before any DB write', async () => {
        const [req, ctx] = buildRequest({
            name: 'B race',
            raceType: 'MARATHON',
            raceDate: '9999-12-31',
            generateWorkouts: true,
        });

        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/too far in the future/i);
        // No orphan sub-goal row, no snapshot, no workout batch.
        expect(mockedPrisma.goal.create).not.toHaveBeenCalled();
        expect(mockedPrisma.workout.createMany).not.toHaveBeenCalled();
    });

    it('rejects an unparseable raceDate with 400 instead of 500', async () => {
        const [req, ctx] = buildRequest({
            name: 'B race',
            raceType: 'MARATHON',
            raceDate: 'not-a-date',
            generateWorkouts: true,
        });

        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        expect(mockedPrisma.goal.create).not.toHaveBeenCalled();
    });

    it('generates and persists a bounded batch for an in-horizon raceDate', async () => {
        // ~16 weeks out — inside the 104-week cap.
        const raceDate = new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toISOString();
        const [req, ctx] = buildRequest({
            name: 'B race',
            raceType: 'MARATHON',
            raceDate,
            generateWorkouts: true,
        });

        const res = await POST(req, ctx);

        expect(res.status).toBe(201);
        expect(mockedPrisma.workout.createMany).toHaveBeenCalledTimes(1);
        const batch = mockedPrisma.workout.createMany.mock.calls[0][0].data;
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(MAX_PERSISTED_WORKOUTS);
        const data = await res.json();
        expect(data.workoutsCreated).toBe(batch.length);
        // Every row is attached to the parent goal + sub-goal.
        for (const row of batch) {
            expect(row.goalId).toBe('goal-1');
            expect(row.subGoalId).toBe('sg-1');
        }
    });

    it('accepts a far-future raceDate when no workouts are generated', async () => {
        // generateWorkouts omitted → the horizon is irrelevant (no generation,
        // no amplification); the sub-goal row itself is one bounded write.
        const [req, ctx] = buildRequest({
            name: 'Dream race',
            raceType: 'MARATHON',
            raceDate: '9999-12-31',
        });

        const res = await POST(req, ctx);

        expect(res.status).toBe(201);
        expect(mockedPrisma.goal.create).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.workout.createMany).not.toHaveBeenCalled();
    });

    it('caps the horizon at PLAN_CONSTANTS.MAX_TOTAL_WEEKS', async () => {
        // Exactly at the cap is allowed; one day past it is not.
        const atCap = new Date(Date.now() + PLAN_CONSTANTS.MAX_TOTAL_WEEKS * 7 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
        const [req, ctx] = buildRequest({
            name: 'B race',
            raceType: 'MARATHON',
            raceDate: atCap.toISOString(),
            generateWorkouts: true,
        });

        const res = await POST(req, ctx);
        expect(res.status).toBe(201);
        expect(mockedPrisma.workout.createMany).toHaveBeenCalled();
    });
});
