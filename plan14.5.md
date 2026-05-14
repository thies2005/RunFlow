# Plan 14.5 — Standard Plan Creator: Complete & Consistent Workout Fields

## Problem Statement

The standard plan creator (`Web/src/lib/plans/index.ts`) generates running workouts where **`targetDuration` is always `0`**, **`phase` is never persisted**, **`targetHrZone` is never set**, and **no validation ensures `targetDistance`, `targetPace`, and `targetDuration` are internally consistent**. When a user's VDOT improves through training (updating `User.autoRevolvingVo2max` or `Goal.currentVdot`), existing workout paces become stale and contradict the user's actual pace zones. The advanced plan editor's pace zone selector has a bug (`Number('E')` → `NaN`) that also prevents correct pace assignment.

---

## Root Causes (6 issues)

### RC-1: `targetDuration = 0` for all running workouts
- **File**: `Web/src/lib/plans/index.ts` — every running workout (EASY, LONG_RUN, RECOVERY, TEMPO, INTERVALS, FARTLEK, REPETITIONS, RACE) sets `targetDuration: 0`
- **Impact**: Mobile app cannot display expected finish time; readiness adaptation engine (`workout_adaptation_engine.dart` line ~814) caps adapted duration with `min(workout.targetDuration, 45)` which yields 0

### RC-2: `phase` not persisted to DB
- **File**: `Web/src/lib/plans/index.ts` — `Phase` is computed internally (`'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RACE_WEEK'`) but the `GeneratedWorkout` type (line 74-81) has no `phase` field
- **File**: `Web/src/app/api/goals/route.ts` line 348-360 — `prisma.workout.createMany` does not include `phase`
- **Impact**: All standard plan workouts default to `PlanPhase.BASE` in DB; phase-based analytics and filtering are wrong

### RC-3: `targetHrZone` never set
- **File**: `Web/src/app/api/goals/route.ts` line 348-360 — `targetHrZone` is not included in `createMany` data
- **Impact**: No HR zone guidance for any standard plan workout

### RC-4: No cross-field consistency validation
- **No file** — there is zero validation anywhere (client or server) that `targetDuration ≈ targetDistance / 1000 * targetPace`
- **Impact**: After manual edits (Flutter `_EditWorkoutSheet` or Web `WorkoutDetailPanel`), fields can contradict: e.g., `distance=10000`, `pace=300` (5:00/km) implies 50min, but `duration=1800` (30min)

### RC-5: Paces stale after VDOT changes
- **File**: `Web/src/lib/plans/index.ts` — `calculateTrainingPaces(vdot)` is called once at plan creation time and baked into `targetPace`
- **File**: `Web/src/app/api/settings/update-vdot/route.ts` line 260-303 — already deletes all incomplete workouts and regenerates from scratch on VDOT change, but this is destructive (loses manual edits)
- **Impact**: A runner whose VDOT goes from 40 → 45 over 16 weeks still sees their original Zone 2 pace targets from week 1. The existing VDOT update endpoint solves this by full regeneration but destroys manual edits.

### RC-6: Advanced editor pace zone select bug
- **File**: `Web/src/app/plan-advanced/[goalId]/components/Editor/WorkoutDetailPanel.tsx` line 282-293 — `<select>` values are letters ('E','M','T','I','R') but `Number(e.target.value)` converts them to `NaN`, effectively nulling `targetPace`
- **Impact**: Pace zone selection in the advanced editor silently fails

---

## Implementation Plan

### Phase 0: Prerequisites — Fix existing Flutter serialization bug

**File to modify**:
- `flutter/lib/data/models/json_compat.dart`

**Step 0.1**: Fix `compatibilityWorkoutTypeToJson` mapping

The function maps `CompatibilityWorkoutType.long` → `'LONG'` but the Prisma `WorkoutType` enum is `'LONG_RUN'`. Similarly `interval` → `'INTERVAL'` should be `'INTERVALS'`. This causes Prisma constraint errors when Flutter PATCHes workouts:

```dart
// In compatibilityWorkoutTypeToJson:
// Change: 'long' -> 'LONG'
// To:     'long' -> 'LONG_RUN'
// Change: 'interval' -> 'INTERVAL'
// To:     'interval' -> 'INTERVALS'
```

Also update `compatibilityWorkoutTypeFromJson` to handle both old and new values for backward compat.

---

### Phase 1: Enrich `GeneratedWorkout` type and compute derived fields (Server)

**Files to modify**:
- `Web/src/lib/plans/index.ts`

**Step 1.1**: Add `PlanPhase` import and extend `GeneratedWorkout` type

Add `PlanPhase` to the import on line 1:
```typescript
import { WorkoutType, RaceType, PlanSport, PlanPhase } from '@/generated/prisma/browser';
```

Extend `GeneratedWorkout` (line 74-81):
```typescript
export type GeneratedWorkout = {
    date: Date;
    type: WorkoutType;
    description: string;
    totalDistance: number;
    targetPace?: number;
    targetDuration?: number;
    phase?: PlanPhase;        // NEW
    targetHrZone?: number;    // NEW
};
```

Note: The local `Phase` type (line 83) is a subset of `PlanPhase` (5 vs 10 values). The cast `as PlanPhase` is safe since `Phase ⊂ PlanPhase`. The 5 extra Prisma values (RECOVERY, ENDURANCE, MENTAL_PREP, TUNE_UP, MAINTAIN) are only used by the advanced editor.

**Step 1.2**: Compute `targetDuration` for every running workout

Add a helper function after line ~830:

```typescript
function computeDuration(distanceMeters: number, paceSecondsPerKm: number): number {
    if (distanceMeters <= 0 || paceSecondsPerKm <= 0) return 0;
    return Math.round((distanceMeters / 1000) * paceSecondsPerKm);
}
```

For **uniform-pace workouts** (EASY, LONG_RUN, RECOVERY), replace `targetDuration: 0` with:
```typescript
targetDuration: computeDuration(totalDistance, targetPace || easyPace),
```

For **quality sessions** (INTERVALS, REPETITIONS, FARTLEK, TEMPO), the `totalDistance` includes warmup/cooldown at easy pace, but `targetPace` is the quality pace. Using `computeDuration(totalDistance, targetPace)` produces >30% error. Instead, compute a **blended duration**:

```typescript
function computeQualityDuration(
    totalDistance: number,
    qualityPace: number,
    easyPace: number,
    qualityFraction: number = 0.5
): number {
    if (totalDistance <= 0) return 0;
    const qualityDist = totalDistance * qualityFraction;
    const easyDist = totalDistance - qualityDist;
    return Math.round((qualityDist / 1000) * qualityPace + (easyDist / 1000) * easyPace);
}
```

The `qualityFraction` per workout type:
- INTERVALS: ~50% (e.g., 5x1km = 5km intervals + 5km warmup/cooldown)
- REPETITIONS: ~35% (shorter reps, more recovery)
- TEMPO: ~65% (longer sustained effort)
- FARTLEK: ~45% (mixed on/off)

Apply to all running workout creation sites:
- Line 343 (RACE): keep `targetDuration: 0` (race pace unknown at plan creation)
- Line 366 (pre-race EASY): `computeDuration(3400, targetPace)`
- Line 378 (shakeout RECOVERY): `computeDuration(3000, targetPace)`
- Line 553 (LONG_RUN): `computeDuration(longRunDist, longRunPace)`
- Line 564 (quality session): `computeQualityDuration(totalDistance, targetPace, easyPace, qualityFraction)` — add `qualityFraction` field to quality session return types
- Line 575 (EASY fallback): `computeDuration(easyDist, easyPace)`
- Line 605 (RECOVERY): `computeDuration(easyDist, recoveryPace)`
- Line 621 (EASY): `computeDuration(easyDist, easyPace)`

Non-running workouts (RIDE, SWIM, STRENGTH) already have explicit `targetDuration` set correctly.

**Step 1.3**: Thread `phase` through to every workout

The `generateWeek()` function already receives `phase: Phase` as a parameter (line 448). Pass it through:

- Add `phase: params.phase as PlanPhase` to every `workouts.push({...})` call inside `generateWeek()`
- In `generateRaceWeekPlan()` (line ~310), assign `'RACE_WEEK' as PlanPhase` as phase
- For cross-training workouts (RIDE, SWIM, STRENGTH), assign the current week's phase
- **Known limitation**: Sub-generators (`run-ultra.ts`, `triathlon.ts`, `no-race.ts`) also use `GeneratedWorkout` but don't call `generateWeek()`. They'll produce `phase: undefined` → falls back to `'BASE'` in `createMany`. Phase logic for these generators should be addressed in a follow-up (documented in Phase 8).

**Step 1.4**: Derive `targetHrZone` from workout type

Add a helper function:

```typescript
function workoutTypeToHrZone(type: WorkoutType): number | undefined {
    switch (type) {
        case WorkoutType.RECOVERY: return 1;
        case WorkoutType.EASY: return 2;
        case WorkoutType.LONG_RUN: return 2;
        case WorkoutType.TEMPO: return 3;
        case WorkoutType.FARTLEK: return 4;
        case WorkoutType.INTERVALS: return 4;
        case WorkoutType.REPETITIONS: return 5;
        case WorkoutType.RACE: return 5;
        default: return undefined;
    }
}
```

Include `targetHrZone: workoutTypeToHrZone(type)` in every workout creation.

---

### Phase 2: Persist enriched fields to database (API)

**Files to modify**:
- `Web/src/app/api/goals/route.ts` (standard Web plan creation)
- `Web/src/app/api/mobile/v1/goals/route.ts` (mobile plan creation)
- `Web/src/app/api/v1/goals/route.ts` (v1 API plan creation)
- `Web/src/app/api/settings/update-vdot/route.ts` (VDOT update regeneration)

**Step 2.1**: Include `phase`, `targetHrZone`, and safe `targetPace`/`targetDuration` in `createMany`

Apply to ALL four files that call `prisma.workout.createMany` with generated workouts:

```typescript
await prisma.workout.createMany({
    data: workouts.map(w => ({
        goalId: goal.id,
        scheduledDate: w.date,
        workoutType: w.type as WorkoutType,
        description: w.description,
        targetDistance: w.totalDistance,
        targetPace: w.targetPace ?? 0,
        targetDuration: w.targetDuration ?? 0,
        targetHrZone: w.targetHrZone ?? null,   // NEW
        phase: w.phase ?? 'BASE',               // NEW
        isCompleted: false,
    })),
});
```

**Important**: Keep `?? 0` (not `?? null`) for `targetPace` and `targetDuration` to maintain Flutter backward compatibility. Flutter's Freezed models have `@Default(0.0) double targetPace` and `@Default(0) int targetDuration` which are non-nullable. Sending explicit `null` could cause deserialization errors. The `0` vs `null` distinction should be addressed in Phase 6 (Flutter model update) before we can switch to `null` server-side.

**Step 2.2**: Update `GeneratedWorkout` consumers — verify all four:

| File | Location | Notes |
|------|----------|-------|
| `Web/src/app/api/goals/route.ts` | line 348-360 | Standard Web plan creation |
| `Web/src/app/api/mobile/v1/goals/route.ts` | Similar `createMany` block | Mobile plan creation |
| `Web/src/app/api/v1/goals/route.ts` | line 311-323 | V1 API plan creation |
| `Web/src/app/api/settings/update-vdot/route.ts` | line 291-302 | VDOT update regeneration |
| `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts` | Phase reassignment | Regeneration |

---

### Phase 3: Add cross-field consistency validation

**Files to create/modify**:
- `Web/src/lib/plans/validate-workout.ts` (NEW)
- `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts`
- `Web/src/app/api/mobile/v1/workouts/[id]/route.ts`
- `Web/src/app/api/plan-advanced/[goalId]/workouts/route.ts`

**Step 3.1**: Create validation utility

```typescript
// Web/src/lib/plans/validate-workout.ts

import { formatPace } from '../metrics/vdot';

export interface WorkoutFieldValues {
    targetDistance?: number | null;
    targetPace?: number | null;
    targetDuration?: number | null;
}

export interface ConsistencyWarning {
    field: 'targetDistance' | 'targetPace' | 'targetDuration';
    message: string;
    impliedValue: number;
    actualValue: number;
}

/**
 * Check that distance, pace, and duration are internally consistent.
 * Tolerance: 15% to account for warmup/cooldown portions not reflected in pace.
 */
export function checkFieldConsistency(
    values: WorkoutFieldValues
): ConsistencyWarning[] {
    const warnings: ConsistencyWarning[] = [];
    const { targetDistance, targetPace, targetDuration } = values;

    const dist = targetDistance && targetDistance > 0 ? targetDistance : 0;
    const pace = targetPace && targetPace > 0 ? targetPace : 0;
    const dur = targetDuration && targetDuration > 0 ? targetDuration : 0;

    if (dist > 0 && pace > 0 && dur > 0) {
        const impliedDuration = Math.round((dist / 1000) * pace);
        const tolerance = 0.15;
        const ratio = dur / impliedDuration;

        if (ratio < (1 - tolerance) || ratio > (1 + tolerance)) {
            warnings.push({
                field: 'targetDuration',
                message: `Duration (${Math.round(dur / 60)}min) contradicts distance (${(dist / 1000).toFixed(1)}km) at pace (${formatPace(pace)}). Expected ~${Math.round(impliedDuration / 60)}min.`,
                impliedValue: impliedDuration,
                actualValue: dur,
            });
        }
    }

    if (dist > 0 && dur > 0 && pace === 0) {
        const impliedPace = Math.round((dur / (dist / 1000)));
        warnings.push({
            field: 'targetPace',
            message: `Pace is missing. Based on distance (${(dist / 1000).toFixed(1)}km) and duration (${Math.round(dur / 60)}min), implied pace is ~${formatPace(impliedPace)}.`,
            impliedValue: impliedPace,
            actualValue: 0,
        });
    }

    if (pace > 0 && dur > 0 && dist === 0) {
        const impliedDist = Math.round((dur / pace) * 1000 / 100) * 100;
        warnings.push({
            field: 'targetDistance',
            message: `Distance is missing. Based on pace (${formatPace(pace)}) and duration (${Math.round(dur / 60)}min), implied distance is ~${(impliedDist / 1000).toFixed(1)}km.`,
            impliedValue: impliedDist,
            actualValue: 0,
        });
    }

    return warnings;
}

export function deriveMissingField(values: WorkoutFieldValues): Partial<WorkoutFieldValues> {
    const { targetDistance, targetPace, targetDuration } = values;
    const dist = targetDistance && targetDistance > 0 ? targetDistance : 0;
    const pace = targetPace && targetPace > 0 ? targetPace : 0;
    const dur = targetDuration && targetDuration > 0 ? targetDuration : 0;

    const derived: Partial<WorkoutFieldValues> = {};

    if (dist > 0 && pace > 0 && dur === 0) {
        derived.targetDuration = Math.round((dist / 1000) * pace);
    } else if (dist > 0 && dur > 0 && pace === 0) {
        derived.targetPace = Math.round((dur / (dist / 1000)));
    } else if (pace > 0 && dur > 0 && dist === 0) {
        derived.targetDistance = Math.round((dur / pace) * 1000 / 100) * 100;
    }

    return derived;
}
```

Note: Uses existing `formatPace` from `Web/src/lib/metrics/vdot.ts` instead of creating a duplicate.

**Step 3.2**: Add validation to workout PATCH endpoints

In both `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts` and `Web/src/app/api/mobile/v1/workouts/[id]/route.ts`:

After parsing the request body, call `checkFieldConsistency()` and include warnings in the response:

```typescript
const merged = {
    targetDistance: body.targetDistance ?? existingWorkout.targetDistance,
    targetPace: body.targetPace ?? existingWorkout.targetPace,
    targetDuration: body.targetDuration ?? existingWorkout.targetDuration,
};

const derived = deriveMissingField(merged);
const warnings = checkFieldConsistency({ ...merged, ...derived });

// ... perform update (include derived fields) ...

return NextResponse.json({ workout: updated, warnings });
```

**Step 3.3**: Auto-derive missing field when two of three are provided

The `deriveMissingField` function (included in Step 3.1 above) is used in Step 3.2 to fill in the missing field before persisting.

---

### Phase 4: Fix advanced editor pace zone bug (RC-6)

**Files to modify**:
- `Web/src/app/plan-advanced/[goalId]/components/Editor/WorkoutDetailPanel.tsx`

**Step 4.1**: Replace letter-based select with actual pace values

The `<select>` at line ~282-293 should map zone letters to actual pace values. The component currently only has props `{ workout, goalId, onClose, onUpdate }` — it does NOT have access to `goal` or `user` objects. Two options:

**Option A (Preferred)**: Fetch the goal's VDOT from the existing React Query cache:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { calculateTrainingPaces } from '@/lib/metrics/vdot';

// Inside the component:
const queryClient = useQueryClient();
const planData = queryClient.getQueryData(['plan-advanced', goalId]);
const currentVdot = (planData as any)?.goal?.currentVdot ?? 40;

const paceZoneOptions = useMemo(() => {
    const paces = calculateTrainingPaces(currentVdot);
    return [
        { label: 'E — Easy', value: Math.round((paces.easy.min + paces.easy.max) / 2) },
        { label: 'M — Marathon', value: paces.marathon },
        { label: 'T — Threshold', value: paces.threshold },
        { label: 'I — Interval', value: paces.interval },
        { label: 'R — Repetition', value: paces.repetition },
    ];
}, [currentVdot]);
```

**Option B**: Add `currentVdot: number` as a new prop to `WorkoutDetailPanel` and pass it from the parent `PlanEditorLayout.tsx` which already has the goal data.

Use these numeric values in the `<select>` so `targetPace` stores a real seconds/km value. Remove the `Number(e.target.value)` call and use `parseInt(e.target.value, 10)` instead.

---

### Phase 5: Pace recalculation when VDOT changes (RC-5)

**Files to create/modify**:
- `Web/src/lib/plans/recalculate-paces.ts` (NEW)
- `Web/src/app/api/plan/recalculate-paces/route.ts` (NEW endpoint)
- `Web/src/app/api/plan-advanced/[goalId]/pace-profile/route.ts`

**Important context**: `Web/src/app/api/settings/update-vdot/route.ts` line 260-303 already handles VDOT changes by deleting all incomplete workouts and regenerating from scratch. This is destructive (destroys manual edits). Phase 5 provides a non-destructive alternative that updates paces in-place.

**Strategy**: Replace the full regeneration in `update-vdot/route.ts` with the new `recalculateWorkoutPaces` function for standard plans. The advanced editor can continue using its own regeneration mechanism.

**Step 5.1**: Create pace recalculation function

```typescript
// Web/src/lib/plans/recalculate-paces.ts

import { calculateTrainingPaces, TrainingPaces } from '../metrics/vdot';
import { prisma } from '@/lib/db';

function getPaceForType(paces: TrainingPaces, type: string): number | null {
    switch (type) {
        case 'EASY':
        case 'LONG_RUN':
            return Math.round((paces.easy.min + paces.easy.max) / 2);
        case 'RECOVERY':
            return paces.easy.max;
        case 'TEMPO':
            return paces.threshold;
        case 'INTERVALS':
            return paces.interval;
        case 'REPETITIONS':
            return paces.repetition;
        case 'FARTLEK':
            return Math.round((paces.threshold + paces.interval) / 2);
        case 'RACE':
            return null;
        default:
            return null;
    }
}

interface RecalculationResult {
    updatedCount: number;
    skippedCount: number;
    warnings: string[];
}

export async function recalculateWorkoutPaces(
    goalId: string,
    newVdot: number
): Promise<RecalculationResult> {
    const paces = calculateTrainingPaces(newVdot);

    const workouts = await prisma.workout.findMany({
        where: {
            goalId,
            isCompleted: false,
            workoutType: {
                in: ['EASY', 'LONG_RUN', 'RECOVERY', 'TEMPO', 'INTERVALS',
                     'REPETITIONS', 'FARTLEK'],
            },
        },
    });

    let updatedCount = 0;
    let skippedCount = 0;
    const warnings: string[] = [];

    for (const w of workouts) {
        const newPace = getPaceForType(paces, w.workoutType);
        if (newPace === null) {
            skippedCount++;
            continue;
        }

        const newDuration = w.targetDistance && w.targetDistance > 0
            ? Math.round((w.targetDistance / 1000) * newPace)
            : null;

        await prisma.workout.update({
            where: { id: w.id },
            data: {
                targetPace: newPace,
                ...(newDuration !== null && { targetDuration: newDuration }),
            },
        });
        updatedCount++;
    }

    await prisma.goal.update({
        where: { id: goalId },
        data: { currentVdot: newVdot },
    });

    return { updatedCount, skippedCount, warnings };
}
```

Note: Uses `prisma` singleton from `@/lib/db` (not from the internal class path).

**Step 5.2**: Create API endpoint for recalculation

```typescript
// Web/src/app/api/plan/recalculate-paces/route.ts
// POST /api/plan/recalculate-paces
// Body: { goalId: string, newVdot: number }
// Triggers recalculateWorkoutPaces for the goal
```

**Step 5.3**: Replace full regeneration in `update-vdot/route.ts`

In `Web/src/app/api/settings/update-vdot/route.ts` (lines 260-303), replace the destructive "delete all + regenerate" logic with:

```typescript
// Instead of deleting and regenerating:
const result = await recalculateWorkoutPaces(goal.id, newVdot);
logger.info('Recalculated workout paces', { goalId: goal.id, ...result });
```

This preserves manual edits to workout descriptions, dates, and other fields while updating pace/duration.

**Step 5.4**: Add "Recalculate Paces" button to standard plan UI

In the standard plan page (`Web/src/app/plan/page.tsx`), add a button that calls the recalculation endpoint with the user's current VDOT.

**Step 5.5**: Update PaceProfile when VDOT changes

When `Goal.currentVdot` changes, also update `PlanPaceProfile.baseVdot` and re-derive phase-specific paces. This keeps the advanced editor's pace profile in sync.

---

### Phase 6: Mobile app consistency (Flutter)

**Files to modify**:
- `flutter/lib/data/models/json_compat.dart` (WorkoutType serialization — already in Phase 0)
- `flutter/lib/presentation/screens/plan/plan_screen.dart` (edit workout sheet)
- `flutter/lib/domain/entities/dashboard_entities.dart` (Workout model)
- `flutter/lib/data/models/dashboard_models.dart` (Freezed model)

**Step 6.1**: Add cross-field derivation to the edit workout sheet

In `_EditWorkoutSheet` (plan_screen.dart ~line 820-929), when the user changes one field, auto-suggest (but don't force) the derived value for missing fields. Note: Flutter stores `targetDuration` in seconds internally but displays in minutes (`targetDuration ~/ 60` for display, `* 60` for save):

```dart
// When distance (meters) and pace (sec/km) are set but duration (seconds) is 0:
if (distance > 0 && pace > 0 && duration == 0) {
    suggestedDuration = (distance / 1000 * pace).round();
}
// Show as hint text next to the duration field (convert to minutes for display)
```

**Step 6.2**: Handle `null` vs `0` for targetPace and targetDuration (deferred)

Currently Flutter's Freezed models have:
- `@Default(0.0) double targetPace` (non-nullable)
- `@Default(0) int targetDuration` (non-nullable)

Changing these to nullable (`double?` / `int?`) requires:
1. Updating the Freezed model
2. Regenerating `.g.dart` files
3. Updating all consumers that assume non-null

**This is a breaking change that should be done carefully.** For now, the server continues sending `0` (not `null`) for backward compatibility. The nullable migration can be done in a follow-up PR after verifying the server changes work.

**Step 6.3**: Handle additional WorkoutType values from server

The Flutter `WorkoutType` enum has only 7 values but the server has 22. Add a string-based fallback approach:

```dart
// Option A: Extend the enum (preferred, but requires updating all switch statements)
// Option B: Use a compatibility wrapper that maps unknown types to 'other'

// In json_compat.dart, add mappings:
// 'LONG_RUN' -> CompatibilityWorkoutType.long
// 'INTERVALS' -> CompatibilityWorkoutType.interval
// 'FARTLEK' -> CompatibilityWorkoutType.other (new type or map to existing)
// 'RIDE' -> CompatibilityWorkoutType.other
// etc.
```

Also update `compatibilityWorkoutTypeFromJson` to handle the full server enum set without crashing.

---

### Phase 7: Validation & testing

**Step 7.1**: Unit tests for `computeDuration`

```typescript
describe('computeDuration', () => {
    it('calculates duration from distance and pace', () => {
        expect(computeDuration(10000, 300)).toBe(3000); // 10km @ 5:00/km = 50min
    });
    it('returns 0 for invalid inputs', () => {
        expect(computeDuration(0, 300)).toBe(0);
        expect(computeDuration(10000, 0)).toBe(0);
    });
});
```

**Step 7.2**: Unit tests for `checkFieldConsistency`

```typescript
describe('checkFieldConsistency', () => {
    it('returns no warnings for consistent fields', () => {
        expect(checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: 3000,
        })).toHaveLength(0);
    });
    it('warns when duration contradicts distance+pace', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: 300,
            targetDuration: 1800, // 30min, should be 50min
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0].field).toBe('targetDuration');
    });
    it('suggests missing pace', () => {
        const warnings = checkFieldConsistency({
            targetDistance: 10000,
            targetPace: null,
            targetDuration: 3000,
        });
        expect(warnings[0].field).toBe('targetPace');
    });
});
```

**Step 7.3**: Unit tests for `deriveMissingField`

```typescript
describe('deriveMissingField', () => {
    it('derives duration from distance and pace', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: 360,
            targetDuration: 0,
        });
        expect(result.targetDuration).toBe(1800);
    });
    it('derives pace from distance and duration', () => {
        const result = deriveMissingField({
            targetDistance: 5000,
            targetPace: 0,
            targetDuration: 1500,
        });
        expect(result.targetPace).toBe(300);
    });
});
```

**Step 7.4**: Unit tests for `recalculateWorkoutPaces`

Test that VDOT change correctly updates all running workout paces and durations while leaving non-running and completed workouts untouched.

**Step 7.5**: Integration test for plan generation

Generate a 16-week marathon plan and verify:
1. Every running workout has `targetDuration > 0`
2. Every running workout has `targetPace > 0`
3. Every workout has a `phase` (not null/undefined)
4. `abs(targetDuration - (targetDistance/1000 * targetPace)) < targetDuration * 0.05` for all running workouts
5. Completed workouts are untouched by recalculation

**Step 7.6**: Run `flutter analyze` and `flutter test`

---

## Execution Order

| Step | Phase | Priority | Depends On | Estimated Effort |
|------|-------|----------|------------|-----------------|
| 0.1 | Fix Flutter WorkoutType serialization | **P0** | None | 30min |
| 1.1 | Add PlanPhase import + extend GeneratedWorkout | **P0** | None | 30min |
| 1.2 | Compute targetDuration (uniform + blended) | **P0** | 1.1 | 1-2h |
| 1.3 | Thread phase | **P0** | 1.1 | 30min |
| 1.4 | Derive targetHrZone | **P1** | 1.1 | 30min |
| 2.1 | Persist enriched fields (all 4 API files) | **P0** | 1.1-1.4 | 1h |
| 2.2 | Verify all GeneratedWorkout consumers | **P0** | 2.1 | 30min |
| 3.1 | Create validation + derivation utility | **P0** | None | 1h |
| 3.2 | Add validation + auto-derive to PATCH endpoints | **P0** | 3.1 | 1-2h |
| 4.1 | Fix advanced editor pace zone bug | **P0** | None | 30min |
| 5.1 | Create recalculateWorkoutPaces function | **P1** | 3.1 | 1h |
| 5.2 | Create recalculation API endpoint | **P1** | 5.1 | 30min |
| 5.3 | Replace full regeneration in update-vdot | **P1** | 5.1 | 1h |
| 5.4-5.5 | UI button + PaceProfile sync | **P2** | 5.2 | 1h |
| 6.1 | Flutter edit sheet derivation hints | **P1** | 2.1 | 1h |
| 6.3 | Flutter WorkoutType compat expansion | **P1** | 0.1 | 1h |
| 7.1-7.6 | Tests + existing test updates | **P0** | All above | 2-3h |

**Total estimated effort**: 14-18 hours

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Existing plans with `targetDuration=0` | Data migration: backfill duration for all running workouts where `targetPace > 0` and `targetDistance > 0` |
| `targetPace` stored as `0` in existing data | Keep `?? 0` for now (Flutter compat); migration to `null` deferred to Phase 6.2 follow-up |
| Recalculation changes user-customized paces | Only auto-recalculate workouts that haven't been manually edited; the existing `update-vdot` endpoint already does full regeneration (more destructive), so this is an improvement |
| Flutter WorkoutType enum mismatch | Phase 0 fixes the critical `LONG`/`INTERVALS` bug; Phase 6.3 adds fallback for remaining types |
| Performance: recalculation for many goals | Use `prisma.workout.updateMany` per workout type instead of N individual queries |
| Quality session duration inaccuracy | Blended duration formula accounts for warmup/cooldown at different paces |
| Flutter Freezed model non-nullable defaults | Server continues sending `0` (not `null`) until Flutter models are updated in a separate PR |
| Sub-generators (ultra, triathlon, no-race) won't emit phase | Document as known limitation; all workouts default to `BASE` (same as current behavior); follow-up in Phase 8 |

---

## Data Migration

Wrap as a proper Prisma migration file (not raw SQL):

```sql
-- Migration: Backfill targetDuration for running workouts where it's 0 or null
-- Only affects uncompleted running workouts with known distance and pace
UPDATE "Workout"
SET "targetDuration" = ROUND(("targetDistance" / 1000.0) * "targetPace")
WHERE "targetPace" > 0
  AND "targetDistance" > 0
  AND ("targetDuration" IS NULL OR "targetDuration" = 0)
  AND "workoutType" IN ('EASY', 'LONG_RUN', 'RECOVERY', 'TEMPO', 'INTERVALS', 'REPETITIONS', 'FARTLEK')
  AND "isCompleted" = false;

-- Note: We do NOT change targetPace from 0 to NULL yet, because Flutter expects non-null.
-- This will be done in a follow-up migration after Phase 6.2.
```

---

## Success Criteria

1. **Every running workout** generated by the standard creator has: `targetDistance > 0`, `targetPace > 0`, `targetDuration > 0`, `phase IS NOT NULL`, `targetHrZone IS NOT NULL`
2. **`targetDuration`** is accurate within 10% for uniform-pace workouts (EASY, LONG_RUN, RECOVERY) and within 20% for quality sessions (INTERVALS, TEMPO, FARTLEK, REPETITIONS)
3. **When VDOT changes**, all uncompleted running workouts in active goals get updated paces and durations without deleting manual edits
4. **Advanced editor pace zone select** stores actual pace values in sec/km (not NaN)
5. **API validation** returns warnings when fields contradict each other
6. **API auto-derives** the missing field when two of {distance, pace, duration} are provided
7. **Flutter WorkoutType serialization** correctly maps to Prisma enum values (`LONG_RUN` not `LONG`, `INTERVALS` not `INTERVAL`)
8. **All existing tests pass** + new tests for all new functions
9. **`flutter analyze`** and **`flutter test`** pass cleanly

---

## Follow-ups (Phase 8 — not in scope)

1. **Sub-generator phase support**: Add phase logic to `run-ultra.ts`, `triathlon.ts`, `no-race.ts`
2. **Flutter nullable model migration**: Change `targetPace: double` → `targetPace: double?` and `targetDuration: int` → `targetDuration: int?`, then switch server from `?? 0` to `?? null`
3. **Cross-editor cache invalidation**: Invalidate `['plan']` query when advanced editor saves, and vice versa
4. **PaceProfile → workout integration**: Make the advanced editor's PaceProfile actually drive pace validation on individual workouts
5. **`colorOverride` vs `color` field name fix**: Align the frontend field name with the DB column name in WorkoutDetailPanel

---

## Appendix: Independent Review Results

The plan was reviewed by an independent agent against the actual codebase. **3 Critical and 5 Major issues** were found and all have been incorporated into the plan above. Summary of corrections applied:

| Issue | Severity | Correction Applied |
|-------|----------|-------------------|
| Missing `PlanPhase` import | Critical | Added to Phase 1 Step 1.1 |
| WorkoutDetailPanel has no `goal`/`user` access | Critical | Phase 4 Step 4.1 now uses React Query cache or new prop |
| Missing v1 API consumer | Critical | Phase 2 Step 2.1 expanded to 4 files |
| Quality session duration >30% error | Major | Added `computeQualityDuration` with blended pace in Step 1.2 |
| Flutter Freezed non-nullable vs server `null` | Major | Server keeps `?? 0`; deferred nullable migration to Phase 6.2 |
| Flutter WorkoutType serialization bug (`LONG`/`INTERVAL`) | Major | New Phase 0 added as prerequisite |
| Sub-generators won't emit phase | Major | Documented as known limitation in Step 1.3 + Phase 8 follow-up |
| Existing `update-vdot` regeneration conflicts | Major | Phase 5.3 now replaces (not duplicates) the existing regeneration |

**Assessment after corrections**: **Approve with changes applied** — all critical and major issues have been addressed in the revised plan.
