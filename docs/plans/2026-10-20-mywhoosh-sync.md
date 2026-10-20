# MyWhoosh Workout File Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users import `.zwo` (Zwift/MyWhoosh XML) and MyWhoosh workout-JSON files into an existing RunFlow plan as structured (`StructuredWorkoutV2`) workouts — file-based only, alongside the already-shipped local MyWhoosh catalog matching and `.zwo` export.

**Architecture:** One new pure module `Web/src/lib/mywhoosh/` (types + parsers, zero network I/O), one multipart import route following the existing `csv/import` pattern, and a web dialog next to the existing CSV import in the Advanced Plan Editor. No database changes.

**Tech Stack:** Next.js 15 (App Router), zod 4, Jest 29 (ts-jest), react-query.

## Scope decision (binding, user decision 2026-10-20)

**The unofficial MyWhoosh HTTP API is FORBIDDEN.** No code in this feature may make any network request to `mywhoosh.com`, `service14.mywhoosh.com`, `service20.mywhoosh.com`, `coaching.mywhoosh.com`, or any MyWhoosh CDN host. No account connection, no login, no tokens, no calendar pull, no cloud push, no `MyWhooshConnection` model, no MyWhoosh-specific Prisma changes. Rationale: unofficial-API use risks account bans or other measures from MyWhoosh. The two sanctioned paths are: (1) local file import implemented here; (2) the existing offline catalog matching (`mywhooshMatcher.ts` + `mywhoosh_workouts.json`) and client-side `.zwo` export, which already exist and are untouched.

## Global constraints

- **No `any`** (CODING_STANDARDS.md:332). Use `unknown` + narrowing.
- **No network calls** to MyWhoosh hosts anywhere in this feature (see scope decision).
- **Route convention:** `getAuthenticatedUser(request)` from `Web/src/lib/mobile/auth.ts:130` (dual session+JWT); zod validation; `ApiError` from `Web/src/lib/apiError.ts`; `checkRateLimitAsync(getClientIdentifier(request), RATE_LIMITS.settings)`; goal ownership check `where: { id: goalId, userId }`; `export const dynamic = 'force-dynamic'`. Model route: `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`.
- **Bounds:** total upload ≤ 5 MB, ≤ 100 files, ≤ 500 created workouts; parsed zwo/XML input ≤ 5 MB per file; repeat `times` ≤ 100, nesting ≤ 3, ≤ 500 expanded steps (schema limits).
- **Gates:** `cd Web && npx tsc --noEmit && npm test`. Zero errors/failures before commit.
- **Docs:** endpoint → `Web/DOCUMENTATION.md` §6.
- Commit style `feat(mywhoosh): …` / `test(mywhoosh): …`; stage explicit paths, never `git add -A`.
- Android is explicitly out of scope this round (the plan editor is the web UX; no mobile flow requires the new endpoint).

## Verified repo facts (do not re-derive)

- `Workout` fields (schema.prisma:590-639): `workoutType WorkoutType` (has `RIDE, LONG_RIDE, RIDE_INTERVALS, BRICK, EASY, TEMPO, INTERVALS, LONG_RUN, RECOVERY, …`), `phase PlanPhase @default(BASE)`, `sport String @default("RUN")`, `scheduledDate DateTime`, `description String` (required), `customName String?`, `plannedTss Float?`, `targetDuration Int?` (seconds), `targetFtpPercent Int?`, `targetPowerWatts Int?`, `structuredSteps Json?`, `goalId`, `order Int @default(0)`. No unique constraints; CSV import creates plain rows — this feature does the same.
- `StructuredWorkoutV2` (Web/src/lib/plans/structured.ts:7): `{ version: 2, source: 'engine'|'builder'|'editor'|'progression'|'template'|'mcp', steps: StepNode[] }`; `StructuredStep.kind: 'warmup'|'work'|'recovery'|'cooldown'|'steady'|'transition'`, optional `duration`, `target`, `cadenceRpm`, `label`, `note`; `RepeatGroup = { kind: 'repeat', times: 1..100, setRest?, steps (depth ≤ 3) }`; `Duration = { type:'time', seconds:1..86400 } | { type:'distance', meters } | { type:'lap_press' }`; power target `{ type:'power', minWatts?, maxWatts?, ftpPercent?, zoneLabel? }`; free target `{ type:'free' }`. Zod: `structuredWorkoutV2Schema` (:188), `countExpandedSteps` exported.
- CSV import route (the pattern to mirror): multipart `formData()`, `MAX_CSV_BYTES = 5MB` → 413, row cap → 413, ownership check, `createSnapshot(goalId, 'Before CSV import', 'csv_import')` then transactional bulk create; see `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`.
- `createSnapshot(goalId, description?, operation?)` — Web/src/lib/plan/snapshot.ts:4.
- Existing exporters (do not modify): `zwoExporter.ts` `generateMyWhooshZwoXml` (bike, `<Warmup>/<Ramp>/<SteadyState>/<Cooldown>` + Cadence), `zwo-export.ts` `workoutToZwo`. **No ZWO parsing exists anywhere — this plan adds it.**
- `Web/src/data/mywhoosh_workouts.json` — local 7-workout catalog; `mywhooshMatcher.ts` matches by category/duration. Untouched.
- UI: CSV import action lives in `Web/src/app/plan-advanced/components/Toolbar/PlanActionsMenu.tsx` ('Import CSV') wired via `PlanEditorLayout.tsx` (`onImportCsv`, lazy `CsvImportDialog` from `Web/src/app/plan-advanced/components/CsvImportExport/CsvImportDialog.tsx`).
- Route-test convention: co-located `__tests__/route.test.ts`, `/** @jest-environment node */`, per-file `jest.mock('@/auth')` / `jest.mock('@/lib/db')` / `jest.mock('@/lib/rateLimit')`; call handlers with `new NextRequest(...)`. Model: `csv/import/__tests__/route.test.ts`.

## MyWhoosh/`.zwo` formats (from community docs; files supplied by the user)

MyWhoosh workout JSON (single object or array): `{ Id, Name, Description, TSS, IF, WorkoutStepsArray: [{ Id, StepType ("E_Normal"|"E_WarmUp"|"E_CoolDown"|"E_FreeRide"|"E_Ramp"), Power (FTP fraction, e.g. 0.65), StartPower, EndPower (fractions), Time (seconds), Rpm, IntervalId (grouping key, >0) }] }`.

`.zwo` XML: `<workout_file>` with `<Warmup Duration= PowerLow= PowerHigh= Cadence=>`, `<SteadyState Duration= Power= Cadence=>`, `<IntervalsT Repeat= OnDuration= OffDuration= OnPower= OffPower= Cadence=>`, `<Ramp Duration= PowerLow= PowerHigh=>`, `<Cooldown …>`, `<FreeRide Duration=>`. Powers are FTP fractions. Both snake_case and camelCase tag spellings occur in the wild — accept both.

## Mapping rules

| Source | kind | duration | target |
|---|---|---|---|
| `E_WarmUp` / `<Warmup>` | `warmup` | time | power `ftpPercent: round(((StartPower+EndPower)/2)*100)` |
| `E_Normal` Power<0.85 / `<SteadyState>` | `steady` | time | power `ftpPercent: round(Power*100)` |
| `E_Normal` Power≥0.85 | `work` | time | power `ftpPercent: round(Power*100)` |
| `E_Ramp` / `<Ramp>` | `warmup` if avg<0.75 else `work` | time | power avg ftpPercent |
| `E_CoolDown` / `<Cooldown>` | `cooldown` | time | power avg ftpPercent |
| `E_FreeRide` / `<FreeRide>` | `steady` | time | `free` |
| `IntervalId>0` runs / `<IntervalsT>` | `repeat` node: work step + `recovery` step, `times`, time durations | | |

`Rpm > 0` → `cadenceRpm`. Do **not** compute `minWatts`/`maxWatts` (user-FTP-dependent); store `ftpPercent` only. Every parsed workout passes `structuredWorkoutV2Schema.parse` (clamp durations to ≤ 86400, repeats ≤ 100, expanded steps ≤ 500).

**Classification** (imported workouts): cycling default → sport `BIKE`; `RIDE_INTERVALS` if any work step ≥ 90% FTP or file IF ≥ 0.88; else `LONG_RIDE` if duration ≥ 5400 s and (IF ?? 0) < 0.80; else `RIDE`. `.zwo` files with `<sportType>run</sportType>` → sport `RUN`, type `EASY` (user edits specifics in the editor). Phase defaults `BASE`.

---

### Task 1: `Web/src/lib/mywhoosh/` parser module

**Files:** Create `Web/src/lib/mywhoosh/types.ts`, `Web/src/lib/mywhoosh/parser.ts`, `Web/src/lib/mywhoosh/__tests__/parser.test.ts`.

**Interfaces (produces, exact):**

```ts
// types.ts
export interface MyWhooshStepFile { stepType: string; power: number | null; startPower: number | null; endPower: number | null; timeSeconds: number | null; rpm: number | null; intervalId: number | null }
export interface MyWhooshWorkoutFile { id: string; name: string; description: string | null; tss: number | null; intensityFactor: number | null; durationSeconds: number | null; steps: MyWhooshStepFile[] }

// parser.ts
export function parseMyWhooshStepsToStructuredV2(steps: MyWhooshStepFile[]): StructuredWorkoutV2
export function parseZwoXmlToStructuredV2(zwoXml: string): StructuredWorkoutV2
export function parseMyWhooshWorkoutFile(raw: unknown, fallbackName: string): MyWhooshWorkoutFile  // narrows unknown JSON, throws on garbage
export function classifyImportedWorkout(input: { name: string; xmlSportType?: string | null; steps: StructuredWorkoutV2; durationSeconds: number; intensityFactor: number | null }): { workoutType: WorkoutType; sport: 'RUN' | 'BIKE' }
```

- [ ] `parseMyWhooshStepsToStructuredV2`: mapping table above; consecutive steps sharing `intervalId > 0` collapse into one `repeat` (work step + `recovery` step from the pair's alternating powers); `source: 'template'`; finish with `structuredWorkoutV2Schema.parse`.
- [ ] `parseZwoXmlToStructuredV2`: bounded (≤ 5 MB) lightweight parser, **no new dependencies**: regex-scan both tag spellings (`steady_state|SteadyState` etc.) with their attributes; `IntervalsT` → `repeat`; unknown/absent tags → skip; no recognizable workout tags → throw `Error('Invalid .zwo file: no workout steps found')`. Read `<sportType>` for classification only.
- [ ] `parseMyWhooshWorkoutFile`: narrows ONE JSON object (`WorkoutStepsArray` present) → `MyWhooshWorkoutFile` (id from `Id` or name-hash, `timeSeconds` from `Time`, tolerant nulls). Throws `Error('Not a MyWhoosh workout file')` otherwise.
- [ ] `classifyImportedWorkout`: per rules above. Import `WorkoutType` the same way other `Web/src/lib` files import generated enums (check an existing import first).
- [ ] Tests (fixtures inline): (1) MyWhoosh JSON warmup/steady/ramp/cooldown + Rpm → kinds + rounded ftpPercent (e.g. StartPower 0.5/EndPower 0.68 → 59); (2) `IntervalId` group → single `repeat` with `times`, work 95/recovery 65; (3) round-trip: feed a hardcoded `generateMyWhooshZwoXml`-style sample through the parser and assert recovered steps; (4) `<IntervalsT Repeat="5">` → times 5; (5) `<FreeRide>` → steady + free; (6) snake_case tags parse; (7) classification: work ≥ 90% → RIDE_INTERVALS, 5400 s IF 0.75 → LONG_RIDE, default RIDE, `sportType=run` → RUN/EASY; (8) garbage JSON + tag-less XML throw; (9) oversize XML throws. Assert zod-validity by calling `structuredWorkoutV2Schema.parse` on outputs in happy-path tests.
- [ ] Gate: `cd Web && npx tsc --noEmit` + focused `npm test -- mywhoosh`, full suite once. Commit: `feat(mywhoosh): zwo/MyWhoosh-JSON parsers + classification (file import, no network)`.

### Task 2: Import route `Web/src/app/api/plan-advanced/[goalId]/mywhoosh/import-files/route.ts`

**Files:** Create route + `__tests__/route.test.ts`.

**Consumes:** Task 1 interfaces; `createSnapshot`; csv/import route patterns.

- [ ] `POST` multipart: `files` (each `.zwo` or `.json`, total ≤ 5 MB, ≤ 100 files → else 413) + `startDate` (ISO date string). Per file: XML (`.zwo` extension or `<` first non-space char) → `parseZwoXmlToStructuredV2`; JSON → array or single object → `parseMyWhooshWorkoutFile` per element; anything unparseable → 422 listing the offending filename(s). Flatten to workouts, cap 500 → 413.
- [ ] Map each to a Workout row: `scheduledDate = startDate + index days` (stable order: file order then in-file order), `description` = file description or `"Imported from MyWhoosh/.zwo file <filename>"`, `customName` = workout name, `workoutType`/`sport` from `classifyImportedWorkout`, `phase: BASE`, `plannedTss` = file TSS (else null), `targetDuration` = summed step seconds, `targetFtpPercent` = dominant work/steady step percent (max-duration; null for free rides), `structuredSteps` = parsed V2, `order` = index. NO Prisma schema changes, no external ids.
- [ ] Ownership check on goalId → 404; `createSnapshot(goalId, 'Before MyWhoosh file import', 'mywhoosh_file_import')`; `prisma.$transaction` with `workout.createMany`; return `{ created: n, firstDate, lastDate, filesProcessed: n, rejectedFiles: [] }`.
- [ ] Tests: 401 unauthenticated; 404 wrong owner; 413 oversize/too-many; 422 bad file with filename in message; happy path (mixed 1 zwo + 1 json array of 2) → 3 workouts created with correct dates/targets, snapshot called once. Follow csv/import test mocking.
- [ ] Gates + commit: `feat(mywhoosh): .zwo/.json workout file import route`.

### Task 3: Web UI — file import dialog

**Files:** Create `Web/src/app/plan-advanced/components/CsvImportExport/ZwoImportDialog.tsx`; Modify `Web/src/app/plan-advanced/components/Toolbar/PlanActionsMenu.tsx` (new 'Import .zwo / MyWhoosh files' action beside 'Import CSV'), `Web/src/app/plan-advanced/components/PlanEditorLayout.tsx` (lazy dialog + handler, mirroring `onImportCsv`), `Web/DOCUMENTATION.md` §6.

- [ ] `ZwoImportDialog`: mirror `CsvImportDialog` structure/styling (Race Timing theme, light+dark): multi-file input `accept=".zwo,.json"`, start-date picker (default today), submit → `POST multipart /api/plan-advanced/[goalId]/mywhoosh/import-files`, on success invalidate the plan query and show outcome line ("3 workouts imported · Oct 20 – Oct 22"), on 413/422 surface the message. react-query mutation, no new deps.
- [ ] `Web/DOCUMENTATION.md` §6: endpoint with request/response example.
- [ ] Gate: `npx tsc --noEmit && npm test`. Commit: `feat(mywhoosh): workout file-import dialog in plan editor`.

### Task 4: Wrap-up

- [ ] Full gates: `cd Web && npx tsc --noEmit && npm test` — zero failures. Android untouched (out of scope by decision).
- [ ] `Web/RELEASE_NOTES.md`: feature note (file import; explicitly mention no MyWhoosh account connection).
- [ ] Final whole-branch review of `86ff3f5b..HEAD` (security pass: zero network calls to MyWhoosh hosts, auth on route, bounds enforced).
- [ ] Commit: `docs(mywhoosh): release notes for file import`.

## Execution protocol (per task)

Implementer subagent gets its task brief + this plan's Global Constraints + verified facts. Reviewer subagent gets brief + report + review package and checks: spec compliance, CODING_STANDARDS (no `any`), the no-network-to-MyWhoosh rule, auth/bounds/ownership, test quality. FAIL → fix → re-review. Gates must pass before commit.
