import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { calculateVdot, type RaceDistance } from '@/lib/metrics/vdot';
import { AnalyticsService } from '@/lib/services/analytics';
import { DAY_MS } from '@/lib/constants';

// Race distances in meters for validation
const RACE_DISTANCES: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
};

const clampFactor = (value: number, min = 0.75, max = 1.25) =>
    Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;

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
                effectiveVo2maxCorrectionFactor: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            },
        });

        return NextResponse.json({
            vdotCorrectionFactor: user?.vdotCorrectionFactor || 1.0,
            effectiveVo2maxCorrectionFactor: user?.effectiveVo2maxCorrectionFactor ?? 1.0,
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
 * Set correction factors based on a reference race or manual input.
 *
 * Two-factor model (Shared-Baseline pipeline):
 * - effectiveVo2maxCorrectionFactor scales the HR-based raw VO2max
 *   (drives Dashboard VO2max + race predictions). Race calibration
 *   solves impliedVdot / rawVO2max against a 30-day window ending on
 *   the race date.
 * - vdotCorrectionFactor is the Training Pace Intensity Adjustment
 *   (manual only).
 *
 * Expects:
 * Option 0 (reset): { resetToDefault: true }
 * Option 1 (race calibration): { raceActivityId } or
 *   { raceType: "5K" | "10K" | "HALF" | "MARATHON" | distanceMeters, raceTime (or raceTimeSeconds), raceDate? }
 * Option 2 (manual factors): { manualEffectiveVo2maxFactor?: number, manualFactor?: number }
 */
export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            raceActivityId,
            raceType,
            raceTime,
            raceTimeSeconds, // legacy alias for raceTime
            raceDate,
            manualFactor,
            correctionFactor, // legacy alias for manualFactor
            manualEffectiveVo2maxFactor,
            resetToDefault,
            distanceMeters, // legacy: custom race distance
        } = body;

        const raceTimeValue = typeof raceTime === 'number' ? raceTime : raceTimeSeconds;
        const manualPaceFactor = typeof manualFactor === 'number'
            ? manualFactor
            : (typeof correctionFactor === 'number' ? correctionFactor : undefined);

        const updateData: {
            effectiveVo2maxCorrectionFactor?: number;
            vdotCorrectionFactor?: number;
            autoRevolvingVo2max?: null;
            autoRevolvingCalculatedAt?: null;
            vdotReferenceRaceDate?: Date;
            vdotReferenceRaceTime?: number;
            vdotReferenceRaceType?: string;
        } = {};

        // Reset both correction factors to neutral defaults
        if (resetToDefault === true) {
            updateData.effectiveVo2maxCorrectionFactor = 1.0;
            updateData.vdotCorrectionFactor = 1.0;
        }

        // Manual effective VO2max factor (calibrates the HR-based aerobic metric)
        if (typeof manualEffectiveVo2maxFactor === 'number') {
            updateData.effectiveVo2maxCorrectionFactor = clampFactor(manualEffectiveVo2maxFactor);
        }

        // Manual Training Pace Intensity Adjustment (scales training paces only)
        if (typeof manualPaceFactor === 'number') {
            updateData.vdotCorrectionFactor = clampFactor(manualPaceFactor);
        }

        // Race calibration: solves the effective VO2max factor against the
        // RAW HR-based VO2max of the training window before the race
        let outOfTypicalRange = false;
        const hasRaceInput = Boolean(raceActivityId || ((raceType || distanceMeters) && raceTimeValue));

        if (hasRaceInput && resetToDefault !== true) {
            let raceDist: RaceDistance | number;
            let timeSeconds: number;
            let finalRaceType: string;
            let raceDateVal: Date;

            if (raceActivityId) {
                const raceActivity = await prisma.activity.findFirst({
                    where: { id: raceActivityId, userId: session.user.id },
                    select: { distance: true, movingTime: true, startDate: true },
                });
                if (!raceActivity) {
                    return NextResponse.json({ error: 'Race activity not found' }, { status: 404 });
                }
                raceDist = raceActivity.distance;
                timeSeconds = raceTimeValue ?? raceActivity.movingTime;
                raceDateVal = raceDate ? new Date(raceDate) : new Date(raceActivity.startDate);
                finalRaceType = raceType || `Custom: ${(raceActivity.distance / 1000).toFixed(2)}km`;
            } else if (distanceMeters) {
                raceDist = parseFloat(distanceMeters);
                timeSeconds = raceTimeValue;
                raceDateVal = raceDate ? new Date(raceDate) : new Date();
                finalRaceType = raceType || `Custom: ${(raceDist / 1000).toFixed(2)}km`;
            } else if (raceType && RACE_DISTANCES[raceType]) {
                raceDist = raceType as RaceDistance;
                timeSeconds = raceTimeValue;
                raceDateVal = raceDate ? new Date(raceDate) : new Date();
                finalRaceType = raceType;
            } else {
                return NextResponse.json({ error: 'Invalid race type or distance' }, { status: 400 });
            }

            if (!timeSeconds || timeSeconds <= 0) {
                return NextResponse.json({ error: 'Invalid race time' }, { status: 400 });
            }

            // Calculate implied VDOT from the reference race
            const impliedVdot = calculateVdot({
                distance: raceDist,
                timeSeconds,
            });

            // Training window: the 30 days ENDING on the race date — the
            // fitness the race was actually run on (NOT the 6 months after
            // a stale "current" window).
            const windowStart = new Date(raceDateVal.getTime() - 30 * DAY_MS);
            const activitySelect = {
                startDate: true,
                distance: true,
                movingTime: true,
                averageHr: true,
                hasHeartrate: true,
            } as const;

            let windowActivities = await prisma.activity.findMany({
                where: {
                    userId: session.user.id,
                    type: 'RUN',
                    startDate: { gte: windowStart, lte: raceDateVal },
                },
                select: activitySelect,
            });

            // Fewer than 3 runs in the race window: fall back to all recent runs
            if (windowActivities.length < 3) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                windowActivities = await prisma.activity.findMany({
                    where: {
                        userId: session.user.id,
                        type: 'RUN',
                        startDate: { gte: sixMonthsAgo },
                    },
                    select: activitySelect,
                });
            }

            if (windowActivities.length === 0) {
                return NextResponse.json({
                    error: 'Cannot calculate correction: no recent runs found'
                }, { status: 400 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { hrMax: true },
            });

            // Denominator is the RAW HR-based VO2max (factor 1.0) — the same
            // value the Shared-Baseline pipeline multiplies by
            // effectiveVo2maxCorrectionFactor everywhere.
            const { rawVO2max } = AnalyticsService.calculateVO2max(windowActivities, user?.hrMax || 190, 1.0);

            let newEffectiveFactor = rawVO2max > 0 ? impliedVdot / rawVO2max : 1.0;
            newEffectiveFactor = clampFactor(newEffectiveFactor);
            outOfTypicalRange = newEffectiveFactor < 0.85 || newEffectiveFactor > 1.15;

            updateData.effectiveVo2maxCorrectionFactor = newEffectiveFactor;

            // Store reference race info so the form can restore it
            updateData.vdotReferenceRaceDate = raceDateVal;
            updateData.vdotReferenceRaceTime = Math.round(timeSeconds);
            updateData.vdotReferenceRaceType = finalRaceType;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({
                error: 'Must provide either race calibration data or a manual factor'
            }, { status: 400 });
        }

        // Explicit calibration overrides the revolving auto-calibration
        if (
            'vdotCorrectionFactor' in updateData ||
            'effectiveVo2maxCorrectionFactor' in updateData
        ) {
            updateData.autoRevolvingVo2max = null;
            updateData.autoRevolvingCalculatedAt = null;
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                vdotCorrectionFactor: true,
                effectiveVo2maxCorrectionFactor: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            },
        });

        return NextResponse.json({
            success: true,
            vdotCorrectionFactor: updatedUser.vdotCorrectionFactor,
            effectiveVo2maxCorrectionFactor: updatedUser.effectiveVo2maxCorrectionFactor,
            outOfTypicalRange,
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
 * Reset correction factors to 1.0 (no correction)
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
                effectiveVo2maxCorrectionFactor: 1.0,
                vdotReferenceRaceDate: null,
                vdotReferenceRaceTime: null,
                vdotReferenceRaceType: null,
                autoRevolvingVo2max: null,
                autoRevolvingCalculatedAt: null,
            },
        });

        return NextResponse.json({
            success: true,
            vdotCorrectionFactor: 1.0,
            effectiveVo2maxCorrectionFactor: 1.0,
            referenceRace: null,
        });
    } catch (error) {
        console.error('VDOT correction DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
