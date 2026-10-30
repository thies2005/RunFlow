import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { validateBaseUrl, generateCompletion, tryDecryptAiKey, type ChatMessage, type AiConfig } from '@/lib/ai/providers';
import { reserveUsageSlot, releaseUsageReservation, incrementUsage, checkProviderLimit, countTokens } from '@/lib/ai';
import { fenceUntrusted } from '@/lib/ai/prompts';

async function checkPremium(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isAdmin: true, aiSettings: { select: { usageTier: true, aiEnabled: true, adminAllowed: true } } },
    });
    const tier = user?.aiSettings?.usageTier || 'none';
    if (tier !== 'tier2' && tier !== 'tier3' && !user?.isAdmin) {
        return false;
    }
    if (!Boolean(user?.aiSettings?.aiEnabled && user?.aiSettings?.adminAllowed)) {
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

const PROMPT_VERSION = 2;

const CYCLING_SYSTEM_PROMPT = `You are an expert cycling and strength endurance coach AI. Analyze the user's cycling & strength training plan and return a structured JSON evaluation.
IMPORTANT: This is a dedicated CYCLING (and strength) plan, NOT a triathlon or running plan. Even if the database sport field says TRIATHLON/CUSTOM_TRI, the athlete is training exclusively for cycling and strength. Do NOT penalize the score or flag risks for having zero swimming or zero running workouts.
Evaluate:
1. Weekly TSS progression, overload ramp rate, and recovery/deload weeks.
2. Cycling intensity distribution (Endurance Z2 vs. Sweet Spot / Threshold FTP / VO2max intervals).
3. Spacing of high-intensity interval rides and heavy strength sessions.
4. Specificity and progressive overload across phases.
KEEP IT CONCISE. Use JSON format in your response with these fields: overallScore (number 0-100), overallSummary (string), weekAnalyses (array of objects with weekIndex, score, summary, suggestions), riskFlags (array of objects with flag, severity "low"|"medium"|"high", description), raceReadiness (object with overallScore, enduranceScore, speedScore, recoveryScore, mentalScore), suggestions (array of objects with category, priority "high"|"medium"|"low", title, description). Do not generate overly long text.`;

function detectEffectiveSport(
    goal: {
        name?: string | null;
        sport?: string | null;
        raceType?: string | null;
        runsPerWeek?: number | null;
        ridesPerWeek?: number | null;
        swimsPerWeek?: number | null;
        strengthPerWeek?: number | null;
    },
    workouts: Array<{
        workoutType: string;
        sport?: string | null;
        customName?: string | null;
    }>
): 'CYCLING' | 'TRIATHLON' | 'RUN' {
    const nameLower = (goal.name || '').toLowerCase();
    const isCyclingKeyword =
        nameLower.includes('cycling') ||
        nameLower.includes('bike') ||
        nameLower.includes('mywhoosh') ||
        nameLower.includes('zwift') ||
        nameLower.includes('ftp') ||
        nameLower.includes('sweet spot');

    let bikeCount = 0;
    let runCount = 0;
    let swimCount = 0;

    for (const w of workouts) {
        const type = (w.workoutType || '').toUpperCase();
        const sp = (w.sport || '').toUpperCase();
        if (sp === 'BIKE' || ['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS'].includes(type)) {
            bikeCount++;
        } else if (sp === 'RUN' || ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS', 'RECOVERY'].includes(type)) {
            runCount++;
        } else if (sp === 'SWIM' || ['SWIM', 'OPEN_WATER_SWIM', 'SWIM_DRILL'].includes(type)) {
            swimCount++;
        }
    }

    if (bikeCount > 0 && runCount === 0 && swimCount === 0) {
        return 'CYCLING';
    }

    if (
        goal.ridesPerWeek != null &&
        goal.ridesPerWeek > 0 &&
        (!goal.runsPerWeek || goal.runsPerWeek === 0) &&
        (!goal.swimsPerWeek || goal.swimsPerWeek === 0)
    ) {
        return 'CYCLING';
    }

    if (isCyclingKeyword && swimCount === 0 && runCount === 0) {
        return 'CYCLING';
    }

    if (goal.sport === 'TRIATHLON') {
        return 'TRIATHLON';
    }

    return 'RUN';
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

function buildUserPrompt(
    goal: Record<string, unknown>,
    workouts: Array<Record<string, unknown>>,
    effectiveSport: 'CYCLING' | 'TRIATHLON' | 'RUN',
    context?: string
): string {
    const workoutSummary = workouts.map(w => {
        const date = w.scheduledDate instanceof Date ? w.scheduledDate.toISOString().split('T')[0] : String(w.scheduledDate);
        const desc = fenceUntrusted(w.description as string | undefined);
        const namePart = w.customName ? ` [${fenceUntrusted(w.customName as string)}]` : '';
        const powerPart = w.targetPowerWatts != null && Number(w.targetPowerWatts) > 0 ? ` | ${w.targetPowerWatts}W` : '';
        const ftpPart = w.targetFtpPercent != null && Number(w.targetFtpPercent) > 0 ? ` | ${w.targetFtpPercent}% FTP` : '';
        const tssPart = w.plannedTss != null && Number(w.plannedTss) > 0 ? ` | ${w.plannedTss} TSS` : '';
        return `- ${date}: ${w.workoutType}${namePart} | ${w.targetDistance != null ? `${w.targetDistance}m` : 'no dist'} | ${w.targetDuration != null ? `${w.targetDuration}s` : 'no dur'}${powerPart}${ftpPart}${tssPart} | ${desc}`;
    }).join('\n');

    const boundedContext = context ? fenceUntrusted(context.slice(0, 2000)) : '';

    const sportLine = effectiveSport === 'CYCLING'
        ? 'Sport: CYCLING & STRENGTH (Dedicated Bike Plan — No Running or Swimming)'
        : `Sport: ${goal.sport}`;

    const raceTypeLine = effectiveSport === 'CYCLING'
        ? 'Race / Goal Type: Dedicated Cycling Season'
        : `Race Type: ${goal.raceType || 'Not specified'}`;

    return `Training Plan: ${fenceUntrusted(goal.name as string | undefined)}
${sportLine}
${raceTypeLine}
Race Date: ${goal.raceDate instanceof Date ? goal.raceDate.toISOString().split('T')[0] : String(goal.raceDate || 'Not set')}
Plan Start: ${goal.planStartDate instanceof Date ? goal.planStartDate.toISOString().split('T')[0] : String(goal.planStartDate || 'Not set')}
Workout Day: ${goal.workoutDay ?? 3}

Workouts:
${workoutSummary}

${boundedContext ? `\nAdditional context from user:\n${boundedContext}` : ''}

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
            select: {
                id: true,
                name: true,
                sport: true,
                raceType: true,
                runsPerWeek: true,
                ridesPerWeek: true,
                swimsPerWeek: true,
                strengthPerWeek: true,
                workouts: {
                    select: {
                        workoutType: true,
                        sport: true,
                        customName: true,
                        plannedTss: true,
                        targetPowerWatts: true,
                        targetFtpPercent: true,
                    },
                },
            },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const effectiveSport = detectEffectiveSport(goal, goal.workouts);

        const analysis = await prisma.aiPlanAnalysis.findUnique({
            where: { goalId },
        });

        // Invalidate outdated cache if cycling plan was evaluated with triathlon v1 prompt
        if (effectiveSport === 'CYCLING' && analysis) {
            const isV2 = analysis.modelUsed && analysis.modelUsed.includes(`:v${PROMPT_VERSION}`);
            const mentionsMissingTriathlon =
                analysis.overallSummary?.toLowerCase().includes('swim') ||
                analysis.overallSummary?.toLowerCase().includes('triathlon') ||
                (analysis.riskFlags as any[])?.some(
                    (f) =>
                        (f.description || f.flag || '').toLowerCase().includes('swim') ||
                        (f.description || f.flag || '').toLowerCase().includes('running')
                );
            if (!isV2 || mentionsMissingTriathlon) {
                return NextResponse.json({ analysis: null });
            }
        }

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
            select: {
                id: true,
                name: true,
                sport: true,
                raceType: true,
                raceDate: true,
                planStartDate: true,
                workoutDay: true,
                runsPerWeek: true,
                ridesPerWeek: true,
                swimsPerWeek: true,
                strengthPerWeek: true,
            },
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

        const effectiveSport = detectEffectiveSport(goal, workouts);

        let systemPrompt: string;
        if (effectiveSport === 'CYCLING') {
            switch (analysisType) {
                case 'week':
                    systemPrompt = `${CYCLING_SYSTEM_PROMPT} Focus your analysis specifically on week ${targetWeekIndex || 'the specified week'}. Provide detailed analysis for that week only. Include specific workout adjustments.`;
                    break;
                case 'risks':
                    systemPrompt = `${CYCLING_SYSTEM_PROMPT} Focus primarily on identifying injury and overtraining risks, interval spacing, recovery weeks, and balancing heavy strength workouts with high-power rides.`;
                    break;
                case 'readiness':
                    systemPrompt = `${CYCLING_SYSTEM_PROMPT} Focus on cycling peak power, FTP readiness, muscular endurance, and taper/freshness before target rides.`;
                    break;
                case 'alternatives':
                    systemPrompt = `${CYCLING_SYSTEM_PROMPT} Provide alternative cycling and strength workout suggestions. Focus on sweet-spot variations, VO2max micro-intervals, and recovery spins.`;
                    break;
                default:
                    systemPrompt = CYCLING_SYSTEM_PROMPT;
            }
        } else {
            systemPrompt = buildSystemPrompt(analysisType || 'full', targetWeekIndex);
        }

        const userPrompt = buildUserPrompt(goal, workouts, effectiveSport, context);

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        // Reserve usage quota slot before provider work
        const reservation = await reserveUsageSlot(session.user.id);
        if (!reservation.allowed) {
            return NextResponse.json({ error: reservation.reason || 'AI usage limit reached' }, { status: 429 });
        }

        if (builderConfig.config.providerId) {
            const provLimit = await checkProviderLimit(builderConfig.config.providerId);
            if (!provLimit.canUse) {
                if (reservation.claimed) {
                    await releaseUsageReservation(session.user.id).catch(() => undefined);
                }
                return NextResponse.json({ error: provLimit.reason || 'Provider monthly token limit exceeded' }, { status: 429 });
            }
        }

        let result: string;
        try {
            result = await generateCompletion(builderConfig.config, messages);
        } catch (genError) {
            if (reservation.claimed) {
                await releaseUsageReservation(session.user.id).catch(() => undefined);
            }
            throw genError;
        }

        const inputTokensEstimate = messages.reduce(
            (acc, m) => acc + countTokens(m.content, builderConfig.config.model),
            0
        );
        const outputTokensEstimate = countTokens(result, builderConfig.config.model);

        await incrementUsage(
            session.user.id,
            inputTokensEstimate,
            outputTokensEstimate,
            builderConfig.config.providerId,
            { skipMessageIncrement: reservation.claimed }
        );

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
                modelUsed: `${builderConfig.config.model}:v${PROMPT_VERSION}`,
                inputTokens: inputTokensEstimate,
                outputTokens: outputTokensEstimate,
            },
            update: {
                overallScore: typeof analysisData.overallScore === 'number' ? analysisData.overallScore : null,
                overallSummary: typeof analysisData.overallSummary === 'string' ? analysisData.overallSummary : result,
                weekAnalyses: analysisData.weekAnalyses || [],
                riskFlags: analysisData.riskFlags || [],
                raceReadiness: analysisData.raceReadiness || {},
                suggestions: analysisData.suggestions || [],
                modelUsed: `${builderConfig.config.model}:v${PROMPT_VERSION}`,
                inputTokens: inputTokensEstimate,
                outputTokens: outputTokensEstimate,
            },
        });

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('AI plan analysis error:', error);
        const { message, status } = getProviderErrorMessage(error);
        return NextResponse.json({ error: message }, { status });
    }
}
