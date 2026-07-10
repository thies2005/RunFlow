/**
 * Mock data for the calendar preview.
 *
 * Types mirror the real Prisma models (Activity, Workout) but trimmed to what
 * the calendar needs. When this page is promoted to a real tab, swap this file
 * for the live API responses — the component interfaces stay the same.
 */

export type WorkoutType =
    | 'EASY' | 'LONG_RUN' | 'TEMPO' | 'INTERVALS' | 'FARTLEK' | 'REPETITIONS'
    | 'RECOVERY' | 'RACE' | 'REST' | 'RIDE' | 'SWIM' | 'STRENGTH' | 'BRICK'
    | 'OTHER';

export type PlanPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK' | 'RECOVERY' | 'OFF';

export interface MockActivity {
    id: string;
    name: string;
    type: WorkoutType;
    startDate: string; // ISO
    distance: number; // metres
    duration: number; // seconds
    averageHr: number | null;
    trimp: number | null;
    tss: number | null;
    vdot: number | null;
    totalElevation: number | null;
}

export interface MockWorkout {
    id: string;
    name: string;
    type: WorkoutType;
    phase: PlanPhase;
    scheduledDate: string; // ISO
    targetDistance: number | null; // metres
    targetDuration: number | null; // seconds
    plannedTss: number | null;
    /** id of the activity that fulfilled this planned workout, if any */
    linkedActivityId: string | null;
    completed: boolean;
}

/** Day key helper (yyyy-MM-dd, local) */
export function dayKey(d: Date | string): string {
    return new Date(d).toISOString().split('T')[0];
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Generate ~10 weeks of data ending today, blended with a BUILD-phase plan.
 * Mix of completed activities and planned workouts (some fulfilled, some not).
 */
function buildMockData() {
    const today = new Date();
    today.setHours(6, 0, 0, 0);

    const activities: MockActivity[] = [];
    const workouts: MockWorkout[] = [];
    let actSeq = 1;
    let planSeq = 1;

    // Helper to push a planned workout + (optionally) a completed activity
    const add = (daysAgo: number, opts: {
        type: WorkoutType;
        phase: PlanPhase;
        name: string;
        targetDistance: number;
        targetDuration: number;
        plannedTss: number;
        // completion params (omit to leave planned-only)
        actualDistance?: number;
        actualDuration?: number;
        averageHr?: number;
        trimp?: number;
        tss?: number;
        vdot?: number;
        elevation?: number;
    }) => {
        const date = new Date(today.getTime() - daysAgo * DAY);
        const dateStr = date.toISOString();
        const id = `plan-${planSeq++}`;
        const w: MockWorkout = {
            id,
            name: opts.name,
            type: opts.type,
            phase: opts.phase,
            scheduledDate: dateStr,
            targetDistance: opts.targetDistance,
            targetDuration: opts.targetDuration,
            plannedTss: opts.plannedTss,
            linkedActivityId: opts.actualDistance != null ? `act-${actSeq}` : null,
            completed: opts.actualDistance != null,
        };
        workouts.push(w);

        if (opts.actualDistance != null) {
            const aid = `act-${actSeq++}`;
            activities.push({
                id: aid,
                name: opts.name,
                type: opts.type,
                startDate: dateStr,
                distance: opts.actualDistance,
                duration: opts.actualDuration ?? opts.targetDuration,
                averageHr: opts.averageHr ?? null,
                trimp: opts.trimp ?? null,
                tss: opts.tss ?? opts.plannedTss,
                vdot: opts.vdot ?? null,
                totalElevation: opts.elevation ?? null,
            });
        }
    };

    // Week -9 (BASE) — fully completed
    add(64, { type: 'EASY', phase: 'BASE', name: 'Easy 6k', targetDistance: 6000, targetDuration: 34 * 60, plannedTss: 32, actualDistance: 6100, actualDuration: 35 * 60, averageHr: 138, trimp: 28, tss: 31, vdot: 41.2 });
    add(62, { type: 'INTERVALS', phase: 'BASE', name: '6x400m', targetDistance: 7000, targetDuration: 40 * 60, plannedTss: 70, actualDistance: 7200, actualDuration: 41 * 60, averageHr: 168, trimp: 78, tss: 74, vdot: 42.8 });
    add(60, { type: 'EASY', phase: 'BASE', name: 'Easy 5k', targetDistance: 5000, targetDuration: 30 * 60, plannedTss: 28, actualDistance: 5000, actualDuration: 29 * 60, averageHr: 135, trimp: 24, tss: 26, vdot: 41.5 });
    add(58, { type: 'LONG_RUN', phase: 'BASE', name: 'Long 14k', targetDistance: 14000, targetDuration: 80 * 60, plannedTss: 95, actualDistance: 14200, actualDuration: 82 * 60, averageHr: 144, trimp: 96, tss: 98, vdot: 42.1 });

    // Week -8 (BASE)
    add(57, { type: 'EASY', phase: 'BASE', name: 'Easy 7k', targetDistance: 7000, targetDuration: 40 * 60, plannedTss: 36, actualDistance: 7000, actualDuration: 39 * 60, averageHr: 137, trimp: 30, tss: 34, vdot: 41.9 });
    add(55, { type: 'TEMPO', phase: 'BASE', name: 'Tempo 5k', targetDistance: 9000, targetDuration: 45 * 60, plannedTss: 75, actualDistance: 9100, actualDuration: 44 * 60, averageHr: 165, trimp: 82, tss: 78, vdot: 43.4 });
    add(53, { type: 'EASY', phase: 'BASE', name: 'Easy 6k', targetDistance: 6000, targetDuration: 34 * 60, plannedTss: 32, actualDistance: 6000, actualDuration: 33 * 60, averageHr: 136, trimp: 27, tss: 30, vdot: 42.0 });
    add(51, { type: 'LONG_RUN', phase: 'BASE', name: 'Long 16k', targetDistance: 16000, targetDuration: 92 * 60, plannedTss: 110, actualDistance: 16050, actualDuration: 90 * 60, averageHr: 146, trimp: 105, tss: 108, vdot: 42.6 });

    // Week -7 (BUILD)
    add(50, { type: 'EASY', phase: 'BUILD', name: 'Easy 7k', targetDistance: 7000, targetDuration: 40 * 60, plannedTss: 36, actualDistance: 7100, actualDuration: 40 * 60, averageHr: 138, trimp: 31, tss: 35, vdot: 42.2 });
    add(48, { type: 'INTERVALS', phase: 'BUILD', name: '5x1k', targetDistance: 10000, targetDuration: 52 * 60, plannedTss: 95, actualDistance: 10100, actualDuration: 53 * 60, averageHr: 172, trimp: 108, tss: 99, vdot: 44.1 });
    add(46, { type: 'RECOVERY', phase: 'BUILD', name: 'Recovery 5k', targetDistance: 5000, targetDuration: 32 * 60, plannedTss: 24, actualDistance: 5000, actualDuration: 31 * 60, averageHr: 130, trimp: 20, tss: 22, vdot: 41.0 });
    add(44, { type: 'LONG_RUN', phase: 'BUILD', name: 'Long 18k', targetDistance: 18000, targetDuration: 105 * 60, plannedTss: 125, actualDistance: 18100, actualDuration: 106 * 60, averageHr: 148, trimp: 118, tss: 122, vdot: 43.2 });

    // Week -6 (BUILD) — missed one session (unfulfilled plan)
    add(43, { type: 'EASY', phase: 'BUILD', name: 'Easy 8k', targetDistance: 8000, targetDuration: 46 * 60, plannedTss: 40, actualDistance: 8000, actualDuration: 45 * 60, averageHr: 139, trimp: 34, tss: 38, vdot: 42.5 });
    add(41, { type: 'TEMPO', phase: 'BUILD', name: 'Tempo 6k', targetDistance: 10000, targetDuration: 50 * 60, plannedTss: 85, actualDistance: 10100, actualDuration: 49 * 60, averageHr: 167, trimp: 90, tss: 86, vdot: 43.9 });
    // planned but NOT completed (REST day used instead) — leaves unfulfilled plan
    add(39, { type: 'INTERVALS', phase: 'BUILD', name: '6x800m', targetDistance: 9000, targetDuration: 48 * 60, plannedTss: 88 });
    add(37, { type: 'LONG_RUN', phase: 'BUILD', name: 'Long 20k', targetDistance: 20000, targetDuration: 118 * 60, plannedTss: 140, actualDistance: 19900, actualDuration: 116 * 60, averageHr: 149, trimp: 130, tss: 134, vdot: 43.7 });

    // Week -5 (BUILD)
    add(36, { type: 'EASY', phase: 'BUILD', name: 'Easy 8k', targetDistance: 8000, targetDuration: 46 * 60, plannedTss: 40, actualDistance: 8200, actualDuration: 47 * 60, averageHr: 140, trimp: 36, tss: 39, vdot: 42.8 });
    add(34, { type: 'FARTLEK', phase: 'BUILD', name: 'Fartlek 10k', targetDistance: 10000, targetDuration: 52 * 60, plannedTss: 80, actualDistance: 10050, actualDuration: 51 * 60, averageHr: 164, trimp: 86, tss: 82, vdot: 43.5 });
    add(32, { type: 'RECOVERY', phase: 'BUILD', name: 'Recovery 6k', targetDistance: 6000, targetDuration: 36 * 60, plannedTss: 28, actualDistance: 6000, actualDuration: 35 * 60, averageHr: 132, trimp: 24, tss: 26, vdot: 41.4 });
    add(30, { type: 'LONG_RUN', phase: 'BUILD', name: 'Long 21k', targetDistance: 21000, targetDuration: 124 * 60, plannedTss: 150, actualDistance: 21200, actualDuration: 125 * 60, averageHr: 150, trimp: 138, tss: 145, vdot: 44.0 });

    // Week -4 (PEAK) — first few days completed, then planned-only (this week still in progress / ahead)
    add(29, { type: 'EASY', phase: 'PEAK', name: 'Easy 8k', targetDistance: 8000, targetDuration: 46 * 60, plannedTss: 40, actualDistance: 8000, actualDuration: 45 * 60, averageHr: 139, trimp: 35, tss: 38, vdot: 42.9 });
    add(27, { type: 'INTERVALS', phase: 'PEAK', name: '6x1k', targetDistance: 11000, targetDuration: 56 * 60, plannedTss: 105, actualDistance: 11100, actualDuration: 57 * 60, averageHr: 174, trimp: 120, tss: 110, vdot: 44.5 });
    add(25, { type: 'EASY', phase: 'PEAK', name: 'Easy 6k', targetDistance: 6000, targetDuration: 34 * 60, plannedTss: 30, actualDistance: 6000, actualDuration: 33 * 60, averageHr: 136, trimp: 26, tss: 28, vdot: 42.1 });
    // upcoming — planned only
    add(23, { type: 'LONG_RUN', phase: 'PEAK', name: 'Long 24k', targetDistance: 24000, targetDuration: 142 * 60, plannedTss: 165 });
    add(22, { type: 'REST', phase: 'PEAK', name: 'Rest', targetDistance: 0, targetDuration: 0, plannedTss: 0 });

    // Week -3..0 future weeks (purely planned)
    add(15, { type: 'EASY', phase: 'PEAK', name: 'Easy 9k', targetDistance: 9000, targetDuration: 52 * 60, plannedTss: 44 });
    add(13, { type: 'TEMPO', phase: 'PEAK', name: 'Tempo 8k', targetDistance: 12000, targetDuration: 60 * 60, plannedTss: 100 });
    add(11, { type: 'EASY', phase: 'PEAK', name: 'Easy 7k', targetDistance: 7000, targetDuration: 40 * 60, plannedTss: 36 });
    add(9, { type: 'LONG_RUN', phase: 'PEAK', name: 'Long 26k', targetDistance: 26000, targetDuration: 155 * 60, plannedTss: 180 });

    add(8, { type: 'EASY', phase: 'TAPER', name: 'Easy 7k', targetDistance: 7000, targetDuration: 40 * 60, plannedTss: 34 });
    add(6, { type: 'INTERVALS', phase: 'TAPER', name: '4x400m', targetDistance: 6000, targetDuration: 32 * 60, plannedTss: 50 });
    add(4, { type: 'REST', phase: 'TAPER', name: 'Rest', targetDistance: 0, targetDuration: 0, plannedTss: 0 });
    add(2, { type: 'EASY', phase: 'TAPER', name: 'Shakeout 4k', targetDistance: 4000, targetDuration: 24 * 60, plannedTss: 20 });

    add(1, { type: 'EASY', phase: 'RACE_WEEK', name: 'Easy 4k', targetDistance: 4000, targetDuration: 24 * 60, plannedTss: 20 });
    add(0, { type: 'RACE', phase: 'RACE_WEEK', name: 'Half Marathon', targetDistance: 21097, targetDuration: 95 * 60, plannedTss: 160 });

    return { activities, workouts };
}

export const { activities: MOCK_ACTIVITIES, workouts: MOCK_WORKOUTS } = buildMockData();

export const ATHLETE_PROFILE = {
    maxHr: 195,
    restHr: 53,
    /** initial CTL/ATL to seed the rolling calculation (a trained athlete) */
    initialCtl: 55,
    initialAtl: 60,
};
