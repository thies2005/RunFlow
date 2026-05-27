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

        const meals = await prisma.savedMeal.findMany({
            where: { userId: authUser.id },
            include: { items: true },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(meals, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/meals' });
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
        const { name, items, totalCalories, totalProtein, totalCarbs, totalFats } = body;

        if (!name || !items?.length) {
            return errorResponses.badRequest('Meal name and items are required');
        }

        const meal = await prisma.savedMeal.create({
            data: {
                userId: authUser.id,
                name,
                totalCalories: totalCalories || 0,
                totalProtein: totalProtein || 0,
                totalCarbs: totalCarbs || 0,
                totalFats: totalFats || 0,
                items: {
                    create: items.map((item: any) => ({
                        name: item.name,
                        estimatedGrams: item.estimatedGrams || 0,
                        calories: item.calories || 0,
                        protein: item.protein || 0,
                        carbs: item.carbs || 0,
                        fats: item.fats || 0,
                    })),
                },
            },
            include: { items: true },
        });

        return NextResponse.json(meal, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/meals' });
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
        const mealId = searchParams.get('id');

        if (!mealId) {
            return errorResponses.badRequest('Meal ID is required');
        }

        const existing = await prisma.savedMeal.findFirst({
            where: { id: mealId, userId: authUser.id },
        });

        if (!existing) {
            return errorResponses.notFound('Saved meal not found');
        }

        await prisma.savedMeal.delete({
            where: { id: mealId },
        });

        return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/meals' });
    }
}

export async function PUT(request: NextRequest) {
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
        const mealId = searchParams.get('id');
        if (!mealId) {
            return errorResponses.badRequest('Meal ID is required');
        }

        const body = await request.json();
        const { name, items, totalCalories, totalProtein, totalCarbs, totalFats } = body;
        if (!name || !items?.length) {
            return errorResponses.badRequest('Meal name and items are required');
        }

        const existing = await prisma.savedMeal.findFirst({
            where: { id: mealId, userId: authUser.id },
        });
        if (!existing) {
            return errorResponses.notFound('Saved meal not found');
        }

        const meal = await prisma.$transaction(async (tx) => {
            await tx.savedMealItem.deleteMany({ where: { savedMealId: mealId } });
            return tx.savedMeal.update({
                where: { id: mealId },
                data: {
                    name,
                    totalCalories: totalCalories || 0,
                    totalProtein: totalProtein || 0,
                    totalCarbs: totalCarbs || 0,
                    totalFats: totalFats || 0,
                    items: {
                        create: items.map((item: any) => ({
                            name: item.name,
                            estimatedGrams: item.estimatedGrams || 0,
                            calories: item.calories || 0,
                            protein: item.protein || 0,
                            carbs: item.carbs || 0,
                            fats: item.fats || 0,
                        })),
                    },
                },
                include: { items: true },
            });
        });

        return NextResponse.json(meal, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/meals' });
    }
}
