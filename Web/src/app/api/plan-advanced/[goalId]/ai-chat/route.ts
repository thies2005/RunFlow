/**
 * AI Plan Chat - Streaming chat endpoint for the advanced plan builder
 * POST /api/plan-advanced/[goalId]/ai-chat
 *
 * The AI has full access to the plan and can suggest workout changes
 * via structured JSON blocks embedded in the response.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { decryptToken } from '@/lib/crypto';
import { validateBaseUrl, type ChatMessage, type AiConfig } from '@/lib/ai/providers';
import { streamChat } from '@/lib/ai';

export const dynamic = 'force-dynamic';

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
    const decryptedKey = decryptToken(provider.apiKey);
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

function buildPlanSystemPrompt(): string {
    return `You are an expert running and triathlon coach AI embedded in a plan editor. You help the user build and modify their training plan via natural language conversation.

## Your Capabilities
- You can see the entire training plan (all workouts, goal info, phases, dates).
- You can suggest adding, modifying, or removing workouts.
- You can explain training concepts and provide coaching advice.

## Workout Suggestion Format
When suggesting a workout to add or modify, embed a structured workout card in your response using this EXACT format (one per workout):

\`\`\`workout
{
  "action": "add" | "modify" | "delete",
  "workoutId": "existing-workout-id-for-modify-or-delete",
  "scheduledDate": "YYYY-MM-DD",
  "workoutType": "EASY" | "LONG_RUN" | "TEMPO" | "INTERVALS" | "FARTLEK" | "REPETITIONS" | "RECOVERY" | "RACE" | "REST" | "RIDE" | "SWIM" | "STRENGTH" | "CROSS_TRAIN" | "OTHER",
  "description": "Brief description of the workout",
  "targetDistance": 8000,
  "targetDuration": 2700,
  "phase": "BASE" | "BUILD" | "PEAK" | "TAPER" | "RACE_WEEK" | "RECOVERY" | "OFF",
  "notes": "Optional coaching notes"
}
\`\`\`

Always include the workout blocks when suggesting concrete changes. Multiple blocks can be included in a single response.
Always wrap each workout block in the \`\`\`workout fence.
Always use valid JSON inside workout blocks.
Distance is in meters, duration in seconds.

## Response Guidelines
- Be concise and actionable.
- When the user asks for changes, provide the workout blocks directly — don't just describe what to do.
- Explain your reasoning briefly.
- If the user's request is vague, suggest specific workouts rather than asking for more details.
- Consider the existing plan context (phases, volume progression, race date) when making suggestions.`;
}

function buildPlanContext(goal: Record<string, unknown>, workouts: Array<Record<string, unknown>>): string {
    const workoutSummary = workouts.map(w => {
        const date = w.scheduledDate instanceof Date ? w.scheduledDate.toISOString().split('T')[0] : String(w.scheduledDate);
        return `  - ${date} | ${w.workoutType} | ${w.targetDistance != null ? `${w.targetDistance}m` : '-'} | ${w.targetDuration != null ? `${Math.round(Number(w.targetDuration) / 60)}min` : '-'} | phase:${w.phase || 'BASE'} | "${w.description || ''}" | id:${w.id}`;
    }).join('\n');

    return `## Current Plan Context
Plan: ${goal.name}
Sport: ${goal.sport}
Race Type: ${goal.raceType || 'Not specified'}
Race Date: ${goal.raceDate instanceof Date ? goal.raceDate.toISOString().split('T')[0] : String(goal.raceDate || 'Not set')}
Plan Start: ${goal.planStartDate instanceof Date ? goal.planStartDate.toISOString().split('T')[0] : String(goal.planStartDate || 'Not set')}
Total Workouts: ${workouts.length}

### Workouts (date | type | distance | duration | phase | description | id):
${workoutSummary || '  (No workouts yet)'}`;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!(await checkPremium(session.user.id))) {
            return new Response(JSON.stringify({ error: 'Premium feature. Please upgrade your plan.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) },
            });
        }

        const { goalId } = await ctx.params;
        const body = await req.json();
        const { message, history } = body as { message: string; history?: ChatMessage[] };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: session.user.id },
        });

        if (!goal) {
            return new Response(JSON.stringify({ error: 'Plan not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const builderConfig = await getPlanBuilderConfig();
        if (!builderConfig) {
            return new Response(JSON.stringify({ error: 'AI plan builder is not configured. Please set up a plan builder provider in admin settings.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const workouts = await prisma.workout.findMany({
            where: { goalId },
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        const systemPrompt = buildPlanSystemPrompt();
        const planContext = buildPlanContext(goal as Record<string, unknown>, workouts as unknown as Array<Record<string, unknown>>);

        const messages: ChatMessage[] = [
            { role: 'system', content: `${systemPrompt}\n\n${planContext}` },
        ];

        // Include conversation history (last 10 messages max)
        if (history && Array.isArray(history)) {
            const recentHistory = history.slice(-10);
            for (const msg of recentHistory) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: message });

        // Stream the response
        const encoder = new TextEncoder();
        let heartbeat: NodeJS.Timeout | undefined;

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    const stream = await streamChat(builderConfig.config, messages);

                    for await (const token of stream) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();
                } catch (error) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
                    controller.close();
                } finally {
                    if (heartbeat) clearInterval(heartbeat);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('AI plan chat error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
