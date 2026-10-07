/**
 * @jest-environment node
 *
 * Regression tests for the p2a fix: the mobile email-login route must not let
 * an anonymous caller lock out a victim's account - the per-email failure
 * counter is keyed on client identifier + email and only FAILED verifications
 * are counted. The per-client gate remains the guessing defense.
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getClientIdentifier } from '@/lib/rateLimit';

const mockUserFindUnique = jest.fn();
const mockVerifyPassword = jest.fn();
const mockGenerateTokenPair = jest.fn();

jest.mock('@/lib/db', () => ({
    prisma: {
        user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    },
}));

jest.mock('@/lib/auth/auth-email', () => ({
    verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

jest.mock('@/lib/mobile/auth', () => ({
    generateTokenPair: (...args: unknown[]) => mockGenerateTokenPair(...args),
}));

jest.mock('@/lib/logging/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const VICTIM_EMAIL = 'victim@example.com';

const seedUser = () => ({
    id: 'user-1',
    email: VICTIM_EMAIL,
    name: 'Victim',
    image: null,
    passwordHash: '$2a$12$hash',
    tokenVersion: 0,
    emailVerified: null,
});

function loginRequest(clientIp: string, password: string): NextRequest {
    return new NextRequest('http://localhost/api/mobile/v1/auth/email-login', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            // default TRUSTED_PROXY_HOPS=1: rightmost entry is the proxy-appended client IP
            'x-forwarded-for': `spoofable-leftmost, ${clientIp}`,
            'user-agent': 'runflow-android/test',
        },
        body: JSON.stringify({ email: VICTIM_EMAIL, password }),
    });
}

describe('POST /api/mobile/v1/auth/email-login', () => {
    const originalEnv = process.env;
    let nowSpy: jest.SpyInstance;
    let clock = Date.now();

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.REDIS_URL;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.TRUSTED_PROXY_HOPS;
        delete process.env.TRUSTED_CLIENT_IP_HEADER;

        mockUserFindUnique.mockResolvedValue(seedUser());
        mockVerifyPassword.mockResolvedValue(false);
        mockGenerateTokenPair.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 });

        // Controllable clock so per-client (5/60s) and failure (5/300s) windows
        // can be exercised deterministically.
        clock = Date.now();
        nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    });

    afterEach(() => {
        nowSpy.mockRestore();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('REGRESSION: 5 anonymous wrong-password attempts must NOT block the victim from another client', async () => {
        const attackerIp = '203.0.113.50';
        for (let i = 0; i < 5; i++) {
            clock += 61_000; // keep the attacker under the per-client 5/60s gate
            const res = await POST(loginRequest(attackerIp, 'wrong'));
            expect(res.status).toBe(401);
        }

        // Victim from their own client with the correct password succeeds
        mockVerifyPassword.mockResolvedValue(true);
        const res = await POST(loginRequest('198.51.100.20', 'correct'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.user.id).toBe('user-1');
        expect(mockGenerateTokenPair).toHaveBeenCalledWith('user-1', 0);
    });

    it('REGRESSION: a correct-password login is never throttled by prior failures (only failed verifies count)', async () => {
        const ip = '203.0.113.51';
        for (let i = 0; i < 4; i++) {
            clock += 61_000;
            const res = await POST(loginRequest(ip, 'wrong'));
            expect(res.status).toBe(401);
        }

        clock += 61_000;
        mockVerifyPassword.mockResolvedValue(true);
        const res = await POST(loginRequest(ip, 'correct'));
        expect(res.status).toBe(200);
    });

    it('the failure counter is keyed per client + email: 5 failures from one client throttle only that client', async () => {
        const attackerIp = '203.0.113.52';
        for (let i = 0; i < 5; i++) {
            clock += 61_000; // spaced so only the failure window fills
            const res = await POST(loginRequest(attackerIp, 'wrong'));
            expect(res.status).toBe(401);
        }

        // 6th failed verification from the SAME client: the per-account failure
        // window (300s) is full while the per-client window (60s) is not, so
        // the 429 comes from the failure counter.
        clock += 6_000;
        const res = await POST(loginRequest(attackerIp, 'wrong'));
        expect(res.status).toBe(429);
        const body = await res.json();
        expect(body.error).toContain('Too many login attempts for this account');

        // A different client failing the same account is NOT blocked
        const other = await POST(loginRequest('198.51.100.21', 'wrong'));
        expect(other.status).toBe(401);
    });

    it('a successful login clears that client+email failure counter', async () => {
        const ip = '203.0.113.53';
        for (let i = 0; i < 4; i++) {
            clock += 61_000;
            await POST(loginRequest(ip, 'wrong'));
        }

        clock += 61_000;
        mockVerifyPassword.mockResolvedValue(true);
        expect((await POST(loginRequest(ip, 'correct'))).status).toBe(200);

        // Counter was reset by the success: 4 more failures still answer 401
        mockVerifyPassword.mockResolvedValue(false);
        for (let i = 0; i < 4; i++) {
            clock += 61_000;
            const res = await POST(loginRequest(ip, 'wrong'));
            expect(res.status).toBe(401);
        }
    });

    it('per-client gate (5/60s) still throttles a single grinding client', async () => {
        const ip = '203.0.113.54';
        for (let i = 0; i < 5; i++) {
            const res = await POST(loginRequest(ip, 'wrong'));
            expect(res.status).toBe(401);
        }
        // 6th request within 60s from the same client: per-client 429
        const res = await POST(loginRequest(ip, 'wrong'));
        expect(res.status).toBe(429);
        const body = await res.json();
        expect(body.error).toContain('Too many login attempts');
    });

    it('returns 401 for unknown accounts without creating denial state for real users', async () => {
        mockUserFindUnique.mockImplementation(({ where }: { where: { email: string } }) =>
            where.email === VICTIM_EMAIL ? Promise.resolve(seedUser()) : Promise.resolve(null));

        const attackerRequest = (email: string) =>
            new NextRequest('http://localhost/api/mobile/v1/auth/email-login', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-forwarded-for': 'spoofable-leftmost, 203.0.113.55',
                    'user-agent': 'runflow-android/test',
                },
                body: JSON.stringify({ email, password: 'whatever' }),
            });

        for (let i = 0; i < 5; i++) {
            clock += 61_000;
            const res = await POST(attackerRequest('ghost@example.com'));
            expect(res.status).toBe(401);
        }

        mockVerifyPassword.mockResolvedValue(true);
        const res = await POST(loginRequest('198.51.100.22', 'correct'));
        expect(res.status).toBe(200);
    });

    it('uses the proxy-appended (rightmost) XFF entry as the client identity', async () => {
        // Sanity: the real getClientIdentifier keys both requests identically
        // even though the attacker-controlled leftmost entry differs.
        const a = new Request('http://localhost', {
            headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.56', 'user-agent': 'x' },
        });
        const b = new Request('http://localhost', {
            headers: { 'x-forwarded-for': '2.2.2.2, 203.0.113.56', 'user-agent': 'y' },
        });
        expect(getClientIdentifier(a)).toBe(getClientIdentifier(b));
    });
});
