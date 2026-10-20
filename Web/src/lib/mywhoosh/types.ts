/**
 * Shapes of MyWhoosh workout-JSON export files (single object or array of them),
 * narrowed from `unknown` by `parseMyWhooshWorkoutFile`. Pure data — no network.
 */
export interface MyWhooshStepFile {
    stepType: string;
    power: number | null;
    startPower: number | null;
    endPower: number | null;
    timeSeconds: number | null;
    rpm: number | null;
    intervalId: number | null;
}

export interface MyWhooshWorkoutFile {
    id: string;
    name: string;
    description: string | null;
    tss: number | null;
    intensityFactor: number | null;
    durationSeconds: number | null;
    steps: MyWhooshStepFile[];
}
