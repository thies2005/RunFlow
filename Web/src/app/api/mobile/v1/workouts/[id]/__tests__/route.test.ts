/**
 * @jest-environment node
 */

import { PATCH } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        workout: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { general: { limit: 100, windowSeconds: 60 } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

const baseWorkout = {
    id: 'wk-1',
    goalId: 'goal-1',
    goal: { id: 'goal-1', userId: 'user-1' },
    workoutType: 'INTERVALS',
    description: '400s',
    targetDistance: 8000,
    targetPace: 240,
    targetDuration: 2400,
    scheduledDate: new Date('2026-09-10T00:00:00.000Z'),
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    completedAt: null,
};

function buildRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/mobile/v1/workouts/wk-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('PATCH /api/mobile/v1/workouts/[id] builder fields', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (prisma.workout.findUnique as jest.Mock).mockResolvedValue(baseWorkout);
        (prisma.workout.update as jest.Mock).mockImplementation(({ data }) =>
            Promise.resolve({ ...baseWorkout, ...data }),
        );
    });

    it('sets builder field values (structuredSteps, customName, hr and pace ranges)', async () => {
        const structuredSteps = {
            warmup: { distance: 1000, pace: 'E' },
            main: [{ reps: 4, distance: 400, pace: 'I', restSeconds: 90 }],
            cooldown: { distance: 1000, pace: 'E' },
        };
        const response = await PATCH(buildRequest({
            customName: 'Thursday 400s',
            targetHrZone: 4,
            targetHrMinBpm: 150,
            targetHrMaxBpm: 165,
            targetPaceMinSecondsPerKm: 220.5,
            targetPaceMaxSecondsPerKm: 240.0,
            structuredSteps,
        }), { params: Promise.resolve({ id: 'wk-1' }) } as never);

        expect(response.status).toBe(200);
        expect(prisma.workout.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'wk-1' },
                data: expect.objectContaining({
                    customName: 'Thursday 400s',
                    targetHrZone: 4,
                    targetHrMinBpm: 150,
                    targetHrMaxBpm: 165,
                    targetPaceMinSecondsPerKm: 220.5,
                    targetPaceMaxSecondsPerKm: 240.0,
                    structuredSteps,
                }),
            }),
        );
    });

    it('null clears builder fields (undefined would leave them untouched)', async () => {
        const response = await PATCH(buildRequest({
            customName: null,
            targetHrZone: null,
            structuredSteps: null,
        }), { params: Promise.resolve({ id: 'wk-1' }) } as never);

        expect(response.status).toBe(200);
        expect(prisma.workout.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    customName: null,
                    targetHrZone: null,
                    structuredSteps: null,
                }),
            }),
        );
    });

    it('undefined builder fields are not written at all', async () => {
        const response = await PATCH(buildRequest({ description: 'Easy 5k' }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);

        expect(response.status).toBe(200);
        const data = (prisma.workout.update as jest.Mock).mock.calls[0][0].data;
        for (const field of [
            'customName', 'targetHrZone', 'targetHrMinBpm', 'targetHrMaxBpm',
            'targetPaceMinSecondsPerKm', 'targetPaceMaxSecondsPerKm', 'structuredSteps',
        ]) {
            expect(data).not.toHaveProperty(field);
        }
    });

    it('rejects primitive structuredSteps with 400', async () => {
        const response = await PATCH(buildRequest({ structuredSteps: 'warmup+main' }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);

        expect(response.status).toBe(400);
        expect(prisma.workout.update).not.toHaveBeenCalled();
    });

    it('rejects non-integer hr fields and non-number pace fields with 400', async () => {
        const badHr = await PATCH(buildRequest({ targetHrZone: 3.5 }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);
        expect(badHr.status).toBe(400);

        const badPace = await PATCH(buildRequest({ targetPaceMinSecondsPerKm: 'fast' }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);
        expect(badPace.status).toBe(400);

        expect(prisma.workout.update).not.toHaveBeenCalled();
    });

    it('ignores unknown fields (whitelist only)', async () => {
        const response = await PATCH(buildRequest({
            evil: 'drop me',
            goalId: 'goal-other',
            linkedActivityId: 'act-1',
        }), { params: Promise.resolve({ id: 'wk-1' }) } as never);

        expect(response.status).toBe(200);
        const data = (prisma.workout.update as jest.Mock).mock.calls[0][0].data;
        expect(data).not.toHaveProperty('evil');
        expect(data).not.toHaveProperty('goalId');
        expect(data).not.toHaveProperty('linkedActivityId');
    });

    it('returns 404 when the workout belongs to another user', async () => {
        (prisma.workout.findUnique as jest.Mock).mockResolvedValue({
            ...baseWorkout,
            goal: { id: 'goal-1', userId: 'someone-else' },
        });

        const response = await PATCH(buildRequest({ customName: 'x' }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);

        expect(response.status).toBe(404);
        expect(prisma.workout.update).not.toHaveBeenCalled();
    });

    it('returns 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const response = await PATCH(buildRequest({ customName: 'x' }), {
            params: Promise.resolve({ id: 'wk-1' }),
        } as never);

        expect(response.status).toBe(401);
    });
});
