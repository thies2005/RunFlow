import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { requireAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/workout-templates/[id]
 * Fetch a single workout template.
 *
 * Published templates are visible to any authenticated user. Unpublished
 * templates are only visible to admins (validated via the admin JWT).
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
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

        const { id } = await ctx.params;

        const template = await prisma.workoutTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Unpublished templates require admin auth.
        if (!template.isPublished) {
            const adminResult = await requireAdmin(request);
            if ('error' in adminResult) {
                // Don't leak existence: return 404 rather than 403.
                return NextResponse.json({ error: 'Template not found' }, { status: 404 });
            }
        }

        return NextResponse.json(
            { template },
            { headers: rateLimitHeaders(rateLimitResult) }
        );
    } catch (error) {
        console.error('Workout template fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
