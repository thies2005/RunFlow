import { NextRequest, NextResponse } from 'next/server';
import { errorResponses, handleApiError } from '@/lib/api/apiResponse';
import { prisma } from '@/lib/db';
import { mobileActivitySelect, serializeMobileActivity } from '@/lib/mobile/activityList';
import { getAuthenticatedUser } from '@/lib/mobile/auth';
import { checkRateLimitAsync, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const SNAPSHOT_PAGE_SIZE = 500;
const DELTA_PAGE_SIZE = 100;
const MAX_VERSION = (1n << 63n) - 1n;

type Cursor = { watermark: bigint; after?: string };

function encodeCursor(userId: string, { watermark, after }: Cursor) {
    return Buffer.from(JSON.stringify([1, userId, watermark.toString(), after ?? null])).toString('base64url');
}

function decodeCursor(token: string, userId: string): Cursor | null {
    if (token.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
    try {
        const value: unknown = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        if (!Array.isArray(value) || value.length !== 4) return null;
        const [format, owner, version, after] = value;
        if (format !== 1 || owner !== userId || typeof version !== 'string' || !/^\d{1,19}$/.test(version)) return null;
        const watermark = BigInt(version);
        if (watermark > MAX_VERSION || (after !== null && (typeof after !== 'string' || !after.length || after.length > 200))) return null;
        return { watermark, after: after ?? undefined };
    } catch {
        return null;
    }
}

const reset = { activities: [], deletedIds: [], cursor: '', hasMore: false, reset: true };

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return errorResponses.unauthorized();

        const quota = await checkRateLimitAsync(user.id, RATE_LIMITS.activityChanges);
        if (!quota.allowed) return errorResponses.rateLimited(quota.retryAfter);

        const headers = {
            ...rateLimitHeaders(quota),
            'Cache-Control': 'private, no-store',
        };
        const token = request.nextUrl.searchParams.get('cursor');
        const cursor = token === null ? null : decodeCursor(token, user.id);
        if (token !== null && !cursor) return NextResponse.json(reset, { headers });

        const result = await prisma.$transaction(async tx => {
            const clock = await tx.activityFeedClock.findUnique({
                where: { userId: user.id },
                select: { version: true, minimum: true },
            });
            const currentVersion = clock?.version ?? 0n;
            if (cursor && (cursor.watermark < (clock?.minimum ?? 0n) || cursor.watermark > currentVersion)) {
                return reset;
            }

            // Continue scanning by stable ID. Rows written behind the keyset
            // boundary will be replayed from the first page's watermark.
            if (!cursor || cursor.after !== undefined) {
                const rows = await tx.activity.findMany({
                    where: { userId: user.id, ...(cursor?.after ? { id: { gt: cursor.after } } : {}) },
                    orderBy: { id: 'asc' },
                    take: SNAPSHOT_PAGE_SIZE + 1,
                    select: mobileActivitySelect,
                });
                const hasMore = rows.length > SNAPSHOT_PAGE_SIZE;
                const page = rows.slice(0, SNAPSHOT_PAGE_SIZE);
                return {
                    activities: page.map(serializeMobileActivity),
                    deletedIds: [],
                    cursor: encodeCursor(user.id, {
                        watermark: cursor?.watermark ?? currentVersion,
                        after: hasMore ? page.at(-1)?.id : undefined,
                    }),
                    hasMore,
                };
            }

            const changes = await tx.activityFeedChange.findMany({
                where: { userId: user.id, version: { gt: cursor.watermark } },
                orderBy: { version: 'asc' },
                take: DELTA_PAGE_SIZE + 1,
                select: { activityId: true, version: true, deletedAt: true },
            });
            const hasMore = changes.length > DELTA_PAGE_SIZE;
            const page = changes.slice(0, DELTA_PAGE_SIZE);
            const ids = page.filter(change => change.deletedAt === null).map(change => change.activityId);
            const activities = ids.length ? await tx.activity.findMany({
                where: { userId: user.id, id: { in: ids } },
                select: mobileActivitySelect,
            }) : [];
            return {
                activities: activities.map(serializeMobileActivity),
                deletedIds: page.filter(change => change.deletedAt !== null).map(change => change.activityId),
                cursor: encodeCursor(user.id, { watermark: hasMore ? page.at(-1)!.version : currentVersion }),
                hasMore,
            };
        }, { isolationLevel: 'RepeatableRead' });

        return NextResponse.json(result, { headers });
    } catch (error) {
        return handleApiError(error, { path: '/api/mobile/v1/activities/changes' });
    }
}
