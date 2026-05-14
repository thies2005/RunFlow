import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/tier
 * Returns whether the current user has premium (tier2/tier3/admin) access.
 * Used by the frontend to conditionally show AI features.
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ isPremium: false }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true, aiSettings: { select: { usageTier: true } } },
        });

        const tier = user?.aiSettings?.usageTier || 'none';
        const isPremium = tier === 'tier2' || tier === 'tier3' || !!user?.isAdmin;

        return NextResponse.json({ isPremium, tier });
    } catch (error) {
        console.error('User tier check error:', error);
        return NextResponse.json({ isPremium: false }, { status: 500 });
    }
}
