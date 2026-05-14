/**
 * Plan access control helpers.
 *
 * - checkPlanAccess  → any authenticated user (free tier)
 * - checkPremiumAccess → tier2/tier3/admin only (AI features)
 */
import { prisma } from '@/lib/db';

export async function checkPlanAccess(_userId: string): Promise<true> {
    // The advanced editor is available to ALL authenticated users.
    // Authentication is already verified by the caller via auth().
    return true;
}

export async function checkPremiumAccess(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    return true;
}
