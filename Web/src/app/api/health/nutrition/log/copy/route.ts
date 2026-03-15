import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { subDays, format } from 'date-fns';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        
        const { targetDate, mealType } = body;

        if (!targetDate || !mealType) {
            return NextResponse.json({ error: 'Missing targetDate or mealType' }, { status: 400 });
        }

        // Calculate yesterday's date based on targetDate
        const targetDateObj = new Date(targetDate);
        const yesterdayDateObj = subDays(targetDateObj, 1);
        const yesterdayStr = format(yesterdayDateObj, 'yyyy-MM-dd');

        // Fetch yesterday's logs for this meal slot
        const yesterdayLogs = await prisma.nutritionLog.findMany({
            where: {
                userId,
                date: yesterdayStr,
                mealType,
            }
        });

        if (yesterdayLogs.length === 0) {
            return NextResponse.json({ error: 'No logs found for yesterday' }, { status: 404 });
        }

        // Prepare new logs for today
        const createOperations = yesterdayLogs.map(log => ({
            userId,
            date: targetDate,
            mealType,
            quantity: log.quantity,
            calories: log.calories,
            protein: log.protein,
            carbs: log.carbs,
            fats: log.fats,
            foodItemId: log.foodItemId,
            fiber: log.fiber,
            sugar: log.sugar,
            saturatedFat: log.saturatedFat,
            sodium: log.sodium,
            potassium: log.potassium,
            cholesterol: log.cholesterol,
            calcium: log.calcium,
            iron: log.iron,
        }));

        const result = await prisma.nutritionLog.createMany({
            data: createOperations,
        });

        return NextResponse.json({ success: true, count: result.count });

    } catch (error) {
        console.error("Error copying yesterday's meals:", error);
        return NextResponse.json({ error: 'Failed to copy meals' }, { status: 500 });
    }
}
