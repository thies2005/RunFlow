/**
 * @jest-environment node
 *
 * Regression tests for p3: UNBOUNDED_HEALTH_SYNC_BATCH (the batch length
 * must be capped and entries structurally validated before the per-entry
 * findUnique+upsert transaction) and the HEALTH_DATA withdrawal
 * re-ingestion gate from p3: HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => {
    const state: { user: unknown; consent: unknown } = { user: null, consent: null };
    const transactions: number[] = [];

    const prisma: any = {
        __state: state,
        __transactions: transactions,
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
            transactions.push(Date.now());
            return fn(prisma);
        },
        user: {
            findUnique: async () => state.user,
        },
        userConsent: {
            findFirst: async () => state.consent,
        },
    };
    return { prisma };
});

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(async () => ({ id: 'user-1', authMethod: 'jwt' })),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(async () => ({ allowed: true })),
    getClientIdentifier: jest.fn(() => 'test-client'),
    RATE_LIMITS: { sync: { limit: 10, windowSeconds: 60, prefix: 'sync' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/strava/fetch', () => ({
    getStravaAthleteWeight: jest.fn(async () => null),
}));

jest.mock('@/lib/health/dailyHealth', () => ({
    upsertDailyHealthLog: jest.fn(async () => ({})),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(() => new Response(JSON.stringify({ error: 'error' }), { status: 500 })),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { prisma } from '@/lib/db';
import { upsertDailyHealthLog } from '@/lib/health/dailyHealth';

const ENGINE = prisma as any;

function buildRequest(data: unknown): NextRequest {
    return new NextRequest('http://localhost/api/mobile/v1/health/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    });
}

function consentActive() {
    // healthTrackingEnabled=false mirrors the schema default — the gate must
    // stay open for users who never touched the settings toggle.
    ENGINE.__state.user = { healthTrackingEnabled: false };
    ENGINE.__state.consent = { action: 'GRANTED' };
}

describe('POST /api/mobile/v1/health/sync-batch batch bounds', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__transactions.length = 0;
        consentActive();
    });

    it('accepts a 500-entry batch at the boundary (legitimate payload)', async () => {
        const data = Array.from({ length: 500 }, (_, i) => ({ date: '2026-10-05', steps: i + 1 }));
        const res = await POST(buildRequest(data));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({ success: true, synced: 500, stravaFallbackUsed: false });
        expect(upsertDailyHealthLog).toHaveBeenCalledTimes(500);
    });

    it('rejects a 501-entry batch with a 400 naming the cap', async () => {
        const data = Array.from({ length: 501 }, (_, i) => ({ date: '2026-10-05', steps: i + 1 }));
        const res = await POST(buildRequest(data));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('max 500');
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
        expect(ENGINE.__transactions).toHaveLength(0);
    });

    it('rejects non-array payloads (regression guard)', async () => {
        const res = await POST(buildRequest({ date: '2026-10-05', steps: 1 }));
        expect(res.status).toBe(400);
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
    });

    it('rejects an entry with a wrong-typed metric before the transaction', async () => {
        const res = await POST(buildRequest([
            { date: '2026-10-05', steps: 100 },
            { date: '2026-10-06', weight: '72.5kg' },
        ]));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('Invalid entry at index 1');
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
        expect(ENGINE.__transactions).toHaveLength(0);
    });

    it('rejects an entry with an unparseable date before the transaction', async () => {
        const res = await POST(buildRequest([{ date: 'not-a-date', steps: 100 }]));

        expect(res.status).toBe(400);
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
    });

    it('still accepts an empty batch as a no-op sync (existing behavior)', async () => {
        const res = await POST(buildRequest([]));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.synced).toBe(0);
    });
});

describe('POST /api/mobile/v1/health/sync-batch HEALTH_DATA withdrawal gate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__transactions.length = 0;
    });

    it('rejects new health rows while HEALTH_DATA consent is withdrawn', async () => {
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = { action: 'WITHDRAWN' };

        const res = await POST(buildRequest([{ date: '2026-10-05', steps: 9000, weight: 72.5 }]));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('Health data consent has been withdrawn');
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
        expect(ENGINE.__transactions).toHaveLength(0);
    });

    it('admits traffic again after a newer GRANTED consent record', async () => {
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = { action: 'GRANTED' };

        const res = await POST(buildRequest([{ date: '2026-10-05', steps: 9000 }]));

        expect(res.status).toBe(200);
        expect(upsertDailyHealthLog).toHaveBeenCalledTimes(1);
    });

    it('admits traffic when the user re-enabled tracking via settings', async () => {
        ENGINE.__state.user = { healthTrackingEnabled: true };
        ENGINE.__state.consent = { action: 'WITHDRAWN' };

        const res = await POST(buildRequest([{ date: '2026-10-05', steps: 9000 }]));

        expect(res.status).toBe(200);
        expect(upsertDailyHealthLog).toHaveBeenCalledTimes(1);
    });

    it('stays open for users who never recorded a HEALTH_DATA consent (default allow)', async () => {
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = null;

        const res = await POST(buildRequest([{ date: '2026-10-05', steps: 9000 }]));

        expect(res.status).toBe(200);
        expect(upsertDailyHealthLog).toHaveBeenCalledTimes(1);
    });
});
