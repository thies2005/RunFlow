import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const normalizedQuery = query.toLowerCase().trim();

    try {
        // 1. Check cache first
        const cacheEntry = await prisma.offFoodCache.findUnique({
            where: { query: normalizedQuery }
        });

        if (cacheEntry) {
            // Check if cache is older than 90 days
            const ageInMs = Date.now() - cacheEntry.updatedAt.getTime();
            const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

            if (ageInMs < ninetyDaysMs) {
                // Return cached results
                return NextResponse.json(cacheEntry.results);
            }
            // If expired, we fall through to fetch new data, which will overwrite this entry via upsert
        }

        // 2. Fetch from Open Food Facts with a 30s timeout (increased from 8s)
        const offResults = await fetchOFFWithTimeout(query, 30000);

        // 3. Save to cache (background task so we don't block returning the response)
        if (offResults) {
            // We use setTimeout so the response isn't delayed by DB writes
            setTimeout(async () => {
                try {
                    // Save or update the cache entry
                    await prisma.offFoodCache.upsert({
                        where: { query: normalizedQuery },
                        update: { results: offResults as any, updatedAt: new Date() },
                        create: { query: normalizedQuery, results: offResults as any },
                    });

                    // Manage cache size: Delete entries older than 90 days
                    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
                    await prisma.offFoodCache.deleteMany({
                        where: { updatedAt: { lt: ninetyDaysAgo } }
                    });

                    // Safeguard: Ensure cache doesn't exceed ~150,000 queries (~100MB)
                    const cacheCount = await prisma.offFoodCache.count();
                    const MAX_CACHE_SIZE = 150000;

                    if (cacheCount > MAX_CACHE_SIZE) {
                        // Find the oldest entries to delete
                        const overage = cacheCount - MAX_CACHE_SIZE;
                        const oldestToKeep = await prisma.offFoodCache.findMany({
                            select: { id: true },
                            orderBy: { updatedAt: 'desc' },
                            skip: MAX_CACHE_SIZE,
                            take: 1 // We just need to know the timestamp of the 150,000th item, but deleting by ID is safer
                        });

                        if (oldestToKeep.length > 0) {
                            // Find the IDs of the oldest items to delete
                            const itemsToDelete = await prisma.offFoodCache.findMany({
                                select: { id: true },
                                orderBy: { updatedAt: 'asc' },
                                take: overage
                            });

                            const idsToDelete = itemsToDelete.map(item => item.id);

                            await prisma.offFoodCache.deleteMany({
                                where: { id: { in: idsToDelete } }
                            });
                        }
                    }

                } catch (dbError) {
                    console.error("Error saving OFF cache:", dbError);
                }
            }, 0);
        }

        return NextResponse.json(offResults);
    } catch (error) {
        console.error("OFF search error:", error);
        return NextResponse.json({ error: 'Failed to fetch from OpenFoodFacts' }, { status: 500 });
    }
}

/**
 * Fetch from Open Food Facts with a timeout.
 */
async function fetchOFFWithTimeout(query: string, timeoutMs: number): Promise<Array<Record<string, unknown>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Use the simple search endpoint which handles broad queries better
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=30`;
        const offRes = await fetch(offUrl, {
            headers: { 'User-Agent': 'RunFlow - WebApp' },
            signal: controller.signal,
            cache: 'no-store' // Ensure we don't hit Vercel edge cache since we manage it in DB
        });

        if (!offRes.ok) {
            console.error(`OFF API error: ${offRes.status} ${offRes.statusText}`);
            return [];
        }

        const offData = await offRes.json();
        console.log(`OFF API returned ${offData.products?.length || 0} items for query: ${query}`);
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
                    source: 'off'
                };
            });
    } catch (e) {
        console.error("OFF Fetch Error:", e);
        return [];
    } finally {
        clearTimeout(timer);
    }
}
