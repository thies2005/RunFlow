/** @jest-environment node */
import { prisma } from '@/lib/db';
import { classifyActivityEvent, scheduleStravaWebhookDrain } from './webhookQueue';

jest.mock('@/lib/db', () => ({ prisma: { stravaWebhookJob: { findFirst: jest.fn().mockResolvedValue(null) } } }));
jest.mock('./sync', () => ({}));
jest.mock('@/lib/ai/feedback', () => ({}));

describe('Strava event classification', () => {
    it('avoids upstream work only for title-only updates', () => {
        expect(classifyActivityEvent('update', { title: 'Morning run' }))
            .toEqual({ kind: 'title', title: 'Morning run' });
        expect(classifyActivityEvent('update', { title: 'Morning run', private: 'true' }).kind).toBe('upsert');
        expect(classifyActivityEvent('create', { title: 'Morning run' }).kind).toBe('upsert');
        expect(classifyActivityEvent('delete').kind).toBe('delete');
    });
});

it('rechecks a burst so an event arriving in the debounce window can become due', async () => {
    jest.useFakeTimers();
    try {
        const drain = scheduleStravaWebhookDrain('runner');
        await jest.advanceTimersByTimeAsync(500);
        await scheduleStravaWebhookDrain('runner');
        await jest.advanceTimersByTimeAsync(1000);
        await drain;
        expect(prisma.stravaWebhookJob.findFirst).toHaveBeenCalledTimes(2);
    } finally {
        jest.useRealTimers();
    }
});
