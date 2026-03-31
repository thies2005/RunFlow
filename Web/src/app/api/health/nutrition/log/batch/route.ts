import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        
        const { date, mealType, items } = body;

        if (!date || !mealType || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields or empty items list' }, { status: 400 });
        }

        // Map items to Prisma's create format
        // The items array should contain the necessary data to create new NutritionLogs
        // We assume items[] contains { quantity, foodItemId, calories, protein, carbs, fats, etc }
        
        const createOperations = items.map((item: any) => ({
            userId,
            date,
            mealType,
            quantity: item.quantity,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            foodItemId: item.foodItemId,
            // Include optional micronutrients if present
            fiber: item.fiber,
            sugar: item.sugar,
            saturatedFat: item.saturatedFat,
            sodium: item.sodium,
            potassium: item.potassium,
            cholesterol: item.cholesterol,
            calcium: item.calcium,
            iron: item.iron,
        }));

        // Perform batch insert
        const result = await prisma.nutritionLog.createMany({
            data: createOperations,
        });

        return NextResponse.json({ success: true, count: result.count });

    } catch (error) {
        console.error("Error in batch logging food:", error);
        return NextResponse.json({ error: 'Failed to batch log foods' }, { status: 500 });
    }
}
