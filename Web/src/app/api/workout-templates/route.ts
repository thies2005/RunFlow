import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { WorkoutType as WT } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const VALID_WORKOUT_TYPES = new Set(Object.values(WT));

/**
 * GET /api/workout-templates
 * List published workout templates from the shared/global library.
 *
 * Query params:
 *   category     - filter by category (speed | endurance | recovery | threshold | long)
 *   workoutType  - filter by WorkoutType enum value (e.g. INTERVALS, TEMPO)
 *   q            - search across name + description (case-insensitive)
 *   limit        - page size (default 20, max 50)
 *   offset       - pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const category = url.searchParams.get('category')?.trim() || undefined;
        const workoutTypeRaw = url.searchParams.get('workoutType')?.trim().toUpperCase() || undefined;
        const q = url.searchParams.get('q')?.trim() || undefined;

        const rawLimit = Number.parseInt(url.searchParams.get('limit') || '', 10);
        const rawOffset = Number.parseInt(url.searchParams.get('offset') || '', 10);

        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
        const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

        // Validate workoutType against the enum if provided.
        const workoutType =
            workoutTypeRaw && VALID_WORKOUT_TYPES.has(workoutTypeRaw as WT)
                ? (workoutTypeRaw as WT)
                : undefined;

        // Build the where clause. Only published templates are exposed to users here.
        const where: {
            isPublished: boolean;
            category?: string;
            workoutType?: WT;
            OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
        } = { isPublished: true };

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
                orderBy: [{ category: 'asc' }, { name: 'asc' }],
                take: limit,
                skip: offset,
            }),
            prisma.workoutTemplate.count({ where }),
        ]);

        const hasMore = offset + templates.length < total;

        return NextResponse.json(
            { templates, total, hasMore },
            { headers: rateLimitHeaders(rateLimitResult) }
        );
    } catch (error) {
        console.error('Workout templates list error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
