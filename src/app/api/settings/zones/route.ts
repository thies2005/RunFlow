import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

/**
 * GET /api/settings/zones
 * Get current HR zone thresholds
 */
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            hrMax: true,
            hrRest: true,
            hrZone1Max: true,
            hrZone2Max: true,
            hrZone3Max: true,
            hrZone4Max: true,
        }
    });

    return NextResponse.json({ zones: user });
}

/**
 * POST /api/settings/zones
 * Update HR zone thresholds
 * Expects: { hrMax?, hrRest?, hrZone1Max?, hrZone2Max?, hrZone3Max?, hrZone4Max? }
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { hrMax, hrRest, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max } = body;

        // Validate zone values (must be ascending)
        const zones = [hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max].filter(z => z !== undefined);
        for (let i = 1; i < zones.length; i++) {
            if (zones[i] <= zones[i - 1]) {
                return NextResponse.json({
                    error: 'Zone thresholds must be in ascending order'
                }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(hrMax !== undefined && { hrMax: parseInt(hrMax) }),
                ...(hrRest !== undefined && { hrRest: parseInt(hrRest) }),
                ...(hrZone1Max !== undefined && { hrZone1Max: parseInt(hrZone1Max) }),
                ...(hrZone2Max !== undefined && { hrZone2Max: parseInt(hrZone2Max) }),
                ...(hrZone3Max !== undefined && { hrZone3Max: parseInt(hrZone3Max) }),
                ...(hrZone4Max !== undefined && { hrZone4Max: parseInt(hrZone4Max) }),
            },
            select: {
                hrMax: true,
                hrRest: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
            }
        });

        return NextResponse.json({ success: true, zones: updatedUser });

    } catch (error) {
        console.error('Zone settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
