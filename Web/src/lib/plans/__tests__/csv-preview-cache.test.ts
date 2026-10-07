/**
 * @jest-environment node
 *
 * Regression tests for the bounded CSV preview cache (p3:
 * uncapped-upload-parse-preview-retention). The cache is a process-global
 * Map that previously grew without bound for the 15-minute TTL; it now
 * keeps at most MAX_PREVIEWS_PER_USER live entries per user (oldest
 * evicted) while other users' entries are untouched.
 */
import { storePreview, getPreview, deletePreview } from '../csv-preview-cache';

describe('csv preview cache bounds', () => {
    it('evicts the oldest previews of a user beyond the per-user cap', () => {
        const ids = Array.from({ length: 7 }, (_, i) => `preview-${i}`);
        ids.forEach((id, i) => storePreview(id, 'user-a', { workouts: [i] }));

        // First two evicted (7 stored, cap 5)…
        expect(getPreview(`preview-0`)).toBeNull();
        expect(getPreview(`preview-1`)).toBeNull();
        // …the newest five survive.
        for (let i = 2; i < 7; i++) {
            expect(getPreview(`preview-${i}`)).toEqual({ workouts: [i] });
        }
    });

    it('does not evict other users\' previews when one user floods', async () => {
        storePreview('user-b-keep', 'user-b', { workouts: ['keep'] });
        await Promise.resolve();

        for (let i = 0; i < 12; i++) {
            storePreview(`flood-${i}`, 'user-a', { workouts: [i] });
        }

        expect(getPreview('user-b-keep')).toEqual({ workouts: ['keep'] });
        expect(getPreview('flood-11')).toEqual({ workouts: [11] });
        expect(getPreview('flood-0')).toBeNull();
    });

    it('expires entries lazily after their TTL', () => {
        storePreview('ttl-entry', 'user-c', { workouts: [1] }, 5); // 5ms TTL

        expect(getPreview('ttl-entry')).toEqual({ workouts: [1] });

        return new Promise((resolve) => {
            setTimeout(() => {
                expect(getPreview('ttl-entry')).toBeNull();
                resolve(null);
            }, 20);
        });
    });

    it('still deletes explicitly and tolerates unknown ids', () => {
        storePreview('deleted', 'user-d', { workouts: [1] });
        deletePreview('deleted');

        expect(getPreview('deleted')).toBeNull();
        expect(() => deletePreview('never-existed')).not.toThrow();
        expect(getPreview('never-existed')).toBeNull();
    });

    it('prunes expired entries while storing, bounding memory between sweeps', () => {
        storePreview('stale', 'user-e', { workouts: [1] }, 5);

        return new Promise((resolve) => {
            setTimeout(() => {
                // A later store from any user prunes the expired entry even
                // though the 5-minute sweeper has not fired.
                storePreview('fresh', 'user-f', { workouts: [2] });
                expect(getPreview('stale')).toBeNull();
                expect(getPreview('fresh')).toEqual({ workouts: [2] });
                resolve(null);
            }, 20);
        });
    });
});
