/**
 * CalorieSnap AI Analysis Service
 *
 * Shared execution, quota enforcement, JSON parsing, token accounting,
 * and typed error mapping for web and mobile CalorieSnap routes.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { AiProviderError, toSafeUserError } from './errors';
import { executeCompletionWithFallback, executeVisionWithFallback } from './executor';
import type { AiImageInput } from './providers';
import { countTokens } from './tokenCounter';
import {
    ensurePeriodUsageReset,
    extractAiJsonObject,
    incrementUsage,
    isByokActive,
    withDailyFeatureQuota,
} from './usage';

const IMAGE_TOKEN_ESTIMATE = 512;

export interface CalorieSnapItem {
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface CalorieSnapResult {
    mealName: string;
    items: CalorieSnapItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    confidence: 'high' | 'medium' | 'low';
    remaining: number;
    limit: number;
}

export class CalorieSnapLimitError extends AiProviderError {
    readonly limit: number;

    constructor(dailyLimit: number) {
        super({
            code: 'USER_LIMIT_REACHED',
            httpStatus: 429,
            userMessage: `Daily CalorieSnap limit reached (${dailyLimit} scans/day for your tier). Upgrade your plan or try again tomorrow.`,
            retryable: false,
            shouldFallback: false,
        });
        this.name = 'CalorieSnapLimitError';
        Object.setPrototypeOf(this, CalorieSnapLimitError.prototype);
        this.limit = dailyLimit;
    }
}

export function buildCalorieSnapPrompt(hasImage: boolean, caption?: string | null): string {
    const basePrompt = `You are a nutrition analysis AI. Analyze this food ${hasImage ? 'image' : 'description'} and identify every individual food component ${hasImage ? 'visible' : 'mentioned'}.

INSTRUCTIONS:
- Identify each distinct food item/ingredient
- Estimate the weight in grams for each component
- Calculate nutrition values (calories, protein, carbs, fats) for each component based on the estimated weight
- Use standard USDA nutritional data as reference
${hasImage ? '- If a caption is provided by the user, use it to improve your analysis (e.g., knowing specific ingredients, portion sizes, or preparation methods)\n' : ''}- Be as accurate as possible with portion estimation

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "mealName": "Short descriptive name for the overall meal",
  "items": [
    {
      "name": "Component name",
      "estimatedGrams": 150,
      "calories": 200,
      "protein": 25,
      "carbs": 0,
      "fats": 8
    }
  ],
  "totalCalories": 200,
  "totalProtein": 25,
  "totalCarbs": 0,
  "totalFats": 8,
  "confidence": "high"
}

Confidence should be "high", "medium", or "low" based on ${hasImage ? 'image clarity' : 'description detail'} and how identifiable the food is.`;

    const trimmedCaption = caption?.trim();
    if (!trimmedCaption) {
        return basePrompt;
    }

    return `${basePrompt}\n\nUSER ${hasImage ? 'CAPTION' : 'DESCRIPTION'}: "${trimmedCaption}"`;
}

export function parseCalorieSnapJson(rawText: string): {
    mealName?: unknown;
    items?: unknown[];
    confidence?: unknown;
} {
    try {
        return extractAiJsonObject<{
            mealName?: unknown;
            items?: unknown[];
            confidence?: unknown;
        }>(rawText);
    } catch {
        throw new AiProviderError({
            code: 'INVALID_RESPONSE',
            httpStatus: 422,
            userMessage: 'AI returned an unexpected format. Please try again.',
            retryable: true,
            shouldFallback: false,
            internalMessage: 'Could not extract JSON from CalorieSnap AI response',
        });
    }
}

export async function analyzeFoodWithCalorieSnap(params: {
    userId: string;
    image?: AiImageInput;
    caption?: string | null;
    logPrefix?: string;
}): Promise<CalorieSnapResult> {
    const { userId, image, caption, logPrefix = '[Food Scanner]' } = params;

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

    if (userTier === 'none' && (!isByok || !userSettings.customApiKey?.trim())) {
        throw new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 403,
            userMessage: 'No AI access tier assigned and no personal API key configured. Add your API key in AI Settings.',
        });
    }

    const isManagedTier = userTier === 'tier1' || userTier === 'tier2' || userTier === 'tier3';
    let currentScans = 0;
    if (isManagedTier) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const lastResetDay = userSettings.lastUsageReset
            ? new Date(userSettings.lastUsageReset).toDateString()
            : '';
        currentScans =
            lastResetDay === startOfToday.toDateString()
                ? (userSettings.calorieSnapsUsedToday || 0)
                : 0;
    }

    return withDailyFeatureQuota({
        userId,
        feature: 'calorieSnap',
        userTier: isManagedTier ? userTier : 'none',
        isByok,
        globalSettings,
        currentCountFromSnapshot: isManagedTier ? currentScans : undefined,
        onLimitReached: (limit) => {
            throw new CalorieSnapLimitError(limit);
        },
        fn: async ({ dailyLimit }) => {
            const fullPrompt = buildCalorieSnapPrompt(Boolean(image), caption);

            logger.info(`${logPrefix} Initiating AI analysis`, {
                userId,
                hasCaption: Boolean(caption?.trim()),
                hasImage: Boolean(image),
                imageLength: image?.base64Data.length || 0,
                mimeType: image?.mimeType,
                promptLength: fullPrompt.length,
            });

            const execution = image
                ? await executeVisionWithFallback(userId, 'calorieSnap', fullPrompt, image, {
                      maxTokens: 4096,
                      temperature: 0.3,
                  })
                : await executeCompletionWithFallback(
                      userId,
                      'calorieSnap',
                      [{ role: 'user', content: fullPrompt }],
                      {
                          maxTokens: 4096,
                          temperature: 0.3,
                      }
                  );

            logger.info(`${logPrefix} AI request successful`, {
                model: execution.targetUsed.model,
                providerId: execution.targetUsed.providerId,
                providerSlug: execution.targetUsed.providerSlug,
                attempts: execution.attempts,
                userId,
            });

            const parsed = parseCalorieSnapJson(execution.text);
            if (!parsed || !Array.isArray(parsed.items)) {
                throw new AiProviderError({
                    code: 'INVALID_RESPONSE',
                    httpStatus: 422,
                    userMessage: 'AI returned an unexpected format. Please try again.',
                    retryable: true,
                    providerId: execution.targetUsed.providerId,
                    providerSlug: execution.targetUsed.providerSlug,
                    model: execution.targetUsed.model,
                });
            }

            const sanitizedItems: CalorieSnapItem[] = parsed.items.map((item: unknown) => {
                const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
                return {
                    name: String(record.name || 'Unknown'),
                    estimatedGrams: Math.round(Number(record.estimatedGrams) || 0),
                    calories: Math.round(Number(record.calories) || 0),
                    protein: Math.round((Number(record.protein) || 0) * 10) / 10,
                    carbs: Math.round((Number(record.carbs) || 0) * 10) / 10,
                    fats: Math.round((Number(record.fats) || 0) * 10) / 10,
                };
            });

            const inputTokens =
                countTokens(fullPrompt, execution.targetUsed.model) + (image ? IMAGE_TOKEN_ESTIMATE : 0);
            const outputTokens = countTokens(execution.text, execution.targetUsed.model);

            try {
                await incrementUsage(
                    userId,
                    { inputTokens, outputTokens },
                    execution.targetUsed.providerId,
                    {
                        skipMessageIncrement: true,
                        model: execution.targetUsed.model,
                    }
                );
            } catch (usageErr) {
                logger.warn(`${logPrefix} Failed to record token usage`, {
                    userId,
                    error: usageErr instanceof Error ? usageErr.message : String(usageErr),
                });
            }

            const newScansUsed = currentScans + 1;
            const remaining = isManagedTier ? Math.max(0, dailyLimit - newScansUsed) : -1;
            const confidence =
                parsed.confidence === 'high' || parsed.confidence === 'low' ? parsed.confidence : 'medium';

            const result: CalorieSnapResult = {
                mealName:
                    typeof parsed.mealName === 'string' && parsed.mealName.trim()
                        ? parsed.mealName
                        : 'Scanned Meal',
                items: sanitizedItems,
                totalCalories: sanitizedItems.reduce((sum, i) => sum + i.calories, 0),
                totalProtein: Math.round(sanitizedItems.reduce((sum, i) => sum + i.protein, 0) * 10) / 10,
                totalCarbs: Math.round(sanitizedItems.reduce((sum, i) => sum + i.carbs, 0) * 10) / 10,
                totalFats: Math.round(sanitizedItems.reduce((sum, i) => sum + i.fats, 0) * 10) / 10,
                confidence,
                remaining,
                limit: dailyLimit,
            };

            logger.info(`${logPrefix} Analysis complete`, {
                userId,
                itemCount: result.items.length,
                totalCalories: result.totalCalories,
                confidence: result.confidence,
                scansUsedToday: isManagedTier ? newScansUsed : undefined,
                remaining: result.remaining,
            });

            return result;
        },
    });
}

export function calorieSnapErrorResponse(
    error: unknown,
    logPrefix: string,
    headers?: HeadersInit
): NextResponse {
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
            ...(error instanceof CalorieSnapLimitError
                ? { limitReached: true, remaining: 0, limit: error.limit }
                : {}),
        },
        {
            status: safe.httpStatus,
            ...(headers ? { headers } : {}),
        }
    );
}
