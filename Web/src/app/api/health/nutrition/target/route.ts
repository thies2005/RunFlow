import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId }
        });

        // Fetch User profile to help calculate BMR
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                userId,
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
            fatsPercent: 30
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
        const body = await request.json();
        const { userId, dailyCalories, proteinPercent, carbsPercent, fatsPercent } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const target = await prisma.userNutritionTarget.upsert({
            where: { userId },
            update: {
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent
            },
            create: {
                userId,
                dailyCalories,
                proteinPercent,
                carbsPercent,
                fatsPercent
            }
        });

        return NextResponse.json(target);
    } catch (error) {
        console.error("Error updating nutrition target:", error);
        return NextResponse.json({ error: 'Failed to update nutrition target' }, { status: 500 });
    }
}
