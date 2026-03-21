export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/health/nutrition/meals?userId=...
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const meals = await prisma.savedMeal.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(meals);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }
}

// POST /api/health/nutrition/meals
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, name, items, totalCalories, totalProtein, totalCarbs, totalFats } = body;

        if (!userId || !name || !items?.length) {
            return NextResponse.json(
                { error: 'userId, name, and items are required' },
                { status: 400 }
            );
        }

        const meal = await prisma.savedMeal.create({
            data: {
                userId,
                name,
                totalCalories: totalCalories || 0,
                totalProtein: totalProtein || 0,
                totalCarbs: totalCarbs || 0,
                totalFats: totalFats || 0,
                items: {
                    create: items.map((item: any) => ({
                        name: item.name,
                        estimatedGrams: item.estimatedGrams || 0,
                        calories: item.calories || 0,
                        protein: item.protein || 0,
                        carbs: item.carbs || 0,
                        fats: item.fats || 0,
                    })),
                },
            },
            include: { items: true },
        });

        return NextResponse.json(meal);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save meal' }, { status: 500 });
    }
}

// DELETE /api/health/nutrition/meals?id=...
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Meal id is required' }, { status: 400 });
    }

    try {
        await prisma.savedMeal.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
