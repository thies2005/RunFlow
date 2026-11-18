/**
 * MealSuggest AI Service
 *
 * Shared execution, quota enforcement, context building, JSON parsing,
 * token accounting, and typed error mapping for web and mobile meal suggestion routes.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { AiProviderError, toSafeUserError } from './errors';
import { executeCompletionWithFallback } from './executor';
import { fenceUntrusted } from './prompts';
import type { ChatMessage } from './providers';
import { countTokens } from './tokenCounter';
import {
    ensurePeriodUsageReset,
    extractAiJsonObject,
    incrementUsage,
    isByokActive,
    withDailyFeatureQuota,
} from './usage';

export interface MealSuggestParams {
    userId: string;
    remainingCalories: number;
    remainingProtein: number;
    remainingCarbs: number;
    remainingFats: number;
    logPrefix?: string;
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
}): string {
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
      "name": "Food item name",
      "servingSize": "100g",
      "calories": 250,
      "protein": 20,
      "carbs": 15,
      "fats": 10
    }
  ],
  "totalCalories": 250,
  "totalProtein": 20,
  "totalCarbs": 15,
  "totalFats": 10
}
${strictJson ? '\nOutput must be JSON only. Do not include reasoning or any extra text.' : ''}`;
}

export async function generateMealSuggestion(
    params: MealSuggestParams
): Promise<Record<string, unknown>> {
    const {
        userId,
        remainingCalories,
        remainingProtein,
        remainingCarbs,
        remainingFats,
        logPrefix = '[AI Meal Suggester]',
    } = params;

    await ensurePeriodUsageReset(userId);

    const [userSettings, globalSettings] = await Promise.all([
        prisma.userAiSettings.findUnique({ where: { userId } }),
        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

    if (!userSettings || !userSettings.adminAllowed) {
        throw new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: 'AI access is not enabled for your account. Contact an administrator.',
        });
    }

    if (!userSettings.aiEnabled) {
        throw new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: 'AI features are currently disabled. Enable them in your AI settings.',
        });
    }

    const userTier = userSettings.usageTier || 'none';
    const isByok = isByokActive(userSettings);

    if (userTier === 'none' && !isByok) {
        throw new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 403,
            userMessage: 'No AI access tier assigned and no personal API key configured. Add your API key in AI Settings.',
        });
    }

    const isManagedTier = userTier === 'tier1' || userTier === 'tier2' || userTier === 'tier3';
    let currentSuggests: number | undefined;
    if (isManagedTier && !isByok) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const lastResetDay = userSettings.lastUsageReset
            ? new Date(userSettings.lastUsageReset).toDateString()
            : '';
        currentSuggests =
            lastResetDay === startOfToday.toDateString()
                ? (userSettings.mealSuggestsUsedToday || 0)
                : 0;
    }

    return withDailyFeatureQuota({
        userId,
        feature: 'mealSuggest',
        userTier: isManagedTier ? userTier : 'none',
        isByok,
        globalSettings,
        currentCountFromSnapshot: currentSuggests,
        onLimitReached: (dailyLimit) => {
            throw new AiProviderError({
                code: 'USER_LIMIT_REACHED',
                httpStatus: 429,
                userMessage: `Daily limit of ${dailyLimit} meal suggestions reached for your tier.`,
            });
        },
        fn: async () => {
            const [savedMeals, frequentGroup] = await Promise.all([
                prisma.savedMeal.findMany({
                    where: { userId },
                    include: { items: true },
                    take: 20,
                }),
                prisma.nutritionLog.groupBy({
                    by: ['foodItemId'],
                    where: { userId },
                    _count: { foodItemId: true },
                    orderBy: { _count: { foodItemId: 'desc' } },
                    take: 15,
                }),
            ]);

            let frequentFoodsText = '';
            if (frequentGroup.length > 0) {
                const frequentFoodIds = frequentGroup.map((g) => g.foodItemId);
                const frequentItems = await prisma.foodItem.findMany({
                    where: { id: { in: frequentFoodIds } },
                });
                frequentFoodsText = frequentItems
                    .map(
                        (item) =>
                            `- ${fenceUntrusted(item.name?.slice(0, 120))} (${Math.round(item.calories)} kcal, ${item.protein}P/${item.carbs}C/${item.fats}F per ${fenceUntrusted(item.servingSize?.slice(0, 120)) || 'serving'})`
                    )
                    .join('\n');
            }

            const savedMealsText = savedMeals
                .map(
                    (meal) =>
                        `- "${fenceUntrusted(meal.name?.slice(0, 120))}" (${Math.round(meal.totalCalories)} kcal, ${meal.totalProtein}P/${meal.totalCarbs}C/${meal.totalFats}F)`
                )
                .join('\n');

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
            const firstExecution = await executeCompletionWithFallback(userId, 'mealSuggest', messages);

            const usageRecords: Array<{
                inputTokens: number;
                outputTokens: number;
                providerId?: string;
                model: string;
            }> = [
                {
                    inputTokens: countTokens(prompt, firstExecution.targetUsed.model),
                    outputTokens: countTokens(firstExecution.text, firstExecution.targetUsed.model),
                    providerId: firstExecution.targetUsed.providerId,
                    model: firstExecution.targetUsed.model,
                },
            ];

            let parsed: Record<string, unknown>;
            try {
                parsed = extractAiJsonObject(firstExecution.text);
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
                const strictSystem = 'Return only valid JSON. No reasoning, no markdown, no extra text.';
                const strictMessages: ChatMessage[] = [
                    { role: 'system', content: strictSystem },
                    { role: 'user', content: strictPrompt },
                ];

                const strictExecution = await executeCompletionWithFallback(
                    userId,
                    'mealSuggest',
                    strictMessages
                );

                usageRecords.push({
                    inputTokens: countTokens(`${strictSystem}\n${strictPrompt}`, strictExecution.targetUsed.model),
                    outputTokens: countTokens(strictExecution.text, strictExecution.targetUsed.model),
                    providerId: strictExecution.targetUsed.providerId,
                    model: strictExecution.targetUsed.model,
                });

                try {
                    parsed = extractAiJsonObject(strictExecution.text);
                } catch (strictErr) {
                    logger.error(`${logPrefix} Invalid JSON response`, {
                        error: strictErr instanceof Error ? strictErr.message : String(strictErr),
                        model: strictExecution.targetUsed.model,
                        userId,
                        preview: firstExecution.text.slice(0, 500),
                    });
                    throw new AiProviderError({
                        code: 'INVALID_RESPONSE',
                        httpStatus: 502,
                        userMessage: 'AI returned an invalid response. Please try again.',
                        retryable: true,
                        providerId: strictExecution.targetUsed.providerId,
                        providerSlug: strictExecution.targetUsed.providerSlug,
                        model: strictExecution.targetUsed.model,
                    });
                }
            }

            for (const rec of usageRecords) {
                try {
                    await incrementUsage(
                        userId,
                        { inputTokens: rec.inputTokens, outputTokens: rec.outputTokens },
                        rec.providerId,
                        {
                            skipMessageIncrement: true,
                            model: rec.model,
                        }
                    );
                } catch (usageErr) {
                    logger.warn(`${logPrefix} Failed to record token usage`, {
                        userId,
                        error: usageErr instanceof Error ? usageErr.message : String(usageErr),
                    });
                }
            }

            return parsed;
        },
    });
}

export function mealSuggestErrorResponse(error: unknown, logPrefix: string): NextResponse {
    const safe = toSafeUserError(error);
    logger.error(`${logPrefix} Request failed`, {
        code: safe.code,
        httpStatus: safe.httpStatus,
        error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
        {
            error: safe.message,
            errorCode: safe.code,
            ...(safe.retryAfterSeconds !== undefined
                ? { retryAfterSeconds: safe.retryAfterSeconds }
                : {}),
        },
        { status: safe.httpStatus }
    );
}
