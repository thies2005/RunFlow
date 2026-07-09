import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';

const BARCODE_REGEX = /^\d{8,14}$/;

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (30 scans/minute per client)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, {
        limit: 30,
        windowSeconds: 60,
        prefix: 'nutrition-scan',
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

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

        if (cachedItem && (cachedItem.calories > 0 || cachedItem.protein > 0 || cachedItem.carbs > 0 || cachedItem.fats > 0)) {
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
            calories: parseFloat(String(nutriments['energy-kcal_100g'] || nutriments['energy-kcal_value'] || nutriments['energy_100g'] || 0)),
            protein: parseFloat(String(nutriments.proteins_100g || nutriments.proteins_value || 0)),
            carbs: parseFloat(String(nutriments.carbohydrates_100g || nutriments.carbohydrates_value || 0)),
            fats: parseFloat(String(nutriments.fat_100g || nutriments.fat_value || 0)),
            // Micronutrients
            fiber: parseFloat(String(nutriments.fiber_100g || nutriments.fiber_value || 0)),
            sugar: parseFloat(String(nutriments.sugars_100g || nutriments.sugars_value || 0)),
            saturatedFat: parseFloat(String(nutriments['saturated-fat_100g'] || nutriments['saturated-fat_value'] || 0)),
            sodium: parseFloat(String(nutriments.sodium_100g || nutriments.sodium_value || 0)),
            potassium: parseFloat(String(nutriments.potassium_100g || nutriments.potassium_value || 0)),
            cholesterol: parseFloat(String(nutriments.cholesterol_100g || nutriments.cholesterol_value || 0)),
            calcium: parseFloat(String(nutriments.calcium_100g || nutriments.calcium_value || 0)),
            iron: parseFloat(String(nutriments.iron_100g || nutriments.iron_value || 0)),
        };

        return NextResponse.json(standardData);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch nutrition data' }, { status: 500 });
    }
}
