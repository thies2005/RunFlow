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

        const { timeSeconds, raceDistance } = await req.json(); // e.g. "5K", 1500

        if (!timeSeconds || !raceDistance) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Calculate new VDOT
        const newVdot = calculateVdot({ distance: raceDistance as RaceDistance, timeSeconds });

        // 2. Find Active Goal
        const activeGoal = await prisma.goal.findFirst({
            where: { userId: session.user.id, isActive: true },
        });

        if (activeGoal) {
            // Regenerate Plan

            // Delete existing workouts for this goal
            await prisma.workout.deleteMany({
                where: { goalId: activeGoal.id }
            });

            // Generate new plan (offset to start TODAY)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);

            const workouts = generateTrainingPlan({
                vdot: newVdot,
                raceType: activeGoal.raceType, // Prisma Enum
                raceDate: activeGoal.raceDate,
                startDate: startDate,
            });

            // Save workouts
            // Map 'GeneratedWorkout' fields to 'Workout' Prisma model fields
            await prisma.$transaction(
                workouts.map(w => prisma.workout.create({
                    data: {
                        goalId: activeGoal.id,
                        scheduledDate: w.date,
                        workoutType: w.type as WorkoutType,
                        description: w.description,
                        targetDistance: w.totalDistance, // meters
                        targetPace: w.targetPace || 0, // sec/km
                        targetDuration: 0, // Optional
                        isCompleted: false
                    }
                }))
            );

            // Update Goal VDOT in DB
            await prisma.goal.update({
                where: { id: activeGoal.id },
                data: { currentVdot: newVdot }
            });
        }

        return NextResponse.json({ success: true, vdot: newVdot });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}
