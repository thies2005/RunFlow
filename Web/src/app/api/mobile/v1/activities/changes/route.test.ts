/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync } from '@/lib/rateLimit';

jest.mock('@/lib/db', () => ({
    prisma: {
        $transaction: jest.fn(),
    },
}));
jest.mock('@/lib/mobile/auth', () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock('@/lib/rateLimit', () => ({
    RATE_LIMITS: { activityChanges: { limit: 60, windowSeconds: 60, prefix: 'activity-changes' } },
    checkRateLimitAsync: jest.fn(),
    rateLimitHeaders: jest.fn().mockReturnValue({}),
}));

const tx = {
    activityFeedClock: { findUnique: jest.fn() },
    activity: { findMany: jest.fn() },
    activityFeedChange: { findMany: jest.fn() },
};
const userId = 'test-user';
const activity = (id: string) => ({ id, stravaId: 123n, startDate: new Date('2026-11-01T12:00:00.000Z') });
const token = (version: number, owner = userId) =>
    Buffer.from(JSON.stringify([1, owner, String(version), null])).toString('base64url');
const read = (cursor?: string) => GET(new NextRequest(
    `http://localhost/api/mobile/v1/activities/changes${cursor === undefined ? '' : `?cursor=${cursor}`}`,
));

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAuthenticatedUser).mockResolvedValue({ id: userId } as never);
    jest.mocked(checkRateLimitAsync).mockResolvedValue({ allowed: true } as never);
    (prisma.$transaction as jest.Mock).mockImplementation(fn => fn(tx));
    tx.activityFeedClock.findUnique.mockResolvedValue({ version: 5n, minimum: 0n });
    tx.activity.findMany.mockResolvedValue([]);
    tx.activityFeedChange.findMany.mockResolvedValue([]);
});

it('uses an authenticated, isolated keyset snapshot and preserves its first-page watermark', async () => {
    tx.activity.findMany.mockResolvedValueOnce(Array.from({ length: 501 }, (_, n) => activity(`act-${n}`)));
    const first = await read();
    const page = await first.json();
    expect(first.headers.get('Cache-Control')).toBe('private, no-store');
    expect(page.hasMore).toBe(true);
    expect(page.activities).toHaveLength(500);
    expect(page.activities[0]).toMatchObject({ stravaId: '123', startDate: '2026-11-01T12:00:00.000Z' });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });

    tx.activityFeedClock.findUnique.mockResolvedValueOnce({ version: 8n, minimum: 0n });
    const final = await (await read(page.cursor)).json();
    expect(tx.activity.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { userId, id: { gt: 'act-499' } },
        orderBy: { id: 'asc' },
    }));
    expect(final).toEqual({ activities: [], deletedIds: [], hasMore: false, cursor: token(5) });
});

it('returns only scoped live changes and tombstones, then advances to the visible watermark', async () => {
    tx.activityFeedChange.findMany.mockResolvedValue([
        { activityId: 'added', version: 3n, deletedAt: null },
        { activityId: 'removed', version: 5n, deletedAt: new Date() },
    ]);
    tx.activity.findMany.mockResolvedValue([activity('added')]);
    const page = await (await read(token(2))).json();
    expect(tx.activityFeedChange.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId, version: { gt: 2n } },
    }));
    expect(tx.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId, id: { in: ['added'] } },
    }));
    expect(page.activities).toHaveLength(1);
    expect(page.deletedIds).toEqual(['removed']);
    expect(page.cursor).toBe(token(5));
    expect(page.hasMore).toBe(false);
});

it('keeps the continuation at the last emitted delta when more rows remain', async () => {
    tx.activityFeedClock.findUnique.mockResolvedValueOnce({ version: 105n, minimum: 0n });
    tx.activityFeedChange.findMany.mockResolvedValueOnce(Array.from({ length: 101 }, (_, n) => ({
        activityId: `removed-${n}`, version: BigInt(5 + n), deletedAt: new Date(),
    })));
    const page = await (await read(token(4))).json();
    expect(page.deletedIds).toHaveLength(100);
    expect(page.cursor).toBe(token(104));
    expect(page.hasMore).toBe(true);
});

it('resets malformed, foreign, expired and future cursors without fetching activity rows', async () => {
    tx.activityFeedClock.findUnique.mockResolvedValue({ version: 10n, minimum: 5n });
    for (const invalid of ['broken', token(8, 'another-user'), token(4), token(11)]) {
        expect(await (await read(invalid)).json()).toMatchObject({ reset: true, activities: [], deletedIds: [] });
    }
    expect(tx.activity.findMany).not.toHaveBeenCalled();
    expect(tx.activityFeedChange.findMany).not.toHaveBeenCalled();
});

it('rejects unauthenticated and rate-limited requests before opening a transaction', async () => {
    jest.mocked(getAuthenticatedUser).mockResolvedValueOnce(null);
    expect((await read()).status).toBe(401);
    jest.mocked(checkRateLimitAsync).mockResolvedValueOnce({ allowed: false, retryAfter: 30 } as never);
    expect((await read()).status).toBe(429);
    expect(prisma.$transaction).not.toHaveBeenCalled();
});
