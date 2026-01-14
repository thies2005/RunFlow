
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { prisma } from '@/lib/db';
import { AnalyticsService } from '@/lib/services/analytics';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.general);

        if (!rateLimitResult.allowed) {
            return errorResponses.rateLimited(rateLimitResult.retryAfter);
        }

        // Authenticate
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return errorResponses.unauthorized();
        }

        // Parse params
        const searchParams = request.nextUrl.searchParams;
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        if (!startDateParam || !endDateParam) {
            return errorResponses.badRequest('startDate and endDate are required');
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return errorResponses.badRequest('Invalid date format');
        }

        // Fetch data with 90 days buffer for accurate ATL/CTL calculation
        const bufferDays = 90;
        const fetchStartDate = new Date(startDate);
        fetchStartDate.setDate(fetchStartDate.getDate() - bufferDays);

        const activities = await prisma.activity.findMany({
            where: {
                userId: user.id,
                startDate: {
                    gte: fetchStartDate,
                    lte: endDate
                }
            },
            select: {
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true,
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // 1. Calculate Fitness History (CTL, ATL, TSB)
        const fitnessHistory = AnalyticsService.calculateHistory(
            activities,
            startDate,
            endDate
        );

        // Map to Android response format (separate lists, yyyy-MM-dd dates)
        const ctl = fitnessHistory.map(h => ({
            date: h.date.toISOString().split('T')[0],
            value: h.metrics.ctl
        }));

        const atl = fitnessHistory.map(h => ({
            date: h.date.toISOString().split('T')[0],
            value: h.metrics.atl
        }));

        const tsb = fitnessHistory.map(h => ({
            date: h.date.toISOString().split('T')[0],
            value: h.metrics.tsb
        }));

        // 2. Calculate Weekly Totals (Mileage & Time)
        // Group by week start (Monday)
        const weeklyData = new Map<string, { mileage: number, seconds: number }>();

        activities.forEach(activity => {
            if (activity.startDate < startDate) return; // Skip buffer activities for volume

            const d = new Date(activity.startDate);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            const monday = new Date(d.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            const weekKey = monday.toISOString().split('T')[0];

            const current = weeklyData.get(weekKey) || { mileage: 0, seconds: 0 };

            // Mileage (km)
            current.mileage += (activity.distance || 0) / 1000;

            // Time (seconds)
            current.seconds += (activity.movingTime || 0);

            weeklyData.set(weekKey, current);
        });

        const weeklyMileage = Array.from(weeklyData.entries()).map(([week, data]) => ({
            week,
            mileage: parseFloat(data.mileage.toFixed(1))
        })).sort((a, b) => a.week.localeCompare(b.week));

        const totalTime = Array.from(weeklyData.entries()).map(([week, data]) => ({
            week,
            seconds: Math.round(data.seconds)
        })).sort((a, b) => a.week.localeCompare(b.week));

        // 3. Construct Response
        // Note: vo2max history is omitted for now (empty list) as it requires more complex calculation
        const response = {
            vo2max: [],
            ctl,
            atl,
            tsb,
            weeklyMileage,
            totalTime
        };

        return NextResponse.json(response, { headers: rateLimitHeaders(rateLimitResult) });

    } catch (error) {
        return handleApiError(error, {
            path: '/api/mobile/v1/analytics/history'
        });
    }
}
