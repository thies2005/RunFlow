/**
 * @jest-environment node
 *
 * Regression tests for the session-replay unbounded events intake
 * (p2b: session-replay unbounded-events-intake).
 *
 * The route previously trusted the browser recorder's client-side 500-event
 * flush cap and 500-char clamps: it validated shape only, spread every event
 * property verbatim, and ran the backtracking redaction regexes over
 * attacker-sized strings before persisting the whole array to an
 * unconstrained Json column. The server now enforces the recorder contract:
 * event count, per-event size and total payload bounds BEFORE any redaction
 * work, a whitelisted persisted shape, length-bounded redaction, and a
 * per-user retention cap.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('@/lib/admin/auth', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(() => 'client-1'),
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        sessionReplay: {
            create: jest.fn(async () => ({ id: 'replay-1' })),
            count: jest.fn(async () => 1),
            findMany: jest.fn(async () => []),
            deleteMany: jest.fn(async () => ({ count: 0 })),
        },
    },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync } from '@/lib/rateLimit';

const ROUTE_URL = 'http://localhost:3000/api/session-replay';

function post(body: unknown): Promise<Response> {
    return POST(new NextRequest(ROUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }));
}

function event(partial: Record<string, unknown> = {}): Record<string, unknown> {
    return { type: 'click', timestamp: 1700000000000, data: { tagName: 'BUTTON' }, ...partial };
}

describe('POST /api/session-replay intake bounds', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
    });

    it('persists a well-formed intake with a whitelisted event shape', async () => {
        const response = await post({
            sessionId: 'sess-1',
            events: [
                event({
                    attackerProperty: 'x'.repeat(400),
                    data: { tagName: 'INPUT', value: 'hello', nested: { deep: 'drop me' } },
                }),
            ],
            duration: 42,
            routePath: '/dashboard',
        });

        expect(response.status).toBe(200);
        const createArgs = (prisma.sessionReplay.create as jest.Mock).mock.calls[0][0];
        expect(createArgs.data.userId).toBe('user-1');
        expect(createArgs.data.sessionId).toBe('sess-1');
        expect(createArgs.data.duration).toBe(42);
        expect(createArgs.data.routePath).toBe('/dashboard');
        expect(createArgs.data.events).toEqual([
            {
                type: 'click',
                timestamp: 1700000000000,
                // Unknown event properties are dropped; nested structures inside
                // data are never persisted verbatim.
                data: { tagName: 'INPUT', value: 'hello', nested: '[REDACTED_STRUCTURE]' },
            },
        ]);
        const persistedKeys = Object.keys(createArgs.data.events[0]);
        expect(persistedKeys).toEqual(expect.arrayContaining(['type', 'timestamp', 'data']));
        expect(persistedKeys).not.toContain('attackerProperty');
    });

    it('rejects more than 500 events before any sanitization work', async () => {
        const events = Array.from({ length: 501 }, () => event());

        const response = await post({ sessionId: 'sess-1', events, duration: 1 });

        expect(response.status).toBe(413);
        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('rejects a single oversized event (per-event byte cap)', async () => {
        const bigEvent = event({ data: { blob: 'a'.repeat(3000) } });

        const response = await post({ sessionId: 'sess-1', events: [bigEvent], duration: 1 });

        expect(response.status).toBe(413);
        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('rejects when the total payload exceeds the budget even with small events', async () => {
        // 300 events of ~1.9KB each: each fits the per-event cap, together they
        // blow the 512KB total budget.
        const events = Array.from({ length: 300 }, () => event({ data: { blob: 'b'.repeat(1900) } }));

        const response = await post({ sessionId: 'sess-1', events, duration: 1 });

        expect(response.status).toBe(413);
        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('rejects a multi-megabyte string on a non-data event key by per-event size', async () => {
        const response = await post({
            sessionId: 'sess-1',
            events: [event({ bigField: 'x'.repeat(1_000_000) })],
            duration: 0,
        });

        expect(response.status).toBe(413);
        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('requires a non-empty string sessionId bounded in length', async () => {
        await expect(post({ sessionId: '', events: [event()] })).resolves.toMatchObject({ status: 400 });
        await expect(post({ sessionId: 123, events: [event()] })).resolves.toMatchObject({ status: 400 });
        await expect(post({ sessionId: 's'.repeat(129), events: [event()] })).resolves.toMatchObject({ status: 400 });
        await expect(post({ events: [event()] })).resolves.toMatchObject({ status: 400 });

        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('requires a non-empty events array', async () => {
        const response = await post({ sessionId: 'sess-1', events: [] });

        expect(response.status).toBe(400);
        expect(prisma.sessionReplay.create).not.toHaveBeenCalled();
    });

    it('returns 401 without authentication', async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        const response = await post({ sessionId: 'sess-1', events: [event()] });

        expect(response.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: false });

        const response = await post({ sessionId: 'sess-1', events: [event()] });

        expect(response.status).toBe(429);
    });
});

describe('POST /api/session-replay redaction bounds', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
    });

    it('truncates oversized values to 500 chars BEFORE running the redaction regexes', async () => {
        // A 1,800-char run of regex-hostile alphanumerics: must come out as
        // exactly 500 chars, proving truncation happens first (the regexes
        // never see more than 500 chars).
        const response = await post({
            sessionId: 'sess-1',
            events: [event({ data: { pad: 'A1b2C3'.repeat(300) } })],
            duration: 0,
        });

        expect(response.status).toBe(200);
        const persisted = (prisma.sessionReplay.create as jest.Mock).mock.calls[0][0].data.events[0];
        expect(persisted.data.pad).toHaveLength(500);
        expect(persisted.data.pad).toBe('A1b2C3'.repeat(300).substring(0, 500));
    });

    it('redacts emails and bearer tokens in data strings', async () => {
        const response = await post({
            sessionId: 'sess-1',
            events: [
                event({ data: { email: 'user@example.com', auth: 'Bearer abc123def456' } }),
            ],
            duration: 0,
        });

        expect(response.status).toBe(200);
        const persisted = (prisma.sessionReplay.create as jest.Mock).mock.calls[0][0].data.events[0];
        expect(persisted.data.email).toBe('[REDACTED_EMAIL]');
        expect(persisted.data.auth).toBe('Bearer [REDACTED_TOKEN]');
    });

    it('clamps type, routePath and duration', async () => {
        const response = await post({
            sessionId: 'sess-1',
            events: [event({ type: 'T'.repeat(80) })],
            duration: 1e15,
            routePath: '/p'.repeat(300),
        });

        expect(response.status).toBe(200);
        const args = (prisma.sessionReplay.create as jest.Mock).mock.calls[0][0].data;
        expect(args.events[0].type).toHaveLength(32);
        expect(args.routePath).toHaveLength(200);
        expect(args.duration).toBeLessThanOrEqual(2_147_483_647);
    });
});

describe('POST /api/session-replay retention cap', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
    });

    it('trims the oldest replays beyond the per-user cap after storing', async () => {
        (prisma.sessionReplay.count as jest.Mock).mockResolvedValue(102);
        (prisma.sessionReplay.findMany as jest.Mock).mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

        const response = await post({ sessionId: 'sess-1', events: [event()], duration: 0 });

        expect(response.status).toBe(200);
        expect(prisma.sessionReplay.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
        expect(prisma.sessionReplay.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            select: { id: true },
            orderBy: { timestamp: 'asc' },
            take: 2,
        });
        expect(prisma.sessionReplay.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ['r1', 'r2'] } },
        });
    });

    it('does not trim when under the per-user cap', async () => {
        (prisma.sessionReplay.count as jest.Mock).mockResolvedValue(100);

        const response = await post({ sessionId: 'sess-1', events: [event()], duration: 0 });

        expect(response.status).toBe(200);
        expect(prisma.sessionReplay.findMany).not.toHaveBeenCalled();
        expect(prisma.sessionReplay.deleteMany).not.toHaveBeenCalled();
    });

    it('still acknowledges the intake when the retention trim fails', async () => {
        (prisma.sessionReplay.count as jest.Mock).mockRejectedValue(new Error('db down'));

        const response = await post({ sessionId: 'sess-1', events: [event()], duration: 0 });

        expect(response.status).toBe(200);
    });
});
