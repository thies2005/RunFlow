# Implementation Plan: Training Plan Analysis Charts

## Current State

The Advanced Editor (`PlanEditorLayout.tsx`) has a `ViewModeToggle` with `calendar` | `analysis` modes. Selecting "Analysis" opens a **320px AI side panel** (`AiAnalysisPanel.tsx`) showing AI-generated text (score gauge, summary, risk flags, suggestions). **No charts exist.** The app uses **recharts v2.15.4** (resolved from `^2.12.0`).

**Confirmed decisions:**
- Charting: **recharts** (existing, no new deps)
- Layout: **Full-page Analysis view** replaces the side panel
- Access: **Premium only** (consistent with current gating)

---

## Audit Findings & Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | Prisma has 10 `PlanPhase` values but plan only mapped 6 | Map all 10: BASE, BUILD, PEAK, TAPER, RACE_WEEK, RECOVERY, ENDURANCE, MENTAL_PREP, TUNE_UP, MAINTAIN |
| 2 | `targetDistance`, `targetDuration`, `targetHrZone` are nullable (`number | null`) | All aggregations use `(w.targetDistance ?? 0)` and filter null HR zones |
| 3 | `scheduledDate` is `string | Date` | Always wrap: `new Date(w.scheduledDate)`, skip NaN |
| 4 | HR Zone chart likely empty for many plans | Each chart shows contextual empty state ("No HR zone data assigned") |
| 5 | `planStartDate` not passed to `PlanEditorLayout` | Add to props + page.tsx; derive plan start as fallback |
| 6 | Removing side panel leaves orphaned state (`analysisOpen`, sync useEffect) | Remove `analysisOpen` state, sync useEffect, AiAnalysisPanel JSX |
| 7 | AI analysis query owned by removed panel | Move `useQuery(['ai-analysis', goalId])` into `AiSummaryBar.tsx` |
| 8 | `MassEditToolbar` irrelevant in analysis view | Gate with `{viewMode === 'calendar' && <MassEditToolbar>}` |
| 9 | `AiChatPanel` must work in both views | Keep as-is (side panel overlay, independent of main content) |
| 10 | `ReferenceArea x1/x2` categorical labels must match data keys exactly | Generate week labels once in `groupByIsoWeek()`, reuse everywhere |
| 11 | Per-chart emptiness not handled | Each chart component handles its own empty state |
| 12 | `sport` field untyped in Workout interface | Rely on `workoutType` alone for modality mapping (unambiguous) |

---

## Data Layer

### File: `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts`

**Input:** `Workout[]` from `PlanEditorLayoutProps.workouts`

**Field mapping:**
- `date` → `scheduledDate` (wrap in `new Date()`)
- `distance_m` → `targetDistance` (meters, nullable)
- `duration_s` → `targetDuration` (seconds, nullable)
- `hr_zone` → `targetHrZone` (1-5, nullable)
- `phase` → `phase` (string, non-null, defaults to "BASE")

**Run types:** `LONG_RUN, FARTLEK, TEMPO, EASY, RECOVERY, INTERVALS, REPETITIONS, RACE`

**Modality mapping:**
- Run: above run types
- Bike: `RIDE, LONG_RIDE, RIDE_INTERVALS`
- Swim: `SWIM, OPEN_WATER_SWIM, SWIM_DRILL`
- Strength: `STRENGTH`

**Phase color mapping (all 10):**
| Phase | Color |
|-------|-------|
| BASE | `#3b82f6` (blue) |
| BUILD | `#f97316` (orange) |
| PEAK | `#ef4444` (red) |
| TAPER | `#22c55e` (green) |
| RACE_WEEK | `#a855f7` (purple) |
| RECOVERY | `#06b6d4` (cyan) |
| ENDURANCE | `#2563eb` (blue-600) |
| MENTAL_PREP | `#7c3aed` (violet) |
| TUNE_UP | `#f59e0b` (amber) |
| MAINTAIN | `#6b7280` (gray) |

**Zone colors (matching CSS tokens):**
| Zone | Color |
|------|-------|
| 1 | `#4ade80` (green) |
| 2 | `#a3e635` (lime) |
| 3 | `#facc15` (yellow) |
| 4 | `#fb923c` (orange) |
| 5 | `#ef4444` (red) |

**Functions:**
```
groupByIsoWeek(workouts) → { weekStart, weekLabel, workouts[] }[]
  - ISO week starting Monday (weekStartsOn: 1)
  - Week labels: "W{n} {M/D}" e.g. "W1 6/8"
  - Sorted chronologically, skip NaN dates

weeklyRunningVolume(weeks) → { label, km, phase }[]
  - Sum targetDistance for run types / 1000
  - Phase = most common phase in week's run workouts

longRunProgression(workouts) → { date, km, phase }[]
  - Filter: workoutType === 'LONG_RUN'
  - Date: "M/D" format
  - Skip if distance is 0

weeklyLoadByModality(weeks) → { label, run, bike, swim, strength }[]
  - Sum targetDuration per modality / 3600 → hours

workoutTypeDistribution(workouts) → { type, count, pct, color }[]
  - Count per workoutType, skip REST
  - Group smallest into "Other" if > 8 types

hrZoneDistribution(workouts) → { zone, km, color }[]
  - Filter: run types AND targetHrZone != null AND > 0
  - Group by zone 1-5, sum km

computePhaseBands(weeks) → { startLabel, endLabel, phase, color }[]
  - Detect contiguous runs of same phase
  - Returns ReferenceArea-compatible x1/x2 labels
```

---

## Chart Components

All in `Web/src/app/plan-advanced/[goalId]/components/Analysis/`.

### ChartCard.tsx (shared wrapper)
- Card: `border border-zinc-800 bg-zinc-900 rounded-xl p-4`
- Header: title (`text-sm font-semibold text-zinc-300`) + info icon with tooltip
- Children: chart content
- Empty state: contextual message when data is empty

### WeeklyVolumeChart.tsx
- `BarChart` + `Cell` for per-bar phase coloring
- `ReferenceArea` for phase background bands (fill opacity 0.08)
- Phase name labels via `ReferenceArea label` prop
- `XAxis dataKey="label"`, `YAxis` "Running (km)", domain [0, max+5]
- Value labels on bars
- Tooltip: week, phase, km

### LongRunProgressionChart.tsx
- `AreaChart` with `Area` (fill origin, opacity 0.15)
- Custom `dot` render function colored by phase
- `XAxis dataKey="date"` (M/D), `YAxis` "Distance (km)", domain [0, max+2]
- Custom legend: colored dots per phase present in data
- Data labels showing km value
- Tooltip: date, phase, km

### WeeklyLoadChart.tsx
- `BarChart` with 4 `<Bar stackId="load">`
- Colors: run=`#14b8a6`, bike=`#f97316`, swim=`#3b82f6`, strength=`#a855f7`
- `Legend` for modality labels
- Tooltip per segment: modality + hours

### WorkoutTypeDonut.tsx
- `PieChart` + `Pie` with `innerRadius={60} outerRadius={90}`
- `Cell` children for per-slice colors (from `WORKOUT_COLORS`)
- Center label: absolute-positioned div with total session count
- `label` render function: `{name} {pct}%`
- Skip REST type, group >8 types into "Other"
- Tooltip: type, count, pct

### HrZonePyramid.tsx
- `BarChart layout="vertical"`
- `YAxis type="category" dataKey="name"`, `XAxis type="number"` "km"
- `Cell` for per-bar zone colors
- Optional `ReferenceLine x={threshold}` for 80/20 annotation
- Value labels on bars
- Tooltip: zone, km

---

## Analysis View Layout

### AiSummaryBar.tsx
- Owns `useQuery(['ai-analysis', goalId])` and `useMutation` for re-analyze
- Horizontal card at top of analysis view
- Layout:
  - Left: `PlanScoreGauge` (small)
  - Center: summary text + risk flags as colored pills
  - Right: race readiness mini-bar + "Re-analyze" button
- If no analysis: "Analyze Plan" CTA

### AnalysisView.tsx
- Receives `workouts`, `goalId`, `raceDate`, `raceType`, `isNoRace` props
- Uses `useMemo` to compute all chart data from `workouts`
- Layout:
```
<div className="flex-1 overflow-y-auto p-6">
  <AiSummaryBar goalId={goalId} isNoRace={isNoRace} />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    <div className="md:col-span-2"><ChartCard title="Weekly Running Volume"><WeeklyVolumeChart /></ChartCard></div>
    <div className="md:col-span-2"><ChartCard title="Long Run Progression"><LongRunProgressionChart /></ChartCard></div>
    <ChartCard title="Weekly Load by Modality"><WeeklyLoadChart /></ChartCard>
    <ChartCard title="Workout Type Distribution"><WorkoutTypeDonut /></ChartCard>
    <div className="md:col-span-2"><ChartCard title="HR Zone Distribution"><HrZonePyramid /></ChartCard></div>
  </div>
</div>
```
- Each chart wrapped in `LazyChartWrapper` for deferred rendering
- Respects `prefers-reduced-motion` → `isAnimationActive={false}`
- Per-chart empty states

---

## Integration Changes

### PlanEditorLayout.tsx modifications

**Remove:**
- `analysisOpen` state (line 71)
- `useEffect` syncing `analysisOpen` → `viewMode` (lines 100-102)
- `AiAnalysisPanel` lazy import (lines 29-31)
- `AiAnalysisPanel` JSX block (lines 390-399)
- `setAnalysisOpen` calls from `handleViewModeChange`

**Modify:**
- `handleViewModeChange`: just `setViewMode(vm)`, toast if `!isPremium && vm === 'analysis'`
- Main content area: `viewMode === 'calendar'` → calendar, else → `<AnalysisView>`
- `MassEditToolbar`: gate with `{viewMode === 'calendar' && <MassEditToolbar>}`

**Add:**
- Lazy import `AnalysisView`

### page.tsx modifications
- Add `planStartDate` prop to `PlanEditorLayout`

### PlanEditorLayoutProps
- Add `planStartDate?: Date | null`

---

## File List

| Action | File | Est. Lines |
|--------|------|------------|
| Create | `.../lib/analysisUtils.ts` | ~180 |
| Create | `.../components/Analysis/AnalysisView.tsx` | ~120 |
| Create | `.../components/Analysis/ChartCard.tsx` | ~50 |
| Create | `.../components/Analysis/WeeklyVolumeChart.tsx` | ~100 |
| Create | `.../components/Analysis/LongRunProgressionChart.tsx` | ~90 |
| Create | `.../components/Analysis/WeeklyLoadChart.tsx` | ~80 |
| Create | `.../components/Analysis/WorkoutTypeDonut.tsx` | ~90 |
| Create | `.../components/Analysis/HrZonePyramid.tsx` | ~80 |
| Create | `.../components/Analysis/AiSummaryBar.tsx` | ~120 |
| Modify | `.../PlanEditorLayout.tsx` | ~30 |
| Modify | `.../page.tsx` | ~2 |

**Total:** ~910 lines new, ~32 lines modified. No new dependencies.
