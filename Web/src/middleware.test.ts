/**
 * @jest-environment node
 */
import { middleware } from './middleware';
import { NextRequest, NextResponse } from 'next/server';

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
