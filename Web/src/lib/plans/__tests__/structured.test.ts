import {
    parseStructuredWorkout,
    flattenStructuredWorkout,
    summarizeStructuredWorkout,
    resolveWorkoutSport,
    structuredWorkoutV2Schema,
    type StructuredWorkoutV2,
    type StructuredStep,
} from '../structured';

describe('Structured Workout v2 Schema & Parser', () => {
    describe('resolveWorkoutSport', () => {
        it('resolves swim types to SWIM', () => {
            expect(resolveWorkoutSport('SWIM')).toBe('SWIM');
            expect(resolveWorkoutSport('SWIM_DRILL')).toBe('SWIM');
            expect(resolveWorkoutSport('OPEN_WATER_SWIM')).toBe('SWIM');
        });

        it('resolves bike types to BIKE', () => {
            expect(resolveWorkoutSport('RIDE')).toBe('BIKE');
            expect(resolveWorkoutSport('LONG_RIDE')).toBe('BIKE');
            expect(resolveWorkoutSport('RIDE_INTERVALS')).toBe('BIKE');
            expect(resolveWorkoutSport('BRICK')).toBe('BIKE');
        });

        it('resolves strength types to STRENGTH', () => {
            expect(resolveWorkoutSport('STRENGTH')).toBe('STRENGTH');
            expect(resolveWorkoutSport('CORE')).toBe('STRENGTH');
        });

        it('defaults to sport or RUN', () => {
            expect(resolveWorkoutSport('INTERVALS', 'RUN')).toBe('RUN');
            expect(resolveWorkoutSport('TEMPO', 'SWIM')).toBe('SWIM');
            expect(resolveWorkoutSport(null, null)).toBe('RUN');
        });
    });

    describe('Zod Schema Validation & Depth Limits', () => {
        it('accepts valid canonical v2 workout with repeat depth 1', () => {
            const v2: StructuredWorkoutV2 = {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'warmup',
                        duration: { type: 'distance', meters: 2000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 320 },
                    },
                    {
                        kind: 'repeat',
                        times: 5,
                        setRest: { type: 'time', seconds: 60 },
                        steps: [
                            {
                                kind: 'work',
                                duration: { type: 'distance', meters: 1000 },
                                target: { type: 'pace', unit: 'sec_per_km', min: 240, max: 245 },
                            },
                        ],
                    },
                    {
                        kind: 'cooldown',
                        duration: { type: 'distance', meters: 2000 },
                    },
                ],
            };
            const result = structuredWorkoutV2Schema.safeParse(v2);
            expect(result.success).toBe(true);
        });

        it('rejects repeat groups with nesting depth > 3', () => {
            const deepWorkout = {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'repeat',
                        times: 2,
                        steps: [
                            {
                                kind: 'repeat',
                                times: 2,
                                steps: [
                                    {
                                        kind: 'repeat',
                                        times: 2,
                                        steps: [
                                            {
                                                kind: 'repeat',
                                                times: 2,
                                                steps: [
                                                    {
                                                        kind: 'work',
                                                        duration: { type: 'distance', meters: 400 },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            const result = structuredWorkoutV2Schema.safeParse(deepWorkout);
            expect(result.success).toBe(false);
        });

        it('rejects repeat times > 100 or times < 1', () => {
            expect(
                structuredWorkoutV2Schema.safeParse({
                    version: 2,
                    source: 'editor',
                    steps: [
                        {
                            kind: 'repeat',
                            times: 101,
                            steps: [{ kind: 'work', duration: { type: 'time', seconds: 60 } }],
                        },
                    ],
                }).success
            ).toBe(false);

            expect(
                structuredWorkoutV2Schema.safeParse({
                    version: 2,
                    source: 'editor',
                    steps: [
                        {
                            kind: 'repeat',
                            times: 0,
                            steps: [{ kind: 'work', duration: { type: 'time', seconds: 60 } }],
                        },
                    ],
                }).success
            ).toBe(false);
        });

        it('rejects min > max for targets', () => {
            expect(
                structuredWorkoutV2Schema.safeParse({
                    version: 2,
                    source: 'editor',
                    steps: [
                        {
                            kind: 'work',
                            duration: { type: 'time', seconds: 300 },
                            target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 250 },
                        },
                    ],
                }).success
            ).toBe(false);

            expect(
                structuredWorkoutV2Schema.safeParse({
                    version: 2,
                    source: 'editor',
                    steps: [
                        {
                            kind: 'work',
                            duration: { type: 'time', seconds: 300 },
                            target: { type: 'power', minWatts: 300, maxWatts: 250 },
                        },
                    ],
                }).success
            ).toBe(false);

            expect(
                structuredWorkoutV2Schema.safeParse({
                    version: 2,
                    source: 'editor',
                    steps: [
                        {
                            kind: 'work',
                            duration: { type: 'time', seconds: 300 },
                            target: { type: 'hr', minBpm: 170, maxBpm: 150 },
                        },
                    ],
                }).success
            ).toBe(false);
        });
    });

    describe('parseStructuredWorkout Multi-Shape Support', () => {
        it('parses Shape 1 (Canonical v2)', () => {
            const input = {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'work',
                        duration: { type: 'distance', meters: 5000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 280, max: 290 },
                    },
                ],
            };
            const parsed = parseStructuredWorkout(input, 'TEMPO');
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe(2);
            expect(parsed?.steps[0].kind).toBe('work');
        });

        it('parses Shape 2 (Generator flat v1)', () => {
            const input = {
                version: 1,
                source: 'generated-plan',
                steps: [
                    { type: 'warmup', name: 'Warmup Jog', distanceMeters: 1500, paceSecondsPerKm: 330, hrZone: 2 },
                    { type: 'work', name: 'Threshold Block', durationSeconds: 1200, paceSecondsPerKm: 270, hrZone: 4 },
                    { type: 'cooldown', name: 'Cooldown', distanceMeters: 1000 },
                ],
            };
            const parsed = parseStructuredWorkout(input, 'TEMPO');
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe(2);
            expect(parsed?.steps).toHaveLength(3);
            const s0 = parsed?.steps[0] as StructuredStep;
            const s1 = parsed?.steps[1] as StructuredStep;
            expect(s0.kind).toBe('warmup');
            expect(s0.duration).toEqual({ type: 'distance', meters: 1500 });
            expect(s1.kind).toBe('work');
            expect(s1.duration).toEqual({ type: 'time', seconds: 1200 });
            expect(s1.target).toEqual({
                type: 'pace',
                unit: 'sec_per_km',
                min: 270,
                max: 270,
            });
        });

        it('parses Shape 2 for Swim workout with sec_per_100m unit', () => {
            const input = {
                version: 1,
                steps: [
                    { type: 'work', name: '100m TT', distanceMeters: 100, paceSecondsPerKm: 110 },
                ],
            };
            const parsed = parseStructuredWorkout(input, 'SWIM');
            expect(parsed).not.toBeNull();
            const s0 = parsed?.steps[0] as StructuredStep;
            expect(s0.target).toEqual({
                type: 'pace',
                unit: 'sec_per_100m',
                min: 110,
                max: 110,
            });
        });

        it('parses Shape 3 (ProgressionWeekData builder)', () => {
            const input = {
                weekOffset: 2,
                warmup: { distance: 1600, pace: 'E' },
                main: [
                    { reps: 6, distance: 800, pace: 'I', restSeconds: 120 },
                ],
                cooldown: { distance: 1600, pace: 'E' },
            };
            const parsed = parseStructuredWorkout(input, 'INTERVALS', 50);
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe(2);
            expect(parsed?.source).toBe('progression');
            expect(parsed?.steps).toHaveLength(3); // Warmup + RepeatGroup + Cooldown
            const repeat = parsed?.steps[1] as any;
            expect(repeat.kind).toBe('repeat');
            expect(repeat.times).toBe(6);
            expect(repeat.setRest).toEqual({ type: 'time', seconds: 120 });
            expect(repeat.steps[0].kind).toBe('work');
            expect(repeat.steps[0].duration).toEqual({ type: 'distance', meters: 800 });
        });

        it('parses Shape 4a (Template items with repeats)', () => {
            const input = [
                { type: 'warmup', distanceM: 2000, description: 'Easy jog' },
                {
                    type: 'repeat',
                    repeat: 8,
                    description: '8x400m intervals',
                    steps: [
                        { type: 'interval', distanceM: 400, targetPace: 95 },
                        { type: 'recovery', durationS: 90 },
                    ],
                },
                { type: 'cooldown', distanceM: 1600 },
            ];
            const parsed = parseStructuredWorkout(input, 'INTERVALS');
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe(2);
            expect(parsed?.source).toBe('template');
            expect(parsed?.steps).toHaveLength(3);
            const repeat = parsed?.steps[1] as any;
            expect(repeat.kind).toBe('repeat');
            expect(repeat.times).toBe(8);
            expect(repeat.steps).toHaveLength(2);
            expect(repeat.steps[0].kind).toBe('work');
            expect(repeat.steps[1].kind).toBe('recovery');
        });

        it('parses Shape 4b (Legacy progression array with description only)', () => {
            const input = [
                { type: 'main', description: 'Run 10km steady' },
            ];
            const parsed = parseStructuredWorkout(input, 'EASY');
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe(2);
            const s0 = parsed?.steps[0] as StructuredStep;
            expect(s0.label).toBe('Run 10km steady');
            expect(s0.duration).toEqual({ type: 'lap_press' });
            expect(s0.target).toEqual({ type: 'free' });
        });
    });

    describe('flattenStructuredWorkout', () => {
        it('flattens repeat groups and injects setRest between iterations only', () => {
            const workout: StructuredWorkoutV2 = {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'repeat',
                        times: 3,
                        setRest: { type: 'time', seconds: 60 },
                        steps: [
                            { kind: 'work', duration: { type: 'distance', meters: 400 } },
                        ],
                    },
                ],
            };
            const flattened = flattenStructuredWorkout(workout);
            // Rep 1 (work), Rest 1, Rep 2 (work), Rest 2, Rep 3 (work). No Rest after Rep 3!
            expect(flattened).toHaveLength(5);
            expect(flattened[0].kind).toBe('work');
            expect(flattened[0].repeatIteration).toBe(1);
            expect(flattened[1].isSetRest).toBe(true);
            expect(flattened[1].kind).toBe('recovery');
            expect(flattened[2].kind).toBe('work');
            expect(flattened[2].repeatIteration).toBe(2);
            expect(flattened[3].isSetRest).toBe(true);
            expect(flattened[4].kind).toBe('work');
            expect(flattened[4].repeatIteration).toBe(3);
        });
    });

    describe('summarizeStructuredWorkout', () => {
        it('computes total distance, duration, and TSS', () => {
            const workout: StructuredWorkoutV2 = {
                version: 2,
                source: 'engine',
                steps: [
                    {
                        kind: 'warmup',
                        duration: { type: 'distance', meters: 2000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 300 },
                    },
                    {
                        kind: 'work',
                        duration: { type: 'distance', meters: 5000 },
                        target: { type: 'pace', unit: 'sec_per_km', min: 240, max: 240 },
                    },
                ],
            };
            const summary = summarizeStructuredWorkout(workout, 300, 200);
            expect(summary.totalDistanceMeters).toBe(7000);
            // 2000m @ 300s/km = 600s, 5000m @ 240s/km = 1200s. Total = 1800s.
            expect(summary.totalDurationSeconds).toBe(1800);
            expect(summary.estimatedTss).toBeGreaterThan(0);
            expect(summary.summaryText).toContain('2.0km warmup + 5.0km work');
        });
    });
});
