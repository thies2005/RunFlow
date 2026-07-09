/**
 * Admin Workout Template management by id (audit G8 - shared workout library)
 *
 * PATCH   /api/admin/workout-templates/[id]   - update a template
 * DELETE  /api/admin/workout-templates/[id]   - delete a template
 *
 * Admin auth via requireAdmin (JWT). CSRF validated on mutations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';
import { WorkoutType as WT } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const VALID_WORKOUT_TYPES = new Set(Object.values(WT));

/**
 * PATCH /api/admin/workout-templates/[id]
 * Partially update a workout template. Only provided fields are touched.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const { id } = await ctx.params;

        const existing = await prisma.workoutTemplate.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            name,
            description,
            workoutType,
            sport,
            targetDistance,
            targetDuration,
            targetPace,
            structuredSteps,
            difficulty,
            tags,
            category,
            isPublished,
            createdById,
        } = body;

        if (workoutType !== undefined && (typeof workoutType !== 'string' || !VALID_WORKOUT_TYPES.has(workoutType as WT))) {
            return NextResponse.json({ error: 'Invalid workoutType' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (workoutType !== undefined) updateData.workoutType = workoutType as WT;
        if (sport !== undefined) updateData.sport = sport;
        if (targetDistance !== undefined) updateData.targetDistance = targetDistance;
        if (targetDuration !== undefined) updateData.targetDuration = targetDuration;
        if (targetPace !== undefined) updateData.targetPace = targetPace;
        if (structuredSteps !== undefined) updateData.structuredSteps = structuredSteps;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags) ? tags.filter((t: unknown): t is string => typeof t === 'string') : [];
        }
        if (category !== undefined) updateData.category = category;
        if (isPublished !== undefined) updateData.isPublished = isPublished;
        if (createdById !== undefined) updateData.createdById = createdById;

        const template = await prisma.workoutTemplate.update({
            where: { id },
            data: updateData,
        });

        await logAdminAction(
            request,
            'MODIFY_WORKOUT_TEMPLATES',
            { type: 'WORKOUT_TEMPLATE', id: template.id },
            { action: 'UPDATE', name: template.name, updatedFields: Object.keys(updateData) },
            authResult.admin.username,
        );

        const response = NextResponse.json({ success: true, template });
        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'A template with this name already exists' }, { status: 400 });
        }
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2025') {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        console.error('Admin workout template PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/workout-templates/[id]
 * Delete a workout template from the library.
 */
export async function DELETE(request: NextRequest, ctx: RouteContext) {
    if (!validateCsrfToken(request)) {
        return csrfValidationErrorResponse();
    }

    const rateLimit = await adminRateLimit(request, 'write');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const { id } = await ctx.params;

        const existing = await prisma.workoutTemplate.findUnique({
            where: { id },
            select: { id: true, name: true },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        await prisma.workoutTemplate.delete({ where: { id } });

        await logAdminAction(
            request,
            'MODIFY_WORKOUT_TEMPLATES',
            { type: 'WORKOUT_TEMPLATE', id },
            { action: 'DELETE', name: existing.name },
            authResult.admin.username,
        );

        const response = NextResponse.json({ success: true });
        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2025') {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        console.error('Admin workout template DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
