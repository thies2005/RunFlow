import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimitAsync, getClientIdentifier, rateLimitHeaders, type RateLimitConfig } from '@/lib/rateLimit';

const EXPORT_RATE_LIMIT: RateLimitConfig = {
    limit: 20,
    windowSeconds: 3600,
    prefix: 'public-plan-export',
};

const exportRequestSchema = z.object({
    format: z.enum(['csv', 'html']),
    plan: z.object({
        raceType: z.string(),
        raceDate: z.string(),
        weeks: z.array(z.object({
            weekNumber: z.number(),
            phase: z.string(),
            workouts: z.array(z.object({
                date: z.string(),
                dayOfWeek: z.string(),
                type: z.string(),
                description: z.string(),
                displayDescription: z.string(),
                distanceKm: z.string(),
                durationMin: z.string(),
                pace: z.string(),
                phase: z.string(),
                intensityZone: z.string().nullable(),
            })),
            totalDistanceKm: z.string(),
        })),
    }),
});

function generateCsv(plan: z.infer<typeof exportRequestSchema>['plan']): string {
    const headers = ['Date', 'Day', 'Type', 'Description', 'Distance (km)', 'Duration', 'Pace', 'Phase', 'Intensity Zone'];
    const lines = [headers.join(',')];

    for (const week of plan.weeks) {
        for (const w of week.workouts) {
            const row = [
                w.date,
                w.dayOfWeek,
                w.type.replace(/_/g, ' '),
                `"${w.description.replace(/"/g, '""')}"`,
                w.distanceKm,
                w.durationMin,
                w.pace,
                w.phase.replace(/_/g, ' '),
                w.intensityZone || '',
            ];
            lines.push(row.join(','));
        }
    }

    return lines.join('\n');
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHtml(plan: z.infer<typeof exportRequestSchema>['plan']): string {
    const phaseColors: Record<string, string> = {
        BASE: '#3b82f6',
        BUILD: '#f59e0b',
        PEAK: '#ef4444',
        TAPER: '#10b981',
        RACE_WEEK: '#eab308',
        RECOVERY: '#8b5cf6',
        ENDURANCE: '#06b6d4',
        MAINTAIN: '#6b7280',
    };

    const typeColors: Record<string, string> = {
        EASY: '#6b7280',
        LONG_RUN: '#a855f7',
        TEMPO: '#f97316',
        INTERVALS: '#ef4444',
        FARTLEK: '#ec4899',
        REPETITIONS: '#dc2626',
        RECOVERY: '#22c55e',
        RACE: '#eab308',
        RIDE: '#3b82f6',
        SWIM: '#06b6d4',
        STRENGTH: '#6366f1',
    };

    const weeksHtml = plan.weeks.map(week => {
        const phaseColor = phaseColors[week.phase] || '#6b7280';
        const workoutsHtml = week.workouts.map(w => {
            const typeColor = typeColors[w.type] || '#6b7280';
            return `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${w.date}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(w.dayOfWeek)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
                    <span style="background:${typeColor};color:white;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${escapeHtml(w.type.replace(/_/g, ' '))}</span>
                </td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(w.description)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${w.distanceKm}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${w.durationMin}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${w.pace}</td>
            </tr>`;
        }).join('');

        return `<div style="margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="background:${phaseColor};color:white;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:700;">Week ${week.weekNumber}</span>
                <span style="background:${phaseColor}20;color:${phaseColor};padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;">${escapeHtml(week.phase.replace(/_/g, ' '))}</span>
                <span style="margin-left:auto;font-size:13px;color:#6b7280;">${week.totalDistanceKm} km</span>
            </div>
            <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:#f9fafb;">
                        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
                        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Day</th>
                        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Type</th>
                        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Workout</th>
                        <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Dist</th>
                        <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Time</th>
                        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb;">Pace</th>
                    </tr>
                </thead>
                <tbody>${workoutsHtml}</tbody>
            </table>
        </div>`;
    }).join('');

    const raceTypeTitle = escapeHtml(plan.raceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${raceTypeTitle} Training Plan - RunFlow</title>
    <style>
        @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #1e293b; }
        h1 { font-size: 24px; margin-bottom: 4px; color: #0f172a; }
        .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    </style>
</head>
<body>
    <h1>${raceTypeTitle} Training Plan</h1>
    <p class="subtitle">Race Date: ${escapeHtml(plan.raceDate)} | Generated by RunFlow</p>
    ${weeksHtml}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:32px;">Generated by <strong>RunFlow</strong> — <a href="https://runflow.app/register" style="color:#e65a2b;">Sign up free</a> for personalized plans with AI coaching, Strava sync, and more.</p>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimitAsync(clientId, EXPORT_RATE_LIMIT);
    const headers = rateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers }
        );
    }

    try {
        const body = await request.json();
        const parsed = exportRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
                { status: 400, headers }
            );
        }

        const { format, plan } = parsed.data;
        const raceTypeSlug = plan.raceType.replace(/\s+/g, '-').toLowerCase();

        if (format === 'csv') {
            const csv = generateCsv(plan);
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="runflow-${raceTypeSlug}-plan.csv"`,
                    ...headers,
                },
            });
        }

        if (format === 'html') {
            const html = generateHtml(plan);
            return new NextResponse(html, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Disposition': `attachment; filename="runflow-${raceTypeSlug}-plan.html"`,
                    ...headers,
                },
            });
        }

        return NextResponse.json({ error: 'Unsupported format' }, { status: 400, headers });
    } catch (err) {
        console.error('Export error:', err);
        return NextResponse.json(
            { error: 'Export failed' },
            { status: 500, headers }
        );
    }
}
