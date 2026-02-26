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
  it('should implement nonce-based CSP and remove unsafe-inline from script-src', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/'));
    const response = await middleware(request);

    const csp = response.headers.get('content-security-policy');
    const nonceHeader = response.headers.get('x-nonce');

    expect(csp).toBeDefined();
    expect(nonceHeader).toBeDefined();

    // Verify script-src
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain(`script-src 'self' 'nonce-${nonceHeader}'`);

    // Verify style-src (should still have unsafe-inline)
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});
