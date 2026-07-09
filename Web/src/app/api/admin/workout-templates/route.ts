/**
 * Admin Workout Templates API (audit G8 - shared workout library)
 *
 * GET    /api/admin/workout-templates          - list ALL templates (incl. unpublished)
 * POST   /api/admin/workout-templates          - create a new template
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

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const VALID_WORKOUT_TYPES = new Set(Object.values(WT));

/**
 * GET /api/admin/workout-templates
 * List all workout templates (published + unpublished).
 * Optional filters: ?category= &workoutType= &q= &isPublished= &limit= &offset=
 */
export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category')?.trim() || undefined;
        const workoutTypeRaw = url.searchParams.get('workoutType')?.trim().toUpperCase() || undefined;
        const q = url.searchParams.get('q')?.trim() || undefined;
        const isPublishedParam = url.searchParams.get('isPublished');

        const rawLimit = Number.parseInt(url.searchParams.get('limit') || '', 10);
        const rawOffset = Number.parseInt(url.searchParams.get('offset') || '', 10);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
        const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

        const workoutType =
            workoutTypeRaw && VALID_WORKOUT_TYPES.has(workoutTypeRaw as WT)
                ? (workoutTypeRaw as WT)
                : undefined;

        let isPublished: boolean | undefined;
        if (isPublishedParam === 'true') isPublished = true;
        else if (isPublishedParam === 'false') isPublished = false;

        const where: {
            isPublished?: boolean;
            category?: string;
            workoutType?: WT;
            OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
        } = {};
        if (isPublished !== undefined) where.isPublished = isPublished;
        if (category) where.category = category;
        if (workoutType) where.workoutType = workoutType;
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [templates, total] = await Promise.all([
            prisma.workoutTemplate.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                take: limit,
                skip: offset,
            }),
            prisma.workoutTemplate.count({ where }),
        ]);

        const response = NextResponse.json({ templates, total });
        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Admin workout templates GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/workout-templates
 * Create a new workout template.
 */
export async function POST(request: NextRequest) {
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

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        if (!workoutType || typeof workoutType !== 'string' || !VALID_WORKOUT_TYPES.has(workoutType as WT)) {
            return NextResponse.json({ error: 'A valid workoutType is required' }, { status: 400 });
        }

        const template = await prisma.workoutTemplate.create({
            data: {
                name,
                description: typeof description === 'string' ? description : null,
                workoutType: workoutType as WT,
                sport: typeof sport === 'string' ? sport : 'RUN',
                targetDistance: typeof targetDistance === 'number' ? targetDistance : null,
                targetDuration: typeof targetDuration === 'number' ? targetDuration : null,
                targetPace: typeof targetPace === 'number' ? targetPace : null,
                structuredSteps: structuredSteps ?? null,
                difficulty: typeof difficulty === 'string' ? difficulty : null,
                tags: Array.isArray(tags) ? tags.filter((t: unknown): t is string => typeof t === 'string') : [],
                category: typeof category === 'string' ? category : null,
                isPublished: typeof isPublished === 'boolean' ? isPublished : true,
                createdById: typeof createdById === 'string' ? createdById : null,
            },
        });

        await logAdminAction(
            request,
            'MODIFY_WORKOUT_TEMPLATES',
            { type: 'WORKOUT_TEMPLATE', id: template.id },
            { action: 'CREATE', name: template.name },
            authResult.admin.username,
        );

        const response = NextResponse.json({ success: true, template }, { status: 201 });
        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error: unknown) {
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'A template with this name already exists' }, { status: 400 });
        }
        console.error('Admin workout templates POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
