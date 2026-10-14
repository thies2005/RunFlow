/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { DELETE as deleteProgression } from '../plan-advanced/[goalId]/progression/route';
import { POST as postProgressionApply } from '../plan-advanced/[goalId]/progression/apply/route';
import { POST as postCopyWeek } from '../plan-advanced/[goalId]/copy-week/route';
import { POST as postSupplements } from '../health/supplements/route';
import { PUT as putMobileSupplements } from '../mobile/v1/health/supplements/route';
import { POST as postPushSubscribe } from '../push/subscribe/route';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 60 }),
    getClientIdentifier: jest.fn().mockReturnValue('test-client-id'),
    RATE_LIMITS: {
        settings: { limit: 10, windowSeconds: 60 },
        general: { limit: 60, windowSeconds: 60 },
    },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/plan/snapshot', () => ({
    createSnapshot: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/push', () => ({
    getVapidPublicKey: jest.fn().mockReturnValue('test-vapid-key'),
}));

jest.mock('@/lib/db', () => {
    const mockPrisma: Record<string, any> = {
        goal: {
            findFirst: jest.fn(),
        },
        intervalProgression: {
            findFirst: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        workout: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        supplement: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        supplementStack: {
            findFirst: jest.fn(),
        },
        pushSubscription: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };
    return { prisma: mockPrisma };
});

import { auth } from '@/auth';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';

describe('SEC-3 Tenant Isolation and Authorization Hardening', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Test 1: IDOR in DELETE /api/plan-advanced/[goalId]/progression', () => {
        it('returns 404 and does not mutate database when progression belongs to another user/goal', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-attacker' },
            });

            // prisma.intervalProgression.findFirst with goal.userId = user-attacker returns null
            (prisma.intervalProgression.findFirst as jest.Mock).mockResolvedValue(null);

            const req = new Request('http://localhost/api/plan-advanced/goal-attacker/progression?id=prog-victim', {
                method: 'DELETE',
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-attacker' }) };

            const res = await deleteProgression(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(404);
            expect(json.error).toBe('Progression not found');

            // Verify tenant query filter
            expect(prisma.intervalProgression.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'prog-victim',
                    goalId: 'goal-attacker',
                    goal: { userId: 'user-attacker' },
                },
                select: { id: true },
            });

            // Ensure no mutations occurred
            expect(prisma.workout.updateMany).not.toHaveBeenCalled();
            expect(prisma.intervalProgression.delete).not.toHaveBeenCalled();
        });

        it('successfully unlinks workouts and deletes progression when caller owns the goal and progression', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-owner' },
            });

            (prisma.intervalProgression.findFirst as jest.Mock).mockResolvedValue({ id: 'prog-1' });
            (prisma.workout.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
            (prisma.intervalProgression.delete as jest.Mock).mockResolvedValue({ id: 'prog-1' });

            const req = new Request('http://localhost/api/plan-advanced/goal-1/progression?id=prog-1', {
                method: 'DELETE',
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-1' }) };

            const res = await deleteProgression(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);

            expect(prisma.workout.updateMany).toHaveBeenCalledWith({
                where: { intervalProgressionId: 'prog-1', goalId: 'goal-1' },
                data: { intervalProgressionId: null },
            });
            expect(prisma.intervalProgression.delete).toHaveBeenCalledWith({
                where: { id: 'prog-1' },
            });
        });
    });

    describe('Test 2: Cross-Tenant SupplementStack Linking', () => {
        it('POST /api/health/supplements returns 404 when stackId belongs to another user', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-attacker' },
            });

            // Stack query filtered by userId returns null
            (prisma.supplementStack.findFirst as jest.Mock).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/health/supplements', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    name: 'Vitamin D3',
                    amount: 2000,
                    unit: 'IU',
                    timeOfDay: 'MORNING',
                    stackId: 'stack-victim',
                }),
            });

            const res = await postSupplements(req);
            const json = await res.json();

            expect(res.status).toBe(404);
            expect(json.error).toBe('Supplement stack not found');

            expect(prisma.supplementStack.findFirst).toHaveBeenCalledWith({
                where: { id: 'stack-victim', userId: 'user-attacker' },
                select: { id: true },
            });
            expect(prisma.supplement.create).not.toHaveBeenCalled();
        });

        it('PUT /api/mobile/v1/health/supplements returns 404 when stackId belongs to another user', async () => {
            (getAuthenticatedUser as jest.Mock).mockResolvedValue({
                id: 'user-attacker',
            });

            // Existing supplement is owned by user-attacker
            (prisma.supplement.findUnique as jest.Mock).mockResolvedValue({
                id: 'supp-1',
                userId: 'user-attacker',
                name: 'Whey Protein',
                amount: 30,
                unit: 'g',
                timeOfDay: 'POST_WORKOUT',
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                isActive: true,
                order: 0,
                stackId: null,
            });

            // Cross-tenant stack is not found for user-attacker
            (prisma.supplementStack.findFirst as jest.Mock).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/mobile/v1/health/supplements', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: 'supp-1',
                    stackId: 'stack-victim',
                }),
            });

            const res = await putMobileSupplements(req);
            const json = await res.json();

            expect(res.status).toBe(404);
            expect(json.error).toBe('Supplement stack not found');

            expect(prisma.supplementStack.findFirst).toHaveBeenCalledWith({
                where: { id: 'stack-victim', userId: 'user-attacker' },
                select: { id: true },
            });
            expect(prisma.supplement.update).not.toHaveBeenCalled();
        });
    });

    describe('Test 3: PushSubscription Hijacking in POST /api/push/subscribe', () => {
        it('returns 409 when endpoint is already bound to another user', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-attacker' },
            });

            // Subscription with same endpoint belongs to user-victim
            (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-existing',
                userId: 'user-victim',
            });

            const req = new NextRequest('http://localhost/api/push/subscribe', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://fcm.googleapis.com/fcm/send/target-sub-token',
                    keys: {
                        p256dh: 'victim-p256dh',
                        auth: 'victim-auth',
                    },
                }),
            });

            const res = await postPushSubscribe(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error).toContain('already bound to another account');
            expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
        });

        it('rejects non-https push endpoints with 400', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-1' },
            });

            const req = new NextRequest('http://localhost/api/push/subscribe', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'http://insecure-push.example.com/sub/123',
                    keys: {
                        p256dh: 'p256dh-key',
                        auth: 'auth-key',
                    },
                }),
            });

            const res = await postPushSubscribe(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error).toContain('https:');
            expect(prisma.pushSubscription.findUnique).not.toHaveBeenCalled();
            expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
        });

        it('allows upsert when subscription endpoint is new or already belongs to same user', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-1' },
            });

            (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-mine',
                userId: 'user-1',
            });
            (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue({
                id: 'sub-mine',
            });

            const req = new NextRequest('http://localhost/api/push/subscribe', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://fcm.googleapis.com/fcm/send/my-sub-token',
                    keys: {
                        p256dh: 'my-p256dh',
                        auth: 'my-auth',
                    },
                }),
            });

            const res = await postPushSubscribe(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(prisma.pushSubscription.upsert).toHaveBeenCalled();
        });
    });

    describe('Hardening: POST /api/plan-advanced/[goalId]/progression/apply', () => {
        it('returns 404 when progressionId does not belong to user goal', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-1' },
            });

            (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
                id: 'goal-1',
                userId: 'user-1',
            });

            (prisma.intervalProgression.findFirst as jest.Mock).mockResolvedValue(null);

            const req = new Request('http://localhost/api/plan-advanced/goal-1/progression/apply', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    progressionId: 'prog-other',
                    planStartDate: '2026-10-20',
                }),
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-1' }) };

            const res = await postProgressionApply(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(404);
            expect(json.error).toBe('Progression not found');
        });

        it('returns 400 when startWeek or endWeek exceed bounds', async () => {
            (auth as jest.Mock).mockResolvedValue({
                user: { id: 'user-1' },
            });

            (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
                id: 'goal-1',
                userId: 'user-1',
            });

            const req = new Request('http://localhost/api/plan-advanced/goal-1/progression/apply', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    inlineWorkoutType: 'INTERVALS',
                    inlineStartWeek: 1,
                    inlineEndWeek: 35, // 35 - 1 = 34 > 26 max span
                    inlineWeeks: [{ weekOffset: 0, main: [{ reps: 4, distance: 1000, pace: '4:00', restSeconds: 60 }] }],
                    planStartDate: '2026-10-20',
                }),
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-1' }) };

            const res = await postProgressionApply(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error).toContain('Invalid week bounds');
        });
    });

    describe('Hardening: POST /api/plan-advanced/[goalId]/copy-week', () => {
        it('returns 400 when scaleFactor is out of bounds (< 0.5 or > 2.0)', async () => {
            (getAuthenticatedUser as jest.Mock).mockResolvedValue({
                id: 'user-1',
            });

            (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
                id: 'goal-1',
                userId: 'user-1',
            });

            const req = new NextRequest('http://localhost/api/plan-advanced/goal-1/copy-week', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sourceWeekStart: '2026-10-01',
                    targetWeekStart: '2026-10-08',
                    scaleFactor: 3.5,
                }),
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-1' }) };

            const res = await postCopyWeek(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error).toContain('scaleFactor must be a number between 0.5 and 2.0');
        });

        it('caps copied workouts to <= 28 per operation', async () => {
            (getAuthenticatedUser as jest.Mock).mockResolvedValue({
                id: 'user-1',
            });

            (prisma.goal.findFirst as jest.Mock).mockResolvedValue({
                id: 'goal-1',
                userId: 'user-1',
            });

            const dummyWorkouts = Array.from({ length: 35 }, (_, i) => ({
                id: `w-${i}`,
                goalId: 'goal-1',
                scheduledDate: new Date('2026-10-01T08:00:00Z'),
                workoutType: 'EASY',
                description: `Run ${i}`,
                order: i,
            }));

            // Mock findMany returning 28 (since take: 28 is specified)
            (prisma.workout.findMany as jest.Mock).mockResolvedValue(dummyWorkouts.slice(0, 28));
            (prisma.workout.create as jest.Mock).mockResolvedValue({ id: 'new-w' });

            const req = new NextRequest('http://localhost/api/plan-advanced/goal-1/copy-week', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sourceWeekStart: '2026-10-01',
                    targetWeekStart: '2026-10-08',
                    scaleFactor: 1.0,
                }),
            });
            const ctx = { params: Promise.resolve({ goalId: 'goal-1' }) };

            const res = await postCopyWeek(req, ctx);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.count).toBe(28);
            expect(prisma.workout.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 28,
                })
            );
            expect(prisma.workout.create).toHaveBeenCalledTimes(28);
        });
    });
});
