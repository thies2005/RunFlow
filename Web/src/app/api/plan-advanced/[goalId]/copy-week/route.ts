import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { createSnapshot } from '@/lib/plan/snapshot';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ goalId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.settings);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: rateLimitHeaders(rateLimitResult) }
            );
        }

        const { goalId } = await ctx.params;

        const goal = await prisma.goal.findFirst({
            where: { id: goalId, userId: user.id },
            select: { id: true },
        });

        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const body = await req.json();
        const { sourceWeekStart, targetWeekStart, scaleFactor, overwrite } = body;

        if (!sourceWeekStart || !targetWeekStart) {
            return NextResponse.json(
                { error: 'sourceWeekStart and targetWeekStart are required' },
                { status: 400 }
            );
        }

        if (scaleFactor !== undefined) {
            if (typeof scaleFactor !== 'number' || !Number.isFinite(scaleFactor) || scaleFactor < 0.5 || scaleFactor > 2.0) {
                return NextResponse.json(
                    { error: 'scaleFactor must be a number between 0.5 and 2.0' },
                    { status: 400 }
                );
            }
        }

        const srcStart = new Date(sourceWeekStart);
        const tgtStart = new Date(targetWeekStart);

        if (isNaN(srcStart.getTime()) || isNaN(tgtStart.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        // 7 days window (sourceWeekStart to sourceWeekStart + 6 days 23:59:59.999)
        const srcEnd = new Date(srcStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        const tgtEnd = new Date(tgtStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

        // Snapshot before copy
        await createSnapshot(goalId, 'Auto-snapshot before copy week', 'copy_week');

        // Fetch source workouts (capped to <= 28 per operation)
        const sourceWorkouts = await prisma.workout.findMany({
            where: {
                goalId,
                scheduledDate: {
                    gte: srcStart,
                    lte: srcEnd,
                },
            },
            take: 28,
            orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
        });

        if (sourceWorkouts.length === 0) {
            return NextResponse.json({
                success: true,
                count: 0,
                message: 'No workouts found in source week',
            });
        }

        // If overwrite is true, delete existing workouts in target week
        if (overwrite) {
            await prisma.workout.deleteMany({
                where: {
                    goalId,
                    scheduledDate: {
                    gte: tgtStart,
                    lte: tgtEnd,
                },
            },
        });
        }

        const factor = typeof scaleFactor === 'number' && Number.isFinite(scaleFactor) ? scaleFactor : 1;

        let createdCount = 0;

        for (const w of sourceWorkouts.slice(0, 28)) {
            const wDate = new Date(w.scheduledDate);
            // Day offset relative to start of source week (0..6)
            const diffDays = Math.round((wDate.getTime() - srcStart.getTime()) / (24 * 60 * 60 * 1000));
            const clampedOffset = Math.max(0, Math.min(6, diffDays));

            const newScheduledDate = new Date(tgtStart.getTime() + clampedOffset * 24 * 60 * 60 * 1000);
            // Retain the original time components if any
            newScheduledDate.setHours(wDate.getHours(), wDate.getMinutes(), wDate.getSeconds(), wDate.getMilliseconds());

            const scaledDistance = w.targetDistance ? Math.round(w.targetDistance * factor) : w.targetDistance;
            const scaledDuration = w.targetDuration ? Math.round(w.targetDuration * factor) : w.targetDuration;
            const scaledPowerWatts = w.targetPowerWatts ? Math.round(w.targetPowerWatts * factor) : w.targetPowerWatts;
            const scaledPowerMinWatts = w.targetPowerMinWatts ? Math.round(w.targetPowerMinWatts * factor) : w.targetPowerMinWatts;
            const scaledPowerMaxWatts = w.targetPowerMaxWatts ? Math.round(w.targetPowerMaxWatts * factor) : w.targetPowerMaxWatts;
            const scaledPlannedTss = w.plannedTss ? Math.round(w.plannedTss * factor) : w.plannedTss;

            await prisma.workout.create({
                data: {
                    goalId,
                    scheduledDate: newScheduledDate,
                    workoutType: w.workoutType,
                    description: w.description,
                    displayDesc: w.displayDesc,
                    phase: w.phase,
                    order: w.order,
                    notes: w.notes,
                    targetDistance: scaledDistance,
                    targetDuration: scaledDuration,
                    targetPace: w.targetPace,
                    targetPaceMinSecondsPerKm: w.targetPaceMinSecondsPerKm,
                    targetPaceMaxSecondsPerKm: w.targetPaceMaxSecondsPerKm,
                    targetPaceZoneLabel: w.targetPaceZoneLabel,
                    targetHrZone: w.targetHrZone,
                    targetHrMinBpm: w.targetHrMinBpm,
                    targetHrMaxBpm: w.targetHrMaxBpm,
                    targetHrZoneLabel: w.targetHrZoneLabel,
                    targetPowerWatts: scaledPowerWatts,
                    targetPowerMinWatts: scaledPowerMinWatts,
                    targetPowerMaxWatts: scaledPowerMaxWatts,
                    targetPowerZone: w.targetPowerZone,
                    targetFtpPercent: w.targetFtpPercent,
                    targetCadenceRpm: w.targetCadenceRpm,
                    targetRpe: w.targetRpe,
                    intensityZone: w.intensityZone,
                    plannedTss: scaledPlannedTss,
                    sport: w.sport,
                    customName: w.customName,
                    color: w.color,
                    structuredSteps: (w.structuredSteps ?? undefined) as unknown as Prisma.InputJsonValue,
                },
            });

            createdCount++;
        }

        return NextResponse.json({
            success: true,
            count: createdCount,
        });
    } catch (error) {
        console.error('Copy week error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
