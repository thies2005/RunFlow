jest.mock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuer: jest.fn().mockReturnThis(),
        setAudience: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('mocked_valid_token'),
    })),
    jwtVerify: jest.fn().mockImplementation(async (token) => {
        if (token === 'mocked_valid_token') {
            return {
                payload: {
                    type: 'admin',
                    username: 'admin',
                    role: 'admin',
                    exp: Math.floor(Date.now() / 1000) + 3600
                }
            };
        } else if (token === 'mocked_wrong_type_token') {
            return {
                payload: {
                    type: 'user',
                    username: 'user',
                    role: 'user',
                    exp: Math.floor(Date.now() / 1000) + 3600
                }
            };
        }
        throw new Error('Invalid token');
    }),
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

import { verifyAdminCredentials, verifyAdminToken, signAdminToken } from '../auth';
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

    describe('verifyAdminToken', () => {
        it('should return null when provided a garbage token string', async () => {
            // Suppress the console.error from the actual implementation during testing
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Providing a garbage token string to trigger the error path in jose
            const result = await verifyAdminToken('garbage_token_string');

            expect(result).toBeNull();
            consoleSpy.mockRestore();
        });

        it('should return null when payload type is not admin', async () => {
            const result = await verifyAdminToken('mocked_wrong_type_token');

            expect(result).toBeNull();
        });

        it('should return a valid payload when token is valid', async () => {
            // Test happy path by creating a real token
            const token = await signAdminToken('admin');
            const result = await verifyAdminToken(token);

            expect(result).not.toBeNull();
            expect(result?.username).toBe('admin');
            expect(result?.type).toBe('admin');
        });
    });
});
