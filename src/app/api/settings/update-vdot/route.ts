import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { calculateVdot, RaceDistance } from '@/lib/metrics/vdot';
import { generateTrainingPlan } from '@/lib/plans';
import { authOptions } from '@/lib/strava/oauth';
import { NextResponse } from 'next/server';
import { WorkoutType } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { timeSeconds, raceDistance, runsPerWeek, ridesPerWeek, strengthPerWeek, weeklyMileageGoal, maxHeartRate, restingHeartRate } = await req.json();

        if (!timeSeconds || !raceDistance) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Calculate new VDOT
        const newVdot = calculateVdot({ distance: raceDistance as RaceDistance, timeSeconds });

        // 2. Update User HR settings if provided
        if (maxHeartRate || restingHeartRate) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    ...(maxHeartRate && { hrMax: maxHeartRate }),
                    ...(restingHeartRate && { hrRest: restingHeartRate }),
                }
            });
        }

        // 3. Find Active Goal
        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (activeGoal) {
            const runs = runsPerWeek || 4;
            const rides = ridesPerWeek || 0;
            const strength = strengthPerWeek || 0;
            const mileageGoal = weeklyMileageGoal || null; // meters

            // Update Goal Settings
            await prisma.goal.update({
                where: { id: activeGoal.id },
                data: {
                    currentVdot: newVdot,
                    runsPerWeek: runs,
                    ridesPerWeek: rides,
                    strengthPerWeek: strength,
                    weeklyMileageGoal: mileageGoal,
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
                weeklyMileageGoal: mileageGoal
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
