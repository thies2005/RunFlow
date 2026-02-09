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
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';

export const dynamic = 'force-dynamic';

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
