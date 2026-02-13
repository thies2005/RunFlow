/**
 * Admin Stats Endpoint
 * 
 * GET /api/admin/stats
 * 
 * Returns dashboard statistics: user count, session count, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';
import { getCsrfTokenFromCookie, setCsrfCookie } from '@/lib/security/csrf';
import { adminRateLimit, applyRateLimitHeaders } from '@/lib/rateLimitAdmin';
import * as fs from 'fs';
import * as path from 'path';
import { DAY_MS } from '@/lib/constants';
import { handleError } from '@/lib/errors/handler';

export async function GET(request: NextRequest) {
    const rateLimit = await adminRateLimit(request, 'read');
    if (!rateLimit.success) {
        return rateLimit.error;
    }

    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
        return authResult.error;
    }

    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - DAY_MS);
        const last7d = new Date(now.getTime() - 7 * DAY_MS);

        // Get user statistics
        const [
            totalUsers,
            newUsersToday,
            totalActivities,
            activitiesLast7d,
            totalSessions,
            activeSessions
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: { createdAt: { gte: last24h } }
            }),
            prisma.activity.count(),
            prisma.activity.count({
                where: { createdAt: { gte: last7d } }
            }),
            prisma.session.count(),
            prisma.session.count({
                where: { expires: { gt: now } }
            })
        ]);

        // Get last sync info
        const lastSync = await prisma.user.findFirst({
            where: { lastSyncAt: { not: null } },
            orderBy: { lastSyncAt: 'desc' },
            select: { lastSyncAt: true }
        });

        // Get backup info
        let backupCount = 0;
        let lastBackupAt: string | null = null;
        const backupsDir = path.join(process.cwd(), 'backups');

        if (fs.existsSync(backupsDir)) {
            const files = fs.readdirSync(backupsDir)
                .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql'))
                .map(f => ({
                    name: f,
                    time: fs.statSync(path.join(backupsDir, f)).mtime
                }))
                .sort((a, b) => b.time.getTime() - a.time.getTime());

            backupCount = files.length;
            if (files.length > 0) {
                lastBackupAt = files[0].time.toISOString();
            }
        }

        const response = NextResponse.json({
            users: {
                total: totalUsers,
                newToday: newUsersToday,
            },
            activities: {
                total: totalActivities,
                last7Days: activitiesLast7d,
            },
            sessions: {
                total: totalSessions,
                active: activeSessions,
            },
            sync: {
                lastSyncAt: lastSync?.lastSyncAt?.toISOString() ?? null,
            },
            backups: {
                count: backupCount,
                lastBackupAt,
            },
            timestamp: now.toISOString(),
        });

        // Auto-refresh CSRF token if missing or expired
        // Since we are authenticated as admin here, it's safe to issue a new token
        const currentCsrfToken = getCsrfTokenFromCookie(request);
        if (!currentCsrfToken) {
            setCsrfCookie(response);
        }

        return applyRateLimitHeaders(response, 'read', rateLimit.result!.remaining, rateLimit.result!.reset);

    } catch (error) {
        return handleError(error);
    }
}
