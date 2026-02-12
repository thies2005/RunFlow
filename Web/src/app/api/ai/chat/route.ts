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
    checkProviderLimit,
    incrementUsage,

    generateCompletion,
    countTokens,
    type AiConfig,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { checkRateLimitAsync } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

async function detectIntent(config: AiConfig, message: string): Promise<string> {
    const systemPrompt = `You are a classifier. Classify user messages as either HISTORY_QUERY or NORMAL.
HISTORY_QUERY: requires accessing the user's entire past activity history (older or deeper than the recent 20 activities context).
Examples: "How many marathons have I run?", "Compare my running volume 2023 vs 2024", "What is my all-time PR?", "List my runs from last month", "Show all runs longer than 20km", "When was my last long run?", "What data can you access?", "Check all my history".
NORMAL: everything else.
Examples: "Help me plan a workout", "What is my current fitness?", "Analyze my last run", "What should I run tomorrow?", "Explain VDOT".
Reply ONLY with "HISTORY_QUERY" or "NORMAL".`;

    try {
        const response = await generateCompletion(config, [
            {
                role: 'user',
                content: `${systemPrompt}\n\nUser Message to Classify:\n"${message}"`
            }
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
        const { message, activityId, sessionId: requestedSessionId } = body as { message: string; activityId?: string; sessionId?: string };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Handle Session ID
        let sessionId = requestedSessionId;
        // Generate a title from the user's message (first 50 chars)
        const sessionTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;

        if (!sessionId) {
            const newSession = await prisma.chatSession.create({
                data: {
                    userId,
                    title: sessionTitle,
                },
            });
            sessionId = newSession.id;
        } else {
            // Verify ownership
            const existingSession = await prisma.chatSession.findUnique({
                where: { id: sessionId },
            });
            if (!existingSession || existingSession.userId !== userId) {
                // If invalid session, create a new one
                const newSession = await prisma.chatSession.create({
                    data: {
                        userId,
                        title: sessionTitle,
                    },
                });
                sessionId = newSession.id;
            }
        }

        // Create a readable stream for SSE
        const encoder = new TextEncoder();
        let fullResponse = '';
        let heartbeat: NodeJS.Timeout | undefined;

        const readableStream = new ReadableStream({
            async start(controller) {
                console.log(`AI Chat: Starting stream for user ${userId}, session ${sessionId}`);
                try {
                    // 1. Send Session ID immediately to acknowledge the request
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

                    // Keep-alive heartbeat while processing
                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch (e) {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    // 2. Heavy work starts here (now running inside the stream)

                    // Create user message immediately so it's in the DB if the frontend reloads history
                    await prisma.chatMessage.create({
                        data: { userId, role: 'user', content: message, activityId, sessionId },
                    });

                    // Check if AI is enabled for this user
                    const config = await getAiConfig(userId);
                    if (!config) throw new Error('AI features not enabled. Add your own API key or contact admin.');

                    // Check usage limits
                    const usageStatus = await checkUsageLimit(userId);
                    if (!usageStatus.canUse) throw new Error(usageStatus.reason);

                    // Get global and user settings
                    const [globalSettings, userSettings] = await Promise.all([
                        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
                        prisma.userAiSettings.findUnique({ where: { userId } }),
                    ]);

                    // Build context
                    const userContext = await buildUserContext(userId);
                    let contextString = formatContextForAi(userContext);



                    // Activity context
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

                    const systemPrompt = buildSystemPrompt(
                        globalSettings?.systemPrompt || '',
                        userSettings?.customPromptAddition
                    );

                    const aiMessages: ChatMessage[] = [
                        {
                            role: 'system',
                            content: `${systemPrompt}\n\n--- Athlete Data ---\n${contextString}`,
                        },
                        {
                            role: 'user',
                            content: message,
                        },
                    ];

                    const inputTokens = countTokens(`${systemPrompt}\n\n--- Athlete Data ---\n${contextString}`, config.model) + countTokens(message, config.model);

                    // 3. Start the actual AI stream
                    console.log(`[STREAM START] Session: ${sessionId}, User: ${userId}, Model: ${config.model}`);
                    const stream = await streamChat(config, aiMessages);

                    let tokenCount = 0;
                    for await (const token of stream) {
                        tokenCount++;
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));

                        // Log progress every 10 tokens
                        if (tokenCount % 10 === 0) {
                            console.log(`[STREAM PROGRESS] Session: ${sessionId}, Tokens: ${tokenCount}, Response length: ${fullResponse.length}`);
                        }
                    }

                    console.log(`[STREAM END] Session: ${sessionId}, Total tokens: ${tokenCount}, Final response length: ${fullResponse.length}`);

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    // 4. Post-stream processing (Saving AI response to DB)
                    try {
                        await prisma.chatMessage.create({
                            data: { userId, role: 'assistant', content: fullResponse, activityId, sessionId },
                        });
                        await prisma.chatSession.update({
                            where: { id: sessionId },
                            data: { updatedAt: new Date() },
                        });

                        const outputTokens = countTokens(fullResponse, config.model);
                        await incrementUsage(userId, { inputTokens, outputTokens }, config.providerId);
                        console.log(`[DB SAVE] Session: ${sessionId}, Saved ${fullResponse.length} chars to database`);
                    } catch (dbError) {
                        console.error('[DB ERROR] Failed to save AI response or update usage', dbError);
                    } finally {
                        clearInterval(heartbeat);
                    }
                } catch (error) {
                    console.error(`[STREAM ERROR] Session: ${sessionId}, Error:`, error);
                    clearInterval(heartbeat);
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
