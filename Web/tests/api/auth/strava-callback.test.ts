/**
 * @jest-environment node
 */

import { GET } from '@/app/api/auth/strava/callback/route';

jest.mock('@/lib/logging/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

// Record every redirect the route issues so assertions can inspect the
// Location and status without depending on the real NextResponse runtime.
const redirects: Array<{ url: string; status: number }> = [];

jest.mock('next/server', () => {
    class MockNextResponse {
        public headers: Map<string, string>;
        constructor(public body: any, public init?: any) {
            this.headers = new Map();
        }
        static redirect(url: URL | string, init?: number | { status?: number }) {
            const status = typeof init === 'number' ? init : init?.status ?? 307;
            redirects.push({ url: url.toString(), status });
            return new MockNextResponse(null, init);
        }
        static json(body: any, init: any) {
            return new MockNextResponse(body, init);
        }
    }
    return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

type GetParams = Parameters<typeof GET>[0];

function callbackRequest(query: Record<string, string>): GetParams {
    return { nextUrl: { searchParams: new URLSearchParams(query) } } as unknown as GetParams;
}

function redirectedLocation(): URL {
    expect(redirects).toHaveLength(1);
    return new URL(redirects[0].url);
}

beforeEach(() => {
    redirects.length = 0;
});

describe('GET /api/auth/strava/callback — mobile branch state parsing', () => {
    it('forwards code, state and scope for a fresh nonce-bound mobile state', async () => {
        const state = `flutter_${Date.now()}_3fa9b2c1d4e5f60718293a4b5c6d7e8f`;

        await GET(callbackRequest({ code: 'CODE', state, scope: 'read' }));

        expect(redirects[0].status).toBe(302);
        const location = redirectedLocation();
        expect(location.pathname).toBe('/auth/app-callback');
        expect(location.searchParams.get('code')).toBe('CODE');
        // the state (timestamp + nonce) must reach the app untouched: the
        // app verifies the nonce against the in-flight flow
        expect(location.searchParams.get('state')).toBe(state);
        expect(location.searchParams.get('scope')).toBe('read');
    });

    it('still routes legacy nonce-less mobile state (pre-binding app versions)', async () => {
        const state = `flutter_${Date.now()}`;

        await GET(callbackRequest({ code: 'CODE', state }));

        const location = redirectedLocation();
        expect(location.pathname).toBe('/auth/app-callback');
        expect(location.searchParams.get('code')).toBe('CODE');
        expect(location.searchParams.get('state')).toBe(state);
    });

    it('routes the android_ prefix like flutter_', async () => {
        const state = `android_${Date.now()}_deadbeef`;

        await GET(callbackRequest({ code: 'CODE', state }));

        expect(redirectedLocation().pathname).toBe('/auth/app-callback');
    });

    it('rejects a stale nonce-bound state with invalid_state', async () => {
        const state = `flutter_${Date.now() - 11 * 60 * 1000}_3fa9b2c1d4e5f60718293a4b5c6d7e8f`;

        await GET(callbackRequest({ code: 'CODE', state }));

        const location = redirectedLocation();
        expect(location.pathname).toBe('/auth/app-callback');
        expect(location.searchParams.get('error')).toBe('invalid_state');
    });

    it('rejects a malformed timestamp with invalid_state', async () => {
        await GET(callbackRequest({ code: 'CODE', state: 'flutter_notanumber_3fa9' }));

        expect(redirectedLocation().searchParams.get('error')).toBe('invalid_state');
    });

    it('rejects a prefix-only state with invalid_state', async () => {
        await GET(callbackRequest({ code: 'CODE', state: 'flutter_' }));

        expect(redirectedLocation().searchParams.get('error')).toBe('invalid_state');
    });

    it('forwards an error to the mobile branch without a code', async () => {
        const state = `flutter_${Date.now()}_3fa9b2c1d4e5f60718293a4b5c6d7e8f`;

        await GET(callbackRequest({ error: 'access_denied', state }));

        const location = redirectedLocation();
        expect(location.pathname).toBe('/auth/app-callback');
        expect(location.searchParams.get('error')).toBe('access_denied');
    });
});

describe('GET /api/auth/strava/callback — web branch stays on NextAuth', () => {
    it('forwards non-mobile state to the NextAuth callback untouched', async () => {
        const state = 'some-nextauth-session-bound-state';

        await GET(callbackRequest({ code: 'CODE', state, scope: 'read' }));

        const location = redirectedLocation();
        expect(location.pathname).toBe('/api/auth/callback/strava');
        expect(location.searchParams.get('code')).toBe('CODE');
        expect(location.searchParams.get('state')).toBe(state);
        expect(location.searchParams.get('scope')).toBe('read');
    });
});
