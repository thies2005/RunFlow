/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

// Provide the generated enum objects so the route module can build its Zod
// nativeEnum schemas at load time.
jest.mock('@/generated/prisma/client', () => ({
    WorkoutType: {
        EASY: 'EASY',
        LONG_RUN: 'LONG_RUN',
        TEMPO: 'TEMPO',
        INTERVALS: 'INTERVALS',
        FARTLEK: 'FARTLEK',
        REPETITIONS: 'REPETITIONS',
        RECOVERY: 'RECOVERY',
        RACE: 'RACE',
        REST: 'REST',
        CROSS_TRAIN: 'CROSS_TRAIN',
        RIDE: 'RIDE',
        SWIM: 'SWIM',
        STRENGTH: 'STRENGTH',
        OTHER: 'OTHER',
        BRICK: 'BRICK',
        OPEN_WATER_SWIM: 'OPEN_WATER_SWIM',
        LONG_RIDE: 'LONG_RIDE',
        RIDE_INTERVALS: 'RIDE_INTERVALS',
        SWIM_DRILL: 'SWIM_DRILL',
        TRANSITION_PRACTICE: 'TRANSITION_PRACTICE',
        DOUBLE_DAY: 'DOUBLE_DAY',
    },
    PlanPhase: {
        BASE: 'BASE',
        BUILD: 'BUILD',
        PEAK: 'PEAK',
        TAPER: 'TAPER',
        RACE_WEEK: 'RACE_WEEK',
        RECOVERY: 'RECOVERY',
        ENDURANCE: 'ENDURANCE',
        MENTAL_PREP: 'MENTAL_PREP',
        TUNE_UP: 'TUNE_UP',
        MAINTAIN: 'MAINTAIN',
    },
    RaceType: {
        FIVE_K: 'FIVE_K',
        TEN_K: 'TEN_K',
        HALF_MARATHON: 'HALF_MARATHON',
        MARATHON: 'MARATHON',
        SPRINT_TRI: 'SPRINT_TRI',
        FULL_IRONMAN: 'FULL_IRONMAN',
    },
    PlanCreationMode: {
        EXPERT_MANUAL: 'EXPERT_MANUAL',
        GUIDED: 'GUIDED',
        AI_ASSISTED: 'AI_ASSISTED',
        STANDARD_BUILDER: 'STANDARD_BUILDER',
        CSV_IMPORT: 'CSV_IMPORT',
    },
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        $transaction: jest.fn(),
        goal: {
            create: jest.fn(),
        },
        workout: {
            create: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { settings: { limit: 10, windowSeconds: 60, prefix: 'settings' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/plan/snapshot', () => ({
    createSnapshot: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

function buildRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/plans/import', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

function validBody(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Berlin Marathon',
        raceType: 'MARATHON',
        raceDate: '2026-09-27',
        planStartDate: '2026-06-01',
        sport: 'RUN',
        planWeeks: 16,
        taperWeeks: 2,
        peakWeeks: 3,
        buildWeeks: 4,
        currentVdot: 47.5,
        weeklyMileageGoal: 58000,
        runsPerWeek: 5,
        creationMode: 'EXPERT_MANUAL',
        workouts: [
            {
                localId: 'local-w1',
                scheduledDate: '2026-06-01',
                workoutType: 'BRICK',
                phase: 'MENTAL_PREP',
                description: 'Bike 40k + run 10k',
                targetDistance: 50000,
                targetPace: 245,
                targetDuration: 6800,
                order: 0,
            },
            {
                localId: 'local-w2',
                scheduledDate: '2026-06-02',
                workoutType: 'TEMPO',
                phase: 'BUILD',
                description: 'Tempo run – 8 km at 4:05/km',
                structuredSteps: { version: 1, source: 'generated-plan', steps: [{ type: 'work', name: '3x1K' }] },
                order: 1,
            },
        ],
        ...overrides,
    };
}

describe('POST /api/plans/import', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1', authMethod: 'jwt' });

        // $transaction runs the callback against the same mocked prisma.
        (prisma.$transaction as jest.Mock).mockImplementation(
            async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
        );
        let goalSeq = 0;
        (prisma.goal.create as jest.Mock).mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: `goal-server-${++goalSeq}`,
            ...data,
        }));
        let workoutSeq = 0;
        (prisma.workout.create as jest.Mock).mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
            id: `workout-server-${++workoutSeq}`,
            ...data,
        }));
    });

    it('creates the goal + workouts verbatim and returns the id map', async () => {
        const res = await POST(buildRequest(validBody()));
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.goalId).toBe('goal-server-1');
        expect(json.idMap).toEqual({
            'local-w1': 'workout-server-1',
            'local-w2': 'workout-server-2',
        });

        // goal scalars land in the prisma create data, owned by the caller
        const goalData = (prisma.goal.create as jest.Mock).mock.calls[0][0].data;
        expect(goalData.userId).toBe('user-1');
        expect(goalData.name).toBe('Berlin Marathon');
        expect(goalData.raceType).toBe('MARATHON');
        expect(goalData.sport).toBe('RUN');
        expect(goalData.planWeeks).toBe(16);
        expect(goalData.currentVdot).toBe(47.5);
        expect(goalData.weeklyMileageGoal).toBe(58000);
        expect(goalData.creationMode).toBe('EXPERT_MANUAL');
        expect(goalData.raceDate).toEqual(new Date('2026-09-27'));
        expect(goalData.planStartDate).toEqual(new Date('2026-06-01'));

        // workouts are created with the raw enum values preserved, order kept
        const w1 = (prisma.workout.create as jest.Mock).mock.calls[0][0].data;
        expect(w1.goalId).toBe('goal-server-1');
        expect(w1.workoutType).toBe('BRICK');
        expect(w1.phase).toBe('MENTAL_PREP');
        expect(w1.scheduledDate).toEqual(new Date('2026-06-01'));
        expect(w1.order).toBe(0);
        expect(w1.targetDistance).toBe(50000);
        expect(w1.targetPace).toBe(245);
        expect(w1.targetDuration).toBe(6800);
        const w2 = (prisma.workout.create as jest.Mock).mock.calls[1][0].data;
        expect(w2.workoutType).toBe('TEMPO');
        expect(w2.phase).toBe('BUILD');
        expect(w2.structuredSteps).toEqual({
            version: 1,
            source: 'generated-plan',
            steps: [{ type: 'work', name: '3x1K' }],
        });
        expect((prisma.workout.create as jest.Mock).mock.calls[1][0].data.order).toBe(1);

        // initial snapshot mirrors the plan-advanced mutation routes
        expect(createSnapshot).toHaveBeenCalledWith(
            'goal-server-1',
            'Initial snapshot of imported plan',
            'plan_import',
        );
    });

    it('auto-converts a km-shaped weeklyMileageGoal and defaults creationMode', async () => {
        const body = validBody();
        delete (body as Record<string, unknown>).creationMode;
        body.weeklyMileageGoal = 58;
        await POST(buildRequest(body));
        const goalData = (prisma.goal.create as jest.Mock).mock.calls[0][0].data;
        expect(goalData.weeklyMileageGoal).toBe(58000);
        expect(goalData.creationMode).toBe('EXPERT_MANUAL'); // schema default
    });

    it('returns 400 on an unknown workoutType and writes nothing', async () => {
        const body = validBody();
        (body.workouts as Array<Record<string, unknown>>)[0].workoutType = 'POOL_RUN';
        const res = await POST(buildRequest(body));
        expect(res.status).toBe(400);
        expect(prisma.goal.create).not.toHaveBeenCalled();
        expect(prisma.workout.create).not.toHaveBeenCalled();
        expect(createSnapshot).not.toHaveBeenCalled();
    });

    it('returns 400 on an unknown phase', async () => {
        const body = validBody();
        (body.workouts as Array<Record<string, unknown>>)[1].phase = 'SUPERCOMPENSATION';
        const res = await POST(buildRequest(body));
        expect(res.status).toBe(400);
        expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('returns 400 on duplicate localIds', async () => {
        const body = validBody();
        (body.workouts as Array<Record<string, unknown>>)[1].localId = 'local-w1';
        const res = await POST(buildRequest(body));
        expect(res.status).toBe(400);
        expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('returns 400 when the workout list exceeds the 500 cap', async () => {
        const workouts = Array.from({ length: 501 }, (_, i) => ({
            localId: `w-${i}`,
            scheduledDate: '2026-06-01',
            workoutType: 'EASY',
            phase: 'BASE',
            description: 'Easy',
            order: i,
        }));
        const res = await POST(buildRequest(validBody({ workouts })));
        expect(res.status).toBe(400);
        expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('returns 400 when the workout list is empty', async () => {
        const res = await POST(buildRequest(validBody({ workouts: [] })));
        expect(res.status).toBe(400);
        expect(prisma.goal.create).not.toHaveBeenCalled();
    });

    it('returns 401 for unauthenticated callers', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
        const res = await POST(buildRequest(validBody()));
        expect(res.status).toBe(401);
        expect(prisma.goal.create).not.toHaveBeenCalled();
    });
});
