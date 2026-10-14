/**
 * @jest-environment node
 *
 * Security tests for AI usage, BYOK quota enforcement, unified daily resets, and provider accounting.
 * Task SEC-2 verification suite.
 */

import {
    isByokActive,
    ensurePeriodUsageReset,
    checkUsageLimit,
    reserveUsageSlot,
    incrementUsage,
} from '../usage';
import { prisma } from '@/lib/db';

type NumberFilter = number | { lt?: number; gt?: number; lte?: number; gte?: number };

jest.mock('@/lib/db', () => {
    type Row = Record<string, unknown>;

    const rows = new Map<string, Row>();
    const providerRows = new Map<string, Row>();
    const updateManyCalls: Array<{ where: unknown; data: unknown }> = [];
    let globalSettings: Row | null = null;

    function rowMatches(row: Row, where: Record<string, unknown>): boolean {
        return Object.entries(where).every(([key, filter]) => {
            const actual = row[key];
            if (actual instanceof Date) {
                const dateFilter = filter as { lt?: Date; gt?: Date; lte?: Date; gte?: Date };
                if (dateFilter.lt !== undefined && !(actual.getTime() < dateFilter.lt.getTime())) return false;
                if (dateFilter.lte !== undefined && !(actual.getTime() <= dateFilter.lte.getTime())) return false;
                if (dateFilter.gt !== undefined && !(actual.getTime() > dateFilter.gt.getTime())) return false;
                if (dateFilter.gte !== undefined && !(actual.getTime() >= dateFilter.gte.getTime())) return false;
                return true;
            }
            if (typeof actual === 'number') {
                const numFilter = filter as NumberFilter;
                if (typeof numFilter === 'number') return actual === numFilter;
                if (numFilter.lt !== undefined && !(actual < numFilter.lt)) return false;
                if (numFilter.lte !== undefined && !(actual <= numFilter.lte)) return false;
                if (numFilter.gt !== undefined && !(actual > numFilter.gt)) return false;
                if (numFilter.gte !== undefined && !(actual >= numFilter.gte)) return false;
                return true;
            }
            return actual === filter;
        });
    }

    function applyData(row: Row, data: Record<string, unknown>): void {
        for (const [key, op] of Object.entries(data)) {
            if (op === undefined) continue;
            if (op !== null && typeof op === 'object' && 'increment' in (op as object)) {
                (row as Record<string, unknown>)[key] = ((row[key] as number) || 0) + (op as { increment: number }).increment;
            } else if (op !== null && typeof op === 'object' && 'decrement' in (op as object)) {
                (row as Record<string, unknown>)[key] = ((row[key] as number) || 0) - (op as { decrement: number }).decrement;
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
        calorieSnapsUsedToday: 0,
        mealSuggestsUsedToday: 0,
        activityFeedbackUsedToday: 0,
    });

    const mockPrisma: any = {
        __setRow(partial: Row) {
            const row = { ...defaults(), ...partial };
            rows.set(row.userId as string, row);
        },
        __getRow(userId: string) {
            return rows.get(userId) ? { ...rows.get(userId) } : null;
        },
        __setProvider(id: string, partial: Row) {
            providerRows.set(id, {
                id,
                monthlyInputTokensUsed: 0,
                monthlyOutputTokensUsed: 0,
                lastUsageReset: new Date(),
                ...partial,
            });
        },
        __getProvider(id: string) {
            return providerRows.get(id) ? { ...providerRows.get(id) } : null;
        },
        __setGlobal(settings: Row | null) {
            globalSettings = settings;
        },
        __updateManyCalls: updateManyCalls,
        __reset() {
            rows.clear();
            providerRows.clear();
            updateManyCalls.length = 0;
            globalSettings = null;
        },
        userAiSettings: {
            findUnique: async ({ where }: { where: { userId: string } }) => {
                const row = rows.get(where.userId);
                return row ? { ...row } : null;
            },
            update: async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => {
                const row = rows.get(where.userId);
                if (row) applyData(row, data);
                return row ? { ...row } : null;
            },
            updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
                updateManyCalls.push({ where: args.where, data: args.data });
                let count = 0;
                for (const row of rows.values()) {
                    if (rowMatches(row, args.where)) {
                        applyData(row, args.data);
                        count++;
                    }
                }
                return { count };
            },
        },
        globalAiSettings: {
            findUnique: async () => globalSettings ? { ...globalSettings } : null,
        },
        aiProvider: {
            findUnique: async ({ where }: { where: { id: string } }) => {
                const p = providerRows.get(where.id);
                return p ? { ...p } : null;
            },
            update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
                const p = providerRows.get(where.id);
                if (p) applyData(p, data);
                return p ? { ...p } : null;
            },
        },
        aiDailyTokenUsage: {
            upsert: async () => ({}),
        },
        aiUsageHistory: {
            create: async () => ({}),
        },
    };

    return { prisma: mockPrisma };
});

const DB = prisma as any;

describe('SEC-2 Security: BYOK Quota Bypass & Unified Daily Reset', () => {
    beforeEach(() => {
        DB.__reset();
        DB.__setGlobal({
            id: 'singleton',
            tier1DailyLimit: 10,
            tier1MonthlyLimit: 100,
            tier1DailyTokenLimit: 50000,
            tier1MonthlyTokenLimit: 500000,
            tier2DailyLimit: 25,
            tier2MonthlyLimit: 300,
            tier3DailyLimit: 50,
            tier3MonthlyLimit: 500,
        });
    });

    describe('isByokActive helper', () => {
        it('returns true when customApiKey is present and usageTier is none or missing', () => {
            expect(isByokActive({ customApiKey: 'enc:valid', usageTier: 'none' })).toBe(true);
            expect(isByokActive({ customApiKey: 'enc:valid', usageTier: null })).toBe(true);
            expect(isByokActive({ customApiKey: 'enc:valid', usageTier: undefined })).toBe(true);
        });

        it('returns false when user is on a managed tier even if customApiKey is populated', () => {
            expect(isByokActive({ customApiKey: 'enc:dummy', usageTier: 'tier1' })).toBe(false);
            expect(isByokActive({ customApiKey: 'enc:dummy', usageTier: 'tier2' })).toBe(false);
            expect(isByokActive({ customApiKey: 'enc:dummy', usageTier: 'tier3' })).toBe(false);
        });

        it('returns false when customApiKey is empty or null', () => {
            expect(isByokActive({ customApiKey: null, usageTier: 'none' })).toBe(false);
            expect(isByokActive({ customApiKey: '', usageTier: 'none' })).toBe(false);
            expect(isByokActive(null)).toBe(false);
            expect(isByokActive(undefined)).toBe(false);
        });
    });

    describe('Test 1: User on tier1 with dummy customApiKey cannot bypass limits', () => {
        it('enforces tier quota in checkUsageLimit and reserveUsageSlot', async () => {
            DB.__setRow({
                userId: 'user-attack',
                usageTier: 'tier1',
                customApiKey: 'enc:dummy',
                messagesUsedToday: 50, // exceeds tier1 limit (10)
                messagesUsedThisMonth: 50,
                lastUsageReset: new Date(),
            });

            // checkUsageLimit must reject
            const check = await checkUsageLimit('user-attack');
            expect(check.canUse).toBe(false);
            expect(check.tier).toBe('tier1');
            expect(check.reason).toMatch(/limit reached/i);

            // reserveUsageSlot must reject
            const reservation = await reserveUsageSlot('user-attack');
            expect(reservation.allowed).toBe(false);
            expect(reservation.claimed).toBe(false);
        });
    });

    describe('Test 2: User on usageTier none with valid customApiKey is true BYOK', () => {
        it('allows unlimited usage with tier byok', async () => {
            DB.__setRow({
                userId: 'user-byok',
                usageTier: 'none',
                customApiKey: 'enc:valid',
                messagesUsedToday: 500,
                messagesUsedThisMonth: 5000,
                lastUsageReset: new Date(),
            });

            const check = await checkUsageLimit('user-byok');
            expect(check.canUse).toBe(true);
            expect(check.tier).toBe('byok');
            expect(check.dailyLimit).toBe(Infinity);
            expect(check.monthlyLimit).toBe(Infinity);

            const reservation = await reserveUsageSlot('user-byok');
            expect(reservation.allowed).toBe(true);
            expect(reservation.claimed).toBe(false);
        });
    });

    describe('Test 3: ensurePeriodUsageReset resets ALL daily counters together atomically', () => {
        it('resets all 6 daily counters when called on a new day', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            DB.__setRow({
                userId: 'user-multi-feature',
                usageTier: 'tier1',
                lastUsageReset: yesterday,
                messagesUsedToday: 8,
                inputTokensUsedToday: 12000,
                outputTokensUsedToday: 4000,
                calorieSnapsUsedToday: 3,
                mealSuggestsUsedToday: 2,
                activityFeedbackUsedToday: 1,
                messagesUsedThisMonth: 40,
            });

            await ensurePeriodUsageReset('user-multi-feature');

            const row = DB.__getRow('user-multi-feature');
            expect(row.messagesUsedToday).toBe(0);
            expect(row.inputTokensUsedToday).toBe(0);
            expect(row.outputTokensUsedToday).toBe(0);
            expect(row.calorieSnapsUsedToday).toBe(0);
            expect(row.mealSuggestsUsedToday).toBe(0);
            expect(row.activityFeedbackUsedToday).toBe(0);
            // Monthly counter should remain intact since yesterday is in the same month
            expect(row.messagesUsedThisMonth).toBe(40);
        });

        it('resets monthly counters as well when called in a new month', async () => {
            const lastMonth = new Date();
            lastMonth.setDate(1);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            DB.__setRow({
                userId: 'user-monthly-reset',
                usageTier: 'tier1',
                lastUsageReset: lastMonth,
                messagesUsedToday: 5,
                messagesUsedThisMonth: 80,
                inputTokensUsedThisMonth: 200000,
                outputTokensUsedThisMonth: 50000,
                calorieSnapsUsedToday: 1,
                mealSuggestsUsedToday: 1,
                activityFeedbackUsedToday: 1,
            });

            await ensurePeriodUsageReset('user-monthly-reset');

            const row = DB.__getRow('user-monthly-reset');
            expect(row.messagesUsedToday).toBe(0);
            expect(row.messagesUsedThisMonth).toBe(0);
            expect(row.inputTokensUsedThisMonth).toBe(0);
            expect(row.outputTokensUsedThisMonth).toBe(0);
            expect(row.calorieSnapsUsedToday).toBe(0);
            expect(row.mealSuggestsUsedToday).toBe(0);
            expect(row.activityFeedbackUsedToday).toBe(0);
        });
    });

    describe('incrementUsage platform provider accounting', () => {
        it('skips platform provider accounting when user is active BYOK', async () => {
            DB.__setRow({
                userId: 'u-byok',
                usageTier: 'none',
                customApiKey: 'enc:valid',
            });
            DB.__setProvider('prov-1', { monthlyInputTokensUsed: 100 });

            await incrementUsage('u-byok', { inputTokens: 500, outputTokens: 200 }, 'prov-1');

            const provider = DB.__getProvider('prov-1');
            expect(provider.monthlyInputTokensUsed).toBe(100); // Unchanged!
        });

        it('does NOT skip platform provider accounting when user is on a managed tier with dummy key', async () => {
            DB.__setRow({
                userId: 'u-managed',
                usageTier: 'tier1',
                customApiKey: 'enc:dummy',
            });
            DB.__setProvider('prov-1', { monthlyInputTokensUsed: 100, monthlyOutputTokensUsed: 50 });

            await incrementUsage('u-managed', { inputTokens: 500, outputTokens: 200 }, 'prov-1');

            const provider = DB.__getProvider('prov-1');
            expect(provider.monthlyInputTokensUsed).toBe(600); // Incremented!
            expect(provider.monthlyOutputTokensUsed).toBe(250);
        });
    });
});
