import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        // 1. Search local DB first
        const localResults = await prisma.foodItem.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            take: 10
        });

        // 2. Fallback to Open Food Facts text search
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`;
        const offRes = await fetch(offUrl, { headers: { 'User-Agent': 'RunFlow - WebApp' } });

        const combinedResults = [...localResults];

        if (offRes.ok) {
            const offData = await offRes.json();
            const offProducts = offData.products || [];

            // Map OFF to our schema
            for (const p of offProducts) {
                // Skip if we already have it from local db based on barcode or if vital info is missing
                if (p.code && combinedResults.some(r => r.barcode === p.code)) continue;
                if (!p.product_name) continue;

                combinedResults.push({
                    id: `off-${p.code || Math.random()}`,
                    name: p.product_name || 'Unknown',
                    brand: p.brands || '',
                    barcode: p.code ? String(p.code) : null,
                    calories: parseFloat(p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal_value'] || 0),
                    protein: parseFloat(p.nutriments?.proteins_100g || p.nutriments?.proteins_value || 0),
                    carbs: parseFloat(p.nutriments?.carbohydrates_100g || p.nutriments?.carbohydrates_value || 0),
                    fats: parseFloat(p.nutriments?.fat_100g || p.nutriments?.fat_value || 0),
                    fiber: parseFloat(p.nutriments?.fiber_100g || p.nutriments?.fiber_value || 0),
                    sugar: parseFloat(p.nutriments?.sugars_100g || p.nutriments?.sugars_value || 0),
                    saturatedFat: parseFloat(p.nutriments?.['saturated-fat_100g'] || p.nutriments?.['saturated-fat_value'] || 0),
                    sodium: parseFloat(p.nutriments?.sodium_100g || p.nutriments?.sodium_value || 0),
                    potassium: parseFloat(p.nutriments?.potassium_100g || p.nutriments?.potassium_value || 0),
                    cholesterol: parseFloat(p.nutriments?.cholesterol_100g || p.nutriments?.cholesterol_value || 0),
                    calcium: parseFloat(p.nutriments?.calcium_100g || p.nutriments?.calcium_value || 0),
                    iron: parseFloat(p.nutriments?.iron_100g || p.nutriments?.iron_value || 0),
                    servingSize: p.serving_quantity ? String(p.serving_quantity) : '100g',
                });
            }
        }

        // Return combined results, limited to top 20
        return NextResponse.json(combinedResults.slice(0, 20));
    } catch (error) {
        console.error("Food search error:", error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}
