export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supplements = await prisma.supplement.findMany({
            where: { userId: session.user.id },
            orderBy: [{ timeOfDay: 'asc' }, { order: 'asc' }],
            include: { stack: true }
        });

        return NextResponse.json(supplements);
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, amount, unit, timeOfDay, daysOfWeek, isActive, stackId } = body;

        const supplement = await prisma.supplement.create({
            data: {
                userId: session.user.id,
                name,
                amount: parseFloat(amount),
                unit,
                timeOfDay,
                daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                isActive: isActive ?? true,
                stackId: stackId || null,
            }
        });

        return NextResponse.json(supplement);
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, amount, unit, timeOfDay, daysOfWeek, isActive, order, stackId } = body;

        // Ensure user owns this supplement
        const existing = await prisma.supplement.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const supplement = await prisma.supplement.update({
            where: { id },
            data: {
                name: name ?? existing.name,
                amount: amount !== undefined ? parseFloat(amount) : existing.amount,
                unit: unit ?? existing.unit,
                timeOfDay: timeOfDay ?? existing.timeOfDay,
                daysOfWeek: daysOfWeek ?? existing.daysOfWeek,
                isActive: isActive ?? existing.isActive,
                order: order ?? existing.order,
                stackId: stackId !== undefined ? stackId : existing.stackId,
            }
        });

        return NextResponse.json(supplement);
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const existing = await prisma.supplement.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.supplement.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
