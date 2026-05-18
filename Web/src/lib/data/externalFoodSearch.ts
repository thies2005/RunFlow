import { prisma } from '@/lib/db';

let fatsecretAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getFatSecretToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

    if (fatsecretAccessToken && Date.now() < tokenExpiryTime) {
        return fatsecretAccessToken;
    }

    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const params = new URLSearchParams({ scope: 'basic', grant_type: 'client_credentials' });

        const res = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: params.toString()
        });

        if (!res.ok) return null;

        const data = await res.json();
        fatsecretAccessToken = data.access_token;
        tokenExpiryTime = Date.now() + ((data.expires_in - 60) * 1000);
        return fatsecretAccessToken;
    } catch {
        return null;
    }
}

export async function searchOpenFoodFacts(query: string): Promise<Array<Record<string, unknown>>> {
    const normalizedQuery = query.toLowerCase().trim();

    try {
        const cacheEntry = await prisma.offFoodCache.findUnique({
            where: { query: normalizedQuery }
        });

        if (cacheEntry) {
            const ageInMs = Date.now() - cacheEntry.updatedAt.getTime();
            if (ageInMs < 90 * 24 * 60 * 60 * 1000) {
                return cacheEntry.results as unknown as Array<Record<string, unknown>>;
            }
        }
    } catch {
        // Cache lookup failed, continue to API
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
        const offRes = await fetch(offUrl, {
            headers: { 'User-Agent': 'RunFlow - WebApp' },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!offRes.ok) return [];

        const offData = await offRes.json();
        const offProducts = offData.products || [];

        const results = offProducts
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

        if (results.length > 0) {
            try {
                await prisma.offFoodCache.upsert({
                    where: { query: normalizedQuery },
                    update: { results: results as any, updatedAt: new Date() },
                    create: { query: normalizedQuery, results: results as any },
                });
            } catch { /* ignore cache write errors */ }
        }

        return results;
    } catch {
        return [];
    }
}

export async function searchFatSecret(query: string): Promise<Array<Record<string, unknown>>> {
    const normalizedQuery = query.toLowerCase().trim();

    try {
        const cacheEntry = await prisma.fatSecretFoodCache.findUnique({
            where: { query: normalizedQuery }
        });

        if (cacheEntry) {
            const ageInMs = Date.now() - cacheEntry.updatedAt.getTime();
            if (ageInMs < 90 * 24 * 60 * 60 * 1000) {
                return cacheEntry.results as unknown as Array<Record<string, unknown>>;
            }
        }
    } catch {
        // Cache lookup failed, continue to API
    }

    try {
        const token = await getFatSecretToken();
        if (!token) return [];

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const searchParams = new URLSearchParams({
            method: 'foods.search.v3',
            search_expression: query,
            format: 'json',
            max_results: '20'
        });

        const fsRes = await fetch(`https://platform.fatsecret.com/rest/server.api?${searchParams.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!fsRes.ok) return [];

        const fsData = await fsRes.json();
        const root = fsData.foods_search || fsData.foods || fsData || {};
        const results = root.results?.food || root.food || [];
        const items = Array.isArray(results) ? results : (results ? [results] : []);

        const mapped = items.map((p: Record<string, unknown>) => {
            let calories = 0, carbs = 0, protein = 0, fats = 0, servingSize = '1 serving';

            if (p.servings && typeof p.servings === 'object') {
                const servingsData = (p.servings as Record<string, unknown>).serving;
                const servings = Array.isArray(servingsData) ? servingsData : (servingsData ? [servingsData] : []);
                const bestServing = servings.find((s: Record<string, unknown>) => s.is_default === "1") || servings[0];
                if (bestServing) {
                    calories = parseFloat(String(bestServing.calories || "0"));
                    carbs = parseFloat(String(bestServing.carbohydrate || "0"));
                    protein = parseFloat(String(bestServing.protein || "0"));
                    fats = parseFloat(String(bestServing.fat || "0"));
                    servingSize = String(bestServing.serving_description || bestServing.measurement_description || '1 serving');
                }
            } else if (p.food_description) {
                const desc = String(p.food_description);
                const calMatch = desc.match(/Calories:\s*([\d.]+)kcal/i);
                const fatMatch = desc.match(/Fat:\s*([\d.]+)g/i);
                const carbMatch = desc.match(/Carbs:\s*([\d.]+)g/i);
                const proMatch = desc.match(/Protein:\s*([\d.]+)g/i);
                calories = calMatch ? parseFloat(calMatch[1]) : 0;
                fats = fatMatch ? parseFloat(fatMatch[1]) : 0;
                carbs = carbMatch ? parseFloat(carbMatch[1]) : 0;
                protein = proMatch ? parseFloat(proMatch[1]) : 0;
            }

            return {
                id: `fs-${p.food_id}`,
                name: p.food_name || 'Unknown',
                brand: p.brand_name || '',
                barcode: null,
                calories,
                protein,
                carbs,
                fats,
                servingSize,
                source: 'fs'
            };
        });

        if (mapped.length > 0) {
            try {
                await prisma.fatSecretFoodCache.upsert({
                    where: { query: normalizedQuery },
                    update: { results: mapped as any, updatedAt: new Date() },
                    create: { query: normalizedQuery, results: mapped as any },
                });
            } catch { /* ignore cache write errors */ }
        }

        return mapped;
    } catch {
        return [];
    }
}
