
import { authOptions } from './oauth';
import { prisma } from '@/lib/db';
import { encryptToken } from '@/lib/crypto';
import { logger } from '@/lib/logging/logger';

// Mock dependencies
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        account: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/crypto', () => ({
    encryptToken: jest.fn((token) => `encrypted_${token}`),
    decryptToken: jest.fn((token) => token.replace('encrypted_', '')),
}));

jest.mock('@/lib/auth/auth-email', () => ({
    verifyPassword: jest.fn(),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock next-auth providers
jest.mock('next-auth/providers/strava', () => jest.fn(() => ({})));
jest.mock('next-auth/providers/credentials', () => jest.fn(() => ({})));
jest.mock('@auth/prisma-adapter', () => ({
    PrismaAdapter: jest.fn(() => ({})),
}));

describe('Strava OAuth SignIn Callback', () => {
    const signInCallback = authOptions.callbacks?.signIn;

    if (!signInCallback) {
        throw new Error('SignIn callback is not defined');
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should remove athlete object from account if present', async () => {
        const mockUser = { id: 'user1' };
        const mockAccount = {
            provider: 'strava',
            type: 'oauth',
            providerAccountId: '12345',
            access_token: 'access_token',
            athlete: {
                id: 12345,
                username: 'test_athlete'
            }
        };

        // Create a copy to verify mutation
        const accountPassed = { ...mockAccount };

        await signInCallback({ user: mockUser, account: accountPassed as any, profile: undefined as any, email: undefined as any, credentials: undefined as any });

        expect(accountPassed).not.toHaveProperty('athlete');
        expect((accountPassed as any).athlete).toBeUndefined();
    });

    it('should handle account without athlete object', async () => {
        const mockUser = { id: 'user1' };
        const mockAccount = {
            provider: 'strava',
            type: 'oauth',
            providerAccountId: '12345',
            access_token: 'access_token',
        };

        const accountPassed = { ...mockAccount };

        await signInCallback({ user: mockUser, account: accountPassed as any, profile: undefined as any, email: undefined as any, credentials: undefined as any });

        // Access token will be encrypted, so we can't expect strict equality on the whole object if we don't account for that
        // But here we are just checking it doesn't crash.
        expect(accountPassed.provider).toBe('strava');
    });

    it('should encrypt tokens', async () => {
        const mockUser = { id: 'user1' };
        const mockAccount = {
            provider: 'strava',
            type: 'oauth',
            providerAccountId: '12345',
            access_token: 'raw_access_token',
            refresh_token: 'raw_refresh_token',
        };

        const accountPassed = { ...mockAccount };

        await signInCallback({ user: mockUser, account: accountPassed as any, profile: undefined as any, email: undefined as any, credentials: undefined as any });

        expect(encryptToken).toHaveBeenCalledWith('raw_access_token');
        expect(encryptToken).toHaveBeenCalledWith('raw_refresh_token');
        expect(accountPassed.access_token).toBe('encrypted_raw_access_token');
        expect(accountPassed.refresh_token).toBe('encrypted_raw_refresh_token');
    });
});
