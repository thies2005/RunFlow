/**
 * Unit tests for the StructuredWorkoutV2 schema module (master workflow task A1).
 *
 * Covers:
 *   - resolveWorkoutSport precedence (workoutType over sport)
 *   - all five legacy/canonical input shapes of parseStructuredWorkout
 *   - validation rejections: repeat depth > 3, times > 100, min > max ranges
 *   - flattenStructuredWorkout incl. setRest insertion semantics
 *   - summarizeStructuredWorkout totals, TSS estimate and summary text
 *   - pace / power unit utilities
 *
 * Pure module: no Prisma or network mocking required (calculateTrainingPaces
 * is deterministic math, consumed — not modified — from the exclusion zone).
 */

import {
    MAX_FLATTENED_STEPS,
    MAX_REPEAT_DEPTH,
    MAX_REPEAT_TIMES,
    flattenStructuredWorkout,
    flattenStructuredWorkoutDetailed,
    formatPace,
    ftpPercentFromWatts,
    maxRepeatDepth,
    paceSecPerKmToSecPer100m,
    parseStructuredWorkout,
    resolveWorkoutSport,
    structuredWorkoutV2Schema,
    summarizeStructuredWorkout,
    wattsFromFtpPercent,
    type RepeatGroup,
    type StepNode,
    type StructuredStep,
    type StructuredWorkoutV2,
} from '../structured';
import { calculateTrainingPaces } from '../../metrics/vdot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isRepeat = (node: StepNode): node is RepeatGroup => node.kind === 'repeat';
const isStep = (node: StepNode): node is StructuredStep => node.kind !== 'repeat';

function repeat(times: number, steps: StepNode[], setRest?: { type: 'time'; seconds: number }, label?: string): RepeatGroup {
    const group: RepeatGroup = { kind: 'repeat', times, steps };
    if (setRest) group.setRest = setRest;
    if (label) group.label = label;
    return group;
}

function step(kind: StructuredStep['kind'], duration: StructuredStep['duration'], extra?: Partial<StructuredStep>): StructuredStep {
    return { kind, duration, ...extra };
}

function nestRepeats(depth: number, times: number): StepNode[] {
    // Builds `depth` levels of nested repeats, each wrapping a single leaf at the core.
    let inner: StepNode[] = [step('work', { type: 'time', seconds: 60 })];
    for (let i = 0; i < depth; i++) {
        inner = [repeat(times, inner)];
    }
    return inner;
}

const CANONICAL_V2: StructuredWorkoutV2 = {
    version: 2,
    source: 'builder',
    steps: [
        step('warmup', { type: 'distance', meters: 2000 }, {
            target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 320 },
            hrZone: 2,
        }),
        repeat(5, [
            step('work', { type: 'distance', meters: 1000 }, {
                target: { type: 'pace', unit: 'sec_per_km', min: 240, max: 240 },
                cadenceRpm: 180,
            }),
        ], { type: 'time', seconds: 90 }, 'Main set'),
        step('cooldown', { type: 'distance', meters: 1000 }),
    ],
};

// ---------------------------------------------------------------------------
// resolveWorkoutSport
// ---------------------------------------------------------------------------

describe('resolveWorkoutSport', () => {
    it('maps known swim types to SWIM regardless of sport label', () => {
        expect(resolveWorkoutSport('SWIM')).toBe('SWIM');
        expect(resolveWorkoutSport('SWIM_DRILL')).toBe('SWIM');
        expect(resolveWorkoutSport('OPEN_WATER_SWIM')).toBe('SWIM');
        expect(resolveWorkoutSport('SWIM', 'RUN')).toBe('SWIM');
    });

    it('maps bike types (incl. BRICK) to BIKE', () => {
        expect(resolveWorkoutSport('RIDE')).toBe('BIKE');
        expect(resolveWorkoutSport('LONG_RIDE')).toBe('BIKE');
        expect(resolveWorkoutSport('RIDE_INTERVALS')).toBe('BIKE');
        expect(resolveWorkoutSport('BRICK')).toBe('BIKE');
    });

    it('maps strength types to STRENGTH', () => {
        expect(resolveWorkoutSport('STRENGTH')).toBe('STRENGTH');
        expect(resolveWorkoutSport('CORE')).toBe('STRENGTH');
    });

    it('falls back to sport only when it is SWIM / BIKE / STRENGTH', () => {
        expect(resolveWorkoutSport('INTERVALS', 'SWIM')).toBe('SWIM');
        expect(resolveWorkoutSport('INTERVALS', 'BIKE')).toBe('BIKE');
        expect(resolveWorkoutSport('INTERVALS', 'STRENGTH')).toBe('STRENGTH');
        expect(resolveWorkoutSport('INTERVALS', 'RUN')).toBe('RUN');
        expect(resolveWorkoutSport('INTERVALS', 'something-else')).toBe('RUN');
    });

    it('defaults to RUN for nullish inputs', () => {
        expect(resolveWorkoutSport(null, null)).toBe('RUN');
        expect(resolveWorkoutSport()).toBe('RUN');
    });
});

// ---------------------------------------------------------------------------
// Shape 1 — canonical v2
// ---------------------------------------------------------------------------

describe('parseStructuredWorkout — Shape 1 (canonical v2)', () => {
    it('accepts a valid canonical v2 document and keeps it intact', () => {
        const parsed = parseStructuredWorkout(CANONICAL_V2, 'INTERVALS');
        expect(parsed).not.toBeNull();
        expect(parsed!.version).toBe(2);
        expect(parsed!.source).toBe('builder');
        expect(parsed!.steps).toHaveLength(3);
        expect(isRepeat(parsed!.steps[1])).toBe(true);

        const repeatGroup = parsed!.steps[1] as RepeatGroup;
        expect(repeatGroup.times).toBe(5);
        expect(repeatGroup.setRest).toEqual({ type: 'time', seconds: 90 });
        expect(repeatGroup.label).toBe('Main set');

        const workStep = repeatGroup.steps[0] as StructuredStep;
        expect(workStep.target).toEqual({ type: 'pace', unit: 'sec_per_km', min: 240, max: 240 });
        expect(workStep.cadenceRpm).toBe(180);
    });

    it('strips unknown fields (Zod default)', () => {
        const dirty = {
            ...CANONICAL_V2,
            steps: [
                {
                    kind: 'work',
                    duration: { type: 'time', seconds: 300 },
                    // Extra unknown key must be tolerated and stripped by the parser.
                    legacyJunk: 'delete-me',
                    target: { type: 'rpe', value: 7 },
                },
            ],
        } as unknown as StructuredWorkoutV2;
        const parsed = parseStructuredWorkout(dirty);
        expect(parsed).not.toBeNull();
        expect(parsed!.steps[0]).toEqual({
            kind: 'work',
            duration: { type: 'time', seconds: 300 },
            target: { type: 'rpe', value: 7 },
        });
    });

    it('rejects an unknown source', () => {
        expect(parseStructuredWorkout({ ...CANONICAL_V2, source: 'hacker' })).toBeNull();
    });

    it('rejects an invalid duration (seconds out of range)', () => {
        const bad: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [step('work', { type: 'time', seconds: 86401 })],
        };
        expect(parseStructuredWorkout(bad)).toBeNull();
    });

    it('rejects times > 100', () => {
        const bad: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [repeat(MAX_REPEAT_TIMES + 1, [step('work', { type: 'time', seconds: 30 })])],
        };
        expect(parseStructuredWorkout(bad)).toBeNull();
    });

    it('accepts times === 100 (boundary)', () => {
        const ok: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [repeat(MAX_REPEAT_TIMES, [step('work', { type: 'time', seconds: 30 })])],
        };
        expect(parseStructuredWorkout(ok)).not.toBeNull();
    });

    it('rejects repeat nesting deeper than 3 but accepts exactly 3', () => {
        const tooDeep: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: nestRepeats(MAX_REPEAT_DEPTH + 1, 2),
        };
        expect(maxRepeatDepth(tooDeep.steps)).toBe(MAX_REPEAT_DEPTH + 1);
        expect(parseStructuredWorkout(tooDeep)).toBeNull();

        const atLimit: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: nestRepeats(MAX_REPEAT_DEPTH, 2),
        };
        expect(parseStructuredWorkout(atLimit)).not.toBeNull();
    });

    it('rejects pace min > max', () => {
        const bad: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [step('work', { type: 'distance', meters: 1000 }, {
                target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 250 },
            })],
        };
        expect(parseStructuredWorkout(bad)).toBeNull();
    });

    it('rejects hr minBpm > maxBpm and power minWatts > maxWatts', () => {
        const hrBad: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [step('work', { type: 'time', seconds: 600 }, {
                target: { type: 'hr', minBpm: 170, maxBpm: 150 },
            })],
        };
        expect(parseStructuredWorkout(hrBad)).toBeNull();

        const powerBad: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [step('work', { type: 'time', seconds: 600 }, {
                target: { type: 'power', minWatts: 260, maxWatts: 200 },
            })],
        };
        expect(parseStructuredWorkout(powerBad)).toBeNull();
    });

    it('validates directly via the exported Zod schema as well', () => {
        expect(structuredWorkoutV2Schema.safeParse(CANONICAL_V2).success).toBe(true);
        expect(structuredWorkoutV2Schema.safeParse({ version: 2, source: 'mcp', steps: [] }).success).toBe(true);
        expect(structuredWorkoutV2Schema.safeParse({ version: 2, source: 'mcp' }).success).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Shape 2 — generator flat v1
// ---------------------------------------------------------------------------

describe('parseStructuredWorkout — Shape 2 (flat v1)', () => {
    const v1 = {
        version: 1,
        source: 'generated-plan',
        steps: [
            { type: 'warmup', name: 'Easy jog', distanceMeters: 2000 },
            { type: 'work', name: 'Bike Leg', durationSeconds: 2700, paceSecondsPerKm: 225, hrZone: 3 },
            { type: 'steady', name: 'Strength Session', durationSeconds: 1800, hrZone: 2 },
            { type: 'recovery', name: 'Both', distanceMeters: 400, durationSeconds: 60 },
            { type: 'cooldown', name: 'Untimed chat' },
        ],
    };

    it('maps type→kind, name→label and resolves source engine', () => {
        const parsed = parseStructuredWorkout(v1, 'RIDE');
        expect(parsed).not.toBeNull();
        expect(parsed!.version).toBe(2);
        expect(parsed!.source).toBe('engine');
        expect(parsed!.steps).toHaveLength(5);

        const warmup = parsed!.steps[0] as StructuredStep;
        expect(warmup.kind).toBe('warmup');
        expect(warmup.label).toBe('Easy jog');
        expect(warmup.duration).toEqual({ type: 'distance', meters: 2000 });
    });

    it('applies duration precedence: distanceMeters > durationSeconds > lap_press', () => {
        const parsed = parseStructuredWorkout(v1, 'RIDE')!;
        // distanceMeters > 0 wins over durationSeconds
        expect((parsed.steps[3] as StructuredStep).duration).toEqual({ type: 'distance', meters: 400 });
        // neither present → lap_press
        expect((parsed.steps[4] as StructuredStep).duration).toEqual({ type: 'lap_press' });
    });

    it('maps paceSecondsPerKm to a pace target and preserves hrZone', () => {
        const parsed = parseStructuredWorkout(v1, 'INTERVALS')!;
        const work = parsed.steps[1] as StructuredStep;
        expect(work.target).toEqual({ type: 'pace', unit: 'sec_per_km', min: 225, max: 225 });
        expect(work.hrZone).toBe(3);
    });

    it('uses sec_per_100m pace unit when the workout resolves to SWIM', () => {
        const swimV1 = {
            version: 1,
            source: 'generated-plan',
            steps: [{ type: 'work', name: 'Main swim', durationSeconds: 1200, paceSecondsPerKm: 95 }],
        };
        const parsed = parseStructuredWorkout(swimV1, 'SWIM')!;
        expect((parsed.steps[0] as StructuredStep).target).toEqual({
            type: 'pace', unit: 'sec_per_100m', min: 95, max: 95,
        });
    });

    it('maps an hrZone-only step to an hr target plus secondary hrZone', () => {
        const parsed = parseStructuredWorkout(v1, 'INTERVALS')!;
        const steady = parsed.steps[2] as StructuredStep;
        expect(steady.target).toEqual({ type: 'hr', zone: 2 });
        expect(steady.hrZone).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Shape 3 — builder ProgressionWeekData
// ---------------------------------------------------------------------------

describe('parseStructuredWorkout — Shape 3 (ProgressionWeekData)', () => {
    const paces55 = calculateTrainingPaces(55);

    const week = {
        weekOffset: 2,
        warmup: { distance: 2000, pace: 'E' },
        main: [
            { reps: 6, distance: 800, pace: 'I', restSeconds: 90 },
            { reps: 4, distance: 200, pace: 'R', restSeconds: 120 },
        ],
        cooldown: { distance: 1600, pace: 'E' },
    };

    it('maps warmup/main/cooldown with numeric paces from calculateTrainingPaces(vdot)', () => {
        const parsed = parseStructuredWorkout(week, 'INTERVALS', 55);
        expect(parsed).not.toBeNull();
        expect(parsed!.version).toBe(2);
        expect(parsed!.source).toBe('progression');
        expect(parsed!.steps).toHaveLength(4);

        const warmup = parsed!.steps[0] as StructuredStep;
        expect(warmup.kind).toBe('warmup');
        expect(warmup.duration).toEqual({ type: 'distance', meters: 2000 });
        expect(warmup.target).toEqual({
            type: 'pace',
            unit: 'sec_per_km',
            min: Math.round(paces55.easy.min * 10) / 10,
            max: Math.round(paces55.easy.max * 10) / 10,
        });

        const cooldown = parsed!.steps[3] as StructuredStep;
        expect(cooldown.kind).toBe('cooldown');
        expect(cooldown.duration).toEqual({ type: 'distance', meters: 1600 });
    });

    it('maps each main item to a RepeatGroup with times/reps, setRest and a work step', () => {
        const parsed = parseStructuredWorkout(week, 'INTERVALS', 55)!;

        const group1 = parsed.steps[1] as RepeatGroup;
        expect(group1.kind).toBe('repeat');
        expect(group1.times).toBe(6);
        expect(group1.setRest).toEqual({ type: 'time', seconds: 90 });
        expect(group1.steps).toHaveLength(1);

        const work1 = group1.steps[0] as StructuredStep;
        expect(work1.kind).toBe('work');
        expect(work1.duration).toEqual({ type: 'distance', meters: 800 });
        expect(work1.target).toEqual({
            type: 'pace', unit: 'sec_per_km', min: Math.round(paces55.interval), max: Math.round(paces55.interval),
        });

        const group2 = parsed.steps[2] as RepeatGroup;
        expect(group2.times).toBe(4);
        expect((group2.steps[0] as StructuredStep).target).toEqual({
            type: 'pace', unit: 'sec_per_km', min: Math.round(paces55.repetition), max: Math.round(paces55.repetition),
        });
    });

    it('omits setRest when restSeconds is 0 and uses free target for unknown pace letters', () => {
        const noRest = {
            warmup: { distance: 1000, pace: 'X' },
            main: [{ reps: 3, distance: 400, pace: 'X', restSeconds: 0 }],
        };
        const parsed = parseStructuredWorkout(noRest, 'INTERVALS')!;
        const group = parsed.steps[1] as RepeatGroup;
        expect(group.setRest).toBeUndefined();
        expect((group.steps[0] as StructuredStep).target).toEqual({ type: 'free' });
    });

    it('clamps out-of-contract legacy reps instead of rejecting the workout', () => {
        const huge = { main: [{ reps: 500, distance: 100, pace: 'I', restSeconds: 30 }] };
        const parsed = parseStructuredWorkout(huge, 'INTERVALS')!;
        expect((parsed!.steps[0] as RepeatGroup).times).toBe(MAX_REPEAT_TIMES);
    });
});

// ---------------------------------------------------------------------------
// Shapes 4a / 4b — bare arrays
// ---------------------------------------------------------------------------

describe('parseStructuredWorkout — Shape 4a (default template arrays)', () => {
    const template = [
        { type: 'warmup', distanceM: 2000, description: 'Easy jog + dynamic drills' },
        {
            type: 'repeat',
            repeat: 8,
            steps: [
                { type: 'interval', distanceM: 400, targetPace: 95, description: '400m hard (~3:45/km)' },
                { type: 'recovery', durationS: 180, description: '200m easy jog (~90s)' },
            ],
        },
        { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
    ];

    it('maps template elements to v2 steps and repeats to RepeatGroups', () => {
        const parsed = parseStructuredWorkout(template, 'INTERVALS');
        expect(parsed).not.toBeNull();
        expect(parsed!.source).toBe('template');
        expect(parsed!.steps).toHaveLength(3);

        const warmup = parsed!.steps[0] as StructuredStep;
        expect(warmup.kind).toBe('warmup');
        expect(warmup.duration).toEqual({ type: 'distance', meters: 2000 });
        expect(warmup.label).toBe('Easy jog + dynamic drills');

        const group = parsed!.steps[1] as RepeatGroup;
        expect(group.kind).toBe('repeat');
        expect(group.times).toBe(8);
        expect(group.steps).toHaveLength(2);

        const interval = group.steps[0] as StructuredStep;
        expect(interval.kind).toBe('work');
        expect(interval.duration).toEqual({ type: 'distance', meters: 400 });
        expect(interval.target).toEqual({ type: 'pace', unit: 'sec_per_km', min: 95, max: 95 });
        expect(interval.label).toBe('400m hard (~3:45/km)');

        const recovery = group.steps[1] as StructuredStep;
        expect(recovery.kind).toBe('recovery');
        expect(recovery.duration).toEqual({ type: 'time', seconds: 180 });
    });

    it('maps durationM (minutes) to seconds and standalone intervals to work steps', () => {
        const parsed = parseStructuredWorkout([
            { type: 'warmup', durationM: 15, description: 'Spin easy' },
            { type: 'interval', durationS: 1200, targetPace: 240, description: '20 min threshold' },
            { type: 'steady', durationM: 10 },
        ], 'TEMPO')!;
        expect((parsed.steps[0] as StructuredStep).duration).toEqual({ type: 'time', seconds: 900 });
        expect((parsed.steps[1] as StructuredStep).duration).toEqual({ type: 'time', seconds: 1200 });
        expect((parsed.steps[2] as StructuredStep).duration).toEqual({ type: 'time', seconds: 600 });
        expect((parsed.steps[2] as StructuredStep).kind).toBe('steady');
    });
});

describe('parseStructuredWorkout — Shape 4b (legacy progression arrays)', () => {
    it('maps { type, description } items: main→work, lap_press duration, free target', () => {
        const legacy = [
            { type: 'warmup', description: '15 min easy jog' },
            { type: 'main', description: '6x400m hard w/ 90s jog recovery' },
            { type: 'cooldown', description: '10 min easy jog' },
        ];
        const parsed = parseStructuredWorkout(legacy, 'INTERVALS');
        expect(parsed).not.toBeNull();
        expect(parsed!.source).toBe('progression');
        expect(parsed!.steps).toHaveLength(3);

        const main = parsed!.steps[1] as StructuredStep;
        expect(main.kind).toBe('work');
        expect(main.label).toBe('6x400m hard w/ 90s jog recovery');
        expect(main.duration).toEqual({ type: 'lap_press' });
        expect(main.target).toEqual({ type: 'free' });
    });
});

// ---------------------------------------------------------------------------
// Garbage input
// ---------------------------------------------------------------------------

describe('parseStructuredWorkout — invalid input', () => {
    it('returns null for garbage without throwing', () => {
        expect(parseStructuredWorkout(null)).toBeNull();
        expect(parseStructuredWorkout(undefined)).toBeNull();
        expect(parseStructuredWorkout(42)).toBeNull();
        expect(parseStructuredWorkout('structured')).toBeNull();
        expect(parseStructuredWorkout({})).toBeNull();
        expect(parseStructuredWorkout({ version: 3, steps: [] })).toBeNull();
        expect(parseStructuredWorkout({ version: 1, steps: 'not-an-array' })).toBeNull();
        expect(parseStructuredWorkout([])).toBeNull();
        expect(parseStructuredWorkout([{ nope: true }])).toBeNull();
        expect(parseStructuredWorkout({ version: 2, source: 'mcp', steps: [{ kind: 'work' }] })).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Flattening
// ---------------------------------------------------------------------------

describe('flattenStructuredWorkout', () => {
    it('expands repeats with setRest between — but not after — iterations', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [
                step('warmup', { type: 'time', seconds: 600 }),
                repeat(3, [step('work', { type: 'time', seconds: 300 })], { type: 'time', seconds: 60 }),
                step('cooldown', { type: 'time', seconds: 300 }),
            ],
        };

        const flat = flattenStructuredWorkout(workout);
        // warmup, [work rest work rest work], cooldown
        expect(flat).toHaveLength(1 + (3 + 2) + 1);
        expect(flat.map((s) => s.kind)).toEqual([
            'warmup', 'work', 'recovery', 'work', 'recovery', 'work', 'cooldown',
        ]);

        // rest steps carry the repeat position of the iteration they follow
        const firstRest = flat[2];
        expect(firstRest.duration).toEqual({ type: 'time', seconds: 60 });
        expect(firstRest.repeatIndex).toBe(0);
        expect(firstRest.repeatCount).toBe(3);
        expect(firstRest.depth).toBe(1);

        const lastWork = flat[5];
        expect(lastWork.repeatIndex).toBe(2);
        expect(lastWork.repeatCount).toBe(3);
        expect(lastWork.depth).toBe(1);

        // top-level steps are depth 0 with no repeat metadata
        expect(flat[0].depth).toBe(0);
        expect(flat[0].repeatIndex).toBeUndefined();
        expect(flat[0].repeatCount).toBeUndefined();
        expect(flat[6].kind).toBe('cooldown');
    });

    it('omits setRest entirely for a single-iteration repeat', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [repeat(1, [step('work', { type: 'time', seconds: 60 })], { type: 'time', seconds: 30 })],
        };
        const flat = flattenStructuredWorkout(workout);
        expect(flat).toHaveLength(1);
        expect(flat[0].kind).toBe('work');
    });

    it('flattens nested repeats depth-first preserving order', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [
                repeat(2, [
                    repeat(2, [step('work', { type: 'time', seconds: 30 })], { type: 'time', seconds: 10 }, 'inner'),
                ], undefined, 'outer'),
            ],
        };
        const flat = flattenStructuredWorkout(workout);
        // outer ×2: inner ×2 work + 1 rest → 3 each → 6 total
        expect(flat).toHaveLength(6);
        expect(flat.filter((s) => s.kind === 'work')).toHaveLength(4);
        expect(flat.filter((s) => s.kind === 'recovery')).toHaveLength(2);
        // inner nodes sit at depth 2 (outer repeat → inner repeat → work)
        expect(flat.every((s) => s.depth === 2)).toBe(true);
        expect(flat[0].repeatCount).toBe(2);
    });

    it('carries label, note, target, hrZone and cadenceRpm onto flattened steps', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'mcp',
            steps: [step('work', { type: 'time', seconds: 300 }, {
                label: 'Threshold',
                note: 'controlled discomfort',
                target: { type: 'power', minWatts: 220, maxWatts: 240 },
                hrZone: 4,
                cadenceRpm: 90,
            })],
        };
        const flat = flattenStructuredWorkout(workout);
        expect(flat[0].label).toBe('Threshold');
        expect(flat[0].note).toBe('controlled discomfort');
        expect(flat[0].target).toEqual({ type: 'power', minWatts: 220, maxWatts: 240 });
        expect(flat[0].hrZone).toBe(4);
        expect(flat[0].cadenceRpm).toBe(90);
    });
});

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

describe('summarizeStructuredWorkout', () => {
    it('totals distance/duration over expanded repeats and estimates TSS', () => {
        // 2km WU (fallback pace) + 8× (400m @ 225s/km, 90s rest) + 1.6km CD (fallback pace)
        const parsed = parseStructuredWorkout([
            { type: 'warmup', distanceM: 2000, description: 'Easy jog' },
            {
                type: 'repeat',
                repeat: 8,
                steps: [
                    { type: 'interval', distanceM: 400, targetPace: 225, description: '400m' },
                    { type: 'recovery', durationS: 90, description: 'jog' },
                ],
            },
            { type: 'cooldown', distanceM: 1600, description: 'Easy jog' },
        ], 'INTERVALS')!;

        const summary = summarizeStructuredWorkout(parsed, 300, null);

        expect(summary.totalDistanceMeters).toBe(2000 + 8 * 400 + 1600);
        // WU: 2km × 300s/km = 600s; each iteration: 0.4km × 225s/km = 90s work
        // + 90s recovery child step → 8 × 180s = 1440s; CD: 1.6km × 300s/km = 480s.
        expect(summary.totalDurationSeconds).toBe(600 + 1440 + 480);
        expect(summary.estimatedTss).toBeGreaterThan(0);
        // Template arrays express recovery as an explicit child step, so there
        // is no setRest clause; labels and durations are concatenated
        // (90s renders as 1.5min per the ≥60s → minutes rule).
        expect(summary.summaryText).toBe('Easy jog 2km + 8× (400m 400m @ 3:45/km + jog 1.5min) + Easy jog 1.6km');
    });

    it('estimates TSS higher for a threshold session than an easy session of equal length', () => {
        const makeWorkout = (rpeValue: number): StructuredWorkoutV2 => ({
            version: 2,
            source: 'builder',
            steps: [step('work', { type: 'time', seconds: 3600 }, { target: { type: 'rpe', value: rpeValue } })],
        });
        const hard = summarizeStructuredWorkout(makeWorkout(9));
        const easy = summarizeStructuredWorkout(makeWorkout(4));
        expect(hard.estimatedTss).toBeGreaterThan(easy.estimatedTss);
        // rTSS formula sanity: 1h @ IF 0.9 ≈ 81 TSS
        expect(hard.estimatedTss).toBeCloseTo(81, 0);
        // 1h @ IF 0.4 ≈ 16 TSS
        expect(easy.estimatedTss).toBeCloseTo(16, 0);
    });

    it('uses power targets with ftpWatts for bike workouts', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'engine',
            steps: [step('work', { type: 'time', seconds: 3600 }, {
                target: { type: 'power', ftpPercent: 100 },
            })],
        };
        const summary = summarizeStructuredWorkout(workout, null, 220);
        expect(summary.totalDurationSeconds).toBe(3600);
        expect(summary.estimatedTss).toBeCloseTo(100, 0); // 1h @ IF 1.0 = 100 TSS
    });

    it('lap_press steps contribute no distance or duration but keep readable labels', () => {
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'progression',
            steps: [
                { kind: 'work', label: 'Fartlek play', duration: { type: 'lap_press' }, target: { type: 'free' } },
                step('cooldown', { type: 'distance', meters: 1000 }),
            ],
        };
        const summary = summarizeStructuredWorkout(workout, 300);
        expect(summary.totalDistanceMeters).toBe(1000);
        expect(summary.totalDurationSeconds).toBe(300);
        expect(summary.summaryText).toBe('Fartlek play lap press + 1km');
    });
});

// ---------------------------------------------------------------------------
// Unit utilities
// ---------------------------------------------------------------------------

describe('pace / power unit utilities', () => {
    it('formatPace renders m:ss with the right unit suffix', () => {
        expect(formatPace(225, 'sec_per_km')).toBe('3:45/km');
        expect(formatPace(300.4, 'sec_per_km')).toBe('5:00/km');
        expect(formatPace(95, 'sec_per_100m')).toBe('1:35/100m');
        expect(formatPace(59.6, 'sec_per_100m')).toBe('1:00/100m');
    });

    it('converts sec/km ↔ sec/100m (÷10)', () => {
        expect(paceSecPerKmToSecPer100m(300)).toBe(30);
        expect(paceSecPerKmToSecPer100m(225)).toBe(22.5);
    });

    it('converts between %FTP and watts', () => {
        expect(wattsFromFtpPercent(100, 220)).toBe(220);
        expect(wattsFromFtpPercent(90, 200)).toBe(180);
        expect(ftpPercentFromWatts(180, 200)).toBe(90);
        expect(ftpPercentFromWatts(165, 220)).toBe(75);
        expect(ftpPercentFromWatts(180, 0)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Review hardening (round 1)
// ---------------------------------------------------------------------------

describe('review hardening — hostile and boundary inputs', () => {
    it('returns null instead of throwing on pathologically deep v2 nesting', () => {
        // Built iteratively (2000 levels): JSON.parse accepts this depth, and
        // the parser must uphold its "never throws" contract.
        let steps: unknown = [{ kind: 'work', duration: { type: 'time', seconds: 60 } }];
        for (let i = 0; i < 2000; i++) {
            steps = [{ kind: 'repeat', times: 1, steps }];
        }
        const deep: unknown = { version: 2, source: 'editor', steps };
        expect(() => parseStructuredWorkout(deep)).not.toThrow();
        expect(parseStructuredWorkout(deep)).toBeNull();
    });

    it('truncates oversized legacy labels and stays idempotent on re-parse', () => {
        const longName = 'x'.repeat(500000);
        const legacy = {
            version: 1,
            source: 'generated-plan',
            steps: [{ type: 'work', name: longName, durationSeconds: 600 }],
        };
        const parsed = parseStructuredWorkout(legacy, 'INTERVALS')!;
        expect((parsed.steps[0] as StructuredStep).label).toHaveLength(200);

        // Idempotent: the upgraded tree re-validates as canonical v2 unchanged.
        const reparsed = parseStructuredWorkout(parsed, 'INTERVALS');
        expect(reparsed).toEqual(parsed);
    });

    it('caps the expanded player list for legal-but-huge repeat trees', () => {
        // 100×100 = 10,000 expanded leaves — valid per schema, far past the cap.
        const huge: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [repeat(100, [repeat(100, [step('work', { type: 'time', seconds: 30 })])])],
        };
        const flat = flattenStructuredWorkout(huge);
        expect(flat).toHaveLength(MAX_FLATTENED_STEPS);

        const summary = summarizeStructuredWorkout(huge, 300);
        expect(summary.totalDurationSeconds).toBe(MAX_FLATTENED_STEPS * 30);
    });
});

describe('review hardening — round 2', () => {
    it('summarizes deep hand-built trees without throwing (depth-bounded text walk)', () => {
        // 100,000 nested repeats — the round-1 hardening covered flatten and
        // parse; the summary-text walk must be bounded the same way.
        let steps: unknown = [{ kind: 'work', duration: { type: 'time', seconds: 60 } }];
        for (let i = 0; i < 100000; i++) {
            steps = [{ kind: 'repeat', times: 1, steps }];
        }
        const deep = { version: 2, source: 'editor', steps } as unknown as StructuredWorkoutV2;

        let summary: ReturnType<typeof summarizeStructuredWorkout> | null = null;
        expect(() => { summary = summarizeStructuredWorkout(deep); }).not.toThrow();
        expect(summary).not.toBeNull();
        expect(typeof summary!.summaryText).toBe('string');
        expect(summary!.truncated).toBe(true);
    });

    it('never ends a truncated list on an inter-iteration rest', () => {
        // 900 × (work + 30s rest) expands to 1799 entries — truncation would
        // previously land on a recovery step as the final entry.
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [repeat(900, [step('work', { type: 'time', seconds: 30 })], { type: 'time', seconds: 30 })],
        };
        const flat = flattenStructuredWorkout(workout);
        expect(flat.length).toBeLessThanOrEqual(MAX_FLATTENED_STEPS);
        expect(flat[flat.length - 1]!.kind).toBe('work');

        const detailed = flattenStructuredWorkoutDetailed(workout);
        expect(detailed.truncated).toBe(true);
        expect(detailed.steps[detailed.steps.length - 1]!.kind).toBe('work');
    });

    it('reports the truncation flag on summaries and detailed flattens', () => {
        const small: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            steps: [step('work', { type: 'time', seconds: 60 })],
        };
        expect(summarizeStructuredWorkout(small).truncated).toBe(false);
        expect(flattenStructuredWorkoutDetailed(small).truncated).toBe(false);

        const huge: StructuredWorkoutV2 = {
            version: 2,
            source: 'builder',
            // 600 iterations × 2 leaves = 1200 expanded entries > cap.
            steps: [repeat(600, [
                step('work', { type: 'time', seconds: 30 }),
                step('work', { type: 'time', seconds: 30 }),
            ])],
        };
        expect(flattenStructuredWorkoutDetailed(huge).truncated).toBe(true);
        expect(summarizeStructuredWorkout(huge).truncated).toBe(true);
    });
});
