/**
 * @jest-environment node
 */

import { GET } from '../route';

jest.mock('@/generated/prisma/client', () => ({
    WorkoutType: { EASY: 'EASY', LONG_RUN: 'LONG_RUN', TEMPO: 'TEMPO' },
    PlanPhase: { BASE: 'BASE', BUILD: 'BUILD' },
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findFirst: jest.fn(),
        },
        workout: {
            findMany: jest.fn(),
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

function buildRequest(goalId = 'goal-1'): Request {
    return new Request(`http://localhost/api/plan-advanced/${goalId}/workouts`, {
        method: 'GET',
    });
}

// Route params arrive as a resolved Promise in Next 15 route handlers.
function routeContext(goalId: string) {
    return { params: Promise.resolve({ goalId }) };
}

describe('GET /api/plan-advanced/[goalId]/workouts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1', authMethod: 'session' });
    });

    it('returns 401 for unauthenticated callers', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
        const res = await GET(buildRequest(), routeContext('goal-1'));
        expect(res.status).toBe(401);
        expect(prisma.workout.findMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the goal belongs to another user (IDOR guard)", async () => {
        // Ownership lookup scoped to the caller finds nothing.
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

        const res = await GET(buildRequest('someone-elses-goal'), routeContext('someone-elses-goal'));
        expect(res.status).toBe(404);

        // the workout query must never run for a goal the caller doesn't own
        expect(prisma.goal.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'someone-elses-goal', userId: 'user-1' },
            }),
        );
        expect(prisma.workout.findMany).not.toHaveBeenCalled();
    });

    it('returns the workouts of an owned goal', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1' });
        (prisma.workout.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'w-1',
                goalId: 'goal-1',
                workoutType: 'EASY',
                linkedActivity: null,
            },
        ]);

        const res = await GET(buildRequest(), routeContext('goal-1'));
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.workouts).toHaveLength(1);
        expect(json.workouts[0].id).toBe('w-1');

        const findManyArgs = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
        expect(findManyArgs.where.goalId).toBe('goal-1');
    });

    it('authenticates mobile JWT callers too (dual auth)', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-2', authMethod: 'jwt' });
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

        const res = await GET(buildRequest('goal-x'), routeContext('goal-x'));
        expect(res.status).toBe(404); // authenticated, but not the owner
    });
});
