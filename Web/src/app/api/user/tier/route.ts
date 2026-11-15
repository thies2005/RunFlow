import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkPlanBuilderEligibility } from '@/lib/ai/routing';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/tier
 * Returns whether the current user has premium (tier2/tier3/admin) access
 * and whether they can use Plan Builder AI (including active BYOK and configured tier1).
 * Used by the frontend to conditionally show AI features.
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ isPremium: false, canUsePlanBuilder: false }, { status: 401 });
        }

        const [{ isPremium, canUsePlanBuilder }, aiSettings] = await Promise.all([
            checkPlanBuilderEligibility(session.user.id),
            prisma.userAiSettings.findUnique({
                where: { userId: session.user.id },
                select: { usageTier: true },
            }),
        ]);

        const tier = aiSettings?.usageTier || 'none';

        return NextResponse.json({ isPremium, canUsePlanBuilder, tier });
    } catch (error) {
        console.error('User tier check error:', error);
        return NextResponse.json({ isPremium: false, canUsePlanBuilder: false }, { status: 500 });
    }
}
