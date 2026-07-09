import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';
import crypto from 'crypto';

/**
 * Constant-time comparison of a Bearer Authorization header against the secret.
 * Fails closed (returns false) if the secret is unset or the header is missing.
 */
function safeCompareBearer(authHeader: string | null, secret: string | null | undefined): boolean {
    if (!secret) return false; // fail closed when secret unset
    if (!authHeader) return false;
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(authHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (!safeCompareBearer(request.headers.get('authorization'), cronSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const dryRun = searchParams.get('dryRun') === 'true';

        // Find users inactive for more than 3 years (1095 days)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        const inactiveUsers = await prisma.user.findMany({
            where: {
                updatedAt: {
                    lt: threeYearsAgo,
                },
                sessions: {
                    none: {
                        expires: {
                            gte: threeYearsAgo,
                        },
                    },
                },
            },
            select: {
                id: true,
            },
        });

        if (inactiveUsers.length === 0) {
            return NextResponse.json({ message: 'No inactive users found' });
        }

        const userIds = inactiveUsers.map(u => u.id);

        if (dryRun) {
            return NextResponse.json({
                message: `Dry run: ${userIds.length} inactive users would be deleted.`,
                userIds,
            });
        }

        logger.info('Deleting inactive users for GDPR compliance', { userIds });

        // Delete them (Cascade will take care of related data)
        const deleteResult = await prisma.user.deleteMany({
            where: {
                id: {
                    in: userIds,
                },
            },
        });

        return NextResponse.json({
            message: `Successfully deleted ${deleteResult.count} inactive users for GDPR compliance.`,
            deletedCount: deleteResult.count
        });
    } catch (error) {
        console.error('Error running GDPR inactive user cleanup:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
