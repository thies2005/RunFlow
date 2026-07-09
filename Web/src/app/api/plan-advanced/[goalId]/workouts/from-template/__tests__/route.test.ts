/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';

// Provide the generated enum objects so the route module can call Object.values() at load time.
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
}));

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        goal: {
            findFirst: jest.fn(),
        },
        workoutTemplate: {
            findUnique: jest.fn(),
        },
        workout: {
            create: jest.fn(),
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

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';
import { createSnapshot } from '@/lib/plan/snapshot';

const mockTemplate = {
    id: 'tpl-1',
    name: '8x400m Repeats',
    description: 'Classic short interval speed session.',
    workoutType: 'INTERVALS',
    sport: 'RUN',
    targetDistance: 8000,
    targetDuration: 2400,
    targetPace: 95,
    structuredSteps: [{ type: 'warmup', distanceM: 2000 }],
    difficulty: 'intermediate',
    tags: ['speed', 'intervals'],
    category: 'speed',
    isPublished: true,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

function buildRequest(goalId: string, body: unknown): NextRequest {
    return new NextRequest(
        `http://localhost:3000/api/plan-advanced/${goalId}/workouts/from-template`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    );
}

describe('POST /api/plan-advanced/[goalId]/workouts/from-template', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getClientIdentifier as jest.Mock).mockReturnValue('test-client');
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
        (createSnapshot as jest.Mock).mockResolvedValue(undefined);
    });

    it('creates a workout from a published template with the right fields', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });
        (prisma.workoutTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
        const createdWorkout = { id: 'wk-1', goalId: 'goal-1' };
        (prisma.workout.create as jest.Mock).mockResolvedValue(createdWorkout);

        const scheduledDate = '2026-07-10T06:00:00.000Z';
        const response = await POST(buildRequest('goal-1', { templateId: 'tpl-1', scheduledDate }), {
            params: Promise.resolve({ goalId: 'goal-1' }),
        } as never);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.workout).toEqual(createdWorkout);

        // Ownership check filters by userId.
        expect(prisma.goal.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'goal-1', userId: 'user-1' } }),
        );

        // Template fetched by id.
        expect(prisma.workoutTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 'tpl-1' } });

        // Snapshot created before the workout.
        expect(createSnapshot).toHaveBeenCalledWith('goal-1', 'Before apply workout template', 'apply_workout_template');

        // Workout created with template-derived fields + the requested scheduledDate.
        expect(prisma.workout.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                goalId: 'goal-1',
                scheduledDate: new Date(scheduledDate),
                workoutType: 'INTERVALS',
                description: mockTemplate.description,
                customName: mockTemplate.name,
                targetDistance: 8000,
                targetDuration: 2400,
                targetPace: 95,
                structuredSteps: mockTemplate.structuredSteps,
                sport: 'RUN',
            }),
        });
    });

    it('returns 404 when the goal does not belong to the user (ownership)', async () => {
        // findFirst returns null when userId doesn't match -> ownership denied.
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);

        const response = await POST(
            buildRequest('goal-other', { templateId: 'tpl-1', scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-other' }) } as never,
        );

        expect(response.status).toBe(404);
        // Template must not be fetched when ownership fails.
        expect(prisma.workoutTemplate.findUnique).not.toHaveBeenCalled();
        expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the template does not exist', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });
        (prisma.workoutTemplate.findUnique as jest.Mock).mockResolvedValue(null);

        const response = await POST(
            buildRequest('goal-1', { templateId: 'missing', scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(404);
        expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the template is unpublished', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });
        (prisma.workoutTemplate.findUnique as jest.Mock).mockResolvedValue({ ...mockTemplate, isPublished: false });

        const response = await POST(
            buildRequest('goal-1', { templateId: 'tpl-1', scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(404);
        expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it('returns 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const response = await POST(
            buildRequest('goal-1', { templateId: 'tpl-1', scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(401);
    });

    it('returns 400 when templateId is missing', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });

        const response = await POST(
            buildRequest('goal-1', { scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(400);
    });

    it('returns 400 when scheduledDate is missing or invalid', async () => {
        (prisma.goal.findFirst as jest.Mock).mockResolvedValue({ id: 'goal-1', userId: 'user-1' });

        const response = await POST(
            buildRequest('goal-1', { templateId: 'tpl-1' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(400);
    });

    it('returns 429 when rate limited', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const response = await POST(
            buildRequest('goal-1', { templateId: 'tpl-1', scheduledDate: '2026-07-10T06:00:00.000Z' }),
            { params: Promise.resolve({ goalId: 'goal-1' }) } as never,
        );

        expect(response.status).toBe(429);
    });
});
