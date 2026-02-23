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
                }
            });
        }

        // Create the user's log record with snapshot macros based on quantity
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
                foodItemId: dbFoodItem.id,
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to log food' }, { status: 500 });
    }
}
