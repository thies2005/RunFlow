
import { AnalyticsService } from '../analytics';

// Mock types
const createActivity = (date: string, trimp: number, movingTime: number = 3600) => ({
    startDate: new Date(date),
    movingTime: movingTime,
    trimp: trimp,
    type: 'RUN' as const,
    distance: 10000
});

describe('AnalyticsService', () => {
    describe('calculateEasyTrimp', () => {
        it('should sum moving time (in minutes) for the last 7 days', () => {
            const referenceDate = new Date('2024-01-08T12:00:00Z');
            // Window starts: 2024-01-01T12:00:00Z

            const activities = [
                // Inside window (Jan 1st is exactly 7 days ago)
                createActivity('2024-01-01T13:00:00Z', 0, 3600), // 60 mins
                createActivity('2024-01-05T10:00:00Z', 0, 1800), // 30 mins
                createActivity('2024-01-08T09:00:00Z', 0, 1800), // 30 mins

                // Outside window
                createActivity('2024-01-01T11:00:00Z', 0, 3600), // Before window start time
                createActivity('2023-12-31T23:00:00Z', 0, 3600), // Day before
            ];

            const result = AnalyticsService.calculateEasyTrimp(activities, referenceDate);

            // Expected: 60 + 30 + 30 = 120
            expect(result).toBe(120);
        });

        it('should return 0 for empty activities', () => {
            const result = AnalyticsService.calculateEasyTrimp([], new Date());
            expect(result).toBe(0);
        });

        it('should round the result', () => {
            const activities = [
                createActivity('2024-01-01', 0, 90), // 1.5 minutes
            ];

            // 1.5 rounds to 2
            const result = AnalyticsService.calculateEasyTrimp(activities, new Date('2024-01-02'));
            expect(result).toBe(2);
        });
    });

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
