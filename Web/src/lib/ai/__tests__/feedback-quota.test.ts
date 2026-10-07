/**
 * @jest-environment node
 *
 * Regression tests for the activity-feedback daily quota lost update
 * (p2b: activity-feedback-daily-quota-lost-update).
 *
 * The prisma mock emulates read-committed, no-lock database semantics: reads
 * return point-in-time snapshots after a macrotask yield, while updateMany
 * evaluates its WHERE clause and applies the mutation as ONE synchronous unit
 * (a single SQL UPDATE with row locking). With the old read-compare-then-set
 * code, N concurrent regenerations all passed the same stale pre-check and
 * collapsed into a single counter increment; with the atomic reservation the
 * concurrent tests below must reject everything beyond the tier limit BEFORE
 * the operator-funded provider call.
 */
import { generateAndSaveActivityFeedback } from '../feedback';

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
                const dateFilter = filter as { lt?: Date };
                return dateFilter.lt !== undefined && actual.getTime() < dateFilter.lt.getTime();
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
            if (op !== null && typeof op === 'object' && 'increment' in (op as object)) {
                row[key] = (row[key] as number) + (op as { increment: number }).increment;
            } else if (op !== null && typeof op === 'object' && 'decrement' in (op as object)) {
                row[key] = (row[key] as number) - (op as { decrement: number }).decrement;
            } else {
                row[key] = op;
            }
        }
    }

    const defaults = (): Row => ({
        userId: '',
        usageTier: 'tier1',
        customApiKey: null,
        adminAllowed: true,
        aiEnabled: true,
        lastUsageReset: new Date(),
        activityFeedbackUsedToday: 0,
        messagesUsedToday: 0,
        messagesUsedThisMonth: 0,
        inputTokensUsedToday: 0,
        outputTokensUsedToday: 0,
        inputTokensUsedThisMonth: 0,
        outputTokensUsedThisMonth: 0,
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
        activity: {
            findFirst: async () => ({ id: 'act-1', userId: 'u1', name: 'Run' }),
        },
        activityAiFeedback: {
            findUnique: jest.fn(async () => null),
            upsert: jest.fn(async () => ({ id: 'fb-1', activityId: 'act-1' })),
        },
        userAiSettings: {
            findUnique: async ({ where }: { where: { userId: string } }) => {
                await new Promise((resolve) => setImmediate(resolve));
                const row = rows.get(where.userId);
                return row ? { ...row } : null;
            },
            update: async () => null,
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

jest.mock('@/lib/ai', () => ({
    getAiConfigForModel: jest.fn(async () => ({ id: 'provider-1', name: 'p' })),
    buildUserContext: jest.fn(async () => ({ athlete: 'data' })),
    buildActivityContext: jest.fn(async () => ({
        activity: {
            id: 'act-1',
            name: 'Morning Run',
            date: '2026-10-06',
            type: 'RUN',
            distance: 10000,
            duration: 2400,
            pace: 240,
        },
        plannedWorkout: null,
    })),
    formatContextForAi: jest.fn(() => 'athlete context'),
    checkUsageLimit: jest.fn(async () => ({ canUse: true })),
    ACTIVITY_FEEDBACK_PROMPTS: { combined: 'combined prompt' },
}));

jest.mock('@/lib/ai/prompts', () => ({
    fenceUntrusted: jest.fn((value: unknown) => String(value ?? '')),
}));

jest.mock('@/lib/ai/providers', () => ({
    generateCompletion: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { prisma } from '@/lib/db';
import { generateCompletion } from '@/lib/ai/providers';

const ENGINE = prisma as any;

const RAW_FEEDBACK = '## Planned Comparison\nOn pace.\n## Progress Analysis\nImproving.\n## Goal Trajectory\nOn track.';

function defaultGlobalSettings() {
    ENGINE.__setGlobal({
        id: 'singleton',
        activityFeedbackModel: 'test-model',
        tier1ActivityFeedbackLimit: 1,
        tier2ActivityFeedbackLimit: 3,
        tier3ActivityFeedbackLimit: 6,
    });
}

describe('generateAndSaveActivityFeedback daily quota reservation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__reset();
        defaultGlobalSettings();
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1' });
        (generateCompletion as jest.Mock).mockResolvedValue(RAW_FEEDBACK);
    });

    it('enforces the tier limit sequentially (control)', async () => {
        const first = await generateAndSaveActivityFeedback('act-1', 'u1', true);
        expect(first.cached).toBe(false);

        await expect(generateAndSaveActivityFeedback('act-1', 'u1', true)).rejects.toThrow(
            'Daily limit of 1 activity analyses reached for your tier.'
        );

        expect(generateCompletion).toHaveBeenCalledTimes(1);
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(1);
    });

    it('rejects concurrent regenerations beyond the limit with exactly one provider call', async () => {
        // The audit race: five concurrent regenerate requests while the first
        // sits inside the multi-second provider call. The reservation must
        // reject the other four BEFORE any provider spend.
        const results = await Promise.allSettled(
            Array.from({ length: 5 }, () => generateAndSaveActivityFeedback('act-1', 'u1', true))
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        expect(succeeded).toHaveLength(1);
        expect(rejected).toHaveLength(4);
        for (const r of rejected) {
            expect((r as PromiseRejectedResult).reason.message).toBe(
                'Daily limit of 1 activity analyses reached for your tier.'
            );
        }
        expect(generateCompletion).toHaveBeenCalledTimes(1);
        // The lost update is gone: five attempts advanced the counter by one.
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(1);
    });

    it('claims the slot with a conditional update guarded by the tier limit', async () => {
        await generateAndSaveActivityFeedback('act-1', 'u1', true);

        // updateMany call order: [0] lazy day rollover, [1] claim, then no
        // further writes on the success path (the old post-call read-then-set
        // block is gone).
        const claim = ENGINE.__updateManyCalls[1];
        expect(claim.where).toEqual({
            userId: 'u1',
            activityFeedbackUsedToday: { lt: 1 },
        });
        expect(claim.data.activityFeedbackUsedToday).toEqual({ increment: 1 });
        expect(ENGINE.__updateManyCalls).toHaveLength(2);
    });

    it('releases the reservation when the provider call fails', async () => {
        (generateCompletion as jest.Mock).mockRejectedValue(new Error('provider exploded'));

        await expect(generateAndSaveActivityFeedback('act-1', 'u1', true)).rejects.toThrow('provider exploded');

        // Claim incremented to 1, then the guarded decrement refunded it.
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(0);
        const refund = ENGINE.__updateManyCalls[2];
        expect(refund.where).toEqual({ userId: 'u1', activityFeedbackUsedToday: { gt: 0 } });
        expect(refund.data.activityFeedbackUsedToday).toEqual({ decrement: 1 });

        // The released slot is claimable again.
        (generateCompletion as jest.Mock).mockResolvedValue(RAW_FEEDBACK);
        const retry = await generateAndSaveActivityFeedback('act-1', 'u1', true);
        expect(retry.cached).toBe(false);
    });

    it('releases the reservation when persisting the feedback fails', async () => {
        const upsert = prisma.activityAiFeedback.upsert as unknown as jest.Mock;
        upsert.mockRejectedValueOnce(new Error('db write failed'));

        await expect(generateAndSaveActivityFeedback('act-1', 'u1', true)).rejects.toThrow('db write failed');

        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(0);
    });

    it('does not claim a slot when cached feedback is returned', async () => {
        (prisma.activityAiFeedback.findUnique as unknown as jest.Mock).mockResolvedValueOnce({
            id: 'fb-cached',
            activityId: 'act-1',
        });

        const result = await generateAndSaveActivityFeedback('act-1', 'u1', false);

        expect(result.cached).toBe(true);
        expect(generateCompletion).not.toHaveBeenCalled();
        expect(ENGINE.__updateManyCalls).toHaveLength(0);
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(0);
    });

    it('does not claim a slot for BYOK users on the none tier', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'none', customApiKey: 'sk-own' });

        const result = await generateAndSaveActivityFeedback('act-1', 'u1', true);

        expect(result.cached).toBe(false);
        expect(generateCompletion).toHaveBeenCalledTimes(1);
        expect(ENGINE.__updateManyCalls).toHaveLength(0);
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(0);
    });

    it('rolls the counter over on a new day before claiming', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', lastUsageReset: yesterday, activityFeedbackUsedToday: 1 });

        const result = await generateAndSaveActivityFeedback('act-1', 'u1', true);

        expect(result.cached).toBe(false);
        expect(ENGINE.__getRow('u1').activityFeedbackUsedToday).toBe(1); // 0 after rollover + 1 claim

        const rollover = ENGINE.__updateManyCalls[0];
        expect(rollover.where).toEqual({
            userId: 'u1',
            lastUsageReset: { lt: expect.any(Date) },
        });
        expect(rollover.data).toEqual({ activityFeedbackUsedToday: 0 });
    });
});
