import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncActivityById } from '@/lib/strava/sync';
import { createHmac } from 'crypto';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitHeaders } from '@/lib/rateLimit';

/**
 * Safely convert a value to BigInt, handling edge cases
 */
function safeBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

const VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || "STRAVA";
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

/**
 * Verify Strava webhook signature using HMAC-SHA256
 * Strava signs webhooks with: HMAC-SHA256(client_secret, body)
 */
function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!CLIENT_SECRET) {
        console.warn('STRAVA_CLIENT_SECRET not set, skipping signature verification');
        return true; // Allow in development without secret
    }

    if (!signature) {
        console.warn('No signature provided in webhook request');
        return false;
    }

    const expectedSignature = createHmac('sha256', CLIENT_SECRET)
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
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        return new NextResponse(JSON.stringify({ 'hub.challenge': challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        // Rate limiting check (generous limit for webhooks)
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.webhooks);

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
            console.error('Webhook signature verification failed');
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
            console.error('Invalid webhook payload structure');
            return new NextResponse('Bad Request', { status: 400 });
        }

        const { object_type, aspect_type, object_id, owner_id, updates } = body;

        console.log('Webhook received:', { object_type, aspect_type, owner_id });

        // Handle Deauthorization
        // Event: object_type='athlete', updates={ authorized: 'false' }
        if (object_type === 'athlete' && updates?.authorized === 'false') {
            console.log(`Deauthorization received for Strava Athlete ${owner_id}`);

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
                console.log(`Deleted user ${account.userId} due to Strava deauthorization.`);
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
                    // Fire-and-forget: sync the activity without awaiting
                    // This ensures we return 200 immediately to Strava
                    syncActivityById(account.userId, object_id).catch((error) => {
                        console.error(`Webhook sync error for activity ${object_id}:`, error);
                    });
                } else if (aspect_type === 'delete') {
                    // Delete the activity from our database
                    await prisma.activity.deleteMany({
                        where: { stravaId: safeBigInt(object_id) }
                    });
                    console.log(`Deleted activity ${object_id} due to Strava webhook.`);
                }
            } else {
                console.warn(`Webhook: No user found for Strava athlete ${stravaAthleteId}`);
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
        console.error('Webhook error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
