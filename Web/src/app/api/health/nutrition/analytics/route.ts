import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  potassium: number;
  cholesterol: number;
  calcium: number;
  iron: number;
}

interface FoodContribution {
  foodItemId: string;
  foodName: string;
  amount: number;
}

interface TopContributors {
  sodium: FoodContribution[];
  sugar: FoodContribution[];
  calories: FoodContribution[];
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  try {
    // Fetch user's nutrition target or use defaults
    const userTarget = await prisma.userNutritionTarget.findUnique({
      where: { userId: session.user.id }
    });

    const target = userTarget || {
      dailyCalories: 2000,
      proteinPercent: 30,
      carbsPercent: 40,
      fatsPercent: 30
    };

    // Calculate target macros in grams
    // Protein: 4 cal/g, Carbs: 4 cal/g, Fats: 9 cal/g
    const targetProtein = Math.round((target.dailyCalories * target.proteinPercent / 100) / 4);
    const targetCarbs = Math.round((target.dailyCalories * target.carbsPercent / 100) / 4);
    const targetFats = Math.round((target.dailyCalories * target.fatsPercent / 100) / 9);

    // Fetch all nutrition logs in date range
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        foodItem: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Group by date and calculate totals
    const dailyMap = new Map<string, DailyNutrition>();
    const foodContributions = new Map<string, {
      sodium: number;
      sugar: number;
      calories: number;
      foodName: string;
      foodItemId: string;
    }>();

    for (const log of logs) {
      const date = log.date;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0,
          sugar: 0,
          saturatedFat: 0,
          sodium: 0,
          potassium: 0,
          cholesterol: 0,
          calcium: 0,
          iron: 0
        });
      }

      const day = dailyMap.get(date)!;
      day.calories += log.calories;
      day.protein += log.protein;
      day.carbs += log.carbs;
      day.fats += log.fats;
      day.fiber += log.fiber || 0;
      day.sugar += log.sugar || 0;
      day.saturatedFat += log.saturatedFat || 0;
      day.sodium += log.sodium || 0;
      day.potassium += log.potassium || 0;
      day.cholesterol += log.cholesterol || 0;
      day.calcium += log.calcium || 0;
      day.iron += log.iron || 0;

      // Track food contributions
      const key = log.foodItem.id;
      if (!foodContributions.has(key)) {
        foodContributions.set(key, {
          sodium: 0,
          sugar: 0,
          calories: 0,
          foodName: log.foodItem.name,
          foodItemId: log.foodItem.id
        });
      }
      const contrib = foodContributions.get(key)!;
      contrib.sodium += log.sodium || 0;
      contrib.sugar += log.sugar || 0;
      contrib.calories += log.calories;
    }

    // Convert map to array and sort by date
    const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate average daily values
    const avgDaily = dailyData.length > 0 ? {
      calories: Math.round(dailyData.reduce((sum, d) => sum + d.calories, 0) / dailyData.length),
      protein: Math.round(dailyData.reduce((sum, d) => sum + d.protein, 0) / dailyData.length),
      carbs: Math.round(dailyData.reduce((sum, d) => sum + d.carbs, 0) / dailyData.length),
      fats: Math.round(dailyData.reduce((sum, d) => sum + d.fats, 0) / dailyData.length),
      fiber: Math.round((dailyData.reduce((sum, d) => sum + d.fiber, 0) / dailyData.length) * 10) / 10,
      sugar: Math.round((dailyData.reduce((sum, d) => sum + d.sugar, 0) / dailyData.length) * 10) / 10,
      saturatedFat: Math.round((dailyData.reduce((sum, d) => sum + d.saturatedFat, 0) / dailyData.length) * 10) / 10,
      sodium: Math.round((dailyData.reduce((sum, d) => sum + d.sodium, 0) / dailyData.length) * 10) / 10,
      potassium: Math.round((dailyData.reduce((sum, d) => sum + d.potassium, 0) / dailyData.length) * 10) / 10,
      cholesterol: Math.round((dailyData.reduce((sum, d) => sum + d.cholesterol, 0) / dailyData.length) * 10) / 10,
      calcium: Math.round((dailyData.reduce((sum, d) => sum + d.calcium, 0) / dailyData.length) * 10) / 10,
      iron: Math.round((dailyData.reduce((sum, d) => sum + d.iron, 0) / dailyData.length) * 10) / 10,
    } : null;

    // Calculate macro adherence score
    let totalCalorieDiff = 0;
    let totalProteinDiff = 0;
    let totalCarbsDiff = 0;
    let totalFatsDiff = 0;
    let daysWithLogs = 0;

    for (const day of dailyData) {
      totalCalorieDiff += Math.abs(day.calories - target.dailyCalories) / target.dailyCalories;
      totalProteinDiff += Math.abs(day.protein - targetProtein) / targetProtein;
      totalCarbsDiff += Math.abs(day.carbs - targetCarbs) / targetCarbs;
      totalFatsDiff += Math.abs(day.fats - targetFats) / targetFats;
      daysWithLogs++;
    }

    const adherenceScore = daysWithLogs > 0 ? Math.round(
      (1 - (totalCalorieDiff + totalProteinDiff + totalCarbsDiff + totalFatsDiff) / (4 * daysWithLogs)) * 100
    ) : 0;

    // Calculate top contributors (top 3 for each category)
    const contributorsArray = Array.from(foodContributions.values());
    const topContributors: TopContributors = {
      sodium: contributorsArray
        .sort((a, b) => b.sodium - a.sodium)
        .slice(0, 3)
        .map(c => ({ foodItemId: c.foodItemId, foodName: c.foodName, amount: Math.round(c.sodium * 10) / 10 })),
      sugar: contributorsArray
        .sort((a, b) => b.sugar - a.sugar)
        .slice(0, 3)
        .map(c => ({ foodItemId: c.foodItemId, foodName: c.foodName, amount: Math.round(c.sugar * 10) / 10 })),
      calories: contributorsArray
        .sort((a, b) => b.calories - a.calories)
        .slice(0, 3)
        .map(c => ({ foodItemId: c.foodItemId, foodName: c.foodName, amount: Math.round(c.calories) }))
    };

    // Get today's data for the daily goal ring
    const today = new Date().toISOString().split('T')[0];
    const todayData = dailyMap.get(today) || {
      date: today,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      saturatedFat: 0,
      sodium: 0,
      potassium: 0,
      cholesterol: 0,
      calcium: 0,
      iron: 0
    };

    return NextResponse.json({
      target: {
        ...target,
        targetProtein,
        targetCarbs,
        targetFats
      },
      today: todayData,
      dailyData,
      avgDaily,
      adherenceScore: Math.max(0, Math.min(100, adherenceScore)),
      topContributors,
      daysWithLogs
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
