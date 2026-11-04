/** @jest-environment node */
import { GET, POST } from '../route';
import { logger } from '@/lib/logging/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueStravaWebhook, scheduleStravaWebhookDrain } from '@/lib/strava/webhookQueue';

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

jest.mock('@/lib/strava/webhookQueue', () => ({
  enqueueStravaWebhook: jest.fn(),
  scheduleStravaWebhookDrain: jest.fn(),
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
    function requestActivityUpdate() {
      return new NextRequest('http://localhost/api/webhooks/strava', {
        method: 'POST',
        headers: { 'x-hub-signature': 'mock-signature' },
        body: JSON.stringify({
          object_type: 'activity', aspect_type: 'update', object_id: 100,
          owner_id: 200, event_time: 300, updates: { title: 'Renamed' },
        }),
      });
    }

    it('persists an authenticated event before starting its drain', async () => {
      jest.mocked(prisma.account.findFirst).mockResolvedValue({ userId: 'user-1' } as never);
      jest.mocked(enqueueStravaWebhook).mockResolvedValue(true);
      expect((await POST(requestActivityUpdate())).status).toBe(200);
      expect(enqueueStravaWebhook).toHaveBeenCalledWith('user-1', '200', 100, 300, 'update', { title: 'Renamed' });
      expect(scheduleStravaWebhookDrain).toHaveBeenCalledWith('user-1', false);
    });

    it('returns a retryable error when the event could not be persisted', async () => {
      jest.mocked(prisma.account.findFirst).mockResolvedValue({ userId: 'user-1' } as never);
      jest.mocked(enqueueStravaWebhook).mockRejectedValueOnce(new Error('Database unavailable'));
      expect((await POST(requestActivityUpdate())).status).toBe(500);
      expect(scheduleStravaWebhookDrain).not.toHaveBeenCalled();
    });

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
