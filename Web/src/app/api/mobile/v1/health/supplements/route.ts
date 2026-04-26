import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { handleError } from '@/lib/errors/handler';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses } from '@/lib/api/apiResponse';

export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const supplements = await prisma.supplement.findMany({
            where: { userId: authUser.id },
            orderBy: [{ timeOfDay: 'asc' }, { order: 'asc' }],
            include: { stack: true }
        });

        return NextResponse.json(supplements, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const { name, amount, unit, timeOfDay, daysOfWeek, isActive, stackId } = body;

        const supplement = await prisma.supplement.create({
            data: {
                userId: authUser.id,
                name,
                amount: parseFloat(amount),
                unit,
                timeOfDay,
                daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                isActive: isActive ?? true,
                stackId: stackId || null,
            }
        });

        return NextResponse.json(supplement, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const body = await request.json();
        const { id, name, amount, unit, timeOfDay, daysOfWeek, isActive, order, stackId } = body;

        const existing = await prisma.supplement.findUnique({ where: { id } });
        if (!existing || existing.userId !== authUser.id) {
            return errorResponses.notFound('Supplement');
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

        return NextResponse.json(supplement, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return errorResponses.badRequest('Missing id');

        const existing = await prisma.supplement.findUnique({ where: { id } });
        if (!existing || existing.userId !== authUser.id) {
            return errorResponses.notFound('Supplement');
        }

        await prisma.supplement.delete({ where: { id } });

        return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleError(error);
    }
}
