import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAiConfigForModel, generateCompletion } from '@/lib/ai';
import { logger } from '@/lib/logging/logger';
import { auth } from '@/auth';
import { subDays, format } from 'date-fns';

export async function POST(_request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;

        const userSettings = await prisma.userAiSettings.findUnique({
            where: { userId },
        });

        if (!userSettings?.adminAllowed || !userSettings?.aiEnabled) {
            return NextResponse.json(
                { error: 'AI features are not enabled for your account.' },
                { status: 403 }
            );
        }

        const target = await prisma.userNutritionTarget.findUnique({
            where: { userId }
        });

        if (!target) {
            return NextResponse.json({ error: 'Nutrition targets not set.' }, { status: 400 });
        }

        // Calculate last 7 days range
        const endDateObj = new Date();
        const startDateObj = subDays(endDateObj, 7);
        const endDateStr = format(endDateObj, 'yyyy-MM-dd');
        const startDateStr = format(startDateObj, 'yyyy-MM-dd');

        // Fetch logs
        const foodLogs = await prisma.nutritionLog.findMany({
            where: {
                userId,
                date: { gte: startDateStr, lte: endDateStr }
            }
        });

        // Group by day to get daily averages
        const dailyTotals: Record<string, { cals: number, pro: number, carbs: number, fat: number }> = {};
        for (const log of foodLogs) {
            const dateStr = log.date;
            if (!dailyTotals[dateStr]) dailyTotals[dateStr] = { cals: 0, pro: 0, carbs: 0, fat: 0 };
            
            dailyTotals[dateStr].cals += log.calories || 0;
            dailyTotals[dateStr].pro += log.protein || 0;
            dailyTotals[dateStr].carbs += log.carbs || 0;
            dailyTotals[dateStr].fat += log.fats || 0;
        }

        const daysLogged = Object.keys(dailyTotals).length;
        if (daysLogged === 0) {
            return NextResponse.json({ error: 'Not enough data in the last 7 days to generate insights.' }, { status: 400 });
        }

        let sumCals = 0, sumPro = 0, sumCarbs = 0, sumFat = 0;
        for (const day of Object.values(dailyTotals)) {
            sumCals += day.cals; sumPro += day.pro; sumCarbs += day.carbs; sumFat += day.fat;
        }

        const avgCals = Math.round(sumCals / daysLogged);
        const avgPro = Math.round(sumPro / daysLogged);
        const avgCarbs = Math.round(sumCarbs / daysLogged);
        const avgFat = Math.round(sumFat / daysLogged);

        const prompt = `You are an expert nutrition and fitness coach. I am providing you with my nutritional data from the last 7 days (logged across ${daysLogged} days).

MY TARGETS:
- Calories: ${target.dailyCalories} kcal/day
- Protein: ${target.proteinPercent}%
- Carbs: ${target.carbsPercent}%
- Fats: ${target.fatsPercent}%

MY AVERAGES OVER THE LAST 7 DAYS:
- Calories: ${avgCals} kcal/day
- Protein: ${avgPro}g/day
- Carbs: ${avgCarbs}g/day
- Fats: ${avgFat}g/day

Please provide a short, actionable weekly insight report (max 3 short paragraphs). 
1. Acknowledge my consistency or point out what I'm doing well.
2. Highlight the biggest gap between my target and my actual intake.
3. Suggest one concrete, actionable tip to improve my nutrition next week based on this data.

Write directly to me (e.g., "You did a great job..."). Use markdown formatting. Keep it encouraging but data-driven.`;

        const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        const insightModel = globalSettings?.activityFeedbackModel || 'gemini-1.5-flash';
        const providerConfig = await getAiConfigForModel(userId, insightModel);

        if (!providerConfig) {
            return NextResponse.json(
                { error: 'AI features not enabled or no provider configured that supports the requested model' },
                { status: 503 }
            );
        }

        const insightContent = await generateCompletion(providerConfig, [{ role: 'user', content: prompt }]);

        if (!insightContent) {
            return NextResponse.json({ error: 'AI failed to return an insight.' }, { status: 500 });
        }

        // Save Insight
        const newInsight = await prisma.healthInsight.create({
            data: {
                userId,
                date: new Date(),
                rangeStart: startDateObj,
                rangeEnd: endDateObj,
                content: insightContent,
                metrics: { avgCals, avgPro, avgCarbs, avgFat, daysLogged }
            }
        });

        return NextResponse.json(newInsight);

    } catch (error) {
        logger.error('[Insights Generator] Unexpected error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to generate insight.' }, { status: 500 });
    }
}
