/** @jest-environment node */
import { NextRequest } from 'next/server';
import { DELETE } from './route';
import { prisma } from '@/lib/db';
import { invalidateUserDashboardCache } from '@/lib/redis';

jest.mock('@/lib/mobile/auth', () => ({
    getAuthenticatedUser: jest.fn().mockResolvedValue({ id: 'owner' }),
}));
jest.mock('@/lib/db', () => ({
    prisma: {
        activity: { findFirst: jest.fn(), delete: jest.fn() },
        workout: { updateMany: jest.fn() },
        $transaction: jest.fn(),
    },
}));
jest.mock('@/lib/rateLimit', () => ({
    checkRateLimitAsync: jest.fn().mockResolvedValue({ allowed: true }),
    getClientIdentifier: jest.fn(),
    RATE_LIMITS: { general: 100 },
    rateLimitHeaders: jest.fn().mockReturnValue({}),
}));
jest.mock('@/lib/metrics/fitnessCache', () => ({ updateFitnessCache: jest.fn() }));
jest.mock('@/lib/redis', () => ({ invalidateUserDashboardCache: jest.fn() }));

const request = () => new NextRequest('http://localhost/api/mobile/v1/activities/a1', { method: 'DELETE' });
const context = () => ({ params: Promise.resolve({ id: 'a1' }) });

it('commits deletion and unlinking together before invalidating the owner dashboard', async () => {
    (prisma.activity.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', startDate: new Date() });
    (prisma.workout.updateMany as jest.Mock).mockReturnValue('unlink');
    (prisma.activity.delete as jest.Mock).mockReturnValue('delete');
    (prisma.$transaction as jest.Mock).mockImplementation(async () => {
        expect(invalidateUserDashboardCache).not.toHaveBeenCalled();
    });

    const response = await DELETE(request(), context());

    expect(response.status).toBe(200);
    expect(prisma.activity.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'a1', userId: 'owner' },
    }));
    expect(prisma.workout.updateMany).toHaveBeenCalledWith({
        where: { linkedActivityId: 'a1', goal: { userId: 'owner' } },
        data: { linkedActivityId: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(['unlink', 'delete']);
    expect(invalidateUserDashboardCache).toHaveBeenCalledWith('owner');
});
