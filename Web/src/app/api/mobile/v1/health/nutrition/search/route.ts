import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchBLS } from '@/lib/data/blsSearch';
import { searchOpenFoodFacts, searchFatSecret } from '@/lib/data/externalFoodSearch';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

type SearchResultItem = {
    name?: string;
    brand?: string;
} & Record<string, unknown>;

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return errorResponses.badRequest('Query parameter "q" is required');
        }

        const [localItems, blsResults] = await Promise.all([
            prisma.foodItem.findMany({
                where: {
                    name: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                take: 10
            }),
            Promise.resolve(searchBLS(query, 20)),
        ]);

        const combined: SearchResultItem[] = [];
        const seenNames = new Set<string>();

        const addResults = (items: SearchResultItem[], source: string) => {
            for (const item of items) {
                const name = String(item.name || '').toLowerCase().trim();
                const brand = String(item.brand || '').toLowerCase().trim();
                const key = `${name}|${brand}`;

                if (!name) continue;
                if (seenNames.has(key)) continue;
                seenNames.add(key);

                combined.push({ ...item, source: source });
            }
        };

        addResults(localItems as SearchResultItem[], 'local');
        addResults(blsResults as SearchResultItem[], 'bls');

        const [offResults, fsResults] = await Promise.all([
            searchOpenFoodFacts(query).catch(() => []),
            searchFatSecret(query).catch(() => []),
        ]);

        addResults(offResults as SearchResultItem[], 'off');
        addResults(fsResults as SearchResultItem[], 'fs');

        const queryLower = query.toLowerCase();
        const regex = new RegExp(`(?:^|[\\s,;(])${escapeRegex(queryLower)}`);

        const scored = combined.map(item => {
            const name = String(item.name || '').toLowerCase();
            let score = 0;

            if (item.source === 'local') score += 10;
            else if (item.source === 'bls') score += 5;
            else if (item.source === 'off') score += 3;
            else if (item.source === 'fs') score += 3;

            if (name === queryLower) score += 100;
            else if (name.startsWith(queryLower)) score += 80;
            else if (regex.test(name)) score += 60;
            else if (name.includes(queryLower)) score += 40;
            else score += 20;

            return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return NextResponse.json(
            scored.slice(0, 30).map(s => s.item),
            { headers: rateLimitHeaders(rateLimitResult) }
        );
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/search' });
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
