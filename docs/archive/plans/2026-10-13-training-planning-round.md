# Training Planning Round — Master Plan for the Feature Run

Status: PLAN ONLY (2026-10-13). No code has been changed. A later workflow run executes this; a **separate bug-fix run owns the audit §5 bug list** — do not duplicate it. Inputs: `docs/planning-audit-2026-10-13.md` (facts + file:line anchors), `docs/structured-workout-schema-v2-design.md` (the spec A2 implements).

## Execution constraints (binding for every task)

1. **Exclusion zone** (plan-builder run handoff): onboarding step routing, delete-plan UX/endpoints, anything VO2max/VDOT/prediction/marathon-shape, `UserMetricsProvider`, `/api/analytics/stats` + `/api/mobile/v1/analytics/stats`, the VO2max persistence block in `strava/sync.ts`, Android analytics caching. Read-only where unavoidable; never edit.
2. **Sequence**: start only after the plan-builder run's final commits (`fix: address final review findings`, `fix(web): repair failing tests`, `fix(web): repair production build` if they land) AND the bug-fix run have settled. One writer per working tree.
3. **If the bug-fix run has NOT landed** before this run: A2/A3 still proceed (they touch the payload/UI layer, not route whitelists); rebase-awareness applies — read files fresh before editing.
4. Gates: web tasks `npm --prefix Web test` (jest 29; UI tasks additionally `npm --prefix Web run build`); Android tasks `android/gradlew -p android testDebugUnitTest --console=plain` (covers `:app:compileDebugKotlin`). Green at base.
5. Git hygiene: never `git add -A`/`git add .` (untracked: `.zcodeignore`, `screenshots/`, `web-redesign-proposals.html`, `docs/planning-audit-2026-10-13.md`, this file, the schema doc); stage only files you changed; never push, never tag; never revert/amend commits you didn't create.
6. **No Prisma migrations** (no local Postgres). Live-computed metrics + existing columns/JSON only. If a migration seems unavoidable: stop and escalate.
7. Style: Web = 4-space indent, single quotes, Race Timing design system (glass-card, btn-*, Archivo/Plex Mono, light AND dark); Android = existing Compose patterns, `Format.kt` utilities for pace display (never homemade unit math).
8. Per task: implement → commit with the exact subject below → gate (≤2 fix rounds) → independent review (lenses named per task, ≤2 fix rounds with re-check by the same reviewer). Reviewers read code, never edit, never run the full suites. Subagents on GLM-5.3-Flash (established project practice); escalated findings go to the main model.

---

## Workstream A′ — schema v2, view, editor, guided player v2

### A2 — `feat(web): structured workout schema v2 — ranges, nested repeats, lap press, power targets`
Gate: web (jest). Lenses: functionality, security.
Implement `docs/structured-workout-schema-v2-design.md` exactly:
1. New `Web/src/lib/plans/structured.ts`: types, zod, `parseStructuredWorkout` (all four shapes, parse order per the design), `serializeStructuredWorkout`, `convertPace`.
2. Engine emission wraps existing step output as v2 (`lib/plans/index.ts` structuredSteps construction + enrichment sites) — **training numbers byte-identical**: a generated plan before/after must yield the same paces/durations (test pins this).
3. `progression/apply/route.ts:105-111` writes v2 `source:'progression'` (ends the orphan-shape data loss; renderers stop seeing unparsed payloads).
4. Renderers consume the v2 model: `plannedTss.ts` summation (progression steps no longer sum 0), ZWO export path, workout serializers.
5. Jest: fixtures for all three legacy shapes parse to correct v2; v2 round-trips; invalid v2 rejected (depth>3, times>100, pace min>max); legacy fixtures still render (backward-compat proof).

### A3 — `feat(web): evolve /plan week list — workout detail sheet, copy/paste week, advanced-builder drag`
Gate: web-ui (jest + build). Lenses: functionality, UX. (User decision: evolve the week list — NOT a calendar-grid rebuild.)
1. **Workout detail sheet** on `/plan` (side sheet or existing modal pattern): full step tree from v2 (nested repeats indented with ×N, set rest shown), per-step targets with ranges in sport-aware units via existing format utilities (`plan/utils.ts` formatPace/formatSwimmingPace), per-step + workout notes, small pure-CSS/SVG intensity profile (height = intensity proxy from target).
2. **Inline editor entry**: from the detail sheet into the A4 editor (replaces the coarse-only `EditWorkoutModal.tsx` path for structured workouts — keep the modal for unstructured ones).
3. **Copy/paste week**: copy week → paste onto another week (workouts shift by the day-offset between the weeks; skip target week's already-occupied days with a toast listing skips); endpoint modeled on the existing bulk route conventions; TanStack invalidation with REAL keys (grep them).
4. **Wire plan-advanced's vestigial drag**: `WorkoutListPanel.tsx:34` `dragId` + GripVertical — add dnd-kit (pattern from `plan/page.tsx:52-57,121-140`) for reorder/move-day inside the advanced builder, reusing the same PATCH endpoint.
5. Jest: week paste date-offset math (month/year boundaries), detail-sheet render of all four payload shapes via the v2 parser.

### A4 — `feat(web): structured workout editor v2 — time steps, custom paces, nested repeats, notes`
Gate: web-ui. Lenses: functionality, UX.
1. Rewrite `components/Editor/StructuredWorkoutEditor.tsx` on the v2 model: step list with add/edit/delete/reorder; step kinds; **nestable repeat groups** (×N, set rest); duration editors (time hh:mm:ss, distance + unit, lap-press); target editors — pace RANGE in athlete units (min/km or min/100m by sport, stored canonical per design), HR (zone or bpm range), RPE, free, **power watts range (visible for bike-sport workouts)**; per-step label + note.
2. Letters become an input affordance (E/M/T/I/R chips fill numeric values from `calculateTrainingPaces(vdot)`), never stored.
3. Live preview: intensity bars + running totals (time/distance) incl. repeat expansion; validation errors inline per step; save writes canonical v2 via the existing PATCH path; dirty-state guard with `ConfirmDialog` (`components/ui/ConfirmDialog.tsx`); sonner toasts both ways; busy states.
4. Reachable from BOTH the A3 detail sheet and `WorkoutDetailPanel.tsx` (replace its embedded editor); type gate widened beyond INTERVALS/REPETITION/TEMPO/FARTLEK to anything with structure or any sport.
5. Jest: step-tree transforms (add/reorder/nest), totals with repeats, unit round-trips, v2 validation.

### A5 — `feat(android): guided player v2 — per-step enforcement, ranges, repeats, lap press`
Gate: android (gradle). Lenses: functionality.
1. New `domain/plan/structured/` Kotlin model per the design's mapping table + rewrite `StructuredStepsParser.parse` to return it (all four shapes, hrZone mapped not dropped, unknown-field tolerance both directions — old app/new payload must not crash, new app/old payload must still render).
2. **Enforcement**: `PaceZoneEvaluator` receives the ACTIVE step's resolved target (fallback chain: step target → workout target), supports ranges (in-zone iff between min/max; ±10% only when single value), and is sport-aware for units (swim sec/100m never compared as sec/km — fixes audit bug 6's player half; the recalc bug 1 itself belongs to the bug run).
3. `RecordingController`: flatten v2 (nested repeat expansion, set-rest as recovery steps between iterations with "repeat" labels, `lap_press` duration → advance on lap event wired from the service's lap handling); `StepRuntime` carries the v2 target + note.
4. `RecordScreen`: step note under the label; target range displayed as "4:50–5:10 /km" (or /100m) via `Format`; HR-zone steps show "Z3 · 146–162 bpm" **display-only** (no BLE HR — exclusion); power steps show watts range display-only.
5. `PlanScreen` action sheet "Edit intervals" opens `StructuredEditorScreen` upgraded to edit v2 (same capability set as A4 web — time steps, custom paces, nesting, notes; encode via `StructuredWorkoutBuilder` v2).
6. Unit tests: v2 parse fixtures (all shapes), flattening (nested 2×(4×400) expansion counts + set-rest placement), evaluator ranges + sport units, round-trip tolerance. AGENTS.md pre-push checklist before commit.

---

## Workstream C — cycling power data + cycling-specific analytics

### C0 — `docs: cycling power surface map` (read-only task, FIRST in the workstream)
Gate: none (doc artifact). No commit unless docs-only commit desired.
Map with the search list: watts/power/ftp/normalizedPower/intensityFactor/tss/powerCurve/bike/cycling/ride across Web/src, android/app/src/main, prisma schema. Deliver `docs/cycling-power-map-2026-10-13.md` answering: (1) which power fields Strava sync captures (summary? `streams Json?` watts stream? device vs estimated?); (2) any existing FTP/zones/NP/IF/cycling-TSS logic; (3) how rides contribute to fitness load today (trimp from HR? runningTss on rides?); (4) analytics page cycling content; (5) Android watts display; (6) where FTP could be stored WITHOUT a migration (existing settings JSON/column?). Every later C decision cites this map.

### C1 — `feat(web): cycling power foundation — FTP, power zones, NP/IF, cycling TSS`
Gate: web (jest). Lenses: functionality, security (new settings surface).
1. Sync capture per C0 findings: capture all summary power fields Strava provides (avg/weighted/max watts, device-vs-estimated flag if available); fetch watts streams where the existing streams infrastructure allows (NP needs them).
2. **FTP**: storage per C0's no-migration answer; default estimate from best 20-min/functional efforts if history allows (mirror the `bestEffortVdot` *pattern*, not its files — exclusion zone), manual override in settings.
3. `lib/metrics/power.ts` (new, pure): FTP → 7 power zones (Coggan-style percentages, labels consistent with HR zone naming); NP (30 s rolling average → 4th power → average; needs stream; fallback: `weightedAverageWatts` as documented approximation); IF = NP/FTP; cycling TSS = hours × IF² × 100; VI.
4. Ride summaries computed live (the `aerobicVo2max` pattern — never a new column): activity detail payloads + analytics routes expose watts/NP/IF/VI/bikeTss/power-zone distribution. **Cycling-specific load (bikeTss time series) computed live from activities; `DailyFitness` columns untouched** (no migration).
5. Jest: zone boundaries, NP on a known stream fixture, IF/TSS math, FTP override precedence, fallback-approximation flagging.

### C2 — `feat(web): cycling analytics — power trend, zones, cycling load`
Gate: web-ui. Lenses: functionality, UX.
1. Analytics page cycling section (only when ride data exists): power trend (NP/avg watts over time), IF/VI distribution, power-zone time distribution (stacked bars), cycling load chart (bikeTss → bike CTL/ATL/TSB computed live with the `calculateFitnessHistory` pattern), FTP line on power charts.
2. Activity detail: watts block (avg/weighted/NP/IF/VI, device-vs-estimated badge), power-zone bars per ride.
3. Race Timing design system, light AND dark; charts reuse the existing analytics chart components/patterns (no new heavy deps).

### C3 — `feat(android): cycling metrics display`
Gate: android. Lenses: functionality.
1. Activity detail: watts/NP/IF/VI + power-zone distribution for rides (DTO fields from C1's payloads; Room stores what the existing activity sync carries — JSON passthrough preferred over new columns; escalate if a column change looks unavoidable).
2. Personalization/athlete card: FTP + power zones display.
3. Guided/player: power targets from v2 already render per A5; no recording changes.
4. Unit tests: parsing of new fields, zone bucket math parity with web (`lib/metrics/power.ts` expectations duplicated in Kotlin tests).

---

## Workstream B — Dual-MCP ecosystem (corrected plan; runs LAST, after A′/C)

### B1 — `feat(web): public plan-generator MCP /api/mcp/public`
Gate: web (jest). Lenses: security, functionality.
1. `Web/src/app/api/mcp/public/route.ts` (+ OPTIONS via `lib/security/cors.ts` allowlist — NOT `*`): stateless JSON-RPC 2.0 over POST; methods `initialize`, `tools/list`, `tools/call`; shared dispatch in `Web/src/lib/mcp/server.ts`.
2. Tools (all zero-DB): `generate_running_plan` → `@/lib/plans generateTrainingPlan` (zod opens **all 17 RaceType values** incl. ultras/timed/custom — current public route accepts only 12; `fitnessLevel|vdot`, `runsPerWeek`, `raceDate`, `weeklyVolumeKm`); `calculate_vdot_paces` → `lib/metrics/vdot.ts` (race-equivalents + training paces min/km & min/mi); `export_plan_url` → existing `/api/public/plan/export` (csv|html).
3. Rate limit: **10/hour/IP** reusing the `/api/public/plan/generate` pattern (`route.ts:9-13` constant, `getClientIdentifier`) — the pasted plan's "15/hour" was wrong.
4. No session, no DB writes, no user data. Tool descriptions instruct: granular GPS/telemetry belongs to the athlete's own Strava integration, not this server.
5. Jest (`__tests__/route.test.ts`, `/** @jest-environment node */`, mock `@/lib/plans` + `@/lib/rateLimit` per the existing public-route test): unauthenticated works; valid JSON-RPC generates a plan with phases + Daniels paces; unknown method/tool → JSON-RPC error; 429 after threshold.

### B2 — `feat(web): Pro coaching & plan-mutation MCP /api/mcp`
Gate: web (jest). Lenses: security, functionality.
1. `Web/src/app/api/mcp/route.ts` (+ OPTIONS): same dispatch lib. Auth: `Authorization: Bearer rf_...` → `validateApiKey` (`lib/api/externalAuth.ts`); tier gate inline-pattern from `ai-chat/route.ts:22-24` — pass iff `usageTier ∈ {tier2, tier3}` OR `User.isAdmin` (boolean, NOT a tier string); free tier → JSON-RPC error `{"code":-32002,"message":"RunFlow MCP Coaching & Plan Mutation is a Pro feature. Upgrade in your RunFlow settings."}`. Rate: 60/min per API key (Redis w/ in-memory fallback). One key per user (ApiKey model is unique) — documented, no schema change.
2. **Inspection tools** (read-only): `get_athlete_profile` (VDOT + `calculateTrainingPaces` paces, HR zones, units pref; + FTP/power zones when C1 landed); `get_fitness_metrics` (`fitnessCache.getCachedFitnessHistory` → CTL/ATL/TSB + 42-day series + overtraining-risk category); `get_training_plan` (active goal, target time, race date, workouts in window); `get_recent_activities` (**Strava-scrubbed**: for `stravaId != null` activities NEVER return `name`/`description`/`rawJson`/`streams` — only date, distance, duration, avg HR, trimp, runningTss, estimatedVdot, watts/NP/IF from C1; tool description points GPS/telemetry seekers to the official Strava MCP); `get_readiness_and_health` (`DailyReadinessRecord` latest + RHR/sleep trend).
3. **Mutation tools** — every one: `prisma.$transaction`, `createSnapshot(goalId, 'AI coach mutation', 'ai_mcp_mutation')` BEFORE the write (web undo covers AI edits one click), and the response carries the safety advisory. Tools: `reschedule_workout`, `modify_workout` (field whitelist: scheduledDate, workoutType, description, customName, phase, order, notes, targetDistance, targetDuration, targetPace(+Min/Max), targetHrZone(+min/max bpm), intensityZone, structuredSteps **as canonical v2**), `swap_workouts`, `mark_workout_status` (**`isCompleted`/`completedAt`**, not "status"; triggering `adaptPlanAfterCompletion` parity only if the bug run has landed it — otherwise note + skip), `save_weekly_coaching_summary`, `recalibrate_vdot` (goal VDOT + `recalculateWorkoutPaces` — **only after bug-run fixed its swim-unit bug**, else exclude swim-touching recalcs + escalate; then `updateFitnessCache` from affected date).
4. **Safety advisory engine** `lib/mcp/safety.ts` (advisory, never a block; returned as `safetyAdvisory{level, rule, message}` on mutation responses): >10% weekly volume vs previous week AND vs 4-week average; single long run >35% of weekly volume; back-to-back hard days (INTERVALS/TEMPO/REPETITIONS/RACE); projected TSB < −30 via `lib/metrics/fitness.ts` math on the mutated plan.
5. **Weekly coaching summaries**: stored as `PlanSnapshot` rows with `operation:'coaching_summary'`, written directly via prisma (NOT via `createSnapshot` — that retains only the last 50 snapshots per goal and would evict summaries), rendered in the plan header on web: "AI Coach check-in (Week N): …". Zero migration. (A dedicated model is a deploy-window follow-up.)
6. Docs: `docs/MCP_API.md` (both servers: auth, tool schemas, examples, rate limits, Strava-compliance note) + PLAN_GENERATION_API pace-unit correction belongs to the bug run, not here.
7. Jest: 401 missing/invalid key; 403-shaped JSON-RPC error for tier1/none; 200 + tool execution for tier2/tier3/isAdmin; 60/min limit; scrubbing proof (no name/description/rawJson/streams keys in payload for strava-linked rides); advisory triggers on +24% volume; snapshot row created with operation `ai_mcp_mutation`; past-edit flow; coaching summary saved + listed; `npm --prefix Web run test -- --testPathPattern=mcp` green.

---

## Run recipe (for the later workflow)

Phases: ① C0 power-surface map (read-only) → ② validate schema doc against code (one reviewer, fix doc not code) → ③ A2 → ④ A3 → ⑤ A4 → ⑥ A5 → ⑦ C1 → ⑧ C2 → ⑨ C3 → ⑩ B1 → ⑪ B2 → ⑫ coherence review of the whole diff (exclude the plan-builder + bug runs' commits by subject) → ⑬ browser QA in the docker QA env (`docker start runflow-dev-pg` if stopped; dev server; walk /plan detail sheet → editor → week paste; curl JSON-RPC checks of both MCP endpoints incl. 401/403/429 paths; light+dark screenshots) → ⑭ final gates (jest + build + android) → delivery report artifact. Reuse the plan-builder run's machinery: exact-commit gate (search `git log` by subject, not HEAD equality — concurrent runs interleave), fix rounds bounded at 2, reviewer re-checks, per-path staging, board + report artifacts, escalation over faking.

## Explicitly not covered (record, don't silently skip)

- Guided-workout BLE HR/power recording (display-only targets this round).
- Dedicated `WeeklyCoachingSummary` Prisma model (deploy-window round).
- Live Claude Desktop / Perplexity connector test (owner's manual verification checklist in `docs/MCP_API.md`).
- Production deploy of runflow.schuelken.uk; Playwright e2e; Prisma migrations of any kind.
- The audit §5 bug list + dead-endpoint cleanup (separate bug-fix run).
- Android plan-editor parity beyond the v2 structured editor (week copy/paste on Android, plan-advanced mobile access).
