import { prisma } from '@/lib/db';
import { calculateVdot, RaceDistance } from '@/lib/metrics/vdot';
import { recalculateWorkoutPaces } from '@/lib/plans/recalculate-paces';
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { RaceType, PlanSport, WorkoutType, Prisma } from '@/generated/prisma/browser';
import {
    TRIATHLON_RACE_TYPES,
    generateTrainingPlan,
    buildPlanPhaseBlocks,
    type PlanConfig,
} from '@/lib/plans';
import { mapWorkoutsForDb, computePlanWeeklyVolumeGoals } from '@/lib/services/plan-creation';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';

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
                effectiveVo2maxCorrectionFactor: true,
                matchToMyWhoosh: true,
                vdotReferenceRaceDate: true,
                vdotReferenceRaceTime: true,
                vdotReferenceRaceType: true,
            }
        });

        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
            include: {
                workouts: {
                    where: { workoutType: 'LONG_RUN', isCompleted: false },
                    select: { targetDistance: true },
                    orderBy: { targetDistance: 'desc' },
                    take: 1,
                },
            },
        });

        let startWeeklyMileage = null;
        if (activeGoal) {
            const firstWorkout = await prisma.workout.findFirst({
                where: { goalId: activeGoal.id },
                orderBy: { scheduledDate: 'asc' },
                select: { scheduledDate: true },
            });

            if (firstWorkout) {
                const startDate = new Date(firstWorkout.scheduledDate);
                const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

                const firstWeekWorkouts = await prisma.workout.findMany({
                    where: {
                        goalId: activeGoal.id,
                        sport: 'RUN',
                        scheduledDate: {
                            gte: startDate,
                            lt: endDate,
                        },
                    },
                    select: { targetDistance: true },
                });

                const totalMeters = firstWeekWorkouts.reduce((sum, w) => sum + (w.targetDistance || 0), 0);
                startWeeklyMileage = Math.round(totalMeters / 1000);
            }
        }

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
            includeCrossTraining: user?.includeCrossTraining ?? false,
            effectiveVo2maxCorrectionFactor: user?.effectiveVo2maxCorrectionFactor ?? 1.0,
            matchToMyWhoosh: user?.matchToMyWhoosh ?? false,
            useImperial: user?.useImperial ?? false,
            healthTrackingEnabled: user?.healthTrackingEnabled ?? false,
            runsPerWeek: activeGoal?.runsPerWeek || 4,
            ridesPerWeek: activeGoal?.ridesPerWeek || 0,
            swimsPerWeek: activeGoal?.swimsPerWeek || 0,
            strengthPerWeek: activeGoal?.strengthPerWeek || 0,
            weeklyMileageGoal: (activeGoal?.weeklyMileageGoal || 40000) / 1000,
            startWeeklyMileage: startWeeklyMileage || null,
            taperWeeks: activeGoal?.taperWeeks,
            peakWeeks: activeGoal?.peakWeeks,
            buildWeeks: activeGoal?.buildWeeks,
            currentVdot: activeGoal?.currentVdot || 30,
            longRunDay: activeGoal?.longRunDay ?? 0,
            qualityDay: activeGoal?.workoutDay ?? 3,
            swimDay: activeGoal?.swimDay ?? null,
            restDays: activeGoal?.restDays ?? [1, 5],
            maxLongRunKm: activeGoal?.workouts?.[0]?.targetDistance
                ? Math.round(activeGoal.workouts[0].targetDistance / 1000)
                : null,
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
        const {
            timeSeconds, raceDistance, runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek,
            weeklyMileageGoal, maxHeartRate, restingHeartRate, weight,
            hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max,
            thresholdHeartRate, thresholdPace, taperWeeks, peakWeeks, buildWeeks,
            maxLongRunKm, calibrationFactor, effectiveVo2maxCorrectionFactor,
            matchToMyWhoosh, longRunDay, qualityDay, swimDay, restDays,
            raceType, raceDate, planStartDate, sport, mywhooshPlanId
        } = body;

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

        // Effective VO2max correction factor (Shared-Baseline pipeline): 0.75 to 1.25
        if (typeof effectiveVo2maxCorrectionFactor === 'number' && effectiveVo2maxCorrectionFactor >= 0.75 && effectiveVo2maxCorrectionFactor <= 1.25) {
            userUpdateData.effectiveVo2maxCorrectionFactor = effectiveVo2maxCorrectionFactor;
        }

        // MyWhoosh structured-workout auto-matching preference
        if (typeof matchToMyWhoosh === 'boolean') {
            userUpdateData.matchToMyWhoosh = matchToMyWhoosh;
        }

        // Persist calibration reference race data so the form can restore it
        if (typeof timeSeconds === 'number' && timeSeconds > 0 && raceDistance) {
            userUpdateData.vdotReferenceRaceTime = Math.round(timeSeconds);
            userUpdateData.vdotReferenceRaceType = raceDistance;
            userUpdateData.vdotReferenceRaceDate = new Date();
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

        // HR Zone thresholds: 40-250 BPM (also accepts legacy percent values 40-100)
        const validateZone = (val: unknown): number | null => {
            if (typeof val !== 'number') return null;
            if (val >= 40 && val <= 250) return Math.round(val);
            return null;
        };

        const zoneUpdates = {
            hrZone1Max: validateZone(hrZone1Max),
            hrZone2Max: validateZone(hrZone2Max),
            hrZone3Max: validateZone(hrZone3Max),
            hrZone4Max: validateZone(hrZone4Max),
            hrZone5Max: validateZone(hrZone5Max),
            hrZone6Max: validateZone(hrZone6Max),
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

        // Fetch current user profile for HR zone fallback values
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                hrMax: true, hrRest: true, thresholdHeartRate: true,
                hrZone1Max: true, hrZone2Max: true, hrZone3Max: true,
                hrZone4Max: true, hrZone5Max: true, hrZone6Max: true,
            },
        });

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
            const normalizedMaxLongRunKm = typeof maxLongRunKm === 'number'
                ? Math.max(6, Math.min(Math.round(maxLongRunKm), 32))
                : undefined;

            // Phase settings (use provided or defaults)
            let taper = taperWeeks ?? 2;
            let peak = peakWeeks || 4;
            let build = buildWeeks || 4;

            // M-07: Validate that phase weeks don't exceed available weeks
            const weeksUntilRace = activeGoal.raceDate
                ? Math.floor((new Date(activeGoal.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
                : 0;
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

            // Update Goal Settings (currentVdot is set inside recalculateWorkoutPaces)
            const nextRaceType = (raceType || activeGoal.raceType) as RaceType | null;
            const isTri =
                sport === 'TRIATHLON' ||
                (nextRaceType != null && TRIATHLON_RACE_TYPES.includes(nextRaceType));
            const nextSport: PlanSport = isTri ? 'TRIATHLON' : 'RUN';

            const raceTypeChanged = raceType !== undefined && raceType !== activeGoal.raceType;
            const sportChanged = sport !== undefined && sport !== activeGoal.sport;
            const ridesChanged = typeof ridesPerWeek === 'number' && ridesPerWeek !== activeGoal.ridesPerWeek;
            const swimsChanged = typeof swimsPerWeek === 'number' && swimsPerWeek !== activeGoal.swimsPerWeek;
            const runsChanged = typeof runsPerWeek === 'number' && runsPerWeek !== activeGoal.runsPerWeek;
            const mywhooshProvided = Boolean(mywhooshPlanId);

            const shouldRegenerate =
                raceTypeChanged ||
                sportChanged ||
                sport === 'TRIATHLON' ||
                ridesChanged ||
                swimsChanged ||
                runsChanged ||
                mywhooshProvided;

            if (shouldRegenerate) {
                const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
                const startDate = (planStartDate ? new Date(planStartDate) : null) || firstPendingWorkout?.scheduledDate || activeGoal.planStartDate || new Date();
                const nextRaceDate = (raceDate ? new Date(raceDate) : null) || activeGoal.raceDate || new Date(startDate.getTime() + 12 * MS_PER_WEEK);
                const totalWeeks = Math.max(4, Math.ceil((new Date(nextRaceDate).getTime() - new Date(startDate).getTime()) / MS_PER_WEEK));

                const userThresholds = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { ftpWatts: true, swimCssSecPer100m: true },
                });
                const nextFtp = userThresholds?.ftpWatts || activeGoal.ftpAtCreation || 220;
                const nextCss = userThresholds?.swimCssSecPer100m || activeGoal.swimCssAtCreation || 115;

                const rawMileage = typeof weeklyMileageGoal === 'number' ? weeklyMileageGoal : (activeGoal.weeklyMileageGoal || 40000);
                const nextMileageMeters = rawMileage < 500 ? rawMileage * 1000 : rawMileage;

                const nextRuns = typeof runsPerWeek === 'number' ? runsPerWeek : (activeGoal.runsPerWeek || 4);
                const nextRides = typeof ridesPerWeek === 'number' ? ridesPerWeek : (isTri ? Math.max(2, activeGoal.ridesPerWeek || 0) : (activeGoal.ridesPerWeek || 0));
                const nextSwims = typeof swimsPerWeek === 'number' ? swimsPerWeek : (isTri ? Math.max(2, activeGoal.swimsPerWeek || 0) : (activeGoal.swimsPerWeek || 0));
                const nextStrength = typeof strengthPerWeek === 'number' ? strengthPerWeek : (activeGoal.strengthPerWeek || 0);

                const nextLongRunDay = typeof longRunDay === 'number' ? longRunDay : activeGoal.longRunDay;
                const nextWorkoutDay = typeof qualityDay === 'number' ? qualityDay : activeGoal.workoutDay;
                const nextSwimDay = typeof swimDay === 'number' ? swimDay : (activeGoal.swimDay ?? undefined);
                const nextRestDays = Array.isArray(restDays) ? (restDays as number[]) : (Array.isArray(activeGoal.restDays) ? (activeGoal.restDays as number[]) : undefined);

                const planConfig: PlanConfig = {
                    vdot: newVdot,
                    raceType: nextRaceType,
                    raceDate: nextRaceDate,
                    startDate,
                    sport: nextSport,
                    runsPerWeek: nextRuns,
                    ridesPerWeek: nextRides,
                    swimsPerWeek: nextSwims,
                    strengthPerWeek: nextStrength,
                    weeklyMileageGoal: nextMileageMeters,
                    buildWeeks: build,
                    peakWeeks: peak,
                    taperWeeks: taper,
                    weeksTotal: totalWeeks,
                    ftpWatts: nextFtp,
                    swimCssSecPer100m: nextCss,
                    matchToMyWhoosh: Boolean(matchToMyWhoosh),
                    mywhooshPlanId: typeof mywhooshPlanId === 'string' && mywhooshPlanId ? mywhooshPlanId : null,
                    longRunDay: nextLongRunDay,
                    workoutDay: nextWorkoutDay,
                    swimDay: nextSwimDay,
                    restDays: nextRestDays,
                    maxLongRunKm: normalizedMaxLongRunKm,
                    thresholdHeartRate: typeof thresholdHeartRate === 'number' ? Math.round(thresholdHeartRate) : currentUser?.thresholdHeartRate ?? null,
                    hrZone1Max: typeof hrZone1Max === 'number' ? Math.round(hrZone1Max) : currentUser?.hrZone1Max ?? null,
                    hrZone2Max: typeof hrZone2Max === 'number' ? Math.round(hrZone2Max) : currentUser?.hrZone2Max ?? null,
                    hrZone3Max: typeof hrZone3Max === 'number' ? Math.round(hrZone3Max) : currentUser?.hrZone3Max ?? null,
                    hrZone4Max: typeof hrZone4Max === 'number' ? Math.round(hrZone4Max) : currentUser?.hrZone4Max ?? null,
                    hrZone5Max: typeof hrZone5Max === 'number' ? Math.round(hrZone5Max) : currentUser?.hrZone5Max ?? null,
                    hrZone6Max: typeof hrZone6Max === 'number' ? Math.round(hrZone6Max) : currentUser?.hrZone6Max ?? null,
                    hrMax: typeof maxHeartRate === 'number' ? Math.round(maxHeartRate) : currentUser?.hrMax ?? null,
                    hrRest: typeof restingHeartRate === 'number' ? Math.round(restingHeartRate) : currentUser?.hrRest ?? null,
                };

                const generated = generateTrainingPlan(planConfig);
                for (const w of generated) {
                    if (w.plannedTss == null) {
                        w.plannedTss = calculateWorkoutPlannedTss({
                            workoutType: w.type as WorkoutType,
                            sport: w.sport ?? null,
                            targetDistance: w.totalDistance,
                            targetDuration: w.targetDuration ?? null,
                            targetPace: w.targetPace ?? null,
                            structuredSteps: w.structuredSteps ?? null,
                            ftpWatts: nextFtp,
                        });
                    }
                }
                const phaseBlocks = buildPlanPhaseBlocks(planConfig, generated);
                const weeklyGoals = computePlanWeeklyVolumeGoals(planConfig, generated);

                await prisma.$transaction(async (tx) => {
                    await tx.workout.deleteMany({
                        where: { goalId: activeGoal.id, isCompleted: false },
                    });
                    await tx.goal.update({
                        where: { id: activeGoal.id },
                        data: {
                            sport: nextSport,
                            raceType: nextRaceType,
                            raceDate: nextRaceDate,
                            planStartDate: startDate,
                            planWeeks: totalWeeks,
                            currentVdot: newVdot,
                            ftpAtCreation: nextFtp,
                            swimCssAtCreation: nextCss,
                            runsPerWeek: nextRuns,
                            ridesPerWeek: nextRides,
                            swimsPerWeek: nextSwims,
                            strengthPerWeek: nextStrength,
                            weeklyMileageGoal: nextMileageMeters,
                            buildWeeks: build,
                            peakWeeks: peak,
                            taperWeeks: taper,
                            longRunDay: nextLongRunDay,
                            workoutDay: nextWorkoutDay,
                            swimDay: typeof nextSwimDay === 'number' ? nextSwimDay : null,
                            ...(nextRestDays && { restDays: nextRestDays }),
                            weeklyBikeTssGoal: weeklyGoals.bikeTss,
                            weeklySwimMetersGoal: weeklyGoals.swimMeters,
                            targetWeeklyTss: weeklyGoals.totalTss,
                            ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
                        },
                    });
                    if (generated.length > 0) {
                        await tx.workout.createMany({
                            data: mapWorkoutsForDb(generated, { goalId: activeGoal.id, ftpWatts: nextFtp }),
                        });
                    }
                });
            } else {
                // Update Goal Settings (currentVdot is set inside recalculateWorkoutPaces)
                await prisma.goal.update({
                    where: { id: activeGoal.id },
                    data: {
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
                        ...(typeof swimDay === 'number' ? { swimDay } : { swimDay: null }),
                        ...(Array.isArray(restDays) && { restDays }),
                        ...(firstPendingWorkout?.scheduledDate && { planStartDate: firstPendingWorkout.scheduledDate }),
                    }
                });

                const result = await recalculateWorkoutPaces(activeGoal.id, newVdot, {
                    thresholdHeartRate: typeof thresholdHeartRate === 'number' ? Math.round(thresholdHeartRate) : currentUser?.thresholdHeartRate ?? null,
                    hrZone1Max: typeof hrZone1Max === 'number' ? Math.round(hrZone1Max) : currentUser?.hrZone1Max ?? null,
                    hrZone2Max: typeof hrZone2Max === 'number' ? Math.round(hrZone2Max) : currentUser?.hrZone2Max ?? null,
                    hrZone3Max: typeof hrZone3Max === 'number' ? Math.round(hrZone3Max) : currentUser?.hrZone3Max ?? null,
                    hrZone4Max: typeof hrZone4Max === 'number' ? Math.round(hrZone4Max) : currentUser?.hrZone4Max ?? null,
                    hrZone5Max: typeof hrZone5Max === 'number' ? Math.round(hrZone5Max) : currentUser?.hrZone5Max ?? null,
                    hrZone6Max: typeof hrZone6Max === 'number' ? Math.round(hrZone6Max) : currentUser?.hrZone6Max ?? null,
                    hrMax: typeof maxHeartRate === 'number' ? Math.round(maxHeartRate) : currentUser?.hrMax ?? null,
                    hrRest: typeof restingHeartRate === 'number' ? Math.round(restingHeartRate) : currentUser?.hrRest ?? null,
                });
                console.log(`Pace recalculation complete: ${result.updatedCount} updated, ${result.skippedCount} skipped`);
            }
        }

        return NextResponse.json({ success: true, vdot: newVdot });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
