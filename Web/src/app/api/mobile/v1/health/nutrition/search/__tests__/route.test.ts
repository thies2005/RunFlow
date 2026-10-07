/**
 * @jest-environment node
 *
 * Regression tests for the mobile food search query bound
 * (p2b: uncapped-query-keyed-food-cache-upsert).
 *
 * The route validated the q parameter by presence only, so arbitrarily long
 * or endlessly varied queries fanned out to up to 9 provider calls and minted
 * permanent cache rows keyed by the raw attacker string.
 */
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn(),
    getClientIdentifier: jest.fn(() => 'client-1'),
    RATE_LIMITS: { general: { limit: 60, windowSeconds: 60, prefix: 'general' } },
    rateLimitHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        foodItem: {
            findMany: jest.fn(async () => []),
        },
    },
}));

jest.mock('@/lib/data/blsSearch', () => ({
    searchBLS: jest.fn(() => []),
}));

jest.mock('@/lib/data/externalFoodSearch', () => ({
    searchOpenFoodFacts: jest.fn(async () => []),
    searchFatSecret: jest.fn(async () => []),
    searchUSDA: jest.fn(async () => []),
    searchNutritionix: jest.fn(async () => []),
}));

import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { searchOpenFoodFacts, searchFatSecret } from '@/lib/data/externalFoodSearch';

const ROUTE_URL = 'http://localhost:3000/api/mobile/v1/health/nutrition/search';

describe('GET /api/mobile/v1/health/nutrition/search query bound', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (checkRateLimitAsync as jest.Mock).mockResolvedValue({ allowed: true });
    });

    it('returns 400 when q is missing or whitespace', async () => {
        const missing = await GET(new NextRequest(`${ROUTE_URL}`));
        expect(missing.status).toBe(400);

        const blank = await GET(new NextRequest(`${ROUTE_URL}?q=%20%20%20`));
        expect(blank.status).toBe(400);

        expect(searchOpenFoodFacts).not.toHaveBeenCalled();
    });

    it('returns 400 and skips every provider when q is longer than 100 characters', async () => {
        const longQuery = 'a'.repeat(101);

        const response = await GET(new NextRequest(`${ROUTE_URL}?q=${encodeURIComponent(longQuery)}`));

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('at most 100 characters');
        expect(searchOpenFoodFacts).not.toHaveBeenCalled();
        expect(searchFatSecret).not.toHaveBeenCalled();
    });

    it('accepts a 100-character query and forwards it to the providers', async () => {
        const maxQuery = 'a'.repeat(100);

        const response = await GET(new NextRequest(`${ROUTE_URL}?q=${encodeURIComponent(maxQuery)}`));

        expect(response.status).toBe(200);
        expect(searchOpenFoodFacts).toHaveBeenCalledWith(maxQuery);
        expect(searchFatSecret).toHaveBeenCalledWith(maxQuery);
    });

    it('returns 401 without authentication', async () => {
        (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

        const response = await GET(new NextRequest(`${ROUTE_URL}?q=apple`));

        expect(response.status).toBe(401);
        expect(searchOpenFoodFacts).not.toHaveBeenCalled();
    });
});
