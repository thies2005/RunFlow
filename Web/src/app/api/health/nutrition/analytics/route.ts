export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

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

// Helper to safely convert nullable number to number, defaulting to 0
const safeNumber = (value: number | null): number => value ?? 0;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

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

    // Fetch today's activity calories
    const nowDate = new Date();
    const todayStart = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    // Determine the exercise calorie source preference
    const calorieSource = (userTarget as any)?.exerciseCalorieSource || 'strava';
    let exerciseCalories = 0;

    if (calorieSource === 'health_connect') {
      // Fetch daily health log for today
      const dailyHealth = await prisma.dailyHealthLog.findUnique({
        where: {
          userId_date: {
            userId: session.user.id,
            date: todayStart
          }
        },
        select: { activeCalories: true }
      });
      exerciseCalories = dailyHealth?.activeCalories || 0;
    } else {
      const todayActivities = await prisma.activity.findMany({
        where: {
          userId: session.user.id,
          startDate: {
            gte: todayStart,
            lt: todayEnd
          }
        },
        select: { calories: true, movingTime: true }
      });
      // Sum calories, using a fallback estimation for activities without calorie data
      exerciseCalories = todayActivities.reduce((sum, a) => {
        if (a.calories && a.calories > 0) return sum + a.calories;
        // Fallback: estimate ~7 kcal/min for moderate exercise
        if (a.movingTime > 0) return sum + Math.round((a.movingTime / 60) * 7);
        return sum;
      }, 0);
    }
    
    const exerciseCalorieFactor = (userTarget as any)?.exerciseCalorieFactor ?? 0.5;
    const exerciseBudget = Math.round(exerciseCalories * exerciseCalorieFactor);

    // OPTIMIZATION: Use Prisma's groupBy for database-level aggregation
    // This performs the summation at the database level instead of in-memory
    const groupedData = await prisma.nutritionLog.groupBy({
      by: ['date'],
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fats: true,
        fiber: true,
        sugar: true,
        saturatedFat: true,
        sodium: true,
        potassium: true,
        cholesterol: true,
        calcium: true,
        iron: true,
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Map the grouped data to our expected format, safely handling nulls
    const dailyData: DailyNutrition[] = groupedData.map((group) => ({
      date: group.date,
      calories: safeNumber(group._sum.calories),
      protein: safeNumber(group._sum.protein),
      carbs: safeNumber(group._sum.carbs),
      fats: safeNumber(group._sum.fats),
      fiber: safeNumber(group._sum.fiber),
      sugar: safeNumber(group._sum.sugar),
      saturatedFat: safeNumber(group._sum.saturatedFat),
      sodium: safeNumber(group._sum.sodium),
      potassium: safeNumber(group._sum.potassium),
      cholesterol: safeNumber(group._sum.cholesterol),
      calcium: safeNumber(group._sum.calcium),
      iron: safeNumber(group._sum.iron),
    }));

    // OPTIMIZATION: Use a separate aggregation query for top contributors
    // This is more efficient than fetching all logs and grouping in memory
    const foodContributions = await prisma.nutritionLog.groupBy({
      by: ['foodItemId'],
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        sodium: true,
        sugar: true,
        calories: true,
      },
    });

    // Fetch food item names for the contributors (batched query)
    const foodItemIds = foodContributions.map(fc => fc.foodItemId);
    const foodItems = await prisma.foodItem.findMany({
      where: {
        id: { in: foodItemIds }
      },
      select: {
        id: true,
        name: true,
      }
    });

    // Create a map for quick lookup
    const foodItemMap = new Map(foodItems.map(item => [item.id, item.name]));

    // Build contributors array with food names
    const contributorsArray = foodContributions.map((fc) => ({
      foodItemId: fc.foodItemId,
      foodName: foodItemMap.get(fc.foodItemId) || 'Unknown Food',
      sodium: safeNumber(fc._sum.sodium),
      sugar: safeNumber(fc._sum.sugar),
      calories: safeNumber(fc._sum.calories),
    }));

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
    let daysWithLogs = dailyData.length;

    for (const day of dailyData) {
      totalCalorieDiff += Math.abs(day.calories - target.dailyCalories) / target.dailyCalories;
      totalProteinDiff += Math.abs(day.protein - targetProtein) / targetProtein;
      totalCarbsDiff += Math.abs(day.carbs - targetCarbs) / targetCarbs;
      totalFatsDiff += Math.abs(day.fats - targetFats) / targetFats;
    }

    const adherenceScore = daysWithLogs > 0 ? Math.round(
      (1 - (totalCalorieDiff + totalProteinDiff + totalCarbsDiff + totalFatsDiff) / (4 * daysWithLogs)) * 100
    ) : 0;

    // Calculate top contributors (top 3 for each category)
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
    const todayData = dailyData.find(d => d.date === today) || {
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
        targetFats,
        isDefault: !userTarget
      },
      today: todayData,
      dailyData,
      avgDaily,
      adherenceScore: Math.max(0, Math.min(100, adherenceScore)),
      topContributors,
      daysWithLogs,
      exerciseCalories,
      exerciseBudget
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
