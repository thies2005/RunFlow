/**
 * @jest-environment node
 *
 * Regression tests for the chat quota check-then-increment overshoot
 * (p2b: chat-quota-check-then-increment-across-provider-stream).
 *
 * The prisma mock below emulates the database semantics that make the fix
 * work: reads return point-in-time snapshots after a macrotask yield, while
 * updateMany evaluates its WHERE clause and applies the mutation as ONE
 * synchronous unit — exactly what a single SQL `UPDATE ... WHERE` with row
 * locking guarantees. If the reservation were still a read-then-decide
 * (check-then-act), the concurrent tests below would admit more than the
 * remaining headroom.
 */
import { reserveUsageSlot, releaseUsageReservation, incrementUsage } from '../usage';

type NumberFilter = number | { lt?: number; gt?: number };

jest.mock('@/lib/db', () => {
    type Row = Record<string, unknown>;

    const rows = new Map<string, Row>();
    const updateManyCalls: Array<{ where: unknown; data: unknown }> = [];
    let globalSettings: Row | null = null;

    function rowMatches(row: Row, where: Record<string, unknown>): boolean {
        return Object.entries(where).every(([key, filter]) => {
            const actual = row[key];
            if (actual instanceof Date) {
                const dateFilter = filter as { lt?: Date; gt?: Date };
                if (dateFilter.lt !== undefined && !(actual.getTime() < dateFilter.lt.getTime())) return false;
                if (dateFilter.gt !== undefined && !(actual.getTime() > dateFilter.gt.getTime())) return false;
                return true;
            }
            if (typeof actual === 'number') {
                const numFilter = filter as NumberFilter;
                if (typeof numFilter === 'number') return actual === numFilter;
                if (numFilter.lt !== undefined && !(actual < numFilter.lt)) return false;
                if (numFilter.gt !== undefined && !(actual > numFilter.gt)) return false;
                return true;
            }
            return actual === filter;
        });
    }

    function applyData(row: Row, data: Record<string, unknown>): void {
        for (const [key, op] of Object.entries(data)) {
            // Prisma skips undefined fields; the mock must not clobber values.
            if (op === undefined) continue;
            if (op !== null && typeof op === 'object' && 'increment' in (op as object)) {
                (row as Record<string, unknown>)[key] = (row[key] as number) + (op as { increment: number }).increment;
            } else if (op !== null && typeof op === 'object' && 'decrement' in (op as object)) {
                (row as Record<string, unknown>)[key] = (row[key] as number) - (op as { decrement: number }).decrement;
            } else {
                row[key] = op;
            }
        }
    }

    const defaults = (): Row => ({
        userId: '',
        usageTier: 'tier1',
        customApiKey: null,
        lastUsageReset: new Date(),
        messagesUsedToday: 0,
        messagesUsedThisMonth: 0,
        inputTokensUsedToday: 0,
        outputTokensUsedToday: 0,
        inputTokensUsedThisMonth: 0,
        outputTokensUsedThisMonth: 0,
        activityFeedbackUsedToday: 0,
    });

    const prisma: any = {
        __setRow(partial: Row) {
            const row = { ...defaults(), ...partial };
            rows.set(row.userId as string, row);
        },
        __getRow(userId: string) {
            return rows.get(userId) ? { ...rows.get(userId) } : null;
        },
        __setGlobal(settings: Row | null) {
            globalSettings = settings;
        },
        __updateManyCalls: updateManyCalls,
        __reset() {
            rows.clear();
            updateManyCalls.length = 0;
            globalSettings = null;
        },
        userAiSettings: {
            // Reads yield a macrotask and return a snapshot copy, like a DB round trip.
            findUnique: async ({ where }: { where: { userId: string } }) => {
                await new Promise((resolve) => setImmediate(resolve));
                const row = rows.get(where.userId);
                return row ? { ...row } : null;
            },
            update: async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => {
                const row = rows.get(where.userId);
                if (row) applyData(row, data);
                return row ? { ...row } : null;
            },
            // Atomic conditional update: WHERE evaluation and the mutation are
            // one synchronous unit, mirroring a single SQL UPDATE statement.
            updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
                updateManyCalls.push({ where: args.where, data: args.data });
                const matched: Row[] = [];
                for (const row of rows.values()) {
                    if (rowMatches(row, args.where)) matched.push(row);
                }
                for (const row of matched) {
                    applyData(row, args.data);
                }
                return { count: matched.length };
            },
        },
        globalAiSettings: {
            findUnique: async () => globalSettings,
        },
    };

    return { prisma };
});

import { prisma } from '@/lib/db';

const ENGINE = prisma as any;

describe('reserveUsageSlot (atomic chat quota reservation)', () => {
    beforeEach(() => {
        ENGINE.__reset();
        // A truthy global settings row (the real singleton always exists) so
        // getTierLimits applies its per-tier defaults.
        ENGINE.__setGlobal({});
    });

    it('claims one message slot via a conditional update guarded by every cap', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1' });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation).toEqual({ allowed: true, claimed: true });

        // The first two updateMany calls are the lazy rollovers (no match);
        // the third is the claim. The WHERE clause IS the quota gate, so it
        // must guard on every capped counter.
        const claim = ENGINE.__updateManyCalls[2];
        expect(claim).toBeDefined();
        expect(claim.where).toEqual({
            userId: 'u1',
            messagesUsedToday: { lt: 10 },           // tier1 default daily
            messagesUsedThisMonth: { lt: 100 },      // tier1 default monthly
            inputTokensUsedToday: { lt: 50000 },     // tier1 default daily tokens
            outputTokensUsedToday: { lt: 50000 },
            inputTokensUsedThisMonth: { lt: 500000 }, // tier1 default monthly tokens
            outputTokensUsedThisMonth: { lt: 500000 },
        });
        expect(claim.data).toEqual({
            messagesUsedToday: { increment: 1 },
            messagesUsedThisMonth: { increment: 1 },
            lastUsageReset: expect.any(Date),
        });
        expect(ENGINE.__getRow('u1').messagesUsedToday).toBe(1);
    });

    it('admits exactly one of N concurrent requests when the daily cap has one slot left', async () => {
        // The audit reproduction: tier1 daily cap 10, counter at 9, ten
        // concurrent chat admissions. The old check-then-increment admitted
        // all 10 against the same stale snapshot.
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 9 });

        const results = await Promise.all(
            Array.from({ length: 10 }, () => reserveUsageSlot('u1'))
        );

        const allowed = results.filter((r) => r.allowed);
        expect(allowed).toHaveLength(1);
        expect(ENGINE.__getRow('u1').messagesUsedToday).toBe(10);
    });

    it('admits exactly the remaining headroom under concurrency', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 7 });

        const results = await Promise.all(
            Array.from({ length: 10 }, () => reserveUsageSlot('u1'))
        );

        expect(results.filter((r) => r.allowed)).toHaveLength(3);
        expect(ENGINE.__getRow('u1').messagesUsedToday).toBe(10);
    });

    it('rejects when a daily token cap is already reached', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', inputTokensUsedToday: 50000 });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation.allowed).toBe(false);
        expect(reservation.claimed).toBe(false);
        expect(reservation.reason).toBe('Daily or monthly AI message/token limit reached');
        expect(ENGINE.__getRow('u1').messagesUsedToday).toBe(0);
    });

    it('rejects when the monthly message cap is already reached', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedThisMonth: 100 });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation.allowed).toBe(false);
    });

    it('rolls stale daily counters over before guarding on them', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        ENGINE.__setRow({
            userId: 'u1',
            usageTier: 'tier1',
            lastUsageReset: yesterday,
            messagesUsedToday: 10,        // capped yesterday
            messagesUsedThisMonth: 50,    // below the monthly cap either way
        });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation.allowed).toBe(true);
        expect(ENGINE.__getRow('u1').messagesUsedToday).toBe(1); // rolled over then claimed
    });

    it('rolls monthly counters over when the last reset was a previous month', async () => {
        const lastMonth = new Date();
        lastMonth.setDate(1);
        lastMonth.setMonth(lastMonth.getMonth() - 1); // 1st of previous month
        ENGINE.__setRow({
            userId: 'u1',
            usageTier: 'tier1',
            lastUsageReset: lastMonth,
            messagesUsedThisMonth: 100,
            inputTokensUsedThisMonth: 500000,
        });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation.allowed).toBe(true);
        expect(ENGINE.__getRow('u1').messagesUsedThisMonth).toBe(1);
    });

    it('allows BYOK users without claiming a tier slot', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'none', customApiKey: 'sk-own-key' });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation).toEqual({ allowed: true, claimed: false });
        // Only the two no-op rollover statements ran; nothing touched counters.
        for (const call of ENGINE.__updateManyCalls) {
            expect((call.data as Record<string, unknown>).messagesUsedToday).toBeUndefined();
        }
    });

    it('rejects tier-less users without an own key', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'none' });

        const reservation = await reserveUsageSlot('u1');

        expect(reservation.allowed).toBe(false);
        expect(reservation.reason).toBe('Add your own API key to use AI features');
    });

    it('rejects users without settings', async () => {
        const reservation = await reserveUsageSlot('missing');

        expect(reservation.allowed).toBe(false);
        expect(reservation.reason).toBe('AI not configured');
    });

    it('uses admin-configured tier limits when present', async () => {
        ENGINE.__setGlobal({ tier1DailyLimit: 2, tier1MonthlyLimit: 5 });
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 1 });

        const first = await reserveUsageSlot('u1');
        const second = await reserveUsageSlot('u1');

        expect(first.allowed).toBe(true);
        expect(second.allowed).toBe(false);
        expect(ENGINE.__updateManyCalls[2].where.messagesUsedToday).toEqual({ lt: 2 });
    });
});

describe('releaseUsageReservation (refund on failure)', () => {
    beforeEach(() => {
        ENGINE.__reset();
        // A truthy global settings row (the real singleton always exists) so
        // getTierLimits applies its per-tier defaults.
        ENGINE.__setGlobal({});
    });

    it('decrements the claimed message counters', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 4, messagesUsedThisMonth: 40 });

        await releaseUsageReservation('u1');

        const row = ENGINE.__getRow('u1');
        expect(row.messagesUsedToday).toBe(3);
        expect(row.messagesUsedThisMonth).toBe(39);
        const refund = ENGINE.__updateManyCalls[0];
        expect(refund.where).toEqual({
            userId: 'u1',
            messagesUsedToday: { gt: 0 },
            messagesUsedThisMonth: { gt: 0 },
        });
    });

    it('never drives the counters negative (guarded decrement)', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 0, messagesUsedThisMonth: 0 });

        await releaseUsageReservation('u1');

        // The statement ran but matched nothing (both guards are gt: 0).
        expect(ENGINE.__updateManyCalls).toHaveLength(1);
        const row = ENGINE.__getRow('u1');
        expect(row.messagesUsedToday).toBe(0);
        expect(row.messagesUsedThisMonth).toBe(0);
    });
});

describe('incrementUsage settlement after a reservation', () => {
    beforeEach(() => {
        ENGINE.__reset();
        // A truthy global settings row (the real singleton always exists) so
        // getTierLimits applies its per-tier defaults.
        ENGINE.__setGlobal({});
    });

    it('records only token deltas when the message was already counted', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 10 });

        await incrementUsage('u1', { inputTokens: 6000, outputTokens: 1000 }, undefined, {
            messagesAlreadyCounted: true,
        });

        const row = ENGINE.__getRow('u1');
        expect(row.messagesUsedToday).toBe(10);      // not re-counted
        expect(row.messagesUsedThisMonth).toBe(0);   // not re-counted
        expect(row.inputTokensUsedToday).toBe(6000);
        expect(row.outputTokensUsedToday).toBe(1000);
    });

    it('still counts the message when no reservation claimed it (legacy callers)', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1' });

        await incrementUsage('u1', { inputTokens: 100, outputTokens: 50 });

        const row = ENGINE.__getRow('u1');
        expect(row.messagesUsedToday).toBe(1);
        expect(row.messagesUsedThisMonth).toBe(1);
        expect(row.inputTokensUsedToday).toBe(100);
    });

    it('reservation followed by settled stream counts the message exactly once', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', messagesUsedToday: 9 });

        // The exact route order: reserve -> provider work -> settle.
        const runOneChat = async () => {
            const reservation = await reserveUsageSlot('u1');
            if (!reservation.allowed) return false;
            try {
                // (provider stream would happen here)
                await incrementUsage('u1', { inputTokens: 6000, outputTokens: 1000 }, undefined, {
                    messagesAlreadyCounted: reservation.claimed,
                });
                return true;
            } catch (error) {
                await releaseUsageReservation('u1');
                throw error;
            }
        };

        const results = await Promise.allSettled(Array.from({ length: 10 }, () => runOneChat()));

        const delivered = results.filter((r) => r.status === 'fulfilled' && r.value === true);
        expect(delivered).toHaveLength(1);
        const row = ENGINE.__getRow('u1');
        expect(row.messagesUsedToday).toBe(10);        // exactly at the cap
        expect(row.messagesUsedThisMonth).toBe(1);
        expect(row.inputTokensUsedToday).toBe(6000);   // only the delivered chat
    });
});
