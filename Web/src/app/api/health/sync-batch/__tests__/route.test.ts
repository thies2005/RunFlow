/**
 * @jest-environment node
 *
 * Regression tests for the WEB twin of the health sync batch (p3:
 * UNBOUNDED_HEALTH_SYNC_BATCH + HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE
 * re-ingestion gate). The web route runs the same per-entry
 * findUnique+upsert loop in one interactive transaction and has no rate
 * limiter at all, so the identical cap/gate semantics are asserted here.
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

jest.mock('@/auth', () => ({
    auth: jest.fn(async () => ({ user: { id: 'user-1' } })),
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
    return new NextRequest('http://localhost/api/health/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    });
}

describe('POST /api/health/sync-batch batch bounds and consent gate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__transactions.length = 0;
        // Default-allow state: no consent record, tracking toggle untouched
        // (schema default false) — legitimate users are not locked out.
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = null;
    });

    it('accepts a 500-entry batch at the boundary', async () => {
        const data = Array.from({ length: 500 }, (_, i) => ({ date: '2026-10-05', steps: i + 1 }));
        const res = await POST(buildRequest(data));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.synced).toBe(500);
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

    it('rejects an entry with a wrong-typed metric before the transaction', async () => {
        const res = await POST(buildRequest([{ date: '2026-10-05', steps: '9000' }]));

        expect(res.status).toBe(400);
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
        expect(ENGINE.__transactions).toHaveLength(0);
    });

    it('rejects new health rows while HEALTH_DATA consent is withdrawn', async () => {
        ENGINE.__state.consent = { action: 'WITHDRAWN' };

        const res = await POST(buildRequest([{ date: '2026-10-05', steps: 9000 }]));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('Health data consent has been withdrawn');
        expect(upsertDailyHealthLog).not.toHaveBeenCalled();
        expect(ENGINE.__transactions).toHaveLength(0);
    });
});
