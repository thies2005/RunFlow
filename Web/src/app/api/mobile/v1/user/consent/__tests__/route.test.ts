/**
 * @jest-environment node
 *
 * Regression tests for p3: HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE in the
 * MOBILE consent route, which previously recorded HEALTH_DATA WITHDRAWN
 * without any cascade at all. It must now mirror the web route: delete every
 * userId-scoped health store and disable tracking.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

const EXPECTED_HEALTH_TABLES = [
    'activity',
    'dailyFitness',
    'dailyHealthLog',
    'supplementLog',
    'supplementStack',
    'supplement',
    'nutritionLog',
    'bodyMeasurement',
    'fastingSession',
    'healthInsight',
    'dailyReadinessRecord',
    'readinessBaseline',
    'adaptedWorkout',
];

jest.mock('@/lib/db', () => {
    const deleteManyCalls: Array<{ table: string; where: unknown }> = [];
    const userUpdates: Array<{ where: unknown; data: unknown }> = [];

    const recorder = (table: string) => ({
        deleteMany: async (args: { where: unknown }) => {
            deleteManyCalls.push({ table, where: args.where });
            return { count: 1 };
        },
    });

    const prisma: any = {
        __deleteManyCalls: deleteManyCalls,
        __userUpdates: userUpdates,
        __reset() {
            deleteManyCalls.length = 0;
            userUpdates.length = 0;
        },
        userConsent: {
            create: async ({ data }: { data: Record<string, unknown> }) => ({
                id: 'consent-1',
                ...data,
            }),
        },
        user: {
            update: async (args: { where: unknown; data: unknown }) => {
                userUpdates.push(args);
                return { id: 'user-1' };
            },
        },
        activity: recorder('activity'),
        dailyFitness: recorder('dailyFitness'),
        dailyHealthLog: recorder('dailyHealthLog'),
        supplementLog: recorder('supplementLog'),
        supplementStack: recorder('supplementStack'),
        supplement: recorder('supplement'),
        nutritionLog: recorder('nutritionLog'),
        bodyMeasurement: recorder('bodyMeasurement'),
        fastingSession: recorder('fastingSession'),
        healthInsight: recorder('healthInsight'),
        dailyReadinessRecord: recorder('dailyReadinessRecord'),
        readinessBaseline: recorder('readinessBaseline'),
        adaptedWorkout: recorder('adaptedWorkout'),
        $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
    };
    return { prisma };
});

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(async () => ({ id: 'user-1', authMethod: 'jwt' })),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(async () => ({ allowed: true })),
    getClientIdentifier: jest.fn(() => 'test-client'),
    RATE_LIMITS: { general: { limit: 60, windowSeconds: 60, prefix: 'general' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

import { prisma } from '@/lib/db';

const ENGINE = prisma as any;

function buildRequest(payload: unknown): NextRequest {
    return new NextRequest('http://localhost/api/mobile/v1/user/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

describe('POST /api/mobile/v1/user/consent HEALTH_DATA withdrawal cascade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__reset();
    });

    it('runs the same health cascade as the web consent route', async () => {
        const res = await POST(buildRequest({ consents: [{ consentType: 'HEALTH_DATA', action: 'WITHDRAWN' }] }));

        expect(res.status).toBe(200);

        const deletedTables = ENGINE.__deleteManyCalls.map((call: any) => call.table).sort();
        expect(deletedTables).toEqual([...EXPECTED_HEALTH_TABLES].sort());

        expect(ENGINE.__userUpdates).toHaveLength(1);
        expect(ENGINE.__userUpdates[0]).toEqual({
            where: { id: 'user-1' },
            data: { healthTrackingEnabled: false },
        });
    });

    it('records the withdrawal without deleting on GRANTED', async () => {
        const res = await POST(buildRequest({ consentType: 'HEALTH_DATA', action: 'GRANTED' }));

        expect(res.status).toBe(200);
        expect(ENGINE.__deleteManyCalls).toHaveLength(0);
        expect(ENGINE.__userUpdates).toHaveLength(0);
    });
});
