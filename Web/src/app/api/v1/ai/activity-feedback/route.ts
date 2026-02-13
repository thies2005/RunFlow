import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';
import { prisma } from '@/lib/db';
import {
    getAiConfig,
    buildUserContext,
    buildActivityContext,
    formatContextForAi,
    checkUsageLimit,
    incrementUsage,
    ACTIVITY_FEEDBACK_PROMPTS,
} from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { setApiVersionHeaders } from '@/lib/api/version';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const { searchParams } = new URL(request.url);
        const activityId = searchParams.get('activityId');

        if (!activityId) {
            const response = NextResponse.json({ error: 'activityId required' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const activity = await prisma.activity.findFirst({
            where: { id: activityId, userId: session.user.id },
        });

        if (!activity) {
            const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const feedback = await prisma.activityAiFeedback.findUnique({
            where: { activityId },
        });

        const response = NextResponse.json({
            feedback: feedback || null,
            cached: !!feedback,
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Get activity feedback error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userId = session.user.id;
        const body = await request.json();
        const { activityId, regenerate = false } = body as { activityId: string; regenerate?: boolean };

        if (!activityId) {
            const response = NextResponse.json({ error: 'activityId required' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const activity = await prisma.activity.findFirst({
            where: { id: activityId, userId },
        });

        if (!activity) {
            const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (!regenerate) {
            const existing = await prisma.activityAiFeedback.findUnique({
                where: { activityId },
            });

            if (existing) {
                const response = NextResponse.json({
                    feedback: existing,
                    cached: true,
                });
                setApiVersionHeaders(response.headers);
                return response;
            }
        }

        const config = await getAiConfig(userId);
        if (!config) {
            const response = NextResponse.json({ error: 'AI features not enabled' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const usageStatus = await checkUsageLimit(userId);
        if (!usageStatus.canUse) {
            const response = NextResponse.json({ error: usageStatus.reason }, { status: 429 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const userContext = await buildUserContext(userId);
        const activityContext = await buildActivityContext(activityId);

        if (!activityContext) {
            const response = NextResponse.json({ error: 'Could not load activity' }, { status: 500 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const baseContext = formatContextForAi(userContext);
        const activityStr = formatActivityForAi(activityContext);

        const [plannedComparison, progressAnalysis, goalTrajectory] = await Promise.all([
            generateFeedback(config, ACTIVITY_FEEDBACK_PROMPTS.plannedComparison, baseContext, activityStr),
            generateFeedback(config, ACTIVITY_FEEDBACK_PROMPTS.progressAnalysis, baseContext, activityStr),
            generateFeedback(config, ACTIVITY_FEEDBACK_PROMPTS.goalTrajectory, baseContext, activityStr),
        ]);

        const feedback = await prisma.activityAiFeedback.upsert({
            where: { activityId },
            create: {
                activityId,
                plannedComparison,
                progressAnalysis,
                goalTrajectory,
            },
            update: {
                plannedComparison,
                progressAnalysis,
                goalTrajectory,
                generatedAt: new Date(),
            },
        });

        await incrementUsage(userId);

        const response = NextResponse.json({
            feedback,
            cached: false,
        });
        setApiVersionHeaders(response.headers);
        return response;
    } catch (error) {
        console.error('Generate activity feedback error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        setApiVersionHeaders(response.headers);
        return response;
    }
}

import { AiConfig } from '@/lib/ai/providers';

async function generateFeedback(
    config: AiConfig,
    prompt: string,
    userContext: string,
    activityContext: string
): Promise<string> {
    const { generateCompletion } = await import('@/lib/ai/providers');

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a running coach analyzing an athlete's activity.\n\n${prompt}\n\n--- Athlete Profile ---\n${userContext}`,
        },
        {
            role: 'user',
            content: `Here's the activity to analyze:\n\n${activityContext}`,
        },
    ];

    return generateCompletion(config, messages);
}

function formatActivityForAi(ctx: NonNullable<Awaited<ReturnType<typeof buildActivityContext>>>): string {
    const a = ctx.activity;
    let str = `Activity: ${a.name}\n`;
    str += `Date: ${a.date}\n`;
    str += `Type: ${a.type}\n`;
    str += `Distance: ${(a.distance / 1000).toFixed(2)}km\n`;
    str += `Duration: ${Math.floor(a.duration / 60)}:${(a.duration % 60).toString().padStart(2, '0')}\n`;
    str += `Pace: ${Math.floor(a.pace / 60)}:${Math.floor(a.pace % 60).toString().padStart(2, '0')}/km\n`;

    if (a.avgHr) str += `Avg HR: ${a.avgHr.toFixed(0)} bpm\n`;
    if (a.maxHr) str += `Max HR: ${a.maxHr} bpm\n`;
    if (a.elevationGain) str += `Elevation Gain: ${a.elevationGain.toFixed(0)}m\n`;
    if (a.trimp) str += `TRIMP: ${a.trimp.toFixed(1)}\n`;
    if (a.tss) str += `TSS: ${a.tss.toFixed(1)}\n`;

    if (a.hrZones && a.hrZones.length > 0) {
        str += `HR Zone breakdown: ${a.hrZones.map(z => `Z${z.zone}: ${Math.round(z.seconds / 60)}min`).join(', ')}\n`;
    }

    if (ctx.plannedWorkout) {
        str += `\nPlanned workout for this day:\n`;
        str += `Type: ${ctx.plannedWorkout.type}\n`;
        str += `Description: ${ctx.plannedWorkout.description}\n`;
        if (ctx.plannedWorkout.targetDistance) str += `Target distance: ${(ctx.plannedWorkout.targetDistance / 1000).toFixed(1)}km\n`;
        if (ctx.plannedWorkout.targetPace) str += `Target pace: ${Math.floor(ctx.plannedWorkout.targetPace / 60)}:${Math.floor(ctx.plannedWorkout.targetPace % 60).toString().padStart(2, '0')}/km\n`;
    } else {
        str += `\nNo specific workout was planned for this day.\n`;
    }

    return str;
}
