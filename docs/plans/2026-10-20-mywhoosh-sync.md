# MyWhoosh Training-Plan & Calendar Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two-way sync between MyWhoosh and RunFlow — import MyWhoosh training plans / scheduled calendar workouts into RunFlow goals (idempotent, local-wins), import `.zwo` / MyWhoosh JSON workout files, and push RunFlow cycling workouts to the MyWhoosh calendar (opt-in).

**Architecture:** New `MyWhooshConnection` Prisma model holds per-user encrypted credentials (Strava-on-User precedent, but a dedicated table). A new `Web/src/lib/mywhoosh/` module isolates all unofficial-API I/O (client), format conversion (parser), and the sync state machine (sync). API routes follow the repo's *newer* convention (dual auth + zod + ApiError + rate limit — model: `csv/import`, NOT `settings/cycling`). Android gets connection UI only; synced goals/workouts already flow through `SyncManager.pullPlans()`.

**Tech Stack:** Next.js 15 (App Router), Prisma 7 (generator → `../src/generated/prisma`), zod 4, Jest 29 (ts-jest), Kotlin/Compose + Retrofit (Android).

## User decisions (binding)

1. **Credentials:** `encryptedPassword` column exists but is opt-in (`rememberCredentials`, default false). Auto-relogin only when enabled; otherwise expired tokens surface a "reconnect" error. No refresh endpoint exists in the community docs.
2. **Auto-sync:** v1 is manual only (button + MCP tool). `autoSyncCalendar` is stored but unused by any scheduler yet.
3. **Re-sync:** **Local wins.** User-edited synced workouts are never overwritten; user-deleted synced workouts stay deleted (tombstone). Detection is fingerprint-based (see Task 4) — no changes to generic delete routes.
4. Working-tree round was committed before this feature (`97b2f73c`).

## Global constraints

- **No `any`** (CODING_STANDARDS.md:332). Use `unknown` + narrowing or proper types.
- **Never log passwords or tokens.** Encrypt at rest with `encryptToken`/`decryptToken` from `Web/src/lib/crypto.ts` (AES-256-GCM, env `ENCRYPTION_KEY`).
- **Route convention (all new routes):** `getAuthenticatedUser(request)` from `Web/src/lib/mobile/auth.ts:130` (dual session+JWT); zod-validate body; throw `ApiError` from `Web/src/lib/apiError.ts` (use static factories); `checkRateLimitAsync(getClientIdentifier(request), RATE_LIMITS.…)` from `Web/src/lib/rateLimit.ts` (presets at :175: `sync: 10/60s`, `settings: 10/60s`); ownership checks `where: { id, userId }`; `export const dynamic = 'force-dynamic'`.
- **Bounds:** file uploads ≤ 5 MB total, ≤ 100 files, ≤ 500 persisted workouts per operation; MyWhoosh catalog ZIP ≤ 64 MB, custom-workout ZIP ≤ 10 MB; per-request API timeout 10 s (ZIP downloads 30 s) via `AbortSignal.timeout`.
- **JSON field name parity TS ↔ Kotlin byte-identical** (schema-v2 design convention, docs/archive/structured-workout-schema-v2-design.md:96).
- **Gates:** Web: `cd Web && npx tsc --noEmit && npm test`. Android: `cd android && ./gradlew :app:compileDebugKotlin && ./gradlew testDebugUnitTest`. Zero errors/failures before any commit.
- **Docs:** endpoints → `Web/DOCUMENTATION.md` §6; mobile-facing → `Web/MOBILE_API.md`; MCP tool → `docs/MCP_API.md`.
- Commit style: `feat(mywhoosh): …` / `test(mywhoosh): …`, one commit per task, never `git add -A` (stage explicit paths).

## Verified repo facts (do not re-derive)

- `Goal.sport` enum `PlanSport` = `RUN | TRIATHLON` only (schema.prisma:973). New synced goals use `TRIATHLON` (only cycling-compatible value).
- `Goal.creationMode` enum = `EXPERT_MANUAL | GUIDED | AI_ASSISTED | STANDARD_BUILDER | CSV_IMPORT`. Use `CSV_IMPORT` + `planSource: 'mywhoosh-sync'` (free string; precedent `'mobile-import'` in plans/import/route.ts).
- `Workout` fields (schema.prisma:590-639): `workoutType WorkoutType` (has `RIDE, LONG_RIDE, RIDE_INTERVALS, BRICK, EASY, TEMPO, INTERVALS, LONG_RUN, RECOVERY, RACE, …`), `phase PlanPhase` (has `BASE, BUILD, PEAK, TAPER, RACE_WEEK, RECOVERY, ENDURANCE, …`), `sport String @default("RUN")` (free string), `scheduledDate DateTime`, `description String` (required), `customName String?`, `plannedTss Float?`, `targetDuration Int?` (seconds), `targetFtpPercent Int?`, `targetPowerWatts Int?`, `structuredSteps Json?`, `goalId`, `order Int @default(0)`. **No unique constraints on Workout today.**
- `StructuredWorkoutV2` (Web/src/lib/plans/structured.ts:7): `{ version: 2, source: 'engine'|'builder'|'editor'|'progression'|'template'|'mcp', steps: StepNode[] }`; `StepNode = StructuredStep | RepeatGroup`; `StructuredStep.kind: 'warmup'|'work'|'recovery'|'cooldown'|'steady'|'transition'`, optional `duration: Duration`, `target: Target`, `cadenceRpm`, `label`, `note`; `RepeatGroup = { kind: 'repeat', times: 1..100, setRest?: Duration, steps: StepNode[] (depth ≤ 3), label? }`; `Duration = { type:'time', seconds:1..86400 } | { type:'distance', meters:1..100000 } | { type:'lap_press' }`; power target `{ type:'power', minWatts?, maxWatts?, ftpPercent?, zoneLabel? }`, free target `{ type:'free' }`. Zod: `structuredWorkoutV2Schema` (:188).
- `createSnapshot(goalId, description?, operation?)` — Web/src/lib/plan/snapshot.ts:4. MCP mutation convention: `createSnapshot` BEFORE mutation, `evaluatePlanSafety(goalId)` (Web/src/lib/mcp/safety.ts:35) after, return `{ success, safetyAdvisory }`.
- `invalidateUserDashboardCache(userId)` — Web/src/lib/redis.ts:127.
- MCP personal server: `Web/src/app/mcp/route.ts`, `paidMcpServer` (:1546), 16 tools registered ~:1551-1568, auth via `authenticatePaidUser` (:1575). Public server is separate (`mcp/public/route.ts`) — do NOT add there.
- Existing MyWhoosh surface (do not duplicate): `User.matchToMyWhoosh`, `mywhooshMatcher.ts` + `Web/src/data/mywhoosh_workouts.json` (7 workouts, local catalog), `zwoExporter.ts` (`generateMyWhooshZwoXml`, bike), `zwo-export.ts` (`workoutToZwo`), dashboard `.zwo` download in `WorkoutScheduleCard.tsx:137-160`. **No ZWO parsing exists anywhere** (Task 3 adds it).
- Latest migration: `20261015000000_add_user_effective_vo2max_match_mywhoosh`. `schema.prisma` is otherwise clean at HEAD `97b2f73c`.
- Route-test convention: co-located `__tests__/route.test.ts`, `/** @jest-environment node */` docblock, per-file `jest.mock('@/auth')`, `jest.mock('@/lib/db')` with per-model `jest.fn()`s, `jest.mock('@/lib/rateLimit')`; invoke handlers directly with `new NextRequest(...)`. Models: `plan-advanced/[goalId]/csv/import/__tests__/route.test.ts`, `mcp/public/__tests__/route.test.ts`.
- Android: Retrofit interface `RunFlowApi` (Api.kt:744), kotlinx-serialization DTOs, Bearer auth via NetworkClient interceptor. `SyncManager.pullPlans()` upserts server goals/workouts automatically. SettingsScreen has `SettingSection("Data sources")` (:457, Strava pattern) and `SettingSection("Cycling")` (:368, matchToMyWhoosh toggle).

## MyWhoosh API reference (community-documented, unofficial)

- Login: `POST https://services.mywhoosh.com/http-service/api/login` body `{ Username, Password, Platform: "Android", Action: 1001, CorrelationId: <uuid4>, DeviceId, Authorization: "" }` → `{ WhooshId, AccessToken (JWT), RefreshToken?, Success }`.
- Player: `POST https://services.mywhoosh.com/http-service/v1/player/player-data` body `{ WhooshId, Action: 1052, CorrelationId, DeviceId, Authorization: "" }`, Bearer header → `PlayerDataStruct.PlayerPersonalStruct.FtpPlayer`, `PlayerDataStruct.PlayerProfileStruct.CurrentAITrainingplanId`.
- Calendar: `GET https://service14.mywhoosh.com/v1/task/date-range-task-list?startDate=<epoch_s>&endDate=<epoch_s>` → `data.taskList[]` with `TaskId, TaskType ("E_Simple_Workout"|"E_Event"|…), TaskTypeId (workout id), TaskStartedTimeEpoc, TaskEndEpochTime, TaskName, TaskDescription, TSS, SportMode ("E_Cycling"|"E_Running")`.
- Catalog URLs: `GET https://services.mywhoosh.com/http-service/v1/game/game-title-data` → `MyWhooshWorkoutsZipURL`, `MyWhooshTrainingPlansZipURL` (pre-signed CDN ZIPs, 600 s expiry).
- Custom workouts: `GET/POST https://coaching.mywhoosh.com/api/v2/client/custom-workout-upload[/{whooshId}]`; GET returns `{ workoutZipUrl }` (S3 ZIP of JSONs); POST body has `WorkoutsData[]` items `{ Id, Name, Description, Mode, ERGMode, FTPMode, DisplayType: "E_byWatts", Type: "E_Custom", TSS, IF, KJ, WorkoutStepsArray[] }`; step `{ Id, Pace, IntervalId, WorkoutMessage, Rpm, StepType ("E_Normal"|"E_WarmUp"|"E_CoolDown"|"E_FreeRide"), Power (FTP fraction), StartPower, EndPower, Time (s), FlatRoad }`.
- Schedule: `POST https://service14.mywhoosh.com/v1/task/create` with `TaskType: "E_Simple_Workout"`, `TaskTypeId` (workout id), `TaskStartedTimeEpoc`, `TaskEndEpochTime`, `TaskName`, `TaskDescription`, `TSS`, `SportMode: "E_Cycling"`.
- **No token-refresh endpoint is documented.** Parse JWT `exp` for display only.
- All hosts must be treated as unstable: every client call maps failures to `MyWhooshApiError`/`ApiError.externalService`; never crash the route.

## Mapping rules

**Phases (week-index heuristic — plans vary, do not assume 5×4):** with `weekIndex` (0-based from earliest synced task) and `totalWeeks`: ratio `w = weekIndex / max(totalWeeks,1)` → `<0.2 BASE`, `<0.4 ENDURANCE`, `<0.6 BUILD`, `<0.8 PEAK`, `<0.95 TAPER`, else `RACE_WEEK`.

**Steps (MyWhoosh/`.zwo` → StepNode):**

| Source | kind | duration | target |
|---|---|---|---|
| `E_WarmUp` / `<Warmup>` | `warmup` | time | power, `ftpPercent: round(((StartPower+EndPower)/2)*100)`, min/max watts from FTP |
| `E_Normal` Power<0.85 / `<SteadyState>` | `steady` | time | power `ftpPercent: round(Power*100)` |
| `E_Normal` Power≥0.85 | `work` | time | power `ftpPercent: round(Power*100)` |
| `E_Ramp` / `<Ramp>` | `warmup` if avg<0.75 else `work` | time | power avg ftpPercent + min/max |
| `E_CoolDown` / `<Cooldown>` | `cooldown` | time | power avg ftpPercent |
| `E_FreeRide` / `<FreeRide>` | `steady` | time | `free` |
| `IntervalId>0` / `<IntervalsT>` | `repeat` group: work step (`work`, On power) + recovery step (`recovery`, Off power), `times: Repeat`, time durations | | |

`Rpm > 0` → `cadenceRpm`. Every produced workout passes `structuredWorkoutV2Schema.parse`.

**Workout classification:** `E_Running` → sport `RUN`, type by name regex (`/long/i→LONG_RUN`, `/tempo/i→TEMPO`, `/interval|vo2/i→INTERVALS`, `/recovery/i→RECOVERY`, `/race|event/i→RACE`, default `EASY`). `E_Cycling`/default → sport `BIKE`; `RIDE_INTERVALS` if any work step ≥90% FTP or IF ≥0.88; else `LONG_RIDE` if duration ≥5400 s and IF <0.80; else `RIDE`. `E_Event` → `RACE`.

---

### Task 1: Prisma schema + migration

**Files:** Modify `Web/prisma/schema.prisma` (User model ~:11-92, Workout ~:590-639); Create `Web/prisma/migrations/20261020000000_add_mywhoosh_connection/migration.sql`.

**Interfaces (produces):** Prisma models `MyWhooshConnection` (fields below) and `Workout.externalSource/externalId/externalFingerprint` + `@@unique([goalId, externalSource, externalId])`, regenerated client in `src/generated/prisma`.

- [ ] Add to schema.prisma:

```prisma
model MyWhooshConnection {
  id                    String    @id @default(cuid())
  userId                String    @unique
  whooshId              String    @unique
  email                 String?
  encryptedAccessToken  String    @db.Text
  encryptedRefreshToken String?   @db.Text
  encryptedPassword     String?   @db.Text
  tokenExpiresAt        DateTime?
  deviceId              String
  rememberCredentials   Boolean   @default(false)
  autoSyncCalendar      Boolean   @default(true)
  pushRunFlowWorkouts   Boolean   @default(false)
  syncFtp               Boolean   @default(false)
  lastSyncedAt          DateTime?
  lastSyncedTaskIds     Json?
  hiddenTaskIds         Json?
  pushedWorkoutIds      Json?
  activePlanId          String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

On `User`: `myWhooshConnection MyWhooshConnection?`. On `Workout`: `externalSource String?`, `externalId String?`, `externalFingerprint String?`, and `@@unique([goalId, externalSource, externalId])` (keep existing `@@index` lines).

- [ ] Write `migration.sql` following the style of `20260910100000_add_goal_import_idempotency` (Prisma-standard `CREATE TABLE`/`CREATE INDEX`/`ALTER TABLE`; `TIMESTAMP(3)`, `BOOLEAN NOT NULL DEFAULT`, `TEXT`; unique index names `MyWhooshConnection_userId_key`, `MyWhooshConnection_whooshId_key`, `Workout_goalId_externalSource_externalId_key`; FK `ON DELETE CASCADE ON UPDATE CASCADE`).
- [ ] `cd Web && npx prisma generate` (must succeed; client lands in `src/generated/prisma`).
- [ ] If a local Postgres is reachable (`docker ps` — look for the dev container), also run `npx prisma migrate deploy`; if not, note it in the final report (dev/prod apply stays manual, as with previous rounds).
- [ ] Gate: `cd Web && npx tsc --noEmit`. Commit: `feat(mywhoosh): MyWhooshConnection model + Workout external ids (schema + migration)`.

### Task 2: `Web/src/lib/mywhoosh/types.ts` + `client.ts`

**Files:** Create `Web/src/lib/mywhoosh/types.ts`, `Web/src/lib/mywhoosh/client.ts`, `Web/src/lib/mywhoosh/__tests__/client.test.ts`.

**Interfaces (produces, exact):**

```ts
// types.ts
export interface MyWhooshLoginResult { whooshId: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }
export interface MyWhooshPlayerData { ftpWatts: number | null; activeTrainingPlanId: string | null }
export interface MyWhooshTask { taskId: string; taskType: string; taskTypeId: string | null; name: string; description: string | null; startEpochSeconds: number; endEpochSeconds: number; tss: number | null; sportMode: string }
export interface MyWhooshStepFile { stepType: string; power: number | null; startPower: number | null; endPower: number | null; timeSeconds: number | null; rpm: number | null; intervalId: number | null }
export interface MyWhooshWorkoutFile { id: string; name: string; description: string | null; tss: number | null; intensityFactor: number | null; durationSeconds: number | null; steps: MyWhooshStepFile[] }
export interface MyWhooshSyncOutcome { goalId: string; created: number; updated: number; keptLocalEdits: number; tombstoned: number; unresolvedWorkouts: number; pushed: number; ftpApplied: boolean }

// client.ts
export class MyWhooshApiError extends Error { constructor(message: string, readonly status: number) }
export async function loginToMyWhoosh(email: string, password: string, deviceId: string): Promise<MyWhooshLoginResult>
export async function fetchMyWhooshPlayerData(accessToken: string, whooshId: string, deviceId: string): Promise<MyWhooshPlayerData>
export async function fetchMyWhooshCalendarTasks(accessToken: string, startDate: Date, endDate: Date): Promise<MyWhooshTask[]>
export async function fetchMyWhooshWorkoutCatalogs(accessToken: string, whooshId: string): Promise<Map<string, MyWhooshWorkoutFile>>
export async function pushWorkoutToMyWhoosh(accessToken: string, whooshId: string, workout: { id: string; name: string; description: string; tss: number; intensityFactor: number; steps: MyWhooshStepFile[] }, scheduledAt: Date, durationSeconds: number): Promise<{ workoutId: string; taskId: string }>
```

- [ ] `loginToMyWhoosh`: POST login endpoint, `AbortSignal.timeout(10_000)`, `CorrelationId: crypto.randomUUID()`; parse JWT `exp` (base64-decode payload segment, `exp * 1000`) — tolerate missing/garbage exp → `null`. Non-2xx or `Success !== true` → `MyWhooshApiError`. Never log password/tokens.
- [ ] `fetchMyWhooshCalendarTasks`: GET with epoch-second params; accept missing `data.taskList` as `[]`; map snake/Pascal fields to `MyWhooshTask`.
- [ ] `fetchMyWhooshWorkoutCatalogs`: GET `game-title-data` → download `MyWhooshWorkoutsZipURL` (bound 64 MB) AND coaching custom-workout ZIP (bound 10 MB); unzip **in-memory** using `fflate` (check `Web/package.json` first; if absent, add `fflate` — zero-dep, works in Node) with per-entry size cap 8 MB; parse each JSON entry defensively (`unknown` + narrowing; tolerate heterogeneous shapes, skip unparseable entries). Key = MyWhoosh workout id (string). Failures of the *custom* ZIP are non-fatal (return what resolved + log count); failure of the catalog ZIP → degrade to empty map (sync treats all as unresolved) rather than throwing.
- [ ] `pushWorkoutToMyWhoosh`: POST custom-workout-upload with `WorkoutsData[workout]`, then POST `task/create` (`TaskStartedTimeEpoc: floor(scheduledAt/1000)`, `TaskEndEpochTime` = start + duration, `SportMode: "E_Cycling"`).
- [ ] Tests (mock global `fetch`): login success parses tokens + exp; login failure → `MyWhooshApiError` with status; calendar maps task fields; oversized ZIP bound throws `MyWhooshApiError`; **no test may assert on console output containing secrets**.
- [ ] Gates + commit: `feat(mywhoosh): API client for community-documented MyWhoosh endpoints`.

### Task 3: `Web/src/lib/mywhoosh/parser.ts`

**Files:** Create `Web/src/lib/mywhoosh/parser.ts`, `Web/src/lib/mywhoosh/__tests__/parser.test.ts`.

**Consumes:** `types.ts`, `structuredWorkoutV2Schema` + `StructuredWorkoutV2` from `@/lib/plans/structured`, `MyWhooshWorkout` catalog type from `@/lib/plans/mywhooshMatcher` for the static-catalog fallback.

**Interfaces (produces):**

```ts
export function parseMyWhooshStepsToStructuredV2(steps: MyWhooshStepFile[], ftpWatts: number): StructuredWorkoutV2
export function parseZwoXmlToStructuredV2(zwoXml: string, ftpWatts: number): StructuredWorkoutV2
export function classifyWorkoutType(input: { sportMode: string; name: string; steps: StructuredWorkoutV2; durationSeconds: number; intensityFactor: number | null }): { workoutType: WorkoutType; sport: 'RUN' | 'BIKE' }
export function derivePlanPhase(weekIndex: number, totalWeeks: number): PlanPhase
export function computeWorkoutFingerprint(fields: { scheduledDate: Date; workoutType: string; plannedTss: number | null; targetDuration: number | null; targetFtpPercent: number | null; customName: string | null; description: string; structuredSteps: unknown }): string
```

- [ ] `parseMyWhooshStepsToStructuredV2`: implement the mapping table above; group consecutive steps sharing `intervalId > 0` into one `repeat` node (`times` = count of identical work+rest pairs, work step then `recovery` step); clamp to schema limits (duration ≤ 86400, repeat ≤ 100, ≤ 500 expanded steps — reuse `countExpandedSteps`); finish with `structuredWorkoutV2Schema.parse`. Use `source: 'template'`.
- [ ] `parseZwoXmlToStructuredV2`: lightweight bounded parser (input ≤ 5 MB, reject bigger). No new XML dependency: regex-scan `<warmup|<steady_state|<intervals_t|<ramp|<cooldown|<free_ride …>` **and** the MyWhoosh-style camelCase variants `<Warmup|<SteadyState|<IntervalsT|<Ramp|<Cooldown|<FreeRide` with attributes `Duration|Power|PowerLow|PowerHigh|OnDuration|OffDuration|OnPower|OffPower|Repeat|Cadence`. Map per table (ZWO powers are FTP fractions; IntervalsT → repeat node). Validate with the zod schema; throw `ApiError.validation('Invalid .zwo file')`-compatible `Error` on no recognizable tags.
- [ ] `classifyWorkoutType` + `derivePlanPhase`: per rules above (`WorkoutType`/`PlanPhase` types from `@/lib/prisma` re-export or generated client import path used elsewhere — check how existing lib files import enums).
- [ ] `computeWorkoutFingerprint`: stable `sha1` (node:crypto) over the canonical JSON of the given fields (dates as ISO day strings). Used by Task 4 for local-wins detection.
- [ ] Tests (fixtures inline in the test file): (1) MyWhoosh JSON with warmup/steady/ramp/cooldown + Rpm → expected kinds + rounded ftpPercent values; (2) interval group (`IntervalId` repeating) → single `repeat` node with correct `times`, work `ftpPercent: 95`, recovery `65`; (3) round-trip: run `generateMyWhooshZwoXml` output (hardcode a small sample in the fixture) through `parseZwoXmlToStructuredV2` and assert recovered steps; (4) `<IntervalsT Repeat="5" …>` → repeat node times 5; (5) `<FreeRide>` → steady + free target; (6) classification table incl. `RIDE_INTERVALS` (work ≥ 90% FTP), `LONG_RIDE` (5400 s, IF 0.75), `RIDE` default, running name-based cases; (7) phase heuristic boundaries (0/20%/40%/60%/80%/95%); (8) fingerprint: identical inputs equal, any field change differs; (9) oversize zwo input throws.
- [ ] Gates + commit: `feat(mywhoosh): workout/zwo parsers + classification + fingerprint`.

### Task 4: `Web/src/lib/mywhoosh/sync.ts` (state machine)

**Files:** Create `Web/src/lib/mywhoosh/sync.ts`, `Web/src/lib/mywhoosh/__tests__/sync.test.ts`.

**Consumes:** Tasks 2-3 interfaces, `decryptToken`/`encryptToken`, `createSnapshot`, `invalidateUserDashboardCache`, prisma client import convention used by other libs.

**Interfaces (produces):**

```ts
export interface SyncMyWhooshOptions { startDate?: Date; endDate?: Date; targetGoalId?: string; syncFtp?: boolean; push?: boolean }
export async function syncMyWhooshPlanToRunFlow(userId: string, options: SyncMyWhooshOptions): Promise<MyWhooshSyncOutcome>
```

- [ ] Algorithm (local-wins):
  1. Load `myWhooshConnection` (throw `ApiError.notFound('MyWhoosh not connected')` if absent). Decrypt access token.
  2. Fetch player data + tasks (default window: −7 d … +140 d). On `MyWhooshApiError` status 401: if `rememberCredentials` && `encryptedPassword` → re-`loginToMyWhoosh`, persist re-encrypted tokens, retry once; else throw `ApiError.externalService('MyWhoosh session expired — please reconnect')`.
  3. Build catalog map: `fetchMyWhooshWorkoutCatalogs` merged over the static `mywhoosh_workouts.json` (keyed by numeric id where present).
  4. Resolve goal: `targetGoalId` → verify `goal.userId === userId && deletedAt === null` else `ApiError.notFound` (IDOR-safe). Else create Goal `{ sport: TRIATHLON, creationMode: CSV_IMPORT, planSource: 'mywhoosh-sync', name: 'MyWhoosh Training Plan', description: 'Synced from MyWhoosh calendar', startDate: earliest task date, targetDate: latest }` inside the transaction.
  5. `await createSnapshot(goalId, 'Before MyWhoosh sync', 'mywhoosh_sync')` (skip snapshot for brand-new goal — nothing to snapshot; follow plans/import precedent which snapshots after creation instead).
  6. Map tasks → workout payloads (name, description, `scheduledDate` from `TaskStartedTimeEpoc`, `plannedTss: TSS`, `targetDuration` from start/end, `structuredSteps` from catalog via parser — count `unresolvedWorkouts` when `taskTypeId` not in catalog or parse fails, then omit steps; `workoutType`/`sport`/`phase` from Task 3 helpers; `externalSource: 'mywhoosh'`, `externalId: taskId`, `externalFingerprint: computeWorkoutFingerprint(...)`).
  7. `prisma.$transaction`: per task — skip if taskId ∈ `hiddenTaskIds`; lookup unique `(goalId,'mywhoosh',taskId)`: exists → if `computeWorkoutFingerprint(row)` ≠ `row.externalFingerprint` (user edited) → `keptLocalEdits++`, skip; else update + new fingerprint, `updated++`. Not exists but ∈ `lastSyncedTaskIds` → deletion tombstone: add to `hiddenTaskIds`, `tombstoned++`. Else `create`, `created++`. Cap creates at 500 (excess → `ApiError.validation`).
  8. Update connection: `lastSyncedAt: new Date()`, `lastSyncedTaskIds: taskIds` (that are still in MyWhoosh window), prune `hiddenTaskIds` of ids no longer in window.
  9. `syncFtp` option && player ftp > 0 → `user.update({ ftpWatts })`, `ftpApplied: true` (never lower an explicitly-set manual FTP unless it was itself set by sync — v1: only set when `user.ftpWatts === null`).
  10. `push` option: upcoming 35 d, sport BIKE, `completedAt === null`, `externalSource === null`, workoutId ∉ `pushedWorkoutIds` → `pushWorkoutToMyWhoosh` (id: `runflow-<cuid>`), append `pushedWorkoutIds`, `pushed++`. Push failures are counted+logged, never fail the sync.
  11. `await invalidateUserDashboardCache(userId)`; return outcome.
- [ ] Tests (mock client.ts + prisma + snapshot/redis via jest.mock): double-sync idempotency (second run updates, no duplicates — assert upsert called with same unique key); local edit preserved (row fingerprint ≠ stored → no update); deletion tombstones (task in lastSyncedTaskIds, row gone → hiddenTaskIds grows); unresolved workout degrades (no structuredSteps, counted); 401 with rememberCredentials → re-login retried once; 401 without → externalService error; IDOR: goal of another user → notFound; FTP only set when null; push marks pushedWorkoutIds and skips on second run.
- [ ] Gates + commit: `feat(mywhoosh): local-wins sync state machine`.

### Task 5: `Web/src/app/api/settings/mywhoosh/route.ts`

**Files:** Create route + `__tests__/route.test.ts`.

- [ ] `GET` → `{ connected, whooshId, email, rememberCredentials, autoSyncCalendar, pushRunFlowWorkouts, syncFtp, lastSyncedAt, tokenExpiresAt }` — never tokens/password.
- [ ] `POST` zod `{ email: z.string().email(), password: z.string().min(8), rememberCredentials: z.boolean().default(false), autoSyncCalendar: z.boolean().default(true), pushRunFlowWorkouts: z.boolean().default(false), syncFtp: z.boolean().default(false) }`: reuse existing connection's `deviceId` if present else `crypto.randomUUID()`; `loginToMyWhoosh`; store encrypted values (`rememberCredentials` false → do not store password even if column exists); upsert by userId. MyWhoosh failure → `ApiError.externalService` 502.
- [ ] `PATCH` zod partial of the four booleans; enabling `rememberCredentials` without a stored password → `ApiError.validation` 422.
- [ ] `DELETE` → delete connection. All handlers: `getAuthenticatedUser` + `RATE_LIMITS.settings` + `handleApiError` wrapper.
- [ ] Tests: 401 unauthenticated; GET hides secrets (assert no `encrypted*` keys); POST happy path mocks client; POST bad MyWhoosh creds → 502; PATCH 422 case. Follow route-test conventions (mock `@/lib/mobile/auth`? — check how existing dual-auth routes are tested; mock `@/auth` and `@/lib/mobile/auth` as needed).
- [ ] Gates + commit: `feat(mywhoosh): connection settings route`.

### Task 6: `Web/src/app/api/sync/mywhoosh/route.ts`

**Files:** Create route + `__tests__/route.test.ts`.

- [ ] `POST` zod `{ goalId: z.string().cuid().optional(), daysAhead: z.number().int().min(1).max(140).default(140), daysBack: z.number().int().min(0).max(30).default(7), syncFtp: z.boolean().optional(), push: z.boolean().optional() }` → `syncMyWhooshPlanToRunFlow(userId, { targetGoalId: goalId, startDate, endDate, syncFtp, push })`; returns outcome JSON. `RATE_LIMITS.sync`. Not-connected → 404.
- [ ] Tests: 401; happy path returns outcome; goalId of another user → 404 (mock sync throw); rate limit → 429 after limit.
- [ ] Gates + commit: `feat(mywhoosh): sync trigger route`.

### Task 7: `Web/src/app/api/plan-advanced/[goalId]/mywhoosh/import-files/route.ts`

**Files:** Create route + `__tests__/route.test.ts`.

- [ ] `POST` multipart: `files` (each `.zwo`/`.json`, total ≤ 5 MB, ≤ 100 files) + `startDate` (ISO date). Detect per file: XML header → `parseZwoXmlToStructuredV2`; JSON → narrow `unknown` to `WorkoutStepsArray` entries and map each step object onto `MyWhooshStepFile` (tolerant field access: `StepType/Power/StartPower/EndPower/Time/Rpm/IntervalId`, numbers or null) before `parseMyWhooshStepsToStructuredV2`; else 422 with the offending filename. Cap 500 workouts. Ownership check on goalId, snapshot before (`'Before MyWhoosh file import'`, operation `'mywhoosh_file_import'`), transactional `workout.createMany` with `scheduledDate = startDate + index days`, `externalSource: 'mywhoosh-file'`, `externalId: <file workout id or sha1 of contents>`. Follow `csv/import` multipart handling (formData, bounds, 413s).
- [ ] Tests: 401; wrong owner 404; oversize 413; bad file 422; happy path creates N workouts starting at startDate, snapshot called once.
- [ ] Gates + commit: `feat(mywhoosh): .zwo/.json file import into a plan`.

### Task 8: MCP tool `sync_mywhoosh_training_plan`

**Files:** Modify `Web/src/app/mcp/route.ts` (register as 17th tool on `paidMcpServer`, next to `save_weekly_coaching_summary`), `docs/MCP_API.md`.

- [ ] inputSchema: `{ goalId?: string, daysAhead?: number (1-140, default 140), push?: boolean }`. Handler: load connection — absent → `{ success: false, error: 'mywhoosh_not_connected' }`; call `syncMyWhooshPlanToRunFlow` (merge when `goalId` given + owned, else new goal); return `{ success: true, outcome, safetyAdvisory: await evaluatePlanSafety(goalId) }`. Mutation convention: since the tool both creates goals and mutates existing ones — snapshot only when merging into an existing goal (creation has nothing to snapshot).
- [ ] `docs/MCP_API.md`: tool entry with input/output example (match existing entries' format).
- [ ] Extend `Web/src/app/mcp/__tests__/` — if a paid-server test file exists follow it; otherwise cover via a focused test invoking the registered tool handler with mocked sync + connection (look at how `mcp/public/__tests__` drives JSON-RPC and mirror minimally for one call).
- [ ] Gates + commit: `feat(mcp): sync_mywhoosh_training_plan tool`.

### Task 9: Web UI

**Files:** Modify `Web/src/components/SyncPlatformSelector.tsx`, `Web/src/components/MinimalistPillsMenu.tsx`, `Web/src/components/dashboard/WorkoutScheduleCard.tsx`, `Web/src/app/plan-advanced/components/Toolbar/PlanActionsMenu.tsx`, `Web/src/app/plan-advanced/components/PlanEditorLayout.tsx`; Create `Web/src/components/MyWhooshConnectModal.tsx`, `Web/src/app/plan-advanced/components/CsvImportExport/ZwoImportDialog.tsx`; `Web/DOCUMENTATION.md` §6.

- [ ] `MyWhooshConnectModal`: react-query; states disconnected (email/password/remember toggle → POST), connected (email, token expiry, lastSyncedAt, pref toggles → PATCH, Disconnect → DELETE, "Sync now" with mode radio `new|merge-into-active` (+ active goal picker when merging — fetch `/api/goals` filtered active) → POST `/api/sync/mywhoosh`, outcome summary line: "12 imported · 3 updated · 1 kept local edit"). Follow existing modal styling patterns (Race Timing theme, light+dark).
- [ ] `SyncPlatformSelector`: add MyWhoosh platform card (`available: true`, status from a `GET /api/settings/mywhoosh` query; Connect opens the modal). Entry in `MinimalistPillsMenu` Cycling section: "MyWhoosh account: Connected/Not connected → Manage" opening the same modal.
- [ ] `WorkoutScheduleCard`: when `workout.externalSource === 'mywhoosh'` render a small "MyWhoosh" badge next to the existing match block.
- [ ] `PlanActionsMenu` + `PlanEditorLayout`: "Import .zwo / MyWhoosh files" action (next to 'Import CSV') opening `ZwoImportDialog` (multi-file input accepting `.zwo,.json`, start-date picker, POST multipart to the Task 7 route, on success invalidate the plan query and toast the outcome). Mirror `CsvImportDialog` structure.
- [ ] `Web/DOCUMENTATION.md` §6: three new endpoints with request/response examples.
- [ ] Gate: `npx tsc --noEmit && npm test` (+ `npm run build` is NOT required). Commit: `feat(mywhoosh): web connection UI, sync actions, file import, synced badge`.

### Task 10: Android parity

**Files:** Modify `android/app/src/main/java/com/runflow2/app/data/net/Api.kt`, `android/.../data/repo/RunFlowRepository.kt`, `android/.../ui/screens/SettingsScreen.kt`; `Web/MOBILE_API.md`.

- [ ] Api.kt DTOs (`@Serializable`, field names byte-identical to web JSON): `MyWhooshStatusDto(connected, whooshId, email, rememberCredentials, autoSyncCalendar, pushRunFlowWorkouts, syncFtp, lastSyncedAt: String?, tokenExpiresAt: String?)`, `ConnectMyWhooshRequest(email, password, rememberCredentials, autoSyncCalendar, pushRunFlowWorkouts, syncFtp)`, `UpdateMyWhooshSettingsRequest(autoSyncCalendar?, pushRunFlowWorkouts?, syncFtp?, rememberCredentials?)`, `MyWhooshSyncRequest(goalId: String?, daysAhead: Int = 140, push: Boolean = false)`, `MyWhooshSyncResponse(goalId, created, updated, keptLocalEdits, tombstoned, unresolvedWorkouts, pushed)`. Endpoints on `RunFlowApi`: `@GET("/api/settings/mywhoosh")`, `@POST("/api/settings/mywhoosh")`, `@PATCH("/api/settings/mywhoosh")`, `@DELETE("/api/settings/mywhoosh")`, `@POST("/api/sync/mywhoosh")`.
- [ ] SettingsScreen "Data sources" section, MyWhoosh column (mirror the Strava column pattern): status line, Connect (AlertDialog with email/password fields + remember switch), Sync now (`MyWhooshSyncRequest(goalId = null)` then trigger `syncNow("mywhoosh")` to pull the new goal), Disconnect. Offline mode: section hidden when `!auth.loggedIn`, like Strava.
- [ ] Repository wiring in `RunFlowRepository` (thin suspend passthroughs, error mapping consistent with existing calls).
- [ ] `Web/MOBILE_API.md`: document the two endpoints for mobile clients.
- [ ] Gates (AGENTS.md): `./gradlew :app:compileDebugKotlin` + `./gradlew testDebugUnitTest`. Commit: `feat(android): MyWhoosh connect + sync parity`.

### Task 11: Wrap-up

- [ ] Full gates: Web `tsc --noEmit` + full `npm test`; Android compile + unit tests. Zero failures.
- [ ] `Web/RELEASE_NOTES.md`: new section for the MyWhoosh sync feature (follow file's existing format).
- [ ] Final review of the whole diff range (`git log 97b2f73c..HEAD`) — security pass: no secrets logged, tenant isolation on every route, bounds enforced.
- [ ] Commit: `docs(mywhoosh): release notes + wrap-up`.

## Execution protocol (per task)

Implementer subagent gets: this whole plan + its task + "read the referenced repo files before coding". Reviewer subagent gets: the task section + `git diff HEAD~1` + checklist: spec compliance, CODING_STANDARDS (no `any`, naming, auth on every handler), secrets/bounds/IDOR, type consistency with the Interfaces blocks, test quality (asserts behavior not implementation). FAIL → back to implementer with the issue list. All task gates must pass before commit.
