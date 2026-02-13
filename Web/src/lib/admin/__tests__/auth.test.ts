jest.mock('jose', () => ({
    SignJWT: jest.fn(),
    jwtVerify: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextRequest: class {},
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

import { verifyAdminCredentials } from '../auth';
import { prisma } from '@/lib/db';

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
});
