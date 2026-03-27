/**
 * External API - Fitness Endpoint
 * 
 * GET /api/external/v1/fitness
 * 
 * Read-only access to historical fitness data (CTL/ATL/TSB) for external AI assistants.
 * Useful for trend analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getExternalApiUser } from '@/lib/api/externalAuth';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders } from '@/lib/rateLimit';
import { validateOrigin, setCorsHeaders } from '@/lib/security/cors';

// Rate limit for external API
const EXTERNAL_API_RATE_LIMIT = { limit: 100, windowSeconds: 60, prefix: 'external-fitness' };

export async function OPTIONS(request: NextRequest) {
    if (!validateOrigin(request)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(request, response.headers);
    return response;
}

export async function GET(request: NextRequest) {
    try {
        if (!validateOrigin(request)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, EXTERNAL_API_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
            const response = NextResponse.json(
                { error: 'Too many requests', code: 'RATE_LIMITED' },
                { status: 429 }
            );
            setCorsHeaders(request, response.headers);
            Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        // Authenticate via API key
        const authResult = await getExternalApiUser(request);
        if (!authResult) {
            const response = NextResponse.json(
                { error: 'Invalid or missing API key', code: 'UNAUTHORIZED' },
                { status: 401 }
            );
            setCorsHeaders(request, response.headers);
            return response;
        }

        const { userId } = authResult;
        const { searchParams } = new URL(request.url);

        // Number of days to fetch (default 90, max 365)
        const days = Math.min(parseInt(searchParams.get('days') || '90'), 365);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch fitness history
        const fitnessData = await prisma.dailyFitness.findMany({
            where: {
                userId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
            select: {
                date: true,
                ctl: true,
                atl: true,
                tsb: true,
                trimp: true,
                runningTss: true,
            },
        });

        // Format data for external consumption
        const formattedData = fitnessData.map(d => ({
            date: d.date.toISOString().split('T')[0],
            ctl: Math.round(d.ctl * 10) / 10,
            atl: Math.round(d.atl * 10) / 10,
            tsb: Math.round(d.tsb * 10) / 10,
            dailyLoad: {
                trimp: Math.round(d.trimp),
                runningTss: Math.round(d.runningTss),
            },
        }));

        // Calculate summary stats
        const latestFitness = fitnessData[fitnessData.length - 1];
        const summary = latestFitness ? {
            currentCtl: Math.round(latestFitness.ctl * 10) / 10,
            currentAtl: Math.round(latestFitness.atl * 10) / 10,
            currentTsb: Math.round(latestFitness.tsb * 10) / 10,
            fitnessStatus: getFitnessStatus(latestFitness.tsb),
            trend: calculateTrend(fitnessData),
        } : null;

        const response = NextResponse.json(
            {
                days,
                dataPoints: formattedData.length,
                summary,
                history: formattedData,
            }
        );
        setCorsHeaders(request, response.headers);
        Object.entries(rateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    } catch (error) {
        console.error('External API fitness error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
        setCorsHeaders(request, response.headers);
        return response;
    }
}

/**
 * Get fitness status based on TSB
 */
function getFitnessStatus(tsb: number): string {
    if (tsb > 25) return 'very_fresh';
    if (tsb > 5) return 'fresh';
    if (tsb >= -10) return 'neutral';
    if (tsb >= -25) return 'tired';
    return 'very_tired';
}

/**
 * Calculate fitness trend from last 7 days vs previous 7 days
 */
function calculateTrend(data: { ctl: number }[]): { ctl: string; direction: number } {
    if (data.length < 14) return { ctl: 'insufficient_data', direction: 0 };

    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);

    const recentAvg = recent.reduce((sum, d) => sum + d.ctl, 0) / 7;
    const previousAvg = previous.reduce((sum, d) => sum + d.ctl, 0) / 7;

    const change = recentAvg - previousAvg;
    const percentChange = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

    let trend = 'stable';
    if (percentChange > 5) trend = 'improving';
    else if (percentChange < -5) trend = 'declining';

    return { ctl: trend, direction: Math.round(percentChange) };
}
