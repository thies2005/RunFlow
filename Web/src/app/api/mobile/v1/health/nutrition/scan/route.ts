import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { lookupNutritionixBarcode } from '@/lib/data/externalFoodSearch';

const BARCODE_REGEX = /^\d{8,14}$/;

async function cacheFoodItem(item: any) {
    try {
        await prisma.foodItem.upsert({
            where: { barcode: item.barcode },
            update: {},
            create: {
                name: item.name,
                brand: item.brand,
                barcode: item.barcode,
                servingSize: item.servingSize,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fats: item.fats,
                fiber: item.fiber ?? 0,
                sugar: item.sugar ?? 0,
                saturatedFat: item.saturatedFat ?? 0,
                sodium: item.sodium ?? 0,
                potassium: item.potassium ?? 0,
                cholesterol: item.cholesterol ?? 0,
                calcium: item.calcium ?? 0,
                iron: item.iron ?? 0,
            }
        });
    } catch (e) {
        console.error('[Scan Cache Write Failed]', e);
    }
}

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
        const barcode = searchParams.get('barcode');

        if (!barcode) {
            return errorResponses.badRequest('Barcode is required');
        }

        if (!BARCODE_REGEX.test(barcode)) {
            return errorResponses.badRequest('Invalid barcode format');
        }

        const cachedItem = await prisma.foodItem.findUnique({
            where: { barcode: barcode }
        });

        if (cachedItem) {
            return NextResponse.json({
                name: cachedItem.name,
                brand: cachedItem.brand,
                barcode: cachedItem.barcode,
                servingSize: cachedItem.servingSize,
                calories: cachedItem.calories,
                protein: cachedItem.protein,
                carbs: cachedItem.carbs,
                fats: cachedItem.fats,
                fiber: cachedItem.fiber ?? 0,
                sugar: cachedItem.sugar ?? 0,
                saturatedFat: cachedItem.saturatedFat ?? 0,
                sodium: cachedItem.sodium ?? 0,
                potassium: cachedItem.potassium ?? 0,
                cholesterol: cachedItem.cholesterol ?? 0,
                calcium: cachedItem.calcium ?? 0,
                iron: cachedItem.iron ?? 0,
            }, { headers: rateLimitHeaders(rateLimitResult) });
        }

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
            const nixResult = await lookupNutritionixBarcode(barcode).catch(() => null);
            if (nixResult) {
                await cacheFoodItem(nixResult);
                return NextResponse.json(nixResult, { headers: rateLimitHeaders(rateLimitResult) });
            }
            return errorResponses.notFound('Product');
        }

        const p = data.product;
        const nutriments = p.nutriments || {};

        const standardData = {
            name: p.product_name || 'Unknown Food',
            brand: p.brands ? p.brands.split(',')[0] : null,
            barcode: barcode,
            servingSize: p.serving_size || '100g',
            calories: nutriments['energy-kcal_100g'] || 0,
            protein: nutriments.proteins_100g || 0,
            carbs: nutriments.carbohydrates_100g || 0,
            fats: nutriments.fat_100g || 0,
            fiber: nutriments.fiber_100g || 0,
            sugar: nutriments.sugars_100g || 0,
            saturatedFat: nutriments['saturated-fat_100g'] || 0,
            sodium: nutriments.sodium_100g || 0,
            potassium: nutriments.potassium_100g || 0,
            cholesterol: nutriments.cholesterol_100g || 0,
            calcium: nutriments.calcium_100g || 0,
            iron: nutriments.iron_100g || 0,
        };

        await cacheFoodItem(standardData);

        return NextResponse.json(standardData, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/scan' });
    }
}
