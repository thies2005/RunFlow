import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Will check if this path is right, sometimes it's '@/lib/prisma' or 'lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, date, mealType, quantity, foodItem } = body;

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
        return NextResponse.json({ error: 'Failed to log food' }, { status: 500 });
    }
}
