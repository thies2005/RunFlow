/**
 * @jest-environment node
 *
 * Regression tests for the uncapped query-keyed provider cache upsert
 * (p2b: uncapped-query-keyed-food-cache-upsert).
 *
 * Every authenticated mobile food search used to mint permanent, uncapped
 * rows in OffFoodCache / FatSecretFoodCache keyed by attacker-chosen query
 * strings. The shared library now bounds the query (length + normalization)
 * and, after every cache write, prunes entries older than 90 days and trims
 * the table to 150,000 rows oldest-first — mirroring the hygiene the web
 * search-off / search-fs routes already applied inline.
 */
import {
    searchOpenFoodFacts,
    searchFatSecret,
    normalizeFoodSearchQuery,
} from '../externalFoodSearch';

jest.mock('@/lib/db', () => ({
    prisma: {
        offFoodCache: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
        fatSecretFoodCache: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

import { prisma } from '@/lib/db';

const OFF_PRODUCTS = {
    products: [
        {
            product_name: 'Apple Pie',
            code: '123456',
            brands: 'TestBrand',
            nutriments: { 'energy-kcal_100g': 240, proteins_100g: 2 },
        },
    ],
};

const FS_FOODS = {
    foods_search: {
        results: {
            food: [
                {
                    food_id: '777',
                    food_name: 'Apple Pie',
                    brand_name: 'TestBrand',
                    servings: { serving: [{ is_default: '1', calories: '300', carbohydrate: '40', protein: '3', fat: '12', serving_description: '1 slice' }] },
                },
            ],
        },
    },
};

function okJson(payload: unknown) {
    return { ok: true, json: async () => payload };
}

describe('normalizeFoodSearchQuery', () => {
    it.each([
        ['  Apple Pie  ', 'apple pie'],
        ['APPLE', 'apple'],
        ['a'.repeat(100), 'a'.repeat(100)],
    ])('normalizes %j to %j', (input, expected) => {
        expect(normalizeFoodSearchQuery(input as string)).toBe(expected);
    });

    it.each([
        [''],
        ['    '],
        ['a'.repeat(101)],
        ['x'.repeat(65536)],
    ])('rejects unusable query %j', (input) => {
        expect(normalizeFoodSearchQuery(input as string)).toBeNull();
    });

    it('rejects non-string input', () => {
        expect(normalizeFoodSearchQuery(undefined as unknown as string)).toBeNull();
    });
});

describe('searchOpenFoodFacts cache bounds', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof global.fetch;
        (prisma.offFoodCache.count as jest.Mock).mockResolvedValue(1);
    });

    it('returns [] for over-length queries without any fetch or cache write', async () => {
        const results = await searchOpenFoodFacts('a'.repeat(65536));

        expect(results).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.offFoodCache.findUnique).not.toHaveBeenCalled();
        expect(prisma.offFoodCache.upsert).not.toHaveBeenCalled();
    });

    it('returns [] for empty/whitespace queries without any fetch or cache write', async () => {
        await expect(searchOpenFoodFacts('   ')).resolves.toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.offFoodCache.upsert).not.toHaveBeenCalled();
    });

    it('serves a fresh cache hit without touching the provider', async () => {
        (prisma.offFoodCache.findUnique as jest.Mock).mockResolvedValue({
            results: [{ id: 'off-cached' }],
            updatedAt: new Date(),
        });

        const results = await searchOpenFoodFacts('apple');

        expect(results).toEqual([{ id: 'off-cached' }]);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.offFoodCache.upsert).not.toHaveBeenCalled();
    });

    it('refetches an expired (90+ day old) entry and overwrites it', async () => {
        const expired = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
        (prisma.offFoodCache.findUnique as jest.Mock).mockResolvedValue({
            results: [{ id: 'off-stale' }],
            updatedAt: expired,
        });
        fetchMock.mockResolvedValue(okJson(OFF_PRODUCTS));

        const results = await searchOpenFoodFacts('apple');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(results[0]).toMatchObject({ id: 'off-123456', source: 'off' });
        expect(prisma.offFoodCache.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { query: 'apple' } })
        );
    });

    it('writes the cache under the normalized key', async () => {
        fetchMock.mockResolvedValue(okJson(OFF_PRODUCTS));

        await searchOpenFoodFacts('  Apple  ');

        expect(prisma.offFoodCache.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { query: 'apple' } })
        );
    });

    it('prunes 90-day-old entries and evicts oldest-first over the row cap after a write', async () => {
        fetchMock.mockResolvedValue(okJson(OFF_PRODUCTS));
        (prisma.offFoodCache.count as jest.Mock).mockResolvedValue(150_002);
        (prisma.offFoodCache.findMany as jest.Mock).mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]);

        await searchOpenFoodFacts('apple');

        const deleteManyCalls = (prisma.offFoodCache.deleteMany as jest.Mock).mock.calls;
        // First deleteMany is the TTL prune...
        const prune = deleteManyCalls[0][0];
        const cutoff = prune.where.updatedAt.lt as Date;
        expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - 89 * 24 * 60 * 60 * 1000);
        expect(cutoff.getTime()).toBeGreaterThan(Date.now() - 91 * 24 * 60 * 60 * 1000);
        // ...then the cap trim selected the oldest overflow rows and deleted by id.
        expect(prisma.offFoodCache.findMany).toHaveBeenCalledWith({
            select: { id: true },
            orderBy: { updatedAt: 'asc' },
            take: 2,
        });
        expect(deleteManyCalls[1][0]).toEqual({ where: { id: { in: ['old-1', 'old-2'] } } });
    });

    it('skips the eviction query when under the row cap', async () => {
        fetchMock.mockResolvedValue(okJson(OFF_PRODUCTS));
        (prisma.offFoodCache.count as jest.Mock).mockResolvedValue(150_000);

        await searchOpenFoodFacts('apple');

        expect(prisma.offFoodCache.findMany).not.toHaveBeenCalled();
        expect(prisma.offFoodCache.deleteMany).toHaveBeenCalledTimes(1); // TTL prune only
    });

    it('keeps the search path working when cache hygiene fails', async () => {
        fetchMock.mockResolvedValue(okJson(OFF_PRODUCTS));
        (prisma.offFoodCache.count as jest.Mock).mockRejectedValue(new Error('db down'));

        const results = await searchOpenFoodFacts('apple');

        expect(results[0]).toMatchObject({ source: 'off' });
    });

    it('does not write the cache when the provider returns no parsed items', async () => {
        fetchMock.mockResolvedValue(okJson({ products: [] }));

        await searchOpenFoodFacts('zzz-nonexistent');

        expect(prisma.offFoodCache.upsert).not.toHaveBeenCalled();
    });
});

describe('searchFatSecret cache bounds', () => {
    let fetchMock: jest.Mock;
    const previousId = process.env.FATSECRET_CLIENT_ID;
    const previousSecret = process.env.FATSECRET_CLIENT_SECRET;

    beforeAll(() => {
        process.env.FATSECRET_CLIENT_ID = 'test-id';
        process.env.FATSECRET_CLIENT_SECRET = 'test-secret';
    });

    afterAll(() => {
        process.env.FATSECRET_CLIENT_ID = previousId;
        process.env.FATSECRET_CLIENT_SECRET = previousSecret;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        fetchMock = jest.fn(async (input: unknown) => {
            const url = String((input as { url?: string }).url ?? input);
            if (url.includes('oauth.fatsecret.com')) {
                return okJson({ access_token: 'tok', expires_in: 3600 });
            }
            return okJson(FS_FOODS);
        });
        global.fetch = fetchMock as unknown as typeof global.fetch;
        (prisma.fatSecretFoodCache.count as jest.Mock).mockResolvedValue(1);
    });

    it('returns [] for over-length queries without any fetch or cache write', async () => {
        const results = await searchFatSecret('q'.repeat(101));

        expect(results).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.fatSecretFoodCache.upsert).not.toHaveBeenCalled();
    });

    it('writes the cache under the normalized key and bounds the table', async () => {
        (prisma.fatSecretFoodCache.count as jest.Mock).mockResolvedValue(150_001);
        (prisma.fatSecretFoodCache.findMany as jest.Mock).mockResolvedValue([{ id: 'fs-old' }]);

        const results = await searchFatSecret('  Apple Pie  ');

        expect(results[0]).toMatchObject({ id: 'fs-777', source: 'fs' });
        expect(prisma.fatSecretFoodCache.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { query: 'apple pie' } })
        );
        expect(prisma.fatSecretFoodCache.deleteMany).toHaveBeenCalledTimes(2);
        expect(prisma.fatSecretFoodCache.findMany).toHaveBeenCalledWith({
            select: { id: true },
            orderBy: { updatedAt: 'asc' },
            take: 1,
        });
    });

    it('serves a fresh cache hit without touching the provider', async () => {
        (prisma.fatSecretFoodCache.findUnique as jest.Mock).mockResolvedValue({
            results: [{ id: 'fs-cached' }],
            updatedAt: new Date(),
        });

        const results = await searchFatSecret('apple pie');

        expect(results).toEqual([{ id: 'fs-cached' }]);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
