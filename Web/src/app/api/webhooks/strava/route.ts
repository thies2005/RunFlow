import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueStravaWebhook, scheduleStravaWebhookDrain } from '@/lib/strava/webhookQueue';
import { createHmac } from 'crypto';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { runBackgroundTask } from '@/lib/utils/backgroundTask';
import { logger } from '@/lib/logging/logger';
import { readBodyWithLimit } from '@/lib/api/bodyLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Verify Strava webhook signature using HMAC-SHA256
 * Strava signs webhooks with: HMAC-SHA256(client_secret, body)
 */
function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientSecret) {
        // SECURITY: Fail closed in production - reject webhooks if secret is missing
        if (process.env.NODE_ENV === 'production') {
            logger.error('CRITICAL: STRAVA_CLIENT_SECRET not set in production!');
            return false;
        }
        logger.warn('STRAVA_CLIENT_SECRET not set, skipping signature verification (dev only)');
        return true;
    }

    if (!signature) {
        logger.warn('No signature provided in webhook request');
        return false;
    }

    const expectedSignature = createHmac('sha256', clientSecret)
        .update(rawBody)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Validate webhook payload structure
 */
function isValidWebhookPayload(body: unknown): body is {
    object_type: string;
    aspect_type?: string;
    object_id?: number;
    event_time?: number;
    owner_id: number;
    updates?: Record<string, unknown>;
} {
    if (!body || typeof body !== 'object') return false;
    const payload = body as Record<string, unknown>;

    if (typeof payload.object_type !== 'string') return false;
    if (typeof payload.owner_id !== 'number' || !Number.isSafeInteger(payload.owner_id) || payload.owner_id <= 0) return false;
    if (payload.updates !== undefined && (!payload.updates || typeof payload.updates !== 'object' || Array.isArray(payload.updates))) return false;

    return true;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = process.env.STRAVA_VERIFY_TOKEN;

    // SECURITY: Fail closed if VERIFY_TOKEN is not configured
    if (!verifyToken) {
        logger.error('CRITICAL: STRAVA_VERIFY_TOKEN not set!');
        return new NextResponse('Server Configuration Error', { status: 500 });
    }


    const receivedToken = token?.trim();
    const expectedToken = verifyToken?.trim();

    logger.info('[Strava Webhook] Token verification:', {
        match: receivedToken === expectedToken
    });

    if (mode === 'subscribe' && receivedToken === expectedToken) {
        logger.info('[Strava Webhook] Verification successful');
        return new NextResponse(JSON.stringify({ 'hub.challenge': challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    logger.warn('[Strava Webhook] Verification failed.', {
        mode,
        hasToken: !!receivedToken,
        tokenLengthMatch: receivedToken?.length === expectedToken?.length
    });
    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        // Rate limiting check (async for Redis support)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = await checkRateLimitAsync(clientId, RATE_LIMITS.webhooks);

        if (!rateLimitResult.allowed) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: rateLimitHeaders(rateLimitResult)
            });
        }

        // Get raw body for signature verification, bounded before the HMAC
        // check runs (p4: no pre-auth size gate existed anywhere in intake).
        const rawBody = await readBodyWithLimit(req);
        if (rawBody === null) {
            return new NextResponse('Payload Too Large', { status: 413 });
        }

        // Verify webhook signature
        const signature = req.headers.get('x-hub-signature');
        if (!verifyWebhookSignature(rawBody, signature)) {
            logger.error('Webhook signature verification failed');
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Parse and validate body
        let body: unknown;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return new NextResponse('Invalid JSON', { status: 400 });
        }

        if (!isValidWebhookPayload(body)) {
            logger.error('Invalid webhook payload structure');
            return new NextResponse('Bad Request', { status: 400 });
        }

        const { object_type, aspect_type, object_id, owner_id, event_time, updates } = body;

        logger.info('Webhook received:', { object_type, aspect_type, owner_id });

        // Handle Deauthorization
        // Event: object_type='athlete', updates={ authorized: 'false' }
        if (object_type === 'athlete' && updates?.authorized === 'false') {
            logger.info(`Deauthorization received for Strava Athlete ${owner_id}`);

            const stravaId = owner_id.toString();

            // Find user connected to this Strava ID
            const account = await prisma.account.findFirst({
                where: {
                    provider: 'strava',
                    providerAccountId: stravaId
                },
                include: { user: true }
            });

            if (account) {
                if (account.user.passwordHash !== null) {
                    await prisma.$transaction(async (tx) => {
                        await tx.account.deleteMany({
                            where: { userId: account.userId, provider: 'strava' }
                        });
                        await tx.user.update({
                            where: { id: account.userId },
                            data: {
                                stravaId: null,
                                stravaAccessToken: null,
                                stravaRefreshToken: null,
                                stravaTokenExpiry: null
                            }
                        });
                    });
                    logger.info(`Disconnected Strava for user ${account.userId} due to Strava deauthorization.`);
                } else {
                    await prisma.$transaction([
                        prisma.apiRouteMetric.deleteMany({ where: { userId: account.userId } }),
                        prisma.errorLog.deleteMany({ where: { userId: account.userId } }),
                        prisma.sessionReplay.deleteMany({ where: { userId: account.userId } }),
                        prisma.user.delete({ where: { id: account.userId } })
                    ]);
                    logger.info(`Deleted user ${account.userId} and telemetry due to Strava deauthorization.`);
                }
            }
        }

        // Acknowledge only after the inbox write commits. Strava retries if
        // delivery failed; the queue handles failures after acknowledgement.
        if (object_type === 'activity' && (aspect_type === 'create' || aspect_type === 'update' || aspect_type === 'delete')) {
            if (!object_id || !Number.isSafeInteger(object_id) || object_id <= 0 ||
                !event_time || !Number.isSafeInteger(event_time) || event_time <= 0) {
                return new NextResponse('Bad Request', { status: 400 });
            }
            const ownerId = owner_id.toString();
            const account = await prisma.account.findFirst({
                where: { provider: 'strava', providerAccountId: ownerId },
                select: { userId: true },
            });
            if (account && await enqueueStravaWebhook(account.userId, ownerId, object_id, event_time, aspect_type, updates)) {
                runBackgroundTask(() => scheduleStravaWebhookDrain(account.userId, aspect_type === 'delete'));
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        logger.error('Webhook error:', { error: error instanceof Error ? error.message : String(error) });
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
