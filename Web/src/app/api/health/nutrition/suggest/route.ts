import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { getAiConfig, generateCompletion } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/providers';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        const { remainingCalories, remainingProtein, remainingCarbs, remainingFats } = body;

        if (remainingCalories === undefined) {
            return NextResponse.json({ error: 'Missing remaining macro data' }, { status: 400 });
        }

        const userSettings = await prisma.userAiSettings.findUnique({
            where: { userId },
        });

        if (!userSettings?.adminAllowed || !userSettings?.aiEnabled) {
            return NextResponse.json(
                { error: 'AI features are not enabled for your account.' },
                { status: 403 }
            );
        }

        const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        const userTier = userSettings.usageTier || 'none';

        if (userTier === 'none' && !userSettings.customApiKey) {
            return NextResponse.json(
                { error: 'Please set up an API key or upgrade your tier to use this feature.' },
                { status: 403 }
            );
        }

        // Daily limit check
        if (userTier !== 'none') {
            const userLevelLimits = {
                tier1: globalSettings?.tier1MealSuggestLimit ?? 1,
                tier2: globalSettings?.tier2MealSuggestLimit ?? 3,
                tier3: globalSettings?.tier3MealSuggestLimit ?? 6,
            };
            const dailyLimit = userLevelLimits[userTier as keyof typeof userLevelLimits] || userLevelLimits.tier1;
            
            // Check if counter needs reset for today
            const now = new Date();
            const lastReset = new Date(userSettings.lastUsageReset);
            let usedToday = userSettings.mealSuggestsUsedToday;
            
            if (now.toDateString() !== lastReset.toDateString()) {
                usedToday = 0;
            }

            if (usedToday >= dailyLimit) {
                return NextResponse.json(
                    { error: `Daily limit of ${dailyLimit} meal suggestions reached for your tier.` },
                    { status: 429 }
                );
            }
        }

        // Fetch User's Saved Meals (Recipes)
        const savedMeals = await prisma.savedMeal.findMany({
            where: { userId },
            include: { items: true },
            take: 20, // Limit to recent/top 20 for context size
        });

        // Fetch Frequent Foods
        const frequentGroup = await prisma.nutritionLog.groupBy({
            by: ['foodItemId'],
            where: { userId },
            _count: { foodItemId: true },
            orderBy: { _count: { foodItemId: 'desc' } },
            take: 15
        });

        let frequentFoodsText = '';
        if (frequentGroup.length > 0) {
            const frequentFoodIds = frequentGroup.map(g => g.foodItemId);
            const frequentItems = await prisma.foodItem.findMany({
                where: { id: { in: frequentFoodIds } }
            });
            frequentFoodsText = frequentItems.map(item => 
                `- ${item.name} (${Math.round(item.calories)} kcal, ${item.protein}P/${item.carbs}C/${item.fats}F per ${item.servingSize || 'serving'})`
            ).join('\n');
        }

        const savedMealsText = savedMeals.map(meal => 
            `- "${meal.name}" (${Math.round(meal.totalCalories)} kcal, ${meal.totalProtein}P/${meal.totalCarbs}C/${meal.totalFats}F)`
        ).join('\n');

        // Check for Google AI Provider
        const fallbackConfig = await getAiConfig(userId);

        if (!fallbackConfig) {
            return NextResponse.json(
                { error: 'No AI provider configured. Please set up a provider in admin settings or your user profile.' },
                { status: 503 }
            );
        }

        const model = globalSettings?.mealSuggestModel || fallbackConfig.model;
        const providerConfig = { ...fallbackConfig, model };

        const prompt = `You are an expert nutrition AI. The user is asking "What should I eat?" based on their remaining daily macros.

USER'S REMAINING MACROS FOR TODAY:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein}g
- Carbs: ${remainingCarbs}g
- Fats: ${remainingFats}g

USER'S SAVED MEALS (RECIPES):
${savedMealsText || '(None saved yet)'}

USER'S FREQUENTLY EATEN FOODS:
${frequentFoodsText || '(None logged yet)'}

INSTRUCTIONS:
Suggest exactly ONE meal or snack that perfectly fits the remaining macros (or gets as close as possible without going over calories too much).
Prioritize suggesting one of their "Saved Meals". If none fit, try combining some of their "Frequently Eaten Foods".
If neither works, suggest a common healthy meal and specify the ingredients.

Return ONLY a valid JSON object in this exact format, with no markdown formatting around it:
{
  "suggestionName": "Name of the suggested meal",
  "reasoning": "A short, encouraging 2-sentence explanation of why this fits their remaining macros perfectly.",
  "items": [
    {
      "name": "Food item name",
      "calories": 250,
      "protein": 20,
      "carbs": 15,
      "fats": 10,
      "servingSize": "100g"
    }
  ],
  "totalCalories": 250,
  "totalProtein": 20,
  "totalCarbs": 15,
  "totalFats": 10
}`;

        const messages: ChatMessage[] = [
            { role: 'user', content: prompt }
        ];

        let textContent: string = '';
        try {
            textContent = await generateCompletion(providerConfig, messages);
        } catch (error) {
            logger.error('[AI Meal Suggester] Provider API request failed', {
                error: error instanceof Error ? error.message : String(error),
                model,
                userId,
            });
            return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 502 });
        }

        if (!textContent) {
            return NextResponse.json({ error: 'No valid response from AI.' }, { status: 422 });
        }

        let parsed;
        try {
            parsed = JSON.parse(textContent);
        } catch {
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                const start = textContent.indexOf('{');
                const end = textContent.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    parsed = JSON.parse(textContent.substring(start, end + 1));
                } else {
                    throw new Error('Could not extract JSON');
                }
            }
        }

        // Increment Counter
        if (userTier !== 'none') {
            const now = new Date();
            const lastReset = new Date(userSettings.lastUsageReset);
            let usedToday = userSettings.mealSuggestsUsedToday;
            
            if (now.toDateString() !== lastReset.toDateString()) {
                usedToday = 0;
            }
            
            await prisma.userAiSettings.update({
                where: { userId },
                data: {
                    mealSuggestsUsedToday: usedToday + 1,
                    lastUsageReset: now
                }
            });
        }

        return NextResponse.json(parsed);

    } catch (error) {
        logger.error('[AI Meal Suggester] Unexpected error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to generate suggestion.' }, { status: 500 });
    }
}
