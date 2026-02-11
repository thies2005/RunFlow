
import { syncUserActivities } from './sync';
import { prisma } from '@/lib/db';
import { refreshStravaToken } from './oauth';

// Mock dependencies
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            update: jest.fn(),
            findUnique: jest.fn(),
        },
        activity: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
    },
}));

jest.mock('./oauth', () => ({
    refreshStravaToken: jest.fn(),
}));

jest.mock('@/lib/metrics/trimp', () => ({
    calculateTrimp: jest.fn(() => ({ trimp: 100 })),
}));

jest.mock('@/lib/metrics/fitness', () => ({
    calculateRunningTss: jest.fn(() => 50),
    getActivityContribution: jest.fn(() => ({ contributesToRunningTss: true })),
}));

jest.mock('@/lib/metrics/runalyze', () => ({
    calculateEffectiveVO2max: jest.fn(() => 45),
}));

jest.mock('@/lib/metrics/vdot', () => ({
    calculateTrainingPaces: jest.fn(() => ({ threshold: 300 })),
}));

jest.mock('@/lib/metrics/fitnessCache', () => ({
    updateFitnessCache: jest.fn(),
}));

jest.mock('@/lib/metrics/calories', () => ({
    calculateCalories: jest.fn(() => ({ calories: 500, method: 'MET', confidence: 'HIGH' })),
    calculateAge: jest.fn(() => 30),
}));

jest.mock('@/lib/redis', () => ({
    acquireLock: jest.fn(() => Promise.resolve(true)),
    releaseLock: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('syncUserActivities Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should query the database for each activity (N+1 issue)', async () => {
        const userId = 'user-123';
        const mockToken = 'mock-token';

        // Mock user
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: userId,
            hrMax: 190,
            sex: 'MALE',
            lastSyncAt: new Date('2023-01-01'),
        });

        // Mock token
        (refreshStravaToken as jest.Mock).mockResolvedValue(mockToken);

        // Mock Strava API response
        const mockActivitiesCount = 5;
        const mockActivities = Array.from({ length: mockActivitiesCount }, (_, i) => ({
            id: 1000 + i,
            name: `Activity ${i}`,
            type: 'Run',
            start_date: '2023-01-02T10:00:00Z',
            distance: 5000,
            moving_time: 1500,
            elapsed_time: 1500,
            total_elevation_gain: 50,
            has_heartrate: false,
        }));

        // Mock findMany to return empty array (no existing activities)
        (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

        let activitiesFetched = false;
        (global.fetch as jest.Mock).mockImplementation((url) => {
            if (typeof url === 'string' && url.includes('/athlete/activities')) {
                if (activitiesFetched) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve([]),
                    });
                }
                activitiesFetched = true;
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockActivities),
                });
            }
            if (typeof url === 'string' && url.includes('/athlete')) {
                 return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({}),
                });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
            });
        });

        // Execute sync
        await syncUserActivities(userId);

        // Verify N+1 optimization
        const findUniqueCalls = (prisma.activity.findUnique as jest.Mock).mock.calls.length;
        const findManyCalls = (prisma.activity.findMany as jest.Mock).mock.calls.length;

        console.log(`prisma.activity.findUnique called ${findUniqueCalls} times`);
        console.log(`prisma.activity.findMany called ${findManyCalls} times`);

        // findMany should be called once (per page of activities)
        expect(findManyCalls).toBeGreaterThanOrEqual(1);

        // findUnique should NOT be called for existence checks
        // It might be called for user lookup, but not for each activity
        expect(findUniqueCalls).toBeLessThan(mockActivitiesCount);
    });
});
