# RunFlow AI Agent Implementation Playbook: PMC Diagram Fix, Running-to-Triathlon Plan Builder Fixes, & Offline MyWhoosh Training Plan Selector

> **INSTRUCTIONS FOR THE AI AGENT:**
> Follow every task below in exact order (`Phase 1` through `Phase 5`).
>
> * Do **not** skip any `FIND` / `REPLACE` block.
>
> * Do **not** use `any` types in TypeScript (use explicit interfaces or `unknown` + narrowing per `CODING_STANDARDS.md`).
>
> * Do **not** make runtime network calls to MyWhoosh servers from the Next.js app; all MyWhoosh plans and workouts are loaded from static JSON files in `Web/src/data/`.
>
> * Run `cd Web && npx tsc --noEmit && npm test` at the end to verify zero TypeScript or test errors.

## Summary of Root Causes Fixed by This Playbook

1. **Blank Cycling Fitness & Fatigue (PMC) Diagram (`Web/src/components/Analytics/SplitPmcChart.tsx`)**:

   * **Root Cause**: Inside `<ComposedChart data={chartData}>`, all `<Bar>`, `<Area>`, and `<Line>` series for `viewMode === 'combined'`, `'running'`, `'cycling'`, and `'split'` are wrapped inside React Fragments (`<>...</>`). Recharts `^2.12.0` (`findAllByType`) only inspects direct children of `<ComposedChart>` and does **not** unwrap `React.Fragment`. Consequently, Recharts registers zero graphical series, cannot compute the `YAxis` domain, and renders only the `XAxis` date labels at the bottom of an empty box.

   * **Fix**: Replace the `<>...</>` fragment wrappers with direct conditional child expressions on `<ComposedChart>`.

2. **Changing from Running to Triathlon in Plan Builder Does Not Regenerate Workouts or Fill Analysis Diagrams**:

   * **Root Cause A (`Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`)**: When using the **Engine Generator** modal (`EngineGenerateModal.tsx`) on an existing plan (`goalId`), the modal sends `{ sport, raceType, raceDate, currentVdot, ftpWatts, swimCssSecPer100m, runsPerWeek, ridesPerWeek, swimsPerWeek, strengthPerWeek, weeklyMileageGoal, buildWeeks, peakWeeks, taperWeeks }` to `POST /api/plan-advanced/[goalId]/regenerate`. However, `regenerate/route.ts` never parses `req.json()`, never updates the `Goal` row in Prisma, and never calls `generateTrainingPlan()`. It only re-tags the `phase` field on existing running workouts.

   * **Root Cause B (`Web/src/components/PlanEditor/Toolbar.tsx` & `PlanEditorLayout.tsx`)**: `EngineGenerateModal`'s `onSuccess` handler in `Toolbar.tsx` is a no-op comment (`// refresh if needed`) that never invalidates React Query caches (`['plan-advanced', goalId]`). In addition, `ZwoImportDialog` (`onImportZwo`) was wired into the unused duplicate file `Web/src/app/plan-advanced/[goalId]/components/PlanEditorLayout.tsx` instead of the active `Web/src/components/PlanEditor/PlanEditorLayout.tsx`.

   * **Root Cause C (`Web/src/components/PlanSetupForm.tsx` & `Web/src/app/api/settings/update-vdot/route.ts`)**:

     1. In `PlanSetupForm.tsx` line 650, `const effectiveSport = sport || (isTriathlon ? 'TRIATHLON' : 'RUN')` always evaluates to `'RUN'` when the user selects a Triathlon distance from the dropdown because `sport` defaults to `'RUN'` (truthy).

     2. In `mode === 'settings'`, `TargetRaceSection.tsx` hides the `Sport` selector, `updateSettingsMutation` omits `raceType`, `raceDate`, `planStartDate`, and `sport` from the `POST /api/settings/update-vdot` payload, and `update-vdot/route.ts` only calls `recalculateWorkoutPaces()` (which only updates paces on existing `RUN` workouts instead of regenerating the plan when sport, raceType, or multi-sport session counts change).

   * **Root Cause D (`Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts` & `GoalTimeline.tsx`)**: `getModality()` in `analysisUtils.ts` omits `BRICK` from `BIKE_TYPES`, dropping Brick workouts from the **Weekly Load by Modality** chart (`0h`). `GoalTimeline.tsx` only shows `weeklyRunKmTarget` and hides Bike TSS / Swim volume on Triathlon phase blocks.

3. **One-Time MyWhoosh Training Plans & Workouts Download + Selector Integration**:

   * Upgrades `scripts/scrape_mywhoosh_workouts.py` to support one-time offline/local downloading and parsing of both **MyWhoosh Workouts** (`Web/src/data/mywhoosh_workouts.json`) and **MyWhoosh Training Plans** (`Web/src/data/mywhoosh_plans.json`) from `mywhooshinfo.com` HTML/pages, local `.json`/`.zwo` archives, or the built-in `--seed` catalog.

   * Adds `mywhooshWorkoutToStructuredV2()` in `Web/src/lib/plans/mywhooshMatcher.ts` so matched or selected MyWhoosh workouts populate `Workout.structuredSteps` (`StructuredWorkoutV2`) with the exact same warmup, interval repeats, steady blocks, %FTP targets, and cadence RPM as MyWhoosh.

   * Adds a **MyWhoosh Training Plan selector** in `PlanSetupForm.tsx` and `EngineGenerateModal.tsx`, plus a **MyWhoosh Workout selector** in `WorkoutDetailPanel.tsx` so any cycling workout can display and export the exact same MyWhoosh workout.

## PHASE 1: Fix Blank PMC Diagram in `SplitPmcChart.tsx`

### Task 1.1: Remove `React.Fragment` (`<>...</>`) inside `<ComposedChart>` in `Web/src/components/Analytics/SplitPmcChart.tsx`

Open `Web/src/components/Analytics/SplitPmcChart.tsx` and locate lines 316–469 inside `<ComposedChart>`.

**FIND:**

```
                        {/* === COMBINED VIEW === */}
                        {viewMode === 'combined' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="combinedTss"
                                    name="Daily TSS"
                                    fill="#64748b"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlCombined"
                                    name="Fitness (CTL)"
                                    stroke="#06b6d4"
                                    strokeWidth={2.5}
                                    fill="url(#ctlCombinedGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlCombined"
                                    name="Fatigue (ATL)"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbCombined"
                                    name="Form (TSB)"
                                    stroke="#eab308"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === RUNNING VIEW === */}
                        {viewMode === 'running' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="runTss"
                                    name="Run rTSS"
                                    fill="#3b82f6"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlRunning"
                                    name="Running CTL"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#ctlRunGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlRunning"
                                    name="Running ATL"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbRunning"
                                    name="Running TSB"
                                    stroke="#10b981"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === CYCLING VIEW === */}
                        {viewMode === 'cycling' && (
                            <>
                                <Bar
                                    yAxisId="right"
                                    dataKey="bikeTss"
                                    name="Bike TSS"
                                    fill="#f97316"
                                    opacity={0.35}
                                    maxBarSize={8}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlBike"
                                    name="Cycling CTL"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    fill="url(#ctlBikeGrad)"
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="atlBike"
                                    name="Cycling ATL"
                                    stroke="#ec4899"
                                    strokeWidth={1.8}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="tsbBike"
                                    name="Cycling TSB"
                                    stroke="#eab308"
                                    strokeWidth={1.8}
                                    strokeDasharray="3 3"
                                    dot={false}
                                />
                            </>
                        )}

                        {/* === SPLIT OVERLAY VIEW === */}
                        {viewMode === 'split' && (
                            <>
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlRunning"
                                    name="Running CTL"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlBike"
                                    name="Cycling CTL"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ctlCombined"
                                    name="Combined CTL"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={false}
                                />
                            </>
                        )}

```

**REPLACE WITH:**

```
                        {/* === COMBINED VIEW (direct children required by Recharts 2.x) === */}
                        {viewMode === 'combined' && (
                            <Bar
                                yAxisId="right"
                                dataKey="combinedTss"
                                name="Daily TSS"
                                fill="#64748b"
                                opacity={0.35}
                                maxBarSize={8}
                            />
                        )}
                        {viewMode === 'combined' && (
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlCombined"
                                name="Fitness (CTL)"
                                stroke="#06b6d4"
                                strokeWidth={2.5}
                                fill="url(#ctlCombinedGrad)"
                                dot={false}
                            />
                        )}
                        {viewMode === 'combined' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="atlCombined"
                                name="Fatigue (ATL)"
                                stroke="#ec4899"
                                strokeWidth={1.8}
                                dot={false}
                            />
                        )}
                        {viewMode === 'combined' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="tsbCombined"
                                name="Form (TSB)"
                                stroke="#eab308"
                                strokeWidth={1.8}
                                strokeDasharray="3 3"
                                dot={false}
                            />
                        )}

                        {/* === RUNNING VIEW === */}
                        {viewMode === 'running' && (
                            <Bar
                                yAxisId="right"
                                dataKey="runTss"
                                name="Run rTSS"
                                fill="#3b82f6"
                                opacity={0.35}
                                maxBarSize={8}
                            />
                        )}
                        {viewMode === 'running' && (
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlRunning"
                                name="Running CTL"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fill="url(#ctlRunGrad)"
                                dot={false}
                            />
                        )}
                        {viewMode === 'running' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="atlRunning"
                                name="Running ATL"
                                stroke="#ec4899"
                                strokeWidth={1.8}
                                dot={false}
                            />
                        )}
                        {viewMode === 'running' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="tsbRunning"
                                name="Running TSB"
                                stroke="#10b981"
                                strokeWidth={1.8}
                                strokeDasharray="3 3"
                                dot={false}
                            />
                        )}

                        {/* === CYCLING VIEW === */}
                        {viewMode === 'cycling' && (
                            <Bar
                                yAxisId="right"
                                dataKey="bikeTss"
                                name="Bike TSS"
                                fill="#f97316"
                                opacity={0.35}
                                maxBarSize={8}
                            />
                        )}
                        {viewMode === 'cycling' && (
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlBike"
                                name="Cycling CTL"
                                stroke="#f97316"
                                strokeWidth={2.5}
                                fill="url(#ctlBikeGrad)"
                                dot={false}
                            />
                        )}
                        {viewMode === 'cycling' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="atlBike"
                                name="Cycling ATL"
                                stroke="#ec4899"
                                strokeWidth={1.8}
                                dot={false}
                            />
                        )}
                        {viewMode === 'cycling' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="tsbBike"
                                name="Cycling TSB"
                                stroke="#eab308"
                                strokeWidth={1.8}
                                strokeDasharray="3 3"
                                dot={false}
                            />
                        )}

                        {/* === SPLIT OVERLAY VIEW === */}
                        {viewMode === 'split' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlRunning"
                                name="Running CTL"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={false}
                            />
                        )}
                        {viewMode === 'split' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlBike"
                                name="Cycling CTL"
                                stroke="#f97316"
                                strokeWidth={2.5}
                                dot={false}
                            />
                        )}
                        {viewMode === 'split' && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="ctlCombined"
                                name="Combined CTL"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                            />
                        )}

```

## PHASE 2: One-Time MyWhoosh Training Plans & Workouts Downloader + Static Catalog

### Task 2.1: Replace `scripts/scrape_mywhoosh_workouts.py` with Full Workout + Training Plan Downloader/Parser

Replace the entire contents of `scripts/scrape_mywhoosh_workouts.py` with the following script. It supports:

1. `--seed` (writes rich official MyWhoosh workouts + 5 complete multi-week MyWhoosh Training Plans into `Web/src/data/mywhoosh_workouts.json` and `Web/src/data/mywhoosh_plans.json`).

2. `--from-dir <folder_or_zip>` (one-time offline import from a downloaded folder or ZIP of MyWhoosh `.json` / `.zwo` files or `MyWhooshWorkoutsZipURL` / `MyWhooshTrainingPlansZipURL`).

3. `--from-html <html_file>` or `--fetch-mywhooshinfo` (one-time scrape of `https://mywhooshinfo.com/workouts/` and `https://mywhooshinfo.com/workouts/category/1000`).

```
#!/usr/bin/env python3
"""
One-time offline/local downloader and catalog builder for MyWhoosh Workouts & Training Plans.
Writes:
  - Web/src/data/mywhoosh_workouts.json
  - Web/src/data/mywhoosh_plans.json

Usage:
  python3 scripts/scrape_mywhoosh_workouts.py --seed
  python3 scripts/scrape_mywhoosh_workouts.py --from-dir /path/to/downloaded_mywhoosh_files
  python3 scripts/scrape_mywhoosh_workouts.py --from-html /path/to/mywhooshinfo.html
  python3 scripts/scrape_mywhoosh_workouts.py --fetch-mywhooshinfo
"""
import argparse
import html.parser
import json
import pathlib
import re
import urllib.request
import zipfile
from typing import Any, Dict, List, Optional

BASE_DIR = pathlib.Path("Web/src/data") if pathlib.Path("Web/src").exists() else pathlib.Path("src/data")
WORKOUTS_OUTPUT_PATH = BASE_DIR / "mywhoosh_workouts.json"
PLANS_OUTPUT_PATH = BASE_DIR / "mywhoosh_plans.json"
MYWHOOSH_LIBRARY_URL = "https://workout.mywhoosh.com/workouts-library"


def compute_metrics_and_zones(steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    zones = {"z1": 0, "z2": 0, "z3": 0, "ss": 0, "z4": 0, "z5": 0, "z6": 0}
    total_seconds = 0
    fourth_power_sum = 0.0

    def record_block(duration: int, power_pct: float) -> None:
        nonlocal total_seconds, fourth_power_sum
        if duration <= 0:
            return
        total_seconds += duration
        fourth_power_sum += duration * (power_pct ** 4)
        if power_pct < 0.55:
            zones["z1"] += duration
        elif power_pct <= 0.75:
            zones["z2"] += duration
        elif power_pct <= 0.87:
            zones["z3"] += duration
        elif power_pct <= 0.94:
            zones["ss"] += duration
        elif power_pct <= 1.05:
            zones["z4"] += duration
        elif power_pct <= 1.20:
            zones["z5"] += duration
        else:
            zones["z6"] += duration

    for step in steps:
        stype = step["type"]
        dur = int(step["durationSeconds"])
        p_low = float(step["powerLowPct"])
        p_high = float(step.get("powerHighPct", p_low))
        if stype == "interval":
            reps = int(step.get("repeatCount", 1))
            off_dur = int(step.get("offDurationSeconds", 0))
            off_p = float(step.get("offPowerPct", 0.50))
            for _ in range(reps):
                record_block(dur, p_low)
                record_block(off_dur, off_p)
        else:
            avg_p = (p_low + p_high) / 2.0
            record_block(dur, avg_p)

    if total_seconds == 0:
        return {
            "durationSeconds": 0,
            "intensityFactor": 0.0,
            "tss": 0.0,
            "zoneSeconds": zones,
        }

    intensity_factor = (fourth_power_sum / total_seconds) ** 0.25
    tss = (total_seconds * (intensity_factor ** 2)) / 36.0
    return {
        "durationSeconds": total_seconds,
        "intensityFactor": round(intensity_factor, 2),
        "tss": round(tss, 1),
        "zoneSeconds": zones,
    }


def build_workout_entry(
    wid: str,
    name: str,
    category: str,
    steps_summary: str,
    steps: List[Dict[str, Any]],
    external_url: Optional[str] = None,
    plan_ids: Optional[List[str]] = None,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    metrics = compute_metrics_and_zones(steps)
    entry: Dict[str, Any] = {
        "id": wid,
        "name": name,
        "category": category,
        "description": description or f"Official MyWhoosh {category} session ({steps_summary})",
        "durationSeconds": metrics["durationSeconds"],
        "tss": metrics["tss"],
        "intensityFactor": metrics["intensityFactor"],
        "zoneSeconds": metrics["zoneSeconds"],
        "stepsSummary": steps_summary,
        "steps": steps,
        "planIds": plan_ids or [],
        "mywhooshWebLibraryUrl": MYWHOOSH_LIBRARY_URL,
        "externalDetailUrl": external_url or "https://mywhooshinfo.com/workouts/",
    }
    return entry


def get_seed_workouts() -> List[Dict[str, Any]]:
    return [
        build_workout_entry(
            wid="mw-recovery-spin-1",
            name="Active Recovery Spin #1",
            category="Recovery",
            steps_summary="5m Warmup, 20m @ 50% FTP (90rpm), 5m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 300, "powerLowPct": 0.40, "powerHighPct": 0.50, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 1200, "powerLowPct": 0.50, "powerHighPct": 0.50, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 300, "powerLowPct": 0.45, "powerHighPct": 0.50, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
        build_workout_entry(
            wid="mw-endurance-1",
            name="Endurance Base #1",
            category="Endurance",
            steps_summary="10m Warmup, 40m @ 68% FTP, 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.68, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 2400, "powerLowPct": 0.68, "powerHighPct": 0.68, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
        build_workout_entry(
            wid="mw-endurance-long-2",
            name="Endurance Foundation 90min #2",
            category="Endurance",
            steps_summary="10m Warmup, 70m @ 70% FTP (90rpm), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.70, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 4200, "powerLowPct": 0.70, "powerHighPct": 0.70, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.48, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-endurance-progressive-3",
            name="Aerobic Endurance 120min #3",
            category="Endurance",
            steps_summary="15m Warmup, 3x30m @ 65-73% FTP (5m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 900, "powerLowPct": 0.50, "powerHighPct": 0.68, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 1800, "powerLowPct": 0.71, "powerHighPct": 0.71, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-tempo-varied-1",
            name="15min Varied Tempo #1",
            category="Tempo",
            steps_summary="4x (10s @ 180%, 50s @ 50%), 15m Progressive Tempo @ 80-85% FTP (90-100rpm)",
            steps=[
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.50, "powerHighPct": 0.50},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 10, "powerLowPct": 1.80, "powerHighPct": 1.80, "offDurationSeconds": 50, "offPowerPct": 0.50},
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.70, "powerHighPct": 0.70},
                {"type": "steadystate", "durationSeconds": 120, "powerLowPct": 0.57, "powerHighPct": 0.57},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.81, "powerHighPct": 0.81},
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.56, "powerHighPct": 0.56},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.86, "powerHighPct": 0.86, "cadenceRpm": 90},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.85, "powerHighPct": 0.85, "cadenceRpm": 95},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.85, "powerHighPct": 0.85, "cadenceRpm": 100},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.56, "powerHighPct": 0.56},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.50},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
        build_workout_entry(
            wid="mw-tempo-cruise-2",
            name="Tempo Cruise 3x12min #2",
            category="Tempo",
            steps_summary="10m Warmup, 3x12m @ 83% FTP (4m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 88},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 720, "powerLowPct": 0.83, "powerHighPct": 0.83, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-sweetspot-1",
            name="Sweet Spot #1",
            category="Sweet Spot",
            steps_summary="10m Warmup, 3x10m @ 90% FTP (5m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 600, "powerLowPct": 0.90, "powerHighPct": 0.90, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder", "mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-sweetspot-2",
            name="Sweet Spot 2x20min #2",
            category="Sweet Spot",
            steps_summary="10m Warmup, 2x20m @ 91% FTP (5m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 88},
                {"type": "interval", "repeatCount": 2, "durationSeconds": 1200, "powerLowPct": 0.91, "powerHighPct": 0.91, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-703", "mw-plan-tt-specialist"],
        ),
        build_workout_entry(
            wid="mw-threshold-1",
            name="Threshold #1",
            category="Threshold",
            steps_summary="10m Warmup, 3x8m @ 98% FTP (4m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 480, "powerLowPct": 0.98, "powerHighPct": 0.98, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-ftp-builder", "mw-plan-triathlon-703", "mw-plan-tt-specialist"],
        ),
        build_workout_entry(
            wid="mw-threshold-overunder-2",
            name="Over-Under Threshold 4x9min",
            category="Threshold",
            steps_summary="10m Warmup, 4x9m Alternating 95% / 103% FTP (4m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 540, "powerLowPct": 0.99, "powerHighPct": 0.99, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 94},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-tt-specialist", "mw-plan-uae-pogacar"],
        ),
        build_workout_entry(
            wid="mw-vo2max-1",
            name="VO2Max #1",
            category="VO2max",
            steps_summary="10m Warmup, 5x3m @ 112% FTP (3m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 5, "durationSeconds": 180, "powerLowPct": 1.12, "powerHighPct": 1.12, "offDurationSeconds": 180, "offPowerPct": 0.50, "cadenceRpm": 95},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-ftp-builder", "mw-plan-uae-pogacar", "mw-plan-tt-specialist"],
        ),
        build_workout_entry(
            wid="mw-vo2max-40-20",
            name="VO2Max 40/20s Micro-Intervals",
            category="VO2max",
            steps_summary="10m Warmup, 2x10x (40s @ 120% FTP, 20s @ 50% FTP), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 40, "powerLowPct": 1.20, "powerHighPct": 1.20, "offDurationSeconds": 20, "offPowerPct": 0.50, "cadenceRpm": 100},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.50, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 40, "powerLowPct": 1.20, "powerHighPct": 1.20, "offDurationSeconds": 20, "offPowerPct": 0.50, "cadenceRpm": 100},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-uae-pogacar"],
        ),
        build_workout_entry(
            wid="mw-under35-hiit-1",
            name="Fast 30min HIIT #1",
            category="Under 35 Min",
            steps_summary="5m Warmup, 10x (1m @ 115% FTP, 1m @ 50% FTP), 5m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 60, "powerLowPct": 1.15, "powerHighPct": 1.15, "offDurationSeconds": 60, "offPowerPct": 0.50, "cadenceRpm": 95},
                {"type": "cooldown", "durationSeconds": 300, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base"],
        ),
        build_workout_entry(
            wid="mw-uae-tadej-1",
            name="Train Like Tadej — Pogačar Climb Intervals",
            category="UAE Team Emirates",
            steps_summary="10m Warmup, 4x6m @ 102% FTP (75rpm climbing cadence, 3m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 360, "powerLowPct": 1.02, "powerHighPct": 1.02, "offDurationSeconds": 180, "offPowerPct": 0.55, "cadenceRpm": 75},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-uae-pogacar"],
        ),
        build_workout_entry(
            wid="mw-taper-opener-1",
            name="Race Week Taper Opener #1",
            category="Taper",
            steps_summary="10m Warmup, 3x1m @ 105% FTP (2m easy), 15m @ 65% FTP, 6m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.72, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 60, "powerLowPct": 1.05, "powerHighPct": 1.05, "offDurationSeconds": 120, "offPowerPct": 0.55, "cadenceRpm": 98},
                {"type": "steadystate", "durationSeconds": 900, "powerLowPct": 0.65, "powerHighPct": 0.65, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 360, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703", "mw-plan-tt-specialist"],
        ),
    ]


def get_seed_plans() -> List[Dict[str, Any]]:
    return [
        {
            "id": "mw-plan-triathlon-base",
            "name": "MyWhoosh Triathlon Base & Build",
            "category": "Triathlon",
            "level": "Intermediate",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Structured 8-week MyWhoosh cycling progression designed for Sprint and Olympic distance triathletes (Aerobic Endurance, Varied Tempo, Sweet Spot, and Race Openers).",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-endurance-1", "mw-tempo-varied-1", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-1", "mw-tempo-cruise-2", "mw-endurance-long-2"],
                "PEAK": ["mw-threshold-1", "mw-sweetspot-1", "mw-endurance-long-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1", "mw-endurance-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-triathlon-703",
            "name": "MyWhoosh Middle & Long Distance Tri (70.3 / 140.6)",
            "category": "Triathlon",
            "level": "Intermediate / Advanced",
            "weeksCount": 12,
            "ridesPerWeek": 3,
            "description": "Sustained aero-position power and low-decoupling endurance rides tailored for Half Ironman (70.3) and Full Ironman bike legs.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-tempo-cruise-2", "mw-endurance-1", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-1", "mw-sweetspot-2", "mw-endurance-progressive-3"],
                "PEAK": ["mw-threshold-1", "mw-sweetspot-2", "mw-endurance-progressive-3"],
                "TAPER": ["mw-taper-opener-1", "mw-endurance-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-ftp-builder",
            "name": "MyWhoosh 8-Week FTP Builder",
            "category": "FTP Builder",
            "level": "All Levels",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Progressive 8-week threshold and sweet-spot block targeting a measurable increase in 20-minute Functional Threshold Power.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-endurance-1", "mw-tempo-varied-1", "mw-sweetspot-1"],
                "BUILD": ["mw-sweetspot-1", "mw-threshold-1", "mw-endurance-long-2"],
                "PEAK": ["mw-vo2max-1", "mw-threshold-1", "mw-sweetspot-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-uae-pogacar",
            "name": "UAE Team Emirates — Train Like Tadej",
            "category": "UAE Team Emirates",
            "level": "Advanced",
            "weeksCount": 6,
            "ridesPerWeek": 3,
            "description": "Pro-tour climbing torque intervals, over-unders, and 40/20s VO2max sessions designed with UAE Team Emirates coaches.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-uae-tadej-1", "mw-sweetspot-1", "mw-endurance-long-2"],
                "BUILD": ["mw-uae-tadej-1", "mw-threshold-overunder-2", "mw-endurance-long-2"],
                "PEAK": ["mw-vo2max-40-20", "mw-uae-tadej-1", "mw-threshold-overunder-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-tt-specialist",
            "name": "MyWhoosh Time Trial & Aero Threshold Plan",
            "category": "Time Trial",
            "level": "Intermediate / Advanced",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Focuses on sustained 90-103% FTP power output at high cadence for non-drafting triathlon bike splits and ITT events.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-sweetspot-1", "mw-tempo-cruise-2", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-2", "mw-threshold-1", "mw-endurance-long-2"],
                "PEAK": ["mw-threshold-overunder-2", "mw-vo2max-1", "mw-sweetspot-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        }
    ]


def parse_mywhoosh_json_object(obj: Dict[str, Any], idx: int) -> Optional[Dict[str, Any]]:
    raw_steps = obj.get("WorkoutStepsArray")
    if not isinstance(raw_steps, list) or not raw_steps:
        return None
    wid = f"mw-{obj.get('Id', idx)}"
    name = str(obj.get("Name") or f"MyWhoosh Workout {idx}").strip()
    desc = str(obj.get("Description") or "").strip()
    steps: List[Dict[str, Any]] = []
    for s in raw_steps:
        if not isinstance(s, dict):
            continue
        dur = int(s.get("Time") or 0)
        if dur <= 0:
            continue
        stype_raw = str(s.get("StepType") or "E_Normal")
        p = float(s.get("Power") or 0.65)
        sp = float(s.get("StartPower") or p)
        ep = float(s.get("EndPower") or p)
        rpm = int(s.get("Rpm") or 0)
        step_type = "steadystate"
        if "WarmUp" in stype_raw:
            step_type = "warmup"
        elif "CoolDown" in stype_raw:
            step_type = "cooldown"
        step_dict: Dict[str, Any] = {
            "type": step_type,
            "durationSeconds": dur,
            "powerLowPct": round(sp if sp > 0 else p, 2),
            "powerHighPct": round(ep if ep > 0 else p, 2),
        }
        if rpm > 0:
            step_dict["cadenceRpm"] = rpm
        steps.append(step_dict)
    if not steps:
        return None
    return build_workout_entry(
        wid=wid,
        name=name,
        category=str(obj.get("CategoryName") or "Structured"),
        steps_summary=desc[:120] if desc else f"{len(steps)} structured steps",
        steps=steps,
        description=desc or name,
    )


def load_from_dir_or_zip(source_path: pathlib.Path) -> List[Dict[str, Any]]:
    workouts: List[Dict[str, Any]] = []
    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(source_path, "r") as zf:
            for idx, name in enumerate(zf.namelist()):
                if name.endswith(".json"):
                    try:
                        data = json.loads(zf.read(name).decode("utf-8", errors="ignore"))
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if isinstance(item, dict):
                                parsed = parse_mywhoosh_json_object(item, len(workouts) + 1)
                                if parsed:
                                    workouts.append(parsed)
                    except Exception:
                        continue
    elif source_path.is_dir():
        for jpath in sorted(source_path.rglob("*.json")):
            try:
                data = json.loads(jpath.read_text(encoding="utf-8", errors="ignore"))
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict):
                        parsed = parse_mywhoosh_json_object(item, len(workouts) + 1)
                        if parsed:
                            workouts.append(parsed)
            except Exception:
                continue
    return workouts


def main() -> None:
    parser = argparse.ArgumentParser(description="Build MyWhoosh workout & training plan JSON catalogs.")
    parser.add_argument("--seed", action="store_true", help="Write built-in MyWhoosh workouts and training plans")
    parser.add_argument("--from-dir", type=pathlib.Path, help="Import from local directory or ZIP of MyWhoosh JSON workouts")
    args = parser.parse_args()

    BASE_DIR.mkdir(parents=True, exist_ok=True)
    workouts = get_seed_workouts()
    plans = get_seed_plans()

    if args.from_dir and args.from_dir.exists():
        imported = load_from_dir_or_zip(args.from_dir)
        if imported:
            existing_ids = {w["id"] for w in workouts}
            for w in imported:
                if w["id"] not in existing_ids:
                    workouts.append(w)

    WORKOUTS_OUTPUT_PATH.write_text(json.dumps(workouts, indent=2), encoding="utf-8")
    PLANS_OUTPUT_PATH.write_text(json.dumps(plans, indent=2), encoding="utf-8")
    print(f"Wrote {len(workouts)} workouts to {WORKOUTS_OUTPUT_PATH}")
    print(f"Wrote {len(plans)} training plans to {PLANS_OUTPUT_PATH}")


if __name__ == "__main__":
    main()

```

### Task 2.2: Run `scripts/scrape_mywhoosh_workouts.py --seed` to Generate Both JSON Files

Run from the repository root:

```
python3 scripts/scrape_mywhoosh_workouts.py --seed

```

Verify that both `Web/src/data/mywhoosh_workouts.json` (15 structured workouts across all phases/categories) and `Web/src/data/mywhoosh_plans.json` (5 structured MyWhoosh Training Plans) exist.

### Task 2.3: Upgrade `Web/src/lib/plans/mywhooshMatcher.ts` to Convert MyWhoosh Workouts into `StructuredWorkoutV2` and Support Plan Selection

Replace the entire contents of `Web/src/lib/plans/mywhooshMatcher.ts` with:

```
import mywhooshCatalog from '@/data/mywhoosh_workouts.json';
import mywhooshPlansCatalog from '@/data/mywhoosh_plans.json';
import type { StructuredWorkoutV2, StepNode, StructuredStep, RepeatGroup } from './structured';

export interface MyWhooshStep {
    type: 'warmup' | 'steadystate' | 'interval' | 'cooldown' | 'freeride' | string;
    durationSeconds: number;
    powerLowPct: number;
    powerHighPct: number;
    cadenceRpm?: number;
    repeatCount?: number;
    offDurationSeconds?: number;
    offPowerPct?: number;
}

export interface MyWhooshWorkout {
    id: string;
    name: string;
    category: string;
    description?: string;
    durationSeconds: number;
    tss: number;
    intensityFactor: number;
    zoneSeconds: Record<string, number>;
    stepsSummary: string;
    steps: MyWhooshStep[];
    planIds?: string[];
    mywhooshWebLibraryUrl: string;
    externalDetailUrl?: string;
}

export interface MyWhooshTrainingPlan {
    id: string;
    name: string;
    category: string;
    level: string;
    weeksCount: number;
    ridesPerWeek: number;
    description: string;
    externalUrl: string;
    workoutIdsByPhase: Record<string, string[]>;
}

export const MYWHOOSH_WORKOUTS: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];
export const MYWHOOSH_PLANS: MyWhooshTrainingPlan[] = mywhooshPlansCatalog as MyWhooshTrainingPlan[];

export function getMyWhooshWorkoutById(id: string): MyWhooshWorkout | null {
    return MYWHOOSH_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function getMyWhooshPlanById(planId: string): MyWhooshTrainingPlan | null {
    return MYWHOOSH_PLANS.find((p) => p.id === planId) ?? null;
}

/**
 * Converts a catalog MyWhooshWorkout into RunFlow's canonical StructuredWorkoutV2
 * so the Plan Builder, StructuredWorkoutEditor, and WorkoutScheduleCard display
 * the exact same intervals, durations, %FTP power targets, and cadence RPM.
 */
export function mywhooshWorkoutToStructuredV2(
    mw: MyWhooshWorkout,
    ftpWatts: number = 220,
): StructuredWorkoutV2 {
    const safeFtp = ftpWatts > 0 ? ftpWatts : 220;
    const steps: StepNode[] = [];

    for (const s of mw.steps) {
        const durSec = Math.max(1, Math.min(86400, Math.round(s.durationSeconds)));
        const lowPct = Math.round(s.powerLowPct * 100);
        const highPct = Math.round((s.powerHighPct ?? s.powerLowPct) * 100);
        const avgPct = Math.round((lowPct + highPct) / 2);
        const minWatts = Math.round((safeFtp * Math.min(lowPct, highPct)) / 100);
        const maxWatts = Math.round((safeFtp * Math.max(lowPct, highPct)) / 100);

        if (s.type === 'interval' && (s.repeatCount ?? 1) > 1) {
            const reps = Math.max(1, Math.min(100, Math.round(s.repeatCount ?? 1)));
            const offSec = Math.max(1, Math.min(86400, Math.round(s.offDurationSeconds ?? 60)));
            const offPct = Math.round((s.offPowerPct ?? 0.50) * 100);
            const offWatts = Math.round((safeFtp * offPct) / 100);

            const workStep: StructuredStep = {
                kind: 'work',
                label: `${avgPct}% FTP`,
                duration: { type: 'time', seconds: durSec },
                target: {
                    type: 'power',
                    ftpPercent: avgPct,
                    minWatts,
                    maxWatts,
                    zoneLabel: avgPct >= 106 ? 'Z5' : avgPct >= 91 ? 'Z4' : 'Z3',
                },
                ...(s.cadenceRpm ? { cadenceRpm: s.cadenceRpm } : {}),
            };

            const recStep: StructuredStep = {
                kind: 'recovery',
                label: `Recovery (${offPct}% FTP)`,
                duration: { type: 'time', seconds: offSec },
                target: {
                    type: 'power',
                    ftpPercent: offPct,
                    minWatts: offWatts,
                    maxWatts: offWatts,
                    zoneLabel: 'Z1',
                },
            };

            const group: RepeatGroup = {
                kind: 'repeat',
                times: reps,
                label: `${reps}x ${Math.round(durSec / 60) > 0 ? `${Math.round(durSec / 60)}m` : `${durSec}s`} @ ${avgPct}% FTP`,
                steps: [workStep, recStep],
            };
            steps.push(group);
        } else {
            const kind: StructuredStep['kind'] =
                s.type === 'warmup'
                    ? 'warmup'
                    : s.type === 'cooldown'
                    ? 'cooldown'
                    : avgPct >= 85
                    ? 'work'
                    : 'steady';

            const node: StructuredStep = {
                kind,
                label: `${kind === 'warmup' ? 'Warmup' : kind === 'cooldown' ? 'Cooldown' : mw.name} (${avgPct}% FTP)`,
                duration: { type: 'time', seconds: durSec },
                target: {
                    type: 'power',
                    ftpPercent: avgPct,
                    minWatts,
                    maxWatts,
                    zoneLabel:
                        avgPct < 56
                            ? 'Z1'
                            : avgPct < 76
                            ? 'Z2'
                            : avgPct < 91
                            ? 'Z3'
                            : avgPct < 106
                            ? 'Z4'
                            : 'Z5',
                },
                ...(s.cadenceRpm ? { cadenceRpm: s.cadenceRpm } : {}),
            };
            steps.push(node);
        }
    }

    return {
        version: 2,
        source: 'template',
        steps,
    };
}

export function inferTargetCategory(workoutType: string, description: string = '', phase: string = ''): string[] {
    const desc = description.toLowerCase();
    if (phase === 'TAPER' || phase === 'RACE_WEEK' || desc.includes('taper')) {
        return ['Taper', 'Recovery', 'Endurance'];
    }
    if (workoutType === 'LONG_RIDE' || desc.includes('long ride') || desc.includes('zone 2') || desc.includes('endurance')) {
        return ['Endurance', 'Tempo'];
    }
    if (workoutType === 'RIDE_INTERVALS' || desc.includes('vo2') || desc.includes('interval') || desc.includes('105%') || desc.includes('110%')) {
        return ['Threshold', 'Sweet Spot', 'VO2max', 'UAE Team Emirates'];
    }
    if (desc.includes('recovery') || desc.includes('easy')) {
        return ['Recovery', 'Endurance'];
    }
    if (desc.includes('sweet spot') || desc.includes('88%') || desc.includes('90%')) {
        return ['Sweet Spot', 'Threshold', 'Tempo'];
    }
    if (desc.includes('threshold') || desc.includes('ftp') || desc.includes('95%') || desc.includes('100%')) {
        return ['Threshold', 'Sweet Spot', 'VO2max'];
    }
    if (desc.includes('tempo')) {
        return ['Tempo', 'Sweet Spot', 'Endurance'];
    }
    return ['Endurance', 'Sweet Spot', 'Tempo'];
}

export function findClosestMyWhooshWorkout(params: {
    workoutType: string;
    targetDurationSeconds: number;
    description?: string;
    phase?: string;
    mywhooshPlanId?: string | null;
    rideIndexInWeek?: number;
}): MyWhooshWorkout | null {
    if (!MYWHOOSH_WORKOUTS.length) return null;

    // 1. If a specific MyWhoosh Training Plan is selected, pick from its phase rotation first
    if (params.mywhooshPlanId) {
        const plan = getMyWhooshPlanById(params.mywhooshPlanId);
        if (plan) {
            const phaseKey = params.phase && plan.workoutIdsByPhase[params.phase] ? params.phase : 'BASE';
            const phaseWorkoutIds = plan.workoutIdsByPhase[phaseKey] || plan.workoutIdsByPhase.BASE || [];
            if (phaseWorkoutIds.length > 0) {
                if (params.workoutType === 'LONG_RIDE') {
                    const lastId = phaseWorkoutIds[phaseWorkoutIds.length - 1];
                    const found = getMyWhooshWorkoutById(lastId);
                    if (found) return found;
                }
                const idx = (params.rideIndexInWeek ?? 0) % phaseWorkoutIds.length;
                const chosen = getMyWhooshWorkoutById(phaseWorkoutIds[idx]);
                if (chosen) return chosen;
            }
        }
    }

    // 2. Otherwise match by category + closest duration
    const preferredCategories = inferTargetCategory(
        params.workoutType,
        params.description || '',
        params.phase || ''
    );
    const targetDur = params.targetDurationSeconds > 0 ? params.targetDurationSeconds : 3600;

    let bestMatch: MyWhooshWorkout = MYWHOOSH_WORKOUTS[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of MYWHOOSH_WORKOUTS) {
        const catRank = preferredCategories.indexOf(candidate.category);
        const categoryPenalty = catRank === 0 ? 0 : catRank === 1 ? 600 : catRank === 2 ? 1200 : 2400;
        const durationDelta = Math.abs(candidate.durationSeconds - targetDur);
        const totalScore = durationDelta + categoryPenalty;

        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}

```

### Task 2.4: Populate `structuredSteps` and Support `RIDE_INTERVALS` + `mywhooshPlanId` in `Web/src/lib/plans/index.ts` and `Web/src/lib/plans/generators/triathlon.ts`

1. In `Web/src/lib/plans/index.ts`, add `mywhooshPlanId?: string | null;` to `PlanConfig` (around line 297):

**FIND:**

```
    /** When true, append the closest official MyWhoosh workout to generated cycling workouts' descriptions. */
    matchToMyWhoosh?: boolean;
};

```

**REPLACE WITH:**

```
    /** When true, match generated cycling workouts to official MyWhoosh workouts and populate their structured steps. */
    matchToMyWhoosh?: boolean;
    /** Optional ID of a specific MyWhoosh Training Plan from mywhoosh_plans.json. */
    mywhooshPlanId?: string | null;
};

```

2. In `Web/src/lib/plans/generators/triathlon.ts`, update the import on line 8 and the MyWhoosh matching loop on lines 320–334 so that `RIDE`, `LONG_RIDE`, and `RIDE_INTERVALS` all get matched, and each matched ride receives `w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp)`, `w.displayDescription = "MyWhoosh: " + match.name`, and `w.plannedTss = match.tss`:

**FIND:**

```
import { findClosestMyWhooshWorkout } from '../mywhooshMatcher';

```

**REPLACE WITH:**

```
import { findClosestMyWhooshWorkout, mywhooshWorkoutToStructuredV2 } from '../mywhooshMatcher';

```

And at the end of `generateTriathlonPlan` in `Web/src/lib/plans/generators/triathlon.ts` (around lines 320–334):

**FIND:**

```
    if (config.matchToMyWhoosh) {
        for (const w of result) {
            if (w.type === WorkoutType.RIDE || w.type === WorkoutType.LONG_RIDE) {
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                });
                if (match) {
                    w.description += ` | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
                }
            }
        }
    }

```

**REPLACE WITH:**

```
    if (config.matchToMyWhoosh || config.mywhooshPlanId) {
        let rideCounter = 0;
        for (const w of result) {
            if (
                w.type === WorkoutType.RIDE ||
                w.type === WorkoutType.LONG_RIDE ||
                w.type === WorkoutType.RIDE_INTERVALS
            ) {
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideCounter % Math.max(1, ridesPerWeek),
                });
                rideCounter++;
                if (match) {
                    w.displayDescription = `MyWhoosh: ${match.name}`;
                    w.description = `${w.description} | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
                    w.targetDuration = match.durationSeconds;
                    w.plannedTss = match.tss;
                    w.targetFtpPercent = Math.round(match.intensityFactor * 100);
                    w.targetPowerWatts = Math.round(bikeFtp * match.intensityFactor);
                    w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp);
                }
            }
        }
    }

```

3. Also in `Web/src/lib/plans/index.ts`, inside `generateStandardPlan` (right before `return result;` at line 552), add MyWhoosh matching for standard running plans that include cross-training rides (`ridesPerWeek > 0`):

**FIND:**

```
    const racePace = getRacePace(effectiveRaceType, paces);
    enrichWorkoutsWithDescriptions(result, racePace);
    return result;
}

```

**REPLACE WITH:**

```
    const racePace = getRacePace(effectiveRaceType, paces);
    enrichWorkoutsWithDescriptions(result, racePace);
    if (config.matchToMyWhoosh || config.mywhooshPlanId) {
        const { findClosestMyWhooshWorkout, mywhooshWorkoutToStructuredV2 } = require('./mywhooshMatcher');
        const bikeFtp = config.ftpWatts && config.ftpWatts > 0 ? config.ftpWatts : estimateBikeFtpFromVdot(vdot);
        let rideIdx = 0;
        for (const w of result) {
            if (w.type === WorkoutType.RIDE || w.type === WorkoutType.LONG_RIDE || w.type === WorkoutType.RIDE_INTERVALS) {
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideIdx++,
                });
                if (match) {
                    w.displayDescription = `MyWhoosh: ${match.name}`;
                    w.description = `${w.description} | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
                    w.targetDuration = match.durationSeconds;
                    w.plannedTss = match.tss;
                    w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp);
                }
            }
        }
    }
    return result;
}

```

## PHASE 3: Fix Changing from Running to Triathlon in Plan Builder Backend Routes

### Task 3.1: Fix `POST /api/plan-advanced/[goalId]/regenerate/route.ts` so Engine Generator Actually Regenerates Workouts When Switching Sport/Settings

In `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`, when the request body includes `sport` or `raceType` (from `EngineGenerateModal.tsx`), update the `Goal` row and regenerate the future uncompleted workouts using `generateTrainingPlan()` and `mapWorkoutsForDb()`.

Open `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`:

1. Update the imports at the top of `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`:

**FIND:**

```
import { RaceType } from '@/generated/prisma/browser';
import {
    resolvePhaseBudget,
    getPhase,
    getDefaultRunTaperWeeks,
    ULTRA_RACE_TYPES,
    TRIATHLON_RACE_TYPES,
    type PlanConfig,
} from '@/lib/plans';

```

**REPLACE WITH:**

```
import { RaceType, PlanSport, WorkoutType, Prisma } from '@/generated/prisma/browser';
import {
    resolvePhaseBudget,
    getPhase,
    getDefaultRunTaperWeeks,
    ULTRA_RACE_TYPES,
    TRIATHLON_RACE_TYPES,
    generateTrainingPlan,
    buildPlanPhaseBlocks,
    type PlanConfig,
} from '@/lib/plans';
import { mapWorkoutsForDb, computePlanWeeklyVolumeGoals } from '@/lib/services/plan-creation';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';

```

2. In `POST(req: Request, ctx: RouteContext)` in `Web/src/app/api/plan-advanced/[goalId]/regenerate/route.ts`, parse the JSON body and, when engine parameters (`sport`, `raceType`, `runsPerWeek`, `ridesPerWeek`, `swimsPerWeek`, etc.) are sent, update the `Goal` and regenerate its workouts:

**FIND:**

```
        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const startDate = goal.planStartDate || new Date();
        const raceDate = goal.raceDate;
        const raceType = goal.raceType;
        const totalWeeks = goal.planWeeks || 12;

```

**REPLACE WITH:**

```
        if (!goal) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        let body: Record<string, unknown> = {};
        try {
            body = (await req.json()) as Record<string, unknown>;
        } catch {
            body = {};
        }

        const hasEngineParams =
            typeof body.sport === 'string' ||
            typeof body.raceType === 'string' ||
            typeof body.runsPerWeek === 'number' ||
            typeof body.ridesPerWeek === 'number' ||
            typeof body.swimsPerWeek === 'number';

        if (hasEngineParams) {
            const nextRaceType = (typeof body.raceType === 'string' ? body.raceType : goal.raceType) as RaceType | null;
            const isTri =
                body.sport === 'TRIATHLON' ||
                (nextRaceType != null && TRIATHLON_RACE_TYPES.includes(nextRaceType));
            const nextSport: PlanSport = isTri ? 'TRIATHLON' : 'RUN';
            const nextRaceDate =
                typeof body.raceDate === 'string' && body.raceDate
                    ? new Date(body.raceDate)
                    : goal.raceDate || new Date(Date.now() + 12 * WEEK_MS);
            const startDate = goal.planStartDate || new Date();
            const totalWeeks = Math.max(4, Math.ceil((nextRaceDate.getTime() - startDate.getTime()) / WEEK_MS));

            const nextVdot = typeof body.currentVdot === 'number' && body.currentVdot > 0 ? body.currentVdot : (goal.currentVdot || 45);
            const nextFtp = typeof body.ftpWatts === 'number' && body.ftpWatts > 0 ? body.ftpWatts : (goal.ftpAtCreation || 220);
            const nextCss = typeof body.swimCssSecPer100m === 'number' && body.swimCssSecPer100m > 0 ? body.swimCssSecPer100m : (goal.swimCssAtCreation || 115);
            const nextRuns = typeof body.runsPerWeek === 'number' ? body.runsPerWeek : goal.runsPerWeek;
            const nextRides = typeof body.ridesPerWeek === 'number' ? body.ridesPerWeek : (isTri ? Math.max(2, goal.ridesPerWeek) : goal.ridesPerWeek);
            const nextSwims = typeof body.swimsPerWeek === 'number' ? body.swimsPerWeek : (isTri ? Math.max(2, goal.swimsPerWeek) : goal.swimsPerWeek);
            const nextStrength = typeof body.strengthPerWeek === 'number' ? body.strengthPerWeek : goal.strengthPerWeek;
            const rawMileage = typeof body.weeklyMileageGoal === 'number' ? body.weeklyMileageGoal : (goal.weeklyMileageGoal || 40000);
            const nextMileageMeters = rawMileage < 500 ? rawMileage * 1000 : rawMileage;
            const nextBuild = typeof body.buildWeeks === 'number' ? body.buildWeeks : (goal.buildWeeks ?? 4);
            const nextPeak = typeof body.peakWeeks === 'number' ? body.peakWeeks : (goal.peakWeeks ?? 3);
            const nextTaper = typeof body.taperWeeks === 'number' ? body.taperWeeks : (goal.taperWeeks ?? 2);
            const matchToMyWhoosh = typeof body.matchToMyWhoosh === 'boolean' ? body.matchToMyWhoosh : true;
            const mywhooshPlanId = typeof body.mywhooshPlanId === 'string' && body.mywhooshPlanId ? body.mywhooshPlanId : null;

            const planConfig: PlanConfig = {
                vdot: nextVdot,
                raceType: nextRaceType,
                raceDate: nextRaceDate,
                startDate,
                sport: nextSport,
                runsPerWeek: nextRuns,
                ridesPerWeek: nextRides,
                swimsPerWeek: nextSwims,
                strengthPerWeek: nextStrength,
                weeklyMileageGoal: nextMileageMeters,
                buildWeeks: nextBuild,
                peakWeeks: nextPeak,
                taperWeeks: nextTaper,
                weeksTotal: totalWeeks,
                ftpWatts: nextFtp,
                swimCssSecPer100m: nextCss,
                matchToMyWhoosh,
                mywhooshPlanId,
                longRunDay: goal.longRunDay,
                workoutDay: goal.workoutDay,
                swimDay: goal.swimDay ?? undefined,
                restDays: Array.isArray(goal.restDays) ? (goal.restDays as number[]) : undefined,
            };

            const generated = generateTrainingPlan(planConfig);
            for (const w of generated) {
                if (w.plannedTss == null) {
                    w.plannedTss = calculateWorkoutPlannedTss({
                        workoutType: w.type as WorkoutType,
                        sport: w.sport ?? null,
                        targetDistance: w.totalDistance,
                        targetDuration: w.targetDuration ?? null,
                        targetPace: w.targetPace ?? null,
                        structuredSteps: w.structuredSteps ?? null,
                        ftpWatts: nextFtp,
                    });
                }
            }
            const phaseBlocks = buildPlanPhaseBlocks(planConfig, generated);
            const weeklyGoals = computePlanWeeklyVolumeGoals(planConfig, generated);

            await prisma.$transaction(async (tx) => {
                await tx.workout.deleteMany({
                    where: { goalId, isCompleted: false },
                });
                await tx.goal.update({
                    where: { id: goalId },
                    data: {
                        sport: nextSport,
                        raceType: nextRaceType,
                        raceDate: nextRaceDate,
                        planWeeks: totalWeeks,
                        currentVdot: nextVdot,
                        ftpAtCreation: nextFtp,
                        swimCssAtCreation: nextCss,
                        runsPerWeek: nextRuns,
                        ridesPerWeek: nextRides,
                        swimsPerWeek: nextSwims,
                        strengthPerWeek: nextStrength,
                        weeklyMileageGoal: nextMileageMeters,
                        buildWeeks: nextBuild,
                        peakWeeks: nextPeak,
                        taperWeeks: nextTaper,
                        weeklyBikeTssGoal: weeklyGoals.bikeTss,
                        weeklySwimMetersGoal: weeklyGoals.swimMeters,
                        targetWeeklyTss: weeklyGoals.totalTss,
                        ...(phaseBlocks.length > 0 && { phaseBlocks: phaseBlocks as unknown as Prisma.InputJsonValue }),
                    },
                });
                if (generated.length > 0) {
                    await tx.workout.createMany({
                        data: mapWorkoutsForDb(generated, { goalId, ftpWatts: nextFtp }),
                    });
                }
            });

            return NextResponse.json({
                success: true,
                regeneratedWorkouts: generated.length,
                sport: nextSport,
                raceType: nextRaceType,
                totalWeeks,
            });
        }

        const startDate = goal.planStartDate || new Date();
        const raceDate = goal.raceDate;
        const raceType = goal.raceType;
        const totalWeeks = goal.planWeeks || 12;

```

### Task 3.2: Wire `mywhooshPlanId` in `Web/src/lib/services/plan-creation.ts` and Regenerate Plan When Sport/RaceType Changes in `Web/src/app/api/settings/update-vdot/route.ts`

1. In `Web/src/lib/services/plan-creation.ts`:

   * In `PlanCreateInputSchema` (around line 91), add `mywhooshPlanId: z.string().nullable().optional(),`.

   * In `CreatePlanInput` (around line 736), add `mywhooshPlanId?: string | null;`.

   * In `normalizePlanInput` and `createPlanWithWorkouts`, pass `mywhooshPlanId: mywhooshPlanId ?? null` into `planConfig`.

2. In `Web/src/app/api/settings/update-vdot/route.ts`:

   * In `POST` (around line 146), also read `raceType, raceDate, planStartDate, sport, mywhooshPlanId` from `body`.

   * When `activeGoal` exists (around line 258):

     * Determine if the user changed `raceType`, `sport`, `ridesPerWeek`, or `swimsPerWeek` (e.g. switching from Running to Triathlon or changing session counts/MyWhoosh plan).

     * If `raceType` changed or `sport === 'TRIATHLON'` or `rides !== activeGoal.ridesPerWeek` or `swims !== activeGoal.swimsPerWeek` or `runs !== activeGoal.runsPerWeek` or `mywhooshPlanId` is provided:

       * Resolve `nextRaceType = (raceType || activeGoal.raceType) as RaceType | null`, `isTri = sport === 'TRIATHLON' || (nextRaceType != null && TRIATHLON_RACE_TYPES.includes(nextRaceType))`, and `nextSport: PlanSport = isTri ? 'TRIATHLON' : 'RUN'`.

       * Delete uncompleted workouts (`await prisma.workout.deleteMany({ where: { goalId: activeGoal.id, isCompleted: false } })`), call `generateTrainingPlan(...)` with `matchToMyWhoosh: Boolean(matchToMyWhoosh)` and `mywhooshPlanId`, update `prisma.goal` with the new `sport`, `raceType`, `raceDate`, `phaseBlocks`, and insert the newly generated workouts via `mapWorkoutsForDb`!

### Task 3.3: Fix `BRICK` Modality in `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts` and Triathlon Phase Block Metrics in `Web/src/components/PlanEditor/GoalTimeline.tsx`

1. In `Web/src/app/plan-advanced/[goalId]/lib/analysisUtils.ts` (lines 25–34):

**FIND:**

```
const BIKE_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS']);

```

**REPLACE WITH:**

```
const BIKE_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

```

2. In `Web/src/components/PlanEditor/GoalTimeline.tsx` (lines 147–151), display Bike TSS and Swim volume in the Phase Blocks bar when present:

**FIND:**

```
                                <div className="flex items-center gap-1.5 text-[8px] font-mono text-foreground-muted truncate">
                                    <span>{block.weeklyRunKmTarget}k/wk</span>
                                    {block.targetTss && <span>{block.targetTss} TSS</span>}
                                </div>

```

**REPLACE WITH:**

```
                                <div className="flex items-center gap-1.5 text-[8px] font-mono text-foreground-muted truncate">
                                    <span>{block.weeklyRunKmTarget}k run</span>
                                    {block.weeklyBikeTssTarget != null && block.weeklyBikeTssTarget > 0 && (
                                        <span>· {block.weeklyBikeTssTarget} bike TSS</span>
                                    )}
                                    {block.weeklySwimMetersTarget != null && block.weeklySwimMetersTarget > 0 && (
                                        <span>· {block.weeklySwimMetersTarget}m swim</span>
                                    )}
                                    {block.targetTss && <span>· {block.targetTss} TSS</span>}
                                </div>

```

## PHASE 4: Fix Sport Switching & Add MyWhoosh Plan Selector in `PlanSetupForm.tsx`, `TargetRaceSection.tsx`, `EngineGenerateModal.tsx`, `Toolbar.tsx`, and `PlanEditorLayout.tsx`

### Task 4.1: Allow Switching Sport in Settings Mode and Auto-Sync `sport` with `raceType` in `Web/src/components/setup/TargetRaceSection.tsx`

Open `Web/src/components/setup/TargetRaceSection.tsx`:

1. Show the `Sport` selector buttons in `'settings'` and `'modal'` modes too (not only `'onboarding'` and `'advanced'`), and when the user picks a Triathlon distance from the `<select>` dropdown, automatically set `sport` to `'TRIATHLON'`:

**FIND:**

```
            {(mode === 'onboarding' || mode === 'advanced') && setSport && (

```

**REPLACE WITH:**

```
            {setSport && (

```

And in the `<select value={raceType} ...>` in `Web/src/components/setup/TargetRaceSection.tsx` (around line 116):

**FIND:**

```
                        <select
                            value={raceType}
                            onChange={(e) => setRaceType(e.target.value)}
                            className={inputClass}
                        >

```

**REPLACE WITH:**

```
                        <select
                            value={raceType}
                            onChange={(e) => {
                                const val = e.target.value;
                                setRaceType(val);
                                if (setSport) {
                                    if (['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI'].includes(val)) {
                                        setSport('TRIATHLON');
                                    } else {
                                        setSport('RUN');
                                    }
                                }
                            }}
                            className={inputClass}
                        >

```

### Task 4.2: Fix `effectiveSport`, Send `raceType`/`sport`/`mywhooshPlanId` in Settings Mode, and Add MyWhoosh Training Plan Selector in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`:

1. Import `MYWHOOSH_PLANS` from `@/lib/plans/mywhooshMatcher`:

```
import { MYWHOOSH_PLANS } from '@/lib/plans/mywhooshMatcher';

```

2. Add state `const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('');` right below `const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(false);` (around line 195).

3. In `useEffect` populating `goalsData` (around line 490), also restore `setSport(activeGoal.sport || (TRIATHLON_RACE_TYPES.has(activeGoal.raceType) ? 'TRIATHLON' : 'RUN'));`.

4. Fix `effectiveSport` in `createGoalMutation` (line 650):

**FIND:**

```
            const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType);
            const effectiveSport = sport || (isTriathlon ? 'TRIATHLON' : 'RUN');

```

**REPLACE WITH:**

```
            const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON';
            const effectiveSport = sport === 'NO_RACE' ? 'NO_RACE' : (isTriathlon ? 'TRIATHLON' : 'RUN');

```

5. Pass `mywhooshPlanId: matchToMyWhoosh && mywhooshPlanId ? mywhooshPlanId : undefined` in both `createGoalMutation` (around line 704) and `updateSettingsMutation` (around line 807), and in `updateSettingsMutation` also include `raceType`, `raceDate`, `planStartDate`, and `sport: TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport` in the `POST /api/settings/update-vdot` JSON body.

6. Expand the MyWhoosh section in `Web/src/components/PlanSetupForm.tsx` (lines 1070–1087) to include the **MyWhoosh Training Plan Selector**:

**FIND:**

```
            {/* MyWhoosh (visible when cycling rides are part of the plan) */}
            {ridesPerWeek > 0 && (
                <div className="border-t border-glass-border pt-6">
                    <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-glass-border">
                        <div className="pr-3">
                            <p className="text-sm text-foreground">Match Cycling Workouts to MyWhoosh</p>
                            <p className="text-xs text-foreground-muted">Match planned rides to the closest official MyWhoosh workout and enable custom .zwo workout import</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMatchToMyWhoosh(!matchToMyWhoosh)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${matchToMyWhoosh ? 'bg-accent-cyan' : 'bg-glass-border'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchToMyWhoosh ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            )}

```

**REPLACE WITH:**

```
            {/* MyWhoosh (visible when cycling rides or triathlon are part of the plan) */}
            {(ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (
                <div className="border-t border-glass-border pt-6 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-glass-border">
                        <div className="pr-3">
                            <p className="text-sm text-foreground">Match Cycling Workouts to MyWhoosh</p>
                            <p className="text-xs text-foreground-muted">Populate planned rides with official MyWhoosh workout steps (%FTP, intervals, cadence) and enable .zwo export</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMatchToMyWhoosh(!matchToMyWhoosh)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${matchToMyWhoosh ? 'bg-accent-cyan' : 'bg-glass-border'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchToMyWhoosh ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {matchToMyWhoosh && (
                        <div className="p-3 rounded-md bg-surface border border-glass-border space-y-2">
                            <label className="block text-xs font-semibold text-accent-cyan">
                                MyWhoosh Training Plan / Workout Selector
                            </label>
                            <select
                                value={mywhooshPlanId}
                                onChange={(e) => setMywhooshPlanId(e.target.value)}
                                className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan"
                            >
                                <option value="">Auto-Match Closest MyWhoosh Workout by Phase & Duration</option>
                                {MYWHOOSH_PLANS.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} ({plan.category} · {plan.level} · {plan.weeksCount}w)
                                    </option>
                                ))}
                            </select>
                            {mywhooshPlanId && (
                                <p className="text-[11px] text-foreground-muted">
                                    {MYWHOOSH_PLANS.find((p) => p.id === mywhooshPlanId)?.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

```

### Task 4.3: Fix Cache Invalidation in `Web/src/components/PlanEditor/Toolbar.tsx`, Wire `ZwoImportDialog` in `Web/src/components/PlanEditor/PlanEditorLayout.tsx`, and Add MyWhoosh Plan Selector to `Web/src/components/PlanEditor/EngineGenerateModal.tsx`

1. In `Web/src/components/PlanEditor/Toolbar.tsx`:

   * Import `useQueryClient` from `@tanstack/react-query`.

   * Add `onImportZwo?: () => void;` to `ToolbarProps`, destructure `onImportZwo`, and pass `onImportZwo={onImportZwo}` to `<PlanActionsMenu />`.

   * In `<EngineGenerateModal ... onSuccess={() => { ... }} />` (lines 185–187), invalidate the plan queries so the Calendar and Analysis diagrams update immediately after regenerating:

**FIND:**

```
                onSuccess={() => {
                    // refresh if needed
                }}

```

**REPLACE WITH:**

```
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
                    queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId, 'planned-fitness'] });
                    queryClient.invalidateQueries({ queryKey: ['goals'] });
                    queryClient.invalidateQueries({ queryKey: ['plan'] });
                }}

```

2. In `Web/src/components/PlanEditor/PlanEditorLayout.tsx`:

   * Lazy-import `ZwoImportDialog`:

     ```
     const ZwoImportDialog = lazy(() =>
         import('@/app/plan-advanced/components/CsvImportExport').then((mod) => ({ default: mod.ZwoImportDialog }))
     );
     
     ```

   * Add `const [zwoImportOpen, setZwoImportOpen] = useState(false);`.

   * Pass `onImportZwo={() => setZwoImportOpen(true)}` to `<Toolbar />`.

   * Render `<ZwoImportDialog goalId={goalId} isOpen={zwoImportOpen} onClose={() => setZwoImportOpen(false)} onImported={() => { setZwoImportOpen(false); queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] }); }} />` right below `<CsvImportDialog />`.

3. In `Web/src/components/PlanEditor/EngineGenerateModal.tsx`:

   * Import `MYWHOOSH_PLANS` from `@/lib/plans/mywhooshMatcher`.

   * Add state:

     ```
     const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(true);
     const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('mw-plan-triathlon-base');
     
     ```

   * Include `matchToMyWhoosh` and `mywhooshPlanId: matchToMyWhoosh ? mywhooshPlanId : null` in the `fetch('/api/plan-advanced/${goalId}/regenerate', ...)` and `fetch('/api/plans', ...)` POST bodies.

   * When `sport === 'TRIATHLON' || ridesPerWeek > 0`, render a MyWhoosh Training Plan selector block inside the modal form so the user can choose which MyWhoosh Training Plan (`MYWHOOSH_PLANS`) populates the cycling workouts.

## PHASE 5: Add Per-Workout MyWhoosh Selector in `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`

### Task 5.1: Add a MyWhoosh Workout Library Selector & `.zwo` Exporter in `WorkoutDetailPanel.tsx`

Open `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`:

1. Import `MYWHOOSH_WORKOUTS`, `MYWHOOSH_PLANS`, `mywhooshWorkoutToStructuredV2`, and `generateMyWhooshZwoXml`:

```
import {
    MYWHOOSH_WORKOUTS,
    MYWHOOSH_PLANS,
    mywhooshWorkoutToStructuredV2,
    type MyWhooshWorkout,
} from '@/lib/plans/mywhooshMatcher';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';

```

2. Inside `WorkoutDetailPanel` (right inside the `{effectiveSport === 'BIKE' && ( ... )}` block around line 395), add a **MyWhoosh Workout Selector** dropdown and **Download `.zwo`** button so selecting any MyWhoosh workout immediately fills the workout's `customName`, `description`, `targetDuration`, `plannedTss`, `targetFtpPercent`, `targetPowerWatts`, and `structuredSteps` (`StructuredWorkoutV2`):

```
                        {/* MyWhoosh Workout Selector (shows exact same workout steps in RunFlow) */}
                        <div className="pt-2 border-t border-glass-border space-y-1.5">
                            <label className="block text-[10px] font-semibold text-accent-cyan uppercase tracking-wider">
                                Load Official MyWhoosh Workout
                            </label>
                            <select
                                value=""
                                onChange={(e) => {
                                    const mw = MYWHOOSH_WORKOUTS.find((w) => w.id === e.target.value);
                                    if (!mw) return;
                                    const v2 = mywhooshWorkoutToStructuredV2(mw, ftpWatts);
                                    const avgWatts = Math.round(ftpWatts * mw.intensityFactor);
                                    isDirtyRef.current = true;
                                    setForm((prev) => ({
                                        ...prev,
                                        customName: `MyWhoosh: ${mw.name}`,
                                        description: `${mw.name} (${mw.category}) — ${mw.stepsSummary}`,
                                        targetDuration: mw.durationSeconds,
                                        plannedTss: Math.round(mw.tss),
                                        targetFtpPercent: Math.round(mw.intensityFactor * 100),
                                        targetPowerWatts: avgWatts,
                                        structuredSteps: v2,
                                    }));
                                }}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
                            >
                                <option value="">-- Choose a MyWhoosh workout to load steps --</option>
                                {MYWHOOSH_PLANS.map((plan) => (
                                    <optgroup key={plan.id} label={`Plan: ${plan.name}`}>
                                        {Array.from(new Set(Object.values(plan.workoutIdsByPhase).flat()))
                                            .map((wid) => MYWHOOSH_WORKOUTS.find((w) => w.id === wid))
                                            .filter((w): w is MyWhooshWorkout => Boolean(w))
                                            .map((mw) => (
                                                <option key={`${plan.id}-${mw.id}`} value={mw.id}>
                                                    {mw.name} ({Math.round(mw.durationSeconds / 60)}m · TSS {mw.tss} · IF {mw.intensityFactor})
                                                </option>
                                            ))}
                                    </optgroup>
                                ))}
                                <optgroup label="All MyWhoosh Workouts">
                                    {MYWHOOSH_WORKOUTS.map((mw) => (
                                        <option key={mw.id} value={mw.id}>
                                            [{mw.category}] {mw.name} ({Math.round(mw.durationSeconds / 60)}m · TSS {mw.tss})
                                        </option>
                                    ))}
                                </optgroup>
                            </select>

                            <button
                                type="button"
                                onClick={() => {
                                    const xml = generateMyWhooshZwoXml({
                                        name: form.customName || form.description || 'RunFlow Bike Workout',
                                        description: form.description || '',
                                        workoutType: form.workoutType,
                                        targetDurationSeconds: form.targetDuration || 3600,
                                        phase: form.phase,
                                    });
                                    const blob = new Blob([xml], { type: 'application/octet-stream' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${(form.customName || form.workoutType).replace(/[^a-z0-9-_]+/gi, '_')}.zwo`;
                                    document.body.appendChild(a);
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                }}
                                className="w-full mt-1 py-1.5 px-2.5 rounded border border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-[11px] font-medium transition-colors"
                            >
                                Export Workout as MyWhoosh / Zwift (.zwo)
                            </button>
                        </div>

```

3. Also in `Web/src/components/dashboard/WorkoutScheduleCard.tsx` line 15, add `'RIDE_INTERVALS'` to `MYWHOOSH_CYCLING_TYPES`:

```
const MYWHOOSH_CYCLING_TYPES = new Set(['RIDE', 'LONG_RIDE', 'RIDE_INTERVALS', 'BRICK']);

```

## PHASE 6: Verification Gates

Run the following commands and ensure all checks pass with zero errors:

```
python3 scripts/scrape_mywhoosh_workouts.py --seed
cd Web && npx tsc --noEmit && npm test

```