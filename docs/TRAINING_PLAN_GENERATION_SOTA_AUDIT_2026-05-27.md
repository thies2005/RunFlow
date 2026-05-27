# Training Plan Generation SOTA Audit - 2026-05-27

## Scope

This audit was performed after pulling `origin/master` on 2026-05-27. The local branch fast-forwarded from `b4cf949` to `e3387bd`.

Reviewed code paths:

- `Web/src/lib/plans/index.ts`
- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/triathlon.ts`
- `Web/src/lib/plans/generators/no-race.ts`
- `Web/src/lib/plans/generators/multi-goal.ts`
- `Web/src/lib/plans/generators/ai-proposal.ts`
- `Web/src/lib/plans/descriptions.ts`
- `Web/src/lib/plans/schedule-utils.ts`
- `Web/src/lib/services/plan-creation.ts`
- `Web/src/lib/plans/__tests__/index.test.ts`

Verification run:

```bash
cd Web
npm test -- --runInBand --runTestsByPath src/lib/plans/__tests__/index.test.ts src/lib/plans/__tests__/compute-duration.test.ts src/lib/plans/__tests__/validate-workout.test.ts src/lib/plans/backyard-time.test.ts src/lib/plans/triathlon-time.test.ts
```

Result: 5 suites passed, 116 tests passed.

## Executive Verdict

RunFlow's standard run generator is strong for an indie product and is closer to a serious coaching rules engine than a template library. For road running it is a solid B+/A- foundation: VDOT paces, phase progression, recovery weeks, tapering, race-week handling, rest-day avoidance, and target metadata are all meaningful.

For ultra running, the engine is good and unusually broad, especially because it includes back-to-back long runs, timed events, and backyard ultra specificity. It is not SOTA yet because it lacks terrain/elevation specificity, adaptive recovery from missed training, robust rest-day handling for back-to-back runs, and granular fueling/load guidance.

For triathlon, the architecture is promising but the current generator is not SOTA. The critical issue is volume semantics: triathlon weekly volume is modeled as a single meter value and split by sport. That produces bike loads and long rides that are far too small for half/full Ironman plans under default settings. The triathlon generator has the right vocabulary, but the training load model needs to be rebuilt around sport-specific units and time/load targets.

Overall current grade:

- Standard road running: B+/A-
- Ultra running: B
- Triathlon: C+ until volume semantics are fixed
- Adaptive/SOTA readiness: C

## What Changed Since Claude Opus 4.6's Audit

Claude's audit was directionally useful, but several items are now stale after the latest GitHub pull.

Already fixed or improved:

- `CUSTOM_DISTANCE` now flows through `PlanConfig.customDistanceM`, race-week distance, race-week cap, and plan creation.
- `CUSTOM_TRI` now accepts custom swim/bike/run distances and classifies the custom race into the closest standard tri bucket.
- `fillDurations()` now post-processes generated workouts, so ultra/tri/no-race run and swim sessions no longer remain at `targetDuration: 0` when distance and pace are present.
- Target metadata fields now exist and are persisted for pace/HR summaries.
- Plan tests pass locally when run in-band.

Still true:

- No-race quality workouts are repetitive.
- Structured steps are too coarse for watch-quality interval execution.
- `formatPace` is duplicated.
- `fixBackToBackSameType()` still has no iteration guard.
- Ultra, triathlon, no-race, and multi-goal dedicated test coverage remains thin.
- There is no true adaptive replanning for missed workouts/readiness/fatigue.

Newly found or sharpened:

- Triathlon long rides are severely under-prescribed because weekly volume is split as meters across bike/run/swim.
- Ultra, triathlon, and no-race generators mostly do not set `targetHrZone`, so the new HR target enrichment does not actually populate HR labels/ranges for those generated workouts.
- Structured steps are generated for non-run workouts using run-oriented fields; bike/strength/brick sessions can get malformed "work" steps with no duration.
- Ultra back-to-back scheduling can still land on a rest day when the next available fallback day is also blocked.
- `CUSTOM_DISTANCE` race day is fixed, but quality-session selection still falls through to marathon workouts.

## SOTA Reference Points

This audit compares RunFlow against both coaching principles and current product capabilities:

- TrainingPeaks supports structured workouts with repeat blocks and dynamic targets, which is the bar for watch-ready workout execution: https://help.trainingpeaks.com/hc/en-us/articles/235164967-Structured-Workout-Builder
- TrainingPeaks also supports structured workout sync/export to devices: https://help.trainingpeaks.com/hc/en-us/articles/115000325647-Structured-Workout-Sync-and-Manual-Export
- Runna has plan realignment after missed training blocks: https://support.runna.com/en/articles/10026375-how-to-use-the-plan-realignment-feature
- Garmin Coach exposes adaptive running plans in Garmin Connect: https://support.garmin.com/en-US/?faq=o21H5a4cSU52FwFAy0R6Z5
- Athletica positions adaptive triathlon training around performance and recovery feedback: https://athletica.ai/sports/triathlon
- Mujika and Padilla support progressive nonlinear tapering as a performance strategy: https://pubmed.ncbi.nlm.nih.gov/12840640/
- Endurance training literature commonly supports mostly low-intensity distribution with limited high-intensity work: https://pmc.ncbi.nlm.nih.gov/articles/PMC4621419/

## Architecture Assessment

The main dispatcher in `index.ts` routes by race/sport:

- Triathlon races route to `generateTriathlonPlan()`.
- No-race goals route to `generateNoRacePlan()`.
- Ultra races route to `generateUltraPlan()`.
- Standard road races route to `generateStandardPlan()`.

This split is good. The problem is that shared semantics are inconsistent between generators:

- Standard plans assign `targetHrZone`; other generators usually do not.
- Standard scheduling has more mature rest-day and volume-cap behavior.
- Triathlon uses a run-like `weeklyMileageGoal` field for a multi-sport load problem.
- Structured steps are attached after generation, but the builder is run-centric.

The right direction is not to collapse everything back into one file. The right direction is to extract shared primitives with explicit units:

- `runDistanceMeters`
- `bikeDurationSeconds` or `bikeTss`
- `swimDistanceMeters`
- `strengthDurationSeconds`
- `plannedLoad`
- `targetZones`
- `executionSteps`

## Strong Areas

### Standard Road Running

The road-running generator is legitimately strong:

- VDOT-based training paces.
- Phase model: BASE, BUILD, PEAK, TAPER, RACE_WEEK.
- 10% weekly ramp cap.
- 3:1 loading/recovery pattern.
- Race-distance-specific taper fractions.
- 48-hour gap between long run and quality session.
- Race-week shakeouts and strides.
- Pace target ranges and HR target metadata for standard generated workouts.
- Tests cover phase progression, taper, race week, long-run caps, volume scaling, rest days, and target enrichment.

### Ultra Running

Ultra coverage is broader than many small products:

- 50K through 100-mile support.
- Timed event and backyard ultra support.
- Back-to-back long runs in endurance/peak phases.
- Ultra-easy pace.
- Mental prep/night run ideas for backyard ultra.
- Long-run time-on-feet cap.

This is a good coaching skeleton.

### Triathlon Vocabulary

Triathlon generator includes the right session types:

- Swim, swim drill, open-water swim.
- Ride, long ride, ride intervals.
- Brick.
- Transition practice.
- Long run and run quality.
- Custom tri distance support.
- Swim CSS and bike FTP estimates.

The concepts are present; the load math is the weak point.

## Critical Findings

### P0 - Triathlon Volume Semantics Are Not Viable for Long Course

File: `Web/src/lib/plans/generators/triathlon.ts`

The triathlon generator treats `weeklyVolume` as meters, splits it by sport distribution, and then derives bike duration from the bike share. For a full Ironman default/minimum peak of 70,000 meters:

- Bike share: 55%
- Bike weekly volume: 38.5 km
- Estimated bike time at 23 km/h: about 100 minutes total weekly bike time
- Long ride share: 40%, floored to 50 minutes in PEAK

A peak full Ironman long ride of about 50 minutes is not credible. Half Ironman also collapses to about the same floor.

Impact:

- Full and half Ironman plans undertrain the bike dramatically.
- Brick sessions exist, but the surrounding bike load is too small.
- Weekly volume displays may appear plausible while actual sport load is not.

Fix:

- Replace triathlon `weeklyMileageGoal` semantics with sport-specific load targets.
- Use `weeklyRunDistanceM`, `weeklyBikeDurationS` or `weeklyBikeDistanceM`, and `weeklySwimDistanceM`.
- Default long-course bike progression should peak in hours, not run-equivalent meters.
- Maintain a single aggregate `plannedLoad` only for ramp/taper math, not for direct session distances.

### P0 - Structured Steps Are Not Watch-Ready

File: `Web/src/lib/plans/index.ts`

`buildStructuredStepsForWorkout()` turns an interval workout like `5x1km` into:

- warmup
- one large work block
- cooldown

It does not emit 5 work reps plus recoveries. It also runs for bike/strength/brick sessions via `mapWorkoutsForDb()`, but the builder is run-oriented and can create a duration-based non-run workout with a "work" step that has no duration.

Impact:

- Device guidance will not match interval prescriptions.
- Bike, strength, brick, and swim structured steps can be semantically wrong.
- This blocks parity with TrainingPeaks/Garmin-style execution.

Fix:

- Introduce sport-specific structured step builders:
  - run steady
  - run interval repeats
  - run fartlek time repeats
  - bike duration/power steps
  - swim distance/CSS sets
  - brick grouped bike+run steps
  - strength duration-only step or no structured steps
- Parse known description patterns only as a migration bridge; long-term, generate a structured workout object at source instead of reverse-parsing text.

### P0 - HR Target Enrichment Does Not Cover Non-Standard Generators

Files:

- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/triathlon.ts`
- `Web/src/lib/plans/generators/no-race.ts`
- `Web/src/lib/plans/index.ts`

Standard generated workouts set `targetHrZone`. Ultra, triathlon, and no-race generated workouts generally do not. `enrichWorkoutsWithTargets()` only converts an existing `targetHrZone` to labels/BPM ranges; it does not infer missing zones.

Impact:

- New persisted HR target metadata is reliable for standard plans, but not for much of the generator surface.
- Flutter/Web may show pace targets but no HR range for ultra/tri/no-race workouts.

Fix:

- Add a shared `assignWorkoutTargets(workout, paces, sport)` pass that fills `targetHrZone` by workout type before HR enrichment.
- Add tri-specific HR/power/CSS targets where HR is not the best target.
- Add tests for HR metadata across standard, ultra, triathlon, and no-race plans.

### P1 - CUSTOM_DISTANCE Race Day Is Fixed, Quality Routing Is Not

File: `Web/src/lib/plans/index.ts`

Race day now uses `customDistanceM`, but `getQualitySession()` still routes any unrecognized race type to marathon quality sessions. A custom 3K or 8K race can receive marathon-style threshold/MP sessions.

Fix:

- Add `classifyCustomRunDistance(customDistanceM)`:
  - <= 6K: 5K model
  - <= 15K: 10K model
  - <= 30K: half marathon model
  - > 30K: marathon model
- Pass the effective race model into quality selection, defaults, taper, race pace, and long-run cap logic.

### P1 - Ultra Back-to-Back Scheduling Can Violate Rest Days

File: `Web/src/lib/plans/generators/run-ultra.ts`

The back-to-back run picks `nextDay`, or `(day + 2) % 7` if `nextDay` is already used. It does not verify that the fallback day is not a rest day or already used.

Fix:

- Use a shared scheduler helper that returns available adjacent days while respecting rest days.
- If no valid adjacent day exists, degrade to one long run plus an easy/recovery run instead of forcing a violation.

### P1 - Phase Allocation Still Has Direct-Generator Edge Cases

Files:

- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/triathlon.ts`
- `Web/src/lib/services/plan-creation.ts`

The API/service layer has `resolvePhases()`, but the direct generators still compute some phase lengths locally. Ultra can over-budget phases for short plans, and triathlon can produce negative `peakWeeks`/`buildWeeks` for very short plans.

Fix:

- Centralize phase allocation in a shared `resolvePhaseBudget()` used by all generators.
- Require nonnegative phase lengths.
- Keep one week reserved for race week.
- Add tests for 1, 2, 4, 8, and 52-week plans.

### P1 - Triathlon Custom Classification Is Too Crude

File: `Web/src/lib/plans/generators/triathlon.ts`

`classifyCustomTri()` uses total distance only. A race with unusual swim/bike/run proportions can classify into the wrong training model.

Fix:

- Classify by weighted stress and discipline-specific proportions, not total kilometers alone.
- Example: long swim aquabike-like custom events should not become sprint defaults just because total distance is short.

### P1 - No-Race Plans Lack Progression Variety

File: `Web/src/lib/plans/generators/no-race.ts`

No-race quality sessions repeat:

- BASE: `Fartlek: 8km (3min hard / 2min easy)`
- BUILD: `Threshold: 6km`

Fix:

- Add a 3-4 week rotation:
  - short fartlek
  - hill/strength endurance
  - threshold cruise intervals
  - progression run
- MAINTAIN phase should include occasional strides or light quality, not zero quality forever.

### P2 - Long Run Ratios Are Aggressive

Files:

- `Web/src/lib/plans/index.ts`
- `Web/src/lib/plans/generators/run-ultra.ts`
- `Web/src/lib/plans/generators/no-race.ts`

RunFlow uses 50% long-run share, and 65% for low-volume half/marathon runners. This is sometimes practical for low-volume marathoners, but it should be constrained by experience and injury risk.

Fix:

- Use athlete profile/risk to choose long-run ratio:
  - beginner/returning injury: 30-35%
  - normal road running: 35-45%
  - low-volume marathon exception: up to 55% with warning
  - ultra back-to-back weekends: model the weekend pair as the key load, not just the primary long run
- Add warning metadata for high long-run share.

### P2 - `fixBackToBackSameType()` Needs an Iteration Guard

File: `Web/src/lib/plans/schedule-utils.ts`

The function advances when no change is possible, so the most obvious infinite loop is less likely than Claude's wording suggested. Still, changed swaps re-sort and rewind with no hard cap.

Fix:

- Add `maxIterations = workouts.length * 4`.
- Return sorted result plus optional warning metadata if the guard trips.
- Add adversarial tests with dense schedules and rest days.

### P2 - Recalculation Can Flatten Specific Workouts

File: `Web/src/lib/plans/recalculate-paces.ts`

Pace recalculation updates future workouts by type. This can flatten nuanced sessions:

- MP segments become generic threshold for all TEMPO.
- Ultra threshold/race-pace steady sessions become generic threshold.
- Tri race-pace/brick context is not preserved.

Fix:

- Recalculate from structured targets or intensity labels, not workout type alone.
- Preserve `targetPaceZoneLabel` and description-specific intent.

## Is It SOTA for Ultra Running?

Not yet, but it is a credible foundation.

What is close to SOTA:

- Back-to-back long runs.
- Ultra-easy pacing.
- Timed event support.
- Backyard ultra mental-prep ideas.
- Tapering and recovery weeks.
- Long-run caps.

What blocks SOTA:

- No terrain/elevation gain modeling.
- No downhill/eccentric-load preparation.
- No heat/night/technical-trail progression except backyard night runs.
- No fueling/carbohydrate/hydration schedule as structured targets.
- No adaptive response to missed workouts, readiness, HRV, soreness, sleep, or actual completed load.
- Back-to-back scheduling can violate rest days.
- HR target metadata is missing unless `targetHrZone` is assigned.

Ultra grade: B.

With the fix plan below, it can become A-/A for algorithmic ultra plans.

## Is It SOTA for Triathlon?

No.

The generator has the right session names and general periodization, but the load model is not currently competitive for half/full Ironman. A serious triathlon plan must model bike and swim in their own units and use sport-specific progression. RunFlow currently uses a single run-like weekly meter value and splits it by distribution, causing long rides and total bike time to be under-prescribed.

What is good:

- Multi-sport session vocabulary.
- Custom tri distances.
- CSS/FTP estimation.
- Brick and open-water sessions.
- Transition practice.
- Taper/race-week support.

What blocks SOTA:

- Bike volume is far too low under defaults.
- Swim workouts are basic and mostly endurance/drill/open-water labels.
- No power-zone structured bike execution.
- No CSS set progression.
- No sport-specific fatigue/load model.
- No device-ready brick grouping.
- No adaptive schedule for missed swims/rides/runs.

Triathlon grade: C+.

The fix is not huge in UI terms, but it is foundational in modeling terms.

## Prioritized Repair Plan

### Phase 1 - Correctness and Target Integrity

Goal: make every generated workout internally consistent and safely executable.

1. Add a shared target assignment pass.
   - Fill `targetHrZone` for all generated run workouts.
   - Fill swim target labels from CSS.
   - Fill bike target labels from FTP zones.
   - Preserve nulls only when there is truly no target.

2. Replace the run-only structured step builder.
   - Add sport-specific builders.
   - Do not build malformed steps for strength or generic duration-only workouts.
   - Parse repeat structures like `5x1km`, `4x2km`, `6x400m`, and fartlek `3min/2min`.

3. Fix custom run routing.
   - Classify `CUSTOM_DISTANCE` by distance.
   - Apply classification to quality sessions, taper defaults, race pace, long-run caps, and display labels.

4. Harden scheduling.
   - Add iteration cap to `fixBackToBackSameType()`.
   - Fix ultra back-to-back rest-day fallback.
   - Make race-week supplemental workouts respect rest days where practical.

Acceptance tests:

- Standard, ultra, triathlon, and no-race generated workouts have correct target metadata.
- `5x1km` creates 5 work reps and recovery steps.
- Custom 3K does not get marathon sessions.
- Back-to-back ultra runs do not land on rest days.
- Dense schedules terminate and produce warnings instead of looping.

### Phase 2 - Rebuild Triathlon Load Model

Goal: make triathlon plans credible for sprint through full Ironman.

1. Introduce `TriLoadProfile`.
   - `weeklyRunDistanceM`
   - `weeklyBikeDurationS`
   - `weeklySwimDistanceM`
   - `weeklyStrengthDurationS`
   - optional aggregate `plannedLoadScore`

2. Set race-type defaults by sport.
   - Sprint: short bike/run, technique-heavy swim.
   - Olympic: bike endurance plus threshold, 2-3 swims.
   - Half Ironman: long ride progression into multi-hour range, race-pace bricks.
   - Full Ironman: long ride progression into long-course range, longer bricks, durability weeks.

3. Progress each sport independently.
   - Run: distance/risk caps.
   - Bike: duration and power zones.
   - Swim: distance, CSS, drills, threshold/VO2 sets.
   - Strength: duration and phase-specific focus.

4. Make bricks structured.
   - Bike step group + transition + run step group.
   - Use race type to scale bike/run brick duration.

Acceptance tests:

- Full Ironman peak long ride is hours, not 50 minutes.
- Half Ironman peak long ride is materially longer than Olympic.
- Swim peak volume scales with race swim distance.
- Brick duration and frequency increase in BUILD/PEAK.
- Taper reduces volume while preserving short intensity.

### Phase 3 - Ultra-Specific SOTA Improvements

Goal: move ultra from good to genuinely differentiated.

1. Add terrain profile inputs.
   - target elevation gain
   - trail/road/mountain
   - technicality
   - downhill load

2. Add ultra workout types/metadata.
   - climb repeats
   - hiking-power intervals
   - downhill conditioning
   - night run progression
   - fueling practice with grams/hour targets

3. Improve back-to-back weekends.
   - Model Saturday/Sunday pair as one stress unit.
   - Reduce weekday intensity after large back-to-back weekends.
   - Add cutback weekends.

4. Add timed/backyard specificity.
   - loop consistency sets
   - walk/run ratio progression
   - sleep-deprivation exposure only for appropriate users
   - race simulation blocks

Acceptance tests:

- Mountain ultra includes vert-specific sessions.
- Flat timed event avoids unnecessary hill emphasis.
- Backyard ultra includes loop pacing and night exposure in the right phase.
- Fueling practice appears in long-run structured metadata, not just prose.

### Phase 4 - Adaptive Replanning

Goal: close the largest gap versus Garmin/Runna/Athletica-style products.

1. Add planned vs completed load tracking.
   - planned distance/duration/load by sport
   - completed distance/duration/load by sport
   - missed key sessions
   - acute monotony/spike checks

2. Add readiness inputs.
   - sleep
   - soreness
   - HRV/resting HR if available
   - subjective readiness
   - recent completion ratio

3. Add replan rules.
   - Missed one easy session: do not reschedule.
   - Missed key long run: shift or reduce next key session.
   - Missed 2-3 workouts: reduce next week and recalculate ramp.
   - Missed a full week: realign phase plan and reduce peak target.
   - Low readiness: convert quality to easy or reduce volume.

4. Add explainability.
   - Store `adjustmentReason`.
   - Show concise user-facing text.
   - Keep coach override possible.

Acceptance tests:

- Missing three workouts triggers realignment suggestion.
- Completed overload week reduces next week's load.
- Low readiness converts tomorrow's intervals to easy.
- Replanning never increases weekly load beyond cap.

### Phase 5 - Test and Refactor Foundation

Goal: make future coaching changes safe.

1. Split `index.ts`.
   - `standard.ts`
   - `shared/types.ts`
   - `shared/volume.ts`
   - `shared/schedule.ts`
   - `shared/targets.ts`
   - `shared/structured-steps.ts`

2. Add dedicated test files.
   - `standard.test.ts`
   - `ultra.test.ts`
   - `triathlon.test.ts`
   - `no-race.test.ts`
   - `multi-goal.test.ts`
   - `structured-steps.test.ts`
   - `schedule-utils.test.ts`

3. Add invariant tests.
   - no workouts before start date
   - no rest-day violations outside race-day exceptions
   - no negative phase lengths
   - all run workouts have target pace/duration where expected
   - all target metadata is internally consistent
   - structured steps sum to planned duration/distance within tolerance

## Release Order

Recommended order:

1. P0 target/structured-step integrity.
2. P0 triathlon load model.
3. P1 custom distance and scheduling hardening.
4. Dedicated ultra/tri/no-race tests.
5. Adaptive replanning.
6. Terrain/fueling/advanced ultra differentiation.

Do not market triathlon as SOTA until Phase 2 is complete.

## Short Answer

RunFlow is better than a template generator and has real coaching logic. It is not yet SOTA overall.

For ultras, it is close enough to be worth polishing aggressively. For triathlon, the concept layer is good but the load model must be fixed before it can be trusted for long-course preparation.
