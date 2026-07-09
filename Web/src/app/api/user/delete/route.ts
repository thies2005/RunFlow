import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier } from '@/lib/rateLimit';

export async function DELETE(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, { limit: 3, windowSeconds: 3600, prefix: 'delete-account' });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Require confirmation body
        const body = await request.json().catch(() => ({}));
        if (body.confirm !== 'DELETE_MY_ACCOUNT') {
            return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
        }

        const userId = session.user.id;

        // Delete user - cascade will handle related data with FK + onDelete (activities, goals, etc.).
        // ApiRouteMetric, ErrorLog, and SessionReplay have a `userId` column WITHOUT a foreign key,
        // so they are NOT cascaded and must be cleaned up explicitly to avoid orphaned rows.
        await prisma.$transaction([
            prisma.apiRouteMetric.deleteMany({ where: { userId } }),
            prisma.errorLog.deleteMany({ where: { userId } }),
            prisma.sessionReplay.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
