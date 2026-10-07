import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// GET /api/health/nutrition/meals
// Meals are always scoped to the authenticated session user; any client-supplied
// userId is ignored (mirrors /api/mobile/v1/health/nutrition/meals).
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const meals = await prisma.savedMeal.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(meals);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }
}

// POST /api/health/nutrition/meals
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, items, totalCalories, totalProtein, totalCarbs, totalFats } = body;

        if (!name || !items?.length) {
            return NextResponse.json(
                { error: 'name and items are required' },
                { status: 400 }
            );
        }

        // userId derives from the session only; a body-supplied userId is never trusted.
        const meal = await prisma.savedMeal.create({
            data: {
                userId: session.user.id,
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
    } catch {
        return NextResponse.json({ error: 'Failed to save meal' }, { status: 500 });
    }
}

// DELETE /api/health/nutrition/meals?id=...
export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Meal id is required' }, { status: 400 });
    }

    try {
        // Owner-bound lookup: a meal id belonging to another user is treated as not found.
        const existing = await prisma.savedMeal.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.savedMeal.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
