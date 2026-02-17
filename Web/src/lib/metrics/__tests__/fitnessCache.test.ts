
import { updateFitnessCache } from '../fitnessCache';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    dailyFitness: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((args) => Promise.resolve(args)),
  },
}));

describe('Fitness Cache', () => {
  const userId = 'user1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use optimized bulk operations for updating fitness cache', async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29); // 30 days range

    // Mock baseline
    (prisma.dailyFitness.findFirst as jest.Mock).mockResolvedValue({
      userId,
      date: new Date(startDate.getTime() - 86400000), // Day before start date
      ctl: 10,
      atl: 10,
      ctlRunning: 10,
    });

    // Mock activities
    const activities: any[] = [];
    // Just return empty or some dummy activities, doesn't matter for the DB call count logic
    // The logic iterates days regardless of activities.
    (prisma.activity.findMany as jest.Mock).mockResolvedValue(activities);

    // Call the function
    await updateFitnessCache(userId, [{ startDate: startDate } as any]);

    // Count calls
    const upsertCalls = (prisma.dailyFitness.upsert as jest.Mock).mock.calls.length;
    const deleteManyCalls = (prisma.dailyFitness.deleteMany as jest.Mock).mock.calls.length;
    const createManyCalls = (prisma.dailyFitness.createMany as jest.Mock).mock.calls.length;
    // We expect 0 upserts, and 1 deleteMany + 1 createMany
    expect(upsertCalls).toBe(0);
    expect(deleteManyCalls).toBe(1);
    expect(createManyCalls).toBe(1);
  });
});
