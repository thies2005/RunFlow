/**
 * AI Chat API - Streaming chat endpoint
 * POST /api/ai/chat
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import {
    getAiConfig,
    streamChat,
    buildUserContext,
    buildActivityContext,
    formatContextForAi,
    buildSystemPrompt,
    checkUsageLimit,
    incrementUsage,
    buildExtendedHistoryContext,
    generateCompletion,
    type AiConfig,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { checkRateLimitAsync } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function detectIntent(config: AiConfig, message: string): Promise<string> {
    const systemPrompt = `You are a classifier. Classify user messages as either HISTORY_QUERY or NORMAL.
HISTORY_QUERY: requires accessing the user's entire past activity history (older than last 20 activities).
Examples: "How many marathons have I run?", "Compare my running volume 2023 vs 2024", "What is my all-time PR?", "List my runs from last month".
NORMAL: everything else.
Examples: "Help me plan a workout", "What is my current fitness?", "Analyze my last run", "What should I run tomorrow?".
Reply ONLY with "HISTORY_QUERY" or "NORMAL".`;

    try {
        const response = await generateCompletion(config, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ]);
        return response.trim().toUpperCase().includes('HISTORY_QUERY') ? 'HISTORY_QUERY' : 'NORMAL';
    } catch (e) {
        console.error('Intent detection failed', e);
        return 'NORMAL';
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;

        // Per-request rate limit: 10 requests per minute per user
        const rateLimitResult = await checkRateLimitAsync(userId, {
            limit: 10,
            windowSeconds: 60,
            prefix: 'ai_chat',
        });
        if (!rateLimitResult.allowed) {
            return new Response(JSON.stringify({ error: 'Too many requests. Please wait before sending another message.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const body = await request.json();
        const { message, activityId } = body as { message: string; activityId?: string };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check if AI is enabled for this user
        const config = await getAiConfig(userId);
        if (!config) {
            return new Response(JSON.stringify({ error: 'AI features not enabled. Add your own API key or contact admin.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check usage limits (only for users without custom API key)
        const usageStatus = await checkUsageLimit(userId);
        if (!usageStatus.canUse) {
            return new Response(JSON.stringify({ error: usageStatus.reason }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get global and user settings
        const [globalSettings, userSettings] = await Promise.all([
            prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
            prisma.userAiSettings.findUnique({ where: { userId } }),
        ]);

        // Build context based on user's data access settings
        const userContext = await buildUserContext(userId);
        let contextString = formatContextForAi(userContext);

        // Check intent for extended history (Lazy Load)
        if ((userSettings as any)?.accessAllActivities) {
            // Use the user's configured model for intent detection to ensure compatibility
            console.log(`Checking intent with model: ${config.model}`);
            const intent = await detectIntent(config, message);

            if (intent === 'HISTORY_QUERY') {
                const extendedHistory = await buildExtendedHistoryContext(userId);
                contextString += extendedHistory;
            }
        }

        // If activity-specific chat, add activity context
        if (activityId) {
            const activityContext = await buildActivityContext(activityId);
            if (activityContext) {
                contextString += `\n\n--- Current Activity ---\n`;
                contextString += `Activity: ${activityContext.activity.name} on ${activityContext.activity.date}\n`;
                contextString += `Type: ${activityContext.activity.type}\n`;
                contextString += `Distance: ${(activityContext.activity.distance / 1000).toFixed(2)}km\n`;
                contextString += `Duration: ${Math.floor(activityContext.activity.duration / 60)}:${(activityContext.activity.duration % 60).toString().padStart(2, '0')}\n`;
                contextString += `Pace: ${Math.floor(activityContext.activity.pace / 60)}:${Math.floor(activityContext.activity.pace % 60).toString().padStart(2, '0')}/km\n`;
                if (activityContext.activity.avgHr) contextString += `Avg HR: ${activityContext.activity.avgHr.toFixed(0)} bpm\n`;
                if (activityContext.activity.elevationGain) contextString += `Elevation: +${activityContext.activity.elevationGain.toFixed(0)}m\n`;
                if (activityContext.plannedWorkout) {
                    contextString += `\nPlanned workout: ${activityContext.plannedWorkout.type} - ${activityContext.plannedWorkout.description}\n`;
                }
            }
        }

        // Build system prompt
        const systemPrompt = buildSystemPrompt(
            globalSettings?.systemPrompt || '',
            userSettings?.customPromptAddition
        );

        // Build messages for the AI
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `${systemPrompt}\n\n--- Athlete Data ---\n${contextString}`,
            },
            {
                role: 'user',
                content: message,
            },
        ];

        // Stream the response
        const stream = await streamChat(config, messages);

        // Create a readable stream for SSE
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const token of stream) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    // Increment usage after successful completion
                    await incrementUsage(userId);
                } catch (error) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
                    controller.close();
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
        console.error('AI Chat error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
