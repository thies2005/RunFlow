/**
 * Exports golden fixtures for the Kotlin port of the training-plan generator.
 *
 * Runs the pure generator (Web/src/lib/plans) over a fixed config matrix and
 * writes one JSON file per config plus a manifest to
 * android/app/src/test/resources/plan_fixtures/, so the Android parity test
 * (WebPlanEngineParityTest) can assert Kotlin == web for every workout field.
 *
 * Run with (from Web/):
 *   TZ=UTC TS_NODE_PROJECT=scripts/tsconfig.fixtures.json \
 *     npx ts-node --transpile-only scripts/export-plan-fixtures.ts
 *
 * Determinism: all configs pin startDate/raceDate as ISO date strings, so the
 * only nondeterminism the generator has (Date-based week math) is neutralised.
 * No generator source is modified; random IDs are not an issue (the generator
 * mints none), but workouts are numbered w0..wN in plan order anyway.
 */

// Must be imported first: installs the `@/` -> `src/` CommonJS resolver.
import './plan-fixture-loader';

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
    generateTrainingPlan,
    buildStructuredStepsForWorkout,
} from '../src/lib/plans/index';

const REPO_ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(
    REPO_ROOT,
    'android', 'app', 'src', 'test', 'resources', 'plan_fixtures',
);

type PlanConfigInput = Record<string, unknown> & {
    vdot: number;
    raceType: string | null;
    raceDate: string;
    startDate?: string;
};

interface FixtureDef {
    name: string;
    config: PlanConfigInput;
}

const START = '2026-09-07'; // Monday

function race(raceType: string | null, vdot: number, raceDate: string, extra: Record<string, unknown> = {}): FixtureDef {
    return {
        name: extra.name as string || `${raceType || 'no_race'}_v${vdot}`.toLowerCase(),
        config: {
            vdot,
            raceType,
            raceDate,
            startDate: START,
            ...extra,
        },
    };
}

/** Config matrix: every race family x several VDOTs + volume/schedule tweaks. */
const FIXTURES: FixtureDef[] = [
    // ---- road: FIVE_K ----
    race('FIVE_K', 30, '2026-12-13', {
        runsPerWeek: 4, weeklyMileageGoal: 28000, taperWeeks: 1,
        maxLongRunKm: 18, strengthPerWeek: 1, longRunDay: 0, workoutDay: 3,
    }),
    race('FIVE_K', 40, '2026-11-15', {
        runsPerWeek: 5, weeklyMileageGoal: 32000, maxLongRunKm: 20, name: 'five_k_v40',
    }),
    race('FIVE_K', 50, '2026-10-18', {
        runsPerWeek: 3, weeklyMileageGoal: 24000, taperWeeks: 1, name: 'five_k_v50',
    }),
    // ---- road: TEN_K ----
    race('TEN_K', 30, '2026-12-13', {
        runsPerWeek: 4, weeklyMileageGoal: 34000, maxLongRunKm: 20,
    }),
    race('TEN_K', 40, '2026-11-29', {
        runsPerWeek: 6, weeklyMileageGoal: 42000, restDays: [2, 4],
    }),
    race('TEN_K', 50, '2026-11-01', {
        runsPerWeek: 4, weeklyMileageGoal: 38000, taperWeeks: 1,
    }),
    // ---- road: HALF_MARATHON ----
    race('HALF_MARATHON', 30, '2026-12-27', {
        runsPerWeek: 4, weeklyMileageGoal: 42000, maxLongRunKm: 24,
    }),
    // targetTime drives getTargetRacePaceSeconds + race-week duration
    race('HALF_MARATHON', 40, '2026-12-13', {
        runsPerWeek: 5, weeklyMileageGoal: 45000, maxLongRunKm: 24, targetTime: 5940,
    }),
    // targetVdot drives resolvePhaseVdot progression (BASE/BUILD/PEAK paces)
    race('HALF_MARATHON', 50, '2026-11-29', {
        runsPerWeek: 4, weeklyMileageGoal: 48000, taperWeeks: 2, targetVdot: 55,
    }),
    // ---- road: MARATHON ----
    race('MARATHON', 30, '2027-01-03', {
        runsPerWeek: 4, weeklyMileageGoal: 52000, maxLongRunKm: 30,
    }),
    race('MARATHON', 40, '2026-12-27', {
        runsPerWeek: 5, weeklyMileageGoal: 62000, maxLongRunKm: 32, taperWeeks: 2,
    }),
    // custom HR zone inputs feed enrichWorkoutsWithTargets labels/bpm ranges
    race('MARATHON', 50, '2026-11-29', {
        runsPerWeek: 5, weeklyMileageGoal: 70000, maxLongRunKm: 32, taperWeeks: 3,
        hrZone1Max: 75, hrZone2Max: 85, hrZone3Max: 95,
        hrZone4Max: 102, hrZone5Max: 108, hrZone6Max: 115,
        hrMax: 190, hrRest: 55,
    }),
    // ---- ultra ----
    race('FIFTY_K', 30, '2027-01-03', {
        runsPerWeek: 5, weeklyMileageGoal: 70000, maxLongRunKm: 35,
    }),
    race('FIFTY_K', 40, '2026-12-20', {
        runsPerWeek: 5, weeklyMileageGoal: 75000, name: 'fifty_k_v40',
    }),
    race('HUNDRED_K', 40, '2027-01-10', {
        runsPerWeek: 6, weeklyMileageGoal: 90000,
    }),
    race('HUNDRED_K', 50, '2026-12-27', {
        runsPerWeek: 5, weeklyMileageGoal: 95000, taperWeeks: 2,
    }),
    race('HUNDRED_MILE', 30, '2027-02-21', {
        runsPerWeek: 5, weeklyMileageGoal: 96000, maxLongRunKm: 45,
    }),
    race('HUNDRED_MILE', 40, '2027-01-24', {
        runsPerWeek: 6, weeklyMileageGoal: 100000, name: 'hundred_mile_v40',
    }),
    race('BACKYARD_ULTRA', 40, '2026-12-27', {
        runsPerWeek: 5, weeklyMileageGoal: 60000,
    }),
    race('TWELVE_HOUR', 40, '2026-12-13', {
        runsPerWeek: 5, weeklyMileageGoal: 80000,
    }),
    // remaining ultra/timed/custom families for full enum coverage
    race('FIFTY_MILE', 40, '2027-01-17', {
        runsPerWeek: 5, weeklyMileageGoal: 85000, maxLongRunKm: 40,
    }),
    race('TWENTY_FOUR_HOUR', 40, '2026-12-27', {
        runsPerWeek: 5, weeklyMileageGoal: 90000,
    }),
    race('CUSTOM_DISTANCE', 40, '2026-11-29', {
        runsPerWeek: 4, weeklyMileageGoal: 40000, customDistanceM: 21100,
    }),
    // ---- triathlon ----
    race('SPRINT_TRI', 40, '2026-11-29', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 2, swimsPerWeek: 2,
        strengthPerWeek: 2, weeklyMileageGoal: 30000,
    }),
    race('OLYMPIC_TRI', 50, '2027-01-03', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 3,
    }),
    race('HALF_IRONMAN', 40, '2027-01-24', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 3,
    }),
    // Saturated week: rest days [Mon, Fri] occupy the long-ride anchor day
    // (longRunDay 0 + 5 = Friday), so the LONG_RIDE is never placed while
    // remainingRides still subtracts it — pins the Kotlin longRideDay parity.
    race('HALF_IRONMAN', 40, '2027-01-24', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 3,
        strengthPerWeek: 1, restDays: [1, 5], name: 'half_ironman_saturated',
    }),
    race('FULL_IRONMAN', 30, '2027-02-21', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 3,
        strengthPerWeek: 2,
    }),
    race('CUSTOM_TRI', 40, '2027-01-10', {
        sport: 'TRIATHLON', runsPerWeek: 3, ridesPerWeek: 3, swimsPerWeek: 2,
        customSwimDistM: 1000, customBikeDistM: 40000, customRunDistM: 10000,
    }),
    // ---- no race (raceType null) ----
    race(null, 40, '2026-12-06', {
        weeksTotal: 12, runsPerWeek: 5, weeklyMileageGoal: 40000,
        ridesPerWeek: 1, name: 'no_race_v40',
    }),
    race(null, 30, '2026-12-06', {
        weeksTotal: 8, runsPerWeek: 4, weeklyMileageGoal: 30000,
        swimsPerWeek: 1, strengthPerWeek: 2, name: 'no_race_v30_swim',
    }),
];

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function n(v: number | undefined | null): number | null {
    return v === undefined || v === null ? null : v;
}

/** Strips volatile/derived fields and writes the canonical fixture JSON. */
function exportWorkout(w: ReturnType<typeof generateTrainingPlan>[number], index: number) {
    return {
        id: `w${index}`,
        date: isoDate(w.date),
        type: w.type,
        phase: w.phase ?? null,
        description: w.description,
        displayDescription: w.displayDescription ?? null,
        sport: w.sport ?? null,
        intensityZone: w.intensityZone ?? null,
        totalDistance: w.totalDistance,
        targetPace: n(w.targetPace),
        targetDuration: n(w.targetDuration),
        targetHrZone: n(w.targetHrZone),
        targetHrZoneLabel: w.targetHrZoneLabel ?? null,
        targetHrMinBpm: n(w.targetHrMinBpm),
        targetHrMaxBpm: n(w.targetHrMaxBpm),
        targetPaceZoneLabel: w.targetPaceZoneLabel ?? null,
        targetPaceMinSecondsPerKm: n(w.targetPaceMinSecondsPerKm),
        targetPaceMaxSecondsPerKm: n(w.targetPaceMaxSecondsPerKm),
        structuredSteps: buildStructuredStepsForWorkout(w),
    };
}

function main(): void {
    mkdirSync(OUT_DIR, { recursive: true });
    const manifest = FIXTURES.map(({ name, config }) => {
        const workouts = generateTrainingPlan({
            ...(config as any),
            raceDate: new Date(config.raceDate),
            startDate: config.startDate ? new Date(config.startDate) : undefined,
        });
        const exported = workouts.map(exportWorkout);
        writeFileSync(
            join(OUT_DIR, `${name}.json`),
            JSON.stringify({ name, config, workouts: exported }, null, 2) + '\n',
        );
        return { name, config, workoutCount: exported.length };
    });
    writeFileSync(
        join(OUT_DIR, 'manifest.json'),
        JSON.stringify({ fixtures: manifest }, null, 2) + '\n',
    );
    const total = manifest.reduce((s, f) => s + f.workoutCount, 0);
    console.log(`exported ${manifest.length} fixtures (${total} workouts) to ${dirname(OUT_DIR + '/x')}`);
    for (const f of manifest) {
        console.log(`  ${f.name}: ${f.workoutCount} workouts`);
    }
}

main();
