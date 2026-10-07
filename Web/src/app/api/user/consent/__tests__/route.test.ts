/**
 * @jest-environment node
 *
 * Regression tests for p3: HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE in the
 * web consent route. Withdrawing HEALTH_DATA consent must delete the user's
 * rows in EVERY userId-scoped health store (the original cascade missed the
 * six health models added outside the original set) and disable tracking;
 * granting must not delete anything.
 */
import { POST } from '../route';

/** Every health store the withdrawal cascade must cover, derived from
 *  prisma/schema.prisma. */
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
        // every health model the cascade can touch
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

jest.mock('@/auth', () => ({
    auth: jest.fn(async () => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(async () => ({ allowed: true })),
    getClientIdentifier: jest.fn(() => 'test-client'),
    RATE_LIMITS: { general: { limit: 60, windowSeconds: 60, prefix: 'general' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

import { prisma } from '@/lib/db';

const ENGINE = prisma as any;

function buildRequest(payload: unknown): Request {
    return new Request('http://localhost/api/user/consent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.9',
            'user-agent': 'jest',
        },
        body: JSON.stringify(payload),
    });
}

describe('POST /api/user/consent HEALTH_DATA withdrawal cascade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__reset();
    });

    it('deletes every health store and disables tracking on withdrawal', async () => {
        const res = await POST(buildRequest({ consents: [{ consentType: 'HEALTH_DATA', action: 'WITHDRAWN' }] }));

        expect(res.status).toBe(200);

        const deletedTables = ENGINE.__deleteManyCalls.map((call: any) => call.table).sort();
        expect(deletedTables).toEqual([...EXPECTED_HEALTH_TABLES].sort());

        // every delete is scoped to the withdrawing user
        for (const call of ENGINE.__deleteManyCalls) {
            const where = call.where as Record<string, unknown>;
            const userId =
                where.userId ??
                (where.supplement as Record<string, unknown> | undefined)?.userId;
            expect(userId).toBe('user-1');
        }

        expect(ENGINE.__userUpdates).toHaveLength(1);
        expect(ENGINE.__userUpdates[0]).toEqual({
            where: { id: 'user-1' },
            data: { healthTrackingEnabled: false },
        });
    });

    it('covers the six health models the original cascade missed', async () => {
        await POST(buildRequest({ consentType: 'HEALTH_DATA', action: 'WITHDRAWN' }));

        const missedByOriginal = [
            'bodyMeasurement',
            'fastingSession',
            'healthInsight',
            'dailyReadinessRecord',
            'readinessBaseline',
            'adaptedWorkout',
        ];
        const deleted = ENGINE.__deleteManyCalls.map((call: any) => call.table);
        for (const table of missedByOriginal) {
            expect(deleted).toContain(table);
        }
    });

    it('does not delete anything when HEALTH_DATA is granted', async () => {
        const res = await POST(buildRequest({ consents: [{ consentType: 'HEALTH_DATA', action: 'GRANTED' }] }));

        expect(res.status).toBe(200);
        expect(ENGINE.__deleteManyCalls).toHaveLength(0);
        expect(ENGINE.__userUpdates).toHaveLength(0);
    });

    it('does not run the health cascade for unrelated consent types', async () => {
        const res = await POST(buildRequest({ consents: [{ consentType: 'TERMS', action: 'WITHDRAWN' }] }));

        expect(res.status).toBe(200);
        expect(ENGINE.__deleteManyCalls).toHaveLength(0);
    });
});
