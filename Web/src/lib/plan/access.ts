/**
 * Plan access control helpers.
 *
 * - checkPlanAccess        → any authenticated user (free tier)
 * - checkPremiumAccess     → tier2/tier3/admin only (backward-compatible premium flag)
 * - isPremiumOrAllowedTier / hasPlanBuilderAccess → Plan Builder eligibility
 *   (tier2/tier3, admin, active BYOK, or tier1 with explicit planBuilder route)
 */
import { checkPlanBuilderEligibility } from '@/lib/ai/routing';

export async function checkPlanAccess(_userId: string): Promise<true> {
    // The advanced editor is available to ALL authenticated users.
    // Authentication is already verified by the caller via auth().
    return true;
}

export async function checkPremiumAccess(userId: string): Promise<boolean> {
    const { isPremium } = await checkPlanBuilderEligibility(userId);
    return isPremium;
}

export async function isPremiumOrAllowedTier(userId: string): Promise<boolean> {
    const { canUsePlanBuilder } = await checkPlanBuilderEligibility(userId);
    return canUsePlanBuilder;
}

export async function hasPlanBuilderAccess(userId: string): Promise<boolean> {
    const { canUsePlanBuilder } = await checkPlanBuilderEligibility(userId);
    return canUsePlanBuilder;
}
