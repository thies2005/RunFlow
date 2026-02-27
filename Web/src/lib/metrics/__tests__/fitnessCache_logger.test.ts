
import { updateFitnessCache, ensureFitnessCacheUpToDate, getCachedFitnessHistory } from '../fitnessCache';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/logger';

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

jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Fitness Cache Logger', () => {
  const userId = 'user1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updateFitnessCache should use logger.info on success', async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 5);

    // Mock baseline
    (prisma.dailyFitness.findFirst as jest.Mock).mockResolvedValue({
      userId,
      date: new Date(startDate.getTime() - 86400000),
      ctl: 10,
      atl: 10,
      ctlRunning: 10,
    });

    (prisma.activity.findMany as jest.Mock).mockResolvedValue([]);

    await updateFitnessCache(userId, [{ startDate: startDate } as any]);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[FitnessCache] Updated'),
      expect.objectContaining({ userId }) // We expect some context, at least userId if I add it, or maybe just check the message for now if I don't add context yet.
      // But looking at the plan, I intended to pass context.
    );
  });

  it('updateFitnessCache should use logger.error on failure', async () => {
    const error = new Error('DB Error');
    (prisma.dailyFitness.findFirst as jest.Mock).mockRejectedValue(error);

    await updateFitnessCache(userId, [{ startDate: new Date() } as any]);

    expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[FitnessCache] Error updating fitness cache'),
        expect.objectContaining({ error: error })
    );
  });

  it('ensureFitnessCacheUpToDate should use logger.info when auto-filling gaps', async () => {
     const today = new Date();
     const fiveDaysAgo = new Date(today);
     fiveDaysAgo.setDate(today.getDate() - 5);

     // Mock latest entry as 5 days ago
     (prisma.dailyFitness.findFirst as jest.Mock).mockResolvedValue({
         userId,
         date: fiveDaysAgo,
         ctl: 10,
         atl: 10,
         ctlRunning: 10,
         tsb: 0
     });

     await ensureFitnessCacheUpToDate(userId);

     expect(logger.info).toHaveBeenCalledWith(
         expect.stringContaining('[FitnessCache] Auto-filled'),
         expect.objectContaining({ userId })
     );
  });

  it('getCachedFitnessHistory should use logger.error on failure', async () => {
      const error = new Error('DB Error');
      (prisma.dailyFitness.findMany as jest.Mock).mockRejectedValue(error);

      await getCachedFitnessHistory(userId);

      expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('[FitnessCache] Error retrieving cached fitness history'),
          expect.objectContaining({ error: error })
      );
  });

});
