import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncActivityById } from '@/lib/strava/sync';
import { createHmac } from 'crypto';
import { checkRateLimitAsync, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';
import { safeBigInt } from '@/lib/utils/bigint';
import { runBackgroundTask } from '@/lib/utils/backgroundTask';
import { logger } from '@/lib/logging/logger';

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
    owner_id: number;
    updates?: Record<string, unknown>;
} {
    if (!body || typeof body !== 'object') return false;
    const payload = body as Record<string, unknown>;

    if (typeof payload.object_type !== 'string') return false;
    if (typeof payload.owner_id !== 'number') return false;

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

    logger.info('[Strava Webhook] FULL URL:', { url: req.url });
    logger.info('[Strava Webhook] HEADERS:', Object.fromEntries(req.headers.entries()));

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

        // Get raw body for signature verification
        const rawBody = await req.text();

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

        const { object_type, aspect_type, object_id, owner_id, updates } = body;

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
                // Delete the User (Cascades to Account, Sessions, Goals, Activities)
                // This ensures we strictly comply with data deletion requests.
                await prisma.user.delete({
                    where: { id: account.userId }
                });
                logger.info(`Deleted user ${account.userId} due to Strava deauthorization.`);
            }
        }

        // Handle Activity Events (create, update, delete)
        if (object_type === 'activity' && object_id && aspect_type) {
            const stravaAthleteId = owner_id.toString();

            // Find user by Strava account
            const account = await prisma.account.findFirst({
                where: {
                    provider: 'strava',
                    providerAccountId: stravaAthleteId
                }
            });

            if (account) {
                if (aspect_type === 'create' || aspect_type === 'update') {
                    // Use background task utility for reliable sync in serverless
                    // This ensures the sync survives the response lifecycle on Vercel
                    // NOTE: For guaranteed execution, upgrade to Next.js 15+ and use after() API
                    const userId = account.userId;
                    const activityId = object_id;
                    runBackgroundTask(async () => {
                        try {
                            await syncActivityById(userId, activityId);
                            logger.info(`[BackgroundTask] Synced activity ${activityId} for user ${userId}`);
                        } catch (error) {
                            logger.error(`[BackgroundTask] Failed to sync activity ${activityId}:`, { error: error instanceof Error ? error.message : String(error) });
                        }
                    });
                } else if (aspect_type === 'delete') {
                    // Delete the activity from our database
                    await prisma.activity.deleteMany({
                        where: { stravaId: safeBigInt(object_id) }
                    });
                    logger.info(`Deleted activity ${object_id} due to Strava webhook.`);
                }
            } else {
                logger.warn(`Webhook: No user found for Strava athlete ${stravaAthleteId}`);
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        logger.error('Webhook error:', { error: error instanceof Error ? error.message : String(error) });
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
