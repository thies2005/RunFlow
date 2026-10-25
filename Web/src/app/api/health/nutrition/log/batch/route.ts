import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { healthDataConsentWithdrawn } from '@/lib/health/consent-gate';

const MAX_BATCH_NUTRITION_ITEMS = 50;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidNonNegativeNumber(v: unknown, max: number): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        if (await healthDataConsentWithdrawn(userId)) {
            return NextResponse.json(
                { error: 'Health data consent has been withdrawn. Re-grant HEALTH_DATA consent to log nutrition.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { date, mealType, items } = body;

        if (typeof date !== 'string' || !DATE_PATTERN.test(date) || typeof mealType !== 'string' || !mealType.trim() || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields or empty items list' }, { status: 400 });
        }

        if (items.length > MAX_BATCH_NUTRITION_ITEMS) {
            return NextResponse.json({ error: `Batch size exceeds maximum of ${MAX_BATCH_NUTRITION_ITEMS} items` }, { status: 400 });
        }

        for (const item of items) {
            if (
                !item ||
                typeof item.foodItemId !== 'string' ||
                !item.foodItemId.trim() ||
                !isValidNonNegativeNumber(item.quantity, 1000) ||
                item.quantity <= 0 ||
                !isValidNonNegativeNumber(item.calories, 25000) ||
                !isValidNonNegativeNumber(item.protein, 2000) ||
                !isValidNonNegativeNumber(item.carbs, 2000) ||
                !isValidNonNegativeNumber(item.fats, 2000)
            ) {
                return NextResponse.json({ error: 'Invalid nutrition item values in batch' }, { status: 400 });
            }
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
