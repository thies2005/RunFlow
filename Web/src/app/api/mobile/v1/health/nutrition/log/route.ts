import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';

const foodItemSchema = z.object({
    name: z.string().min(1),
    brand: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
    servingSize: z.string().nullable().optional(),
    fiber: z.number().nullable().optional(),
    sugar: z.number().nullable().optional(),
    saturatedFat: z.number().nullable().optional(),
    sodium: z.number().nullable().optional(),
    potassium: z.number().nullable().optional(),
    cholesterol: z.number().nullable().optional(),
    calcium: z.number().nullable().optional(),
    iron: z.number().nullable().optional(),
});

const logInputSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be a valid YYYY-MM-DD string'),
    mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
    quantity: z.number().finite().positive(),
    foodItem: foodItemSchema,
});

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

        const parsed = logInputSchema.safeParse(body);
        if (!parsed.success) {
            return errorResponses.validation('Invalid nutrition log input', parsed.error.flatten());
        }
        const { date, mealType, quantity, foodItem } = parsed.data;

        const log = await prisma.$transaction(async (tx) => {
            let dbFoodItem;
            if (foodItem.barcode) {
                dbFoodItem = await tx.foodItem.upsert({
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
                dbFoodItem = await tx.foodItem.create({
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

            return tx.nutritionLog.create({
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
                },
                include: { foodItem: true },
            });
        });

        return NextResponse.json(log, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/log' });
    }
}
