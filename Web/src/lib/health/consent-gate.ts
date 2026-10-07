import { prisma } from '@/lib/db';

/**
 * Shared re-ingestion gate for withdrawn HEALTH_DATA consent
 * (p3: HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE).
 *
 * Withdrawing HEALTH_DATA consent deletes the user's rows in every
 * userId-scoped health table and records a UserConsent row with action
 * WITHDRAWN. Without a gate on the intake routes, the same clients keep
 * upserting new health rows for the withdrawn category, silently defeating
 * the deletion.
 *
 * The gate intentionally does NOT deny on `healthTrackingEnabled === false`
 * alone: that column defaults to false and is a settings toggle, so using it
 * as a default-deny gate would lock every user who never touched the toggle
 * out of health sync. Instead the health write paths are rejected only while
 * the latest HEALTH_DATA consent record is WITHDRAWN — the state that only a
 * withdrawal creates — unless the user has explicitly re-enabled tracking
 * (settings toggle) or re-granted consent (a newer GRANTED record).
 */
export const HEALTH_DATA_WITHDRAWN_MESSAGE =
    'Health data consent has been withdrawn for this account. Re-grant HEALTH_DATA consent (or re-enable health tracking in settings) before submitting health data.';

/**
 * Returns true while the user's HEALTH_DATA consent is in the withdrawn
 * state: the newest UserConsent record for the category says WITHDRAWN and
 * the user has not explicitly re-enabled health tracking since.
 */
export async function healthDataConsentWithdrawn(userId: string): Promise<boolean> {
    const [user, latestConsent] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { healthTrackingEnabled: true },
        }),
        prisma.userConsent.findFirst({
            where: { userId, consentType: 'HEALTH_DATA' },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return latestConsent?.action === 'WITHDRAWN' && user?.healthTrackingEnabled !== true;
}
