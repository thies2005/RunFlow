import {
    exportWorkoutFit,
    computeFitCrc,
    resolveFitSport,
    buildFitStepDescriptors,
    FIT_DURATION_TYPE,
    FIT_TARGET_TYPE,
    FIT_INTENSITY,
} from '../fit-export';

describe('FIT Workout Exporter (fit-export.ts)', () => {
    it('generates a standards-compliant 14-byte FIT header and valid CRCs for a basic workout', () => {
        const workout = {
            customName: 'Morning Tempo',
            workoutType: 'TEMPO',
            sport: 'RUN',
            targetDurationSec: 3600,
            targetPaceMinSecPerKm: 270, // 4:30/km
            targetPaceMaxSecPerKm: 290,
        };

        const fitBytes = exportWorkoutFit(workout);

        // Header tests
        expect(fitBytes.length).toBeGreaterThan(16);
        expect(fitBytes[0]).toBe(14); // Header size
        expect(fitBytes[1]).toBe(0x20); // Protocol version 2.0
        // Profile version 2132 (0x0854)
        expect(fitBytes[2]).toBe(0x54);
        expect(fitBytes[3]).toBe(0x08);

        // Data size
        const dataSize =
            fitBytes[4] |
            (fitBytes[5] << 8) |
            (fitBytes[6] << 16) |
            (fitBytes[7] << 24);
        expect(fitBytes.length).toBe(14 + dataSize + 2);

        // .FIT signature
        const sig = String.fromCharCode(fitBytes[8], fitBytes[9], fitBytes[10], fitBytes[11]);
        expect(sig).toBe('.FIT');

        // Header CRC verification (bytes 0..11 vs bytes 12..13)
        const expectedHeaderCrc = computeFitCrc(fitBytes, 0, 12);
        const actualHeaderCrc = fitBytes[12] | (fitBytes[13] << 8);
        expect(actualHeaderCrc).toBe(expectedHeaderCrc);

        // File CRC verification (CRC of bytes 0..(14+dataSize-1) vs trailing 2 bytes)
        const expectedFileCrc = computeFitCrc(fitBytes, 0, 14 + dataSize);
        const actualFileCrc = fitBytes[14 + dataSize] | (fitBytes[14 + dataSize + 1] << 8);
        expect(actualFileCrc).toBe(expectedFileCrc);

        // FIT mathematical property: CRC over full file including 2-byte file CRC is 0
        expect(computeFitCrc(fitBytes)).toBe(0);
    });

    it('exports structured workouts with repeat groups correctly', () => {
        const workout = {
            customName: '5x1000m Intervals',
            sport: 'RUN',
            workoutType: 'INTERVALS',
            structuredSteps: {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'warmup',
                        label: 'Easy Warmup',
                        duration: { type: 'distance', meters: 2000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 330, max: 350 },
                    },
                    {
                        kind: 'repeat',
                        times: 5,
                        steps: [
                            {
                                kind: 'work',
                                label: '1km Hard',
                                duration: { type: 'distance', meters: 1000 },
                                target: { type: 'pace', unit: 'sec_per_km', min: 210, max: 220 },
                            },
                            {
                                kind: 'recovery',
                                label: '400m Jog',
                                duration: { type: 'distance', meters: 400 },
                                target: { type: 'hr', zone: 2 },
                            },
                        ],
                    },
                    {
                        kind: 'cooldown',
                        label: 'Cooldown',
                        duration: { type: 'time', seconds: 600 },
                    },
                ],
            },
        };

        const fitBytes = exportWorkoutFit(workout);
        expect(computeFitCrc(fitBytes)).toBe(0);

        const descriptors = buildFitStepDescriptors(workout);
        // Expect: Warmup, 1km Hard, 400m Jog, Repeat step, Cooldown = 5 steps
        expect(descriptors.length).toBe(5);

        // Step 0: Warmup
        expect(descriptors[0].intensity).toBe(FIT_INTENSITY.WARMUP);
        expect(descriptors[0].durationType).toBe(FIT_DURATION_TYPE.DISTANCE);
        expect(descriptors[0].durationValue).toBe(200000); // 2000m in cm
        expect(descriptors[0].targetType).toBe(FIT_TARGET_TYPE.SPEED);

        // Step 1: Work
        expect(descriptors[1].intensity).toBe(FIT_INTENSITY.ACTIVE);
        expect(descriptors[1].durationType).toBe(FIT_DURATION_TYPE.DISTANCE);
        expect(descriptors[1].durationValue).toBe(100000); // 1000m in cm

        // Step 2: Recovery
        expect(descriptors[2].intensity).toBe(FIT_INTENSITY.REST);
        expect(descriptors[2].targetType).toBe(FIT_TARGET_TYPE.HEART_RATE);
        expect(descriptors[2].targetValue).toBe(2); // HR zone 2

        // Step 3: Repeat step
        expect(descriptors[3].durationType).toBe(FIT_DURATION_TYPE.REPEAT_UNTIL_STEPS_CMPLT);
        expect(descriptors[3].durationValue).toBe(1); // loop back to index 1 (Work)
        expect(descriptors[3].targetValue).toBe(5); // 5 repetitions

        // Step 4: Cooldown
        expect(descriptors[4].intensity).toBe(FIT_INTENSITY.COOLDOWN);
        expect(descriptors[4].durationType).toBe(FIT_DURATION_TYPE.TIME);
        expect(descriptors[4].durationValue).toBe(600000); // 600s in ms
    });

    it('correctly applies target offsets for cycling power (+1000) and HR (+100)', () => {
        const cyclingWorkout = {
            customName: 'Threshold Intervals',
            sport: 'BIKE',
            workoutType: 'RIDE_INTERVALS',
            targetPowerMinWatts: 240,
            targetPowerMaxWatts: 260,
            targetDurationSec: 3600,
        };

        const descriptors = buildFitStepDescriptors(cyclingWorkout);
        const mainStep = descriptors.find((d) => d.name === 'Main');
        expect(mainStep).toBeDefined();
        expect(mainStep!.targetType).toBe(FIT_TARGET_TYPE.POWER);
        expect(mainStep!.targetLow).toBe(1240); // 240 + 1000
        expect(mainStep!.targetHigh).toBe(1260); // 260 + 1000

        const hrWorkout = {
            customName: 'HR Zone Run',
            sport: 'RUN',
            workoutType: 'EASY',
            targetHrMinBpm: 135,
            targetHrMaxBpm: 152,
            targetDurationSec: 2400,
        };

        const hrDescriptors = buildFitStepDescriptors(hrWorkout);
        const hrMain = hrDescriptors.find((d) => d.name === 'Main');
        expect(hrMain).toBeDefined();
        expect(hrMain!.targetType).toBe(FIT_TARGET_TYPE.HEART_RATE);
        expect(hrMain!.targetLow).toBe(235); // 135 + 100
        expect(hrMain!.targetHigh).toBe(252); // 152 + 100
    });

    it('correctly maps sport categories', () => {
        expect(resolveFitSport('RUN')).toBe(1);
        expect(resolveFitSport(undefined, 'LONG_RUN')).toBe(1);
        expect(resolveFitSport('BIKE')).toBe(2);
        expect(resolveFitSport(undefined, 'RIDE')).toBe(2);
        expect(resolveFitSport('SWIM')).toBe(5);
        expect(resolveFitSport('STRENGTH')).toBe(10);
    });
});
