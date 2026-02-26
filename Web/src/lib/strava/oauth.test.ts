
import { authOptions } from './oauth';
import { prisma } from '@/lib/db';
import { encryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';

// Mock dependencies
jest.mock('@/lib/db', () => ({
    prisma: {
        account: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('@/lib/crypto', () => ({
    encryptToken: jest.fn((token) => `encrypted_${token}`),
    decryptToken: jest.fn((token) => token.replace('encrypted_', '')),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@auth/prisma-adapter', () => ({
    PrismaAdapter: jest.fn(() => ({})),
}));

jest.mock('next-auth/providers/strava', () => jest.fn(() => ({})));
jest.mock('next-auth/providers/credentials', () => jest.fn(() => ({})));

describe('Strava OAuth signIn Callback', () => {
    const signInCallback = authOptions.callbacks?.signIn;

    if (!signInCallback) {
        throw new Error('signIn callback not defined in authOptions');
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should force-update existing Strava account tokens', async () => {
        const mockAccount = {
            provider: 'strava',
            providerAccountId: '12345',
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expires_at: 1234567890,
            token_type: 'Bearer',
            scope: 'read,activity:read_all',
            athlete: { id: 12345 }, // Should be removed
        };

        const mockExistingAccount = {
            id: 'account_id_1',
            userId: 'user_id_1',
        };

        (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockExistingAccount);
        (encryptToken as jest.Mock).mockImplementation((token) => `encrypted_${token}`);

        const result = await signInCallback({ user: {}, account: mockAccount, profile: {} } as any);

        expect(result).toBe(true);

        // Verify athlete object is removed
        expect((mockAccount as any).athlete).toBeUndefined();

        // Verify findUnique was called
        expect(prisma.account.findUnique).toHaveBeenCalledWith({
            where: {
                provider_providerAccountId: {
                    provider: 'strava',
                    providerAccountId: '12345',
                },
            },
        });

        // Verify update was called with encrypted tokens
        expect(prisma.account.update).toHaveBeenCalledWith({
            where: { id: 'account_id_1' },
            data: {
                access_token: 'encrypted_new_access_token',
                refresh_token: 'encrypted_new_refresh_token',
                expires_at: 1234567890,
                token_type: 'Bearer',
                scope: 'read,activity:read_all',
            },
        });

        // Verify account object was updated for adapter
        expect(mockAccount.access_token).toBe('encrypted_new_access_token');
        expect(mockAccount.refresh_token).toBe('encrypted_new_refresh_token');
    });

    it('should encrypt tokens but not update if account does not exist (new user)', async () => {
        const mockAccount = {
            provider: 'strava',
            providerAccountId: '67890',
            access_token: 'access_token_new',
            refresh_token: 'refresh_token_new',
            expires_at: 1234567890,
            token_type: 'Bearer',
            scope: 'read,activity:read_all',
        };

        (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
        (encryptToken as jest.Mock).mockImplementation((token) => `encrypted_${token}`);

        const result = await signInCallback({ user: {}, account: mockAccount, profile: {} } as any);

        expect(result).toBe(true);

        // Verify findUnique was called
        expect(prisma.account.findUnique).toHaveBeenCalledWith({
            where: {
                provider_providerAccountId: {
                    provider: 'strava',
                    providerAccountId: '67890',
                },
            },
        });

        // Verify update was NOT called
        expect(prisma.account.update).not.toHaveBeenCalled();

        // Verify account object was updated for adapter (encryption still happens)
        expect(mockAccount.access_token).toBe('encrypted_access_token_new');
        expect(mockAccount.refresh_token).toBe('encrypted_refresh_token_new');
    });

    it('should skip token logic for credentials provider', async () => {
        const mockAccount = {
            provider: 'credentials',
            type: 'credentials',
        };

        const result = await signInCallback({ user: {}, account: mockAccount, profile: {} } as any);

        expect(result).toBe(true);
        expect(prisma.account.findUnique).not.toHaveBeenCalled();
        expect(encryptToken).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during update', async () => {
        const mockAccount = {
            provider: 'strava',
            providerAccountId: 'error_case',
            access_token: 'token',
        };

        const mockExistingAccount = { id: 'acc_1' };

        (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockExistingAccount);
        (prisma.account.update as jest.Mock).mockRejectedValue(new Error('Database error'));

        const result = await signInCallback({ user: {}, account: mockAccount, profile: {} } as any);

        // Should still return true to allow sign in to proceed
        expect(result).toBe(true);

        expect(logger.error).toHaveBeenCalledWith(
            'Failed to force-update Strava tokens',
            expect.objectContaining({ error: 'Database error' })
        );
    });
});
