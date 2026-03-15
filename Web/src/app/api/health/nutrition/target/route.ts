import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Only allow fetching own targets
        if (userId && userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const effectiveUserId = userId || session.user.id;

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId: effectiveUserId }
        });

        // Fetch User profile to help calculate BMR
        const user = await prisma.user.findUnique({
            where: { id: effectiveUserId },
            select: {
                weight: true,
                height: true,
                birthDate: true,
                sex: true
            }
        });

        // 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch activities from the last 30 days to get avg active calories
        const activities = await prisma.activity.findMany({
            where: {
                userId: effectiveUserId,
                startDate: { gte: thirtyDaysAgo }
            },
            select: { calories: true }
        });

        let totalActiveCals = 0;
        let countWithCals = 0;
        for (const act of activities) {
            if (act.calories) {
                totalActiveCals += act.calories;
                countWithCals++;
            }
        }
        // Daily average active calories (divided by 30 days, not just days with workouts, to get daily TDEE addition)
        const avgActiveCalories = totalActiveCals / 30;

        // Default target if none exists
        const returnTarget = target || {
            dailyCalories: 2000,
            proteinPercent: 30,
            carbsPercent: 40,
            fatsPercent: 30,
            exerciseCalorieFactor: 0.5,
            waterTrackingEnabled: false,
            waterGoalMl: 2500
        };

        return NextResponse.json({
            ...returnTarget,
            userProfile: user,
            avgActiveCalories,
            isDefault: !target
        });
    } catch (error) {
        console.error("Error fetching nutrition target:", error);
        return NextResponse.json({ error: 'Failed to fetch nutrition target' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { 
            userId, 
            dailyCalories, 
            proteinPercent, 
            carbsPercent, 
            fatsPercent,
            exerciseCalorieFactor,
            waterTrackingEnabled,
            waterGoalMl
        } = body;

        // Use session userId, but allow body userId if it matches (backwards compat)
        const effectiveUserId = session.user.id;
        if (userId && userId !== effectiveUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const target = await prisma.userNutritionTarget.upsert({
            where: { userId: effectiveUserId },
            update: {
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent,
                ...(exerciseCalorieFactor !== undefined && { exerciseCalorieFactor }),
                ...(waterTrackingEnabled !== undefined && { waterTrackingEnabled }),
                ...(waterGoalMl !== undefined && { waterGoalMl })
            },
            create: {
                userId: effectiveUserId,
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent,
                ...(exerciseCalorieFactor !== undefined && { exerciseCalorieFactor }),
                ...(waterTrackingEnabled !== undefined && { waterTrackingEnabled }),
                ...(waterGoalMl !== undefined && { waterGoalMl })
            }
        });

        return NextResponse.json(target);
    } catch (error) {
        console.error("Error updating nutrition target:", error);
        return NextResponse.json({ error: 'Failed to update nutrition target' }, { status: 500 });
    }
}
