import { NextRequest } from 'next/server';
import { auth } from '@/auth';
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
    countTokens,
    type AiConfig,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { setApiVersionHeaders } from '@/lib/api/version';
import { logger } from '@/lib/logging/logger';

interface UserAiSettingsAccess {
    accessAllActivities?: boolean;
}

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
        logger.error('Intent detection failed', { error: e });
        return 'NORMAL';
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            const response = new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;

        const rateLimitResult = await checkRateLimitAsync(userId, {
            limit: 10,
            windowSeconds: 60,
            prefix: 'ai_chat',
        });
        if (!rateLimitResult.allowed) {
            const response = new Response(JSON.stringify({ error: 'Too many requests. Please wait before sending another message.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
            });
            setApiVersionHeaders(response.headers);
            return response;
        }
        const body = await request.json();
        const { message, activityId, sessionId: requestedSessionId } = body as { message: string; activityId?: string; sessionId?: string };

        if (!message || typeof message !== 'string') {
            const response = new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
            setApiVersionHeaders(response.headers);
            return response;
        }

        let sessionId = requestedSessionId;
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
            const existingSession = await prisma.chatSession.findUnique({
                where: { id: sessionId },
            });
            if (!existingSession || existingSession.userId !== userId) {
                const newSession = await prisma.chatSession.create({
                    data: {
                        userId,
                        title: sessionTitle,
                    },
                });
                sessionId = newSession.id;
            }
        }

        const encoder = new TextEncoder();
        let fullResponse = '';
        let heartbeat: NodeJS.Timeout | undefined;

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    await prisma.chatMessage.create({
                        data: { userId, role: 'user', content: message, activityId, sessionId },
                    });

                    const config = await getAiConfig(userId);
                    if (!config) throw new Error('AI features not enabled. Add your own API key or contact admin.');

                    const usageStatus = await checkUsageLimit(userId);
                    if (!usageStatus.canUse) throw new Error(usageStatus.reason);

                    const [globalSettings, userSettings] = await Promise.all([
                        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
                        prisma.userAiSettings.findUnique({ where: { userId } }),
                    ]);

                    const userContext = await buildUserContext(userId);
                    let contextString = formatContextForAi(userContext);

                    const settingsAccess = userSettings as UserAiSettingsAccess | null;
                    if (settingsAccess?.accessAllActivities) {
                        const intent = await detectIntent(config, message);
                        if (intent === 'HISTORY_QUERY') {
                            const extendedHistory = await buildExtendedHistoryContext(userId);
                            contextString += extendedHistory;
                        }
                    }

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

                    const stream = await streamChat(config, aiMessages);

                    let _tokenCount = 0;
                    for await (const token of stream) {
                        _tokenCount++;
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

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
                    } catch (dbError) {
                        logger.error('[DB ERROR] Failed to save AI response or update usage', { error: dbError });
                    } finally {
                        clearInterval(heartbeat);
                    }
                } catch (error) {
                    logger.error('[STREAM ERROR]', { sessionId, error });
                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
                    controller.close();
                }
            },
        });

        const response = new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        logger.error('AI Chat error', { error });
        const response = new Response(JSON.stringify({
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
        setApiVersionHeaders(response.headers);
        return response;
    }
}
