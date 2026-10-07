/**
 * @jest-environment node
 *
 * Regression tests for the CalorieSnap daily quota lost update in the
 * mobile ai-scan route (p3: caloriesnap.quota.lost-update) — the multipart
 * mirror of the web scan-image flow. Same harness contract as
 * src/app/api/health/nutrition/scan-image/__tests__/route.test.ts: the
 * prisma mock emulates read-committed snapshots with synchronous atomic
 * updateMany, so the pre-call reservation must bound provider spend under
 * concurrency.
 */
import { POST } from '../route';
import type { NextRequest } from 'next/server';

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
        adminAllowed: true,
        aiEnabled: true,
        lastUsageReset: new Date(),
        calorieSnapsUsedToday: 0,
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
        aiProvider: {
            findFirst: async () => ({ id: 'p1', type: 'google', isActive: true, baseUrl: 'https://gemini.example', apiKey: 'enc' }),
        },
    };

    return { prisma };
});

jest.mock('@/lib/ai/providers', () => ({
    safeFetch: jest.fn(),
    tryDecryptAiKey: jest.fn(() => 'test-key'),
}));

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(async () => ({ id: 'u1', authMethod: 'jwt' })),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(async () => ({ allowed: true })),
    getClientIdentifier: jest.fn(() => 'test-client'),
    RATE_LIMITS: { general: { limit: 60, windowSeconds: 60, prefix: 'general' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/utils/imageMagic', () => ({
    detectImageMime: jest.fn(() => 'image/jpeg'),
}));

import { prisma } from '@/lib/db';
import { safeFetch } from '@/lib/ai/providers';

const ENGINE = prisma as any;

const VALID_SCAN = JSON.stringify({
    mealName: 'Oatmeal',
    items: [{ name: 'Oats', estimatedGrams: 40, calories: 150, protein: 5, carbs: 27, fats: 3 }],
    totalCalories: 150,
    totalProtein: 5,
    totalCarbs: 27,
    totalFats: 3,
    confidence: 'high',
});

function geminiOk(text: string) {
    return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
        text: async () => '',
    };
}

/** The route reads only headers + formData(); the repo's global Request mock
 *  has no formData(), so a plain object stands in for the multipart request. */
function buildRequest(): NextRequest {
    return {
        headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x' }),
        formData: async () => {
            const fd = new FormData();
            fd.append('caption', 'bowl of oatmeal');
            return fd;
        },
    } as unknown as NextRequest;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => { resolve = res; });
    return { promise, resolve };
}

async function waitFor(condition: () => boolean, ticks = 50): Promise<void> {
    for (let i = 0; i < ticks && !condition(); i++) {
        await new Promise((resolve) => setImmediate(resolve));
    }
}

describe('POST /api/mobile/v1/health/nutrition/ai-scan CalorieSnap quota reservation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ENGINE.__reset();
        ENGINE.__setGlobal({
            id: 'singleton',
            calorieSnapModel: 'gemini-test',
            tier1CalorieSnapLimit: 1,
            tier2CalorieSnapLimit: 3,
            tier3CalorieSnapLimit: 6,
        });
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1' });
        (safeFetch as jest.Mock).mockImplementation(async () => geminiOk(VALID_SCAN));
    });

    it('enforces the tier limit sequentially (control)', async () => {
        const first = await POST(buildRequest());
        expect(first.status).toBe(200);
        expect(ENGINE.__getRow('u1').calorieSnapsUsedToday).toBe(1);

        const second = await POST(buildRequest());
        expect(second.status).toBe(429);

        expect(safeFetch).toHaveBeenCalledTimes(1);
    });

    it('rejects concurrent scans beyond the limit with exactly one provider call', async () => {
        const inFlight = deferred<ReturnType<typeof geminiOk>>();
        (safeFetch as jest.Mock).mockImplementation(() => inFlight.promise);

        const requests = [POST(buildRequest()), POST(buildRequest())];

        await waitFor(() => (safeFetch as jest.Mock).mock.calls.length === 1);
        inFlight.resolve(geminiOk(VALID_SCAN));

        const results = await Promise.all(requests);
        const statuses = results.map((r) => r.status).sort();
        expect(statuses).toEqual([200, 429]);

        expect(safeFetch).toHaveBeenCalledTimes(1);
        expect(ENGINE.__getRow('u1').calorieSnapsUsedToday).toBe(1);
    });

    it('releases the reservation when the provider call fails', async () => {
        (safeFetch as jest.Mock).mockImplementation(async () => ({
            ok: false,
            status: 503,
            json: async () => ({}),
            text: async () => 'unavailable',
        }));

        const res = await POST(buildRequest());
        expect(res.status).toBe(502);
        expect(ENGINE.__getRow('u1').calorieSnapsUsedToday).toBe(0);

        const counterWrites = ENGINE.__updateManyCalls.filter(
            (call: any) => typeof call.data.calorieSnapsUsedToday === 'object'
        );
        expect(counterWrites).toHaveLength(2); // claim + refund
        expect(counterWrites[1].data.calorieSnapsUsedToday).toEqual({ decrement: 1 });
    });

    it('does not claim a slot for BYOK users on the none tier', async () => {
        ENGINE.__setRow({ userId: 'u1', usageTier: 'none' });

        const first = await POST(buildRequest());
        const second = await POST(buildRequest());
        expect(first.status).toBe(200);
        expect(second.status).toBe(200);

        expect(safeFetch).toHaveBeenCalledTimes(2);
        expect(ENGINE.__getRow('u1').calorieSnapsUsedToday).toBe(0);
        const counterWrites = ENGINE.__updateManyCalls.filter(
            (call: any) => typeof call.data.calorieSnapsUsedToday === 'object'
        );
        expect(counterWrites).toHaveLength(0);
    });

    it('rolls the counter over on a new day before claiming', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        ENGINE.__setRow({ userId: 'u1', usageTier: 'tier1', lastUsageReset: yesterday, calorieSnapsUsedToday: 1 });

        const res = await POST(buildRequest());
        expect(res.status).toBe(200);
        expect(ENGINE.__getRow('u1').calorieSnapsUsedToday).toBe(1);
    });
});
