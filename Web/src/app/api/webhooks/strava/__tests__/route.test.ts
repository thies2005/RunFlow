/** @jest-environment node */
import { GET, POST } from '../route';
import { logger } from '@/lib/logging/logger';
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
  checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
  getClientIdentifier: jest.fn().mockReturnValue('test-client'),
  RATE_LIMITS: { webhooks: {} },
  rateLimitHeaders: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/utils/backgroundTask', () => ({
  runBackgroundTask: jest.fn((task) => task()), // Execute immediately
}));

jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto for signature verification
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mock-signature'),
    }),
  }),
}));

describe('Strava Webhook Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRAVA_VERIFY_TOKEN = 'test-token';
    process.env.STRAVA_CLIENT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET', () => {
    it('should log critical error if verification token is not set', async () => {
      delete process.env.STRAVA_VERIFY_TOKEN;
      const req = new NextRequest('http://localhost/api/webhooks/strava');

      const res = await GET(req);

      expect(logger.error).toHaveBeenCalledWith('CRITICAL: STRAVA_VERIFY_TOKEN not set!');
      expect(res.status).toBe(500);
    });

    it('should log verification details and success', async () => {
      const req = new NextRequest('http://localhost/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=123');

      const res = await GET(req);

      expect(logger.info).toHaveBeenCalledWith('[Strava Webhook] FULL URL:', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('[Strava Webhook] HEADERS:', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('[Strava Webhook] Token verification:', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('[Strava Webhook] Verification successful');
      expect(res.status).toBe(200);
    });

    it('should log warning on verification failure', async () => {
        const req = new NextRequest('http://localhost/api/webhooks/strava?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=123');

        const res = await GET(req);

        expect(logger.warn).toHaveBeenCalledWith('[Strava Webhook] Verification failed.', expect.any(Object));
        expect(res.status).toBe(403);
    });
  });

  describe('POST', () => {
      it('should log warning if signature is missing', async () => {
          const req = new NextRequest('http://localhost/api/webhooks/strava', {
              method: 'POST',
              body: JSON.stringify({}),
          });
          // No x-hub-signature header

          const res = await POST(req);

          // We expect logger.warn to be called because signature is missing
          // logic: if (!signature) { logger.warn(...); return false; }
          expect(logger.warn).toHaveBeenCalledWith('No signature provided in webhook request');
          expect(res.status).toBe(403);
      });
  });
});
