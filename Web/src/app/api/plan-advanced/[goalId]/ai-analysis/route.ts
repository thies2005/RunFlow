import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { validateBaseUrl, generateCompletion, tryDecryptAiKey, type ChatMessage, type AiConfig } from '@/lib/ai/providers';

async function checkPremium(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    return true;
}

type RouteContext = { params: Promise<{ goalId: string }> };

async function getPlanBuilderConfig(): Promise<{ config: AiConfig; maxTokens: number } | null> {
    const settings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: { activeProvider: true },
    });

    if (!settings?.activeProvider) {
        return null;
    }

    const provider = settings.activeProvider;
    const decryptedKey = tryDecryptAiKey(provider.apiKey, 'activeProvider', provider.id);
    if (!decryptedKey) return null;

    const apiKeys = decryptedKey.split(/[,;\n]+/).map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) return null;

    if (!validateBaseUrl(provider.baseUrl, [provider.baseUrl])) return null;

    return {
        config: {
            provider: provider.type as 'openai' | 'anthropic' | 'google',
            baseUrl: provider.baseUrl,
            apiKey: apiKeys[0],
            apiKeys,
            model: settings.planBuilderModel || 'gpt-4o',
            providerId: provider.id,
        },
        maxTokens: settings.planMaxTokensPerAnalysis || 8000,
    };
}

function buildSystemPrompt(analysisType: string, targetWeekIndex?: number): string {
    const base = `You are an expert running and triathlon coach AI. Analyze the training plan and provide actionable, specific feedback. KEEP IT CONCISE. Use JSON format in your response with these fields: overallScore (number 0-100), overallSummary (string), weekAnalyses (array of objects with weekIndex, score, summary, suggestions), riskFlags (array of objects with flag, severity "low"|"medium"|"high", description), raceReadiness (object with overallScore, enduranceScore, speedScore, recoveryScore, mentalScore), suggestions (array of objects with category, priority "high"|"medium"|"low", title, description). Do not generate overly long text.`;

    switch (analysisType) {
        case 'week':
            return `${base} Focus your analysis specifically on week ${targetWeekIndex || 'the specified week'}. Provide detailed analysis for that week only. Include specific workout adjustments.`;
        case 'risks':
            return `${base} Focus primarily on identifying injury risks, overtraining risks, and recovery concerns. Be specific about which workouts pose risks and how to mitigate them.`;
        case 'readiness':
            return `${base} Focus on race readiness assessment. Evaluate if the athlete will be prepared for race day. Consider taper adequacy, peak timing, and fitness progression.`;
        case 'alternatives':
            return `${base} Provide alternative workout suggestions for key sessions. Focus on variety, injury prevention, and maintaining training stimulus while reducing monotony.`;
        default:
            return `${base} Provide a comprehensive analysis of the entire training plan covering periodization, volume progression, intensity distribution, recovery, and race readiness.`;
    }
}

function buildUserPrompt(goal: Record<string, unknown>, workouts: Array<Record<string, unknown>>, context?: string): string {
    const workoutSummary = workouts.map(w => {
        const date = w.scheduledDate instanceof Date ? w.scheduledDate.toISOString().split('T')[0] : String(w.scheduledDate);
        return `- ${date}: ${w.workoutType} | ${w.targetDistance != null ? `${w.targetDistance}m` : 'no distance'} | ${w.targetDuration != null ? `${w.targetDuration}s` : 'no duration'} | ${w.description || ''}`;
    }).join('\n');

    return `Training Plan: ${goal.name}
Sport: ${goal.sport}
Race Type: ${goal.raceType || 'Not specified'}
Race Date: ${goal.raceDate instanceof Date ? goal.raceDate.toISOString().split('T')[0] : String(goal.raceDate || 'Not set')}
Plan Start: ${goal.planStartDate instanceof Date ? goal.planStartDate.toISOString().split('T')[0] : String(goal.planStartDate || 'Not set')}
Workout Day: ${goal.workoutDay ?? 3}

Workouts:
${workoutSummary}

${context ? `\nAdditional context from user:\n${context}` : ''}

Analyze this plan and respond with valid JSON containing: overallScore, overallSummary, weekAnalyses, riskFlags, raceReadiness, suggestions.`;
}

export async function GET(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const analysis = await prisma.aiPlanAnalysis.findUnique({
            where: { goalId },
        });

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('Get AI analysis error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function getProviderErrorMessage(error: unknown): { message: string; status: number } {
    if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('503')) {
            return {
                message: 'The AI model is temporarily unavailable due to high demand. Please try again in a few minutes.',
                status: 503,
            };
        }
        if (msg.includes('429') || msg.includes('rate limited')) {
            return {
                message: 'AI provider rate limit reached. Please wait a moment before trying again.',
                status: 429,
            };
        }
        if (msg.includes('502')) {
            return {
                message: 'The AI provider is experiencing issues. Please try again shortly.',
                status: 502,
            };
        }
        if (msg.includes('fetch failed') || msg.includes('Failed to connect')) {
            return {
                message: 'Could not reach the AI provider. Please check your network and try again.',
                status: 502,
            };
        }
        if (msg.includes('AI API error')) {
            return {
                message: `AI provider error: ${msg.replace('AI API error: ', '')}`,
                status: 502,
            };
        }
    }
    return {
        message: 'Failed to generate analysis. Please try again.',
        status: 500,
    };
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await checkPremium(session.user.id))) {
            return NextResponse.json({ error: 'Premium feature. Please upgrade your plan.' }, { status: 403 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) },
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const builderConfig = await getPlanBuilderConfig();
        if (!builderConfig) {
            return NextResponse.json({ error: 'AI plan builder is not configured. Please set up a plan builder provider in admin settings.' }, { status: 503 });
        }

        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        if (workouts.length === 0) {
            return NextResponse.json({ error: 'Cannot analyze an empty plan. Add workouts first.' }, { status: 400 });
        }

        const body = await req.json();
        const { analysisType, targetWeekIndex, context } = body;
        const validTypes = ['full', 'week', 'risks', 'readiness', 'alternatives'];

        if (analysisType && !validTypes.includes(analysisType)) {
            return NextResponse.json({ error: `Invalid analysisType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
        }

        const systemPrompt = buildSystemPrompt(analysisType || 'full', targetWeekIndex);
        const userPrompt = buildUserPrompt(goal, workouts, context);

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        const result = await generateCompletion(builderConfig.config, messages);

        let analysisData: Record<string, any>;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found");
            }
        } catch {
            const extractString = (key: string) => {
                const match = result.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
                return match ? match[1] : null;
            };
            const extractNumber = (key: string) => {
                const match = result.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
                return match ? parseInt(match[1], 10) : null;
            };
            analysisData = {
                overallScore: extractNumber('overallScore'),
                overallSummary: extractString('overallSummary') || 'Analysis was interrupted or returned in an invalid format. Please try re-analyzing.',
                weekAnalyses: [],
                riskFlags: [],
                raceReadiness: {},
                suggestions: [],
            };
        }

        const analysis = await prisma.aiPlanAnalysis.upsert({
            where: { goalId },
            create: {
                goalId,
                overallScore: typeof analysisData.overallScore === 'number' ? analysisData.overallScore : null,
                overallSummary: typeof analysisData.overallSummary === 'string' ? analysisData.overallSummary : result,
                weekAnalyses: analysisData.weekAnalyses || [],
                riskFlags: analysisData.riskFlags || [],
                raceReadiness: analysisData.raceReadiness || {},
                suggestions: analysisData.suggestions || [],
                modelUsed: builderConfig.config.model,
                inputTokens: 0,
                outputTokens: 0,
            },
            update: {
                overallScore: typeof analysisData.overallScore === 'number' ? analysisData.overallScore : null,
                overallSummary: typeof analysisData.overallSummary === 'string' ? analysisData.overallSummary : result,
                weekAnalyses: analysisData.weekAnalyses || [],
                riskFlags: analysisData.riskFlags || [],
                raceReadiness: analysisData.raceReadiness || {},
                suggestions: analysisData.suggestions || [],
                modelUsed: builderConfig.config.model,
                inputTokens: 0,
                outputTokens: 0,
            },
        });

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('AI plan analysis error:', error);
        const { message, status } = getProviderErrorMessage(error);
        return NextResponse.json({ error: message }, { status });
    }
}
