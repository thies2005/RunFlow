/**
 * AI Chat API - Streaming chat endpoint
 * POST /api/ai/chat
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
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
import { handleError } from '@/lib/errors/handler';
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
    } catch (error) {
        logger.error('Intent detection failed', { error: error instanceof Error ? error.message : String(error) });
        return 'NORMAL';
    }
}

export async function POST(request: NextRequest) {
    let userId: string | undefined;
    try {
        const user = await getAuthenticatedUser(request);
        if (!user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        userId = user.id;

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
        const { message, activityId, sessionId: requestedSessionId, clientLocalDate } = body as { message: string; activityId?: string; sessionId?: string; clientLocalDate?: string };

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
                logger.info('AI Chat: Starting stream', { userId, sessionId });
                try {
                    // 1. Send Session ID immediately to acknowledge the request
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

                    // Keep-alive heartbeat while processing
                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    // 2. Heavy work starts here (now running inside the stream)

                    // Create user message immediately so it's in the DB if the frontend reloads history
                    await prisma.chatMessage.create({
                        data: { userId: userId!, role: 'user', content: message, activityId, sessionId },
                    });

                    // Check if AI is enabled for this user
                    let config = await getAiConfig(userId!); // userId is checked above via session
                    if (!config) {
                        // Provide specific error message
                        const userAiSettings = await prisma.userAiSettings.findUnique({ where: { userId: userId! } });
                        if (!userAiSettings || !userAiSettings.adminAllowed) {
                            throw new Error('AI access has not been granted by the admin. Contact admin to enable AI for your account.');
                        } else if (!userAiSettings.aiEnabled) {
                            throw new Error('AI features are disabled. Enable AI in your settings (click the gear icon).');
                        } else {
                            throw new Error('No AI provider configured. Add your own API key in settings or contact admin.');
                        }
                    }

                    // Check usage limits
                    const usageStatus = await checkUsageLimit(userId!);
                    if (!usageStatus.canUse) throw new Error(usageStatus.reason);

                    // Get global and user settings
                    const [globalSettings, userSettings] = await Promise.all([
                        prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
                        prisma.userAiSettings.findUnique({ where: { userId } }),
                    ]);

                    // Build context
                    const userContext = await buildUserContext(userId!);
                    let contextString = formatContextForAi(userContext);

                    // Lazy load extended history
                    const settingsAccess = userSettings as UserAiSettingsAccess | null;
                    if (settingsAccess?.accessAllActivities) {
                        const intent = await detectIntent(config, message);
                        if (intent === 'HISTORY_QUERY') {
                            const extendedHistory = await buildExtendedHistoryContext(userId!);
                            contextString += extendedHistory;
                        }
                    }

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
                    logger.debug('Stream starting', { sessionId, userId, model: config.model });

                    let stream;
                    try {
                        stream = await streamChat(config, aiMessages);
                    } catch (primaryError) {
                        if (config.fallback) {
                            logger.warn('Primary provider failed, switching to fallback', {
                                primaryModel: config.model,
                                fallbackModel: config.fallback.model,
                                error: primaryError instanceof Error ? primaryError.message : String(primaryError)
                            });
                            // Use fallback config but keep same context
                            config = config.fallback;
                            stream = await streamChat(config, aiMessages);
                        } else {
                            throw primaryError;
                        }
                    }

                    let tokenCount = 0;
                    for await (const token of stream) {
                        tokenCount++;
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));

                        // Log progress every 10 tokens
                        if (tokenCount % 10 === 0) {
                            logger.debug('Stream progress', { sessionId, tokenCount, responseLength: fullResponse.length });
                        }
                    }

                    logger.debug('Stream ended', { sessionId, tokenCount, responseLength: fullResponse.length });

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    // 4. Post-stream processing (Saving AI response to DB)
                    try {
                        // Check if the AI output contains meal or water logging payloads
                        if (fullResponse.includes('<!-- MEAL_LOGGED_WIDGET:')) {
                            const match = fullResponse.match(/<!-- MEAL_LOGGED_WIDGET:\s*(\{[\s\S]*?\})\s*-->/);
                            if (match) {
                                try {
                                    const parsed = JSON.parse(match[1]);
                                    const todayStr = clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)
                                        ? clientLocalDate
                                        : new Date().toISOString().split('T')[0];
                                    
                                    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                                        // Log individual items
                                        for (const item of parsed.items) {
                                            const dbFoodItem = await prisma.foodItem.create({
                                                data: {
                                                    name: item.name || 'Unknown Food',
                                                    calories: parseFloat(String(item.calories || 0)),
                                                    protein: parseFloat(String(item.protein || 0)),
                                                    carbs: parseFloat(String(item.carbs || 0)),
                                                    fats: parseFloat(String(item.fats || item.fat || 0)),
                                                    servingSize: item.estimatedGrams ? `${item.estimatedGrams}g` : '100g',
                                                }
                                            });
                                            await prisma.nutritionLog.create({
                                                data: {
                                                    userId: userId!,
                                                    date: todayStr,
                                                    mealType: 'snack',
                                                    quantity: 1.0,
                                                    calories: dbFoodItem.calories,
                                                    protein: dbFoodItem.protein,
                                                    carbs: dbFoodItem.carbs,
                                                    fats: dbFoodItem.fats,
                                                    foodItemId: dbFoodItem.id,
                                                }
                                            });
                                        }
                                    } else {
                                        // Log as a single meal
                                        const dbFoodItem = await prisma.foodItem.create({
                                            data: {
                                                name: parsed.name || 'Logged Meal',
                                                calories: parseFloat(String(parsed.calories || 0)),
                                                protein: parseFloat(String(parsed.protein || 0)),
                                                carbs: parseFloat(String(parsed.carbs || 0)),
                                                fats: parseFloat(String(parsed.fats || parsed.fat || 0)),
                                                servingSize: '1 serving',
                                            }
                                        });
                                        await prisma.nutritionLog.create({
                                            data: {
                                                userId: userId!,
                                                date: todayStr,
                                                mealType: 'snack',
                                                quantity: 1.0,
                                                calories: dbFoodItem.calories,
                                                protein: dbFoodItem.protein,
                                                carbs: dbFoodItem.carbs,
                                                fats: dbFoodItem.fats,
                                                foodItemId: dbFoodItem.id,
                                            }
                                        });
                                    }
                                    logger.info('AI Chat: Handled conversational food logging successfully', { userId, sessionId });
                                } catch (e) {
                                    logger.error('AI Chat: Failed to parse conversational food log JSON', { error: String(e) });
                                }
                            }
                        }

                        if (fullResponse.includes('<!-- WATER_LOGGED_WIDGET:')) {
                            const match = fullResponse.match(/<!-- WATER_LOGGED_WIDGET:\s*(\{[\s\S]*?\})\s*-->/);
                            if (match) {
                                try {
                                    const parsed = JSON.parse(match[1]);
                                    const amountLiters = parseFloat(String(parsed.amount || 0.25));
                                    // Convert liters to milliliters since waterIntake is Int (stored in mL)
                                    const amountMl = Math.round(amountLiters * 1000);
                                    let date: Date;
                                    if (clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)) {
                                        const [yr, mo, dy] = clientLocalDate.split('-').map(Number);
                                        date = new Date(Date.UTC(yr, mo - 1, dy));
                                    } else {
                                        const today = new Date();
                                        date = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                                    }

                                    const existing = await prisma.dailyHealthLog.findUnique({
                                        where: {
                                            userId_date: { userId: userId!, date }
                                        }
                                    });

                                    const newAmount = Math.max(0, (existing?.waterIntake || 0) + amountMl);

                                    await prisma.dailyHealthLog.upsert({
                                        where: {
                                            userId_date: { userId: userId!, date }
                                        },
                                        update: {
                                            waterIntake: newAmount
                                        },
                                        create: {
                                            userId: userId!,
                                            date,
                                            waterIntake: newAmount
                                        }
                                    });
                                    logger.info('AI Chat: Handled conversational water logging successfully', { userId, sessionId, amount: newAmount });
                                } catch (e) {
                                    logger.error('AI Chat: Failed to parse water log JSON', { error: String(e) });
                                }
                            }
                        }

                        await prisma.chatMessage.create({
                            data: { userId: userId!, role: 'assistant', content: fullResponse, activityId, sessionId },
                        });
                        await prisma.chatSession.update({
                            where: { id: sessionId },
                            data: { updatedAt: new Date() },
                        });

                        const outputTokens = countTokens(fullResponse, config.model);
                        await incrementUsage(userId!, { inputTokens, outputTokens }, config.providerId);
                        logger.debug('Saved AI response to database', { sessionId, responseLength: fullResponse.length });
                    } catch (dbError) {
                        logger.error('Failed to save AI response or update usage', { sessionId, error: dbError instanceof Error ? dbError.message : String(dbError) });
                    } finally {
                        clearInterval(heartbeat);
                    }
                } catch (error) {
                    logger.error('Stream error', { sessionId, error: error instanceof Error ? error.message : String(error) });
                    clearInterval(heartbeat);

                    // If no response was generated, clean up the orphaned session/message
                    if (!fullResponse && sessionId) {
                        try {
                            await prisma.chatMessage.deleteMany({ where: { sessionId } });
                            await prisma.chatSession.delete({ where: { id: sessionId } });
                            logger.info('Cleaned up empty session after stream error', { sessionId });
                        } catch (cleanupError) {
                            logger.warn('Failed to cleanup empty session', { sessionId, error: String(cleanupError) });
                        }
                    }

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
        return handleError(error);
    }
}
