import webpush from 'web-push';

// Mock needs to be outside or hoisted
jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    pushSubscription: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('sendPushToUser', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.NEXTAUTH_URL = 'https://example.com';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should skip push if VAPID keys are missing', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    // Re-import after changing env to trigger top-level checks
    const { sendPushToUser } = require('../push');
    // We need to re-require the mocked module to get a fresh reference if needed,
    // but the mock definition is constant.
    // However, we want to ensure prisma mock is reset/fresh.
    const { prisma } = require('@/lib/db');
    const { logger } = require('@/lib/logging/logger');

    const result = await sendPushToUser('user-1', { title: 'T', body: 'B' });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('VAPID keys not configured, skipping push notification');
  });

  it('should return 0 sent/failed if no subscriptions found', async () => {
    const { sendPushToUser } = require('../push');
    const { prisma } = require('@/lib/db');

    prisma.pushSubscription.findMany.mockResolvedValue([]);

    const result = await sendPushToUser('user-1', { title: 'T', body: 'B' });

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it('should send notification and cleanup expired', async () => {
    const { sendPushToUser } = require('../push');
    const { prisma } = require('@/lib/db');
    const { logger } = require('@/lib/logging/logger');
    const webpush = require('web-push');

    const subscriptions = [
      { id: 'sub-1', endpoint: 'e1', p256dh: 'k1', auth: 'a1' },
      { id: 'sub-2', endpoint: 'e2', p256dh: 'k2', auth: 'a2' },
    ];
    prisma.pushSubscription.findMany.mockResolvedValue(subscriptions);

    webpush.sendNotification.mockResolvedValueOnce({});
    webpush.sendNotification.mockRejectedValueOnce({ statusCode: 410 });

    const result = await sendPushToUser('user-1', { title: 'T', body: 'B' });

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-2'] } },
    });
    expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 1 expired push subscriptions'),
        expect.objectContaining({ count: 1, userId: 'user-1' })
    );
  });

  it('should handle generic errors without deleting subscription', async () => {
    const { sendPushToUser } = require('../push');
    const { prisma } = require('@/lib/db');
    const { logger } = require('@/lib/logging/logger');
    const webpush = require('web-push');

    const subscriptions = [
      { id: 'sub-1', endpoint: 'e1', p256dh: 'k1', auth: 'a1' },
    ];
    prisma.pushSubscription.findMany.mockResolvedValue(subscriptions);

    webpush.sendNotification.mockRejectedValueOnce({ statusCode: 500, message: 'Server error' });

    const result = await sendPushToUser('user-1', { title: 'T', body: 'B' });

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Push failed for subscription sub-1'),
        expect.objectContaining({ error: 'Server error' })
    );
  });
});
