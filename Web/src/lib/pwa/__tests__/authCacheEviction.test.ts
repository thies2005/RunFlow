import { evictAuthBoundCaches, AUTH_BOUND_RUNTIME_CACHES } from '../authCacheEviction';

function installCachesMock(keys: string[]) {
    const deleted: string[] = [];
    const cachesMock = {
        keys: jest.fn().mockResolvedValue(keys),
        delete: jest.fn().mockImplementation((key: string) => {
            deleted.push(key);
            return Promise.resolve(true);
        }),
    };
    Object.defineProperty(global, 'caches', {
        value: cachesMock,
        configurable: true,
        writable: true,
    });
    return { cachesMock, deleted };
}

describe('evictAuthBoundCaches', () => {
    const originalCaches = (global as { caches?: unknown }).caches;

    afterEach(() => {
        Object.defineProperty(global, 'caches', {
            value: originalCaches,
            configurable: true,
            writable: true,
        });
    });

    it('deletes the auth-bound runtime caches (apis, pages, next-data)', async () => {
        const { deleted } = installCachesMock(['apis', 'pages', 'next-data', 'static-image-assets', 'start-url']);

        await evictAuthBoundCaches();

        expect(deleted).toEqual(['apis', 'pages', 'next-data']);
    });

    it('leaves account-independent caches untouched', async () => {
        const { cachesMock } = installCachesMock(['apis', 'google-fonts-webfonts', 'static-js-assets']);

        await evictAuthBoundCaches();

        expect(cachesMock.delete).toHaveBeenCalledTimes(1);
        expect(cachesMock.delete).toHaveBeenCalledWith('apis');
    });

    it('is a no-op when auth-bound caches do not exist', async () => {
        const { cachesMock } = installCachesMock(['static-image-assets', 'static-data-assets']);

        await evictAuthBoundCaches();

        expect(cachesMock.delete).not.toHaveBeenCalled();
    });

    it('notifies the controlling service worker with the eviction message', async () => {
        installCachesMock(['apis']);
        const postMessage = jest.fn();
        Object.defineProperty(window.navigator, 'serviceWorker', {
            value: { controller: { postMessage } },
            configurable: true,
        });

        await evictAuthBoundCaches();

        expect(postMessage).toHaveBeenCalledWith({ type: 'RUNFLOW_EVICT_AUTH_CACHES' });
    });

    it('does not throw when there is no controlling service worker', async () => {
        installCachesMock(['apis']);
        Object.defineProperty(window.navigator, 'serviceWorker', {
            value: undefined,
            configurable: true,
        });

        await expect(evictAuthBoundCaches()).resolves.toBeUndefined();
    });

    it('does not throw when the Cache API is unavailable', async () => {
        Object.defineProperty(global, 'caches', {
            value: undefined,
            configurable: true,
            writable: true,
        });

        await expect(evictAuthBoundCaches()).resolves.toBeUndefined();
    });

    it('does not throw when caches.keys() rejects', async () => {
        Object.defineProperty(global, 'caches', {
            value: {
                keys: jest.fn().mockRejectedValue(new Error('quota')),
                delete: jest.fn(),
            },
            configurable: true,
            writable: true,
        });

        await expect(evictAuthBoundCaches()).resolves.toBeUndefined();
    });

    it('keeps the cache list in sync with the runtimeCaching config', () => {
        expect(AUTH_BOUND_RUNTIME_CACHES).toEqual(['apis', 'pages', 'next-data']);
    });
});
