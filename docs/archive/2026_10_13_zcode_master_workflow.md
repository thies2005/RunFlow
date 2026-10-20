# RunFlow Z Code (C4AI / Z.ai) Master Implementation Workflow

## Structured Plans & Workouts v2 · Day-to-Day Calendar & Advanced Plan Studio · Deep Cycling Power Analytics · Complete Dual-MCP (`/mcp` & `/mcp/public`)

Date: 2026-10-13 · Base Commit: `56a9a631` · Target: Autonomous Z Code / C4AI Multi-Agent Execution

> **For Z Code / C4AI Orchestrator & Sub-Agents:** This document is a self-contained, step-by-step execution blueprint. Every task specifies exact file paths, Prisma schema definitions, TypeScript/Kotlin interfaces, API contracts, edge-case guards, commit messages, test gates, and reviewer lenses. Execute tasks strictly in sequence (`DB-1` → `BUG-1` → `A1` → `A2` → `A3` → `A4` → `A5` → `C1` → `C2` → `C3` → `B1` → `B2` → `QA-1`). Never run two code-writing sub-agents concurrently on the same working tree.

## 0. Global Architecture Decisions & Binding Constraints

### 0.1 Product & Architecture Decisions (Locked)

1. **First-Class Database Columns (Prisma + Android Room Migrations Enabled)**:
   * Both PostgreSQL (`Web/prisma/schema.prisma`) and Android Room (`AppDatabase.kt` `v12 → v13`) are upgraded with dedicated, typed columns for workout targets (power watts min/max/target, %FTP, cadence, RPE, pace min/max, HR min/max/zone, planned TSS, intensity zone, sport), training plan structure (`phaseBlocks` JSON timeline, `ftpAtCreation`, `swimCssAtCreation`, per-sport weekly volume & TSS targets), athlete thresholds (`ftpWatts`, `autoEstimateFtp`, `swimCssSecPer100m`), ride power metrics (`maxWatts`, `kilojoules`, `npWatts`, `intensityFactor`, `variabilityIndex`, `bikeTss`, `efficiencyFactor`, `aerobicDecoupling`, `powerZone1Time..7Time`), split fitness load (`bikeTss`, `ctlBike`, `atlBike`, `tsbBike` on `DailyFitness`), and MCP OAuth 2.1 models (`McpOAuthClient`, `McpOAuthCode`, `McpOAuthToken`).

2. **Full v2 `structuredSteps` + Numeric Target Fields Across All Sports**:
   * Workouts are no longer driven by free-text descriptions. Every generated or edited workout across **Run**, **Bike (`RIDE`, `LONG_RIDE`, `RIDE_INTERVALS`)**, **Swim (`SWIM`, `SWIM_DRILL`, `OPEN_WATER_SWIM`)**, **Brick (`BRICK`)**, and **Strength (`STRENGTH`)** carries a canonical `StructuredWorkoutV2` step tree in `Workout.structuredSteps` plus populated numeric target columns on `Workout`. `description` and `displayDesc` become human-readable summaries derived from the structured fields.

3. **Retire `/plan` → Clean, Uncluttered Day-to-Day `/calendar` + Powerhouse `/plan-advanced/[goalId]`**:
   * The legacy `/plan` page is retired (redirecting `/plan` → `/calendar`) and all navigation tabs (including mobile swipe navigation) route to `/calendar`.
   * **Strict Visual Discipline on `/calendar` (`CalendarView.tsx`, `WeeklyView.tsx`, `MonthlyView.tsx`, `SummaryStats.tsx`)**:
     * Preserve the existing compact Race-Timing / Runalyze design language (`rounded-md border border-line bg-background-secondary`, `divide-y divide-glass-border`, `colorsFor(type)` pills, `trimpFillBg` load shading, `font-mono` numeric tokens, and the 7-card `SummaryStats` strip).
     * **Never overload day rows or month cells**: each activity or planned workout pill displays **at most 3–4 compact data points** — Name, Distance/Duration, **one** sport-appropriate primary target/effort metric (Pace for Run, `/100m` for Swim, Watts/NP for Bike), and Load (`TRIMP` or `TSS`).
     * All detailed step trees, intensity bars, and notes stay out of the calendar grid and appear **only on click** inside a clean slide-over drawer (`CalendarWorkoutDetailDrawer.tsx` for planned workouts; existing `ActivityDetailsModal.tsx` for completed activities). Heavy editing lives exclusively in `/plan-advanced/[goalId]`.
   * `/plan-advanced/[goalId]` is the all-in-one Training Plan Studio: generate or regenerate plans with the engine, edit plan-level `phaseBlocks` and weekly TSS/volume targets, adapt workouts with a live **Planned vs. Actual TSS / CTL / ATL / TSB Projection Chart**, drag-and-drop workouts across days/orders, copy/paste weeks with VDOT/FTP scaling, build multi-week interval progressions (run pace or bike watts), and edit full v2 structured workouts.

4. **Deep Cycling Power Analytics (Full Suite on Web, Streamlined Cycling Tab on Android)**:
   * **Web (`/analytics` & `ActivityDetailsModal`)**: Sport switcher (`Combined | Running | Cycling`) with Split & Combined PMC (`Total Load`, `Running Load`, `Cycling Load`), Mean Maximal Power (`MMP`) / Power Duration Curve (`5s`, `15s`, `30s`, `1m`, `5m`, `20m`, `60m` in Watts and `W/kg`), automatic `eFTP` estimation + manual FTP setting, Normalized Power (`NP`), Intensity Factor (`IF`), Variability Index (`VI`), Cycling `TSS`, 7-Zone Coggan time-in-zone stacked charts, and Aerobic Efficiency (`EF = NP / Avg HR` + `Pw:Hr` aerobic decoupling).
   * **Android (`AnalyticsScreen.kt`, `ActivityDetailScreen.kt`, `AthleteScreen.kt`)**: A dedicated **Cycling** tab on `AnalyticsScreen.kt` with lower-spec, fast mobile summaries (FTP & `W/kg` tile, Cycling CTL/ATL/TSB bars & chart, weekly bike km/TSS bars, recent ride NP sparkline, and 7-zone distribution), plus ride power summary cards on `ActivityDetailScreen.kt` and FTP editing on `AthleteScreen.kt`.

5. **Complete Dual-MCP Ecosystem at `/mcp` and `/mcp/public` (Claude Desktop/Web & Gemini Custom MCP Compatible)**:
   * **Top-level endpoints**: `/mcp/public` (stateless public PlanGen MCP, 10 req/hr/IP) and `/mcp` (private Paid-Premium Coaching & Full-Access MCP, 60 req/min/user).
   * **Direct Domain Login via OAuth 2.1 + PKCE + Dynamic Client Registration**: Entering `https://runflow.schuelken.uk/mcp` into Claude Desktop, Claude Web, or Gemini Custom MCP automatically discovers `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`, dynamically registers the client (`/mcp/oauth/register`), authenticates the user in the browser (`/mcp/oauth/authorize`), verifies **Paid Premium access (`usageTier ∈ {'tier2', 'tier3'}` or `user.isAdmin === true`)**, and issues OAuth 2.1 Bearer tokens (`/mcp/oauth/token`). Headless `Authorization: Bearer rf_...` API keys also remain supported with the same Paid Premium gate.
   * **Strava API Compliance**: On `/mcp`, any activity synced from Strava (`stravaId != null`) MUST omit raw Strava-restricted fields (`name`, `description`, `rawJson`, and raw `streams`/`laps` GPS/sensor arrays), returning all RunFlow-computed metrics (distance, movingTime, HR, watts, NP, IF, VI, EF, decoupling, rTSS, bikeTSS, TRIMP, VDOT, HR/power zone times) alongside an explicit `stravaComplianceNotice` instructing the assistant to use the official Strava MCP server for raw Strava telemetry or titles.

### 0.2 Exclusion Zone (Do Not Edit)

Unless a task explicitly states otherwise, sub-agents MUST NOT modify:
* VO2max / VDOT core math formulas in `Web/src/lib/metrics/vdot.ts` or `effectiveVdot.ts` (consuming exported functions is allowed).
* `UserMetricsProvider.tsx` and the existing running stats endpoints `/api/analytics/stats` and `/api/mobile/v1/analytics/stats` (add cycling analytics via `/api/analytics/cycling` and `/api/mobile/v1/analytics/cycling` instead).
* Strava VO2max persistence block in `Web/src/lib/strava/sync.ts`.

### 0.3 Z Code Check Gates & Sub-Agent Loop

Every task MUST pass its designated check gate before the Orchestrator advances to the next task:
* **`pg-gate` (Database & Prisma)**:
  ```bash
  docker start runflow-dev-pg || true
  cd Web && npx prisma validate && npx prisma db push && npx prisma generate
  ```
* **`web-gate` (Backend / Lib / API / MCP)**:
  ```bash
  cd Web && npm test -- --passWithNoTests
  ```
* **`web-ui-gate` (Web Pages & Components)**:
  ```bash
  cd Web && npm test -- --passWithNoTests && npm run build
  ```
* **`android-gate` (Android Kotlin / Compose / Room)**:
  ```bash
  cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain
  ```
* **Git Hygiene**: Never run `git add -A` or `git add .`. Stage only the exact files listed in the task's `Files:` block. Never push or tag unless instructed at the end of the workflow.

## Phase 1: Database Schema Migration & Core Bug Hardening

### Task `DB-1` — `feat(db): add structured workout/plan fields, cycling power columns, and MCP OAuth models`

* **Gate**: `pg-gate` + `web-gate`
* **Reviewer Lenses**: `architecture`, `security`
* **Files**:
  * Modify: `Web/prisma/schema.prisma`

#### Step-by-Step Instructions for Sub-Agent:

1. Open `Web/prisma/schema.prisma` and add the following fields to `model User` (around line 45):
   ```prisma
   ftpWatts                  Int?
   autoEstimateFtp           Boolean              @default(true)
   swimCssSecPer100m         Int?
   mcpOAuthCodes             McpOAuthCode[]
   mcpOAuthTokens            McpOAuthToken[]
   ```
2. In `model Activity` (around line 346), add cycling power & efficiency columns alongside existing `averageWatts`, `weightedAverageWatts`, `deviceWatts`:
   ```prisma
   maxWatts             Float?
   kilojoules           Float?
   npWatts              Float?
   intensityFactor      Float?
   variabilityIndex     Float?
   bikeTss              Float?
   efficiencyFactor     Float?
   aerobicDecoupling    Float?
   powerZone1Time       Int?
   powerZone2Time       Int?
   powerZone3Time       Int?
   powerZone4Time       Int?
   powerZone5Time       Int?
   powerZone6Time       Int?
   powerZone7Time       Int?
   ```
3. In `model DailyFitness` (around line 405), add cycling load columns:
   ```prisma
   bikeTss    Float    @default(0)
   ctlBike    Float    @default(0)
   atlBike    Float    @default(0)
   tsbBike    Float    @default(0)
   ```
4. In `model Goal` (around line 520), add structured plan-level fields:
   ```prisma
   ftpAtCreation         Int?
   swimCssAtCreation     Int?
   weeklyBikeTssGoal     Float?
   weeklySwimMetersGoal  Float?
   targetWeeklyTss       Float?
   phaseBlocks           Json?
   ```
5. In `model Workout` (around line 576), add first-class power, cadence, and RPE target columns:
   ```prisma
   targetPowerWatts          Int?
   targetPowerMinWatts       Int?
   targetPowerMaxWatts       Int?
   targetPowerZone           Int?
   targetFtpPercent          Int?
   targetCadenceRpm          Int?
   targetRpe                 Int?
   ```
6. At the bottom of `Web/prisma/schema.prisma`, add the OAuth 2.1 Dynamic Client Registration + PKCE models for `/mcp`:
   ```prisma
   model McpOAuthClient {
     id                      String          @id @default(cuid())
     clientId                String          @unique @default(cuid())
     clientSecretHash        String?
     clientName              String
     redirectUris            Json
     grantTypes              Json            @default("[\"authorization_code\",\"refresh_token\"]")
     responseTypes           Json            @default("[\"code\"]")
     tokenEndpointAuthMethod String          @default("none")
     createdAt               DateTime        @default(now())
     codes                   McpOAuthCode[]
     tokens                  McpOAuthToken[]
   }

   model McpOAuthCode {
     id                  String         @id @default(cuid())
     codeHash            String         @unique
     clientId            String
     userId              String
     redirectUri         String
     codeChallenge       String
     codeChallengeMethod String         @default("S256")
     scope               String         @default("mcp:full")
     resource            String?
     expiresAt           DateTime
     usedAt              DateTime?
     createdAt           DateTime       @default(now())
     client              McpOAuthClient @relation(fields: [clientId], references: [clientId], onDelete: Cascade)
     user                User           @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId])
   }

   model McpOAuthToken {
     id               String         @id @default(cuid())
     accessTokenHash  String         @unique
     refreshTokenHash String?        @unique
     clientId         String
     userId           String
     scope            String         @default("mcp:full")
     expiresAt        DateTime
     refreshExpiresAt DateTime?
     revokedAt        DateTime?
     lastUsedAt       DateTime?
     createdAt        DateTime       @default(now())
     client           McpOAuthClient @relation(fields: [clientId], references: [clientId], onDelete: Cascade)
     user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId])
     @@index([accessTokenHash])
   }
   ```
7. Run `npx prisma validate`, `npx prisma db push` (or `npx prisma migrate dev --name structured_v2_cycling_mcp_oauth` if `runflow-dev-pg` is running), and `npx prisma generate` so `Web/src/generated/prisma` is regenerated.
8. Commit with `feat(db): add structured workout/plan fields, cycling power columns, and MCP OAuth models`.

### Task `BUG-1` — `fix(web): harden snapshot undo, swim duration math, workout PATCH whitelists, and sport persistence`

* **Gate**: `web-gate`
* **Reviewer Lenses**: `functionality`, `security`
* **Files**:
  * Modify: `Web/src/lib/plan/snapshot.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/snapshot/route.ts`
  * Modify: `Web/src/lib/services/plan-creation.ts`
  * Modify: `Web/src/lib/plans/recalculate-paces.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/workouts/[id]/route.ts`
  * Modify: `Web/src/app/api/workouts/[id]/route.ts`
  * Modify: `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`

#### Step-by-Step Instructions for Sub-Agent:

1. **Fix `Web/src/lib/plan/snapshot.ts` (Data-Wipe & Completion Loss Bug)**:
   * In `createSnapshot` (`snapshot.ts:8-46`):
     * Include **all** `Workout` fields in the serialized snapshot array: `id`, `scheduledDate`, `workoutType`, `description`, `displayDesc`, `phase`, `order`, `notes`, `targetDistance`, `targetDuration`, `targetPace`, `targetPaceMinSecondsPerKm`, `targetPaceMaxSecondsPerKm`, `targetPaceZoneLabel`, `targetHrZone`, `targetHrMinBpm`, `targetHrMaxBpm`, `targetHrZoneLabel`, `targetPowerWatts`, `targetPowerMinWatts`, `targetPowerMaxWatts`, `targetPowerZone`, `targetFtpPercent`, `targetCadenceRpm`, `targetRpe`, `intensityZone`, `plannedTss`, `sport`, `isCompleted`, `completedAt`, `linkedActivityId`, `customName`, `color`, `structuredSteps`, `groupId`, `subGoalId`, `intervalProgressionId`.
     * When counting and pruning snapshots over 50 (`snapshot.ts:28-46`), add `where: { goalId, OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }] }` so coaching summaries are never counted or evicted by undo snapshots.
   * In `restoreFromSnapshot` (`snapshot.ts:59-97`):
     * When `snapshotId` is not provided, query `prisma.planSnapshot.findFirst({ where: { goalId, OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }] }, orderBy: { createdAt: 'desc' } })`. Also guard `if (!Array.isArray(snapshot.snapshot)) return false;` BEFORE running `tx.workout.deleteMany({ where: { goalId } })`!
     * Restore all fields captured above (including `id` if present, `isCompleted`, `completedAt`, `linkedActivityId`, range columns, power columns, and `sport`).
   * Also update `GET /api/plan-advanced/[goalId]/snapshot/route.ts` to filter `OR: [{ operation: null }, { operation: { not: 'coaching_summary' } }]`.
2. **Fix `Web/src/lib/services/plan-creation.ts:260-289` (`Workout.sport` Persistence)**:
   * In `mapWorkoutsForDb`, explicitly set `sport: w.sport ?? inferSport(w.type)` (using `inferSport` from `@/lib/plans/descriptions`) and map all new numeric target fields (`targetPowerWatts`, `targetPowerMinWatts`, `targetPowerMaxWatts`, `targetPowerZone`, `targetFtpPercent`, `targetCadenceRpm`, `targetRpe`, `plannedTss`).
3. **Fix Swim Duration 10× Bug in `Web/src/lib/plans/recalculate-paces.ts:150-157` and `Web/src/app/api/mobile/v1/workouts/[id]/route.ts:36-50`**:
   * In `recalculate-paces.ts:150-157`, update the SQL `targetDuration` recalculation to check `CASE WHEN "workoutType" IN ('SWIM', 'SWIM_DRILL', 'OPEN_WATER_SWIM') THEN ROUND(("targetDistance" / 100.0) * "targetPace")::int ELSE ROUND(("targetDistance" / 1000.0) * "targetPace")::int END`.
   * In `Web/src/app/api/mobile/v1/workouts/[id]/route.ts:36-50`, pass `workoutType: body.workoutType ?? workout.workoutType` into both `deriveMissingField` and `checkFieldConsistency`.
4. **Unify Auth, PATCH Whitelists, and `adaptPlanAfterCompletion` Across All 3 Workout PATCH Routes**:
   * In `Web/src/app/api/plan-advanced/[goalId]/workouts/[workoutId]/route.ts:16`, replace `auth()` with `getAuthenticatedUser(req)` (matching `DELETE` at line 129).
   * Across `plan-advanced/[goalId]/workouts/[workoutId]/route.ts`, `mobile/v1/workouts/[id]/route.ts`, and `workouts/[id]/route.ts`:
     * Allow the complete unified field whitelist (`scheduledDate`, `workoutType`, `description`, `displayDesc`, `phase`, `order`, `notes`, `targetDistance`, `targetDuration`, `targetPace`, `targetPaceMinSecondsPerKm`, `targetPaceMaxSecondsPerKm`, `targetPaceZoneLabel`, `targetHrZone`, `targetHrMinBpm`, `targetHrMaxBpm`, `targetHrZoneLabel`, `targetPowerWatts`, `targetPowerMinWatts`, `targetPowerMaxWatts`, `targetPowerZone`, `targetFtpPercent`, `targetCadenceRpm`, `targetRpe`, `intensityZone`, `plannedTss`, `sport`, `isCompleted`, `completedAt`, `linkedActivityId`, `customName`, `color`, `structuredSteps`, `groupId`, `subGoalId`).
     * Trigger `adaptPlanAfterCompletion(workout.goalId, workout.id)` whenever `isCompleted` transitions `false → true` on any of the three routes.
   * In `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx:79,354`, replace `colorOverride` with `color`.
5. Add unit tests for `snapshot.ts` (verifying `isCompleted`, `linkedActivityId`, and `targetPowerMinWatts` survive a snapshot round-trip and `coaching_summary` rows are ignored by `restoreFromSnapshot`) and `recalculate-paces.ts` swim duration math. Commit with `fix(web): harden snapshot undo, swim duration math, workout PATCH whitelists, and sport persistence`.

## Phase 2: Structured Workout Schema v2 & Multi-Sport Engine Generation

### Task `A1` — `feat(web): structured workout schema v2 — ranges, nested repeats, lap press, power & cadence targets`

* **Gate**: `web-gate`
* **Reviewer Lenses**: `functionality`, `security`
* **Files**:
  * Create: `Web/src/lib/plans/structured.ts`
  * Create: `Web/src/lib/plans/__tests__/structured.test.ts`

#### Step-by-Step Instructions for Sub-Agent:

1. Create `Web/src/lib/plans/structured.ts` implementing the canonical `StructuredWorkoutV2` model, Zod schemas, legacy parser, flattener, and pace/power unit utilities:
   ```ts
   export interface StructuredWorkoutV2 {
       version: 2;
       source: 'engine' | 'builder' | 'editor' | 'progression' | 'template' | 'mcp';
       steps: StepNode[];
   }

   export type StepNode = StructuredStep | RepeatGroup;

   export interface RepeatGroup {
       kind: 'repeat';
       times: number;            // 1..100
       setRest?: Duration;       // rest between iterations (not after the last iteration)
       steps: StepNode[];        // nestable up to depth 3
       label?: string;
   }

   export interface StructuredStep {
       kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'steady' | 'transition';
       label?: string;
       note?: string;
       duration: Duration;
       target?: Target;
       /** Optional secondary HR zone (1..6) when primary target is pace or power */
       hrZone?: number;
       /** Optional cadence target in RPM (bike) or SPM (run/swim) */
       cadenceRpm?: number;
   }

   export type Duration =
       | { type: 'time'; seconds: number }       // 1..86400
       | { type: 'distance'; meters: number }    // 1..100000
       | { type: 'lap_press' };

   export type Target =
       | { type: 'pace';  unit: 'sec_per_km' | 'sec_per_100m'; min?: number; max?: number; zoneLabel?: string }
       | { type: 'hr';    zone?: number; minBpm?: number; maxBpm?: number }
       | { type: 'power'; minWatts?: number; maxWatts?: number; ftpPercent?: number; zoneLabel?: string }
       | { type: 'rpe';   value: number }
       | { type: 'free' };
   ```
2. Implement `resolveWorkoutSport(workoutType?: string | null, sport?: string | null): 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH'`:
   * Never trust `sport` alone if `workoutType` is a known swim or bike type:
   * `SWIM | SWIM_DRILL | OPEN_WATER_SWIM` → `'SWIM'`
   * `RIDE | LONG_RIDE | RIDE_INTERVALS | BRICK` → `'BIKE'`
   * `STRENGTH | CORE` → `'STRENGTH'`
   * Otherwise fallback to `sport === 'SWIM' || sport === 'BIKE' || sport === 'STRENGTH' ? sport : 'RUN'`.
3. Implement `parseStructuredWorkout(input: unknown, workoutTypeOrSport?: string | null, vdot = 45, ftpWatts = 200): StructuredWorkoutV2 | null` handling all **five** shapes:
   * **Shape 1: Canonical v2 (`version === 2`)** → validate via Zod (strip unknown fields) and return.
   * **Shape 2: Generator flat v1 (`version === 1 && Array.isArray(steps)`)** → map `type` to `kind`, `name` to `label`; apply duration precedence (`distanceMeters > 0` takes precedence over `durationSeconds > 0`, else `lap_press`); if `paceSecondsPerKm > 0`, set `target: { type: 'pace', unit: resolvedSport === 'SWIM' ? 'sec_per_100m' : 'sec_per_km', min: paceSecondsPerKm, max: paceSecondsPerKm }` and preserve `hrZone: step.hrZone`; if only `hrZone` is present, set `target: { type: 'hr', zone: step.hrZone }` and `hrZone: step.hrZone`.
   * **Shape 3: Builder nested / `ProgressionWeekData` (`warmup`, `main` array, `cooldown`)** → map warmup/cooldown (`distance > 0`) to `StructuredStep` with numeric pace resolved from letter (`E|M|T|I|R`) via `calculateTrainingPaces(vdot)`; map each `main` item (`reps`, `distance`, `pace`, `restSeconds`) to a `RepeatGroup` with `times: reps`, `setRest: restSeconds > 0 ? { type: 'time', seconds: restSeconds } : undefined`, and a `work` step.
   * **Shape 4a: Default workout templates array (`Array.isArray(input)` with `distanceM`, `durationS`, `durationM`, or `type === 'repeat'`)** → map `interval → work`, `distanceM → { type: 'distance', meters: distanceM }`, `durationS → { type: 'time', seconds: durationS }`, `durationM → { type: 'time', seconds: durationM * 60 }`, `repeat → RepeatGroup`.
   * **Shape 4b: Legacy progression array (`Array.isArray(input)` with `{ type, description }`)** → map `main → work`, `description → label`, `duration: { type: 'lap_press' }`, `target: { type: 'free' }`.
4. Implement `flattenStructuredWorkout(workout: StructuredWorkoutV2): FlattenedPlayerStep[]` and `summarizeStructuredWorkout(workout: StructuredWorkoutV2, fallbackPaceSec?: number | null, ftpWatts?: number | null)` returning `{ totalDistanceMeters, totalDurationSeconds, estimatedTss, summaryText }`.
5. Write comprehensive Jest unit tests in `Web/src/lib/plans/__tests__/structured.test.ts` covering all 5 shapes, nesting depth > 3 rejection, `times > 100` rejection, `min > max` rejection, and flattening with `setRest`. Commit with `feat(web): structured workout schema v2 — ranges, nested repeats, lap press, power & cadence targets`.

### Task `A2` — `feat(web): multi-sport structured workout & phaseBlock generation + plannedTss & zwo-export v2`

* **Gate**: `web-gate`
* **Reviewer Lenses**: `functionality`, `architecture`
* **Files**:
  * Modify: `Web/src/lib/plans/index.ts`
  * Modify: `Web/src/lib/plans/generators/triathlon.ts`
  * Modify: `Web/src/lib/plans/generators/run-ultra.ts`
  * Modify: `Web/src/lib/services/plan-creation.ts`
  * Modify: `Web/src/lib/metrics/plannedTss.ts`
  * Modify: `Web/src/lib/plans/zwo-export.ts`
  * Modify: `Web/src/app/api/plan-advanced/[goalId]/progression/apply/route.ts`
  * Modify: `Web/src/components/PlanEditor/ProgressionBuilder.tsx`
  * Modify: `Web/src/lib/plans/__tests__/sota-updates.test.ts`
  * Modify: `Web/src/lib/plans/__tests__/zwo-export.test.ts`
  * Modify: `Web/src/lib/metrics/__tests__/plannedTss.test.ts`

#### Step-by-Step Instructions for Sub-Agent:

1. **Emit Canonical v2 `structuredSteps` AND First-Class Numeric Targets Across All Sports (`Web/src/lib/plans/index.ts` & `generators/triathlon.ts`)**:
   * Extend `GeneratedWorkout` (`Web/src/lib/plans/index.ts:328`) with:
     ```ts
     targetPaceMinSecondsPerKm?: number;
     targetPaceMaxSecondsPerKm?: number;
     targetPaceZoneLabel?: string;
     targetHrZone?: number;
     targetHrMinBpm?: number;
     targetHrMaxBpm?: number;
     targetHrZoneLabel?: string;
     targetPowerWatts?: number;
     targetPowerMinWatts?: number;
     targetPowerMaxWatts?: number;
     targetPowerZone?: number;
     targetFtpPercent?: number;
     targetCadenceRpm?: number;
     targetRpe?: number;
     plannedTss?: number;
     structuredSteps?: StructuredWorkoutV2;
     ```
   * Update `buildStructuredStepsForWorkout` (`Web/src/lib/plans/index.ts:1785-2041`) to return `StructuredWorkoutV2`:
     * **Running workouts (`EASY`, `LONG_RUN`, `RECOVERY`, `TEMPO`, `INTERVALS`, `REPETITIONS`, `FARTLEK`, `RACE`)**: keep the exact existing step paces, distances, durations, and `hrZone` numbers wrapped in v2 (`RepeatGroup` for intervals/repeats/fartlek or flat steps where appropriate; ensure `flattenStructuredWorkout` yields the exact same work/recovery sequence) and populate `targetPaceMinSecondsPerKm`, `targetPaceMaxSecondsPerKm`, `targetHrZone`, `targetHrMinBpm`, `targetHrMaxBpm`.
     * **Cycling workouts (`RIDE`, `LONG_RIDE`, `RIDE_INTERVALS`)**: instead of returning `null`, use `calculateBikeZones(ftp)` (`Web/src/lib/plans/bike-zones.ts`) to emit v2 steps with `{ type: 'power', minWatts, maxWatts, ftpPercent, zoneLabel }` + `cadenceRpm` (`85–95` RPM for endurance/tempo, `90–100` RPM for intervals) AND populate `workout.targetPowerWatts`, `workout.targetPowerMinWatts`, `workout.targetPowerMaxWatts`, `workout.targetPowerZone`, `workout.targetFtpPercent`.
     * **Swim workouts (`SWIM`, `SWIM_DRILL`, `OPEN_WATER_SWIM`)**: emit v2 steps (`warmup`, `RepeatGroup` main set in meters with `setRest` 15–30s, `cooldown`) with `{ type: 'pace', unit: 'sec_per_100m', min, max, zoneLabel }` from `calculateSwimPaces(swimCss)`.
     * **Brick workouts (`BRICK`)**: emit a v2 sequence containing a bike steady step (`power` target), a `transition` step (`duration: { type: 'time', seconds: 120 }`, `label: 'T2 Bike-to-Run Transition'`), and a run brick step (`pace` target).
     * **Strength workouts (`STRENGTH`)**: emit warmup + main circuit `RepeatGroup` + mobility cooldown with `rpe` targets (`targetRpe: 6..8`).
2. **Generate Plan-Level `phaseBlocks` & Threshold Snapshots in `plan-creation.ts`**:
   * Build a helper `buildPlanPhaseBlocks(config, workouts): PhaseBlock[]` in `Web/src/lib/plans/index.ts` that outputs explicit structured phase metadata (`phase`, `startWeek`, `endWeek`, `startDate`, `endDate`, `weeklyRunKmTarget`, `weeklyBikeTssTarget`, `weeklySwimMetersTarget`, `targetTss`, `focus`).
   * In `Web/src/lib/services/plan-creation.ts`, save `phaseBlocks`, `ftpAtCreation` (from `user.ftpWatts ?? estimateBikeFtpFromVdot(vdot)`), `swimCssAtCreation`, `weeklyBikeTssGoal`, `weeklySwimMetersGoal`, and per-workout `plannedTss` (computed via `calculateWorkoutPlannedTss`) when creating or regenerating a `Goal`.
3. **Upgrade `Web/src/lib/metrics/plannedTss.ts` & `Web/src/lib/plans/zwo-export.ts` to v2**:
   * In `plannedTss.ts`:
     * Parse `workout.structuredSteps` via `parseStructuredWorkout(workout.structuredSteps, workout.workoutType)`.
     * Recursively sum step durations across `StructuredStep` and `RepeatGroup` (`times * steps + (times - 1) * setRest`). Convert `distance` steps using step pace → fallback to `workout.targetPace` (×1.15 for warmup/cooldown/recovery), respecting `sec_per_100m` for swims and `sec_per_km` for runs. If any step has `duration.type === 'lap_press'` or cannot be converted to seconds, return `null` so `calculateWorkoutPlannedTss` falls back to `workout.targetDuration`.
     * For bike steps or bike workouts with `targetPowerWatts` / `targetFtpPercent` and `ftpWatts`, compute true power-based planned TSS: `(durationSeconds * watts * (watts / ftp)) / (ftp * 3600) * 100`.
   * In `zwo-export.ts`:
     * Parse via `parseStructuredWorkout`, flatten repeat groups (or emit `<IntervalsT>` for single-work-step repeat groups with `setRest`), check `step.target?.type === 'power'` first, then `step.hrZone ?? (step.target?.type === 'hr' ? step.target.zone : undefined)` (preserving Z3=0.82, Z4=0.92, Z5=1.00), then `step.kind`.
4. **Fix `ProgressionBuilder.tsx` & `/api/plan-advanced/[goalId]/progression/apply/route.ts`**:
   * Fix `ProgressionBuilder.tsx:61,88` to call `PUT /api/plan-advanced/${goalId}/progression` (passing `id` in JSON body) and `POST /api/plan-advanced/${goalId}/progression/apply`.
   * Update `progression/apply/route.ts` to accept either `{ progressionId, planStartDate }` or inline `{ workoutType, startWeek, endWeek, weeks, planStartDate }`, convert each `ProgressionWeekData` into canonical v2 `structuredSteps` (`source: 'progression'`), compute numeric `targetDistance`, `targetDuration`, `targetPace`, `plannedTss`, and generate a clean string `description` (fixing the 500 Prisma crash).
5. Update `sota-updates.test.ts`, `zwo-export.test.ts`, and `plannedTss.test.ts`. Commit with `feat(web): multi-sport structured workout & phaseBlock generation + plannedTss & zwo-export v2`.

## Phase 3: Retire `/plan`, Uncluttered Day-to-Day `/calendar`, Powerhouse `/plan-advanced`, & Android v2

### Task `A3` — `feat(web): replace /plan with clean day-to-day /calendar — minimal pills, drag-reschedule, slide-over detail drawer`

* **Gate**: `web-ui-gate`
* **Reviewer Lenses**: `functionality`, `ux`
* **Files**:
  * Modify: `Web/src/app/plan/page.tsx`
  * Modify: `Web/src/app/calendar/page.tsx`
  * Modify: `Web/src/components/views/CalendarView.tsx`
  * Modify: `Web/src/app/calendar-preview/components/WeeklyView.tsx`
  * Modify: `Web/src/app/calendar-preview/components/MonthlyView.tsx`
  * Modify: `Web/src/app/calendar-preview/components/SummaryStats.tsx`
  * Modify: `Web/src/app/calendar-preview/components/metrics.ts`
  * Create: `Web/src/components/Calendar/CalendarWorkoutDetailDrawer.tsx`
  * Modify: `Web/src/components/navigation/MobileSwipeLayout.tsx`
  * Modify: `Web/src/app/mobile-layout.tsx`
  * Modify: `Web/src/app/adaptive-layout.tsx`
  * Modify: `Web/src/components/RaceCountdown.tsx`
  * Modify: `Web/src/components/__tests__/DeepLinkHandler.test.tsx`

#### Step-by-Step Instructions for Sub-Agent:

1. **Retire `/plan` and Unify Navigation on `/calendar`**:
   * Replace `Web/src/app/plan/page.tsx` with a clean redirect to `/calendar` (`redirect('/calendar')` or client `router.replace('/calendar')`).
   * In `Web/src/app/calendar/page.tsx:16-30`, remove the `if (!isLoading && isMobile) router.replace('/plan');` redirect so `/calendar` renders on both mobile and desktop.
   * Update `MobileSwipeLayout.tsx:19,62`, `mobile-layout.tsx:69`, `adaptive-layout.tsx:18`, `RaceCountdown.tsx:206`, and `DeepLinkHandler.test.tsx` so mobile and desktop navigation use `/calendar` (rendering `CalendarView`).
2. **Keep `/calendar` Visually Clean, Uncluttered, and Faithful to Existing Design Tokens (`WeeklyView.tsx`, `MonthlyView.tsx`, `SummaryStats.tsx`)**:
   * **Strict Design & Density Rules (Do NOT Overload the Calendar!)**:
     * Reuse the exact existing styles in `WeeklyView.tsx`, `MonthlyView.tsx`, and `SummaryStats.tsx`: `rounded-md border border-line bg-background-secondary`, `divide-y divide-glass-border`, `colorsFor(type)` (`workoutColors.ts`), `trimpFillBg` daily load shading, `text-[10px]` / `text-xs` labels, and `font-mono` numeric values.
     * Keep `SummaryStats.tsx` to its existing **7 compact top cards** (`Period TRIMP`, `Planned TSS`, `Avg VO₂max`, `Distance`, `Fitness (CTL)`, `Fatigue (ATL)`, `Form (TSB)`) and keep `WeekSummary` in `WeeklyView.tsx:57-89` to its existing single-line header (`TRIMP`, `Distance`, `VO₂`, `CTL`, `ATL`, `TSB`, `Planned`). Do NOT add extra summary rows, charts, or multi-sport tables into the calendar header!
     * **Keep `DayRow` (`WeeklyView.tsx:126-194`) and `DayCell` (`MonthlyView.tsx:96-123`) pills minimal**:
       * **Completed activity pill**: `Check` icon + Name + Distance (or Duration if distance is 0) + **only ONE sport-appropriate effort metric** (`pace` for runs, `npWatts ?? averageWatts` formatted as `215W` for rides, or `/100m` pace for swims) + `TRIMP` (or `bikeTss` for rides).
       * **Planned workout pill**: dashed border (`border border-dashed border-foreground/20`), Workout Name + Target Distance (or Target Duration) + **only ONE primary target chip** (e.g. `4:50/km` for runs, `200-235W` for bike workouts when `targetPowerMinWatts` is set, or `1:55/100m` for swims) + `TSS {plannedTss}`. Never render step lists, notes, or multiple target badges inside the day row!
3. **Add Lightweight Drag-and-Drop Workout Rescheduling on `WeeklyView.tsx` & `MonthlyView.tsx`**:
   * Wrap `CalendarView` in `@dnd-kit/core` `DndContext` so planned workout pills can be dragged cleanly from one day to another (using a subtle `opacity-50` drag state and `ring-1 ring-accent-orange` drop-target highlight on `DayRow` / `DayCell`—no bulky drag handles required).
   * On drop, call `PATCH /api/plan-advanced/${activeGoal.id}/workouts/${workoutId}` with `{ scheduledDate: targetDateIso }` (which creates a `PlanSnapshot` for Undo) and invalidate `['plan-advanced', activeGoal.id]`.
4. **Create Slide-Over `CalendarWorkoutDetailDrawer.tsx` (Details on Click Only)**:
   * Clicking a completed activity pill opens the existing `ActivityDetailsModal`.
   * Clicking a planned workout pill opens `CalendarWorkoutDetailDrawer.tsx` (a clean right-side slide-over sheet on desktop / bottom sheet on mobile using `bg-background-secondary border-l border-line` and `glass-card` sections):
     * Header: Sport & Phase badge (`colorsFor`), Workout Name, Scheduled Date, and a `"Mark Complete"` toggle button.
     * Target strip: 3–4 compact `bg-background-tertiary border border-line rounded-md p-2.5` tiles showing Distance/Duration, Primary Target Range (Pace `min–max /km`, Power `min–max W · %FTP`, or Swim `/100m`), HR Zone (`Z1–Z5`), and `Planned TSS`.
     * Structure preview: compact SVG/CSS **Intensity Bar Profile** (`h-16`) + clean indented v2 step list (`RepeatGroup` header `×N` with `setRest`, step label, duration, target pill, and coach note).
     * Footer actions: primary button **"Open in Advanced Plan Studio"** (`/plan-advanced/${activeGoal.id}?workoutId=${workout.id}`) so all heavy editing stays in `/plan-advanced`.
5. Write Jest tests for calendar metric mapping, minimal pill rendering for Run/Bike/Swim workouts, and `/plan` → `/calendar` navigation updates. Commit with `feat(web): replace /plan with clean day-to-day /calendar — minimal pills, drag-reschedule, slide-over detail drawer`.

### Task `A4` — `feat(web): upgrade /plan-advanced studio — v2 structured editor, engine generator, phaseBlocks, live planned TSS/PMC projection, week copy/paste, drag-and-drop`

* **Gate**: `web-ui-gate`
* **Reviewer Lenses**: `functionality`, `ux`
* **Files**:
  * Modify: `Web/src/components/Editor/StructuredWorkoutEditor.tsx`
  * Modify: `Web/src/app/plan-advanced/[goalId]/page.tsx`
  * Modify: `Web/src/components/PlanEditor/PlanEditorLayout.tsx`
  * Modify: `Web/src/components/PlanEditor/Toolbar.tsx`
  * Modify: `Web/src/components/PlanEditor/WorkoutListPanel.tsx`
  * Modify: `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`
  * Modify: `Web/src/components/PlanEditor/AnalysisView.tsx`
  * Modify: `Web/src/components/PlanEditor/GoalTimeline.tsx`
  * Create: `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
  * Create: `Web/src/app/api/plan-advanced/[goalId]/copy-week/route.ts`
  * Create: `Web/src/components/Editor/__tests__/StructuredWorkoutEditor.test.tsx`

#### Step-by-Step Instructions for Sub-Agent:

1. **Rewrite `Web/src/components/Editor/StructuredWorkoutEditor.tsx` on Schema v2**:
   * Parse incoming `value` via `parseStructuredWorkout(value, workoutType, vdot, ftpWatts)` so opening any engine-generated v1/v2 or legacy workout never crashes.
   * Support adding, editing, duplicating, deleting, and reordering steps and **nested `RepeatGroup` blocks** (up to depth 3, `times` 1..100, configurable `setRest` duration).
   * Per-step editors:
     * `kind`: `warmup | work | recovery | cooldown | steady | transition`
     * `duration`: `distance` (meters/km), `time` (`mm:ss` / `hh:mm:ss`), or `lap_press` ("Lap Button Press")
     * `target`:
       * `pace` range (`min`–`max` in `min/km` for Run or `min/100m` for Swim using `resolveWorkoutSport(workoutType, sport)`), with quick-fill zone chips (`E`, `M`, `T`, `I`, `R` from `calculateTrainingPaces(vdot)`)
       * `power` range (`minWatts`–`maxWatts` W and/or `%FTP`, with Coggan `Z1`–`Z7` quick-fill chips from athlete FTP)
       * `hr` (`zone` 1–6 and/or `minBpm`–`maxBpm`)
       * `rpe` (1–10) or `free`
     * Secondary `hrZone` (1–6), `cadenceRpm`, `label`, and `note`.
   * Render a live SVG/CSS **Intensity Bar Preview** + live computed totals (`Total Distance`, `Total Duration`, `Estimated Planned TSS`).
   * Emit canonical `StructuredWorkoutV2` on change and auto-sync summary `targetDistance`, `targetDuration`, `targetPaceMin/Max`, `targetPowerMin/MaxWatts`, and `plannedTss` to the parent `WorkoutDetailPanel`.
2. **Upgrade `WorkoutDetailPanel.tsx` with First-Class Sport-Aware Target Fields**:
   * Remove the restriction that hid `StructuredWorkoutEditor` on non-interval workouts — allow structured steps on **any** workout type and sport (`RUN`, `BIKE`, `SWIM`, `BRICK`, `STRENGTH`).
   * Show dedicated numeric inputs matching the existing `WorkoutDetailPanel` card layout:
     * Sport selector (`RUN | BIKE | SWIM | STRENGTH`)
     * Target Distance & Duration
     * Run/Swim Pace Range (`min`–`max` + zone label) when sport is `RUN` or `SWIM`
     * Bike Power Targets (`targetPowerWatts`, `targetPowerMinWatts`–`targetPowerMaxWatts`, `%FTP`, `targetPowerZone`, `targetCadenceRpm`) when sport is `BIKE`
     * Heart Rate Targets (`targetHrZone`, `targetHrMinBpm`–`targetHrMaxBpm`)
     * `targetRpe` (1–10) & `plannedTss` (auto-calculated from v2 steps with manual override option).
3. **Engine Generate / Adapt Modal (`EngineGenerateModal.tsx`) Inside `/plan-advanced`**:
   * Accessible from the `/plan-advanced/[goalId]` Toolbar ("Generate / Adapt with Engine") and when `/plan-advanced` is opened without an existing plan:
     * Lets the athlete configure or tweak `sport` (`RUN` / `TRIATHLON`), `raceType` (all 17 types), `raceDate`, `currentVdot`, `ftpWatts`, `swimCssSecPer100m`, `runsPerWeek`, `ridesPerWeek`, `swimsPerWeek`, `strengthPerWeek`, `weeklyMileageGoal`, and phase week counts (`buildWeeks`, `peakWeeks`, `taperWeeks`).
     * Calls `POST /api/plan-advanced/${goalId}/regenerate` (or `POST /api/plans` for a new plan) after taking a `PlanSnapshot` so the user can generate a complete structured plan and immediately adapt it or Undo if desired.
4. **Editable `Goal.phaseBlocks` & Live Planned TSS / CTL / ATL / TSB Projection (`GoalTimeline.tsx` & `AnalysisView.tsx`)**:
   * In `GoalTimeline.tsx`, render the plan's `phaseBlocks` (`BASE`, `BUILD`, `PEAK`, `TAPER`, `RACE_WEEK`) with editable week boundaries and weekly volume/TSS targets.
   * In `AnalysisView.tsx` (and a collapsible mini-PMC strip at the top of `WorkoutListPanel`), combine historical `DailyFitness` with future `Workout.plannedTss` (computed via `calculateWorkoutPlannedTss`) through `calculateFitnessHistory` to plot **Projected CTL (Fitness), Projected ATL (Fatigue), and Projected TSB (Race-Day Form)** live as workouts are edited, dragged, or scaled.
5. **Wire Drag-and-Drop & Copy/Paste Week in `WorkoutListPanel.tsx`**:
   * Complete the unfinished drag-and-drop in `WorkoutListPanel.tsx` using `@dnd-kit/core` so workouts can be dragged across days and reordered within the same day (`PATCH /api/plan-advanced/${goalId}/workouts/${workoutId}` with `scheduledDate` and `order`, creating a snapshot).
   * Add **"Copy Week"** and **"Paste Week"** actions on each week header in `WorkoutListPanel.tsx`, backed by `POST /api/plan-advanced/[goalId]/copy-week/route.ts` (shifts workout dates to the target week, optionally scales distances/watts by a percentage factor `0.8`–`1.2`, skips occupied days or appends with a toast summary, and creates a `PlanSnapshot` first).
6. Write Jest tests in `StructuredWorkoutEditor.test.tsx` (loading legacy v1/builder shapes without crashing, adding repeat groups, editing watt targets, computing totals) and verify `npm run build` passes. Commit with `feat(web): upgrade /plan-advanced studio — v2 structured editor, engine generator, phaseBlocks, live planned TSS/PMC projection, week copy/paste, drag-and-drop`.

### Task `A5` — `feat(android): guided player v2, Room v13 schema, per-step range enforcement, manual lap button, and v2 structured editor`

* **Gate**: `android-gate`
* **Reviewer Lenses**: `functionality`, `architecture`
* **Files**:
  * Create: `android/app/src/main/java/com/runflow2/app/domain/plan/structured/StructuredWorkoutV2.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/data/db/AppDatabase.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/data/sync/PlanMappers.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/plan/StructuredStepsParser.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/plan/StructuredWorkoutBuilder.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/plan/WebPlanEnrichment.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/model/Enums.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/recording/RecordingController.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/recording/RecordingService.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/RecordScreen.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/StructuredEditorScreen.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/PlanScreen.kt`
  * Modify: `Web/scripts/export-plan-fixtures.ts`
  * Modify: `android/app/src/test/resources/plan_fixtures/*.json`
  * Modify: `android/app/src/test/java/com/runflow2/app/domain/plan/WebPlanEngineParityTest.kt`

#### Step-by-Step Instructions for Sub-Agent:

1. **Room Migration `v12 → v13` (`AppDatabase.kt`) & DTOs (`Api.kt`, `PlanMappers.kt`)**:
   * Bump `AppDatabase` version from `12` to `13` and add `MIGRATION_12_13`:
     * `workouts`: add `targetPowerWatts INTEGER`, `targetPowerMinWatts INTEGER`, `targetPowerMaxWatts INTEGER`, `targetPowerZone INTEGER`, `targetFtpPercent INTEGER`, `targetCadenceRpm INTEGER`, `targetRpe INTEGER`, `plannedTss REAL`, `sport TEXT NOT NULL DEFAULT 'RUN'`.
     * `goals`: add `ftpAtCreation INTEGER`, `swimCssAtCreation INTEGER`, `phaseBlocksJson TEXT`.
     * `activities`: add `averageWatts REAL`, `weightedAverageWatts REAL`, `maxWatts REAL`, `deviceWatts INTEGER NOT NULL DEFAULT 0`, `npWatts REAL`, `intensityFactor REAL`, `variabilityIndex REAL`, `bikeTss REAL`, `efficiencyFactor REAL`, `aerobicDecoupling REAL`.
   * Map all new fields in `Api.kt` DTOs and `PlanMappers.kt` / `SyncMappers.kt`.
2. **Kotlin `StructuredWorkoutV2` Model & Parser (`StructuredWorkoutV2.kt`, `StructuredStepsParser.kt`, `WebPlanEnrichment.kt`)**:
   * Implement `StructuredWorkoutV2`, `StepNode`, `RepeatGroup`, `StructuredStep`, `Duration` (`Time`, `Distance`, `LapPress`), and `Target` (`Pace`, `Hr`, `Power`, `Rpe`, `Free`) with byte-identical JSON field names to TypeScript.
   * Update `StructuredStepsParser.parse` to parse canonical v2 plus all 4 legacy shapes and flatten nested `RepeatGroup` nodes with between-iteration `setRest` recovery steps and iteration labels (`"2×(4×400m) — rep 3 of 4"`).
   * Update `WebPlanEnrichment.kt` to emit canonical v2 matching `Web/src/lib/plans/index.ts`, re-run `npx tsx Web/scripts/export-plan-fixtures.ts` to refresh `android/app/src/test/resources/plan_fixtures/*.json`, and verify `WebPlanEngineParityTest.kt` passes.
3. **Guided Player Per-Step Enforcement, Ranges, & Manual Lap Button (`RecordingController.kt`, `RecordingService.kt`, `RecordScreen.kt`)**:
   * Update `PaceZoneEvaluator.evaluate` (`Enums.kt:101-111`) to accept `minPaceSec: Double?`, `maxPaceSec: Double?`, `targetPaceSec: Double?`, and `isSwim: Boolean`. When `minPaceSec != null && maxPaceSec != null && minPaceSec < maxPaceSec`, evaluate `IN_ZONE` iff current pace is within `[minPaceSec, maxPaceSec]`; when `min == max`, apply `±5%` (or `±10%` fallback).
   * In `RecordingController.kt:85,286`, evaluate `PaceZoneEvaluator` against the **active step's target** (`activeStep?.target`), falling back to workout-level `targetPaceMin/MaxSecPerKm` → `targetPaceSecPerKm`.
   * Add `DurationType.LAP_PRESS` to `RecordingController.kt` and implement `fun onLapPressed()`:
     * If the active step has `durationType == DurationType.LAP_PRESS`, record the step split and immediately advance to the next step (triggering the TTS step announcement).
     * Otherwise, record a manual lap split.
   * Wire `ACTION_LAP` in `RecordingService.kt` and add a prominent **"Lap / Next Step"** button in `RecordRunning` (`RecordScreen.kt`), plus render the active step's `note`, pace range (`"4:45–5:00 /km"` or `/100m` via `Format.kt`), HR zone badge (`"Z3 · 148–160 bpm"`), or power target badge (`"210–235 W"`).
   * Also fix `PlanScreen.kt:638-662` inline edit dialog to show `/100m` for swim workouts instead of `/km`.
4. **Upgrade `StructuredEditorScreen.kt` to v2**:
   * Support time steps, distance steps, lap-press steps, custom numeric pace ranges, power watt ranges, nested repeat groups, and per-step notes, encoding canonical v2 via `StructuredWorkoutBuilder`.
5. Add unit tests for v2 parsing, nested flattening, `PaceZoneEvaluator` ranges, and `onLapPressed()` advancement. Run `./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain`. Commit with `feat(android): guided player v2, Room v13 schema, per-step range enforcement, manual lap button, and v2 structured editor`.

## Phase 4: Deep Cycling Power Analytics (Web Full Suite + Android Cycling Tab)

### Task `C1` — `feat(web): cycling power engine — Strava watts stream sync, MMP curve, eFTP, NP/IF/VI/TSS, EF & decoupling, split PMC`

* **Gate**: `web-gate`
* **Reviewer Lenses**: `functionality`, `security`
* **Files**:
  * Create: `Web/src/lib/metrics/power.ts`
  * Create: `Web/src/lib/metrics/__tests__/power.test.ts`
  * Modify: `Web/src/lib/strava/fetch.ts`
  * Modify: `Web/src/lib/strava/transform.ts`
  * Modify: `Web/src/lib/strava/sync.ts`
  * Modify: `Web/src/lib/metrics/fitnessCache.ts`
  * Create: `Web/src/app/api/settings/cycling/route.ts`
  * Create: `Web/src/app/api/analytics/cycling/route.ts`
  * Create: `Web/src/app/api/mobile/v1/analytics/cycling/route.ts`
  * Modify: `Web/src/app/api/activities/[id]/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/activities/[id]/route.ts`
  * Modify: `Web/src/app/api/mobile/v1/user/profile/route.ts`

#### Step-by-Step Instructions for Sub-Agent:

1. **Create `Web/src/lib/metrics/power.ts` (Pure Cycling Math Library)**:
   * **7 Coggan Power Zones (`calculateCogganPowerZones(ftpWatts, weightKg?)`)**:
     * `Z1` Active Recovery (`≤ 55% FTP`), `Z2` Endurance (`56–75%`), `Z3` Tempo (`76–90%`), `Z4` Lactate Threshold (`91–105%`), `Z5` VO2max (`106–120%`), `Z6` Anaerobic Capacity (`121–150%`), `Z7` Neuromuscular Power (`> 150%`), including `minWatts`, `maxWatts`, `minWkg`, `maxWkg`.
   * **Normalized Power (`calculateNormalizedPower(wattsStream, timeStream?)`)**:
     * Compute 30-second rolling average power (handling non-uniform `timeStream` sampling by time-interpolating or windowing over `time[i] - time[j] <= 30`), raise each rolling sample to the 4th power, average, and take the 4th root.
     * Fallback hierarchy when stream is absent or < 30s: `weightedAverageWatts` (if `deviceWatts` is true, `npSource: 'weighted_avg'`) → `averageWatts` (`npSource: 'average_watts'`).
   * **Intensity Factor (`IF`), Variability Index (`VI`), and Cycling `TSS`**:
     * `IF = npWatts / ftpWatts`
     * `VI = npWatts / averageWatts`
     * `bikeTss = ((movingTimeSec * npWatts * IF) / (ftpWatts * 3600)) * 100`
   * **Mean Maximal Power (`calculatePowerCurve(wattsStream, timeStream?)`) & Automatic `eFTP`**:
     * Compute peak average watts for standard durations: `[5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]` seconds (`5s`, `15s`, `30s`, `1m`, `2m`, `5m`, `10m`, `20m`, `30m`, `60m`).
     * Compute `eFTP`: if a `1200s` (20-min) peak exists, `Math.round(0.95 * peak1200s)` (or critical power 2-parameter fit from `300s` and `1200s`: `CP = (peak1200 * 1200 - peak300 * 300) / 900`), falling back to `0.95 * max(weightedAverageWatts)` on rides ≥ 20 min, then `estimateBikeFtpFromVdot(vdot)`.
   * **Aerobic Efficiency Factor (`EF`) & Aerobic Decoupling (`Pw:Hr %`)**:
     * `efficiencyFactor = averageHr > 0 ? Number((npWatts / averageHr).toFixed(2)) : null`.
     * `aerobicDecoupling`: split the ride's moving stream into first half and second half; compute `ef1 = np1 / hr1` and `ef2 = np2 / hr2`; `decouplingPct = Number((((ef1 - ef2) / ef1) * 100).toFixed(1))`.
   * **Time in 7 Power Zones (`calculatePowerZoneTimes(wattsStream, timeStream, ftpWatts)`)**:
     * Returns `[z1Sec, z2Sec, z3Sec, z4Sec, z5Sec, z6Sec, z7Sec]`.
2. **Capture Strava `watts` Stream & Persist Ride Power Metrics (`fetch.ts`, `transform.ts`, `sync.ts`, `fitnessCache.ts`)**:
   * In `Web/src/lib/strava/fetch.ts:207`, add `watts` to `keys=time,heartrate,velocity_smooth,altitude,cadence,watts`.
   * In `Web/src/lib/strava/transform.ts:290-295`, map `maxWatts: activity.max_watts ?? null`, `kilojoules: activity.kilojoules ?? null`, and compute initial `npWatts`, `intensityFactor`, `variabilityIndex`, `bikeTss`, `efficiencyFactor` from summary fields when `average_watts` is present.
   * In `Web/src/lib/strava/sync.ts:208-235` (`needsUpdate`), trigger stream fetch for existing `RIDE` / `VIRTUAL_RIDE` rows that have `averageWatts != null` but lack `streams.watts` or `npWatts`. Once streams are fetched in `sync.ts:396-465`, compute exact stream-based `npWatts`, `intensityFactor`, `variabilityIndex`, `bikeTss`, `efficiencyFactor`, `aerobicDecoupling`, and `powerZone1Time..7Time` and persist them on `Activity`.
   * In `Web/src/lib/metrics/fitnessCache.ts:81-135`:
     * Compute daily `bikeTss` (sum of `activity.bikeTss ?? activity.trimp` for `RIDE` and `VIRTUAL_RIDE` activities) and compute `ctlBike`, `atlBike`, `tsbBike` alongside `ctl`, `atl`, `tsb`, and `ctlRunning`!
     * Also use `activity.bikeTss` (when present on a ride) instead of `trimp` in the combined `ctl` / `atl` / `tsb` load so power-meter rides without a heart-rate strap properly contribute to total fitness load!
3. **Create `/api/settings/cycling`, `/api/analytics/cycling`, and `/api/mobile/v1/analytics/cycling`**:
   * `GET/PUT /api/settings/cycling`: reads/updates `User.ftpWatts`, `User.autoEstimateFtp`, `User.swimCssSecPer100m`, and returns resolved FTP, `eFTP`, `W/kg`, and 7 Coggan zones.
   * `GET /api/analytics/cycling?range=42d|90d|365d|all` (and `/api/mobile/v1/analytics/cycling` with dual JWT auth):
     * Returns:
       * `ftp`: `{ ftpWatts, eFtpWatts, autoEstimateFtp, weightKg, wPerKg, zones: CogganZone[] }`
       * `summary`: `{ totalRides, totalDistanceM, totalMovingTimeSec, totalElevationM, totalKilojoules, avgWatts, maxWatts, avgNpWatts, avgIf, avgVi, totalBikeTss, avgEfficiencyFactor, avgDecouplingPct }`
       * `powerCurve`: `{ durationsSec: [5,15,30,60,120,300,600,1200,1800,3600], peakWatts: number[], peakWkg: (number|null)[], allTimePeakWatts: number[] }`
       * `zoneDistributionSec`: `[z1, z2, z3, z4, z5, z6, z7]`
       * `ridesSeries`: chronological ride metrics (`id`, `date`, `name`, `distanceM`, `movingTimeSec`, `avgWatts`, `npWatts`, `maxWatts`, `if`, `vi`, `bikeTss`, `ef`, `decouplingPct`, `deviceWatts`)
       * `pmcSeries`: daily `{ date, ctlCombined, atlCombined, tsbCombined, ctlRunning, atlRunning, tsbRunning, ctlBike, atlBike, tsbBike, runTss, bikeTss, trimp }`
4. Write Jest tests in `Web/src/lib/metrics/__tests__/power.test.ts` testing 7-zone boundaries, 30s rolling NP, IF/VI/TSS, MMP curve, eFTP, EF, and decoupling. Commit with `feat(web): cycling power engine — Strava watts stream sync, MMP curve, eFTP, NP/IF/VI/TSS, EF & decoupling, split PMC`.

### Task `C2` — `feat(web): deep cycling analytics UI — sport switcher, split/combined PMC, MMP power curve, EF/decoupling, ride power modal`

* **Gate**: `web-ui-gate`
* **Reviewer Lenses**: `functionality`, `ux`
* **Files**:
  * Modify: `Web/src/app/analytics/page.tsx`
  * Create: `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`
  * Create: `Web/src/components/Analytics/PowerDurationCurveChart.tsx`
  * Create: `Web/src/components/Analytics/SplitPmcChart.tsx`
  * Modify: `Web/src/components/ActivityDetailsModal.tsx`

#### Step-by-Step Instructions for Sub-Agent:

1. **Add Sport View Switcher & Split/Combined PMC on `Web/src/app/analytics/page.tsx`**:
   * At the top of `Web/src/app/analytics/page.tsx`, add a segmented sport filter bar: **`Combined | Running | Cycling`** (plus range selector `42d | 90d | 1y | All`).
   * Build `SplitPmcChart.tsx` allowing the athlete to view **Combined Load (`CTL / ATL / TSB`)**, **Running Load (`rTSS` PMC)**, **Cycling Load (`Bike TSS` PMC)**, or **Overlay Split View** (comparing Running CTL vs. Cycling CTL on the same timeline).
2. **Build `CyclingAnalyticsSection.tsx` & `PowerDurationCurveChart.tsx`**:
   * Rendered when `Cycling` or `Combined` is selected on `/analytics` (fetching from `/api/analytics/cycling`):
     * **Hero KPI Strip**: Active FTP (`W` and `W/kg` with inline edit modal for `PUT /api/settings/cycling`), Auto-Estimated `eFTP` badge, Cycling CTL / ATL / TSB, 4-Week Bike TSS & kJ, and Average Efficiency Factor (`EF`).
     * **Mean Maximal Power (MMP) / Power Duration Curve (`PowerDurationCurveChart.tsx`)**: logarithmic/categorical duration axis (`5s`, `15s`, `30s`, `1m`, `2m`, `5m`, `10m`, `20m`, `30m`, `60m`) comparing selected-range Peak Watts vs. All-Time Peak Watts, with a toggle for **`Watts` vs. `W/kg`** and an FTP reference line.
     * **Power & Intensity Trend Chart**: chronological ride bars/lines showing `NP`, `Average Watts`, `IF`, and `Bike TSS`.
     * **7-Zone Coggan Power Distribution**: horizontal stacked bar + breakdown table (`Z1 Active Recovery` through `Z7 Neuromuscular` with watts, `%FTP`, hours, and percentage of ride time).
     * **Aerobic Efficiency & Decoupling (`EF = NP/HR` & `Pw:Hr %`) Chart**: scatter/trend line tracking aerobic efficiency progress and flagging rides with `< 5%` decoupling (strong aerobic durability) vs. `> 5%` drift.
3. **Upgrade `ActivityDetailsModal.tsx` for Cycling Activities**:
   * When viewing a `RIDE` or `VIRTUAL_RIDE`, display a dedicated **Cycling Power Analysis** panel:
     * Metric tiles: `Normalized Power (NP)`, `Avg Power`, `Max Power`, `Intensity Factor (IF)`, `Variability Index (VI)`, `Bike TSS`, `Work (kJ)`, `W/kg`, `Efficiency Factor (EF)`, `Aerobic Decoupling (Pw:Hr %)`, and a `Power Meter` vs. `Estimated Power` badge (`deviceWatts`).
     * Per-ride 7-Zone Coggan time-in-zone bars and watts stream chart.
4. Follow the Race Timing design system (Archivo / IBM Plex Mono, `glass-card`, clean light and dark theme contrast). Verify `npm test` and `npm run build` pass. Commit with `feat(web): deep cycling analytics UI — sport switcher, split/combined PMC, MMP power curve, EF/decoupling, ride power modal`.

### Task `C3` — `feat(android): dedicated Cycling tab in AnalyticsScreen, ride power card in ActivityDetailScreen, and FTP settings in AthleteScreen`

* **Gate**: `android-gate`
* **Reviewer Lenses**: `functionality`, `ux`
* **Files**:
  * Modify: `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/data/repo/SettingsRepository.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/data/repo/RunFlowRepository.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/domain/analytics/AnalyticsEngine.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/ActivityDetailScreen.kt`
  * Modify: `android/app/src/main/java/com/runflow2/app/ui/screens/AthleteScreen.kt`

#### Step-by-Step Instructions for Sub-Agent:

1. **Add Streamlined Cycling Analytics to `AnalyticsEngine.kt` & `RunFlowRepository.kt`**:
   * Add `ftpWatts: Int` (default `0` = auto-estimate from rides/VDOT) to `AppSettings` in `SettingsRepository.kt` and sync it with `/api/mobile/v1/user/profile` and `/api/mobile/v1/analytics/cycling`.
   * Extend `AnalyticsBundle` in `AnalyticsEngine.kt` with a lightweight `CyclingAnalyticsSummary` computed from local `ActivityEntity` rows (`type == "RIDE" || type == "VIRTUAL_RIDE"`) and/or `/api/mobile/v1/analytics/cycling`:
     * `ftpWatts: Int`, `eFtpWatts: Int?`, `wPerKg: Double?`
     * `ctlBike: Double`, `atlBike: Double`, `tsbBike: Double`, `bikeFitnessSeries: List<FitnessPoint>`
     * `weeklyBikeKm: List<WeeklyBar>`, `weeklyBikeTss: List<WeeklyBar>`
     * `recentRideNpSeries: List<Double>`, `avgNpWatts: Int?`, `avgWatts: Int?`, `totalBikeTss30d: Int`
     * `powerZoneDistribution: List<ZoneBucket>` (7 Coggan zones).
2. **Add Dedicated `Running | Cycling` Tab Bar in `AnalyticsScreen.kt`**:
   * At the top of `AnalyticsScreen.kt` (`LazyColumn` header), add a 2-tab segmented switcher: **`Running` | `Cycling`**.
   * When **`Running`** is selected, render the existing running analytics cards.
   * When **`Cycling`** is selected, render the streamlined mobile cycling dashboard:
     * **Cycling Status Card**: `FTP (Watts)` tile, `Power-to-Weight (W/kg)` tile (or `eFTP` badge), and `Cycling CTL / ATL / TSB` metric bars.
     * **Cycling Load (PMC) Chart**: `FitnessChart` plotting `ctlBike`, `atlBike`, and `tsbBike` across `90d / 180d / 365d`.
     * **Weekly Cycling Volume & TSS Bars**: `WeeklyVolumeBars` toggleable between `Distance (km/mi)` and `Bike TSS`.
     * **7-Zone Coggan Power Distribution Card**: `ZoneDistribution` displaying time spent in `Z1`–`Z7`.
     * **Recent Rides Power Sparkline**: compact card showing average `NP` / `Watts` and `IF` across recent rides.
3. **Update `ActivityDetailScreen.kt` & `AthleteScreen.kt`**:
   * In `ActivityDetailScreen.kt:107`, trigger `fetchAndCacheStreams` for `RIDE` and `VIRTUAL_RIDE` activities as well as `RUN`.
   * When displaying a ride on `ActivityDetailScreen.kt`, render a **Cycling Power Card** (`Avg Watts`, `NP`, `IF`, `VI`, `Bike TSS`, `Device vs Est.` badge), a watts stream chart (`StreamMath.kt`), and 7-zone power bars.
   * On `AthleteScreen.kt`, add a **Cycling FTP & Power Zones** card allowing the user to set their manual FTP or toggle auto-estimate and inspect their 7 Coggan power zones.
4. Add unit tests for Kotlin cycling zone & NP/IF/TSS math in `android/app/src/test/`. Run `./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain`. Commit with `feat(android): dedicated Cycling tab in AnalyticsScreen, ride power card in ActivityDetailScreen, and FTP settings in AthleteScreen`.

## Phase 5: Complete Dual-MCP Ecosystem (`/mcp/public` & `/mcp`) with Direct Domain OAuth 2.1 Login

### Task `B1` — `feat(web): public stateless PlanGen MCP at /mcp/public + GET /api/public/plan/export`

* **Gate**: `web-gate`
* **Reviewer Lenses**: `security`, `functionality`
* **Files**:
  * Create: `Web/src/lib/mcp/server.ts`
  * Create: `Web/src/app/mcp/public/route.ts`
  * Modify: `Web/src/app/api/public/plan/export/route.ts`
  * Modify: `Web/src/middleware.ts`
  * Create: `Web/src/app/mcp/public/__tests__/route.test.ts`

#### Step-by-Step Instructions for Sub-Agent:

1. **Create Shared MCP Protocol Dispatcher (`Web/src/lib/mcp/server.ts`)**:
   * Implement JSON-RPC 2.0 + MCP Streamable HTTP (`2025-03-26` / `2025-06-18` protocol versions) handling:
     * `initialize` → returns `{ protocolVersion, capabilities: { tools: { listChanged: false }, prompts: { listChanged: false }, resources: { listChanged: false } }, serverInfo: { name, version: '2.4.0' } }`
     * `notifications/initialized` → `202 Accepted` (or empty JSON-RPC ack)
     * `ping` → `{}`
     * `tools/list` → returns tool definitions with JSON Schema `inputSchema` and `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`)
     * `tools/call` → validates arguments via Zod, executes the tool handler, and returns `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false }`.
   * Support both `POST` (JSON response or `text/event-stream` when requested) and `GET` (SSE endpoint keepalive for MCP clients that open a GET stream).
2. **Add Stateless `GET` Handler to `Web/src/app/api/public/plan/export/route.ts`**:
   * The existing export route only supports `POST`. Add an exported `GET(request: NextRequest)` handler that reads query parameters (`format=csv|html`, `raceType`, `raceDate`, `vdot`, `runsPerWeek`, `ridesPerWeek`, `swimsPerWeek`, `strengthPerWeek`, `weeklyVolumeKm`, `taperWeeks`, `peakWeeks`, `buildWeeks`, `longRunDay`, `workoutDay`, `swimDay`), runs `applyPlanDefaults` + `generateTrainingPlan`, and returns the downloadable CSV or printable HTML plan attachment.
3. **Create Public MCP Endpoint at `Web/src/app/mcp/public/route.ts`**:
   * Rate limit: `10 requests / hour / IP` via `checkRateLimit` + `getClientIdentifier` (matching `/api/public/plan/generate`).
   * Tools exposed (100% stateless, zero DB access):
     1. `generate_running_plan`: accepts all **17 `RaceType` values** (`FIVE_K`, `TEN_K`, `HALF_MARATHON`, `MARATHON`, `FIFTY_K`, `FIFTY_MILE`, `HUNDRED_K`, `HUNDRED_MILE`, `TWELVE_HOUR`, `TWENTY_FOUR_HOUR`, `BACKYARD_ULTRA`, `CUSTOM_DISTANCE`, `SPRINT_TRI`, `OLYMPIC_TRI`, `HALF_IRONMAN`, `FULL_IRONMAN`, `CUSTOM_TRI`), `vdot` or recent race performance (`raceDistance`, `raceTimeSeconds`), `raceDate`, `runsPerWeek`, `ridesPerWeek`, `swimsPerWeek`, `strengthPerWeek`, `weeklyVolumeKm`, `ftpWatts`, `swimCssSecPer100m`. Returns `phaseBlocks`, training zones (run paces, bike power zones, swim CSS paces), and full workout list with canonical v2 `structuredSteps` and numeric target fields.
     2. `calculate_vdot_paces`: calculates VDOT from a race result or target time, equivalent race predictions across 5K/10K/Half/Marathon, and training pace ranges (`min/km` and `min/mi`).
     3. `export_plan_url`: returns a direct clickable `GET` URL to `/api/public/plan/export?format=html|csv&...` so users in Claude or Gemini can download or print their generated plan in one click.
   * Update `Web/src/middleware.ts` so `/mcp` and `/mcp/public` and `/.well-known/` allow cross-origin MCP requests (`claude.ai`, `aistudio.google.com`, `gemini.google.com`, localhost, and configured origins) and expose `Mcp-Session-Id` and `WWW-Authenticate` headers.
4. Write Jest tests in `Web/src/app/mcp/public/__tests__/route.test.ts` testing `initialize`, `tools/list`, `generate_running_plan` across Marathon, 100K Ultra, and Half Ironman, `export_plan_url` + `GET /api/public/plan/export`, and 429 rate limiting. Commit with `feat(web): public stateless PlanGen MCP at /mcp/public + GET /api/public/plan/export`.

### Task `B2` — `feat(web): private Paid-Premium MCP at /mcp — direct domain OAuth 2.1 PKCE login, Claude & Gemini Custom MCP support, full coaching/plan tools, Strava compliance`

* **Gate**: `web-ui-gate`
* **Reviewer Lenses**: `security`, `functionality`, `ux`
* **Files**:
  * Create: `Web/src/lib/mcp/oauth.ts`
  * Create: `Web/src/lib/mcp/safety.ts`
  * Create: `Web/src/app/.well-known/oauth-protected-resource/route.ts`
  * Create: `Web/src/app/.well-known/oauth-authorization-server/route.ts`
  * Create: `Web/src/app/mcp/oauth/register/route.ts`
  * Create: `Web/src/app/mcp/oauth/authorize/route.ts`
  * Create: `Web/src/app/mcp/oauth/token/route.ts`
  * Create: `Web/src/app/mcp/authorize/page.tsx`
  * Create: `Web/src/app/mcp/route.ts`
  * Create: `Web/src/app/mcp/__tests__/route.test.ts`
  * Create: `docs/MCP_API.md`

#### Step-by-Step Instructions for Sub-Agent:

1. **Implement Direct Domain Login via OAuth 2.1 + PKCE + Dynamic Client Registration (`Web/src/lib/mcp/oauth.ts` & OAuth routes)**:
   * When a user adds `https://runflow.schuelken.uk/mcp` in **Claude Desktop / Claude Web Connectors** or **Gemini Custom MCP**:
     * **Unauthenticated request to `/mcp`**: returns `401 Unauthorized` with header:
       `WWW-Authenticate: Bearer realm="RunFlow MCP", resource_metadata="<origin>/.well-known/oauth-protected-resource"`
     * **`GET /.well-known/oauth-protected-resource`** (and `/.well-known/oauth-protected-resource/mcp`): returns:
       ```json
       {
         "resource": "<origin>/mcp",
         "authorization_servers": ["<origin>"],
         "bearer_methods_supported": ["header"],
         "scopes_supported": ["mcp:full"]
       }
       ```
     * **`GET /.well-known/oauth-authorization-server`**: returns RFC 8414 metadata:
       ```json
       {
         "issuer": "<origin>",
         "authorization_endpoint": "<origin>/mcp/oauth/authorize",
         "token_endpoint": "<origin>/mcp/oauth/token",
         "registration_endpoint": "<origin>/mcp/oauth/register",
         "response_types_supported": ["code"],
         "grant_types_supported": ["authorization_code", "refresh_token"],
         "code_challenge_methods_supported": ["S256"],
         "token_endpoint_auth_methods_supported": ["none", "client_secret_post", "client_secret_basic"],
         "scopes_supported": ["mcp:full"]
       }
       ```
     * **`POST /mcp/oauth/register` (RFC 7591 Dynamic Client Registration)**: validates `client_name` and `redirect_uris` (allowing `https://claude.ai/*`, `https://*.claude.ai/*`, `https://*.anthropic.com/*`, `https://*.google.com/*`, `http://localhost:*`, `http://127.0.0.1:*`), stores a `McpOAuthClient` row, and returns `{ client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method }` (`201 Created`).
     * **`GET /mcp/oauth/authorize` & Consent Page `/mcp/authorize`**:
       * Checks NextAuth `auth()` session; if not signed in, redirects to `/login?callbackUrl=<encoded authorize URL>`.
       * Checks **Paid Premium status**: queries `User` (`isAdmin`) and `UserAiSettings` (`usageTier`). Access is granted iff `user.isAdmin === true || usageTier === 'tier2' || usageTier === 'tier3'`.
       * If the user is on the free tier (`none` or `tier1`), `/mcp/authorize` displays a clear "RunFlow Pro Required for Personal MCP Access" screen with a link to upgrade in settings.
       * If the user is Paid Premium, `/mcp/authorize` displays a sleek Race-Timing-styled consent card ("Authorize **Claude / Gemini** (`client_name`) to read your training metrics and manage your RunFlow training plan"). On approval (`POST /mcp/oauth/authorize`), creates a single-use `McpOAuthCode` (10-minute TTL, storing `codeChallenge` + `redirectUri` + `userId`) and redirects to `redirect_uri?code=...&state=...`.
     * **`POST /mcp/oauth/token`**:
       * Supports `grant_type=authorization_code` (verifying `SHA256(code_verifier) === codeChallenge`, marking `McpOAuthCode.usedAt`, and issuing a 30-day access token `rf_mcp_...` + 90-day refresh token `rf_mcpr_...` stored hashed in `McpOAuthToken`) and `grant_type=refresh_token` (rotating the token pair).
2. **Dual Auth + Paid Premium Gate on `/mcp` (`Web/src/app/mcp/route.ts`)**:
   * Accept EITHER:
     * An OAuth 2.1 Bearer token (`rf_mcp_...`) validated via `validateMcpOAuthToken(token)` in `Web/src/lib/mcp/oauth.ts`, OR
     * A personal RunFlow API key (`rf_...`) validated via `validateApiKey(request)` (`Web/src/lib/api/externalAuth.ts`).
   * On EVERY request to `/mcp`, verify Paid Premium status (`user.isAdmin === true || usageTier === 'tier2' || usageTier === 'tier3'`). If a user's subscription downgraded after token issuance, return JSON-RPC error `{"code": -32002, "message": "RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3)."}`.
   * Rate limit: `60 requests / minute` per authenticated `userId`.
3. **Implement Complete Read & Write Tool Suite on `/mcp`**:
   * **Read / Inspection Tools**:
     1. `get_athlete_profile`: returns VDOT, effective VDOT, run training paces (`min/km` & `min/mi`), Bike FTP (`ftpWatts`, `eFtpWatts`, `wPerKg`, 7 Coggan power zones, 5 plan bike zones), Swim CSS (`sec/100m` & swim zones), HR zones (`hrMax`, `hrRest`, `thresholdHeartRate`, Z1–Z6 bpm), weight, and unit preferences.
     2. `get_fitness_metrics`: returns current & 42-day/90-day series for **Combined PMC (`ctl`, `atl`, `tsb`)**, **Running PMC (`ctlRunning`)**, and **Cycling PMC (`ctlBike`, `atlBike`, `tsbBike`)**, weekly ramp rate, and overtraining risk classification.
     3. `get_cycling_analytics`: returns the athlete's Mean Maximal Power (`MMP`) curve (`5s`..`60m` in Watts and `W/kg`), `eFTP`, recent ride `NP`/`IF`/`VI`/`bikeTss` trends, 7-zone Coggan distribution, and Aerobic Efficiency (`EF` & `Pw:Hr` decoupling) trends.
     4. `get_training_plan`: pulls the active (or specified `goalId`) training plan, including structured `phaseBlocks`, race goal metadata, threshold snapshots (`vdot`, `ftpAtCreation`, `swimCssAtCreation`), weekly volume/TSS targets, projected race-day CTL/ATL/TSB, coaching summaries, and all workouts in the requested date window (default: `-14d` to `+28d`, or full plan when `includeAllWorkouts: true`) with parsed v2 `structuredSteps` and all numeric target columns (`targetPaceMin/Max`, `targetPowerMin/MaxWatts`, `targetHrMin/MaxBpm`, `plannedTss`, `isCompleted`).
     5. `get_recent_activities`: returns activities in a date window (`days: 1..180`, optional `sportType` filter).
        * **HARD STRAVA API COMPLIANCE RULE**: For any activity with `stravaId != null`, NEVER include `name`, `description`, `rawJson`, `streams`, `laps`, or `splits` GPS/sensor arrays. Return only RunFlow's computed summary & derivative fields (`id`, `startDate`, `type`, `sportType`, `trainingType`, `distance`, `movingTime`, `elapsedTime`, `totalElevation`, `averageHr`, `maxHr`, `averageWatts`, `weightedAverageWatts`, `maxWatts`, `deviceWatts`, `npWatts`, `intensityFactor`, `variabilityIndex`, `bikeTss`, `runningTss`, `trimp`, `estimatedVdot`, `efficiencyFactor`, `aerobicDecoupling`, `hrZone1Time..7Time`, `powerZone1Time..7Time`) plus:
          ```json
          "stravaComplianceNotice": "Activity title, description, and raw GPS/sensor streams are omitted for Strava-synced activities per Strava API terms. To inspect raw Strava activity details or streams, please use the official Strava MCP server."
          ```
     6. `get_readiness_and_health`: returns latest `DailyReadinessRecord` (`compositeScore`, sleep, HRV, RHR trends) and recent `DailyHealthLog` entries.
   * **Write / Mutation Tools** (every plan mutation runs inside `prisma.$transaction`, calls `createSnapshot(goalId, description, 'ai_mcp_mutation')` BEFORE mutating, and returns `safetyAdvisory` from `Web/src/lib/mcp/safety.ts`):
     7. `create_training_plan`: creates and persists a new `Goal` + full schedule of structured v2 `Workouts` using the plan engine (`generateTrainingPlan` + `buildPlanPhaseBlocks`).
     8. `update_training_plan_phases`: updates `Goal.phaseBlocks`, weekly Run/Bike/Swim volume & TSS goals, `raceDate`, or `targetTime`.
     9. `create_structured_workout`: inserts a new `Workout` on `scheduledDate` with validated canonical v2 `structuredSteps` and auto-computed/explicit numeric target columns (`targetDistance`, `targetDuration`, `targetPaceMin/Max`, `targetPowerMin/MaxWatts`, `targetHrMin/MaxBpm`, `plannedTss`, `sport`).
     10. `modify_workout`: updates any whitelisted field or v2 `structuredSteps` on an existing `Workout` and recalculates `plannedTss`.
     11. `reschedule_workout`: moves a workout to a new `scheduledDate` (and optional `order`).
     12. `swap_workouts`: swaps `scheduledDate` (and `order`) between two workouts.
     13. `delete_workout`: deletes a planned workout after snapshotting.
     14. `mark_workout_status`: sets `isCompleted` / `completedAt` (and optional `linkedActivityId`) and triggers `adaptPlanAfterCompletion`.
     15. `recalibrate_thresholds`: updates the athlete's `vdot`, `ftpWatts`, `swimCssSecPer100m`, or HR zones, runs `recalculateWorkoutPaces` (and bike watt target recalculation) across future workouts in the active plan, and runs `updateFitnessCache`.
     16. `save_weekly_coaching_summary`: writes a `PlanSnapshot` row with `operation: 'coaching_summary'` (isolated from Undo) so it renders in the web `/calendar` and `/plan-advanced` header banner.
4. **Implement Safety Advisory Engine (`Web/src/lib/mcp/safety.ts`)**:
   * Evaluates the mutated plan after every write tool and attaches `safetyAdvisory: Array<{ level: 'info' | 'warning' | 'critical'; rule: string; message: string }>`:
     * `weekly_volume_spike`: >10% weekly distance or TSS increase vs. prior week AND vs. 4-week rolling average.
     * `long_run_cap`: single long run >35% of weekly running distance.
     * `consecutive_hard_days`: back-to-back hard workouts (`INTERVALS`, `TEMPO`, `REPETITIONS`, `RIDE_INTERVALS`, `RACE`).
     * `projected_tsb_overload`: projected TSB drops below `-30`.
5. **Write `docs/MCP_API.md` & Jest Suite (`Web/src/app/mcp/__tests__/route.test.ts`)**:
   * Document step-by-step setup for **Claude Desktop / Claude Web** (entering `https://runflow.schuelken.uk/mcp` with direct browser OAuth login), **Gemini Custom MCP**, and **Public PlanGen (`https://runflow.schuelken.uk/mcp/public`)**.
   * Test in Jest:
     * `401` with `WWW-Authenticate` discovery header when unauthenticated.
     * OAuth 2.1 Dynamic Client Registration (`POST /mcp/oauth/register`), Authorization code issuance for Paid Premium (`tier2`/`tier3`/`isAdmin`), rejection for free tier (`none`/`tier1`), and PKCE `S256` verification at `POST /mcp/oauth/token`.
     * Both `rf_mcp_...` OAuth token and `rf_...` API key authentication on `POST /mcp`.
     * Strava scrubbing proof on `get_recent_activities` (asserting `name`, `description`, `rawJson`, `streams` are absent when `stravaId != null` and `stravaComplianceNotice` is present).
     * Full execution of `get_training_plan`, `create_structured_workout`, `modify_workout`, `recalibrate_thresholds`, `save_weekly_coaching_summary`, and `safetyAdvisory` triggers.
   * Commit with `feat(web): private Paid-Premium MCP at /mcp — direct domain OAuth 2.1 PKCE login, Claude & Gemini Custom MCP support, full coaching/plan tools, Strava compliance`.

## Phase 6: Final Cross-Platform Verification & Browser QA (`Task QA-1`)

### Task `QA-1` — End-to-End Verification Gate

1. **Run All Automated Gates**:
   ```bash
   cd Web && npx prisma validate
   cd Web && npm test
   cd Web && npm run build
   cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest --console=plain
   ```
2. **Interactive Browser & cURL Verification (Docker QA Env)**:
   * Verify `/plan` redirects cleanly to `/calendar` on both desktop and mobile viewports.
   * Verify `/calendar` keeps its clean, uncluttered `WeeklyView` / `MonthlyView` / `SummaryStats` layout (at most 3–4 compact tokens per pill), supports drag-and-drop workout rescheduling, and opens `CalendarWorkoutDetailDrawer` on click for v2 step details.
   * Verify `/plan-advanced/[goalId]` opens the v2 `StructuredWorkoutEditor` on Run, Bike, Swim, and Brick workouts without errors, displays the live Planned vs. Actual PMC chart, and supports week copy/paste and Undo without losing workout completions.
   * Verify `/analytics` switches between `Combined`, `Running`, and `Cycling`, rendering the MMP Power Duration Curve, eFTP, 7 Coggan zones, EF/decoupling chart, and Split PMC.
   * Verify `curl -i https://localhost:3000/.well-known/oauth-protected-resource`, `curl -i https://localhost:3000/.well-known/oauth-authorization-server`, `POST /mcp/public`, and `POST /mcp` (401 discovery, 403 free tier, 200 Paid Premium).