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

        const { timeSeconds, raceDistance, runsPerWeek, ridesPerWeek } = await req.json();

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
            const runs = runsPerWeek || 4;
            const rides = ridesPerWeek || 0;

            // Update Goal Settings
            await prisma.goal.update({
                where: { id: activeGoal.id },
                data: {
                    currentVdot: newVdot,
                    runsPerWeek: runs,
                    ridesPerWeek: rides
                }
            });

            // Regenerate Plan

            // Delete existing workouts for this goal
            await prisma.workout.deleteMany({
                where: { goalId: activeGoal.id }
            });

            // Generate new plan (offset to start TODAY)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 1); // Start yesterday so today is day 1? Or purely relative.

            // Wait, previous logic was startDate. setDate( - 1). 
            // Current 'generatePlan' uses date logic.
            // If I generate starting TODAY, the scheduled dates will start from TODAY.

            const workouts = generateTrainingPlan({
                vdot: newVdot,
                raceType: activeGoal.raceType,
                raceDate: activeGoal.raceDate,
                startDate: startDate,
                runsPerWeek: runs,
                ridesPerWeek: rides
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
