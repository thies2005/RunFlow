import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { validateBody } from '@/lib/validation/validator';
import { userSettingsSchema } from '@/lib/validation/schemas';
import { parseIntSafe, parseFloatSafe } from '@/lib/utils/numbers';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const validation = await validateBody(userSettingsSchema, request);
        if (!validation.success) {
            return validation.error;
        }

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
            includeCrossTraining,
            useImperial
        } = validation.data;

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
