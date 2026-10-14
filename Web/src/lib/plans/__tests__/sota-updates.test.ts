import { WorkoutType, RaceType } from '@/generated/prisma/browser';
import {
    buildStructuredStepsForWorkout,
    generateTrainingPlan,
    buildPlanPhaseBlocks,
    classifyCustomRunDistance,
    resolvePhaseBudget,
} from '../index';
import {
    flattenStructuredWorkout,
    parseStructuredWorkout,
    type StepNode,
    type StructuredStep,
} from '../structured';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';

const asStep = (node: StepNode): StructuredStep => node as StructuredStep;

type BuiltPlan = NonNullable<ReturnType<typeof buildStructuredStepsForWorkout>>;

function flattenKinds(plan: BuiltPlan): string[] {
    return flattenStructuredWorkout(plan).map((s) => s.kind);
}

function sumFlattenedDistanceMeters(plan: BuiltPlan): number {
    return flattenStructuredWorkout(plan).reduce(
        (sum, s) => sum + (s.duration.type === 'distance' ? s.duration.meters : 0),
        0,
    );
}

function sumFlattenedSeconds(plan: BuiltPlan): number {
    return flattenStructuredWorkout(plan).reduce((sum, s) => {
        if (s.duration.type === 'time') return sum + s.duration.seconds;
        return sum;
    }, 0);
}

function repeatGroups(steps: StepNode[]): Extract<StepNode, { kind: 'repeat' }>[] {
    return steps.filter((s): s is Extract<StepNode, { kind: 'repeat' }> => s.kind === 'repeat');
}

/** The builder must emit trees that re-validate as canonical v2. */
function expectCanonicalV2(plan: BuiltPlan): void {
    expect(plan.version).toBe(2);
    const reparsed = parseStructuredWorkout(plan);
    expect(reparsed).not.toBeNull();
    expect(reparsed!.version).toBe(2);
}

describe('SOTA Audit Implementation Tests', () => {

    describe('Structured Step Generation (canonical v2)', () => {
        it('parses run fartlek descriptions into a v2 repeat group', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.FARTLEK,
                description: 'Fartlek: 8km (3min hard / 2min easy)',
                totalDistance: 8000,
                targetPace: 270,
                targetDuration: 2400,
                targetHrZone: 4,
            });

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);

            // warmup + repeat(hard/easy cycles) + cooldown
            expect(plan!.steps.map((s) => s.kind)).toEqual(['warmup', 'repeat', 'cooldown']);

            const groups = repeatGroups(plan!.steps);
            expect(groups).toHaveLength(1);
            const group = groups[0];
            expect(group.times).toBe(4);
            expect(group.setRest).toBeUndefined(); // easy jog lives INSIDE the cycle

            const work = group.steps[0];
            const easy = group.steps[1];
            expect(work.kind).toBe('work');
            expect(work).toMatchObject({ duration: { type: 'time', seconds: 180 }, hrZone: 4 });
            expect(easy.kind).toBe('recovery');
            expect(easy).toMatchObject({ duration: { type: 'time', seconds: 120 }, hrZone: 2 });

            // Flattened player sequence matches the legacy flat list exactly.
            expect(flattenKinds(plan!)).toEqual([
                'warmup',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'cooldown',
            ]);
        });

        it('structures brick workouts as bike (power) + T2 transition + run (pace)', () => {
            const workout = {
                type: WorkoutType.BRICK,
                description: 'Brick: 60min Bike -> 15min Run (T1/T2 practice)',
                totalDistance: 0,
                targetDuration: 4800,
                targetPaceMinSecondsPerKm: null,
                targetPaceMaxSecondsPerKm: null,
                targetHrMinBpm: null,
                targetHrMaxBpm: null,
                targetPowerWatts: null,
                targetPowerMinWatts: null,
                targetPowerMaxWatts: null,
                targetPowerZone: null,
                targetFtpPercent: null,
                targetCadenceRpm: null,
            } as const;
            const plan = buildStructuredStepsForWorkout(workout);

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);
            expect(plan!.steps.map((s) => s.kind)).toEqual(['steady', 'transition', 'work']);

            const [bike, transition, run] = plan!.steps;
            expect(bike).toMatchObject({ label: 'Bike Leg', duration: { type: 'time', seconds: 3600 } });
            expect(asStep(bike).target).toMatchObject({ type: 'power', zoneLabel: 'Z2 Endurance' });
            expect(asStep(bike).cadenceRpm).toBe(90);

            expect(transition).toMatchObject({
                label: 'T2 Bike-to-Run Transition',
                duration: { type: 'time', seconds: 120 },
            });

            expect(run).toMatchObject({ label: 'Run Leg', duration: { type: 'time', seconds: 900 } });
            expect(asStep(run).target).toMatchObject({ type: 'pace', unit: 'sec_per_km' });

            // First-class power targets populated on the workout.
            expect(workout.targetPowerZone).toBe(2);
            expect(workout.targetPowerMinWatts!).toBeGreaterThan(0);
            expect(workout.targetPowerMaxWatts!).toBeGreaterThanOrEqual(workout.targetPowerMinWatts!);
            expect(workout.targetPowerWatts).toBe(Math.round((workout.targetPowerMinWatts! + workout.targetPowerMaxWatts!) / 2));
            expect(workout.targetFtpPercent).toBeGreaterThan(0);
            expect(workout.targetCadenceRpm).toBe(90);

            expect(sumFlattenedSeconds(plan!)).toBe(3600 + 120 + 900);
        });

        it('emits bike intervals as a power-targeted repeat group with cadence and workout power columns', () => {
            const workout = {
                type: WorkoutType.RIDE_INTERVALS,
                description: 'Bike Intervals: 4x5min @ Threshold (200-220W)',
                totalDistance: 0,
                targetDuration: 3600,
                targetPaceMinSecondsPerKm: null,
                targetPaceMaxSecondsPerKm: null,
                targetHrMinBpm: null,
                targetHrMaxBpm: null,
                targetPowerWatts: null,
                targetPowerMinWatts: null,
                targetPowerMaxWatts: null,
                targetPowerZone: null,
                targetFtpPercent: null,
                targetCadenceRpm: null,
            } as const;
            const plan = buildStructuredStepsForWorkout(workout, { vdot: 50, ftpWatts: 200 });

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);
            expect(plan!.steps.map((s) => s.kind)).toEqual(['warmup', 'repeat', 'cooldown']);

            const groups = repeatGroups(plan!.steps);
            expect(groups).toHaveLength(1);
            expect(groups[0].times).toBe(4);
            expect(groups[0].setRest).toEqual({ type: 'time', seconds: 180 });

            const work = groups[0].steps[0];
            expect(work).toMatchObject({
                kind: 'work',
                duration: { type: 'time', seconds: 300 },
                cadenceRpm: 95,
            });
            expect(asStep(work).target).toMatchObject({ type: 'power', minWatts: 182, maxWatts: 210 });

            // Flatten preserves the exact v1 work/recovery sequence and duration sum.
            expect(flattenKinds(plan!)).toEqual([
                'warmup',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work',
                'cooldown',
            ]);
            expect(sumFlattenedSeconds(plan!)).toBe(3600);

            // First-class numeric power targets.
            expect(workout.targetPowerMinWatts).toBe(182);
            expect(workout.targetPowerMaxWatts).toBe(210);
            expect(workout.targetPowerWatts).toBe(196);
            expect(workout.targetPowerZone).toBe(4);
            expect(workout.targetFtpPercent).toBe(98);
            expect(workout.targetCadenceRpm).toBe(95);
        });

        it('gives steady rides a power target with endurance-zone workout columns', () => {
            const workout = {
                type: WorkoutType.RIDE,
                description: 'Easy Ride: 60min (Zone 1-2)',
                totalDistance: 0,
                targetDuration: 3600,
                targetPowerWatts: null,
                targetPowerMinWatts: null,
                targetPowerMaxWatts: null,
                targetPowerZone: null,
                targetFtpPercent: null,
                targetCadenceRpm: null,
            } as const;
            const plan = buildStructuredStepsForWorkout(workout, { vdot: 50, ftpWatts: 200 });

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);
            expect(plan!.steps).toHaveLength(1);
            expect(plan!.steps[0]).toMatchObject({
                kind: 'steady',
                label: 'Easy Ride',
                duration: { type: 'time', seconds: 3600 },
                cadenceRpm: 90,
            });
            expect(asStep(plan!.steps[0]).target).toMatchObject({
                type: 'power',
                minWatts: 112,
                maxWatts: 150,
                zoneLabel: 'Z2 Endurance',
            });
            expect(workout.targetPowerMinWatts).toBe(112);
            expect(workout.targetPowerMaxWatts).toBe(150);
            expect(workout.targetPowerZone).toBe(2);
            expect(workout.targetCadenceRpm).toBe(90);
        });

        it('keeps parsed run interval distance aligned with workout distance via a repeat group', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.INTERVALS,
                description: 'Intervals: 5x1km @ 4:00/km',
                totalDistance: 9000,
                targetPace: 240,
                targetHrZone: 4,
            });

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);

            // warmup + repeat(5x1km with 375m jog setRest) + cooldown
            const groups = repeatGroups(plan!.steps);
            expect(groups).toHaveLength(1);
            expect(groups[0].times).toBe(5);
            expect(groups[0].setRest).toEqual({ type: 'distance', meters: 375 });

            const work = groups[0].steps[0];
            expect(work).toMatchObject({ kind: 'work', duration: { type: 'distance', meters: 1000 } });
            expect(asStep(work).target).toMatchObject({ type: 'pace', unit: 'sec_per_km', min: 240, max: 240 });

            expect(flattenKinds(plan!)).toEqual([
                'warmup',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work', 'recovery',
                'work',
                'cooldown',
            ]);
            expect(sumFlattenedDistanceMeters(plan!)).toBe(9000);
        });

        it('structures swim workouts as warmup + main-set repeat group + cooldown with /100m pace targets', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.SWIM,
                description: 'Swim: 1500m @ Endurance',
                totalDistance: 1500,
                targetPace: 100,
            });

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);
            expect(plan!.steps.map((s) => s.kind)).toEqual(['warmup', 'repeat', 'cooldown']);

            const groups = repeatGroups(plan!.steps);
            expect(groups).toHaveLength(1);
            expect(groups[0].times).toBe(11); // 1100m main set as 11x100m
            expect(groups[0].setRest).toEqual({ type: 'time', seconds: 20 });
            expect(groups[0].steps[0]).toMatchObject({
                kind: 'work',
                duration: { type: 'distance', meters: 100 },
            });
            expect(asStep(groups[0].steps[0]).target).toMatchObject({ type: 'pace', unit: 'sec_per_100m', min: 97, max: 103 });

            // Warmup/cooldown get slower easy windows around the target pace.
            expect(asStep(plan!.steps[0]).target).toMatchObject({ type: 'pace', unit: 'sec_per_100m', min: 102, max: 108 });

            expect(sumFlattenedDistanceMeters(plan!)).toBe(1500);
        });

        it('structures strength workouts as warmup + circuit repeat + mobility cooldown with RPE targets', () => {
            const workout = {
                type: WorkoutType.STRENGTH,
                description: 'Strength: 45min (Core & Stability)',
                totalDistance: 0,
                targetDuration: 2700,
                targetRpe: null,
            } as const;
            const plan = buildStructuredStepsForWorkout(workout);

            expect(plan).not.toBeNull();
            expectCanonicalV2(plan!);
            expect(plan!.steps.map((s) => s.kind)).toEqual(['warmup', 'repeat', 'cooldown']);

            const groups = repeatGroups(plan!.steps);
            expect(groups).toHaveLength(1);
            expect(groups[0].times).toBe(3);
            expect(groups[0].setRest).toEqual({ type: 'time', seconds: 60 });
            expect(asStep(groups[0].steps[0]).target).toMatchObject({ type: 'rpe', value: 7 });
            expect(workout.targetRpe).toBe(7);
        });
    });

    describe('Engine-wide v2 emission & plan phase blocks', () => {
        const marathonConfig = {
            vdot: 50,
            raceType: 'MARATHON' as RaceType,
            raceDate: new Date('2026-07-19'),
            startDate: new Date('2026-04-05'),
            weeklyMileageGoal: 50000,
            runsPerWeek: 4,
        };

        it('attaches canonical v2 structuredSteps to every generated workout with content', () => {
            const workouts = generateTrainingPlan(marathonConfig);
            expect(workouts.length).toBeGreaterThan(0);
            for (const w of workouts) {
                if (w.totalDistance > 0 || (w.targetDuration ?? 0) > 0) {
                    expect(w.structuredSteps).not.toBeNull();
                    expect(w.structuredSteps!.version).toBe(2);
                    // Round-trips through the canonical parser.
                    expect(parseStructuredWorkout(w.structuredSteps)).not.toBeNull();
                }
            }
        });

        it('builds merged phase blocks covering the whole plan with weekly targets', () => {
            const workouts = generateTrainingPlan(marathonConfig);
            // Mirror plan-creation: per-workout planned TSS before phase blocks.
            for (const w of workouts) {
                w.plannedTss = calculateWorkoutPlannedTss({
                    workoutType: w.type,
                    targetDistance: w.totalDistance,
                    targetDuration: w.targetDuration ?? null,
                    targetPace: w.targetPace ?? null,
                    structuredSteps: w.structuredSteps ?? null,
                });
            }

            const blocks = buildPlanPhaseBlocks(marathonConfig, workouts);
            expect(blocks.length).toBeGreaterThan(1);
            expect(blocks[0].startWeek).toBe(1);

            // Contiguous coverage: each block starts where the previous ended.
            for (let i = 1; i < blocks.length; i++) {
                expect(blocks[i].startWeek).toBe(blocks[i - 1].endWeek + 1);
            }
            // Plan order ends at race week; starts at base.
            expect(blocks[0].phase).toBe('BASE');
            expect(blocks[blocks.length - 1].phase).toBe('RACE_WEEK');

            for (const block of blocks) {
                expect(block.focus.length).toBeGreaterThan(0);
                expect(block.startDate.length).toBe(10);
                expect(block.endDate.length).toBe(10);
                expect(block.weeklyRunKmTarget).toBeGreaterThanOrEqual(0);
            }
            expect(blocks[0].weeklyRunKmTarget).toBeGreaterThan(0);
            expect(blocks[0].targetTss).not.toBeNull();
            expect(blocks[0].targetTss!).toBeGreaterThan(0);
        });

        it('gives triathlon plans first-class bike power targets', () => {
            const workouts = generateTrainingPlan({
                vdot: 50,
                raceType: 'FULL_IRONMAN' as RaceType,
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 70000,
                runsPerWeek: 3,
                ridesPerWeek: 3,
                swimsPerWeek: 3,
                peakWeeks: 2,
                taperWeeks: 2,
                buildWeeks: 4,
            });

            const rides = workouts.filter(w => w.type === WorkoutType.RIDE || w.type === WorkoutType.LONG_RIDE);
            expect(rides.length).toBeGreaterThan(0);
            for (const ride of rides) {
                expect(ride.structuredSteps?.version).toBe(2);
                expect(ride.targetPowerMinWatts).not.toBeNull();
                expect(ride.targetPowerMaxWatts!).toBeGreaterThanOrEqual(ride.targetPowerMinWatts!);
                expect(ride.targetPowerZone).toBe(2);
                expect(ride.targetFtpPercent).toBeGreaterThan(0);
            }
        });
    });

    describe('Triathlon Load Model Rebuild', () => {
        it('ensures Full Ironman peak weekly rides are hours-based, not 50 minutes', () => {
            const config = {
                vdot: 50,
                raceType: 'FULL_IRONMAN' as RaceType,
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 70000,
                runsPerWeek: 3,
                ridesPerWeek: 3,
                swimsPerWeek: 3,
                peakWeeks: 2,
                taperWeeks: 2,
                buildWeeks: 4,
            };

            const workouts = generateTrainingPlan(config);
            const peakRide = workouts.find(w => w.type === WorkoutType.LONG_RIDE && w.phase === 'PEAK');

            expect(peakRide).toBeDefined();
            // Full Ironman peak long ride should be in the range of 4.5 - 6 hours (16200 - 21600 seconds)
            expect(peakRide!.targetDuration).toBeGreaterThanOrEqual(16000);
            expect(peakRide!.targetDuration).toBeLessThanOrEqual(21600);
            expect(peakRide!.description).toContain('330min'); // 5.5 hours approx.
        });

        it('scales Full Ironman swim volume to credible weekly distance', () => {
            const workouts = generateTrainingPlan({
                vdot: 50,
                raceType: 'FULL_IRONMAN' as RaceType,
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 70000,
                runsPerWeek: 3,
                ridesPerWeek: 3,
                swimsPerWeek: 3,
                peakWeeks: 2,
                taperWeeks: 2,
                buildWeeks: 4,
            });

            const swimTypes = new Set<WorkoutType>([
                WorkoutType.SWIM,
                WorkoutType.SWIM_DRILL,
                WorkoutType.OPEN_WATER_SWIM,
            ]);
            const peakSwims = workouts.filter(w =>
                w.phase === 'PEAK' && swimTypes.has(w.type)
            );
            const peakSwimDistance = peakSwims.reduce((sum, w) => sum + w.totalDistance, 0);

            expect(peakSwimDistance).toBeGreaterThanOrEqual(8000);
        });
    });

    describe('Ultra Scheduling and Phase Budgets', () => {
        it('does not over-allocate backyard mental prep in short plans', () => {
            const phases = resolvePhaseBudget(8, {
                taperWeeks: 3,
            }, {
                isUltra: true,
                isBackyardUltra: true,
                defaultTaper: 3,
            });

            const allocated = phases.taperWeeks + phases.peakWeeks + phases.buildWeeks +
                (phases.enduranceWeeks ?? 0) + (phases.mentalPrepWeeks ?? 0) + phases.baseWeeks;
            expect(allocated).toBeLessThanOrEqual(7);
        });

        it('keeps Saturday ultra back-to-back runs adjacent without wrapping to Sunday before', () => {
            const workouts = generateTrainingPlan({
                vdot: 50,
                raceType: 'FIFTY_K' as RaceType,
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 70000,
                runsPerWeek: 5,
                longRunDay: 6,
                restDays: [0],
            });

            const b2bRuns = workouts.filter(w => w.description.includes('Back-to-Back'));
            expect(b2bRuns.length).toBeGreaterThan(0);
            for (const run of b2bRuns) {
                expect(run.date.getDay()).toBe(5);
            }
        });
    });

    describe('Pace & HR Target Assignments', () => {
        it('assigns targetHrZone to ultra and triathlon plans correctly', () => {
            const config = {
                vdot: 50,
                raceType: 'FIFTY_K' as RaceType,
                raceDate: new Date('2026-07-19'),
                startDate: new Date('2026-04-05'),
                weeklyMileageGoal: 50000,
            };

            const workouts = generateTrainingPlan(config);
            const runs = workouts.filter(w => w.type === WorkoutType.EASY || w.type === WorkoutType.LONG_RUN);

            expect(runs.length).toBeGreaterThan(0);
            for (const r of runs) {
                expect(r.targetHrZone).toBe(2);
                expect(r.targetHrZoneLabel).toBe('Z2 Aerobic');
            }
        });
    });

    describe('Custom Run Distance Classification', () => {
        it('classifies custom run distances to correct effective road models', () => {
            expect(classifyCustomRunDistance(3000)).toBe('FIVE_K');
            expect(classifyCustomRunDistance(8000)).toBe('TEN_K');
            expect(classifyCustomRunDistance(21100)).toBe('HALF_MARATHON');
            expect(classifyCustomRunDistance(42200)).toBe('MARATHON');
        });
    });
});
