/**
 * @jest-environment node
 */

import { updateSyncStatus } from './persistence';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

jest.mock('@/lib/db', () => ({
    prisma: {
        user: { update: jest.fn() },
    },
}));

jest.mock('@/lib/redis', () => ({
    getRedisClient: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockedGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
const mockedUserUpdate = prisma.user.update as jest.Mock;

describe('updateSyncStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUserUpdate.mockResolvedValue({});
    });

    it('bumps the dashboard cache version after updating sync status', async () => {
        const incr = jest.fn().mockResolvedValue(1);
        mockedGetRedisClient.mockResolvedValue({ incr } as never);

        await updateSyncStatus('user-1', { syncInProgress: true });

        expect(mockedUserUpdate).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { syncInProgress: true },
        });
        expect(incr).toHaveBeenCalledWith('dashboard:cachever:user-1');
    });

    it('does not throw when redis is unavailable (null client)', async () => {
        mockedGetRedisClient.mockResolvedValue(null);

        await expect(updateSyncStatus('user-1', { syncInProgress: false })).resolves.toBeUndefined();
        expect(mockedUserUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not throw when redis errors', async () => {
        mockedGetRedisClient.mockRejectedValue(new Error('redis down'));

        await expect(updateSyncStatus('user-1', { lastSyncAt: new Date() })).resolves.toBeUndefined();
    });
});
