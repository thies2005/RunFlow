import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const log = await prisma.nutritionLog.findUnique({
            where: { id }
        });

        if (!log || log.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.nutritionLog.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { quantity, mealType } = body;

        if (!quantity || !mealType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const log = await prisma.nutritionLog.findUnique({
            where: { id },
            include: { foodItem: true }
        });

        if (!log || log.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const food = log.foodItem;
        const newQty = parseFloat(quantity);

        const updatedLog = await prisma.nutritionLog.update({
            where: { id },
            data: {
                quantity: newQty,
                mealType,
                calories: food.calories * newQty,
                protein: food.protein * newQty,
                carbs: food.carbs * newQty,
                fats: food.fats * newQty,
            }
        });

        return NextResponse.json(updatedLog);
    } catch (error) {
        return handleError(error);
    }
}
