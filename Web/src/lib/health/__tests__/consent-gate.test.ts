/**
 * @jest-environment node
 *
 * Unit tests for the shared HEALTH_DATA re-ingestion gate
 * (p3: HEALTH_DATA_WITHDRAWN_INCOMPLETE_CASCADE).
 *
 * The gate must be default-ALLOW: healthTrackingEnabled defaults to false in
 * the schema and is a settings toggle, so denying on the flag alone would
 * lock out every user who never touched it. Rejection applies only while
 * the newest HEALTH_DATA consent record is WITHDRAWN.
 */
import { healthDataConsentWithdrawn } from '../consent-gate';

jest.mock('@/lib/db', () => {
    const state: { user: unknown; consent: unknown; lastConsentQuery?: unknown } = { user: null, consent: null };

    const prisma: any = {
        __state: state,
        user: {
            findUnique: async () => state.user,
        },
        userConsent: {
            findFirst: async (args: { where: { userId: string; consentType: string } }) => {
                state.lastConsentQuery = args.where;
                return state.consent;
            },
        },
    };
    return { prisma };
});

import { prisma } from '@/lib/db';

const ENGINE = prisma as any;

describe('healthDataConsentWithdrawn', () => {
    beforeEach(() => {
        ENGINE.__state.user = { healthTrackingEnabled: false };
        ENGINE.__state.consent = null;
    });

    it('is withdrawn when the latest HEALTH_DATA consent is WITHDRAWN and tracking is off', async () => {
        ENGINE.__state.consent = { action: 'WITHDRAWN' };
        await expect(healthDataConsentWithdrawn('u1')).resolves.toBe(true);
    });

    it('is not withdrawn when the user re-enabled tracking via settings', async () => {
        ENGINE.__state.consent = { action: 'WITHDRAWN' };
        ENGINE.__state.user = { healthTrackingEnabled: true };
        await expect(healthDataConsentWithdrawn('u1')).resolves.toBe(false);
    });

    it('is not withdrawn when the latest consent record is GRANTED', async () => {
        ENGINE.__state.consent = { action: 'GRANTED' };
        await expect(healthDataConsentWithdrawn('u1')).resolves.toBe(false);
    });

    it('is not withdrawn for users with no HEALTH_DATA consent record (default allow)', async () => {
        ENGINE.__state.consent = null;
        await expect(healthDataConsentWithdrawn('u1')).resolves.toBe(false);
    });

    it('treats a missing user row as withdrawn (fail closed)', async () => {
        ENGINE.__state.consent = { action: 'WITHDRAWN' };
        ENGINE.__state.user = null;
        await expect(healthDataConsentWithdrawn('u1')).resolves.toBe(true);
    });

    it('scopes the consent lookup to the requesting user and HEALTH_DATA type', async () => {
        ENGINE.__state.consent = { action: 'GRANTED' };
        await healthDataConsentWithdrawn('user-42');
        expect(ENGINE.__state.lastConsentQuery).toEqual({ userId: 'user-42', consentType: 'HEALTH_DATA' });
    });
});
