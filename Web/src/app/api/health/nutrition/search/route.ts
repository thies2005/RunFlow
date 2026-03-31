import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchBLS } from '@/lib/data/blsSearch';

type SearchResultItem = {
    name?: string;
    brand?: string;
} & Record<string, unknown>;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        // Run persistent sources in parallel
        const [localItems, blsResults] = await Promise.all([
            // 1. Local DB (Prisma) — instant
            prisma.foodItem.findMany({
                where: {
                    name: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                take: 10
            }),

            // 2. BLS German food database — instant (local JSON)
            Promise.resolve(searchBLS(query, 20)),
        ]);

        // Collect results from each source
        const combined: SearchResultItem[] = [];
        const seenNames = new Set<string>();

        // Helper to add results with deduplication
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

        // Priority: Local DB first, then BLS
        addResults(localItems as SearchResultItem[], 'local');
        addResults(blsResults as SearchResultItem[], 'bls');

        // Score and rank combined results by relevance
        const queryLower = query.toLowerCase();
        const regex = new RegExp(`(?:^|[\\s,;(])${escapeRegex(queryLower)}`);

        const scored = combined.map(item => {
            const name = String(item.name || '').toLowerCase();
            let score = 0;

            // Source priority bonus
            if (item.source === 'local') score += 10;
            else if (item.source === 'bls') score += 5;

            // Name relevance scoring
            if (name === queryLower) score += 100;
            else if (name.startsWith(queryLower)) score += 80;
            else if (regex.test(name)) score += 60;
            else if (name.includes(queryLower)) score += 40;
            else score += 20;

            return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return NextResponse.json(scored.slice(0, 30).map(s => s.item));
    } catch (error) {
        console.error("Food search error:", error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
