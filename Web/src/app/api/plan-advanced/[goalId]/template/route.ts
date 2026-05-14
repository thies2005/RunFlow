import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const url = new URL(req.url);
        const defaultOnly = url.searchParams.get('default') === 'true';

        const where: Record<string, unknown> = { userId: session.user.id };
        if (defaultOnly) {
            where.isDefault = true;
        }

        const templates = await prisma.weekTemplate.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({ templates });
    } catch (error) {
        console.error('List week templates error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id, planSource: 'advanced' },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { name, description, days } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
        }

        if (!Array.isArray(days) || days.length === 0) {
            return NextResponse.json({ error: 'days must be a non-empty array' }, { status: 400 });
        }

        const template = await prisma.weekTemplate.create({
            data: {
                userId: session.user.id,
                name: name.trim(),
                description: description || null,
                days,
                isDefault: false,
            },
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (error) {
        console.error('Create week template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const body = await req.json();
        const { id, name, description, days, isDefault } = body;

        if (!id) {
            return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
        }

        const template = await prisma.weekTemplate.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return NextResponse.json({ error: 'Template name must be a non-empty string' }, { status: 400 });
            }
            updateData.name = name.trim();
        }
        if (description !== undefined) updateData.description = description || null;
        if (days !== undefined) {
            if (!Array.isArray(days) || days.length === 0) {
                return NextResponse.json({ error: 'days must be a non-empty array' }, { status: 400 });
            }
            updateData.days = days;
        }
        if (isDefault !== undefined) updateData.isDefault = !!isDefault;

        const updated = await prisma.weekTemplate.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ template: updated });
    } catch (error) {
        console.error('Update week template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Template id query parameter is required' }, { status: 400 });
        }

        const template = await prisma.weekTemplate.findFirst({
            where: { id, userId: session.user.id },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        await prisma.weekTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete week template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
