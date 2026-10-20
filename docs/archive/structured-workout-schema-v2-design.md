# Structured Workout Schema v2 — Design

Status: design approved 2026-10-13 for the feature run defined in `docs/plans/2026-10-13-training-planning-round.md` (task A2 implements this; A4/A5/C build on it). Grounded in `docs/planning-audit-2026-10-13.md` §2–§4. **Validate every field name below against the current code before implementing** — line numbers moved since the audit snapshot.

## Goals

One versioned, sport-aware structured-workout payload that:
1. expresses everything the guided player needs (per-step targets **with ranges**, nested repeats with set-level rest, time/distance/**lap-button** durations, per-step notes);
2. expresses everything the editor needs (custom pace values, not just E/M/T/I/R letters; time-based steps; nesting; notes);
3. adds **power targets (watts range)** for cycling (feeds workstream C);
4. keeps every stored legacy payload renderable forever, on web AND Android;
5. has identical field names on both platforms (TS ↔ Kotlin mapping below).

## The v2 payload (TypeScript)

Lives in a new module `Web/src/lib/plans/structured.ts` (types + parse + serialize + zod validation). Stored in the existing `Workout.structuredSteps Json` column — **no Prisma change**.

```ts
export interface StructuredWorkoutV2 {
  version: 2;
  /** where this payload was produced — informational */
  source: 'engine' | 'builder' | 'editor' | 'progression' | 'mcp';
  /** top-level step sequence; a node is either a step or a repeat group */
  steps: StepNode[];
}

export type StepNode = StructuredStep | RepeatGroup;

export interface RepeatGroup {
  kind: 'repeat';
  /** 1..100 */
  times: number;
  /** rest executed between completed iterations of the group (not after the last) */
  setRest?: Duration;
  steps: StepNode[];        // nestable up to depth 3
  label?: string;
}

export interface StructuredStep {
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'steady' | 'transition';
  label?: string;           // short name shown in player/editor ("400 m I")
  note?: string;            // coach note shown pre-run and on the step card
  duration: Duration;
  target?: Target;
}

export type Duration =
  | { type: 'time'; seconds: number }              // 1..86400
  | { type: 'distance'; meters: number }           // 1..100000
  | { type: 'lap_press' };                         // advance on lap button

export type Target =
  | { type: 'pace';  unit: 'sec_per_km' | 'sec_per_100m'; min?: number; max?: number; zoneLabel?: string }
  | { type: 'hr';    zone?: number; minBpm?: number; maxBpm?: number }   // zone 1..6, or explicit bpm range
  | { type: 'power'; minWatts?: number; maxWatts?: number; ftpPercent?: number; zoneLabel?: string }
  | { type: 'rpe';   value: number }               // 1..10
  | { type: 'free' };
```

Rules (enforced by zod, mirrored on Android as light structural checks):
- `steps` length 1..200; repeat `times` 1..100; nesting depth ≤ 3; a repeat group contains ≥ 1 step; `setRest` only on groups.
- Exactly one duration per step; `lap_press` valid for any step kind.
- Pace target: `min` ≤ `max` when both set; at least one bound OR `zoneLabel` present; **unit is explicit** (see Units).
- HR target: `zone` XOR (`minBpm`/`maxBpm`).
- Unknown fields are IGNORED on read everywhere (forward compatibility) and dropped on write (writes are always canonical v2).

## Units — the one rule that stays, made explicit

Current convention (audit §4): plan paces are sec/km for runs and **sec/100m for swims in the same columns**, unit implicit in sport. v2 keeps those magnitudes (no re-storing of existing data) but makes the unit explicit per target:

- `unit: 'sec_per_km'` for RUN-family steps; `unit: 'sec_per_100m'` for SWIM steps. Conversion is exactly ×10 / ÷10 — implement once per platform (`convertPace(value, from, to)`), forbid any other implicit conversion site.
- The writer (editor/engine/MCP) MUST set `unit` from the workout's sport; the reader MUST trust `unit`, never infer from kind.
- Generator keeps emitting existing magnitudes; v2 emission just wraps them with the explicit unit (training math unchanged — same numbers, new envelope).

## Coexistence with the three legacy shapes

Parse order (`parseStructuredWorkout(json, sport): StructuredWorkoutV2 | null`):
1. `version: 2` → as-is.
2. Generator flat v1 (`{version:1, steps:[{type,name,distanceMeters?,durationSeconds?,paceSecondsPerKm?,hrZone?}]}`) → v2: `type→kind` (`work` stays `work`), name→label, distanceMeters/durationSeconds→duration, paceSecondsPerKm→pace target with unit from sport, **hrZone→hr target (stop dropping it)**.
3. Builder nested (`{warmup:{distance,pace}, main:[{reps,distance,pace,restSeconds}], cooldown}`) → v2: warmup/cooldown as steps, each main row as a `RepeatGroup{times:reps}` of one distance step + `setRest` from restSeconds; pace letters resolved via the existing `paceLetterTable`/`calculateTrainingPaces` chain and written out as **numeric pace targets** (v2 never stores letters).
4. Progression shape (`{type:'warmup'|'main'|'cooldown', description}`) → v2: one step per entry with the description as `label`/`note`, duration `{type:'time', seconds:0}` is NOT valid — use `lap_press` duration and `free` target, and flag `source:'progression'` so the UI prompts to fill in real structure. (This ends the silent data loss — audit §3.)

Write path is always canonical v2. A workout is upgraded only when edited (never rewritten by read paths). Renderers (plan views, ZWO export, planned-TSS summation `plannedTss.ts`) consume the v2 model via `parseStructuredWorkout` so all four shapes render identically.

## TS ↔ Kotlin mapping (identical names, by contract)

| TypeScript | Kotlin (`domain/plan/structured/` new package) |
|---|---|
| `StructuredWorkoutV2` | `data class StructuredWorkoutV2(val version: Int, val source: String, val steps: List<StepNode>)` |
| `StepNode` (union) | `sealed interface StepNode` |
| `RepeatGroup` | `data class RepeatGroup(kind="repeat", times: Int, setRest: Duration?, steps: List<StepNode>, label: String?) : StepNode` |
| `StructuredStep` | `data class StructuredStep(kind: String, label: String?, note: String?, duration: Duration, target: Target?) : StepNode` |
| `Duration` union | `sealed interface Duration { data class Time(seconds: Int); data class Distance(meters: Int); object LapPress }` |
| `Target` union | `sealed interface Target { Pace(unit, min, max, zoneLabel); Hr(zone, minBpm, maxBpm); Power(minWatts, maxWatts, ftpPercent, zoneLabel); Rpe(value); Free }` |

- JSON field names are byte-identical on both sides (no camelCase drift); numbers are `Double` on Kotlin except `times`/`seconds`/`meters` which are `Int` in both.
- `StructuredStepsParser.parse` (Android) returns the v2 model; its legacy branches implement the same coexistence rules above. `StructuredWorkoutBuilder` (Android) and the web editor (A4) both serialize v2 only.
- The guided player consumes a **flattened program**: `flatten(work: StructuredWorkoutV2): List<PlayerStep>` expanding repeat groups (iteration labels "2×(4×400 m) — rep 3 of 4"), injecting set-rest as recovery steps, resolving targets to comparable units. `PlayerStep = { label, note, kind, duration, target? , repeatContext? }`. Unit tests pin: nested expansion counts, set-rest placement (between iterations, not after last), unit conversions.

## What changes where (implementation pointers)

- `Web/src/lib/plans/structured.ts` (new): types, zod schemas, `parseStructuredWorkout`, `serializeStructuredWorkout`, `convertPace`.
- Engine emission: `lib/plans/index.ts` + `WebPlanEnrichment`-equivalent sites wrap their existing step output as v2 (numbers unchanged).
- `progression/apply/route.ts` writes v2 (source `'progression'`) instead of the orphan shape.
- Web renderers/TSS: `plannedTss.ts`, plan views, `zwo-export.ts` route go through the v2 parser.
- Android: new `domain/plan/structured/` model + `StructuredStepsParser` rewrite + `StructuredWorkoutBuilder` v2 encode; `RecordingController.StepRuntime` gains `target: Target?` (replaces bare `targetPaceSecPerKm`), `durationType` gains LAP_PRESS.

## Coverage checklist (every audit gap maps to a feature)

| Audit §2 gap | Covered by |
|---|---|
| 1 per-step targets display-only | v2 `StructuredStep.target` consumed by player enforcement (A5) |
| 2 no target ranges | `pace.min/max`, `hr.minBpm/maxBpm`, `power.minWatts/maxWatts` |
| 3 hrZone dropped | flat-v1 parse maps hrZone → hr target; player displays it (enforcement excluded) |
| 4 nested repeats flattened | `RepeatGroup` + flattener with set-rest |
| 5 no lap-button | `duration {type:'lap_press'}` |
| — per-step notes | `note` on steps; workout `notes` column unchanged |
| — custom paces | numeric targets; letters resolved at write time |
| — cycling power | `power` target (used once C1 lands FTP/zones; renderable before that) |

## Explicit exclusions

- No HR **enforcement** in the player (no BLE HR source today; display-only).
- No power **recording** (same reason; power is a target/display concept here).
- No Prisma schema changes; no changes to `WorkoutType`/`PlanSport` enums; no migration of stored payloads (parse-on-read forever).
