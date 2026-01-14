import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            weight,
            height,
            thresholdHeartRate,
            thresholdPace,
            hrZone1Max,
            hrZone2Max,
            hrZone3Max,
            hrZone4Max,
            hrZone5Max,
            hrZone6Max
        } = body;

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                weight: weight || undefined,
                height: height || undefined,
                thresholdHeartRate: thresholdHeartRate || undefined,
                thresholdPace: thresholdPace || undefined,
                hrZone1Max: hrZone1Max || undefined,
                hrZone2Max: hrZone2Max || undefined,
                hrZone3Max: hrZone3Max || undefined,
                hrZone4Max: hrZone4Max || undefined,
                hrZone5Max: hrZone5Max || undefined,
                hrZone6Max: hrZone6Max || undefined,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
