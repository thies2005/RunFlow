/**
 * Admin Set User AI Tier
 * POST /api/admin/users/[id]/toggle-ai
 * 
 * Sets the usage tier for a user:
 * - "none": BYOK only (user must provide own API key)
 * - "tier1", "tier2", "tier3": Admin-defined usage limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { validateCsrfToken, csrfValidationErrorResponse } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import { logAdminAction } from '@/lib/admin/auditLog';



const VALID_TIERS = ['none', 'tier1', 'tier2', 'tier3'];

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id: userId } = await params;
        const body = await request.json();
        const { tier } = body;

        // Validate tier
        if (!VALID_TIERS.includes(tier)) {
            return NextResponse.json({
                error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`
            }, { status: 400 });
        }

        // Determine if AI should be allowed and if we should clear custom keys
        const adminAllowed = tier !== 'none';
        const isManaged = tier !== 'none';

        // Upsert user AI settings
        const settings = await prisma.userAiSettings.upsert({
            where: { userId },
            create: {
                userId,
                usageTier: tier,
                adminAllowed,
                aiEnabled: false, // User must still opt-in
            },
            update: {
                usageTier: tier,
                adminAllowed,
                // If admin removes access, also disable AI
                ...(!adminAllowed ? { aiEnabled: false } : {}),
                // Clear custom keys if setting a managed tier
                ...(isManaged ? {
                    customApiKey: null,
                    customBaseUrl: null,
                    customModel: null,
                } : {})
            },
        });

        await logAdminAction(request, 'TOGGLE_AI_ACCESS', { type: 'USER', id: userId }, {
            newTier: tier,
            adminAllowed
        });

        const response = NextResponse.json({
            success: true,
            usageTier: settings.usageTier,
            adminAllowed: settings.adminAllowed,
            aiEnabled: settings.aiEnabled,
        });

        return applyRateLimitHeaders(response, 'write', rateLimit.result!.remaining, rateLimit.result!.reset);
    } catch (error) {
        console.error('Set user AI tier error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
