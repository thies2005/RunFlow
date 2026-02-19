import { calculateZoneTimes } from './transform';

describe('calculateZoneTimes', () => {
    // Standard zone thresholds for testing
    const defaultZoneThresholds = {
        z1: 130,
        z2: 140,
        z3: 150,
        z4: 160,
        z5: 170,
        z6: 180,
    };

    it('should calculate zones correctly for basic inputs', () => {
        const heartrates = [120, 135, 145, 155, 165, 175, 185];
        const times = [0, 5, 10, 15, 20, 25, 30];

        const result = calculateZoneTimes(heartrates, times, defaultZoneThresholds);

        expect(result).toEqual({ z1: 5, z2: 5, z3: 5, z4: 5, z5: 5, z6: 5, z7: 1 });
    });

    it('should cap duration at 10 seconds', () => {
        const heartrates = [120, 120];
        const times = [0, 20]; // 20s gap

        const result = calculateZoneTimes(heartrates, times, defaultZoneThresholds);

        expect(result.z1).toBe(11);
        expect(result.z2).toBe(0);
    });

    it('should handle small durations correctly', () => {
        const heartrates = [120, 120];
        const times = [0, 2]; // 2s gap

        const result = calculateZoneTimes(heartrates, times, defaultZoneThresholds);

        expect(result.z1).toBe(3);
    });

    it('should handle exact threshold boundaries', () => {
        const heartrates = [130, 131];
        const times = [0, 5];

        const result = calculateZoneTimes(heartrates, times, defaultZoneThresholds);

        expect(result.z1).toBe(5);
        expect(result.z2).toBe(1);
    });

    it('should handle values in Zone 7', () => {
        const heartrates = [200];
        const times = [0];

        const result = calculateZoneTimes(heartrates, times, defaultZoneThresholds);

        expect(result.z7).toBe(1);
    });

    it('should handle empty arrays', () => {
        const result = calculateZoneTimes([], [], defaultZoneThresholds);
        expect(result).toEqual({ z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 });
    });

    it('should use default thresholds if not provided', () => {
        const heartrates = [50, 65, 75, 85, 92, 98, 110];
        const times = [0, 5, 10, 15, 20, 25, 30];

        const result = calculateZoneTimes(heartrates, times);

        expect(result).toEqual({ z1: 5, z2: 5, z3: 5, z4: 5, z5: 5, z6: 5, z7: 1 });
    });
});
