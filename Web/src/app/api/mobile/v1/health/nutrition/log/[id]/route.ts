import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

        const { id } = await params;
        const log = await prisma.nutritionLog.findFirst({
            where: { id, userId: authUser.id },
        });
        if (!log) {
            return errorResponses.notFound('Food log not found');
        }

        await prisma.nutritionLog.delete({ where: { id } });
        return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/log/[id]' });
    }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
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

        const { id } = await params;
        const body = await request.json();
        const quantity = Number(body.quantity);
        const mealType = typeof body.mealType === 'string' ? body.mealType : 'snack';

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return errorResponses.badRequest('Quantity must be greater than zero');
        }

        const log = await prisma.nutritionLog.findFirst({
            where: { id, userId: authUser.id },
            include: { foodItem: true },
        });
        if (!log) {
            return errorResponses.notFound('Food log not found');
        }

        const food = log.foodItem;
        const updated = await prisma.nutritionLog.update({
            where: { id },
            data: {
                mealType,
                quantity,
                calories: food.calories * quantity,
                protein: food.protein * quantity,
                carbs: food.carbs * quantity,
                fats: food.fats * quantity,
                fiber: food.fiber ? food.fiber * quantity : null,
                sugar: food.sugar ? food.sugar * quantity : null,
                saturatedFat: food.saturatedFat ? food.saturatedFat * quantity : null,
                sodium: food.sodium ? food.sodium * quantity : null,
                potassium: food.potassium ? food.potassium * quantity : null,
                cholesterol: food.cholesterol ? food.cholesterol * quantity : null,
                calcium: food.calcium ? food.calcium * quantity : null,
                iron: food.iron ? food.iron * quantity : null,
            },
            include: { foodItem: true },
        });

        return NextResponse.json(updated, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/log/[id]' });
    }
}
