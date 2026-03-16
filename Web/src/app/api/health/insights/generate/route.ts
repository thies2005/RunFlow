import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { subDays, format } from 'date-fns';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
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

        let insightContent = '';

        // Call Custom API Provider
        const providerName = target.aiInsightProvider?.toLowerCase() || 'gemini';
        let customKeyDecrypted = target.aiInsightApiKey ? decryptToken(target.aiInsightApiKey) : null;
        if (!customKeyDecrypted && target.aiInsightApiKey) {
           customKeyDecrypted = target.aiInsightApiKey; // Fallback if plain text for some reason
        }

        if (providerName === 'openai') {
            const apiKey = customKeyDecrypted;
            if (!apiKey) return NextResponse.json({ error: 'OpenAI API key missing in settings.' }, { status: 400 });
            
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5
                })
            });
            
            if (!res.ok) throw new Error('OpenAI API request failed: ' + await res.text());
            const data = await res.json();
            insightContent = data.choices?.[0]?.message?.content || '';

        } else if (providerName === 'anthropic') {
            const apiKey = customKeyDecrypted;
            if (!apiKey) return NextResponse.json({ error: 'Anthropic API key missing in settings.' }, { status: 400 });

            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 500,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5
                })
            });
            
            if (!res.ok) throw new Error('Anthropic API request failed: ' + await res.text());
            const data = await res.json();
            insightContent = data.content?.[0]?.text || '';
            
        } else if (providerName === 'deepseek') {
            const apiKey = customKeyDecrypted;
            if (!apiKey) return NextResponse.json({ error: 'DeepSeek API key missing in settings.' }, { status: 400 });

            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5
                })
            });
            
            if (!res.ok) throw new Error('DeepSeek API request failed: ' + await res.text());
            const data = await res.json();
            insightContent = data.choices?.[0]?.message?.content || '';

        } else {
            // Default to Gemini (using app-wide provider setting)
            const googleProvider = await prisma.aiProvider.findFirst({ where: { type: 'google', isActive: true } });
            if (!googleProvider) {
                return NextResponse.json({ error: 'No Google AI provider configured globally.' }, { status: 503 });
            }

            const rawDecryptedKey = decryptToken(googleProvider.apiKey);
            const geminiKey = customKeyDecrypted || (rawDecryptedKey ? rawDecryptedKey.split(/[,;\n]+/)[0].trim() : null);
            
            if (!geminiKey) return NextResponse.json({ error: 'Gemini API key missing.' }, { status: 500 });
            
            const globalSettings = await prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } });
            const model = globalSettings?.calorieSnapModel || 'gemini-1.5-flash';

            const url = `${googleProvider.baseUrl}/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.5 },
                }),
            });

            if (!res.ok) throw new Error('Gemini API request failed: ' + await res.text());
            const data = await res.json();
            insightContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

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
