import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { getAiConfigForModel, generateCompletion } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/providers';
import { getAuthenticatedUser } from '@/lib/mobile/auth';

export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedUser(request);
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;
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

        if (userTier !== 'none') {
            const userLevelLimits = {
                tier1: globalSettings?.tier1MealSuggestLimit ?? 1,
                tier2: globalSettings?.tier2MealSuggestLimit ?? 3,
                tier3: globalSettings?.tier3MealSuggestLimit ?? 6,
            };
            const dailyLimit = userLevelLimits[userTier as keyof typeof userLevelLimits] || userLevelLimits.tier1;

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

        const savedMeals = await prisma.savedMeal.findMany({
            where: { userId },
            include: { items: true },
            take: 20,
        });

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

        const model = (userSettings.customApiKey && userSettings.usageTier === 'none')
            ? (userSettings.customModel || 'gpt-4o-mini')
            : (globalSettings?.mealSuggestModel || 'gemini-1.5-flash');
        const providerConfig = await getAiConfigForModel(userId, model);

        if (!providerConfig) {
            return NextResponse.json(
                { error: 'No AI provider configured that supports the selected model.' },
                { status: 503 }
            );
        }

        const prompt = buildMealPrompt({
            remainingCalories,
            remainingProtein,
            remainingCarbs,
            remainingFats,
            savedMealsText,
            frequentFoodsText,
            strictJson: false,
        });

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

        let textContent = '';
        try {
            textContent = await generateCompletion(providerConfig, messages);
        } catch (error) {
            logger.error('[Mobile AI Meal Suggester] Provider API request failed', {
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
            parsed = JSON.parse(normalizeAiOutput(textContent));
        } catch {
            try {
                parsed = extractJsonObject(normalizeAiOutput(textContent));
            } catch {
                const strictPrompt = buildMealPrompt({
                    remainingCalories,
                    remainingProtein,
                    remainingCarbs,
                    remainingFats,
                    savedMealsText,
                    frequentFoodsText,
                    strictJson: true,
                });
                try {
                    const strictMessages: ChatMessage[] = [
                        {
                            role: 'system',
                            content: 'Return only valid JSON. No reasoning, no markdown, no extra text.'
                        },
                        { role: 'user', content: strictPrompt },
                    ];
                    const strictText = await generateCompletion(providerConfig, strictMessages);
                    parsed = extractJsonObject(normalizeAiOutput(strictText));
                } catch (strictError) {
                    logger.error('[Mobile AI Meal Suggester] Invalid JSON response', {
                        error: strictError instanceof Error ? strictError.message : String(strictError),
                        model,
                        userId,
                        preview: textContent.slice(0, 1000),
                    });
                    return NextResponse.json(
                        { error: 'AI returned an invalid response. Please try again.' },
                        { status: 502 }
                    );
                }
            }
        }

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
        logger.error('[Mobile AI Meal Suggester] Unexpected error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to generate suggestion.' }, { status: 500 });
    }
}

function normalizeAiOutput(text: string) {
    const withoutDetails = text.replace(/<details>[\s\S]*?<\/details>/gi, '').trim();
    return withoutDetails;
}

function buildMealPrompt({
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFats,
    savedMealsText,
    frequentFoodsText,
    strictJson,
}: {
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFats: number;
    savedMealsText: string;
    frequentFoodsText: string;
    strictJson: boolean;
}) {
    return `You are an expert nutrition AI. The user is asking "What should I eat?" based on their remaining daily macros.

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
      "name": "Food name",
      "servingSize": "Serving size as text",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }
  ],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFats": 0
}

${strictJson ? 'STRICT MODE: Output JSON only.' : ''}`;
}

function extractJsonObject(raw: string) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) {
        throw new Error('No JSON object found in response');
    }
    return JSON.parse(raw.slice(start, end + 1));
}
