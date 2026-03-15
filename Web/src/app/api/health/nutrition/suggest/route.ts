import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

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
        const googleProvider = await prisma.aiProvider.findFirst({
            where: { type: 'google', isActive: true },
        });

        if (!googleProvider) {
            return NextResponse.json(
                { error: 'No Google AI provider configured. Please set up a Google/Gemini provider in admin settings.' },
                { status: 503 }
            );
        }

        const rawDecryptedKey = decryptToken(googleProvider.apiKey);
        if (!rawDecryptedKey) {
            return NextResponse.json({ error: 'Failed to decrypt Google AI provider API key' }, { status: 500 });
        }

        const apiKeys = rawDecryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
        if (apiKeys.length === 0) {
            return NextResponse.json({ error: 'No valid API keys found' }, { status: 500 });
        }

        const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
        const model = globalSettings?.calorieSnapModel || 'gemini-1.5-flash';

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

        let response: Response | undefined;
        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            const url = `${googleProvider.baseUrl}/v1beta/models/${model}:generateContent?key=${currentKey}`;

            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                    },
                }),
            });

            if (response.ok) break;

            if (response.status === 429 && i < apiKeys.length - 1) {
                logger.warn('[AI Meal Suggester] Rate limit hit (429), retrying with next API key', { model, keyIndex: i, totalKeys: apiKeys.length });
                continue;
            }

            break; // Other error, or last key
        }

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'Network error';
            logger.error('[AI Meal Suggester] Gemini API request failed', {
                status: response?.status,
                model,
                userId,
                errorText: errorText.substring(0, 300),
            });
            return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 502 });
        }

        const data = await response.json();
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
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

        return NextResponse.json(parsed);

    } catch (error) {
        logger.error('[AI Meal Suggester] Unexpected error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to generate suggestion.' }, { status: 500 });
    }
}
