import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
    buildUserContext,
    buildActivityContext,
    formatContextForAi,
    buildSystemPrompt,
    reserveUsageSlot,
    releaseUsageReservation,
    incrementUsage,
    buildExtendedHistoryContext,
    countTokens,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { executeCompletionWithFallback, executeStreamWithFallback } from '@/lib/ai/executor';
import { AiProviderError, toSafeUserError } from '@/lib/ai/errors';
import { checkRateLimitAsync } from '@/lib/rateLimit';
import { handleError } from '@/lib/errors/handler';
import { logger } from '@/lib/logging/logger';
import { fenceUntrusted, stripWidgetMarkers } from '@/lib/ai/prompts';

interface UserAiSettingsAccess {
    accessAllActivities?: boolean;
    accessActivityHistory?: boolean;
    accessActivityLogs?: boolean;
}

const mealWidgetItemSchema = z.object({
    name: z.string().max(120).optional().default('Unknown Food'),
    calories: z.number().finite().min(0).max(5000).optional().default(0),
    protein: z.number().finite().min(0).max(500).optional().default(0),
    carbs: z.number().finite().min(0).max(500).optional().default(0),
    fats: z.number().finite().min(0).max(500).optional().default(0),
    estimatedGrams: z.number().finite().min(0).max(5000).optional(),
});

const mealWidgetSchema = z.object({
    items: z.array(mealWidgetItemSchema).max(20).optional(),
    name: z.string().max(120).optional(),
    mealType: z.string().max(32).optional(),
    calories: z.number().finite().min(0).max(5000).optional(),
    protein: z.number().finite().min(0).max(500).optional(),
    carbs: z.number().finite().min(0).max(500).optional(),
    fats: z.number().finite().min(0).max(500).optional(),
});

const waterWidgetSchema = z.object({
    amount: z.number().finite().min(0).max(5).optional().default(0.25),
});

const VALID_MEAL_TYPES = new Set(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
export type ValidMealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export function normalizeMealType(mealType?: string | null): ValidMealType {
    const upper = mealType?.trim().toUpperCase();
    if (upper && VALID_MEAL_TYPES.has(upper)) {
        return upper as ValidMealType;
    }
    return 'SNACK';
}

export function sanitizeHistoryContent(content: string): string {
    const withoutWidgets = content
        .replace(/<!--\s*MEAL_LOGGED_WIDGET[\s\S]*?-->/g, '')
        .replace(/<!--\s*WATER_LOGGED_WIDGET[\s\S]*?-->/g, '');
    return stripWidgetMarkers(withoutWidgets).trim();
}

export function extractWidgetJson(comment: string, marker: string): unknown | null {
    const startIdx = comment.indexOf(marker);
    if (startIdx === -1) return null;

    let i = startIdx + marker.length;
    while (i < comment.length && comment[i] !== '{') i++;
    if (i >= comment.length) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    const jsonStart = i;

    for (; i < comment.length; i++) {
        const char = comment[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }
        if (char === '"') {
            inString = true;
            continue;
        }
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                const candidate = comment.slice(jsonStart, i + 1);
                try {
                    return JSON.parse(candidate);
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

function buildReservationError(reason?: string): AiProviderError {
    const message = reason || 'Usage limit reached';
    if (/add your own api key|not configured/i.test(message)) {
        return new AiProviderError({
            code: 'NOT_CONFIGURED',
            httpStatus: 403,
            userMessage: message,
        });
    }
    if (/not enabled|disabled|admin/i.test(message)) {
        return new AiProviderError({
            code: 'AI_DISABLED',
            httpStatus: 403,
            userMessage: message,
        });
    }
    return new AiProviderError({
        code: 'USER_LIMIT_REACHED',
        httpStatus: 429,
        userMessage: message,
    });
}

function safeJsonErrorResponse(
    error: unknown,
    applyHeaders?: <T extends Response>(_res: T) => T
): NextResponse {
    const safe = toSafeUserError(error);
    const res = NextResponse.json(
        {
            error: safe.message,
            errorCode: safe.code,
            ...(safe.retryAfterSeconds ? { retryAfterSeconds: safe.retryAfterSeconds } : {}),
        },
        { status: safe.httpStatus }
    );
    return applyHeaders ? applyHeaders(res) : res;
}

async function detectIntent(
    userId: string,
    message: string,
    signal?: AbortSignal
): Promise<'HISTORY_QUERY' | 'NORMAL' | null> {
    const systemPrompt = `You are a classifier. Classify user messages as either HISTORY_QUERY or NORMAL.
HISTORY_QUERY: requires accessing the user's entire past activity history (older or deeper than the recent 20 activities context).
Examples: "How many marathons have I run?", "Compare my running volume 2023 vs 2024", "What is my all-time PR?", "List my runs from last month", "Show all runs longer than 20km", "When was my last long run?", "What data can you access?", "Check all my history".
NORMAL: everything else.
Examples: "Help me plan a workout", "What is my current fitness?", "Analyze my last run", "What should I run tomorrow?", "Explain VDOT".
Reply ONLY with "HISTORY_QUERY" or "NORMAL".`;

    try {
        const { text } = await executeCompletionWithFallback(
            userId,
            'chat',
            [
                {
                    role: 'user',
                    content: `${systemPrompt}\n\nUser Message to Classify:\n"${message}"`,
                },
            ],
            { signal }
        );
        return text.trim().toUpperCase().includes('HISTORY_QUERY') ? 'HISTORY_QUERY' : 'NORMAL';
    } catch (error) {
        const safe = toSafeUserError(error);
        logger.error('Intent detection failed', { code: safe.code, error: safe.message });
        return null;
    }
}

async function persistWidgetLogs(
    userId: string,
    sessionId: string,
    fullResponse: string,
    clientLocalDate?: string
): Promise<void> {
    if (fullResponse.includes('<!-- MEAL_LOGGED_WIDGET:')) {
        const parsedRaw = extractWidgetJson(fullResponse, '<!-- MEAL_LOGGED_WIDGET:');
        if (parsedRaw != null) {
            try {
                const result = mealWidgetSchema.safeParse(parsedRaw);
                if (!result.success) {
                    logger.warn('AI Chat: MEAL_LOGGED_WIDGET payload failed validation', {
                        userId,
                        sessionId,
                        issues: result.error.issues,
                    });
                } else {
                    const parsed = result.data;
                    const todayStr =
                        clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)
                            ? clientLocalDate
                            : new Date().toISOString().split('T')[0];

                    const normalizedMealType = normalizeMealType(parsed.mealType);

                    if (parsed.items && parsed.items.length > 0) {
                        for (const item of parsed.items) {
                            const dbFoodItem = await prisma.foodItem.create({
                                data: {
                                    name: item.name,
                                    calories: item.calories,
                                    protein: item.protein,
                                    carbs: item.carbs,
                                    fats: item.fats,
                                    servingSize: item.estimatedGrams ? `${item.estimatedGrams}g` : '100g',
                                },
                            });
                            await prisma.nutritionLog.create({
                                data: {
                                    userId,
                                    date: todayStr,
                                    mealType: normalizedMealType,
                                    quantity: 1.0,
                                    calories: dbFoodItem.calories,
                                    protein: dbFoodItem.protein,
                                    carbs: dbFoodItem.carbs,
                                    fats: dbFoodItem.fats,
                                    foodItemId: dbFoodItem.id,
                                },
                            });
                        }
                    } else {
                        const dbFoodItem = await prisma.foodItem.create({
                            data: {
                                name: parsed.name || 'Logged Meal',
                                calories: parsed.calories ?? 0,
                                protein: parsed.protein ?? 0,
                                carbs: parsed.carbs ?? 0,
                                fats: parsed.fats ?? 0,
                                servingSize: '1 serving',
                            },
                        });
                        await prisma.nutritionLog.create({
                            data: {
                                userId,
                                date: todayStr,
                                mealType: normalizedMealType,
                                quantity: 1.0,
                                calories: dbFoodItem.calories,
                                protein: dbFoodItem.protein,
                                carbs: dbFoodItem.carbs,
                                fats: dbFoodItem.fats,
                                foodItemId: dbFoodItem.id,
                            },
                        });
                    }
                    logger.info('AI Chat: Handled conversational food logging successfully', { userId, sessionId });
                }
            } catch (e) {
                logger.error('AI Chat: Failed to parse conversational food log JSON', { error: String(e) });
            }
        }
    }

    if (fullResponse.includes('<!-- WATER_LOGGED_WIDGET:')) {
        const parsedRaw = extractWidgetJson(fullResponse, '<!-- WATER_LOGGED_WIDGET:');
        if (parsedRaw != null) {
            try {
                const result = waterWidgetSchema.safeParse(parsedRaw);
                if (!result.success) {
                    logger.warn('AI Chat: WATER_LOGGED_WIDGET payload failed validation', {
                        userId,
                        sessionId,
                        issues: result.error.issues,
                    });
                } else {
                    const amountLiters = result.data.amount ?? 0.25;
                    const amountMl = Math.min(Math.round(amountLiters * 1000), 8000);
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
                            userId_date: { userId, date },
                        },
                    });

                    const newAmount = Math.min(8000, Math.max(0, (existing?.waterIntake || 0) + amountMl));

                    await prisma.dailyHealthLog.upsert({
                        where: {
                            userId_date: { userId, date },
                        },
                        update: {
                            waterIntake: newAmount,
                        },
                        create: {
                            userId,
                            date,
                            waterIntake: newAmount,
                        },
                    });
                    logger.info('AI Chat: Handled conversational water logging successfully', {
                        userId,
                        sessionId,
                        amount: newAmount,
                    });
                }
            } catch (e) {
                logger.error('AI Chat: Failed to parse water log JSON', { error: String(e) });
            }
        }
    }
}

export interface ChatPipelineOptions {
    request: NextRequest;
    userId: string;
    applyHeaders?: <T extends Response>(_response: T) => T;
    useHandleErrorOnUnknown?: boolean;
}

export async function executeAiChatPipeline({
    request,
    userId,
    applyHeaders,
    useHandleErrorOnUnknown = true,
}: ChatPipelineOptions): Promise<Response> {
    const wrap = <T extends Response>(res: T): T => (applyHeaders ? applyHeaders(res) : res);

    let sessionId: string | undefined;
    let createdNewSession = false;
    let createdUserMessageId: string | null = null;
    let usageReserved = false;

    const cleanupPreFirstToken = async () => {
        if (usageReserved) {
            usageReserved = false;
            try {
                await releaseUsageReservation(userId);
            } catch (refundError) {
                logger.warn('Failed to release usage reservation', {
                    sessionId,
                    error: refundError instanceof Error ? refundError.message : String(refundError),
                });
            }
        }

        if (createdNewSession && sessionId) {
            try {
                await prisma.chatMessage.deleteMany({ where: { sessionId } });
                await prisma.chatSession.delete({ where: { id: sessionId } });
                logger.info('Cleaned up empty session after pre-first-token failure', { sessionId });
            } catch (cleanupError) {
                logger.warn('Failed to cleanup empty session', {
                    sessionId,
                    error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
                });
            }
        } else if (createdUserMessageId) {
            try {
                await prisma.chatMessage.deleteMany({ where: { id: createdUserMessageId } });
            } catch (cleanupError) {
                logger.warn('Failed to cleanup orphaned user message', {
                    sessionId,
                    messageId: createdUserMessageId,
                    error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
                });
            }
        }

        createdNewSession = false;
        createdUserMessageId = null;
    };

    try {
        const rateLimitResult = await checkRateLimitAsync(userId, {
            limit: 10,
            windowSeconds: 60,
            prefix: 'ai_chat',
        });
        if (!rateLimitResult.allowed) {
            return wrap(
                NextResponse.json(
                    {
                        error: 'Too many requests. Please wait before sending another message.',
                        errorCode: 'RATE_LIMITED',
                    },
                    { status: 429 }
                )
            );
        }

        const body = await request.json();
        const {
            message,
            activityId,
            sessionId: requestedSessionId,
            clientLocalDate,
        } = body as {
            message: string;
            activityId?: string;
            sessionId?: string;
            clientLocalDate?: string;
        };

        if (!message || typeof message !== 'string') {
            return wrap(NextResponse.json({ error: 'Message is required' }, { status: 400 }));
        }

        const reservation = await reserveUsageSlot(userId);
        if (!reservation.allowed) {
            return safeJsonErrorResponse(buildReservationError(reservation.reason), applyHeaders);
        }
        usageReserved = reservation.claimed;

        sessionId = requestedSessionId;
        let isExistingUserSession = false;
        const sessionTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;

        if (!sessionId) {
            const newSession = await prisma.chatSession.create({
                data: {
                    userId,
                    title: sessionTitle,
                },
            });
            sessionId = newSession.id;
            createdNewSession = true;
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
                createdNewSession = true;
            } else {
                sessionId = existingSession.id;
                isExistingUserSession = true;
            }
        }

        let priorMessages: ChatMessage[] = [];
        if (isExistingUserSession && sessionId && typeof prisma.chatMessage.findMany === 'function') {
            const recentHistory = await prisma.chatMessage.findMany({
                where: {
                    sessionId,
                    userId,
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    role: true,
                    content: true,
                },
            });
            priorMessages = recentHistory
                .reverse()
                .filter(
                    (m): m is { role: 'user' | 'assistant'; content: string } =>
                        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
                )
                .map((m) => ({
                    role: m.role,
                    content: sanitizeHistoryContent(m.content),
                }))
                .filter((m) => m.content.length > 0);
        }

        const createdUserMessage = await prisma.chatMessage.create({
            data: { userId, role: 'user', content: message, activityId, sessionId },
        });
        createdUserMessageId = createdUserMessage?.id ?? null;

        const [globalSettings, userSettings] = await Promise.all([
            prisma.globalAiSettings.findUnique({ where: { id: 'singleton' } }),
            prisma.userAiSettings.findUnique({ where: { userId } }),
        ]);

        const userContext = await buildUserContext(userId);
        let contextString = formatContextForAi(userContext);

        const settingsAccess = userSettings as UserAiSettingsAccess | null;
        if (settingsAccess?.accessAllActivities) {
            const intent = await detectIntent(userId, message, request.signal);
            if (intent === 'HISTORY_QUERY') {
                const extendedHistory = await buildExtendedHistoryContext(userId);
                contextString += extendedHistory;
            }
        }

        if (activityId && (settingsAccess?.accessActivityHistory || settingsAccess?.accessActivityLogs)) {
            const activityContext = await buildActivityContext(activityId, userId);
            if (activityContext) {
                contextString += `\n\n--- Current Activity ---\n`;
                contextString += `Activity: ${fenceUntrusted(activityContext.activity.name)} on ${activityContext.activity.date}\n`;
                contextString += `Type: ${activityContext.activity.type}\n`;
                contextString += `Distance: ${(activityContext.activity.distance / 1000).toFixed(2)}km\n`;
                contextString += `Duration: ${Math.floor(activityContext.activity.duration / 60)}:${(activityContext.activity.duration % 60).toString().padStart(2, '0')}\n`;
                contextString += `Pace: ${Math.floor(activityContext.activity.pace / 60)}:${Math.floor(activityContext.activity.pace % 60).toString().padStart(2, '0')}/km\n`;
                if (activityContext.activity.avgHr) contextString += `Avg HR: ${activityContext.activity.avgHr.toFixed(0)} bpm\n`;
                if (activityContext.activity.elevationGain) contextString += `Elevation: +${activityContext.activity.elevationGain.toFixed(0)}m\n`;
                if (activityContext.plannedWorkout) {
                    contextString += `\nPlanned workout: ${activityContext.plannedWorkout.type} - ${fenceUntrusted(activityContext.plannedWorkout.description)}\n`;
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
            ...priorMessages,
            {
                role: 'user',
                content: message,
            },
        ];

        logger.debug('Stream starting', { sessionId, userId });
        const { stream, targetUsed } = await executeStreamWithFallback(
            userId,
            'chat',
            aiMessages,
            { signal: request.signal }
        );

        const activeModel = targetUsed.model;
        const historyTokens = priorMessages.reduce((sum, m) => sum + countTokens(m.content, activeModel), 0);
        const inputTokens =
            countTokens(`${systemPrompt}\n\n--- Athlete Data ---\n${contextString}`, activeModel) +
            historyTokens +
            countTokens(message, activeModel);

        const encoder = new TextEncoder();
        let fullResponse = '';
        let heartbeat: NodeJS.Timeout | undefined;
        let firstTokenSent = false;

        const readableStream = new ReadableStream({
            async start(controller) {
                logger.info('AI Chat: Starting stream', {
                    userId,
                    sessionId,
                    model: targetUsed.model,
                    providerId: targetUsed.providerId,
                });
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    let tokenCount = 0;
                    for await (const token of stream) {
                        tokenCount++;
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                        if (token.length > 0) {
                            firstTokenSent = true;
                        }
                        if (tokenCount % 10 === 0) {
                            logger.debug('Stream progress', { sessionId, tokenCount, responseLength: fullResponse.length });
                        }
                    }

                    logger.debug('Stream ended', { sessionId, tokenCount, responseLength: fullResponse.length });

                    if (heartbeat) clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    try {
                        await persistWidgetLogs(userId, sessionId!, fullResponse, clientLocalDate);

                        await prisma.chatMessage.create({
                            data: { userId, role: 'assistant', content: fullResponse, activityId, sessionId },
                        });
                        await prisma.chatSession.update({
                            where: { id: sessionId },
                            data: { updatedAt: new Date() },
                        });

                        const outputTokens = countTokens(fullResponse, targetUsed.model);
                        await incrementUsage(
                            userId,
                            { inputTokens, outputTokens },
                            targetUsed.providerId,
                            { messagesAlreadyCounted: usageReserved, model: targetUsed.model }
                        );
                        logger.debug('Saved AI response to database', { sessionId, responseLength: fullResponse.length });
                    } catch (dbError) {
                        logger.error('Failed to save AI response or update usage', {
                            sessionId,
                            error: dbError instanceof Error ? dbError.message : String(dbError),
                        });
                    } finally {
                        if (heartbeat) clearInterval(heartbeat);
                    }
                } catch (error) {
                    const safe = toSafeUserError(error);
                    logger.error('Stream error', {
                        sessionId,
                        code: safe.code,
                        firstTokenSent,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    if (heartbeat) clearInterval(heartbeat);

                    if (!firstTokenSent) {
                        await cleanupPreFirstToken();
                    } else {
                        try {
                            const outputTokens = countTokens(fullResponse, targetUsed.model);
                            await incrementUsage(
                                userId,
                                { inputTokens, outputTokens },
                                targetUsed.providerId,
                                { messagesAlreadyCounted: usageReserved, model: targetUsed.model }
                            );
                        } catch (usageError) {
                            logger.error('Failed to finalize usage after mid-stream error', {
                                sessionId,
                                error: usageError instanceof Error ? usageError.message : String(usageError),
                            });
                        }
                    }

                    try {
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify({ error: safe.message, errorCode: safe.code })}\n\n`
                            )
                        );
                        controller.close();
                    } catch {
                        // Stream controller already closed
                    }
                }
            },
        });

        return wrap(
            new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            })
        );
    } catch (error) {
        await cleanupPreFirstToken();
        if (error instanceof SyntaxError) {
            return wrap(
                NextResponse.json(
                    { error: 'Invalid request format', errorCode: 'INVALID_RESPONSE' },
                    { status: 400 }
                )
            );
        }
        if (error instanceof AiProviderError) {
            return safeJsonErrorResponse(error, applyHeaders);
        }
        if (useHandleErrorOnUnknown) {
            return wrap(handleError(error));
        }
        logger.error('AI Chat error', {
            error: error instanceof Error ? error.message : String(error),
        });
        return safeJsonErrorResponse(error, applyHeaders);
    }
}
