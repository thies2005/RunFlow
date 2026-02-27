import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        // Fetch from Open Food Facts with a generous timeout for background fetching
        const offResults = await fetchOFFWithTimeout(query, 8000);
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
                    source: 'off'
                };
            });
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}
