import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { safeFetch, tryDecryptAiKey } from '@/lib/ai/providers';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { detectImageMime } from '@/lib/utils/imageMagic';

export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);
        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        const authUser = await getAuthenticatedUser(request);
        if (!authUser) {
            return errorResponses.unauthorized();
        }

        const userId = authUser.id;

        const formData = await request.formData();
        const imageFile = formData.get('image') as File | null;
        const caption = formData.get('caption') as string | null;

        if (!imageFile && !caption?.trim()) {
            return NextResponse.json(
                { error: 'Image or description is required' },
                { status: 400 }
            );
        }

        let imageBase64: string | undefined;
        if (imageFile) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());

            const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
            if (buffer.length > MAX_IMAGE_BYTES) {
                return NextResponse.json(
                    { error: 'Image too large (max 10MB)' },
                    { status: 413 }
                );
            }

            // Derive the MIME type from the magic bytes rather than trusting the
            // client-supplied imageFile.type, which can be spoofed.
            const detectedMime = detectImageMime(buffer);
            if (!detectedMime) {
                return NextResponse.json(
                    { error: 'Invalid image format' },
                    { status: 415 }
                );
            }

            imageBase64 = `data:${detectedMime};base64,${buffer.toString('base64')}`;
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

        const globalSettings = await prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
        });

        const tierLimits: Record<string, number> = {
            tier1: globalSettings?.tier1CalorieSnapLimit ?? 1,
            tier2: globalSettings?.tier2CalorieSnapLimit ?? 3,
            tier3: globalSettings?.tier3CalorieSnapLimit ?? 6,
            none: 0,
        };

        const userTier = userSettings?.usageTier || 'tier1';
        const dailyLimit = tierLimits[userTier];

        const now = new Date();
        const lastReset = userSettings?.lastUsageReset ? new Date(userSettings.lastUsageReset) : new Date(0);
        const isNewDay = now.toDateString() !== lastReset.toDateString();

        let currentScans = userSettings?.calorieSnapsUsedToday || 0;
        if (isNewDay && userSettings) {
            await prisma.userAiSettings.update({
                where: { userId },
                data: {
                    calorieSnapsUsedToday: 0,
                    messagesUsedToday: 0,
                    inputTokensUsedToday: 0,
                    outputTokensUsedToday: 0,
                    lastUsageReset: now,
                },
            });
            currentScans = 0;
        }

        if (userTier !== 'none' && dailyLimit !== undefined && currentScans >= dailyLimit) {
            return NextResponse.json(
                {
                    error: `Daily CalorieSnap limit reached (${dailyLimit} scans/day for your tier). Upgrade your plan or try again tomorrow.`,
                    limitReached: true,
                    remaining: 0,
                    limit: dailyLimit,
                },
                { status: 429 }
            );
        }

        const googleProvider = await prisma.aiProvider.findFirst({
            where: {
                type: 'google',
                isActive: true,
            },
        });

        if (!googleProvider) {
            return NextResponse.json(
                { error: 'No Google AI provider configured. Please set up a Google/Gemini provider in admin settings.' },
                { status: 503 }
            );
        }

        const rawDecryptedKey = tryDecryptAiKey(googleProvider.apiKey, 'googleProvider', googleProvider.id);
        if (!rawDecryptedKey) {
            return NextResponse.json(
                { error: 'Failed to decrypt Google AI provider API key' },
                { status: 500 }
            );
        }

        const apiKeys = rawDecryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
        if (apiKeys.length === 0) {
            return NextResponse.json(
                { error: 'No valid API keys found for Google AI provider' },
                { status: 500 }
            );
        }

        const basePrompt = `You are a nutrition analysis AI. Analyze this food ${imageBase64 ? 'image' : 'description'} and identify every individual food component ${imageBase64 ? 'visible' : 'mentioned'}.

INSTRUCTIONS:
- Identify each distinct food item/ingredient
- Estimate the weight in grams for each component
- Calculate nutrition values (calories, protein, carbs, fats) for each component based on the estimated weight
- Use standard USDA nutritional data as reference
${imageBase64 ? '- If a caption is provided by the user, use it to improve your analysis (e.g., knowing specific ingredients, portion sizes, or preparation methods)\n' : ''}- Be as accurate as possible with portion estimation

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

Confidence should be "high", "medium", or "low" based on ${imageBase64 ? 'image clarity' : 'description detail'} and how identifiable the food is.`;

        let fullPrompt = basePrompt;
        if (caption?.trim()) {
            fullPrompt += `\n\nUSER ${imageBase64 ? 'CAPTION' : 'DESCRIPTION'}: "${caption.trim()}"`;
        }

        let mimeType = 'image/jpeg';
        let cleanBase64 = imageBase64;

        if (imageBase64 && imageBase64.startsWith('data:')) {
            const match = imageBase64.match(/^data:(image\/\w+);base64,/);
            if (match) {
                mimeType = match[1];
                cleanBase64 = imageBase64.split(',')[1];
            }
        }

        const model = globalSettings?.calorieSnapModel || 'gemini-1.5-flash';
        logger.info('[Mobile Food Scanner] Initiating AI analysis', {
            model,
            userId,
            hasCaption: !!caption,
            hasImage: !!imageBase64,
            imageLength: imageBase64?.length || 0,
            mimeType,
            promptLength: fullPrompt.length
        });

        let response: Response | undefined;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            const url = `${googleProvider.baseUrl}/v1beta/models/${model}:generateContent`;

            response = await safeFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': currentKey,
                },
                allowedUrls: [googleProvider.baseUrl],
                body: JSON.stringify({
                    contents: [{
                        parts: imageBase64 ? [
                            { text: fullPrompt },
                            {
                                inlineData: {
                                    mimeType,
                                    data: cleanBase64,
                                },
                            },
                        ] : [
                            { text: fullPrompt }
                        ],
                    }],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.3,
                    },
                }),
            });

            if (response.ok) {
                break;
            }

            if (response.status === 429 && i < apiKeys.length - 1) {
                logger.warn('[Mobile Food Scanner] Rate limit hit (429), retrying with next API key', { model, keyIndex: i, totalKeys: apiKeys.length });
                continue;
            }

            break;
        }

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'Network error';
            const status = response ? response.status : 502;

            logger.error('[Mobile Food Scanner] Gemini API request failed', {
                status,
                model,
                userId,
                errorText,
            });

            return NextResponse.json(
                { error: `AI analysis failed (${status}). Please try again.` },
                { status: 502 }
            );
        }

        logger.info('[Mobile Food Scanner] Gemini API request successful', {
            status: response.status,
            model,
            userId
        });

        const data = await response.json();

        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            logger.error('[Mobile Food Scanner] No text in Gemini response', { data: JSON.stringify(data).substring(0, 500) });
            return NextResponse.json(
                { error: 'AI could not analyze the image. Please try a clearer photo.' },
                { status: 422 }
            );
        }

        let parsed;
        try {
            parsed = JSON.parse(textContent);
            logger.debug('[Mobile Food Scanner] Successfully parsed raw JSON response');
        } catch {
            logger.warn('[Mobile Food Scanner] Direct JSON parse failed, attempting regex extraction', {
                rawResponsePreview: textContent.substring(0, 150)
            });
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                const start = textContent.indexOf('{');
                const end = textContent.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    parsed = JSON.parse(textContent.substring(start, end + 1));
                    logger.debug('[Mobile Food Scanner] Successfully extracted JSON using bracket indices');
                } else {
                    logger.error('[Mobile Food Scanner] Failed to extract any JSON from response', {
                        responseLength: textContent.length,
                        userId
                    });
                    throw new Error('Could not extract JSON from AI response');
                }
            }
        }

        if (!parsed.items || !Array.isArray(parsed.items)) {
            return NextResponse.json(
                { error: 'AI returned an unexpected format. Please try again.' },
                { status: 422 }
            );
        }

        const sanitizedItems = parsed.items.map((item: any) => ({
            name: String(item.name || 'Unknown'),
            estimatedGrams: Math.round(Number(item.estimatedGrams) || 0),
            calories: Math.round(Number(item.calories) || 0),
            protein: Math.round(Number(item.protein) * 10) / 10 || 0,
            carbs: Math.round(Number(item.carbs) * 10) / 10 || 0,
            fats: Math.round(Number(item.fats) * 10) / 10 || 0,
        }));

        const newScansUsed = currentScans + 1;
        await prisma.userAiSettings.update({
            where: { userId },
            data: { calorieSnapsUsedToday: newScansUsed },
        });

        const remaining = userTier !== 'none' && dailyLimit !== undefined
            ? Math.max(0, dailyLimit - newScansUsed)
            : -1;

        const result = {
            mealName: parsed.mealName || 'Scanned Meal',
            items: sanitizedItems,
            totalCalories: sanitizedItems.reduce((sum: number, i: any) => sum + i.calories, 0),
            totalProtein: sanitizedItems.reduce((sum: number, i: any) => sum + i.protein, 0),
            totalCarbs: sanitizedItems.reduce((sum: number, i: any) => sum + i.carbs, 0),
            totalFats: sanitizedItems.reduce((sum: number, i: any) => sum + i.fats, 0),
            confidence: parsed.confidence || 'medium',
            remaining,
            limit: dailyLimit,
        };

        logger.info('[Mobile Food Scanner] Analysis complete', {
            userId,
            itemCount: result.items.length,
            totalCalories: result.totalCalories,
            confidence: result.confidence,
            scansUsedToday: newScansUsed,
            remaining,
        });

        return NextResponse.json(result, { headers: rateLimitHeaders(rateLimitResult) });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/health/nutrition/ai-scan' });
    }
}
