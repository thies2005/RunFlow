import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { type ChatMessage } from '@/lib/ai/providers';
import { reserveUsageSlot, releaseUsageReservation, incrementUsage, countTokens } from '@/lib/ai';
import { checkPlanBuilderEligibility } from '@/lib/ai/routing';
import { executeCompletionWithFallback } from '@/lib/ai/executor';
import { AiProviderError, toSafeUserError } from '@/lib/ai/errors';
import { fenceUntrusted } from '@/lib/ai/prompts';
import { logger } from '@/lib/logging/logger';

type RouteContext = { params: Promise<{ goalId: string }> };

function reservationToError(reason?: string): AiProviderError {
    if (reason?.includes('not enabled')) {
        return new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: reason,
        });
    }
    if (reason?.includes('not configured') || reason?.includes('Add your own API key')) {
        return new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 403,
            userMessage: reason,
        });
    }
    return new AiProviderError({
        code: 'USER_LIMIT_REACHED',
        httpStatus: 429,
        userMessage: reason || 'AI usage limit reached',
    });
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

        const { canUsePlanBuilder } = await checkPlanBuilderEligibility(session.user.id);
        if (!canUsePlanBuilder) {
            return NextResponse.json(
                { error: 'Plan Builder AI requires an eligible tier or personal API key.' },
                { status: 403 }
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
        logger.error('Get AI analysis error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { canUsePlanBuilder } = await checkPlanBuilderEligibility(session.user.id);
        if (!canUsePlanBuilder) {
            return NextResponse.json(
                { error: 'Plan Builder AI requires an eligible tier or personal API key.' },
                { status: 403 }
            );
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

        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        if (workouts.length === 0) {
            return NextResponse.json({ error: 'Cannot analyze an empty plan. Add workouts first.' }, { status: 400 });
        }

        let body: { analysisType?: string; targetWeekIndex?: number; context?: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { analysisType, targetWeekIndex, context } = body;
        const validTypes = ['full', 'week', 'risks', 'readiness', 'alternatives'];

        if (analysisType && !validTypes.includes(analysisType)) {
            return NextResponse.json({ error: `Invalid analysisType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
        }

        const globalSettings = await prisma.globalAiSettings.findUnique({
            where: { id: 'singleton' },
            select: { planMaxTokensPerAnalysis: true },
        });
        const maxTokens = globalSettings?.planMaxTokensPerAnalysis ?? 8000;

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
            const safe = toSafeUserError(reservationToError(reservation.reason));
            return NextResponse.json(
                { error: safe.message, errorCode: safe.code },
                { status: safe.httpStatus }
            );
        }

        let result: string;
        let targetUsed: { providerId?: string; model: string };
        try {
            const execution = await executeCompletionWithFallback(
                session.user.id,
                'planBuilder',
                messages,
                { maxTokens, signal: req.signal }
            );
            result = execution.text;
            targetUsed = execution.targetUsed;
        } catch (genError) {
            if (reservation.claimed) {
                await releaseUsageReservation(session.user.id).catch(() => undefined);
            }
            throw genError;
        }

        const inputTokensEstimate = messages.reduce(
            (acc, m) => acc + countTokens(m.content, targetUsed.model),
            0
        );
        const outputTokensEstimate = countTokens(result, targetUsed.model);

        await incrementUsage(
            session.user.id,
            { inputTokens: inputTokensEstimate, outputTokens: outputTokensEstimate },
            targetUsed.providerId,
            { skipMessageIncrement: true, model: targetUsed.model }
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
                modelUsed: `${targetUsed.model}:v${PROMPT_VERSION}`,
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
                modelUsed: `${targetUsed.model}:v${PROMPT_VERSION}`,
                inputTokens: inputTokensEstimate,
                outputTokens: outputTokensEstimate,
            },
        });

        return NextResponse.json({ analysis });
    } catch (error) {
        const safe = toSafeUserError(error);
        logger.error('AI plan analysis error', {
            code: safe.code,
            httpStatus: safe.httpStatus,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: safe.message, errorCode: safe.code },
            { status: safe.httpStatus }
        );
    }
}
