/**
 * Admin Toggle User AI Access
 * POST /api/admin/users/[id]/toggle-ai
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
        const { enabled } = body;

        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
        }

        // Upsert user AI settings
        const settings = await prisma.userAiSettings.upsert({
            where: { userId },
            create: {
                userId,
                aiEnabled: enabled,
            },
            update: {
                aiEnabled: enabled,
            },
        });

        return NextResponse.json({
            success: true,
            aiEnabled: settings.aiEnabled,
        });
    } catch (error) {
        console.error('Toggle user AI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
