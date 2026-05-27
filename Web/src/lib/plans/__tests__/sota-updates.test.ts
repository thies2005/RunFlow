import { WorkoutType, RaceType } from '@/generated/prisma/browser';
import { 
    buildStructuredStepsForWorkout, 
    generateTrainingPlan, 
    classifyCustomRunDistance,
    resolvePhaseBudget,
} from '../index';

function sumStepDistances(plan: NonNullable<ReturnType<typeof buildStructuredStepsForWorkout>>): number {
    return plan.steps.reduce((sum, step) => sum + (step.distanceMeters ?? 0), 0);
}

function sumStepDurations(plan: NonNullable<ReturnType<typeof buildStructuredStepsForWorkout>>): number {
    return plan.steps.reduce((sum, step) => sum + (step.durationSeconds ?? 0), 0);
}

describe('SOTA Audit Implementation Tests', () => {

    describe('Structured Step Generation Parsing', () => {
        it('parses run fartlek descriptions correctly', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.FARTLEK,
                description: 'Fartlek: 8km (3min hard / 2min easy)',
                totalDistance: 8000,
                targetPace: 270,
                targetDuration: 2400,
                targetHrZone: 4,
            });

            expect(plan).not.toBeNull();
            expect(plan!.steps[0].type).toBe('warmup');
            
            const workSteps = plan!.steps.filter(s => s.type === 'work');
            expect(workSteps.length).toBeGreaterThan(1);
            expect(workSteps[0].durationSeconds).toBe(180); // 3 mins hard
            expect(workSteps[0].hrZone).toBe(4);

            const recSteps = plan!.steps.filter(s => s.type === 'recovery');
            expect(recSteps.length).toBeGreaterThan(1);
            expect(recSteps[0].durationSeconds).toBe(120); // 2 mins easy
            expect(recSteps[0].hrZone).toBe(2);
        });

        it('parses triathlon brick workouts correctly', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.BRICK,
                description: 'Brick: 60min Bike -> 15min Run (T1/T2 practice)',
                totalDistance: 0,
                targetDuration: 4800,
            });

            expect(plan).not.toBeNull();
            expect(plan!.steps.map(s => s.type)).toEqual(['work', 'recovery', 'work']);
            expect(plan!.steps[0].name).toBe('Bike Leg');
            expect(plan!.steps[0].durationSeconds).toBe(3600);
            expect(plan!.steps[1].name).toBe('Transition Practice (T2)');
            expect(plan!.steps[1].durationSeconds).toBe(300);
            expect(plan!.steps[2].name).toBe('Run Leg');
            expect(plan!.steps[2].durationSeconds).toBe(900);
            expect(sumStepDurations(plan!)).toBe(4800);
        });

        it('parses bike intervals correctly', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.RIDE_INTERVALS,
                description: 'Bike Intervals: 4x5min @ Threshold (200-220W)',
                totalDistance: 0,
                targetDuration: 3600,
            });

            expect(plan).not.toBeNull();
            expect(plan!.steps[0].type).toBe('warmup');
            
            const workSteps = plan!.steps.filter(s => s.type === 'work');
            expect(workSteps).toHaveLength(4);
            expect(workSteps[0].durationSeconds).toBe(300);

            const recSteps = plan!.steps.filter(s => s.type === 'recovery');
            expect(recSteps).toHaveLength(3);
            expect(recSteps[0].durationSeconds).toBe(180);
            expect(sumStepDurations(plan!)).toBe(3600);
        });

        it('keeps parsed run interval distance aligned with workout distance', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.INTERVALS,
                description: 'Intervals: 5x1km @ 4:00/km',
                totalDistance: 9000,
                targetPace: 240,
                targetHrZone: 4,
            });

            expect(plan).not.toBeNull();
            expect(sumStepDistances(plan!)).toBe(9000);
        });

        it('structures swim workouts correctly', () => {
            const plan = buildStructuredStepsForWorkout({
                type: WorkoutType.SWIM,
                description: 'Swim: 1500m @ Endurance',
                totalDistance: 1500,
                targetPace: 100,
            });

            expect(plan).not.toBeNull();
            expect(plan!.steps.map(s => s.type)).toEqual(['warmup', 'work', 'cooldown']);
            expect(plan!.steps[0].distanceMeters).toBe(200);
            expect(plan!.steps[1].distanceMeters).toBe(1100);
            expect(plan!.steps[2].distanceMeters).toBe(200);
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
                vdot: 50,
                raceType: 'BACKYARD_ULTRA' as RaceType,
                raceDate: new Date('2026-06-01'),
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
