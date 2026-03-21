export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const BARCODE_REGEX = /^\d{8,14}$/;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
        return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    if (!BARCODE_REGEX.test(barcode)) {
        return NextResponse.json({ error: 'Invalid barcode format' }, { status: 400 });
    }

    try {
        // OPTIMIZATION: Check local database first before making external API call
        // This serves as a cache for previously scanned items, significantly reducing
        // latency and avoiding rate limits on the Open Food Facts API
        const cachedItem = await prisma.foodItem.findUnique({
            where: { barcode: barcode }
        });

        if (cachedItem) {
            // Return the cached data in the exact format the frontend expects
            return NextResponse.json({
                name: cachedItem.name,
                brand: cachedItem.brand,
                barcode: cachedItem.barcode,
                servingSize: cachedItem.servingSize,
                calories: cachedItem.calories,
                protein: cachedItem.protein,
                carbs: cachedItem.carbs,
                fats: cachedItem.fats,
                // Micronutrients - safely handle null values by defaulting to 0
                fiber: cachedItem.fiber ?? 0,
                sugar: cachedItem.sugar ?? 0,
                saturatedFat: cachedItem.saturatedFat ?? 0,
                sodium: cachedItem.sodium ?? 0,
                potassium: cachedItem.potassium ?? 0,
                cholesterol: cachedItem.cholesterol ?? 0,
                calcium: cachedItem.calcium ?? 0,
                iron: cachedItem.iron ?? 0,
            });
        }

        // Item not found in local database, fetch from Open Food Facts API
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let data;
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, {
                signal: controller.signal
            });
            data = await res.json();
        } finally {
            clearTimeout(timeout);
        }

        if (data.status !== 1 || !data.product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const p = data.product;
        const nutriments = p.nutriments || {};

        const standardData = {
            name: p.product_name || 'Unknown Food',
            brand: p.brands ? p.brands.split(',')[0] : null,
            barcode: barcode,
            servingSize: p.serving_size || '100g',
            // Default to 100g values if per-serving values aren't cleanly available
            calories: nutriments['energy-kcal_100g'] || 0,
            protein: nutriments.proteins_100g || 0,
            carbs: nutriments.carbohydrates_100g || 0,
            fats: nutriments.fat_100g || 0,
            // Micronutrients
            fiber: nutriments.fiber_100g || 0,
            sugar: nutriments.sugars_100g || 0,
            saturatedFat: nutriments['saturated-fat_100g'] || 0,
            sodium: nutriments.sodium_100g || 0,
            potassium: nutriments.potassium_100g || 0,
            cholesterol: nutriments.cholesterol_100g || 0,
            calcium: nutriments.calcium_100g || 0,
            iron: nutriments.iron_100g || 0,
        };

        return NextResponse.json(standardData);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch nutrition data' }, { status: 500 });
    }
}
