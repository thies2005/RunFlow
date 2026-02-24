import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchBLS } from '@/lib/data/blsSearch';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        // Run all three sources in parallel for fastest response
        const [localResults, blsResults, offResult] = await Promise.allSettled([
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
            Promise.resolve(searchBLS(query, 15)),

            // 3. Open Food Facts API — may take 500ms-2000ms
            fetchOFFWithTimeout(query, 3000),
        ]);

        // Collect results from each source
        const combined: Array<Record<string, unknown>> = [];
        const seenNames = new Set<string>();

        // Helper to add results with deduplication
        const addResults = (items: Array<Record<string, unknown>>, source: string) => {
            for (const item of items) {
                const name = String(item.name || '').toLowerCase().trim();
                if (!name) continue;

                // Skip if we already have a very similar item
                if (seenNames.has(name)) continue;
                seenNames.add(name);

                combined.push({ ...item, source: source });
            }
        };

        // Priority: Local DB first (user's own items), then BLS (instant), then OFF (external)
        if (localResults.status === 'fulfilled') {
            addResults(localResults.value as Array<Record<string, unknown>>, 'local');
        }

        if (blsResults.status === 'fulfilled') {
            addResults(blsResults.value, 'bls');
        }

        if (offResult.status === 'fulfilled' && offResult.value) {
            addResults(offResult.value, 'off');
        }

        // Score and rank combined results by relevance
        const queryLower = query.toLowerCase();
        const scored = combined.map(item => {
            const name = String(item.name || '').toLowerCase();
            let score = 0;

            // Source priority bonus
            if (item.source === 'local') score += 10;
            else if (item.source === 'bls') score += 5;

            // Name relevance scoring
            if (name === queryLower) score += 100;
            else if (name.startsWith(queryLower)) score += 80;
            else if (new RegExp(`(?:^|[\\s,;(])${escapeRegex(queryLower)}`).test(name)) score += 60;
            else if (name.includes(queryLower)) score += 40;
            else score += 20;

            return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // Return top 25 results
        return NextResponse.json(scored.slice(0, 25).map(s => s.item));
    } catch (error) {
        console.error("Food search error:", error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fetch from Open Food Facts with a timeout so BLS results aren't delayed.
 */
async function fetchOFFWithTimeout(query: string, timeoutMs: number): Promise<Array<Record<string, unknown>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`;
        const offRes = await fetch(offUrl, {
            headers: { 'User-Agent': 'RunFlow - WebApp' },
            signal: controller.signal,
        });

        if (!offRes.ok) return [];

        const offData = await offRes.json();
        const offProducts = offData.products || [];

        return offProducts
            .filter((p: Record<string, unknown>) => p.product_name)
            .map((p: Record<string, unknown>) => {
                const nutriments = (p.nutriments || {}) as Record<string, unknown>;
                return {
                    id: `off-${p.code || Math.random()}`,
                    name: p.product_name || 'Unknown',
                    brand: p.brands || '',
                    barcode: p.code ? String(p.code) : null,
                    calories: parseFloat(String(nutriments['energy-kcal_100g'] || nutriments['energy-kcal_value'] || 0)),
                    protein: parseFloat(String(nutriments.proteins_100g || nutriments.proteins_value || 0)),
                    carbs: parseFloat(String(nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0)),
                    fats: parseFloat(String(nutriments.fat_100g || nutriments.fat_value || 0)),
                    fiber: parseFloat(String(nutriments.fiber_100g || nutriments.fiber_value || 0)),
                    sugar: parseFloat(String(nutriments.sugars_100g || nutriments.sugars_value || 0)),
                    saturatedFat: parseFloat(String(nutriments['saturated-fat_100g'] || nutriments['saturated-fat_value'] || 0)),
                    sodium: parseFloat(String(nutriments.sodium_100g || nutriments.sodium_value || 0)),
                    potassium: parseFloat(String(nutriments.potassium_100g || nutriments.potassium_value || 0)),
                    cholesterol: parseFloat(String(nutriments.cholesterol_100g || nutriments.cholesterol_value || 0)),
                    calcium: parseFloat(String(nutriments.calcium_100g || nutriments.calcium_value || 0)),
                    iron: parseFloat(String(nutriments.iron_100g || nutriments.iron_value || 0)),
                    servingSize: p.serving_quantity ? String(p.serving_quantity) : '100g',
                };
            });
    } catch {
        // Timeout or network error — OFF is optional, BLS covers us
        return [];
    } finally {
        clearTimeout(timer);
    }
}
