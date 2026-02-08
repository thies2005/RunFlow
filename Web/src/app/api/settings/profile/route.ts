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
            hrZone6Max,
            hrZone7Max,
            includeCrossTraining,
            useImperial
        } = body;

        // Helper to parse int safely
        const parseIntSafe = (val: any) => {
            if (val === undefined || val === null || val === '') return undefined;
            const parsed = parseInt(String(val), 10);
            return isNaN(parsed) ? undefined : parsed;
        };

        // Helper to parse float safely
        const parseFloatSafe = (val: any) => {
            if (val === undefined || val === null || val === '') return undefined;
            const parsed = parseFloat(String(val));
            return isNaN(parsed) ? undefined : parsed;
        };

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                weight: parseFloatSafe(weight),
                height: parseFloatSafe(height),
                thresholdHeartRate: parseIntSafe(thresholdHeartRate),
                thresholdPace: parseIntSafe(thresholdPace),
                hrZone1Max: parseIntSafe(hrZone1Max),
                hrZone2Max: parseIntSafe(hrZone2Max),
                hrZone3Max: parseIntSafe(hrZone3Max),
                hrZone4Max: parseIntSafe(hrZone4Max),
                hrZone5Max: parseIntSafe(hrZone5Max),
                hrZone6Max: parseIntSafe(hrZone6Max),
                // Only update includeCrossTraining if explicitly provided (boolean)
                ...(typeof includeCrossTraining === 'boolean' && { includeCrossTraining }),
                // Only update useImperial if explicitly provided (boolean)
                ...(typeof useImperial === 'boolean' && { useImperial }),
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
