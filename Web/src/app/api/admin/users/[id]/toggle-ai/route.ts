/**
 * Admin Set User AI Tier
 * POST /api/admin/users/[id]/toggle-ai
 * 
 * Sets the usage tier for a user:
 * - "none": BYOK only (user must provide own API key)
 * - "tier1", "tier2", "tier3": Admin-defined usage limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

// Simple admin check
async function isAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_session');
    return adminToken?.value === process.env.ADMIN_SESSION_TOKEN;
}

const VALID_TIERS = ['none', 'tier1', 'tier2', 'tier3'];

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Determine if AI should be enabled and if we should clear custom keys
        const aiEnabled = tier !== 'none';
        const isManaged = tier !== 'none';

        // Upsert user AI settings
        const settings = await prisma.userAiSettings.upsert({
            where: { userId },
            create: {
                userId,
                usageTier: tier,
                aiEnabled,
            },
            update: {
                usageTier: tier,
                aiEnabled,
                // Clear custom keys if setting a managed tier to prevent override confusion
                ...(isManaged ? {
                    customApiKey: null,
                    customBaseUrl: null,
                    customModel: null,
                } : {})
            },
        });

        return NextResponse.json({
            success: true,
            usageTier: settings.usageTier,
            aiEnabled: settings.aiEnabled,
        });
    } catch (error) {
        console.error('Set user AI tier error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
