import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cache for the OAuth token so we don't request a new one on every request
let fatsecretAccessToken: string | null = null;
let tokenExpiryTime: number = 0; // Timestamp when token expires

/**
 * Fetch a new OAuth 2.0 Client Credentials token from FatSecret
 */
async function getFatSecretToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn("FatSecret Client ID or Secret is not configured in environment.");
        return null;
    }

    // Return cached token if valid
    if (fatsecretAccessToken && Date.now() < tokenExpiryTime) {
        return fatsecretAccessToken;
    }

    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const params = new URLSearchParams({
            scope: 'basic',
            grant_type: 'client_credentials'
        });

        const res = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: params.toString()
        });

        if (!res.ok) {
            console.error("FatSecret auth failed:", await res.text());
            return null;
        }

        const data = await res.json();
        fatsecretAccessToken = data.access_token;
        // Subtract 60 seconds from expiry to be safe
        tokenExpiryTime = Date.now() + ((data.expires_in - 60) * 1000);

        return fatsecretAccessToken;
    } catch (error) {
        console.error("Error fetching FatSecret token:", error);
        return null;
    }
}

/**
 * Fetch from FatSecret search API with a timeout
 */
async function fetchFatSecretWithTimeout(query: string, timeoutMs: number, token: string): Promise<Array<Record<string, unknown>>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Method based REST API for FatSecret v2 using OAuth2
        // URL format based on FatSecret API: POST https://platform.fatsecret.com/rest/server.api
        const searchParams = new URLSearchParams({
            method: 'foods.search.v3', // Try new structured nested approach
            search_expression: query,
            format: 'json',
            max_results: '30'
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

        if (!fsRes.ok) {
            console.error(`FatSecret API error: ${fsRes.status} ${await fsRes.text()}`);
            return [];
        }

        const fsData = await fsRes.json();

        // Handle different wrapper shapes from API versions (foods vs foods_search)
        const root = fsData.foods_search || fsData.foods || fsData || {};
        const results = root.results?.food || root.food || [];

        console.log(`FatSecret API returned ${Array.isArray(results) ? results.length : (results ? 1 : 0)} items for query: ${query}`);

        // FatSecret returns a single object if there's only 1 item, otherwise an array.
        const items = Array.isArray(results) ? results : (results ? [results] : []);

        return items.map((p: any) => {
            let calories = 0, carbs = 0, protein = 0, fats = 0, servingSize = '1 serving';

            // 1) Try structured v5 API nested format
            if (p.servings?.serving) {
                const servings = Array.isArray(p.servings.serving) ? p.servings.serving : [p.servings.serving];
                // Find default serving, or 100g, or just the first
                const bestServing = servings.find((s: any) => s.is_default === "1") || servings[0];

                if (bestServing) {
                    calories = parseFloat(bestServing.calories || "0");
                    carbs = parseFloat(bestServing.carbohydrate || "0");
                    protein = parseFloat(bestServing.protein || "0");
                    fats = parseFloat(bestServing.fat || "0");
                    servingSize = bestServing.serving_description || bestServing.measurement_description || '1 serving';
                }
            }
            // 2) Fallback to legacy v1 text description parsing
            else if (p.food_description) {
                const desc = p.food_description || '';
                const calMatch = desc.match(/Calories:\s*([\d.]+)kcal/i);
                const fatMatch = desc.match(/Fat:\s*([\d.]+)g/i);
                const carbMatch = desc.match(/Carbs:\s*([\d.]+)g/i);
                const proMatch = desc.match(/Protein:\s*([\d.]+)g/i);
                const servingMatch = desc.match(/Per\s*([^-\|]+)/i);

                calories = calMatch ? parseFloat(calMatch[1]) : 0;
                fats = fatMatch ? parseFloat(fatMatch[1]) : 0;
                carbs = carbMatch ? parseFloat(carbMatch[1]) : 0;
                protein = proMatch ? parseFloat(proMatch[1]) : 0;
                servingSize = servingMatch ? servingMatch[1].trim() : '1 serving';
            }

            return {
                id: `fs-${p.food_id}`,
                name: p.food_name || 'Unknown',
                brand: p.brand_name || '', // Note: FatSecret gives brand_name for branded foods
                barcode: null, // Basic search does not expose barcode reliably
                calories,
                protein,
                carbs,
                fats,
                servingSize,
                source: 'fs'
            };
        });
    } catch (e) {
        console.error("FatSecret fetch error:", e);
        return [];
    } finally {
        clearTimeout(timer);
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const normalizedQuery = query.toLowerCase().trim();

    try {
        // 1. Check cache first
        const cacheEntry = await prisma.fatSecretFoodCache.findUnique({
            where: { query: normalizedQuery }
        });

        if (cacheEntry) {
            // Check if cache is older than 90 days
            const ageInMs = Date.now() - cacheEntry.updatedAt.getTime();
            const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

            if (ageInMs < ninetyDaysMs) {
                return NextResponse.json(cacheEntry.results);
            }
        }

        // 2. Fetch from FatSecret
        const token = await getFatSecretToken();
        if (!token) {
            return NextResponse.json({ error: 'FatSecret API not configured' }, { status: 501 });
        }

        // Fetch with 30s timeout
        const fsResults = await fetchFatSecretWithTimeout(query, 30000, token);

        // 3. Save to cache asynchronously
        if (fsResults && fsResults.length > 0) {
            setTimeout(async () => {
                try {
                    await prisma.fatSecretFoodCache.upsert({
                        where: { query: normalizedQuery },
                        update: { results: fsResults as any, updatedAt: new Date() },
                        create: { query: normalizedQuery, results: fsResults as any },
                    });

                    // Manage cache size
                    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
                    await prisma.fatSecretFoodCache.deleteMany({
                        where: { updatedAt: { lt: ninetyDaysAgo } }
                    });

                    // Cap at ~150,000 items
                    const cacheCount = await prisma.fatSecretFoodCache.count();
                    const MAX_CACHE_SIZE = 150000;

                    if (cacheCount > MAX_CACHE_SIZE) {
                        const overage = cacheCount - MAX_CACHE_SIZE;
                        const itemsToDelete = await prisma.fatSecretFoodCache.findMany({
                            select: { id: true },
                            orderBy: { updatedAt: 'asc' },
                            take: overage
                        });

                        const idsToDelete = itemsToDelete.map((item: { id: string }) => item.id);
                        await prisma.fatSecretFoodCache.deleteMany({
                            where: { id: { in: idsToDelete } }
                        });
                    }
                } catch (dbError) {
                    console.error("Error saving FatSecret cache:", dbError);
                }
            }, 0);
        }

        return NextResponse.json(fsResults);
    } catch (error) {
        console.error("FatSecret search error:", error);
        return NextResponse.json({ error: 'Failed to fetch from FatSecret' }, { status: 500 });
    }
}
