import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { validateBody } from '@/lib/validation/validator';
import { userSettingsSchema } from '@/lib/validation/schemas';
import { parseIntSafe, parseFloatSafe } from '@/lib/utils/numbers';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                weight: true,
                height: true,
                thresholdHeartRate: true,
                thresholdPace: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                includeCrossTraining: true,
                useImperial: true,
                primaryLoadMetric: true,
                uiPreferences: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

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
            useImperial,
            primaryLoadMetric,
            uiPreferences,
        } = validation.data;

        let mergedUiPreferences: unknown = undefined;
        if (uiPreferences !== undefined) {
            if (uiPreferences === null) {
                mergedUiPreferences = null;
            } else {
                const existingUser = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { uiPreferences: true },
                });
                const prev = (existingUser?.uiPreferences && typeof existingUser.uiPreferences === 'object')
                    ? (existingUser.uiPreferences as Record<string, unknown>)
                    : {};
                mergedUiPreferences = {
                    ...prev,
                    ...uiPreferences,
                };
            }
        }

        const updatedUser = await prisma.user.update({
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
                ...(primaryLoadMetric !== undefined && { primaryLoadMetric }),
                ...(mergedUiPreferences !== undefined && { uiPreferences: mergedUiPreferences as any }),
            },
            select: {
                id: true,
                primaryLoadMetric: true,
                uiPreferences: true,
            },
        });

        return NextResponse.json({
            success: true,
            primaryLoadMetric: updatedUser.primaryLoadMetric,
            uiPreferences: updatedUser.uiPreferences,
        });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}

export const PUT = POST;
export const PATCH = POST;
