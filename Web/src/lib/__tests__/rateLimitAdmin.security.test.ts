/**
 * @jest-environment node
 */

jest.mock('jose', () => ({
    SignJWT: jest.fn(),
    jwtVerify: jest.fn(),
}));

describe('rateLimitAdmin & Admin Auth Security (SEC-1)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('Test 1: 10 consecutive valid adminRateLimit(req, "read") calls with Redis mocked do not increment admin:violations:* and all 10 succeed', async () => {
        process.env.TRUSTED_PROXY_COUNT = '1';
        process.env.TRUSTED_CLIENT_IP_HEADER = 'x-real-ip';

        const mockRedis = {
            get: jest.fn().mockResolvedValue(null),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            ttl: jest.fn().mockResolvedValue(60),
            del: jest.fn().mockResolvedValue(1),
            set: jest.fn().mockResolvedValue('OK'),
        };

        jest.mock('@/lib/redis', () => ({
            getRedisClient: jest.fn().mockResolvedValue(mockRedis),
        }));

        const { adminRateLimit } = await import('@/lib/rateLimitAdmin');
        const req = new Request('http://localhost/api/admin/stats', {
            headers: {
                'x-real-ip': '1.2.3.4',
            },
        });

        for (let i = 0; i < 10; i++) {
            const res = await adminRateLimit(req, 'read');
            expect(res.success).toBe(true);
        }

        // Verify Redis was queried for block status (read-only)
        expect(mockRedis.get).toHaveBeenCalledWith('admin:violations:1.2.3.4');

        // Confirm client.incr was NEVER called with admin:violations:*
        for (const call of mockRedis.incr.mock.calls) {
            expect(call[0]).not.toContain('violations');
        }
    });

    it('Test 2: 10 unauthenticated adminRateLimit(req, "sensitive") calls without runflow_admin_token cookie block the anon-login bucket on the 8th call, while an authenticated request still succeeds', async () => {
        process.env.TRUSTED_PROXY_COUNT = '0';
        delete process.env.TRUSTED_CLIENT_IP_HEADER;

        jest.mock('@/lib/redis', () => ({
            getRedisClient: jest.fn().mockResolvedValue(null),
        }));

        const { adminRateLimit } = await import('@/lib/rateLimitAdmin');
        const unauthReq = new Request('http://localhost/api/admin/login', {
            method: 'POST',
        });

        const results = [];
        for (let i = 0; i < 10; i++) {
            const res = await adminRateLimit(unauthReq, 'sensitive');
            results.push(res);
        }

        // Calls 1-3 succeed (limit is 3 for sensitive)
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(results[2].success).toBe(true);

        // Calls 4-7 fail due to rate limit and accumulate violations
        expect(results[3].success).toBe(false);
        expect(results[4].success).toBe(false);
        expect(results[5].success).toBe(false);
        expect(results[6].success).toBe(false);

        // Call 8 records the 5th violation (reaching VIOLATION_THRESHOLD = 5)
        expect(results[7].success).toBe(false);

        // Calls 9 and 10 are completely blocked due to violation threshold
        expect(results[8].success).toBe(false);
        const errorBody8 = await results[8].error?.json();
        expect(errorBody8?.error).toBe('Too many violations - IP temporarily blocked');

        // Subsequent authenticated request using admin cookie must NOT be blocked
        const authReq = new Request('http://localhost/api/admin/users', {
            headers: {
                cookie: 'runflow_admin_token=valid-admin-session',
            },
        });

        const authResult = await adminRateLimit(authReq, 'sensitive');
        expect(authResult.success).toBe(true);
    });

    it('Test 3: verifyAdminCredentials binds fallback username to admin', async () => {
        const bcrypt = await import('bcryptjs');
        const password = 'SuperSecretAdminPassword123!';
        const hash = await bcrypt.hash(password, 10);

        process.env.ADMIN_PASSWORD_HASH = hash;
        delete process.env.ADMIN_USERNAME;
        delete process.env.ADMIN_PASSWORD;

        jest.mock('@/lib/db', () => ({
            prisma: {
                user: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
            },
        }));

        const { verifyAdminCredentials } = await import('@/lib/admin/auth');

        // Spoofed username must return false
        const spoofedResult = await verifyAdminCredentials('spoofed-actor', password);
        expect(spoofedResult).toBe(false);

        // Another random username must return false
        const anotherResult = await verifyAdminCredentials('attacker', password);
        expect(anotherResult).toBe(false);

        // Fallback username 'admin' with correct password must return true
        const adminResult = await verifyAdminCredentials('admin', password);
        expect(adminResult).toBe(true);

        // 'admin' with wrong password must return false
        const wrongPassResult = await verifyAdminCredentials('admin', 'WrongPassword!');
        expect(wrongPassResult).toBe(false);
    });
});
