import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    account: {
      findFirst: jest.fn(),
    },
    user: {
      delete: jest.fn(),
    },
    activity: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/strava/sync', () => ({
  syncActivityById: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimitAsync: jest.fn(),
  getClientIdentifier: jest.fn(),
  RATE_LIMITS: { webhooks: {} },
  rateLimitHeaders: jest.fn(),
}));

jest.mock('@/lib/utils/bigint', () => ({
  safeBigInt: jest.fn(),
}));

jest.mock('@/lib/utils/backgroundTask', () => ({
  runBackgroundTask: jest.fn((fn) => fn()),
}));

describe('Strava Webhook GET Handler', () => {
  const originalEnv = process.env;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules(); // Reset modules to pick up new env vars
    process.env = { ...originalEnv };
    process.env.STRAVA_VERIFY_TOKEN = 'test-verify-token';
    process.env.STRAVA_CLIENT_SECRET = 'test-client-secret';

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('does not log sensitive headers and full URL', async () => {
    // Dynamically import the module so it picks up the environment variables
    const { GET } = require('../route');

    const sensitiveToken = 'sensitive-token-123';
    const sensitiveHeader = 'Bearer secret-key';

    const url = `http://localhost:3000/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=${sensitiveToken}&hub.challenge=challenge123`;
    const req = new NextRequest(url, {
      headers: {
        'Authorization': sensitiveHeader,
        'X-Secret-Header': 'super-secret'
      }
    });

    await GET(req);

    // Verify that the full URL (including query params) is NOT logged
    expect(consoleLogSpy).not.toHaveBeenCalledWith('[Strava Webhook] FULL URL:', expect.anything());

    // Verify that headers are NOT logged
    const calls = consoleLogSpy.mock.calls;
    const headerLogCall = calls.find(call => call[0] === '[Strava Webhook] HEADERS:');

    expect(headerLogCall).toBeUndefined();
  });
});
