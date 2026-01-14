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

import { verifyAdminCredentials } from '../auth';

describe('Admin Auth', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.ADMIN_USERNAME = 'admin';
        process.env.ADMIN_PASSWORD = 'password123';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('verifyAdminCredentials returns true for correct credentials', () => {
        expect(verifyAdminCredentials('admin', 'password123')).toBe(true);
    });

    test('verifyAdminCredentials returns false for incorrect username', () => {
        expect(verifyAdminCredentials('wronguser', 'password123')).toBe(false);
    });

    test('verifyAdminCredentials returns false for incorrect password', () => {
        expect(verifyAdminCredentials('admin', 'wrongpassword')).toBe(false);
    });

    test('verifyAdminCredentials returns false when env vars are missing', () => {
        delete process.env.ADMIN_USERNAME;
        expect(verifyAdminCredentials('admin', 'password123')).toBe(false);
    });
});
