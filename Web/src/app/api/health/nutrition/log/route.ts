import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { healthDataConsentWithdrawn, HEALTH_DATA_WITHDRAWN_MESSAGE } from '@/lib/health/consent-gate';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        if (await healthDataConsentWithdrawn(userId)) {
            return NextResponse.json({ error: HEALTH_DATA_WITHDRAWN_MESSAGE }, { status: 400 });
        }

        const body = await request.json();
        const { date, mealType, quantity, foodItem } = body;

        if (
            typeof quantity !== 'number' ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            quantity > 1000
        ) {
            return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
        }

        if (
            !foodItem ||
            typeof foodItem !== 'object' ||
            typeof foodItem.calories !== 'number' ||
            !Number.isFinite(foodItem.calories) ||
            foodItem.calories < 0 ||
            typeof foodItem.protein !== 'number' ||
            !Number.isFinite(foodItem.protein) ||
            foodItem.protein < 0 ||
            typeof foodItem.carbs !== 'number' ||
            !Number.isFinite(foodItem.carbs) ||
            foodItem.carbs < 0 ||
            typeof foodItem.fats !== 'number' ||
            !Number.isFinite(foodItem.fats) ||
            foodItem.fats < 0
        ) {
            return NextResponse.json({ error: 'Invalid food item data' }, { status: 400 });
        }

        let dbFoodItem;
        if (foodItem.barcode) {
            const existing = await prisma.foodItem.findUnique({
                where: { barcode: String(foodItem.barcode) },
            });
            if (existing) {
                dbFoodItem = existing;
            } else {
                dbFoodItem = await prisma.foodItem.create({
                    data: {
                        name: foodItem.name,
                        brand: foodItem.brand,
                        barcode: null,
                        calories: foodItem.calories,
                        protein: foodItem.protein,
                        carbs: foodItem.carbs,
                        fats: foodItem.fats,
                        servingSize: foodItem.servingSize,
                        // Micronutrients
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
        } else {
            dbFoodItem = await prisma.foodItem.create({
                data: {
                    name: foodItem.name,
                    brand: foodItem.brand,
                    barcode: null,
                    calories: foodItem.calories,
                    protein: foodItem.protein,
                    carbs: foodItem.carbs,
                    fats: foodItem.fats,
                    servingSize: foodItem.servingSize,
                    // Micronutrients
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

        // Create the user's log record with snapshot macros and micronutrients based on quantity
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
                // Micronutrients scaled by quantity
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

        return NextResponse.json(log);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
