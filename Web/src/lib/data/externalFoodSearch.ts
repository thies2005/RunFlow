import { prisma } from '@/lib/db';

let fatsecretAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getFatSecretToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('[FatSecret] Missing FATSECRET_CLIENT_ID or FATSECRET_CLIENT_SECRET env vars');
        return null;
    }

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
        const timer = setTimeout(() => controller.abort(), 25000);

        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
        const offRes = await fetch(offUrl, {
            headers: { 'User-Agent': 'RunFlow - WebApp' },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!offRes.ok) {
            console.error(`[OFF Search] HTTP ${offRes.status} for query="${query}"`);
            return [];
        }

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
    } catch (err) {
        console.error(`[OFF Search] Error for query="${query}":`, err instanceof Error ? err.message : err);
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
    } catch (err) {
        console.error(`[FatSecret Search] Error for query="${query}":`, err instanceof Error ? err.message : err);
        return [];
    }
}

// In-memory caches to avoid database migrations for third-party engines
// Entries are { data, timestamp } tuples with a 24-hour TTL
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const usdaCache = new Map<string, { data: any; timestamp: number }>();
const nutritionixCache = new Map<string, { data: any; timestamp: number }>();

export async function searchUSDA(query: string): Promise<Array<Record<string, unknown>>> {
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) {
        console.warn('[USDA Search] Missing USDA_API_KEY env var');
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cached = usdaCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=20`;
        const res = await fetch(url, {
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!res.ok) {
            console.error(`[USDA Search] HTTP ${res.status} for query="${query}"`);
            return [];
        }

        const data = await res.json();
        const foods = data.foods || [];

        const getNutrient = (nutrients: any[], ids: number[], nameQuery: string) => {
            const match = nutrients.find(n => 
                ids.includes(n.nutrientId) || 
                n.nutrientName?.toLowerCase().includes(nameQuery.toLowerCase())
            );
            return match ? parseFloat(match.value) : 0;
        };

        const results = foods.map((f: any) => {
            const nutrients = f.foodNutrients || [];
            
            const calories = getNutrient(nutrients, [1008], 'energy');
            const protein = getNutrient(nutrients, [1003], 'protein');
            const carbs = getNutrient(nutrients, [1005], 'carbohydrate');
            const fats = getNutrient(nutrients, [1004], 'total lipid');
            const fiber = getNutrient(nutrients, [1079], 'fiber');
            const sugar = getNutrient(nutrients, [2000, 1235], 'sugar');
            const saturatedFat = getNutrient(nutrients, [1258], 'fatty acids, total saturated');
            const sodium = getNutrient(nutrients, [1093], 'sodium');
            const potassium = getNutrient(nutrients, [1092], 'potassium');
            const cholesterol = getNutrient(nutrients, [1253], 'cholesterol');
            const calcium = getNutrient(nutrients, [1087], 'calcium');
            const iron = getNutrient(nutrients, [1089], 'iron');

            const servingSize = f.servingSize 
                ? `${f.servingSize}${f.servingSizeUnit || 'g'}`
                : (f.householdServingFullText || '100g');

            return {
                id: `usda-${f.fdcId}`,
                name: f.description || 'Unknown Food',
                brand: f.brandName || f.brandOwner || '',
                barcode: f.gtinUpc || null,
                calories,
                protein,
                carbs,
                fats,
                fiber,
                sugar,
                saturatedFat,
                sodium,
                potassium,
                cholesterol,
                calcium,
                iron,
                servingSize,
                source: 'usda'
            };
        });

        if (results.length > 0) {
            usdaCache.set(normalizedQuery, { data: results, timestamp: Date.now() });
            if (usdaCache.size > 200) {
                const firstKey = usdaCache.keys().next().value;
                if (firstKey !== undefined) usdaCache.delete(firstKey);
            }
        }

        return results;
    } catch (err) {
        console.error(`[USDA Search] Error for query="${query}":`, err instanceof Error ? err.message : err);
        return [];
    }
}

export async function searchNutritionix(query: string): Promise<Array<Record<string, unknown>>> {
    const appId = process.env.NUTRITIONIX_APP_ID;
    const apiKey = process.env.NUTRITIONIX_API_KEY;

    if (!appId || !apiKey) {
        console.warn('[Nutritionix Search] Missing NUTRITIONIX_APP_ID or NUTRITIONIX_API_KEY env vars');
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cached = nutritionixCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}&branded=true&common=true`;
        const res = await fetch(url, {
            headers: {
                'x-app-id': appId,
                'x-app-key': apiKey,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!res.ok) {
            console.error(`[Nutritionix Search] HTTP ${res.status} for query="${query}"`);
            return [];
        }

        const data = await res.json();
        const branded = data.branded || [];
        const common = data.common || [];

        const results: Array<Record<string, unknown>> = [];

        // Resolve common items via /v2/natural/nutrients (limit to 5 to avoid excessive API calls)
        const commonSlice = common.slice(0, 5);
        if (commonSlice.length > 0) {
            const commonResults = await Promise.allSettled(
                commonSlice.map(async (item: Record<string, unknown>) => {
                    try {
                        const nutrientRes = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
                            method: 'POST',
                            headers: {
                                'x-app-id': appId!,
                                'x-app-key': apiKey!,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ query: item.food_name }),
                            signal: AbortSignal.timeout(8000),
                        });
                        if (!nutrientRes.ok) return null;
                        const nutrientData = await nutrientRes.json();
                        const food = nutrientData.foods?.[0];
                        if (!food) return null;
                        return {
                            id: `nix-common-${item.food_name}`,
                            name: food.food_name || item.food_name || 'Unknown Food',
                            brand: '',
                            barcode: null,
                            calories: parseFloat(String(food.nf_calories || 0)),
                            protein: parseFloat(String(food.nf_protein || 0)),
                            carbs: parseFloat(String(food.nf_total_carbohydrate || 0)),
                            fats: parseFloat(String(food.nf_total_fat || 0)),
                            fiber: parseFloat(String(food.nf_dietary_fiber || 0)),
                            sugar: parseFloat(String(food.nf_sugars || 0)),
                            saturatedFat: parseFloat(String(food.nf_saturated_fat || 0)),
                            sodium: parseFloat(String(food.nf_sodium || 0)),
                            potassium: parseFloat(String(food.nf_potassium || 0)),
                            cholesterol: parseFloat(String(food.nf_cholesterol || 0)),
                            servingSize: food.serving_qty ? `${food.serving_qty} ${food.serving_unit || 'serving'}` : '1 serving',
                            source: 'nix'
                        };
                    } catch {
                        return null;
                    }
                })
            );
            for (const result of commonResults) {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            }
        }

        // Map branded items — use real macro fields from the API
        for (const item of branded.slice(0, 10)) {
            const calories = parseFloat(String(item.nf_calories || 0));
            // Use actual API fields; only fall back to estimation if all are missing
            const hasRealMacros = item.nf_protein != null || item.nf_total_carbohydrate != null || item.nf_total_fat != null;
            const protein = hasRealMacros ? parseFloat(String(item.nf_protein || 0)) : Math.round((calories * 0.20) / 4 * 10) / 10;
            const carbs = hasRealMacros ? parseFloat(String(item.nf_total_carbohydrate || 0)) : Math.round((calories * 0.50) / 4 * 10) / 10;
            const fats = hasRealMacros ? parseFloat(String(item.nf_total_fat || 0)) : Math.round((calories * 0.30) / 9 * 10) / 10;

            results.push({
                id: `nix-branded-${item.nix_item_id}`,
                name: item.food_name || 'Unknown Food',
                brand: item.brand_name || '',
                barcode: null,
                calories,
                protein,
                carbs,
                fats,
                servingSize: item.serving_qty ? `${item.serving_qty} ${item.serving_unit || 'serving'}` : '1 serving',
                source: 'nix'
            });
        }

        if (results.length > 0) {
            nutritionixCache.set(normalizedQuery, { data: results, timestamp: Date.now() });
            if (nutritionixCache.size > 200) {
                const firstKey = nutritionixCache.keys().next().value;
                if (firstKey !== undefined) nutritionixCache.delete(firstKey);
            }
        }

        return results;
    } catch (err) {
        console.error(`[Nutritionix Search] Error for query="${query}":`, err instanceof Error ? err.message : err);
        return [];
    }
}

export async function lookupNutritionixBarcode(barcode: string): Promise<Record<string, unknown> | null> {
    const appId = process.env.NUTRITIONIX_APP_ID;
    const apiKey = process.env.NUTRITIONIX_API_KEY;

    if (!appId || !apiKey) {
        console.warn('[Nutritionix Barcode] Missing NUTRITIONIX_APP_ID or NUTRITIONIX_API_KEY env vars');
        return null;
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        const url = `https://trackapi.nutritionix.com/v2/search/item?upc=${encodeURIComponent(barcode)}`;
        const res = await fetch(url, {
            headers: {
                'x-app-id': appId,
                'x-app-key': apiKey
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timer);

        if (!res.ok) {
            if (res.status !== 404) {
                console.error(`[Nutritionix Barcode] HTTP ${res.status} for barcode="${barcode}"`);
            }
            return null;
        }

        const data = await res.json();
        const foods = data.foods || [];
        if (foods.length === 0) return null;

        const p = foods[0];
        return {
            name: p.food_name || 'Unknown Food',
            brand: p.brand_name || null,
            barcode: barcode,
            servingSize: p.serving_qty ? `${p.serving_qty} ${p.serving_unit || 'g'}` : '100g',
            calories: parseFloat(String(p.nf_calories || 0)),
            protein: parseFloat(String(p.nf_protein || 0)),
            carbs: parseFloat(String(p.nf_total_carbohydrate || 0)),
            fats: parseFloat(String(p.nf_total_fat || 0)),
            fiber: parseFloat(String(p.nf_dietary_fiber || 0)),
            sugar: parseFloat(String(p.nf_sugars || 0)),
            saturatedFat: parseFloat(String(p.nf_saturated_fat || 0)),
            sodium: parseFloat(String(p.nf_sodium || 0)),
            potassium: parseFloat(String(p.nf_potassium || 0)),
            cholesterol: parseFloat(String(p.nf_cholesterol || 0)),
            calcium: parseFloat(String(p.nf_calcium || 0)),
            iron: parseFloat(String(p.nf_iron || 0)),
        };
    } catch (err) {
        console.error(`[Nutritionix Barcode] Error for barcode="${barcode}":`, err instanceof Error ? err.message : err);
        return null;
    }
}

