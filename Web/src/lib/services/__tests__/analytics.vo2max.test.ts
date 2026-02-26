
import { AnalyticsService } from '../analytics';
import { calculateWeightedEffectiveVO2max } from '@/lib/metrics/runalyze';
import { ActivityForShape } from '@/lib/metrics/runalyze';

// Mock the dependency
jest.mock('@/lib/metrics/runalyze', () => ({
    calculateWeightedEffectiveVO2max: jest.fn(),
    calculateMarathonShape: jest.fn(), // Mock other exports if necessary
}));

describe('AnalyticsService.calculateVO2max', () => {
    const mockCalculateWeightedEffectiveVO2max = calculateWeightedEffectiveVO2max as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockActivities: ActivityForShape[] = [
        {
            startDate: new Date(),
            distance: 5000,
            movingTime: 1200,
            averageHr: 150,
            hasHeartrate: true,
            type: 'RUN'
        }
    ];
    const maxHr = 190;

    it('should calculate raw VO2max with a calibration factor of 1.0', () => {
        mockCalculateWeightedEffectiveVO2max.mockReturnValue(50.0);
        const correctionFactor = 0.95;

        AnalyticsService.calculateVO2max(mockActivities, maxHr, correctionFactor);

        expect(mockCalculateWeightedEffectiveVO2max).toHaveBeenCalledWith(
            mockActivities,
            maxHr,
            1.0 // specific requirement: raw VO2max is calculated with 1.0
        );
    });

    it('should apply the correction factor to get effective VO2max', () => {
        const rawVo2 = 50.0;
        mockCalculateWeightedEffectiveVO2max.mockReturnValue(rawVo2);
        const correctionFactor = 0.95;
        const expectedEffective = 47.5; // 50 * 0.95

        const result = AnalyticsService.calculateVO2max(mockActivities, maxHr, correctionFactor);

        expect(result.rawVO2max).toBe(rawVo2);
        expect(result.effectiveVO2max).toBe(expectedEffective);
    });

    it('should round effective VO2max to 1 decimal place', () => {
        mockCalculateWeightedEffectiveVO2max.mockReturnValue(50.0);
        const correctionFactor = 0.955; // 50 * 0.955 = 47.75 -> should round to 47.8 or 47.7 depending on implementation

        // The implementation uses parseFloat((raw * factor).toFixed(1))
        // 47.75.toFixed(1) is "47.8" (usually rounds half up)

        const result = AnalyticsService.calculateVO2max(mockActivities, maxHr, correctionFactor);

        expect(result.effectiveVO2max).toBe(47.8);
    });

    it('should handle zero raw VO2max correctly', () => {
        mockCalculateWeightedEffectiveVO2max.mockReturnValue(0);
        const correctionFactor = 1.05;

        const result = AnalyticsService.calculateVO2max(mockActivities, maxHr, correctionFactor);

        expect(result.rawVO2max).toBe(0);
        expect(result.effectiveVO2max).toBe(0);
    });

    it('should handle correction factor > 1.0 (optimistic adjustment)', () => {
        mockCalculateWeightedEffectiveVO2max.mockReturnValue(50.0);
        const correctionFactor = 1.05; // 52.5

        const result = AnalyticsService.calculateVO2max(mockActivities, maxHr, correctionFactor);

        expect(result.effectiveVO2max).toBe(52.5);
    });
});
