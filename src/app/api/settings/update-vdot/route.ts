import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { calculateVdot, RaceDistance } from '@/lib/metrics/vdot';
import { generateTrainingPlan } from '@/lib/plans';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@prisma/client';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
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
                hrZone4Max: true
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
            hrZone1Max: user?.hrZone1Max || 60,
            hrZone2Max: user?.hrZone2Max || 70,
            hrZone3Max: user?.hrZone3Max || 80,
            hrZone4Max: user?.hrZone4Max || 90,
            runsPerWeek: activeGoal?.runsPerWeek || 4,
            ridesPerWeek: activeGoal?.ridesPerWeek || 0,
            strengthPerWeek: activeGoal?.strengthPerWeek || 0,
            weeklyMileageGoal: (activeGoal?.weeklyMileageGoal || 40000) / 1000, // convert m to km
            taperWeeks: activeGoal?.taperWeeks,
            peakWeeks: activeGoal?.peakWeeks,
            buildWeeks: activeGoal?.buildWeeks,
            currentVdot: activeGoal?.currentVdot || 30
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { timeSeconds, raceDistance, runsPerWeek, ridesPerWeek, strengthPerWeek, weeklyMileageGoal, maxHeartRate, restingHeartRate, weight, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, taperWeeks, peakWeeks, buildWeeks } = await req.json();

        if (!timeSeconds || !raceDistance) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Calculate new VDOT
        const newVdot = calculateVdot({ distance: raceDistance as RaceDistance, timeSeconds });

        // 2. Update User HR settings if provided
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(maxHeartRate && { hrMax: maxHeartRate }),
                ...(restingHeartRate && { hrRest: restingHeartRate }),
                ...(weight && { weight: parseFloat(weight) }),
                ...(hrZone1Max && { hrZone1Max }),
                ...(hrZone2Max && { hrZone2Max }),
                ...(hrZone3Max && { hrZone3Max }),
                ...(hrZone4Max && { hrZone4Max }),
            }
        });

        // 3. Find Active Goal
        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (activeGoal) {
            const runs = runsPerWeek || 4;
            const rides = ridesPerWeek || 0;
            const strength = strengthPerWeek || 0;
            const mileageGoal = weeklyMileageGoal || null; // meters

            // Phase settings (use provided or defaults)
            const taper = taperWeeks || 2;
            const peak = peakWeeks || 4;
            const build = buildWeeks || 4;

            // Update Goal Settings
            await prisma.goal.update({
                where: { id: activeGoal.id },
                data: {
                    currentVdot: newVdot,
                    runsPerWeek: runs,
                    ridesPerWeek: rides,
                    strengthPerWeek: strength,
                    weeklyMileageGoal: mileageGoal,
                    taperWeeks: taper,
                    peakWeeks: peak,
                    buildWeeks: build,
                }
            });

            // Regenerate Plan

            // Delete existing FUTURE & INCOMPLETE workouts for this goal
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await prisma.workout.deleteMany({
                where: {
                    goalId: activeGoal.id,
                    isCompleted: false,
                    scheduledDate: { gte: today }
                }
            });

            // Generate new plan (offset to start TODAY)
            const startDate = new Date();

            const workouts = generateTrainingPlan({
                vdot: newVdot,
                raceType: activeGoal.raceType,
                raceDate: activeGoal.raceDate,
                startDate: startDate,
                runsPerWeek: runs,
                ridesPerWeek: rides,
                strengthPerWeek: strength,
                weeklyMileageGoal: mileageGoal,
                taperWeeks: taper,
                peakWeeks: peak,
                buildWeeks: build,
            });

            // Save workouts
            await prisma.$transaction(
                workouts.map(w => prisma.workout.create({
                    data: {
                        goalId: activeGoal.id,
                        scheduledDate: w.date,
                        workoutType: w.type as WorkoutType,
                        description: w.description,
                        targetDistance: w.totalDistance,
                        targetPace: w.targetPace || 0,
                        targetDuration: 0,
                        isCompleted: false
                    }
                }))
            );
        }

        return NextResponse.json({ success: true, vdot: newVdot });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}
