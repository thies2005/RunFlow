/**
 * @jest-environment node
 */
import { middleware } from './middleware';
import { NextRequest } from 'next/server';

// Mock generateRequestId to avoid random values in snapshots if we used them
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  generateRequestId: () => 'test-request-id',
}));

describe('Middleware CSP', () => {
  it('should implement CSP headers allowing unsafe-inline for Next.js SSG compatibility', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/'));
    const response = await middleware(request);

    const csp = response.headers.get('content-security-policy');

    expect(csp).toBeDefined();

    // Verify script-src
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https:");

    // Verify style-src
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe('Pre-auth request body size gate (p4: missing-preauth-body-size-gate)', () => {
  const SIXTY_FOUR_KB = 64 * 1024;
  const TWO_MB = 2 * 1024 * 1024;

  function makeRequest(
    path: string,
    method: string,
    contentLength?: string,
  ): NextRequest {
    return new NextRequest(new URL(`http://localhost:3000${path}`), {
      method,
      headers: contentLength === undefined ? {} : { 'content-length': contentLength },
    });
  }

  it('rejects an oversized anonymous auth POST with 413 before reading the body', async () => {
    const response = await middleware(
      makeRequest('/api/auth/register', 'POST', String(SIXTY_FOUR_KB + 1)),
    );
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'Payload too large' });
  });

  it.each([
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/webhooks/strava',
    '/api/admin/login',
    '/api/mobile/auth/login',
    '/api/mobile/v1/auth/refresh',
  ])('rejects oversized mutating requests to %s', async (path) => {
    const response = await middleware(makeRequest(path, 'POST', '99999999'));
    expect(response.status).toBe(413);
  });

  it('allows an in-cap anonymous auth POST to continue through the middleware', async () => {
    const response = await middleware(
      makeRequest('/api/auth/register', 'POST', '512'),
    );
    expect(response.status).not.toBe(413);
  });

  it('applies the larger 2MB cap to /api/public/ (plan export posts full plans)', async () => {
    const ok = await middleware(
      makeRequest('/api/public/plan/export', 'POST', String(TWO_MB)),
    );
    expect(ok.status).not.toBe(413);

    const tooBig = await middleware(
      makeRequest('/api/public/plan/export', 'POST', String(TWO_MB + 1)),
    );
    expect(tooBig.status).toBe(413);
  });

  it('does not gate authenticated API paths (CSV import is capped in-route)', async () => {
    const response = await middleware(
      makeRequest('/api/plan-advanced/42/csv/import', 'POST', '99999999'),
    );
    expect(response.status).not.toBe(413);
  });

  it('does not gate GET requests even on pre-auth paths', async () => {
    const response = await middleware(
      makeRequest('/api/auth/session', 'GET', '99999999'),
    );
    expect(response.status).not.toBe(413);
  });

  it('does not gate pre-auth POSTs without a declared Content-Length (chunked)', async () => {
    const response = await middleware(makeRequest('/api/auth/register', 'POST'));
    expect(response.status).not.toBe(413);
  });

  it('does not gate non-API paths', async () => {
    const response = await middleware(makeRequest('/plan', 'POST', '99999999'));
    expect(response.status).not.toBe(413);
  });

  it('does not gate the matcher-excluded health surface', async () => {
    // Matcher-excluded paths never traverse middleware at all; this documents
    // that the gate (and middleware generally) is not the enforcement there.
    const response = await middleware(
      makeRequest('/api/health', 'POST', '99999999'),
    );
    expect(response.status).not.toBe(413);
  });
});
