jest.mock('jose', () => ({
    SignJWT: jest.fn(),
    jwtVerify: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextRequest: class { },
    NextResponse: {
        json: jest.fn(),
    },
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

jest.mock('@/lib/auth/auth-email', () => ({
    verifyPassword: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

import { jwtVerify } from 'jose';
import { verifyAdminCredentials, verifyAdminToken } from '../auth';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/auth-email';

describe('Admin Auth', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.ADMIN_USERNAME = 'admin';
        process.env.ADMIN_PASSWORD = 'password123';
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('verifyAdminCredentials returns true for correct credentials', async () => {
        expect(await verifyAdminCredentials('admin', 'password123')).toBe(true);
    });

    test('verifyAdminCredentials returns false for incorrect username', async () => {
        expect(await verifyAdminCredentials('wronguser', 'password123')).toBe(false);
    });

    test('verifyAdminCredentials returns false for incorrect password', async () => {
        expect(await verifyAdminCredentials('admin', 'wrongpassword')).toBe(false);
    });

    test('verifyAdminCredentials returns false when env vars are missing', async () => {
        delete process.env.ADMIN_USERNAME;
        expect(await verifyAdminCredentials('admin', 'password123')).toBe(false);
    });

    describe('verifyAdminToken', () => {
        beforeEach(() => {
            jest.spyOn(console, 'error').mockImplementation(() => { });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('returns payload for valid admin token', async () => {
            const mockJwtVerify = jwtVerify as jest.Mock;
            const validPayload = { type: 'admin', username: 'admin' };
            mockJwtVerify.mockResolvedValue({ payload: validPayload });

            const result = await verifyAdminToken('valid.token.here');
            expect(result).toEqual(validPayload);
            expect(mockJwtVerify).toHaveBeenCalledWith(
                'valid.token.here',
                expect.anything(),
                {
                    issuer: 'runflow-admin',
                    audience: 'runflow-admin',
                }
            );
        });

        test('returns null for token with invalid type', async () => {
            const mockJwtVerify = jwtVerify as jest.Mock;
            const invalidPayload = { type: 'user', username: 'admin' };
            mockJwtVerify.mockResolvedValue({ payload: invalidPayload });

            const result = await verifyAdminToken('invalid.type.token');
            expect(result).toBeNull();
        });

        test('returns null and logs error when verification fails', async () => {
            const mockJwtVerify = jwtVerify as jest.Mock;
            mockJwtVerify.mockRejectedValue(new Error('Token expired'));

            const result = await verifyAdminToken('expired.token');
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(
                '[Admin Auth] JWT verification failed:',
                expect.any(Error)
            );
        });
    });

    test('verifyAdminCredentials returns true via database fallback when env vars are missing', async () => {
        delete process.env.ADMIN_USERNAME;
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            isAdmin: true,
            passwordHash: 'hashed_password'
        });
        (verifyPassword as jest.Mock).mockResolvedValue(true);

        expect(await verifyAdminCredentials('dbadmin@example.com', 'dbpassword')).toBe(true);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'dbadmin@example.com' },
            select: { isAdmin: true, passwordHash: true }
        });
        expect(verifyPassword).toHaveBeenCalledWith('dbpassword', 'hashed_password');
    });

    test('verifyAdminCredentials returns false via database fallback if password invalid', async () => {
        delete process.env.ADMIN_USERNAME;
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            isAdmin: true,
            passwordHash: 'hashed_password'
        });
        (verifyPassword as jest.Mock).mockResolvedValue(false);

        expect(await verifyAdminCredentials('dbadmin@example.com', 'wrongpassword')).toBe(false);
    });

    test('verifyAdminCredentials returns false via database fallback if user not admin', async () => {
        delete process.env.ADMIN_USERNAME;
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            isAdmin: false,
            passwordHash: 'hashed_password'
        });

        expect(await verifyAdminCredentials('user@example.com', 'password')).toBe(false);
    });

    test('verifyAdminCredentials returns false when db fallback throws error', async () => {
        delete process.env.ADMIN_USERNAME;

        // Mock console.error to avoid cluttering test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

        try {
            expect(await verifyAdminCredentials('dbadmin@example.com', 'dbpassword')).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
        }
    });

    test('verifyAdminCredentials falls back to database if env vars match fails', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            isAdmin: true,
            passwordHash: 'hashed_password'
        });
        (verifyPassword as jest.Mock).mockResolvedValue(true);

        // Uses 'wrongadmin' instead of expected env var 'admin', should fallback to db
        expect(await verifyAdminCredentials('wrongadmin', 'password123')).toBe(true);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'wrongadmin' },
            select: { isAdmin: true, passwordHash: true }
        });
    });
});
