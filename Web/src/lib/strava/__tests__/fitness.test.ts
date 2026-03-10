import { calculateAndSaveFitnessMetrics, updateDailyFitnessCache, ModifiedActivity } from '../fitness';
import { updateFitnessCache } from '@/lib/metrics/fitnessCache';

// Mock the updateFitnessCache dependency
jest.mock('@/lib/metrics/fitnessCache', () => ({
    updateFitnessCache: jest.fn(),
}));

describe('Strava Fitness Module', () => {
    const userId = 'user-123';
    const mockDate = new Date('2023-01-01T12:00:00Z');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateAndSaveFitnessMetrics', () => {
        it('should call updateFitnessCache when modifiedActivities is not empty', async () => {
            const modifiedActivities: ModifiedActivity[] = [
                { startDate: mockDate }
            ];

            await calculateAndSaveFitnessMetrics(userId, modifiedActivities);

            expect(updateFitnessCache).toHaveBeenCalledTimes(1);
            expect(updateFitnessCache).toHaveBeenCalledWith(userId, modifiedActivities);
        });

        it('should not call updateFitnessCache when modifiedActivities is empty', async () => {
            const modifiedActivities: ModifiedActivity[] = [];

            await calculateAndSaveFitnessMetrics(userId, modifiedActivities);

            expect(updateFitnessCache).not.toHaveBeenCalled();
        });
    });

    describe('updateDailyFitnessCache', () => {
        it('should call updateFitnessCache with non-empty activities', async () => {
            const modifiedActivities: ModifiedActivity[] = [
                { startDate: mockDate },
                { startDate: new Date('2023-01-02T12:00:00Z') }
            ];

            await updateDailyFitnessCache(userId, modifiedActivities);

            expect(updateFitnessCache).toHaveBeenCalledTimes(1);
            expect(updateFitnessCache).toHaveBeenCalledWith(userId, modifiedActivities);
        });

        it('should call updateFitnessCache even with empty activities', async () => {
            const modifiedActivities: ModifiedActivity[] = [];

            await updateDailyFitnessCache(userId, modifiedActivities);

            expect(updateFitnessCache).toHaveBeenCalledTimes(1);
            expect(updateFitnessCache).toHaveBeenCalledWith(userId, modifiedActivities);
        });
    });
});
