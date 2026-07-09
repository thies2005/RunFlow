/**
 * @jest-environment node
 */
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mocks
const mockExchangeStravaCodeForTokens = jest.fn();

jest.mock('@/lib/mobile/auth', () => ({
    exchangeStravaCodeForTokens: (...args: any[]) => mockExchangeStravaCodeForTokens(...args),
}));

jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
    getClientIdentifier: jest.fn().mockReturnValue('test-client'),
    rateLimitHeaders: jest.fn().mockReturnValue({}),
}));

describe('POST /api/mobile/auth/login', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        // Default mock implementation for success
        mockExchangeStravaCodeForTokens.mockResolvedValue({
            accessToken: 'at-123',
            refreshToken: 'rt-123',
            expiresIn: 3600,
            user: { id: 'user-1' }
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should use providedRedirectUri if present', async () => {
        const body = {
            code: 'auth-code',
            redirectUri: 'http://localhost:3000/api/auth/strava/callback'
        };
        const req = new NextRequest('http://localhost/api/mobile/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        await POST(req);

        expect(mockExchangeStravaCodeForTokens).toHaveBeenCalledWith(
            'auth-code',
            'http://localhost:3000/api/auth/strava/callback'
        );
    });

    it('should return 400 if providedRedirectUri is not in the allowlist', async () => {
        const body = {
            code: 'auth-code',
            redirectUri: 'https://evil.example.com/api/auth/strava/callback'
        };
        const req = new NextRequest('http://localhost/api/mobile/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Invalid redirect URI');
        expect(mockExchangeStravaCodeForTokens).not.toHaveBeenCalled();
    });

    it('should use process.env.NEXT_PUBLIC_APP_URL if providedRedirectUri is missing', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'http://env-url.com';

        const body = {
            code: 'auth-code'
        };
        const req = new NextRequest('http://localhost/api/mobile/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        await POST(req);

        expect(mockExchangeStravaCodeForTokens).toHaveBeenCalledWith(
            'auth-code',
            'http://env-url.com/api/auth/strava/callback'
        );
    });

    it('should use fallback URL if providedRedirectUri is missing and NEXT_PUBLIC_APP_URL is not set', async () => {
        delete process.env.NEXT_PUBLIC_APP_URL;

        const body = {
            code: 'auth-code'
        };
        const req = new NextRequest('http://localhost/api/mobile/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        await POST(req);

        expect(mockExchangeStravaCodeForTokens).toHaveBeenCalledWith(
            'auth-code',
            'https://runflow.schuelken.uk/api/auth/strava/callback'
        );
    });

    it('should return 400 if code is missing', async () => {
         const body = {
            redirectUri: 'custom-uri'
        };
        const req = new NextRequest('http://localhost/api/mobile/auth/login', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
