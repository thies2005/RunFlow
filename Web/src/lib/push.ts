import webpush from 'web-push';
import { prisma } from '@/lib/db';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.NEXTAUTH_URL?.startsWith('https')
    ? process.env.NEXTAUTH_URL
    : 'mailto:admin@runflow.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } catch (e) {
        console.warn('Failed to set VAPID details:', e);
    }
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;       // Group notifications by tag
    url?: string;       // URL to open on click
    data?: Record<string, unknown>;
}

/**
 * Send a push notification to all subscribed devices of a user.
 * Automatically cleans up invalid/expired subscriptions.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured, skipping push notification');
        return { sent: 0, failed: 0 };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
    });

    if (subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/app-icon-192.png',
        badge: payload.badge || '/icons/app-icon-192.png',
        tag: payload.tag,
        data: {
            url: payload.url || '/',
            ...payload.data,
        },
    });

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    notificationPayload,
                    { TTL: 3600 } // 1 hour TTL
                );
                sent++;
            } catch (error: any) {
                failed++;
                // 404 or 410 means the subscription is no longer valid
                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    expiredIds.push(sub.id);
                } else {
                    console.error(`Push failed for subscription ${sub.id}:`, error?.message || error);
                }
            }
        })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { id: { in: expiredIds } },
        });
        console.log(`Cleaned up ${expiredIds.length} expired push subscriptions for user ${userId}`);
    }

    return { sent, failed };
}

/**
 * Get the VAPID public key for client-side subscription.
 */
export function getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
}
