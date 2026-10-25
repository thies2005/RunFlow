import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { subDays, format } from 'date-fns';
import { healthDataConsentWithdrawn } from '@/lib/health/consent-gate';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        if (await healthDataConsentWithdrawn(userId)) {
            return NextResponse.json(
                { error: 'Health data consent has been withdrawn. Re-grant HEALTH_DATA consent to copy meals.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { targetDate, mealType } = body;

        if (typeof targetDate !== 'string' || !DATE_PATTERN.test(targetDate) || typeof mealType !== 'string' || !mealType.trim()) {
            return NextResponse.json({ error: 'Missing or invalid targetDate or mealType' }, { status: 400 });
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
