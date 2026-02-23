import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
        return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    try {
        // Call the free Open Food Facts API
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();

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
