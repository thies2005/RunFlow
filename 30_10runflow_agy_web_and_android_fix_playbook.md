# RunFlow — Agy Web & Android Fix Playbook (30.10 Delta + Full Spec)

> **Purpose**: This playbook is structured specifically for **Agy** running on your laptop.
> - **Part 1 (Web Delta Fixes — 2 Parallel Web Subagents)** resolves the **4 Web issues** shown in your screenshots (`This Week's Workouts` showing 32 workouts & squishing titles to `"SS"`, `This Week Effort` & `4-Week Block` showing `0 / 0 TSS` & `0 / 800 TSS`, `Advanced Plan Analysis` missing TSS graph / Cycling km / blank Projected PMC chart, and `Cycling Plans` showing `"Custom Triathlon"` & getting a `35/100` AI score for having 0 swims/runs).
> - **Part 2 (Android Fixes — 3 Parallel Android Subagents)** contains the complete, verified Android specifications so both Web and Android can be fixed cleanly without file collisions.

---

# Part 1 — Root-Cause Audit of the 4 Web Issues (From Screenshots)

## Issue W1: `"This Week's Workouts"` Shows `10/32 Done` (4 Weeks of Workouts), Compresses Titles to `"SS"`, & Shows `.fit`/`.zwo` Download Clutter
1. **Why 32 workouts (4 weeks) appear in `"This Week's Workouts"`**:
   - In `Web/src/app/api/dashboard/route.ts` (lines 49–50, 118–124), the dashboard endpoint expanded `goal.workouts` from `[weekStart, weekEnd]` to the **4-week mesocycle** (`mesoStart = subDays(weekStart, 7)` to `mesoEnd = addDays(weekEnd, 14)`) so `statsData` could compute the 4-week block TSS.
   - However, `Web/src/app/page.tsx:113` (`const weeklyWorkouts: Workout[] = activeGoal?.workouts || [];`) and `Web/src/app/mobile-layout.tsx:275` pass the entire 4-week `activeGoal.workouts` array (`32` workouts!) directly into `<WorkoutScheduleCard />` without filtering to `[weekStart, weekEnd]`!
2. **Why workout titles are squished to 2 letters (`"SS"`)**:
   - In `Web/src/components/dashboard/WorkoutScheduleCard.tsx`, `TrainingStatusCard` saves `'COMPACT_C'` to `localStorage`, while `WorkoutScheduleCard.tsx:76, 214` checks `workoutCardStyle === 'OPTION_C'`.
   - Worse, inside Option C (`lines 278–349`), every element (`Fri 23` `w-14` + icon `w-6` + `title` `truncate` + `Today` badge + `· 60m` + `· 58 TSS` + `· 195W` + `[Link]` + `[Edit]` + `[✓ Done]`) is crammed onto a **single horizontal flex line**, leaving ~24px for the workout title (`"Sweet Spot"` $\rightarrow$ `"SS"`).
   - **Fix**: Filter `weeklyWorkouts` strictly to the current Monday–Sunday week (`startOfWeek(now, { weekStartsOn: 1 })` to `endOfWeek(now, { weekStartsOn: 1 })`) in `page.tsx`, `mobile-layout.tsx`, and defensively inside `WorkoutScheduleCard.tsx`. Render each pending workout as a clean **2-line row** (Line 1: `EEE d` + Sport Icon + **Full unclipped workout title** + `[✓ Done]`; Line 2: `60m · 58 TSS · 195W` + subtle icon-only `[Link]` and `[Edit]` buttons). Remove `.fit` and MyWhoosh `.zwo` download buttons from `WorkoutScheduleCard`, `WeeklyView`, and `EditWorkoutModal`.

---

## Issue W2: `"This Week Effort"` (`0 / 0 TSS (0%)`, `0m / 0m`) and `"4-Week Block"` (`0 / 800 TSS (0%)`, `W1..W4 = 200T`) Show Zero Data
1. **Why Dashboard `RaceCountdown` shows `0 / 0 TSS` and `0 / 800 TSS`**:
   - `Web/src/app/page.tsx` renders its **own** desktop & mobile dashboard JSX instead of `DashboardView.tsx`!
   - At `Web/src/app/page.tsx:288`, `<RaceCountdown />` is rendered **without passing `statsData={statsData}` or `weeklyWorkouts={weeklyWorkouts}`**:
     ```tsx
     // Web/src/app/page.tsx:288 (BROKEN)
     <RaceCountdown
         goal={planTileGoal}
         goals={goalsData.goals}
         onGoalCreate={() => setIsOnboardingOpen(true)}
         onGoalSelect={...}
     />
     ```
   - Inside `Web/src/components/RaceCountdown.tsx:237–245`, because `statsData` and `weeklyWorkouts` are both `undefined`:
     - `weeklyPlannedTss` = `0`, `weeklyActualTss` = `0`, `weeklyPlannedDurationSec` = `0`, `weeklyActualDurationSec` = `0` $\rightarrow$ renders **`0 / 0 TSS (0%) · 0m / 0m`**!
     - `monthlyPlannedTss` falls back to hardcoded **`800`**, `monthlyActualTss` = `0`, and `W1..W4` fall back to `800 / 4 = 200T`!
2. **Why `/api/dashboard/route.ts` and `GoalTimeline.tsx` (`WEEK 2 EFFORT: 0 / 390 TSS (0%) · 0m / 425m`) show `0` actual TSS/duration even when workouts are marked Done (`10/32 Done`)**:
   - When a user clicks **`✓ Done`** on a workout without linking a Strava activity (or when a linked activity has no `trimp`/`runningTss`/`bikeTss`), `/api/dashboard/route.ts` and `PlanEditorLayout.tsx` only summed TSS from `activities` table (`sumActivityTss(wA)`) and ignored **completed planned workouts (`w.isCompleted === true`)**!
   - And in `Web/src/components/PlanEditor/PlanEditorLayout.tsx:434–442`, `<GoalTimeline />` is rendered without passing `currentWeekEffort` or `blockWeeksBreakdown` (or computing actual effort from `w.isCompleted` + `w.linkedActivity`)!
   - **Fix**:
     1. Pass `statsData={statsData}` and `weeklyWorkouts={weeklyWorkouts}` into `<RaceCountdown />` in `Web/src/app/page.tsx` AND `Web/src/app/mobile-layout.tsx`.
     2. In `/api/dashboard/route.ts`, `RaceCountdown.tsx`, and `PlanEditorLayout.tsx`, compute `actualTss` and `actualDurationSec` for any week as the union of:
        - Linked/unlinked `Activity` rows in that week, **PLUS**
        - Any workout in that week with `w.isCompleted === true` that does **not** already have a counted `Activity` in that week (using `w.linkedActivity` metrics if present, else falling back to `w.plannedTss ?? estimateWorkoutTss(w)` and `w.targetDuration ?? 0`). That way, marking a workout `✓ Done` immediately updates **This Week Effort**, **4-Week Block**, and **WEEK X EFFORT** in `GoalTimeline`!

---

## Issue W3: Advanced Plan (`/plan-advanced/[goalId]`) Analysis Tab — Blank Projected PMC Graph, Missing Weekly TSS Graph, & Missing Cycling KM Graph
1. **Why `Projected Performance Management Chart (PMC)` (and other charts) render blank in `AnalysisView.tsx`**:
   - Look at `Web/src/components/LazyChartWrapper.tsx:47`:
     ```tsx
     <div ref={ref} style={{ minHeight: height }} className="w-full flex items-center justify-center">
     ```
   - Inside `Web/src/components/PlanEditor/AnalysisView.tsx:178–179`, `<LazyChartWrapper height="18rem">` wraps `<ResponsiveContainer width="100%" height="100%">`.
   - In CSS, a child with `height: 100%` inside a flex parent that only has `min-height: 18rem` (and **no explicit `height`**) resolves `height: 100%` to **`0px`**!
   - Furthermore, in `Web/src/app/api/plan-advanced/[goalId]/planned-fitness/route.ts:70–79`, the `DailyFitness` query selects `{ date: true, trimp: true, runningTss: true }` and **omits `bikeTss: true, ctlBike: true, atlBike: true`**, and filters `workoutType: { not: 'REST' }` without fallback TSS estimation for cycling workouts whose `plannedTss` wasn't backfilled.
2. **Why `Weekly Running Volume` and `Long Run Progression` are empty on Cycling Plans, and why TSS + Cycling KM are missing**:
   - `AnalysisView.tsx` hardcodes `Weekly Running Volume` and `Long Run Progression` at the top of the page and has **no Weekly TSS chart** and **no Weekly Cycling Volume (km) chart**.
   - **Fix**:
     1. In `LazyChartWrapper.tsx:47`, set `style={{ height, minHeight: height }}` and give the inner wrapper `className="w-full h-full"` so `<ResponsiveContainer width="100%" height="100%">` always gets a concrete pixel height.
     2. In `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts` and `Web/src/components/PlanEditor/AnalysisView.tsx` (and `Web/src/app/plan-advanced/[goalId]/components/Analysis/AnalysisView.tsx`):
        - Add **`Weekly TSS Progression (Planned vs. Completed TSS)`** chart (`weeklyTssProgression(weeks)` showing weekly `plannedTss`, `completedTss`, and modality breakdown).
        - Add **`Weekly Cycling Volume (km & hours)`** chart (`weeklyCyclingVolume(weeks)`): uses `w.targetDistance / 1000` when `targetDistance > 0`, and for duration-based indoor rides (like MyWhoosh/Zwift workouts where `targetDistance` is `null` or `0`), estimates equivalent road distance from `targetDuration` and intensity (`(targetDuration / 3600) * estimatedSpeedKmh`, where `estimatedSpeedKmh` scales from `28 km/h` Z1/Z2 to `33 km/h` Sweet Spot/FTP) clearly labeled in tooltip as distance / eq. km!
        - Add **`Cycling Power Zone Distribution`** chart (`powerZoneDistribution(workouts)`) for cycling plans, and **auto-hide** `Weekly Running Volume` / `Long Run Progression` when the plan has zero running workouts (`volumeData.every(d => d.km === 0)` and `hasBikeWorkouts === true`).

---

## Issue W4: Cycling Plans Handled Poorly (`"Custom Triathlon"` Badge & AI Plan Analysis `35/100 "Needs Work — zero swimming and zero running"`)
1. **Root Cause**:
   - Prisma's `PlanSport` enum only has `RUN` and `TRIATHLON`, so cycling plans (such as `"MyWhoosh Cycling & Strength Plan"`) are stored with `sport: 'TRIATHLON'` and `raceType: 'CUSTOM_TRI'`, with `runsPerWeek: 0` and `swimsPerWeek: 0`.
   - `RaceCountdown.tsx:294` formats `CUSTOM_TRI` as `"Custom Triathlon"`.
   - `/api/plan-advanced/[goalId]/ai-analysis/route.ts:88` sends `Sport: TRIATHLON | Race Type: CUSTOM_TRI` to the AI with a system prompt for a `"running and triathlon coach AI"`, causing the AI to give the plan **35/100 ("Needs Work")** because *"It contains zero swimming and zero running sessions"*!
2. **Fix**:
   - Create a shared helper `detectEffectivePlanSport(goal, workouts)` in `Web/src/lib/plan/sportDetection.ts` that returns `'CYCLING' | 'TRIATHLON' | 'RUN'`:
     - Returns `'CYCLING'` when `/cycling|bike|mywhoosh|zwift|ftp|criterium|gran fondo|velodrome/i.test(goal.name || '')`, OR `(goal.sport === 'TRIATHLON' && (goal.runsPerWeek ?? 0) === 0 && (goal.swimsPerWeek ?? 0) === 0)`, OR when the plan's workouts contain `BIKE` / `RIDE*` workouts and **zero** `RUN` and **zero** `SWIM` workouts.
   - Use `detectEffectivePlanSport` in:
     - `RaceCountdown.tsx` & `PlanEditorLayout.tsx` / `Toolbar.tsx`: display **`"Cycling & Strength"`** (if strength sessions exist) or **`"Cycling Plan"`** with `badge-bike` styling instead of `"Custom Triathlon"`.
     - `/api/plan-advanced/[goalId]/ai-analysis/route.ts`: when effective sport is `'CYCLING'`, switch to an **Expert Cycling & Strength Endurance Coach AI** system prompt, pass `Effective Sport: CYCLING (Dedicated Bike + Strength plan — NO running or swimming expected)`, and include each workout's `customName`, `plannedTss`, `targetPowerWatts`, `targetFtpPercent`, and `structuredSteps` summary in the prompt.

---

# Part 2 — Copy-Paste Execution Prompts for Agy (Web Subagents)

## Web-Agent-1: `web-dashboard-weekly-workouts-and-effort-fix`
**Owned Files (Strict Isolation)**:
- `Web/src/lib/plan/sportDetection.ts` *(new shared helper)*
- `Web/src/app/page.tsx`
- `Web/src/app/mobile-layout.tsx`
- `Web/src/app/api/dashboard/route.ts`
- `Web/src/components/RaceCountdown.tsx`
- `Web/src/components/dashboard/WorkoutScheduleCard.tsx`
- `Web/src/components/EditWorkoutModal.tsx`
- `Web/src/components/WeeklyView.tsx`

### Prompt for `Web-Agent-1`:
```markdown
You are `Web-Agent-1` (`web-dashboard-weekly-workouts-and-effort-fix`). Modify ONLY your assigned files:
- `Web/src/lib/plan/sportDetection.ts` (new file)
- `Web/src/app/page.tsx`
- `Web/src/app/mobile-layout.tsx`
- `Web/src/app/api/dashboard/route.ts`
- `Web/src/components/RaceCountdown.tsx`
- `Web/src/components/dashboard/WorkoutScheduleCard.tsx`
- `Web/src/components/EditWorkoutModal.tsx`
- `Web/src/components/WeeklyView.tsx`

### Task 1: Create `Web/src/lib/plan/sportDetection.ts` for Cycling Plan Detection & Workout TSS Fallback
Create `Web/src/lib/plan/sportDetection.ts` exporting:
1. `detectEffectivePlanSport(goal: { name?: string | null; sport?: string | null; raceType?: string | null; runsPerWeek?: number | null; swimsPerWeek?: number | null; ridesPerWeek?: number | null } | null | undefined, workouts?: Array<{ workoutType?: string | null; sport?: string | null }>): 'CYCLING' | 'TRIATHLON' | 'RUN'`
   - Return `'CYCLING'` if:
     - `/cycling|bike|mywhoosh|zwift|ftp|criterium|gran fondo|indoor ride/i.test(goal?.name || '')`, OR
     - `goal?.sport === 'TRIATHLON' && (goal?.runsPerWeek ?? 0) === 0 && (goal?.swimsPerWeek ?? 0) === 0 && (goal?.ridesPerWeek ?? 0) > 0`, OR
     - `workouts && workouts.length > 0` where at least one workout is a bike workout (`w.sport === 'BIKE' || ['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BIKE_EASY', 'BIKE_TEMPO', 'BIKE_INTERVALS'].includes(w.workoutType || '')`) and ZERO workouts are run or swim workouts (`!workouts.some(w => w.sport === 'RUN' || ['EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'HILL_REPEATS', 'RECOVERY', 'RACE'].includes(w.workoutType || '')) && !workouts.some(w => w.sport === 'SWIM' || (w.workoutType || '').includes('SWIM'))`).
   - Otherwise return `goal?.sport === 'TRIATHLON' ? 'TRIATHLON' : 'RUN'`.
2. `getEffectiveSportLabel(goal: any, workouts?: any[]): { label: string; badgeClass: string }`
   - When `detectEffectivePlanSport(goal, workouts) === 'CYCLING'`:
     - Check if `workouts?.some(w => w.sport === 'STRENGTH' || w.workoutType === 'STRENGTH' || w.workoutType === 'CORE')` or `/strength/i.test(goal?.name || '')`.
     - Return `{ label: hasStrength ? 'Cycling & Strength' : 'Cycling Plan', badgeClass: 'badge-bike' }`.
3. `estimateFallbackWorkoutTss(w: { workoutType?: string | null; targetDuration?: number | null; plannedTss?: number | null; targetPowerWatts?: number | null }): number`
   - If `w.plannedTss != null && w.plannedTss > 0`, return `Math.round(w.plannedTss)`.
   - If `!w.targetDuration || w.targetDuration <= 0 || w.workoutType === 'REST'`, return `0`.
   - Compute hours = `w.targetDuration / 3600`. Use intensity factor by `workoutType`: `INTERVALS` / `RIDE_INTERVALS` = `75 TSS/h`, `TEMPO` = `65 TSS/h`, `LONG_RUN` / `LONG_RIDE` = `55 TSS/h`, `STRENGTH` = `40 TSS/h`, default (`EASY` / `RIDE` / `SWIM`) = `50 TSS/h`. Return `Math.round(hours * rate)`.

### Task 2: Fix `"This Week's Workouts"` Showing 32 Workouts (4 Weeks) & Fix Missing `statsData` on `<RaceCountdown />` in `Web/src/app/page.tsx` and `Web/src/app/mobile-layout.tsx`
1. In `Web/src/app/page.tsx`:
   - Import `startOfWeek, endOfWeek` from `'date-fns'`.
   - Around line 113, `activeGoal.workouts` contains the 4-week mesocycle from `/api/dashboard`. Filter `weeklyWorkouts` strictly to the current Monday–Sunday week:
     ```tsx
     const now = new Date();
     const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
     const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
     const allGoalWorkouts: Workout[] = activeGoal?.workouts || [];
     const weeklyWorkouts: Workout[] = allGoalWorkouts.filter((w) => {
         const d = new Date(w.scheduledDate);
         return d >= currentWeekStart && d <= currentWeekEnd;
     });
     ```
   - Around line 288 (desktop layout) AND line 477 (mobile fallback inside `page.tsx`), pass `statsData={statsData}` and `weeklyWorkouts={weeklyWorkouts}` (and `allGoalWorkouts={allGoalWorkouts}`) to `<RaceCountdown />`:
     ```tsx
     <RaceCountdown
         goal={planTileGoal}
         goals={goalsData.goals}
         statsData={statsData}
         weeklyWorkouts={weeklyWorkouts}
         onGoalCreate={() => setIsOnboardingOpen(true)}
         onGoalSelect={(selectedGoalId) => {
             setSelectedGoalId(selectedGoalId);
             router.push(`/plan?goalId=${encodeURIComponent(selectedGoalId)}`);
         }}
     />
     ```
2. In `Web/src/app/mobile-layout.tsx`:
   - Around line 275, filter `weeklyWorkouts` to `[currentWeekStart, currentWeekEnd]` (`startOfWeek(new Date(), { weekStartsOn: 1 })` to `endOfWeek(new Date(), { weekStartsOn: 1 })`) before passing `weeklyWorkouts` into `<DashboardView />` or `<WorkoutScheduleCard />`.

### Task 3: Fix `/api/dashboard/route.ts` So Completed Workouts (`isCompleted: true`) Always Count Toward Weekly & 4-Week Block Actual TSS & Duration
In `Web/src/app/api/dashboard/route.ts` (lines 185–239):
- Currently, `weeklyActualTss` and `weeklyActualDurationSec` (and `blockWeeksBreakdown` actuals) only sum `activities` from Strava/Health Connect (`sumActivityTss(weeklyActivities)`). When a user marks workouts `✓ Done` on the web dashboard (`isCompleted: true`) without a synced `Activity` row in `activities`, `weeklyActualTss` and `monthlyActualTss` stay `0`!
- Update the weekly and 4-week block actual calculation in `/api/dashboard/route.ts`:
  - Track the set of activity IDs already counted in `weeklyActivities` (`const countedActivityIds = new Set(weeklyActivities.map(a => a.id))`).
  - For any workout `w` in `currentWeekWorkouts` where `w.isCompleted === true` and `(!w.linkedActivityId || !countedActivityIds.has(w.linkedActivityId))`:
    - Add `estimateFallbackWorkoutTss(w)` (using `w.plannedTss` or duration-based TSS estimate) to `weeklyActualTss`.
    - Add `w.targetDuration || 0` to `weeklyActualDurationSec`.
  - Do the exact same thing inside `blockWeeksBreakdown` for each of the 4 mesocycle weeks (`wWorkouts` where `w.isCompleted === true` and not already in `wA`), and update `monthlyActualTss` as the sum of the 4 weeks' `actualTss`!

### Task 4: Fix `RaceCountdown.tsx` Effort Bars, 4-Week Block Pills, & Cycling Plan Badge
In `Web/src/components/RaceCountdown.tsx`:
1. Use `getEffectiveSportLabel(goal, weeklyWorkouts)` from `@/lib/plan/sportDetection`:
   - When the plan is detected as a Cycling plan (`detectEffectivePlanSport(goal, weeklyWorkouts) === 'CYCLING'`), render `"Cycling & Strength"` or `"Cycling Plan"` with `badge-bike` instead of `"Custom Triathlon"`.
2. In the fallback weekly calculations (lines 221–245):
   - Compute `fallbackWeeklyActualTss` and `fallbackWeeklyActualDurationSec` from `weeklyWorkouts.filter(w => w.isCompleted)` using `estimateFallbackWorkoutTss(w)` and `w.targetDuration || 0`.
   - Ensure `weeklyActualTss = Math.max(statsData?.weeklyActualTss ?? 0, fallbackWeeklyActualTss)` and `weeklyActualDurationSec = Math.max(statsData?.weeklyActualDurationSec ?? 0, fallbackWeeklyActualDurationSec)`.
   - Ensure `weeklyPlannedTss = (statsData?.weeklyPlannedTss && statsData.weeklyPlannedTss > 0) ? statsData.weeklyPlannedTss : fallbackWeeklyPlannedTss`.
   - For the 4-week block (`blockWeeks` and `monthlyActualTss` / `monthlyPlannedTss`): if `goal.workouts` is present on `goal`, compute a 4-week fallback breakdown from `goal.workouts` whenever `statsData?.blockWeeksBreakdown` is missing or all zeros, so `"4-Week Block"` never shows a fake `0 / 800 TSS` with `200T` placeholders when real workouts exist!
   - In the 4 mini week pills (`W1..W4`), display `${w.actualTss}/${w.plannedTss}T` when `w.actualTss > 0`, and `${w.plannedTss}T` otherwise.

### Task 5: Fix `WorkoutScheduleCard.tsx` (1-Week Filter, Un-Cramped 2-Line Layout, & Remove `.fit`/`.zwo` Download Buttons)
In `Web/src/components/dashboard/WorkoutScheduleCard.tsx`:
1. **Defensive 7-day filter**: Filter `weeklyWorkouts` via `useMemo` to `[startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })]` so even if a caller passes multi-week workouts, `This Week's Workouts` strictly displays the current week (e.g. `4/8 Done`, never `10/32 Done`).
2. **Fix Style Mode Mismatch**: Treat `'COMPACT_C'`, `'OPTION_C'`, and default as the new clean layout (`const isCompact = workoutCardStyle === 'COMPACT_C' || workoutCardStyle === 'OPTION_C' || true;` — make the clean un-clipped layout the default!).
3. **Fix Compressed Row Layout (No More `"SS"` Truncated Titles!)**:
   - For **completed** (`w.isCompleted`) or **rest** (`w.workoutType === 'REST'`) workouts: render a single compact muted row (`py-2 px-3`) showing `EEE d` (`w-14 shrink-0`), small sport icon, full title (`flex-1 min-w-0 truncate text-xs`), and a green `✓ Done` badge (plus a subtle edit icon on hover).
   - For **pending active workouts**: render a clean **2-line card row** (`py-2.5 px-3 rounded-lg bg-surface/50 border border-glass-border`):
     - **Line 1 (Top Row)**: `EEE d` date label (`text-xs font-medium text-foreground-muted w-14 shrink-0`) + `Today` pill (if today) + Sport Icon (`w-5 h-5 shrink-0`) + **Workout Title** (`customName || description || workoutTypeLabel`, `text-sm font-semibold text-foreground flex-1 min-w-0 break-words leading-snug` — NEVER crushed to 2 characters!) + **`✓ Done`** button (`shrink-0 ml-2 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25`).
     - **Line 2 (Bottom Metadata & Secondary Actions Row, indented `pl-14`)**: Left side shows compact metric pills (`60m` · `58 TSS` · `195W` or target pace/distance in `text-xs text-foreground-muted`); Right side shows compact icon buttons for **Link Activity** (`Link2` icon with tooltip `"Link activity"`) and **Edit** (`Pencil` icon with tooltip `"Edit workout"`).
4. **Remove `.fit` and MyWhoosh `.zwo` Download Buttons**:
   - In `Web/src/components/EditWorkoutModal.tsx` and `Web/src/components/WeeklyView.tsx` (and `WorkoutScheduleCard.tsx` if any exist), remove the `Download .FIT` and `Download MyWhoosh (.zwo)` buttons from the workout card/modal footer so the UI stays clean and uncluttered.
```

---

## Web-Agent-2: `web-plan-advanced-analysis-tss-cycling-and-ai-fix`
**Owned Files (Strict Isolation)**:
- `Web/src/components/LazyChartWrapper.tsx`
- `Web/src/app/api/plan-advanced/[goalId]/route.ts`
- `Web/src/app/api/plan-advanced/[goalId]/planned-fitness/route.ts`
- `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`
- `Web/src/components/PlanEditor/PlanEditorLayout.tsx`
- `Web/src/components/PlanEditor/GoalTimeline.tsx`
- `Web/src/components/PlanEditor/Toolbar.tsx`
- `Web/src/components/PlanEditor/AnalysisView.tsx`
- `Web/src/app/plan-advanced/[goalId]/components/Analysis/AnalysisView.tsx`
- `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts`

### Prompt for `Web-Agent-2`:
```markdown
You are `Web-Agent-2` (`web-plan-advanced-analysis-tss-cycling-and-ai-fix`). Modify ONLY your assigned files:
- `Web/src/components/LazyChartWrapper.tsx`
- `Web/src/app/api/plan-advanced/[goalId]/route.ts`
- `Web/src/app/api/plan-advanced/[goalId]/planned-fitness/route.ts`
- `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`
- `Web/src/components/PlanEditor/PlanEditorLayout.tsx`
- `Web/src/components/PlanEditor/GoalTimeline.tsx`
- `Web/src/components/PlanEditor/Toolbar.tsx`
- `Web/src/components/PlanEditor/AnalysisView.tsx`
- `Web/src/app/plan-advanced/[goalId]/components/Analysis/AnalysisView.tsx`
- `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts`

### Task 1: Fix Blank Recharts Containers in `Web/src/components/LazyChartWrapper.tsx`
In `Web/src/components/LazyChartWrapper.tsx` (around line 47):
- Currently:
  ```tsx
  <div ref={ref} style={{ minHeight: height }} className="w-full flex items-center justify-center">
      {isVisible ? (
          children
      ) : ( ... )}
  </div>
  ```
- Because `<ResponsiveContainer width="100%" height="100%">` is a direct child of a `flex` container that only has `minHeight` (and no explicit `height`), CSS resolves `height: 100%` to `0px`, making `Projected Performance Management Chart (PMC)` and other charts render blank!
- Change the outer `div` to set BOTH `height` and `minHeight` and wrap `{children}` in a `w-full h-full` block:
  ```tsx
  <div ref={ref} style={{ height, minHeight: height }} className="w-full relative">
      {isVisible ? (
          <div className="w-full h-full">{children}</div>
      ) : (
          <div
              className="w-full h-full bg-background-secondary/50 animate-pulse rounded-lg flex items-center justify-center border border-glass-border"
              style={{ height }}
          >
              <span className="text-foreground-muted text-sm">Loading chart...</span>
          </div>
      )}
  </div>
  ```

### Task 2: Fix `WEEK X EFFORT` (`0 / 390 TSS (0%) · 0m / 425m`) in `PlanEditorLayout.tsx`, `GoalTimeline.tsx`, and `/api/plan-advanced/[goalId]/route.ts`
1. In `Web/src/app/api/plan-advanced/[goalId]/route.ts` (lines 26–40):
   - Expand `linkedActivity.select` to also include `trimp: true`, `runningTss: true`, `bikeTss: true`, `swimTss: true`, `averageWatts: true`, `weightedAverageWatts: true`.
2. In `Web/src/components/PlanEditor/PlanEditorLayout.tsx`:
   - Compute `currentWeekEffort` and `blockWeeksBreakdown` via `useMemo` from `workouts` and `currentWeek` (using `timelineStart` + `(currentWeek - 1) * 7 days` or current Monday–Sunday week):
     - For each workout `w` in the current week (`workoutType !== 'REST'`):
       - `wPlannedTss = w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateWorkoutTss(w)`
       - `wPlannedDur = w.targetDuration || 0`
       - Add to `plannedTss` and `plannedDurationSec`.
       - If `w.isCompleted` or `w.linkedActivity`:
         - `linkedTss = w.linkedActivity ? (w.linkedActivity.bikeTss || w.linkedActivity.runningTss || w.linkedActivity.trimp || 0) : 0`
         - `actualTss += linkedTss > 0 ? Math.round(linkedTss) : Math.round(wPlannedTss)`
         - `actualDurationSec += (w.linkedActivity?.movingTime && w.linkedActivity.movingTime > 0) ? w.linkedActivity.movingTime : wPlannedDur`
   - Pass `currentWeekEffort={currentWeekEffort}` and `blockWeeksBreakdown={blockWeeksBreakdown}` into `<GoalTimeline />` at lines 434–442!
   - Also in `Toolbar.tsx` / `PlanEditorLayout.tsx`: if `detectEffectivePlanSport({ name: planName, sport, raceType }, workouts) === 'CYCLING'`, display `"Cycling & Strength"` / `"Cycling"` instead of `"TRIATHLON • CUSTOM_TRI"`.

### Task 3: Fix Projected PMC API (`/api/plan-advanced/[goalId]/planned-fitness/route.ts`) for Cycling Plans
In `Web/src/app/api/plan-advanced/[goalId]/planned-fitness/route.ts`:
1. In the `prisma.dailyFitness.findMany` query (lines 70–79), add `bikeTss: true, swimTss: true, ctlBike: true, atlBike: true` to `select`.
2. When building `actualByDay` (lines 111–116):
   ```ts
   const tss = (row.runningTss && row.runningTss > 0 ? row.runningTss : 0)
       + (row.bikeTss && row.bikeTss > 0 ? row.bikeTss : 0)
       + (row.swimTss && row.swimTss > 0 ? row.swimTss : 0);
   actualByDay.set(key, tss > 0 ? tss : (row.trimp ?? 0));
   ```
   And for completed workouts in `workouts` that are marked `isCompleted: true` on dates up to `todayKey` where `actualByDay.get(key)` is `0` or undefined, add the workout's `plannedTss || estimateTss(w)` into `actualByDay` so completed workouts immediately reflect in the PMC!
3. When computing `plannedByDay` (lines 118–126), include `w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateTss(w)` first before re-estimating from `targetDuration`, because cycling workouts already store accurate power-based `plannedTss`!

### Task 4: Add Weekly TSS Graph, Weekly Cycling Volume (km) Graph, & Power Zone Distribution to `analysisUtils.ts` and `AnalysisView.tsx`
1. In `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts`:
   - Extend `WorkoutItem` interface to include:
     ```ts
     sport?: string | null;
     isCompleted?: boolean;
     plannedTss?: number | null;
     targetPowerWatts?: number | null;
     targetPowerMinWatts?: number | null;
     targetPowerMaxWatts?: number | null;
     structuredSteps?: any;
     linkedActivity?: {
         distance?: number | null;
         movingTime?: number | null;
         trimp?: number | null;
         runningTss?: number | null;
         bikeTss?: number | null;
     } | null;
     ```
   - Add **`weeklyTssProgression(weeks: WeekGroup[])`**:
     - Returns `Array<{ weekLabel: string; phase: string; plannedTss: number; actualTss: number; bikeTss: number; runTss: number; strengthTss: number; swimTss: number }>`.
     - For each workout in the week (`workoutType !== 'REST'`), compute `wTss = w.plannedTss && w.plannedTss > 0 ? w.plannedTss : estimateFallbackTss(w)`. Sum into `plannedTss` and the sport bucket (`bikeTss`, `runTss`, `strengthTss`, `swimTss`). If `w.isCompleted`, add `w.linkedActivity?.bikeTss || w.linkedActivity?.runningTss || w.linkedActivity?.trimp || wTss` to `actualTss`.
   - Add **`weeklyCyclingVolume(weeks: WeekGroup[])`**:
     - Returns `Array<{ weekLabel: string; phase: string; km: number; actualKm: number; hours: number; rideCount: number }>`.
     - Filter to cycling workouts (`w.sport === 'BIKE' || BIKE_TYPES.has(w.workoutType)`).
     - For each ride: if `w.targetDistance && w.targetDistance > 0`, `rideKm = w.targetDistance / 1000`. Otherwise, if `w.targetDuration && w.targetDuration > 0`, estimate equivalent road cycling distance from duration and intensity:
       - Base indoor/road speed: `RIDE_INTERVALS` / `BIKE_INTERVALS` = `32 km/h`, `BIKE_TEMPO` = `31 km/h`, `LONG_RIDE` = `29 km/h`, default `RIDE` / `BIKE_EASY` = `28 km/h` (or if `w.targetPowerWatts` is present, `Math.max(24, Math.min(38, 20 + (w.targetPowerWatts / 20)))`).
       - `rideKm = (w.targetDuration / 3600) * estSpeedKmh`.
     - If `w.isCompleted`, add `(w.linkedActivity?.distance && w.linkedActivity.distance > 0) ? w.linkedActivity.distance / 1000 : rideKm` to `actualKm`.
     - Round `km` and `actualKm` to 1 decimal place and `hours` to 1 decimal place.
2. In `Web/src/components/PlanEditor/AnalysisView.tsx` (AND `Web/src/app/plan-advanced/[goalId]/components/Analysis/AnalysisView.tsx` so both AnalysisView components stay in sync):
   - Compute:
     - `const tssData = useMemo(() => weeklyTssProgression(weeks), [weeks]);`
     - `const cyclingVolumeData = useMemo(() => weeklyCyclingVolume(weeks), [weeks]);`
     - `const hasRunning = useMemo(() => volumeData.some(d => d.km > 0) || longRunData.length > 0, [volumeData, longRunData]);`
     - `const hasCycling = useMemo(() => cyclingVolumeData.some(d => d.km > 0 || d.hours > 0), [cyclingVolumeData]);`
   - Render **`Weekly TSS Progression (Planned vs. Completed)`** (`md:col-span-2`) right below `Projected Performance Management Chart (PMC)`:
     - A Recharts `ComposedChart` (or `BarChart`) showing stacked or grouped bars for `Planned TSS` (`#6366f1` Indigo) and `Completed TSS` (`#10b981` Emerald) per week (`weekLabel`), with a tooltip showing `Planned TSS`, `Completed TSS`, and sport breakdown (`Bike / Run / Strength TSS`).
   - Render **`Weekly Cycling Volume (km)`** (`md:col-span-2`) whenever `hasCycling` is true:
     - A Recharts `ComposedChart` / `BarChart` showing weekly cycling kilometers (`km` bar in `#06b6d4` Cyan + `actualKm` bar in `#10b981` Emerald + `hours` line or tooltip detail), with phase reference bands!
   - When `!hasRunning && hasCycling`, **hide** the empty `Weekly Running Volume` and `Long Run Progression` cards so Cycling plans don't show two giant empty `"No running distance data assigned"` / `"No long runs found in plan"` boxes! (Still show them if `hasRunning` is true or if neither running nor cycling data exists).

### Task 5: Fix AI Plan Analysis (`/api/plan-advanced/[goalId]/ai-analysis/route.ts`) for Cycling Plans
In `Web/src/app/api/plan-advanced/[goalId]/ai-analysis/route.ts`:
1. Import `detectEffectivePlanSport` from `@/lib/plan/sportDetection` (or inline the check if `sportDetection.ts` is not yet created: check `/cycling|bike|mywhoosh|zwift|ftp/i.test(goal.name)` or `(goal.runsPerWeek === 0 && (goal.swimsPerWeek ?? 0) === 0)` or `workouts` having bike workouts and 0 run/swim workouts).
2. In ` GET`: also select `name: true, runsPerWeek: true, ridesPerWeek: true, swimsPerWeek: true, strengthPerWeek: true` on `goal`, and select `customName: true, sport: true, plannedTss: true, targetPowerWatts: true, targetFtpPercent: true` on `goal.workouts`.
3. When `effectiveSport === 'CYCLING'`:
   - Bump `PROMPT_VERSION` to `2` (or include `effectiveSport` in the cache check) so cached `35/100` triathlon hallucinations are invalidated!
   - Use a Cycling-specific `SYSTEM_PROMPT`:
     ```ts
     const CYCLING_SYSTEM_PROMPT = `You are an expert cycling and strength endurance coach AI. Analyze the user's cycling & strength training plan and return a structured JSON evaluation.
     IMPORTANT: This is a dedicated CYCLING (and strength) plan, NOT a triathlon or running plan. Even if the database sport field says TRIATHLON/CUSTOM_TRI, the athlete is training exclusively for cycling and strength. Do NOT penalize the score or flag risks for having zero swimming or zero running workouts.
     Evaluate:
     1. Weekly TSS progression, overload ramp rate, and recovery/deload weeks.
     2. Cycling intensity distribution (Endurance Z2 vs. Sweet Spot / Threshold FTP / VO2max intervals).
     3. Spacing of high-intensity interval rides and heavy strength sessions.
     4. Specificity and progressive overload across phases.`;
     ```
   - In `buildUserPrompt`, output:
     `Sport: CYCLING & STRENGTH (Dedicated Bike Plan — No Running or Swimming)`
     and include each workout's `customName`, `plannedTss`, `targetPowerWatts` (`W`), and `targetFtpPercent` (`% FTP`) in `workoutSummary` so the AI sees the exact Sweet Spot / FTP / VO2max cycling sessions!
```

---

# Part 3 — Android Fixes (3 Parallel Subagents — Preserved for Completeness)

If Agy is also applying or verifying the Android fixes from your screen recording, here are the 3 isolated Android subagents:

## Android-Agent-A (`android-sync-home-and-workout-linking`)
**Owned Files**:
- `Android/src/services/workoutSync.ts`
- `Android/src/services/workoutPriority.ts`
- `Android/app/(tabs)/home.tsx`
- `Android/app/(tabs)/plan.tsx`
- `Android/src/components/LinkActivityModal.tsx`

1. **Immediate Push Sync**: In `workoutSync.ts`, ensure `completeWorkoutWithSync`, `updateWorkoutWithSync`, `deleteWorkoutWithSync`, and `createWorkoutWithSync` immediately call `await pushWorkoutChanges()` when online (falling back to SQLite queue only when offline).
2. **Capabilities & Two Buttons on Home (`home.tsx`)**:
   - Export `canExecuteWorkoutInApp(workout)` in `workoutPriority.ts` (`true` for Run, Walk, Outdoor Cycling, Treadmill, Strength, Core, Mobility; `false` for Swim, MyWhoosh/Zwift Virtual Ride, Rowing).
   - On `home.tsx`:
     - If `canExecuteWorkoutInApp(todayWorkout)` is `true`: render **both** primary `Start Workout` AND secondary `Complete` buttons side-by-side.
     - If `canExecuteWorkoutInApp(todayWorkout)` is `false`: render primary `Complete & Link` button.
     - Pressing `Complete` on any workout not recorded in-app opens `<LinkActivityModal>` so the user can link an unlinked Strava/Health Connect activity or mark it done without linking.
3. **Never Show Already-Linked Activities & Add Small Toggle in `LinkActivityModal.tsx`**:
   - Query `SELECT linkedActivityId FROM workouts WHERE linkedActivityId IS NOT NULL` from local SQLite plus `goal.workouts` and exclude those IDs from candidate activities.
   - Default to matching sport family only (`matchSportFamily`), with a small header pill `[Show other sports (N)]` to reveal non-matching sports on demand.

## Android-Agent-B (`android-analytics-layout-charts-and-streams`)
**Owned Files**:
- `Android/app/(tabs)/analytics.tsx`
- `Android/src/components/analytics/ZonesSection.tsx`
- `Android/src/components/analytics/RunningTab.tsx`
- `Android/src/components/analytics/CyclingTab.tsx`
- `Android/src/components/analytics/RecoveryTab.tsx`
- `Android/src/components/analytics/TrainingLoadCard.tsx`
- `Android/src/components/analytics/MmpCurveChart.tsx`
- `Android/src/components/analytics/ActivityMiniChart.tsx`
- `Android/src/services/powerAnalysis.ts`

1. **Remove Vertical Gaps (`RecoveryTab.tsx`, `RunningTab.tsx`, `CyclingTab.tsx`)**:
   - Replace `<ScrollView style={{ flex: 1 }}>` inside `RecoveryTab.tsx` with a plain `<View>` (since `analytics.tsx` already wraps tab content in a parent `<ScrollView>`), and remove empty metric spacer boxes when wellness metrics are `0`/`null`.
   - Change `chartCard` in `RunningTab.tsx` (`VO2max & Running Fitness`) and `CyclingTab.tsx` (`FTP & Cycling Fitness`) from `padding: 20` to `paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14`, removing extra margins above/below headings.
2. **Redesign Mean Maximal Power Curve (`MmpCurveChart.tsx`)**:
   - Use continuous physiological log-time spacing (`Math.log10(seconds)` from `1s` to `3600s`) for X-coordinates while placing ticks at `5s, 15s, 1m, 5m, 20m, 60m`.
   - Render a smooth monotone cubic Bezier SVG path with gradient fill, horizontal FTP dashed reference line, interactive crosshair scrub tooltip (`Duration · Best Watts · W/kg · %FTP`), and 4 summary KPI pills (`5s Peak`, `1m Anaerobic`, `5m VO2max`, `20m Est. FTP`).
3. **Restore Removed Analytics Diagrams**:
   - **7-Day Zone Time-in-Zone Comparison Card** in `ZonesSection.tsx` (stacked bar + per-zone duration breakdown + `Edit HR & Power Zones` link to `/settings/zones`, with inline zone editor inputs removed from Analytics).
   - **Aerobic Efficiency (EF = Speed/HR & Power/HR) Trend Chart** in `RunningTab.tsx` and `CyclingTab.tsx`.
   - **Intensity Distribution (80/20 Polarized Check) Bar** in `TrainingLoadCard.tsx`.
4. **Stream Backfill + Fallback Bar (`powerAnalysis.ts`, `ActivityMiniChart.tsx`)**:
   - Auto-fetch missing streams for recent activities via `GET /api/mobile/v1/activities/${id}/streams` and persist to SQLite.
   - When an older activity has no stream data, render a compact **Fallback Metric Pill Bar** (`Avg HR / Max HR`, `Avg Watts / NP`, `Avg Pace`, `TSS`) instead of an empty box.

## Android-Agent-C (`android-settings-unified-zones`)
**Owned Files**:
- `Android/app/settings/athlete.tsx`
- `Android/app/settings/zones.tsx`
- `Android/app/settings/index.tsx`

1. **Remove Duplicate Thresholds/Zones from `athlete.tsx`**: Keep only physical profile fields (`weight`, `height`, `age`/`dob`, `gender`, `restingHr`) and add a link card pointing to `/settings/zones`.
2. **Consolidate All HR, Power, & Swim Zones in `zones.tsx`**:
   - Put `Max HR`, `LTHR`, `Resting HR` (with `Auto-Calculate 7-Zone HR`), `Cycling FTP (W)` & `W/kg` (with `Coggan 7-Zone Power` table), and `Swim CSS Pace` in `Android/app/settings/zones.tsx`.
   - Save immediately to local SQLite AND push via `PATCH /api/mobile/v1/user/profile` + `invalidateQueries`.

---

# Part 4 — Verification Checklist for Agy
1. **Web Typecheck & Build**:
   ```bash
   cd Web && npx tsc --noEmit
   ```
2. **Spot-Check the 4 Web Fixes in Browser**:
   - **Dashboard `/` (`This Week's Workouts`)**: Confirm header counter shows only current week's workouts (e.g. `2/7 Done`, not `10/32 Done`), workout names like `"Sweet Spot"` or `"VO2 Max Intervals"` are never clipped to `"SS"`, and `.fit`/`.zwo` download buttons are gone from the dashboard modal/cards.
   - **Dashboard `/` (`RaceCountdown` tile) & `/plan-advanced/[goalId]` (`GoalTimeline`)**: Confirm `"This Week Effort"` and `"4-Week Block"` show real completed + planned TSS and minutes (including workouts marked `✓ Done`), and badge says **`"Cycling & Strength"`** instead of `"Custom Triathlon"`.
   - **Advanced Plan `/plan-advanced/[goalId]` $\rightarrow$ `Analysis` tab**:
     - Confirm `Projected Performance Management Chart (PMC)` renders at full `18rem` height (not blank).
     - Confirm new **`Weekly TSS Progression (Planned vs. Completed)`** chart and **`Weekly Cycling Volume (km)`** chart render with data.
     - Confirm empty `Weekly Running Volume` and `Long Run Progression` cards are hidden for cycling-only plans.
     - Click **`Refresh` on AI Plan Evaluation**: confirm the AI evaluates the plan as a **Cycling & Strength** plan (no longer complaining about zero swimming or zero running!).
