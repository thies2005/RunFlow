import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';

// Race distances in meters for validation
const RACE_DISTANCES: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
};

/**
 * GET /api/settings/vdot-correction
 * Get current VDOT correction settings
 */
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                vdotCorrectionFactor: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            },
        });

        return NextResponse.json({
            vdotCorrectionFactor: user?.vdotCorrectionFactor || 1.0,
            referenceRace: user?.vdotReferenceRaceType ? {
                date: user.vdotReferenceRaceDate,
                time: user.vdotReferenceRaceTime,
                type: user.vdotReferenceRaceType,
            } : null,
        });
    } catch (error) {
        console.error('VDOT correction GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/settings/vdot-correction
 * Set VDOT correction based on a reference race
 * 
 * Expects: 
 * Option 1 (by reference race): { raceType: "5K" | "10K" | "HALF" | "MARATHON", raceTimeSeconds: number, raceDate?: string }
 * Option 2 (manual factor): { correctionFactor: number }
 */
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { raceType, raceTimeSeconds, raceDate, correctionFactor, distanceMeters } = body;

        let newCorrectionFactor: number;
        let referenceRaceData: {
            vdotReferenceRaceDate?: Date;
            vdotReferenceRaceTime?: number;
            vdotReferenceRaceType?: string;
        } = {};

        // Option 1: Calculate from reference race
        if ((raceType || distanceMeters) && raceTimeSeconds) {
            let distance: RaceDistance | number;
            let finalRaceType = raceType;

            if (distanceMeters) {
                distance = parseFloat(distanceMeters);
                if (!finalRaceType) {
                    finalRaceType = `Custom: ${(distance / 1000).toFixed(2)}km`;
                }
            } else if (raceType && RACE_DISTANCES[raceType]) {
                distance = raceType as RaceDistance;
            } else {
                return NextResponse.json({ error: 'Invalid race type or distance' }, { status: 400 });
            }

            if (raceTimeSeconds <= 0) {
                return NextResponse.json({ error: 'Invalid race time' }, { status: 400 });
            }

            // Calculate implied VDOT from the reference race
            const impliedVdot = calculateVdot({
                distance,
                timeSeconds: raceTimeSeconds,
            });

            // Get current calculated VO2max
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { hrMax: true },
            });

            // Get running activities for current VO2max calculation
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const activities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    type: 'RUN',
                    startDate: { gte: sixMonthsAgo },
                },
                select: {
                    startDate: true,
                    distance: true,
                    movingTime: true,
                    averageHr: true,
                    hasHeartrate: true,
                },
            });

            // Import dynamically to avoid circular dependencies
            const { calculateWeightedEffectiveVO2max } = await import('@/lib/metrics/runalyze');
            const maxHR = user?.hrMax || 185;
            const calculatedVdot = calculateWeightedEffectiveVO2max(activities, maxHR);

            // Calculate correction factor
            if (calculatedVdot <= 0) {
                return NextResponse.json({
                    error: 'Cannot calculate correction: no running data available'
                }, { status: 400 });
            }

            newCorrectionFactor = impliedVdot / calculatedVdot;

            // Clamp to reasonable range (0.5x - 1.5x)
            newCorrectionFactor = Math.max(0.5, Math.min(1.5, newCorrectionFactor));
            newCorrectionFactor = Math.round(newCorrectionFactor * 1000) / 1000;

            // Store reference race info
            referenceRaceData = {
                vdotReferenceRaceDate: raceDate ? new Date(raceDate) : new Date(),
                vdotReferenceRaceTime: raceTimeSeconds,
                vdotReferenceRaceType: raceType,
            };

            // Option 2: Manual correction factor
        } else if (typeof correctionFactor === 'number') {
            if (correctionFactor < 0.5 || correctionFactor > 1.5) {
                return NextResponse.json({
                    error: 'Correction factor must be between 0.5 and 1.5'
                }, { status: 400 });
            }
            newCorrectionFactor = Math.round(correctionFactor * 1000) / 1000;
        } else {
            return NextResponse.json({
                error: 'Must provide either raceType + raceTimeSeconds or correctionFactor'
            }, { status: 400 });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                vdotCorrectionFactor: newCorrectionFactor,
                ...referenceRaceData,
            },
            select: {
                vdotCorrectionFactor: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            },
        });

        return NextResponse.json({
            success: true,
            vdotCorrectionFactor: updatedUser.vdotCorrectionFactor,
            referenceRace: updatedUser.vdotReferenceRaceType ? {
                date: updatedUser.vdotReferenceRaceDate,
                time: updatedUser.vdotReferenceRaceTime,
                type: updatedUser.vdotReferenceRaceType,
            } : null,
        });

    } catch (error) {
        console.error('VDOT correction POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/settings/vdot-correction
 * Reset VDOT correction to 1.0 (no correction)
 */
export async function DELETE() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                vdotCorrectionFactor: 1.0,
                vdotReferenceRaceDate: null,
                vdotReferenceRaceTime: null,
                vdotReferenceRaceType: null,
            },
        });

        return NextResponse.json({
            success: true,
            vdotCorrectionFactor: 1.0,
            referenceRace: null,
        });
    } catch (error) {
        console.error('VDOT correction DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
