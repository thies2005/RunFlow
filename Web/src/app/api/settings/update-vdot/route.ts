import { prisma } from '@/lib/db';
import { calculateVdot, RaceDistance } from '@/lib/metrics/vdot';
import { generateTrainingPlan } from '@/lib/plans';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { WorkoutType } from '@/generated/prisma/browser';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                hrMax: true,
                hrRest: true,
                weight: true,
                height: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                hrZone5Max: true,
                hrZone6Max: true,
                thresholdHeartRate: true,
                thresholdPace: true,
                includeCrossTraining: true,
                useImperial: true,
                healthTrackingEnabled: true,
                vdotCorrectionFactor: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            }
        });

        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        return NextResponse.json({
            hrMax: user?.hrMax || 185,
            hrRest: user?.hrRest || 55,
            weight: user?.weight || 70,
            height: user?.height || 175,
            thresholdHeartRate: user?.thresholdHeartRate,
            thresholdPace: user?.thresholdPace,
            hrZone1Max: user?.hrZone1Max || 130,
            hrZone2Max: user?.hrZone2Max || 148,
            hrZone3Max: user?.hrZone3Max || 160,
            hrZone4Max: user?.hrZone4Max || 170,
            hrZone5Max: user?.hrZone5Max || 178,
            hrZone6Max: user?.hrZone6Max || 187,
            includeCrossTraining: user?.includeCrossTraining ?? true,
            useImperial: user?.useImperial ?? false,
            healthTrackingEnabled: user?.healthTrackingEnabled ?? false,
            runsPerWeek: activeGoal?.runsPerWeek || 4,
            ridesPerWeek: activeGoal?.ridesPerWeek || 0,
            swimsPerWeek: activeGoal?.swimsPerWeek || 0,
            strengthPerWeek: activeGoal?.strengthPerWeek || 0,
            weeklyMileageGoal: (activeGoal?.weeklyMileageGoal || 40000) / 1000,
            taperWeeks: activeGoal?.taperWeeks,
            peakWeeks: activeGoal?.peakWeeks,
            buildWeeks: activeGoal?.buildWeeks,
            currentVdot: activeGoal?.currentVdot || 30,
            longRunDay: activeGoal?.longRunDay ?? 0,
            qualityDay: activeGoal?.workoutDay ?? 3,
            restDays: activeGoal?.restDays ?? [1, 5],
            vdotCorrectionFactor: user?.vdotCorrectionFactor || 1.0,
            vdotReferenceRaceTime: user?.vdotReferenceRaceTime || null,
            vdotReferenceRaceType: user?.vdotReferenceRaceType || null,
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { timeSeconds, raceDistance, runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek, weeklyMileageGoal, maxHeartRate, restingHeartRate, weight, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, thresholdHeartRate, thresholdPace, taperWeeks, peakWeeks, buildWeeks, calibrationFactor, longRunDay, qualityDay, restDays } = body;

        if (!timeSeconds || !raceDistance) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Validate raceDistance is a valid enum value
        const validDistances = ['5K', '10K', 'HALF', 'MARATHON'];
        if (!validDistances.includes(raceDistance)) {
            return NextResponse.json({ error: 'Invalid race distance' }, { status: 400 });
        }

        // Validate timeSeconds is a positive number
        if (typeof timeSeconds !== 'number' || timeSeconds <= 0 || timeSeconds > 86400) {
            return NextResponse.json({ error: 'Time must be between 1 second and 24 hours' }, { status: 400 });
        }

        // 1. Calculate new VDOT
        const newVdot = calculateVdot({ distance: raceDistance as RaceDistance, timeSeconds });

        // 2. Build user update data with explicit validation
        const userUpdateData: Record<string, unknown> = {};

        // Calibration factor: 0.5 to 2.0
        if (typeof calibrationFactor === 'number' && calibrationFactor >= 0.5 && calibrationFactor <= 2.0) {
            userUpdateData.vdotCorrectionFactor = calibrationFactor;
            // Explicit calibration from settings overrides the revolving auto-calibration
            if (calibrationFactor !== 1.0) {
                userUpdateData.autoRevolvingVo2max = null;
                userUpdateData.autoRevolvingCalculatedAt = null;
            }
        }

        // Max Heart Rate: 100-250 bpm
        if (typeof maxHeartRate === 'number' && maxHeartRate >= 100 && maxHeartRate <= 250) {
            userUpdateData.hrMax = Math.round(maxHeartRate);
        }

        // Resting Heart Rate: 30-100 bpm
        if (typeof restingHeartRate === 'number' && restingHeartRate >= 30 && restingHeartRate <= 100) {
            userUpdateData.hrRest = Math.round(restingHeartRate);
        }

        // Weight: 30-300 kg
        const parsedWeight = typeof weight === 'number' ? weight : parseFloat(String(weight));
        if (!isNaN(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 300) {
            userUpdateData.weight = parsedWeight;
        }

        // HR Zone thresholds: 40-100%
        const validateZone = (val: unknown): number | null => {
            if (typeof val !== 'number') return null;
            if (val >= 40 && val <= 100) return Math.round(val);
            return null;
        };

        const zoneUpdates = {
            hrZone1Max: validateZone(hrZone1Max),
            hrZone2Max: validateZone(hrZone2Max),
            hrZone3Max: validateZone(hrZone3Max),
            hrZone4Max: validateZone(hrZone4Max),
        };

        Object.entries(zoneUpdates).forEach(([key, value]) => {
            if (value !== null) userUpdateData[key] = value;
        });

        if (typeof thresholdHeartRate === 'number' && thresholdHeartRate >= 100 && thresholdHeartRate <= 220) {
            userUpdateData.thresholdHeartRate = Math.round(thresholdHeartRate);
        }

        if (typeof thresholdPace === 'number' && thresholdPace >= 120 && thresholdPace <= 900) {
            userUpdateData.thresholdPace = Math.round(thresholdPace);
        }

        // Update user if there's anything to update
        if (Object.keys(userUpdateData).length > 0) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: userUpdateData
            });
        }


        // 3. Find Active Goal
        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (activeGoal) {
            const runs = runsPerWeek || 4;
            const rides = ridesPerWeek || 0;
            const swims = swimsPerWeek || 0;
            const strength = strengthPerWeek || 0;
            const mileageGoal = weeklyMileageGoal || null; // meters

            // Phase settings (use provided or defaults)
            let taper = taperWeeks || 2;
            let peak = peakWeeks || 4;
            let build = buildWeeks || 4;

            // M-07: Validate that phase weeks don't exceed available weeks
            const weeksUntilRace = Math.floor(
                (new Date(activeGoal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
            );
            const totalPhaseWeeks = taper + peak + build;

            if (weeksUntilRace > 0 && totalPhaseWeeks > weeksUntilRace) {
                // Scale down proportionally to fit available weeks
                const scale = weeksUntilRace / totalPhaseWeeks;
                taper = Math.max(1, Math.round(taper * scale));
                peak = Math.max(1, Math.round(peak * scale));
                build = Math.max(0, weeksUntilRace - taper - peak);
            }

            // Regenerate Plan

            // Preserve the current plan anchor by reusing the earliest pending workout date.
            const firstPendingWorkout = await prisma.workout.findFirst({
                where: {
                    goalId: activeGoal.id,
                    isCompleted: false,
                },
                orderBy: {
                    scheduledDate: 'asc',
                },
                select: {
                    scheduledDate: true,
                },
            });

            // Update Goal Settings
            await prisma.goal.update({
                where: { id: activeGoal.id },
                data: {
                    currentVdot: newVdot,
                    runsPerWeek: runs,
                    ridesPerWeek: rides,
                    swimsPerWeek: swims,
                    strengthPerWeek: strength,
                    weeklyMileageGoal: mileageGoal,
                    taperWeeks: taper,
                    peakWeeks: peak,
                    buildWeeks: build,
                    ...(typeof longRunDay === 'number' && { longRunDay }),
                    ...(typeof qualityDay === 'number' && { workoutDay: qualityDay }),
                    ...(Array.isArray(restDays) && { restDays }),
                    ...(firstPendingWorkout?.scheduledDate && { planStartDate: firstPendingWorkout.scheduledDate }),
                }
            });

            // Delete ALL incomplete workouts for this goal before regenerating.
            // We keep completed workouts to preserve history.
            await prisma.workout.deleteMany({
                where: {
                    goalId: activeGoal.id,
                    isCompleted: false
                }
            });

            const startDate = activeGoal.planStartDate ?? firstPendingWorkout?.scheduledDate ?? new Date();

            const workouts = generateTrainingPlan({
                vdot: newVdot,
                raceType: activeGoal.raceType,
                raceDate: activeGoal.raceDate,
                startDate: startDate,
                runsPerWeek: runs,
                ridesPerWeek: rides,
                swimsPerWeek: swims,
                strengthPerWeek: strength,
                weeklyMileageGoal: mileageGoal,
                taperWeeks: taper,
                peakWeeks: peak,
                buildWeeks: build,
            });

            // Save workouts (M-08: Use createMany for batch insert instead of transaction)
            await prisma.workout.createMany({
                data: workouts.map(w => ({
                    goalId: activeGoal.id,
                    scheduledDate: w.date,
                    workoutType: w.type as WorkoutType,
                    description: w.description,
                    targetDistance: w.totalDistance,
                    targetPace: w.targetPace || 0,
                    targetDuration: w.targetDuration || 0,
                    isCompleted: false
                }))
            });
        }

        return NextResponse.json({ success: true, vdot: newVdot });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
