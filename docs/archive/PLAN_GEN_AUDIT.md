# RunFlow Plan Generation Logic — Full Audit Report

## Executive Summary

Plan generation is a **split client/server system**. The Flutter client collects user inputs through a 13-step wizard and sends a `CreateGoalRequest` to the backend (`POST /api/plans`). All actual plan generation (workout scheduling, pace assignment, zone mapping) happens server-side in the Next.js backend. The client displays results and provides live pacing feedback during workouts.

**Three distinct zone/pace systems** coexist in the codebase: **VDOT-based training paces**, **heart rate zones**, and **goal pace**. These interact but have inconsistencies in methodology and data flow.

---

## 1. Architecture Overview

### Data Flow

```
User Input (Flutter 13-step wizard)
  → PlanWizardState (Riverpod, in-memory)
  → CreateGoalRequest (HTTP POST /api/plans)
  → Backend: plan-creation.ts
      1. normalizePlanInput() — unit conversion, defaults
      2. resolveVdot() — calibration → activities → target time → fallback VDOT 30
      3. resolvePhases() — build/peak/taper week allocation
      4. generateTrainingPlan() → dispatches by race type
      5. fixBackToBackSameType()
      6. enrichWorkoutsWithDescriptions()
  → Goal + Workouts stored in DB, returned to client
  → Displayed on Plan Screen / Goal Detail Screen
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| **Flutter UI** | `presentation/screens/onboarding/unified_plan_wizard.dart` (3294 lines) | 13-step wizard |
| **Flutter State** | `presentation/providers/plan_wizard_providers.dart` (387 lines) | Wizard state + `buildSubmitPayload()` |
| **Flutter Domain** | `domain/entities/goal_entities.dart` | `CreateGoalRequest`, `Workout`, `Goal` |
| **Flutter VDOT** | `core/utils/vdot.dart` (206 lines) | Client-side VDOT + `calculateTrainingPaces()` |
| **Flutter HR Zones** | `core/utils/vdot_calculator.dart` (112 lines) | `calculateHRZonesFromLTHR()` — 7-zone LTHR model |
| **Flutter Pace Eval** | `domain/entities/pace_zone.dart` (50 lines) | `PaceZoneResult.evaluate()` — live 10% tolerance |
| **Backend Orchestrator** | `Web/src/lib/services/plan-creation.ts` (863 lines) | `normalizePlanInput`, `resolveVdot`, `resolvePhases`, `createPlanWithWorkouts` |
| **Backend Generator** | `Web/src/lib/plans/index.ts` (1316 lines) | `generateStandardPlan`, `generateWeek`, `workoutTypeToHrZone` |
| **Backend Ultra** | `Web/src/lib/plans/generators/run-ultra.ts` (680 lines) | Ultra-distance plans |
| **Backend Triathlon** | `Web/src/lib/plans/generators/triathlon.ts` (708 lines) | Triathlon plans |
| **Backend VDOT** | `Web/src/lib/metrics/vdot.ts` (209 lines) | Server-side VDOT + `calculateTrainingPaces()` |
| **Backend Zones** | `Web/src/lib/analytics/zones.ts` (108 lines) | `calculateUserZones()` — Karvonen 7-zone |
| **Backend Descriptions** | `Web/src/lib/plans/descriptions.ts` (266 lines) | `inferIntensityZone()`, `getRacePace()` |

---

## 2. Heart Rate Zones

### 2.1 Four Incompatible HR Zone Systems

The app implements **four different HR zone calculation methodologies** that produce different zone boundaries for the same athlete:

**System A: LTHR-Based (Client-Side, Onboarding Preview)**
- File: `flutter/lib/core/utils/vdot_calculator.dart:71-99`
- Method: Percentage of Lactate Threshold Heart Rate (Joe Friel-style)
- 7 zones using %LTHR multipliers: 75%, 87%, 94%, 100%, 105%, 110%
- LTHR auto-estimated as `maxHR * 0.9` if not provided (`unified_plan_wizard.dart:2498-2504`)
- **Used for:** Onboarding HR profile preview only — NOT persisted, NOT sent to server

| Zone | Label | % of LTHR |
|------|-------|-----------|
| Z1 | Recovery | up to 75% |
| Z2 | Aerobic | 75%-87% |
| Z3 | Tempo | 87%-94% |
| Z4 | Threshold | 94%-100% |
| Z5 | VO2max | 100%-105% |
| Z6 | Anaerobic | 105%-110% |
| Z7 | Neuromuscular | >110% |

**System B: Karvonen/HRR-Based (Server-Side, Analytics)**
- File: `Web/src/lib/analytics/zones.ts:87-107`
- Method: Karvonen formula `TargetHR = ((max - rest) * %Intensity) + rest`
- 7 zones using %HRR: 50%, 60%, 70%, 80%, 90%, 95%, 100%
- **Used for:** Server-side zone calculations, activity zone time classification

| Zone | Label | % HRR |
|------|-------|-------|
| Z1 | Recovery | 50-60% |
| Z2 | Aerobic | 60-70% |
| Z3 | Tempo | 70-80% |
| Z4 | Threshold | 80-90% |
| Z5 | VO2max | 90-95% |
| Z6 | Anaerobic | 95-100% |
| Z7 | Neuromuscular | >100% |

**System C: User-Configurable Zones (Profile Settings)**
- File: `flutter/lib/domain/entities/profile_entities.dart:38-43`
- 6 user-editable zone boundaries (`hrZone1Max` through `hrZone6Max`)
- DB defaults: 130, 148, 160, 170, 178, 187 bpm
- **Used for:** Activity HR zone time calculation during Strava sync, displayed in analytics

**System D: Training Paces Card HR Ranges (%HRmax)**
- File: `flutter/lib/presentation/widgets/training_paces_card.dart`
- Shows HR ranges as % of HRmax (e.g., 65-79% HRmax for Easy)
- **Yet another methodology** — neither LTHR nor Karvonen

### 2.2 HR Zone Assignment to Workouts (Server-Side)

File: `Web/src/lib/plans/index.ts:1277-1289`

Each workout type maps to a single target HR zone:

| Workout Type | Target HR Zone |
|---|---|
| Recovery | Zone 1 |
| Easy, Long Run | Zone 2 |
| Tempo | Zone 3 |
| Fartlek, Intervals | Zone 4 |
| Repetitions, Race | Zone 5 |

This is a **flat mapping** — the zone number is stored as `Workout.targetHrZone` but the actual zone boundaries (bpm) are NOT included in the workout. The client must separately look up what "Zone 3" means for this user.

### 2.3 Critical HR Issues

1. **HR profile data never reaches the server.** The wizard collects `maxHeartRate`, `restingHeartRate`, `thresholdHR`, `thresholdPace` but none are in `CreateGoalRequest` (`goal_entities.dart:44-110`). The server uses its own VDOT-based zone mapping.

2. **Four incompatible zone systems** coexist with no reconciliation. A workout assigned to "Zone 3" means different BPM ranges depending on which system interprets it.

3. **Zone 6 and Zone 7 data is lost in the Flutter client.** The `Activity` entity only has `hrZone1Time` through `hrZone5Time`. Analytics hardcodes zones 6-7 as `[0, 0]` (`analytics_screen.dart:886`).

4. **LTHR auto-estimation (maxHR * 0.9) has no user warning** and the actual LTHR-to-maxHR ratio varies 85-95% between individuals.

---

## 3. Pace Zones

### 3.1 VDOT-Based Training Paces (Server-Side, Authoritative)

File: `Web/src/lib/metrics/vdot.ts:137-164`

All training paces are derived from VDOT using Jack Daniels' formula with %VO2max fractions. The quadratic inversion solves: `VO2 = -4.60 + 0.182258*v + 0.000104*v²` for velocity `v`.

| Zone | % VO2max |
|------|----------|
| Easy (range) | 65%-79% |
| Marathon | 78% |
| Threshold | 88% |
| Interval | 100% |
| Repetition | 105% |

### 3.2 Pace Assignment to Workout Types (Server-Side)

File: `Web/src/lib/plans/index.ts:565-566`

| Workout Type | Pace Source |
|---|---|
| Easy / Long Run | Average of `easy.min` and `easy.max` |
| Recovery | `easy.max` (slower end) |
| Tempo | `threshold` pace |
| Intervals | `interval` pace |
| Repetitions | `repetition` pace |
| Fartlek | Average of `threshold` and `interval` |
| Race-specific (5K PEAK) | `repetition` pace |
| Race-specific (10K PEAK) | `threshold` pace |
| Race-specific (HM PEAK) | `marathon` pace |
| Race-specific (Marathon PEAK) | `marathon` pace |

### 3.3 Live Pace Evaluation During Workout

File: `flutter/lib/domain/entities/pace_zone.dart:18-49`

Uses **absolute pace with 10% tolerance band**:
- `inZone`: current pace within ±10% of target pace
- `tooFast`: more than 10% faster than target
- `tooSlow`: more than 10% slower than target
- `noTarget`: target pace is 0

This is NOT zone-based — it's a simple tolerance check against the absolute `targetPace` stored on the workout.

### 3.4 Race Pace Derivation for Descriptions

File: `Web/src/lib/plans/descriptions.ts:54-62`

| Race | Race Pace Source |
|------|-----------------|
| Marathon | Marathon pace (78% VO2max) |
| Half Marathon | Average of marathon and threshold |
| 10K | Threshold pace |
| 5K | Interval pace |

Workouts within 3% of race pace during PEAK phase are labeled "Goal Pace" (`descriptions.ts:64-70`).

---

## 4. Goal Pace (Target Time)

### 4.1 Input Flow

- User enters target race time in wizard Step 7 (slider or manual HH:MM:SS)
- Stored as `targetTime` in seconds on `CreateGoalRequest`
- If not provided, server projects one using: `currentVDOT × progressionCoefficient → projectedVDOT → Daniels race time`

### 4.2 How Goal Pace Influences the Plan

Goal pace does **NOT directly set workout paces**. Instead, the chain is:

```
targetTime + raceDistance → VDOT (via Daniels formula)
                        → calculateTrainingPaces(vdot)
                        → Absolute pace per workout type
```

If the user sets an unrealistic goal time, the derived VDOT will be inflated, producing training paces that are too fast for the athlete's actual fitness.

### 4.3 Progression Coefficient

File: `Web/src/lib/metrics/goalProjection.ts:93-118`

Linear additive model capped at 15% max improvement:
- Duration: +0.8% per 4 weeks of plan
- Frequency: +2.0% per 4 runs/week
- Volume: +1.5% per 50 km/week

---

## 5. Plan Generation Algorithm

### 5.1 Volume Progression

File: `Web/src/lib/plans/index.ts:165-201`

- Start volume = 60% of peak volume
- Geometric growth: `growthRate = (peak/start)^(1/effectiveWeeks)`
- Max weekly growth: 10% cap
- Recovery weeks every 4th week at 80% volume

### 5.2 Long Run Calculation

File: `Web/src/lib/plans/index.ts:884-916`

- Ratio: 50% of weekly volume (65% for low-volume HM/Marathon)
- Capped by: `min(55% weekly volume, race max, user max, 3.5hr time-on-feet)`

### 5.3 Quality Session Assignment (Phase-Dependent)

| Phase | 5K | 10K | HM | Marathon |
|-------|-----|------|-----|----------|
| BASE | Fartlek | Fartlek | Fartlek | Fartlek |
| BUILD | Intervals | Intervals | Intervals | Threshold |
| PEAK | Repetitions | Threshold | MP Segments | MP Segments |

### 5.4 Key Constants

| Constant | Value |
|---|---|
| Start volume ratio | 0.60 (60% of peak) |
| Weekly growth cap | 1.10 (10%) |
| Recovery week factor | 0.80 (80%) |
| Step loading cycle | Every 4th week |
| Min gap between hard sessions | 2 days |
| Max time-on-feet | 3.5 hours (12600s) |
| Max improvement factor | 1.15 (15%) |
| Taper fractions (marathon) | [0.80, 0.65, 0.45] |

---

## 6. Workout Data Storage Model

### What Gets Stored Per Workout

File: `flutter/lib/domain/entities/dashboard_entities.dart:396-512`

| Field | Type | Source |
|---|---|---|
| `targetPace` | `double` (sec/km) | VDOT-derived, absolute |
| `targetDistance` | `double` (meters) | Algorithm-generated |
| `targetDuration` | `int` (seconds) | `distance × pace` |
| `targetHrZone` | `int?` (1-7) | `workoutTypeToHrZone()` flat mapping |
| `intensityZone` | `String?` | `inferIntensityZone()` label (e.g., "E Zone", "T Zone") |
| `phase` | `String?` | Week phase (BASE, BUILD, PEAK, TAPER) |
| `description` | `String` | Generated text (e.g., "Intervals: 5x1km @ 3:45/km") |

**Key finding:** Interval details (e.g., "5x1km") are **embedded in description strings only** — no structured step data. The client-side `StructuredWorkout`/`WorkoutStep` model exists for user-created templates but is NOT used for generated plan workouts.

---

## 7. Data Models Summary

### Dual-Layer Architecture

```
data/models/*_models.dart (Freezed, JSON) <-- API serialization
        |
     mapping layer (inline in providers/repositories)
        |
domain/entities/*_entities.dart (hand-written) <-- UI / business logic
```

### Key Models

| Model | Layer | Key Fields |
|---|---|---|
| `Goal` | Both | raceType, raceDate, targetTime, currentVdot, planWeeks, runsPerWeek, workouts[] |
| `Workout` | Both | workoutType, targetPace, targetDistance, targetDuration, targetHrZone, intensityZone, phase |
| `TrainingPaces` | Both | easyMin, easyMax, marathon, threshold, interval, repetition (sec/km) |
| `HeartRateZone` | Flutter only | label, min (bpm), max (bpm) |
| `PaceZoneResult` | Flutter only | status, currentPace, targetPace, tolerance |
| `WorkoutStep` | Flutter only | type (warmup/cooldown/interval/recovery/rest), durationType, paceTarget |
| `PaceTarget` | Flutter only | zone (WorkoutType?), minPace, maxPace |
| `StructuredWorkout` | Flutter only | steps (recursive StepNode tree) |

---

## 8. Critical Issues

### 8.1 Dual VDOT Implementation Drift Risk
The VDOT calculator and `calculateTrainingPaces()` are **duplicated** between Flutter (`vdot.dart`) and backend (`vdot.ts`) with identical formulas today, but no mechanism prevents drift. Race defaults tables are also duplicated.

### 8.2 HR Profile Data Silently Dropped
The wizard collects 4 HR fields (`maxHeartRate`, `restingHeartRate`, `thresholdHR`, `thresholdPace`) that are **never sent to the server**. Users see HR zone calculations during onboarding but these have zero effect on the generated plan. The label says "Optional. Used for local HR zone calculations only." but the local calculations are not persisted either.

### 8.3 Four Incompatible Zone Systems
- LTHR-based (onboarding preview)
- Karvonen/HRR (server analytics)
- User-configurable (profile editor)
- %HRmax (training paces card)

No reconciliation exists. A workout assigned "Zone 3" means different BPM depending on context.

### 8.4 Zones 6-7 Data Loss
Backend calculates 7 zones, Flutter client only models 5. Analytics hardcodes zones 6-7 as `[0, 0]`.

### 8.5 No Structured Workout Steps in Generated Plans
Server-generated workouts contain flat pace/distance with interval details in description text only. The rich `WorkoutStep`/`StepGroup`/`StructuredWorkout` model exists but is only for user-created custom templates — there's no bridge between generated plans and structured step execution.

### 8.6 Quality Session Distances Are Hardcoded
Interval/threshold session distances don't scale with weekly volume or athlete fitness. A 5K plan always generates 10000m interval sessions regardless of whether the athlete runs 30 or 80 km/week.

### 8.7 Goal Pace Indirectly Influences Workouts
If the user sets an unrealistic goal time, the inflated VDOT produces training paces that are too fast. There's no sanity check against the user's actual fitness (calibration VDOT).

### 8.8 PaceTarget.zone Uses Wrong Type
`PaceTarget.zone` is typed as `WorkoutType?` but semantically represents a zone identifier, not a workout type. This conflation is confusing.

### 8.9 Duplicate Provider State
`PlanWizardState` and `OnboardingState` contain ~30 identical plan configuration fields, creating maintenance burden.

---

## 9. Test Coverage Assessment

### Well-Covered Areas
- VDOT calculation + race prediction (`vdot_test.dart` — 19 tests)
- Workout adaptation by readiness (`workout_adaptation_engine_test.dart` — 22 tests)
- Unit contracts for distance/pace (`unit_contract_test.dart` — 25 tests)
- TRIMP training load (`trimp_service_test.dart` — 22 tests)
- Plan wizard state management (`plan_wizard_test.dart` — 7 tests)

### Zero-Coverage Critical Areas

| Untested Code | Lines | Risk |
|---|---|---|
| `calculateHRZonesFromLTHR()` | 29 | HIGH — zone boundaries shown to users |
| `calculateTrainingPaces()` | 28 | HIGH — 5 training zone paces displayed everywhere |
| `WorkoutStepExecutionEngine` | 243 | HIGH — runtime workout execution |
| `calculateProjectedGoalTime()` + `calculateShapePenalty()` | ~200 | HIGH — goal time projection |
| `estimateTriathlonTime()` + swim/bike estimators | 264 | HIGH — triathlon plan projections |
| `PlanDefaults.planWeeks()`, `phaseWeeks()` | 178 | MEDIUM — default parameter computation |
| `PaceZoneResult.evaluate()` | 50 | MEDIUM — live pacing feedback |

---

## 10. Recommendations

1. **Consolidate to one HR zone system.** Use either LTHR-based (Joe Friel) or Karvonen (HRR) consistently across client and server. Persist the chosen method to the user profile automatically during onboarding.

2. **Send HR profile to the server.** Include `maxHeartRate`, `restingHeartRate`, `lthr` in `CreateGoalRequest` so the server can generate zone-appropriate workouts and descriptions.

3. **Add structured workout steps to generated plans.** Generate `WorkoutStep` data (warmup, intervals, recovery, cooldown) server-side instead of embedding details in description strings. This enables guided execution.

4. **Add server-side VDOT sanity checks.** Compare user-provided target time VDOT against calibration VDOT. Warn or cap if goal VDOT exceeds calibration VDOT by more than the max improvement factor.

5. **Scale quality session distances by weekly volume.** Replace hardcoded distances with volume-proportional calculations.

6. **Fix zones 6-7 data loss.** Add `hrZone6Time` and `hrZone7Time` to the Flutter `Activity` entity.

7. **Add unit tests for the 7 zero-coverage critical areas** identified above, starting with `calculateHRZonesFromLTHR()`, `calculateTrainingPaces()`, and `PaceZoneResult.evaluate()`.

8. **Deduplicate client/server VDOT and race defaults.** Make the backend the single source of truth; have the Flutter client fetch training paces from the API rather than computing locally.
