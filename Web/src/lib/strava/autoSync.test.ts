/**
 * @jest-environment node
 */

import { shouldAutoSync, AUTO_SYNC_THRESHOLD_MS } from './autoSync';

const NOW = 1_700_000_000_000;
const MINUTE = 60 * 1000;

describe('shouldAutoSync', () => {
    it('returns false when status is undefined or null', () => {
        expect(shouldAutoSync(undefined, NOW)).toBe(false);
        expect(shouldAutoSync(null, NOW)).toBe(false);
    });

    it('returns false when a sync is already in progress', () => {
        expect(shouldAutoSync({ syncInProgress: true, lastSyncAt: new Date(NOW - 60 * MINUTE).toISOString() }, NOW)).toBe(false);
    });

    it('returns false when the user has never synced (Strava likely not connected)', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: null }, NOW)).toBe(false);
        expect(shouldAutoSync({ syncInProgress: false }, NOW)).toBe(false);
    });

    it('returns false when the last sync is recent', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - 5 * MINUTE).toISOString() }, NOW)).toBe(false);
    });

    it('returns true when the last sync is older than the threshold', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - AUTO_SYNC_THRESHOLD_MS - 1).toISOString() }, NOW)).toBe(true);
    });

    it('accepts Date objects as well as ISO strings', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: new Date(NOW - AUTO_SYNC_THRESHOLD_MS - 1) }, NOW)).toBe(true);
    });

    it('returns false for an unparseable lastSyncAt', () => {
        expect(shouldAutoSync({ syncInProgress: false, lastSyncAt: 'not-a-date' }, NOW)).toBe(false);
    });
});
