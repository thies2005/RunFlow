/**
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { generateCsrfToken } from '@/lib/security/csrf';

jest.mock('@/lib/admin/auth', () => ({
    COOKIE_NAME: 'runflow_admin_token',
}));

import { COOKIE_NAME } from '@/lib/admin/auth';

function makeRequest(csrfHeader?: string, csrfCookieValue?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (csrfHeader !== undefined) {
        headers['x-csrf-token'] = csrfHeader;
    }
    if (csrfCookieValue !== undefined) {
        headers['cookie'] = `csrf_token=${encodeURIComponent(csrfCookieValue)}`;
    }
    return new NextRequest('http://localhost:3000/api/admin/logout', {
        method: 'POST',
        headers,
    });
}

function validCsrfCookie(token?: string): string {
    const t = token ?? generateCsrfToken();
    return JSON.stringify({ token: t, expiresAt: Date.now() + 60_000 });
}

describe('POST /api/admin/logout', () => {
    it('expires the httpOnly admin cookie server-side on a valid CSRF pair', async () => {
        const token = generateCsrfToken();
        const request = makeRequest(token, validCsrfCookie(token));
        const response = await POST(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toEqual({ success: true, message: 'Logged out successfully' });

        // The cookie must be issued for deletion with the same attribute
        // shape the login route used, so the browser removes the exact
        // httpOnly cookie it set at login.
        const setCookie = response.headers.get('set-cookie') ?? '';
        expect(setCookie).toContain(`${COOKIE_NAME}=;`);
        expect(setCookie).toContain('Max-Age=0');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('Path=/');
        expect(setCookie).toMatch(/SameSite=Strict/i);
        expect(response.cookies.get(COOKIE_NAME)).toBeDefined();
    });

    it('rejects logout without the X-CSRF-Token header (logout CSRF)', async () => {
        const request = makeRequest(undefined, validCsrfCookie());
        const response = await POST(request);

        expect(response.status).toBe(403);
        expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('rejects logout when the header does not match the httpOnly csrf cookie', async () => {
        const request = makeRequest('attacker-token', validCsrfCookie());
        const response = await POST(request);

        expect(response.status).toBe(403);
    });

    it('rejects logout when no csrf cookie pair exists at all', async () => {
        const token = generateCsrfToken();
        const request = makeRequest(token, undefined);
        const response = await POST(request);

        expect(response.status).toBe(403);
    });

    it('rejects logout with an expired csrf cookie', async () => {
        const token = generateCsrfToken();
        const expired = JSON.stringify({ token, expiresAt: Date.now() - 60_000 });
        const request = makeRequest(token, expired);
        const response = await POST(request);

        expect(response.status).toBe(403);
    });
});
