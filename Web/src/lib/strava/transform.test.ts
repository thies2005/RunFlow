import { calculateZoneTimes } from './transform';

describe('calculateZoneTimes', () => {
    it('should calculate time in zones correctly', () => {
        // Create heart rate data
        const heartrates = [
            100, // z1 (<= 110)
            110, // z1 (<= 110)
            120, // z2 (<= 130)
            130, // z2 (<= 130)
            140, // z3 (<= 150)
            150, // z3 (<= 150)
            160, // z4 (<= 170)
            170, // z4 (<= 170)
            180, // z5 (<= 180)
            190, // z6 (<= 190)
            200  // z7 (> 190)
        ];

        // Create time data (seconds)
        const times = [
            0,
            10,
            20,
            30,
            40,
            50,
            60,
            70,
            80,
            90,
            100
        ];

        // Define zone thresholds
        const zoneThresholds = {
            z1: 110,
            z2: 130,
            z3: 150,
            z4: 170,
            z5: 180,
            z6: 190
        };

        const result = calculateZoneTimes(heartrates, times, zoneThresholds);

        // Expected durations:
        // i=0: hr=100 (z1), duration=10-0=10 -> z1+=10
        // i=1: hr=110 (z1), duration=20-10=10 -> z1+=10
        // i=2: hr=120 (z2), duration=30-20=10 -> z2+=10
        // i=3: hr=130 (z2), duration=40-30=10 -> z2+=10
        // i=4: hr=140 (z3), duration=50-40=10 -> z3+=10
        // i=5: hr=150 (z3), duration=60-50=10 -> z3+=10
        // i=6: hr=160 (z4), duration=70-60=10 -> z4+=10
        // i=7: hr=170 (z4), duration=80-70=10 -> z4+=10
        // i=8: hr=180 (z5), duration=90-80=10 -> z5+=10
        // i=9: hr=190 (z6), duration=100-90=10 -> z6+=10
        // i=10: hr=200 (z7), duration=1 (default) -> z7+=1

        expect(result.z1).toBe(20);
        expect(result.z2).toBe(20);
        expect(result.z3).toBe(20);
        expect(result.z4).toBe(20);
        expect(result.z5).toBe(10);
        expect(result.z6).toBe(10);
        expect(result.z7).toBe(1);
    });

    it('should handle gaps in time correctly (max 10s)', () => {
         const heartrates = [100, 100];
         const times = [0, 20]; // 20s gap
         const zoneThresholds = { z1: 110, z2: 130, z3: 150, z4: 170, z5: 180, z6: 190 };

         const result = calculateZoneTimes(heartrates, times, zoneThresholds);

         // i=0: hr=100, duration = min(20-0, 10) = 10 -> z1+=10
         // i=1: hr=100, duration = 1 -> z1+=1

         expect(result.z1).toBe(11);
    });
});
