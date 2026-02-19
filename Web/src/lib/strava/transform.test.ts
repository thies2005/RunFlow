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
    const hrMax = 190; // Dummy value as it's not used in calculation logic

    it('should calculate zones correctly for basic inputs', () => {
        const heartrates = [120, 135, 145, 155, 165, 175, 185];
        const times = [0, 5, 10, 15, 20, 25, 30];
        // Durations:
        // 0->5: 5s (hr=120, <=130 -> z1)
        // 5->10: 5s (hr=135, >130, <=140 -> z2)
        // 10->15: 5s (hr=145, >140, <=150 -> z3)
        // 15->20: 5s (hr=155, >150, <=160 -> z4)
        // 20->25: 5s (hr=165, >160, <=170 -> z5)
        // 25->30: 5s (hr=175, >170, <=180 -> z6)
        // 30: 1s (hr=185, >180 -> z7)

        const result = calculateZoneTimes(heartrates, times, hrMax, defaultZoneThresholds);

        expect(result).toEqual({
            z1: 5,
            z2: 5,
            z3: 5,
            z4: 5,
            z5: 5,
            z6: 5,
            z7: 1,
        });
    });

    it('should cap duration at 10 seconds', () => {
        const heartrates = [120, 120];
        const times = [0, 20]; // 20s gap
        // Durations:
        // 0->20: min(20-0, 10) = 10s (hr=120 -> z1)
        // 20: 1s (hr=120 -> z1)

        const result = calculateZoneTimes(heartrates, times, hrMax, defaultZoneThresholds);

        expect(result.z1).toBe(11);
        expect(result.z2).toBe(0);
    });

    it('should handle small durations correctly', () => {
        const heartrates = [120, 120];
        const times = [0, 2]; // 2s gap
        // Durations:
        // 0->2: min(2, 10) = 2s (hr=120 -> z1)
        // 2: 1s (hr=120 -> z1)

        const result = calculateZoneTimes(heartrates, times, hrMax, defaultZoneThresholds);

        expect(result.z1).toBe(3);
    });

    it('should handle exact threshold boundaries', () => {
        // Thresholds: z1: 130
        const heartrates = [130, 131];
        const times = [0, 5];
        // 0->5: 5s (hr=130, <=130 -> z1)
        // 5: 1s (hr=131, >130 -> z2)

        const result = calculateZoneTimes(heartrates, times, hrMax, defaultZoneThresholds);

        expect(result.z1).toBe(5);
        expect(result.z2).toBe(1);
    });

    it('should handle values in Zone 7', () => {
        const heartrates = [200];
        const times = [0];
        // 0: 1s (hr=200, >180 -> z7)

        const result = calculateZoneTimes(heartrates, times, hrMax, defaultZoneThresholds);

        expect(result.z7).toBe(1);
    });

    it('should handle empty arrays', () => {
        const result = calculateZoneTimes([], [], hrMax, defaultZoneThresholds);
        expect(result).toEqual({ z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 });
    });

    it('should use default thresholds if not provided', () => {
        // Default thresholds from source: z1: 60, z2: 70, z3: 80, z4: 90, z5: 95, z6: 100
        const heartrates = [50, 65, 75, 85, 92, 98, 110];
        const times = [0, 5, 10, 15, 20, 25, 30];

        // 0->5: 5s (hr=50 <=60 -> z1)
        // 5->10: 5s (hr=65 <=70 -> z2)
        // 10->15: 5s (hr=75 <=80 -> z3)
        // 15->20: 5s (hr=85 <=90 -> z4)
        // 20->25: 5s (hr=92 <=95 -> z5)
        // 25->30: 5s (hr=98 <=100 -> z6)
        // 30: 1s (hr=110 >100 -> z7)

        const result = calculateZoneTimes(heartrates, times, hrMax);

        expect(result).toEqual({
            z1: 5,
            z2: 5,
            z3: 5,
            z4: 5,
            z5: 5,
            z6: 5,
            z7: 1,
        });
    });
});
