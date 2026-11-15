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
        const backupsDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

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

        // Get operational telemetry when models exist (guarded for test mocks)
        const prismaAny = prisma as unknown as {
            feedbackJob?: {
                groupBy: (_args: unknown) => Promise<Array<{ status: string; _count: { _all: number } }>>;
                count: (_args: unknown) => Promise<number>;
            };
            aiDailyTokenUsage?: {
                aggregate: (_args: unknown) => Promise<{ _sum: { inputTokens: number | null; outputTokens: number | null } }>;
            };
            errorLog?: {
                count: (_args: unknown) => Promise<number>;
            };
        };

        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);

        const [
            newUsersLast7d,
            feedbackGroups,
            feedbackDoneToday,
            aiUsageToday,
            aiUsage7d,
            unresolvedErrors,
            errorsLast24h,
        ] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: last7d } } }),
            typeof prismaAny.feedbackJob?.groupBy === 'function'
                ? prismaAny.feedbackJob.groupBy({ by: ['status'], _count: { _all: true } })
                : Promise.resolve([]),
            typeof prismaAny.feedbackJob?.count === 'function'
                ? prismaAny.feedbackJob.count({ where: { status: 'DONE', completedAt: { gte: todayStart } } })
                : Promise.resolve(0),
            typeof prismaAny.aiDailyTokenUsage?.aggregate === 'function'
                ? prismaAny.aiDailyTokenUsage.aggregate({
                      where: { date: { gte: todayStart } },
                      _sum: { inputTokens: true, outputTokens: true },
                  })
                : Promise.resolve({ _sum: { inputTokens: 0, outputTokens: 0 } }),
            typeof prismaAny.aiDailyTokenUsage?.aggregate === 'function'
                ? prismaAny.aiDailyTokenUsage.aggregate({
                      where: { date: { gte: last7d } },
                      _sum: { inputTokens: true, outputTokens: true },
                  })
                : Promise.resolve({ _sum: { inputTokens: 0, outputTokens: 0 } }),
            typeof prismaAny.errorLog?.count === 'function'
                ? prismaAny.errorLog.count({ where: { resolved: false } })
                : Promise.resolve(0),
            typeof prismaAny.errorLog?.count === 'function'
                ? prismaAny.errorLog.count({ where: { timestamp: { gte: last24h } } })
                : Promise.resolve(0),
        ]);

        const queueByStatus = feedbackGroups.reduce<Record<string, number>>((acc, row) => {
            acc[row.status] = row._count._all;
            return acc;
        }, {});

        const response = NextResponse.json({
            users: {
                total: totalUsers,
                newToday: newUsersToday,
                newLast7Days: newUsersLast7d,
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
            feedbackQueue: {
                pending: queueByStatus['PENDING'] || 0,
                processing: queueByStatus['PROCESSING'] || 0,
                failed: queueByStatus['FAILED'] || 0,
                doneToday: feedbackDoneToday,
            },
            aiUsage: {
                todayTokens: (aiUsageToday._sum.inputTokens || 0) + (aiUsageToday._sum.outputTokens || 0),
                last7dTokens: (aiUsage7d._sum.inputTokens || 0) + (aiUsage7d._sum.outputTokens || 0),
            },
            monitoring: {
                unresolvedErrors,
                errorsLast24h,
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
