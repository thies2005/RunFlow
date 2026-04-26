import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

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

        const userId = authUser.id;
        const body = await request.json();
        const { date, mealType, quantity, foodItem } = body;

        let dbFoodItem;
        if (foodItem.barcode) {
            dbFoodItem = await prisma.foodItem.upsert({
                where: { barcode: foodItem.barcode },
                update: {},
                create: {
                    name: foodItem.name,
                    brand: foodItem.brand,
                    barcode: foodItem.barcode,
                    calories: foodItem.calories,
                    protein: foodItem.protein,
                    carbs: foodItem.carbs,
                    fats: foodItem.fats,
                    servingSize: foodItem.servingSize,
                    fiber: foodItem.fiber,
                    sugar: foodItem.sugar,
                    saturatedFat: foodItem.saturatedFat,
                    sodium: foodItem.sodium,
                    potassium: foodItem.potassium,
                    cholesterol: foodItem.cholesterol,
                    calcium: foodItem.calcium,
                    iron: foodItem.iron,
                }
            });
        } else {
            dbFoodItem = await prisma.foodItem.create({
                data: {
                    name: foodItem.name,
                    brand: foodItem.brand,
                    calories: foodItem.calories,
                    protein: foodItem.protein,
                    carbs: foodItem.carbs,
                    fats: foodItem.fats,
                    servingSize: foodItem.servingSize,
                    fiber: foodItem.fiber,
                    sugar: foodItem.sugar,
                    saturatedFat: foodItem.saturatedFat,
                    sodium: foodItem.sodium,
                    potassium: foodItem.potassium,
                    cholesterol: foodItem.cholesterol,
                    calcium: foodItem.calcium,
                    iron: foodItem.iron,
                }
            });
        }

        const log = await prisma.nutritionLog.create({
            data: {
                userId,
                date,
                mealType,
                quantity,
                calories: dbFoodItem.calories * quantity,
                protein: dbFoodItem.protein * quantity,
                carbs: dbFoodItem.carbs * quantity,
                fats: dbFoodItem.fats * quantity,
                fiber: dbFoodItem.fiber ? dbFoodItem.fiber * quantity : null,
                sugar: dbFoodItem.sugar ? dbFoodItem.sugar * quantity : null,
                saturatedFat: dbFoodItem.saturatedFat ? dbFoodItem.saturatedFat * quantity : null,
                sodium: dbFoodItem.sodium ? dbFoodItem.sodium * quantity : null,
                potassium: dbFoodItem.potassium ? dbFoodItem.potassium * quantity : null,
                cholesterol: dbFoodItem.cholesterol ? dbFoodItem.cholesterol * quantity : null,
                calcium: dbFoodItem.calcium ? dbFoodItem.calcium * quantity : null,
                iron: dbFoodItem.iron ? dbFoodItem.iron * quantity : null,
                foodItemId: dbFoodItem.id,
            }
        });

        return NextResponse.json(log, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/log' });
    }
}
