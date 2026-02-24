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

        const stacks = await prisma.supplementStack.findMany({
            where: { userId: session.user.id },
            orderBy: [{ timeOfDay: 'asc' }, { order: 'asc' }],
            include: { supplements: true }
        });

        return NextResponse.json(stacks);
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
        const { name, timeOfDay, isActive } = body;

        const stack = await prisma.supplementStack.create({
            data: {
                userId: session.user.id,
                name,
                timeOfDay,
                isActive: isActive ?? true
            }
        });

        return NextResponse.json(stack);
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
        const { id, name, timeOfDay, isActive, order } = body;

        const existing = await prisma.supplementStack.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const stack = await prisma.supplementStack.update({
            where: { id },
            data: {
                name: name ?? existing.name,
                timeOfDay: timeOfDay ?? existing.timeOfDay,
                isActive: isActive ?? existing.isActive,
                order: order ?? existing.order,
            }
        });

        return NextResponse.json(stack);
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

        const existing = await prisma.supplementStack.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.supplementStack.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleError(error);
    }
}
