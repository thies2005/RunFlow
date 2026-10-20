# Planning Audit — RunFlow training-planning system, app↔web consistency, guided running, MCP readiness, cycling power

Date: 2026-10-13 · Method: three read-only research agents (web planning stack, Android guided execution, app↔web contract, MCP-assumption audit) over the working tree at commits `f9fdffb6..001b8b49` (+ `6e7eefe4` landed during research). All claims carry file:line from that snapshot — re-verify line numbers before editing.

This document feeds two separate runs:
- **Bug-fix run** (owned by a separate agent): §5.
- **Feature run** (schema v2, view/editor, guided player v2, cycling power, dual-MCP): `docs/plans/2026-10-13-training-planning-round.md` + `docs/structured-workout-schema-v2-design.md`.

---

## 1. How planning works today (architecture map)

**Creation (web).** Onboarding wizard step 4 renders `PlanSetupForm` (sport selector incl. TRIATHLON); the advanced builder is `Web/src/app/plan-advanced/[goalId]` with `PlanEditorLayout` composing: Toolbar (undo/redo via `/api/plan-advanced/[goalId]/undo`, mode toggle GUIDED/AI_ASSISTED, plan-name inline edit, AI-chat toggle (premium), view toggle, Export/Import CSV, Delete), `InfiniteScroll` week list with `GuidedWeekSuggest` (phase templates BASE..RACE_WEEK, VDOT-scaled distances), `WorkoutListPanel` (WeekSummaryBar run/swim/bike totals, multi-select, per-day "+" that creates an empty EASY workout — **manual building alongside engine generation exists**), `WorkoutDetailPanel` (500 ms debounced autosave PATCH: customName, type, phase, description, distance/duration, targetPace zone dropdown + PaceZoneSlider, targetHrZone 1–5, color, notes, structuredSteps editor, delete), `MassEditToolbar` (Delete/Move/ChangeType/Scale/Template + shortcuts), `AiChatPanel` (premium, parses ```workout JSON blocks), `AnalysisView`, `EventsPanel`/`GoalTimeline`, `ProgressionBuilder`. `MiniCalendar` is month-navigation only; `components/Calendar/CalendarWeek.tsx` is **unused**; `WorkoutListPanel.tsx:34` has a vestigial `dragId` state + `GripVertical` icon (L158) with no DndContext — drag/drop in plan-advanced was started and abandoned. **Copy/paste of workouts or weeks: missing everywhere.**

**Engine.** Stateless generator `generateTrainingPlan(config): GeneratedWorkout[]` at `Web/src/lib/plans/index.ts:348` (imports only Prisma enums + `calculateTrainingPaces` + HR zones — no prisma client). Internal `Phase = 'BASE'|'BUILD'|'PEAK'|'TAPER'|'RACE_WEEK'` (L320); per-workout `targetPace` sec/km + `intensityZone` + `structuredSteps`. Generators: standard (L378), ultra (`lib/plans/generators/run-ultra.ts`), triathlon (`generators/triathlon.ts`), no-race. `RaceType` enum has 17 values incl. `FIFTY_K, FIFTY_MILE, HUNDRED_K, HUNDRED_MILE, TWELVE_HOUR, TWENTY_FOUR_HOUR, BACKYARD_ULTRA, CUSTOM_DISTANCE, SPRINT_TRI, OLYMPIC_TRI, HALF_IRONMAN, FULL_IRONMAN, CUSTOM_TRI` (schema.prisma:954). **`Web/src/lib/services/plan-creation.ts` (1108 lines) is the DB-writing wrapper** (creates Goal/Workout rows L928/L978) — not stateless; `currentVdot` now comes from `bestEffortVdot` (commit `001b8b49` — exclusion zone).

**Storage.** Prisma `Goal` + `Workout` (schema.prisma:558–600). Key Workout fields: `scheduledDate, workoutType, description, phase, order, notes, targetDistance (m), targetDuration (s), targetPace, targetHrZone(+Label), targetHrMinBpm/MaxBpm, targetPaceZoneLabel, targetPaceMin/MaxSecondsPerKm, isCompleted, completedAt, customName, color, structuredSteps Json, groupId, subGoalId, sport @default("RUN"), displayDesc, intensityZone, plannedTss, linkedActivityId`. **No `status` field (it's `isCompleted`); single `notes` (no coach/athlete split); no power target fields.** `PlanSnapshot` (schema.prisma:1202–1212: `snapshot Json, description?, operation?`, last 50 per goal) with `createSnapshot`/`restoreFromSnapshot` (`Web/src/lib/plan/snapshot.ts`) + web undo — **Android has its own separate Room `plan_snapshots` undo that never shares state with the server's.**

**Viewing (web `/plan`).** Week list grouped by Monday (`plan/page.tsx:204-241`), week header phase badge + planned-vs-actual km, dnd-kit `DraggableWorkout`/`DroppableDay` drag-between-days → `PATCH /api/workouts/reorder` (L52-57, L121-140), per-workout `EditWorkoutModal` (**coarse only**: type/date/description/distance/duration/completed/linkedActivity — no structuredSteps, no pace; payload L125-134), per-day Add, Export-PDF, Delete Plan, scroll-to-today.

**Structured workout editor (web).** `components/Editor/StructuredWorkoutEditor.tsx`: warmup/cooldown `{distance m, pace letter}` + main rows `{reps, distance m, restSeconds, pace letter}` with PaceZoneSlider (E–R from VDOT), live total distance, defaults 4×400 m @ I / 90 s (L25-29). **Letters only — no custom pace values, no time-based steps, no nested repeat groups, no per-step notes.** Reachable only from `WorkoutDetailPanel.tsx:373-383`, gated to INTERVALS/REPETITION/TEMPO/FARTLEK. Not reachable from `/plan`.

**Android.** Room entities (`AppDatabase.kt:67-137`), Kotlin DTOs (`data/net/Api.kt:231-453`), mappers with lossy folds (`PlanMappers.kt`), and **hand-ported TS generators** (`WebPlanEngine.kt`, `WebPlanTriathlon.kt`, `WebPlanNoRace.kt`, `WebPlanUltra.kt` — header: "Port of Web/src/lib/plans/generators/triathlon.ts") used to seed device-created plans then uploaded via `POST /api/plans/import`. `PlanScreen.kt`: week-grouped list, action sheet (Start guided / Mark complete / **Edit targets** (description, km, pace `parsePace` L690-698) / **Edit intervals** (→ `StructuredEditorScreen`, a full mirror of the web builder) / shift ±1 day / delete), add-workout dialog auto-seeding structured steps, local undo, race-result dialog recalibrating `vdotCorrection`.

## 2. Guided running — the verdict (the original question)

**Guided workouts EXIST and are complete at the core** — this is not a missing feature:

- `recording/RecordingController.kt` — step state machine (`RecStatus` L20; `StepRuntime` L28-35: label, kind warmup/main/recovery/cooldown/"repeat", durationType TIME|DISTANCE, durationSec, distanceM, targetPaceSecPerKm; `RecordingState` L56-86), **auto-advance** `advanceSteps` (L329-380) with StepSplit recording and 3-2-1 voice cue in the last 3 s of TIME steps (L373-378, L424-428), 30 s rolling pace (L266-270), auto-pause (L274-283), pace warning after 20 s out of zone (L286-295), auto km-laps (L311-321), fallback step synthesis from distance/duration when no structuredSteps (L431-447, 15 %/75-100 %/10 % split, pace ×1.15/×1.12).
- `recording/RecordingService.kt` — foreground service, GPS @1 Hz (L145-173), **TextToSpeech voice coach** (L214-242: countdown, "Go!", km splits with pace, step start/end cues, pace warnings, auto-pause), step resolution via `StructuredStepsParser.parse(structuredStepsJson, paceLetterTable(vdot))` (L135-143; VDOT chain `goal.vdotAtCreation` → threshold-inverted → 50.0). **Always saves `type="RUN"` (L319).**
- `ui/screens/RecordScreen.kt` — hero pace, `PaceZoneIndicator` TOO_FAST/IN_ZONE/TOO_SLOW (L619-661), active-step card with progress + remaining chip (L453-512), upcoming steps (L579-584). Wired from Dashboard + PlanScreen via `pendingWorkoutId` (`RunFlowRoot.kt:200-221`).
- `StructuredStepsParser.kt` — parses both legacy shapes (flat v1 L53-74, nested builder L78-111 with reps expanded inline and rest injected as TIME recovery steps; pace letters E/M/T/I/R resolved via `paceLetterTable(vdot)` L163-172).

**The gaps that matter (all confirmed MISSING):**
1. **Per-step targets are display-only — the zone badge and voice warnings evaluate against the WORKOUT-level target**, not the active step's (`PaceZoneEvaluator` used at `RecordingController.kt:85` and `:286` compares `s.targetPaceSecPerKm`). The single most impactful guided-running fix.
2. **No target ranges** — `targetPaceMin/MaxSecondsPerKm` exist in Room (`AppDatabase.kt` v5 block ~L127-129) but no consumer in recording; `PaceZoneEvaluator` is ±10 % around one value (`Enums.kt:101-111`).
3. **HR guided steps impossible** — generator emits `hrZone` on steps (`WebPlanEnrichment.kt:288,309,330`) but `parseFlatStep` drops it; no BLE HR input path during recording (`currentHr` never populated).
4. **Nested repeats flattened** — reps expanded, no set-level rest structure, `"repeat"` kind never produced.
5. **No lap-button steps**, no manual step skip/extend.
6. No haptics (zero matches in app); TTS strings English-hardcoded.
7. **Multi-sport recording impossible** (always RUN); nested-builder main steps are distance-only.
8. Fields the recorder never reads: `targetHrZone`, `targetHrMinBpm/MaxBpm`, `targetPaceMin/MaxSecPerKm`, `customName`, `notes`.

## 3. structuredSteps — three shapes, two parsers, one orphan

1. **Generator flat v1** (`Web/src/lib/plans/index.ts:311-318`): `{version:1, source:"generated-plan", steps:[{type:"warmup"|"work"|"recovery"|"cooldown"|"steady", name, distanceMeters?, durationSeconds?, paceSecondsPerKm?, hrZone?}]}` — `hrZone` ignored by Android.
2. **Builder nested** (`StructuredWorkoutEditor.tsx:7-28`): `{warmup:{distance,pace}, main:[{reps,distance,pace,restSeconds}], cooldown:{...}}` — pace letters only.
3. **Progression shape** (`progression/apply/route.ts:105-111`): `{type:"warmup"|"main"|"cooldown", description}` — **parsed by nobody**; Android drops every step silently and web's planned-TSS summation (`plannedTss.ts:112-119`, reads `durationSeconds`) yields 0. A third payload with zero consumers.

## 4. App↔web contract drift (condensed)

The contract is maintained **five times by hand**: Prisma schema, Zod `PlanCreateInputSchema` (`plan-creation.ts:47`), Kotlin DTOs (`Api.kt:231-453`), Room entities (`AppDatabase.kt:67-137`), and the Android hand-ported generators. Highlights:

- **Enums**: `PlanSport` = RUN|TRIATHLON (web) vs wire `RUN|TRIATHLON|NO_RACE` (DB folds NO_RACE→RUN, `plan-creation.ts:692`) vs Android mirror + two different re-encodings on upload (`PlanMappers.kt:217` vs `:362`). Android `RaceType` has a `NONE` sentinel web lacks. `PlanPhase` 10 web values vs 6 Android (folded `PlanMappers.kt:73-79`, raw kept in `webPhase`). `WorkoutType` 21 web vs 14 Android — **BRICK displays as "Cross Training" in-app** vs "Brick" on web (`plan/utils.ts:15`, fold at `PlanMappers.kt:62-71`).
- **Units**: plan pace = sec/km for runs, **sec/100m for swims in the SAME columns** (`swim-pace.ts:71-76`; `computeSwimDuration` `plans/index.ts:1712-1721`; Android matches). Room column `targetPaceSecPerKm` **misnamed — holds sec/100m for swims**; `Format.kt:139-149` vs `:157-170` encodes the trap in the parameter names. `docs/PLAN_GENERATION_API.md:384` documents "all sec/km" — wrong for swims. Weekly volume: meters (web) ↔ `weeklyKmGoal` km (Room) with a lossy roundtrip (`PlanMappers.kt:148,373`).
- **Dates/IDs**: JS 0=Sun..6 vs DayOfWeek 1..7; UTC-midnight vs epoch-local-midnight re-anchoring in mappers; temp device IDs remapped on upload via `idMap`.
- **One-way columns (in DTO for neither)**: `sport, intensityZone, plannedTss, groupId, subGoalId, color, notes, targetHrZoneLabel, targetPaceZoneLabel, intervalProgressionId` — 10 Workout columns invisible to Android; **`plannedTss` has no writer anywhere** (dead column).
- **Invisible features**: sub-goals/multi-goal, `priority`, soft-delete (`deletedAt` — Android hard-DELETEs via `/api/mobile/v1/goals/{id}`, deleted plans can resurrect depending on sync authority), `predictedTime`, `marathonShapeFactor`.
- **`displayDesc`** dropped on Android; re-composed by heuristic `composeDescription` (`PlanMappers.kt:90-106`) with self-healing for a poisoned legacy join format — the contract already drifted once.
- **Auth asymmetries**: `plan-advanced/[goalId]/workouts/[workoutId]` PATCH+DELETE and `undo`/`snapshot` are session-only (`auth()`) while Android calls the DELETE — **JWT alone 401s**; every other Android write uses JWT routes. Mobile PATCH accepts HR/pace ranges but not phase/order/notes/color/groupId/subGoalId/linkedActivityId; plan-advanced PATCH accepts those but **not** `targetHrMinBpm/MaxBpm/targetPaceMin/MaxSecondsPerKm` (whitelists at `workouts/[workoutId]/route.ts:49` vs `mobile/v1/workouts/[id]/route.ts:56-100`) — **no single route can edit a full Workout row**.
- **Completion adaptation asymmetry**: only the plan-advanced editor PATCH triggers `adaptPlanAfterCompletion` (`workouts/[workoutId]/route.ts:109-111`); mobile PATCH and `/api/workouts/[id]` do not → app-completed workouts leave the plan stale.

## 5. Bugs for the bug-fix run (separate agent — exclusion zone applies)

1. **Swim durations 10× too short after adaptation** — `recalculate-paces.ts:150-157` raw SQL `targetDuration = ROUND((targetDistance/1000.0)*targetPace)` assumes sec/km for ALL workouts; for triathlon swims (targetPace is sec/100m) a 1500 m @120 s/100m gets 180 s instead of 1800 s. Reachable via `recalculateWorkoutPaces` ← `lib/plans/adapt.ts:31` (every completion-triggered adaptation of a triathlon plan).
2. **Android workout delete breaks with JWT-only auth** — session-only route used by the app (see §4).
3. **App completions never adapt the plan** (see §4).
4. **Progression structuredSteps shape parsed by nobody** — silent data loss on Android, TSS=0 on web (see §3).
5. **Android inline editor sport-blind for swims** — `PlanScreen.kt:638-662` edits "Pace (m:ss)" with no unit label; SWIM rows show/save sec/100m as if min/km (card view at `:515` is sport-aware — dialog contradicts it).
6. **`PaceZoneEvaluator` unit trap** — `RecordingController.kt:85,286` compares as sec/km; a swim step target (sec/100m) evaluates against the wrong band.
7. **PATCH whitelist fragmentation** — no route edits the full Workout row (see §4; fix via one shared mutation service both routes call).
8. **Docs drift** — `PLAN_GENERATION_API.md:384` pace-unit claim wrong for swims.

Dead/orphaned inventory (cleanup candidates for the bug run or a hygiene round): pace-profile feature orphaned end-to-end (`PlanPaceProfile` + GET/PUT route + `PaceProfileEditor`/`HrZoneEditor`/`PaceTimeline` zero importers; plan GET includes `paceProfile: true` for nothing); dead web endpoints (`apply-template`, `[goalId]/template`, `workouts/from-template`, `workouts/[workoutId]/zwo` (+`zwo-export.ts` reachable only via it), `planned-fitness`, `snapshot` GET/POST route, `/api/plan/recalculate-paces` route, `/api/workout-templates*`, `/api/workouts/[id]/complete` — whose `adaptPlanAfterCompletion` hook is thereby unreachable); dead mobile endpoints (`GET/POST /api/mobile/v1/goals`, `GET .../goals/{id}`, `PATCH .../workouts/reorder`, `POST .../workouts/{id}/complete`); `GuidedPlanSession` + `PlanCreationMode.GUIDED` model-only; `/api/v1/*` + `/api/latest/*` middleware rewrite with no consumer; `Workout.plannedTss` dead column; `calculateSwimCSS` deprecated dead code (`swim-pace.ts:15-19`); repo has **zero TODO/FIXME comments** — the backlog lived nowhere until this doc.

## 6. MCP readiness audit (Dual-MCP plan vs codebase)

| Assumption in the pasted MCP plan | Verdict |
|---|---|
| `validateApiKey()` + `rf_` keys + Bearer parsing | **CONFIRMED** — `Web/src/lib/api/externalAuth.ts:35,42` (regex `Bearer rf_[a-f0-9]+`), SHA-256 lookup, expiry, `lastUsedAt`; convenience `getExternalApiUser` L88. Caveat: `ApiKey.userId @unique` (schema.prisma:659-671) — **one key per user** |
| `checkPremiumAccess(userId)`, tiers incl. `'isAdmin'` | **PARTIAL** — helper exists (`Web/src/lib/plan/access.ts:15`, passes iff tier2/tier3 or `user.isAdmin`) but is **dead code**; real routes inline the check (`api/plan-advanced/[goalId]/ai-chat/route.ts:22-24`). Tiers are `'none'|'tier1'|'tier2'|'tier3'` (`UserAiSettings.usageTier`, schema.prisma:187; `lib/ai/usage.ts:40-56`); **`isAdmin` is a `User` boolean, not a tier string** |
| Rate limiting; public route at 15/hour/IP | **PARTIAL** — `lib/rateLimit.ts` solid (in-memory sliding-window LRU + Redis fixed-window with automatic fallback, `getClientIdentifier` L221 with trusted-proxy logic, `withRateLimit` L279); `/api/public/plan/generate` exists but the limit is **10/hour/IP** (`route.ts:9-13`); `/api/public/plan/export` (csv\|html) has its own |
| MCP scaffolding exists | **MISSING** — nothing under `Web/src/app/api`; build from scratch. Templates: `/api/external/v1/*` (key auth + CORS + rate limit) and `/api/public/plan/generate` (stateless gen + IP limit) |
| Stateless plan engine | **CONFIRMED with correction** — use `@/lib/plans` `generateTrainingPlan` (pure); **`services/plan-creation.ts` writes to the DB**. The public route's zod accepts only 12 of 17 race types (excludes TWELVE_HOUR/TWENTY_FOUR_HOUR/BACKYARD_ULTRA/CUSTOM_DISTANCE/CUSTOM_TRI) |
| VDOT math standalone | **CONFIRMED** — `lib/metrics/vdot.ts` (calculateVdot L49, predictRaceTime L83, calculateTrainingPaces L137 → easy range/marathon/threshold/interval/repetition in sec/km) |
| Banister CTL/ATL/TSB + recompute | **CONFIRMED** — `DailyFitness` (ctl/atl/tsb/ctlRunning/trimp/runningTss, schema.prisma:396-410); `lib/metrics/fitness.ts` `calculateFitnessHistory` pure; `lib/metrics/fitnessCache.ts` incremental `updateFitnessCache` L47 / `getCachedFitnessHistory` L242; full recompute is admin-gated only (`POST /api/admin/recalculate-fitness`) — no user-facing recompute-from-date |
| PlanSnapshot + undo | **CONFIRMED** — with `operation` field and web restore; retains last 50 per goal |
| Workout mutation fields | **CONFIRMED with corrections** — `isCompleted` not `status`; single `notes`; HR/pace range columns exist; no power targets |
| Readiness/health | **CONFIRMED** — `DailyReadinessRecord` (compositeScore, rhrJson, sleepJson, hrvJson, schema.prisma:1110) + `/api/health/readiness/*` + `/api/mobile/v1/readiness/*` |
| Strava fields to scrub | **PARTIAL** — Activity has `stravaId`, **`name`** (not "title"), `description`, `rawJson Json?`, `streams Json?`; **no polyline/segment columns** (would only live inside rawJson). Derivatives: `trimp, runningTss, estimatedVdot, hrZone1..7Time` |
| CORS wildcard `*` | **CORRECTED** — repo pattern is `lib/security/cors.ts` **allowlist** from `EXTERNAL_API_ALLOWED_ORIGINS` (all five `/api/external/v1/*` routes export OPTIONS with `validateOrigin`+`setCorsHeaders`); replicate that, not a wildcard |
| SSE support | **OPTIONAL** — stateless JSON-RPC POST is enough; SSE pattern exists in `api/ai/chat/route.ts:213,535` if ever needed |
| Runtime | All routes default to Node runtime (none declare `export const runtime`); `maxDuration` used where relevant |
| Redis | Optional (`lib/redis.ts` returns null gracefully; docker-compose has redis:7-alpine) — limiter must tolerate in-memory fallback locally |
| Tests | **CONFIRMED** — jest 29, `--testPathPattern` valid; route-test pattern: per-file `/** @jest-environment node */` docblock, `jest.mock('@/lib/plans')`, call exported `POST` with `new NextRequest(...)` (see `api/public/plan/generate/__tests__/route.test.ts`) |

## 7. Cycling power — known today, to be mapped (task C0)

Known: `Activity.averageWatts` + `weightedAverageWatts` columns exist (schema.prisma:309 block); `DailyFitness` has **no bike-specific fields** (only `ctl, atl, tsb, ctlRunning, trimp, runningTss`); `streams Json?` exists on Activity (whether watts streams are fetched is unmapped). Unknown — first task of the cycling workstream: which power fields Strava sync captures (summary vs stream, device vs estimated), any FTP/power-zone/NP/IF/cycling-TSS logic anywhere, how rides contribute to fitness load today, cycling content of the analytics page, and Android watts display. See `docs/plans/2026-10-13-training-planning-round.md`, workstream C.

## 8. Coordination constraints (from the plan-builder run handoff)

- Sibling run `dwfrun-718191f6` landed `f9fdffb6`, `8cedc3b4`, `001b8b49`, `6e7eefe4` and may add `fix: address final review findings`, `fix(web): repair failing tests`, `fix(web): repair production build`.
- **Exclusion zone for every other run**: onboarding step routing, delete-plan UX/endpoints, anything VO2max/VDOT/prediction/marathon-shape, `UserMetricsProvider`, both analytics stats endpoints (`/api/analytics/stats`, `/api/mobile/v1/analytics/stats`), Strava VO2max persistence block in `strava/sync.ts`, Android analytics caching.
- One writer per working tree: sequence runs; never run two code-writing workflows concurrently.
- No local Postgres → **no Prisma migrations**; prefer live-computed metrics and existing columns/JSON; escalate if a migration seems unavoidable.
