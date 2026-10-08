/**
 * @jest-environment node
 *
 * HRV dimension on the daily readiness upsert: POST must persist hrvJson
 * (shaped { todayHrv, baselineHrv, hrvDelta, trendDirection }) through the
 * prisma upsert exactly like rhrJson, and GET must return it via
 * serializeDailyRecord.
 */
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => {
    const state: { user: unknown; consent: unknown; record: unknown; upserts: unknown[] } = {
        user: null,
        consent: null,
        record: null,
        upserts: [],
    };

    const prisma: any = {
        __state: state,
        user: {
            findUnique: async () => state.user,
        },
        userConsent: {
            findFirst: async () => state.consent,
        },
        dailyReadinessRecord: {
            findUnique: async () => state.record,
            upsert: async (args: unknown) => {
                state.upserts.push(args);
                return state.record;
            },
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
    RATE_LIMITS: { general: { limit: 60, windowSeconds: 60, prefix: 'general' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/errors/handler', () => ({
    handleError: jest.fn(() => new Response(JSON.stringify({ error: 'error' }), { status: 500 })),
}));

import { prisma } from '@/lib/db';

const ENGINE = prisma as any;

function buildRecord(): Record<string, unknown> {
    return {
        id: 'rec-1',
        userId: 'user-1',
        date: new Date('2026-10-08T00:00:00.000Z'),
        compositeScore: 82,
        state: 'GOOD',
        confidence: 'high',
        componentScores: [],
        reasons: ['Sleep and HRV are trending well'],
        rhrJson: { restingHr: 48 },
        sleepJson: { durationHours: 7.5 },
        loadJson: { acuteLoad: 250 },
        subjectiveJson: { feel: 7 },
        hrvJson: { todayHrv: 62, baselineHrv: 58, hrvDelta: 4, trendDirection: 'up' },
        overrideJson: null,
        computedAt: new Date('2026-10-08T06:00:00.000Z'),
        syncedAt: new Date('2026-10-08T06:05:00.000Z'),
        maxHr: 190,
        restingHr: 48,
        createdAt: new Date('2026-10-08T06:00:00.000Z'),
        updatedAt: new Date('2026-10-08T06:05:00.000Z'),
    };
}

function consentActive() {
    // healthTrackingEnabled=false mirrors the schema default — the gate must
    // stay open for users who never touched the settings toggle.
    ENGINE.__state.user = { healthTrackingEnabled: false };
    ENGINE.__state.consent = { action: 'GRANTED' };
}

function postRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/mobile/v1/readiness/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    ENGINE.__state.record = null;
    ENGINE.__state.upserts.length = 0;
    consentActive();
});

describe('POST /api/mobile/v1/readiness/daily hrvJson', () => {
    it('persists hrvJson in both the create and update branches of the upsert', async () => {
        const hrvJson = { todayHrv: 62, baselineHrv: 58, hrvDelta: 4, trendDirection: 'up' };
        ENGINE.__state.record = buildRecord();
        const res = await POST(postRequest({ date: '2026-10-08', compositeScore: 82, state: 'GOOD', hrvJson }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.hrvJson).toEqual(hrvJson);

        expect(ENGINE.__state.upserts).toHaveLength(1);
        const upsert = ENGINE.__state.upserts[0];
        expect(upsert.create.hrvJson).toEqual(hrvJson);
        expect(upsert.update.hrvJson).toEqual(hrvJson);
    });

    it('passes hrvJson through with the same undefined-not-defaulted semantics as rhrJson when absent', async () => {
        ENGINE.__state.record = { ...buildRecord(), hrvJson: null };
        const res = await POST(postRequest({ date: '2026-10-08', rhrJson: { restingHr: 48 } }));

        expect(res.status).toBe(200);
        const upsert = ENGINE.__state.upserts[0];
        expect('hrvJson' in upsert.create).toBe(true);
        expect(upsert.create.hrvJson).toBeUndefined();
        expect(upsert.update.hrvJson).toBeUndefined();
        expect(upsert.create.rhrJson).toEqual({ restingHr: 48 });
    });

    it('rejects the upsert while HEALTH_DATA consent is withdrawn', async () => {
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = { action: 'WITHDRAWN' };

        const res = await POST(postRequest({ date: '2026-10-08', hrvJson: { todayHrv: 62 } }));

        expect(res.status).toBe(400);
        expect(ENGINE.__state.upserts).toHaveLength(0);
    });
});

describe('GET /api/mobile/v1/readiness/daily hrvJson', () => {
    it('returns hrvJson from the serialized record', async () => {
        ENGINE.__state.record = buildRecord();
        const res = await GET(new NextRequest('http://localhost/api/mobile/v1/readiness/daily?date=2026-10-08'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.date).toBe('2026-10-08');
        expect(body.hrvJson).toEqual({ todayHrv: 62, baselineHrv: 58, hrvDelta: 4, trendDirection: 'up' });
        expect(body.rhrJson).toEqual({ restingHr: 48 });
    });
});
