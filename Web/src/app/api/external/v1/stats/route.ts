export const dynamic = 'force-dynamic';
/**
 * External API - Stats Endpoint
 * 
 * GET /api/external/v1/stats
 * 
 * Read-only access to user training stats and metrics for external AI assistants.
 * Returns: VO2max, marathon shape, weekly mileage, fitness metrics (CTL/ATL/TSB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getExternalApiUser } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';
import { AnalyticsService } from '@/lib/services/analytics';
import { ensureFitnessCacheUpToDate } from '@/lib/metrics/fitnessCache';

// Rate limit for external API
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external-stats' };

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429, headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
            );
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            return NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401, headers: corsHeaders }
            );
        }

        const { userId, user } = authResult;

        // Fetch user settings
        const userSettings = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                hrMax: true,
                hrRest: true,
                weight: true,
                hrZone1Max: true,
                hrZone2Max: true,
                hrZone3Max: true,
                hrZone4Max: true,
                vdotCorrectionFactor: true,
                includeCrossTraining: true,
            }
        });

        const maxHR = userSettings?.hrMax || 185;
        const vdotCorrectionFactor = userSettings?.vdotCorrectionFactor || 1.0;
        const includeCrossTraining = userSettings?.includeCrossTraining ?? true;

        // Fetch activities from last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const activities = await prisma.activity.findMany({
            where: {
                userId,
                startDate: { gte: sixMonthsAgo },
            },
            select: {
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true,
                averageHr: true,
                hasHeartrate: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            },
            orderBy: { startDate: 'desc' },
        });

        // Split activities
        const runActivities = activities.filter(a => a.type === 'RUN');
        const crossTrainingActivities = activities.filter(a =>
            ['RIDE', 'VIRTUAL_RIDE', 'SWIM', 'WORKOUT'].includes(a.type)
        );

        // Calculate metrics
        const currentWeekMileage = AnalyticsService.calculateCurrentWeekMileage(runActivities);
        const { rawVO2max, effectiveVO2max } = AnalyticsService.calculateVO2max(
            runActivities, maxHR, vdotCorrectionFactor
        );
        const marathonShape = AnalyticsService.calculateShape(
            runActivities,
            includeCrossTraining ? crossTrainingActivities : [],
            effectiveVO2max
        );

        // First ensure cache is up to date, THEN fetch max values
        const currentFitness = await ensureFitnessCacheUpToDate(userId);

        // Now fetch max and goal (after cache is updated)
        const [maxFitnessValues, activeGoal] = await Promise.all([
            prisma.dailyFitness.aggregate({
                where: { userId },
                _max: { ctl: true, atl: true }
            }),
            prisma.goal.findFirst({
                where: { userId, isActive: true },
                select: { currentVdot: true }
            })
        ]);

        const ctl = currentFitness ? Math.round(currentFitness.ctl) : 0;
        const atl = currentFitness ? Math.round(currentFitness.atl) : 0;
        const tsb = currentFitness ? Math.round(currentFitness.tsb) : 0;
        const workloadRatio = currentFitness && currentFitness.ctl > 0
            ? parseFloat((currentFitness.atl / currentFitness.ctl).toFixed(2))
            : 0;

        return NextResponse.json(
            {
                user: {
                    name: user.name,
                    settings: {
                        hrMax: maxHR,
                        hrRest: userSettings?.hrRest || null,
                        weight: userSettings?.weight || null,
                        vdotCorrectionFactor,
                        hrZones: {
                            zone1: userSettings?.hrZone1Max || Math.round(maxHR * 0.65),
                            zone2: userSettings?.hrZone2Max || Math.round(maxHR * 0.77),
                            zone3: userSettings?.hrZone3Max || Math.round(maxHR * 0.84),
                            zone4: userSettings?.hrZone4Max || Math.round(maxHR * 0.90),
                            zone5: maxHR,
                        }
                    }
                },
                stats: {
                    currentWeekMileage: {
                        km: Math.round(currentWeekMileage / 100) / 10,
                        meters: currentWeekMileage,
                    },
                    vo2max: {
                        effective: effectiveVO2max,
                        raw: rawVO2max,
                        correctionFactor: vdotCorrectionFactor,
                    },
                    marathonShape: {
                        percentage: marathonShape?.shape || 0,
                        mileageScore: marathonShape?.mileageScore || 0,
                        longRunScore: marathonShape?.longRunScore || 0,
                    },
                    fitness: {
                        ctl, // Chronic Training Load (fitness)
                        atl, // Acute Training Load (fatigue)
                        tsb, // Training Stress Balance (form)
                        workloadRatio,
                        maxCtl: Math.round(maxFitnessValues._max.ctl || 0),
                        maxAtl: Math.round(maxFitnessValues._max.atl || 0),
                        calculatedAt: new Date().toISOString(),
                    },
                    currentVdot: activeGoal?.currentVdot || effectiveVO2max,
                    hrMax: maxHR,
                },
                generatedAt: new Date().toISOString(),
            },
            { headers: { ...corsHeaders, ...rateLimitHeaders(rateLimitResult) } }
        );
    } catch (error) {
        console.error('External API stats error:', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500, headers: corsHeaders }
        );
    }
}
