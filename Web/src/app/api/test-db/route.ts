import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const p = await prisma.foodItem.create({
            data: {
                name: 'Test Food',
                brand: 'AI Scan',
                calories: 100,
                protein: 5,
                carbs: 10,
                fats: 2,
                servingSize: '100g'
            }
        });

        const l = await prisma.nutritionLog.create({
            data: {
                userId: 'cmlz4y1l300007bbptfn4qer5',
                date: '2026-02-25',
                mealType: 'LUNCH',
                quantity: 1,
                calories: 100,
                protein: 5,
                carbs: 10,
                fats: 2,
                foodItemId: p.id
            }
        });
        return NextResponse.json({ success: true, l });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
