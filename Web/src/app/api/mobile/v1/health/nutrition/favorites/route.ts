import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

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

        const favorites = await prisma.foodFavorite.findMany({
            where: { userId: authUser.id },
            orderBy: { createdAt: 'desc' },
        });

        const results = favorites.map(f => ({
            id: f.sourceId || f.id,
            name: f.foodName,
            brand: f.brand || '',
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fats: f.fats,
            servingSize: f.servingSize || '100g',
            barcode: f.barcode,
            source: f.source || 'favorite',
            favoriteId: f.id,
        }));

        return NextResponse.json(results, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/favorites' });
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { name, brand, calories, protein, carbs, fats, servingSize, barcode, source, sourceId } = body;

        if (!name) {
            return errorResponses.badRequest('Food name is required');
        }

        const normalizedBrand = brand || '';

        const favorite = await prisma.foodFavorite.upsert({
            where: {
                userId_foodName_brand: {
                    userId: authUser.id,
                    foodName: name,
                    brand: normalizedBrand,
                }
            },
            update: {
                calories: calories || 0,
                protein: protein || 0,
                carbs: carbs || 0,
                fats: fats || 0,
                servingSize: servingSize || '100g',
                barcode: barcode || null,
                source: source || null,
                sourceId: sourceId || null,
            },
            create: {
                userId: authUser.id,
                foodName: name,
                brand: normalizedBrand,
                calories: calories || 0,
                protein: protein || 0,
                carbs: carbs || 0,
                fats: fats || 0,
                servingSize: servingSize || '100g',
                barcode: barcode || null,
                source: source || null,
                sourceId: sourceId || null,
            },
        });

        return NextResponse.json({
            id: favorite.sourceId || favorite.id,
            name: favorite.foodName,
            brand: favorite.brand || '',
            calories: favorite.calories,
            protein: favorite.protein,
            carbs: favorite.carbs,
            fats: favorite.fats,
            servingSize: favorite.servingSize || '100g',
            barcode: favorite.barcode,
            source: favorite.source || 'favorite',
            favoriteId: favorite.id,
        }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/favorites' });
    }
}

export async function DELETE(request: NextRequest) {
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
        const favoriteId = searchParams.get('id');

        if (!favoriteId) {
            return errorResponses.badRequest('Favorite ID is required');
        }

        const existing = await prisma.foodFavorite.findFirst({
            where: { id: favoriteId, userId: authUser.id },
        });

        if (!existing) {
            return errorResponses.notFound('Favorite not found');
        }

        await prisma.foodFavorite.delete({
            where: { id: favoriteId },
        });

        return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/favorites' });
    }
}
