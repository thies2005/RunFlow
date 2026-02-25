import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageBase64, caption, userId } = body;

        if ((!imageBase64 && !caption?.trim()) || !userId) {
            return NextResponse.json(
                { error: 'Image or description and userId are required' },
                { status: 400 }
            );
        }

        // ============================================
        // CalorieSnap Usage Limit Enforcement
        // ============================================
        const userSettings = await prisma.userAiSettings.findUnique({
            where: { userId },
        });

        if (!userSettings?.adminAllowed || !userSettings?.aiEnabled) {
            return NextResponse.json(
                { error: 'AI features are not enabled for your account.' },
                { status: 403 }
            );
        }

        // Get global tier limits
        const globalSettings = await prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
        });

        // Determine the CalorieSnap daily limit based on user's tier
        const tierLimits: Record<string, number> = {
            tier1: globalSettings?.tier1CalorieSnapLimit ?? 1,
            tier2: globalSettings?.tier2CalorieSnapLimit ?? 3,
            tier3: globalSettings?.tier3CalorieSnapLimit ?? 6,
            none: 0, // BYOK users: unlimited (they use their own key)
        };

        const userTier = userSettings?.usageTier || 'tier1';
        const dailyLimit = tierLimits[userTier];

        // Reset counter if it's a new day
        const now = new Date();
        const lastReset = userSettings?.lastUsageReset ? new Date(userSettings.lastUsageReset) : new Date(0);
        const isNewDay = now.toDateString() !== lastReset.toDateString();

        let currentScans = userSettings?.calorieSnapsUsedToday || 0;
        if (isNewDay && userSettings) {
            // Reset daily counters
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

        // Enforce limit (skip for BYOK users who have unlimited)
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

        // Find a Google-type AI provider for Gemini
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

        const rawDecryptedKey = decryptToken(googleProvider.apiKey);
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

        // Build the prompt dynamically based on input type
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

        // Determine the MIME type from base64 header or default to jpeg
        let mimeType = 'image/jpeg';
        let cleanBase64 = imageBase64;

        if (imageBase64 && imageBase64.startsWith('data:')) {
            const match = imageBase64.match(/^data:(image\/\w+);base64,/);
            if (match) {
                mimeType = match[1];
                cleanBase64 = imageBase64.split(',')[1];
            }
        }

        // Get the configured CalorieSnap model from DB (fallback to gemini-1.5-flash)
        const model = globalSettings?.calorieSnapModel || 'gemini-1.5-flash';
        logger.info('[Food Scanner] Initiating AI analysis', {
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
            const url = `${googleProvider.baseUrl}/v1beta/models/${model}:generateContent?key=${currentKey}`;

            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        temperature: 0.3, // Low temp for more consistent JSON
                    },
                }),
            });

            if (response.ok) {
                break;
            }

            if (response.status === 429 && i < apiKeys.length - 1) {
                logger.warn('[Food Scanner] Rate limit hit (429), retrying with next API key', { model, keyIndex: i, totalKeys: apiKeys.length });
                continue;
            }

            break; // Other error, or last key
        }

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : 'Network error';
            const status = response ? response.status : 502;

            logger.error('[Food Scanner] Gemini API request failed', {
                status,
                model,
                userId,
                errorText,
                requestPayloadTokens: fullPrompt.length // estimate
            });

            return NextResponse.json(
                { error: `AI analysis failed (${status}). Please try again.` },
                { status: 502 }
            );
        }

        logger.info('[Food Scanner] Gemini API request successful', {
            status: response.status,
            model,
            userId
        });

        const data = await response.json();

        // Extract text from Gemini response
        const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textContent) {
            logger.error('[Food Scanner] No text in Gemini response', { data: JSON.stringify(data).substring(0, 500) });
            return NextResponse.json(
                { error: 'AI could not analyze the image. Please try a clearer photo.' },
                { status: 422 }
            );
        }

        let parsed;
        try {
            // Try direct parse first
            parsed = JSON.parse(textContent);
            logger.debug('[Food Scanner] Successfully parsed raw JSON response');
        } catch {
            logger.warn('[Food Scanner] Direct JSON parse failed, attempting regex extraction', {
                rawResponsePreview: textContent.substring(0, 150)
            });
            // Try extracting JSON from markdown code block
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                // Try finding the first { to last }
                const start = textContent.indexOf('{');
                const end = textContent.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    parsed = JSON.parse(textContent.substring(start, end + 1));
                    logger.debug('[Food Scanner] Successfully extracted JSON using bracket indices');
                } else {
                    logger.error('[Food Scanner] Failed to extract any JSON from response', {
                        responseLength: textContent.length,
                        userId
                    });
                    throw new Error('Could not extract JSON from AI response');
                }
            }
        }

        // Validate the structure
        if (!parsed.items || !Array.isArray(parsed.items)) {
            return NextResponse.json(
                { error: 'AI returned an unexpected format. Please try again.' },
                { status: 422 }
            );
        }

        // Sanitize numbers
        const sanitizedItems = parsed.items.map((item: any) => ({
            name: String(item.name || 'Unknown'),
            estimatedGrams: Math.round(Number(item.estimatedGrams) || 0),
            calories: Math.round(Number(item.calories) || 0),
            protein: Math.round(Number(item.protein) * 10) / 10 || 0,
            carbs: Math.round(Number(item.carbs) * 10) / 10 || 0,
            fats: Math.round(Number(item.fats) * 10) / 10 || 0,
        }));

        // ============================================
        // Increment CalorieSnap usage counter
        // ============================================
        const newScansUsed = currentScans + 1;
        await prisma.userAiSettings.update({
            where: { userId },
            data: { calorieSnapsUsedToday: newScansUsed },
        });

        const remaining = userTier !== 'none' && dailyLimit !== undefined
            ? Math.max(0, dailyLimit - newScansUsed)
            : -1; // -1 = unlimited

        const result = {
            mealName: parsed.mealName || 'Scanned Meal',
            items: sanitizedItems,
            totalCalories: sanitizedItems.reduce((sum: number, i: any) => sum + i.calories, 0),
            totalProtein: sanitizedItems.reduce((sum: number, i: any) => sum + i.protein, 0),
            totalCarbs: sanitizedItems.reduce((sum: number, i: any) => sum + i.carbs, 0),
            totalFats: sanitizedItems.reduce((sum: number, i: any) => sum + i.fats, 0),
            confidence: parsed.confidence || 'medium',
            remaining, // remaining scans today
            limit: dailyLimit, // daily limit for this tier
        };

        logger.info('[Food Scanner] Analysis complete', {
            userId,
            itemCount: result.items.length,
            totalCalories: result.totalCalories,
            confidence: result.confidence,
            scansUsedToday: newScansUsed,
            remaining,
        });

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Food Scanner] Unexpected error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: 'Failed to analyze food image. Please try again.' },
            { status: 500 }
        );
    }
}
