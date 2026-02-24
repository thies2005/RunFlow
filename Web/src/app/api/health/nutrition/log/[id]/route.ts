import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const logId = params.id;

        // Verify ownership before deleting
        const log = await prisma.nutritionLog.findUnique({
            where: { id: logId }
        });

        if (!log || log.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        await prisma.nutritionLog.delete({
            where: { id: logId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const logId = params.id;
        const body = await request.json();
        const { quantity, mealType } = body;

        if (!quantity || !mealType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const log = await prisma.nutritionLog.findUnique({
            where: { id: logId },
            include: { foodItem: true }
        });

        if (!log || log.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        // Recalculate snapshot based on the foodItem's base macros
        const food = log.foodItem;
        const newQty = parseFloat(quantity);

        const updatedLog = await prisma.nutritionLog.update({
            where: { id: logId },
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
