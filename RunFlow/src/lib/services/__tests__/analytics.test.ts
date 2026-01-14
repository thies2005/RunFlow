
import { AnalyticsService } from '../analytics';

// Mock types
const createActivity = (date: string, trimp: number) => ({
    startDate: new Date(date),
    movingTime: 3600,
    trimp: trimp,
    type: 'RUN' as const,
    distance: 10000
});

describe('AnalyticsService', () => {
    describe('calculateHistory', () => {
        it('should calculate history and filter by date range', () => {
            const activities = [
                createActivity('2024-01-01', 100),
                createActivity('2024-01-02', 100),
                createActivity('2024-01-03', 100),
                createActivity('2024-01-04', 100),
                createActivity('2024-01-05', 100),
            ];

            const startDate = new Date('2024-01-03');
            const endDate = new Date('2024-01-04');

            const history = AnalyticsService.calculateHistory(activities, startDate, endDate);

            // Expect 2 days of history
            expect(history).toHaveLength(2);
            expect(history[0].date).toEqual(startDate);
            expect(history[1].date).toEqual(endDate);

            // Verify CTL is increasing (accumulation)
            // Day 3 CTL should be higher than initial 0
            expect(history[0].metrics.ctl).toBeGreaterThan(0);
        });

        it('should handle activities before startDate (warmup)', () => {
            const activities = [
                createActivity('2024-01-01', 1000), // Massive load
                createActivity('2024-02-01', 50),
            ];

            // Request history starting Feb 1st
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-02-01');

            const history = AnalyticsService.calculateHistory(activities, startDate, endDate);

            expect(history).toHaveLength(1);

            // CTL should be > 0 because of the massive load in Jan
            // Even though it decayed over 30 days
            expect(history[0].metrics.ctl).toBeGreaterThan(10);
        });

        it('should handle empty activities', () => {
            const history = AnalyticsService.calculateHistory(
                [],
                new Date('2024-01-01'),
                new Date('2024-01-05')
            );
            expect(history).toEqual([]);
        });
    });
});
