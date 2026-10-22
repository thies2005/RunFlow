# Multi-Agent Fix & Polish Playbook: Settings-Only Named Dashboard Customization, Direct Plan Import in Plan Setup Phase, MyWhoosh Residual Cleanup & Security Hardening (`v2.1`)

* **Target Environment**: Google Antigravity IDE / Agent Manager
* **Target Model**: **Gemini 3.8 Flash Medium** (`gemini-3.8-flash`, `thinking_level: medium`)
* **Target Commit Baseline**: `51101d20d930b7cde7939cd0be05c96d4ca31821` (`48/48` `v1` edits applied; `v2.1` upgrades widget headers, mode names, direct Plan Setup import, and security fixes)
* **Scope**: Implement all **6 post-implementation UX, Plan Setup Import, and `@security-audit` fixes** across **3 disjoint parallel subagents** (`9` files, `24` verified `FIND`/`REPLACE WITH` blocks):

  1. **Settings-Only Dashboard Customization (Removed from Top of Widget) + Sensible Mode Names (`UX-01`)**:
     * Removes all top-of-widget switcher buttons (`2 Boxes | Sample A | Sample C | Classic`), `<SlidersHorizontal />` gear buttons, inline `"Edit Fields"` buttons, and `renderCustomizerDrawer()` from `Web/src/components/dashboard/TrainingStatusCard.tsx`.
     * Renames all 4 Dashboard Layout Modes with sensible, descriptive names (no `"Sample A"`, `"Sample C"`, `"Sample 1/2/3"`, or `"2 Boxes"`):
       * **`DUAL_BOXES`**: **Dual Sport Cards** (`Dual Sport Cards — Running + Cycling`)
       * **`COMBINED_STRIP`**: **Hybrid Overview** (`Hybrid Overview — Combined + Cycling Strip`)
       * **`CYCLING_HERO`**: **Cycling Cockpit** (`Cycling Cockpit — Power & FTP Focus`)
       * **`CLASSIC_RUN`**: **Classic Running** (`Classic Running — Run Metrics Only`)
     * Places the **Home Dashboard Layout & Metrics Customizer + Interactive Live Preview** inside **App Settings (`AppSettingsSubPage`)** AND **Biometrics / Display (`BiometricsSubPage`)** in `Web/src/components/MinimalistPillsMenu.tsx`.
  2. **Direct Plan Import in the Plan Setup Phase (`UX-02`)**:
     * Upgrades `Web/src/components/PlanSetupForm.tsx` across **all Plan Setup modes** (`onboarding`, `settings`, `modal`, `advanced`) with a **Direct Plan Import** panel:
       * **Upload & Import CSV Plan Directly (`.csv`)**: Pick a `.csv` file right inside Plan Setup to automatically create/use the goal, parse & confirm the CSV via `/api/plan-advanced/[goalId]/csv/import` in one step, and import all workouts immediately.
       * **Download CSV Template**: 1-click download of `runflow_plan_template.csv` right during Plan Setup.
       * **Import from Calendar Picture (AI Vision) / `.zwo` File**: Creates the plan container and deep-links directly to `/plan-advanced/[goalId]?import=ai-image` or `?import=zwo`.
     * Upgrades `Web/src/components/PlanEditor/PlanEditorLayout.tsx` to read `?import=csv`, `?import=zwo`, or `?import=ai-image` on mount and automatically open the corresponding importer dialog/panel.
  3. **Remove Residual Synthetic MyWhoosh Payloads & Dead Imports (`FUNC-01`)**:
     * Cleans up `updateSettingsMutation` and `setSport('CYCLING')` in `Web/src/components/PlanSetupForm.tsx`, `handleGenerate` in `Web/src/components/PlanEditor/EngineGenerateModal.tsx`, and unused imports in `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx` so regenerating or updating settings never silently activates `mw-plan-ftp-builder` or `matchToMyWhoosh: true`.
  4. **Fix CSV Import for Cycling Workouts (`FUNC-02`)**:
     * Updates `POST /api/plan-advanced/[goalId]/csv/import/route.ts` to resolve `sport = resolveWorkoutSport(w.workoutType)`, auto-build `structuredSteps` (`buildStructuredStepsForWorkout`), and compute `plannedTss` (`calculateWorkoutPlannedTss`) so imported `RIDE`, `RIDE_INTERVALS`, and `LONG_RIDE` CSV rows are stored as `sport: 'BIKE'` with full `.zwo` export support.
  5. **Fix Cycling Icons & Custom Workout Names on Dashboard Schedule Card (`FUNC-03`)**:
     * Updates `Web/src/components/dashboard/WorkoutScheduleCard.tsx` so `LONG_RIDE`, `RIDE_INTERVALS`, and `BRICK` render the `<Bike />` icon and display `customName` when present.
  6. **Security Audit Fixes (`@security-audit` — `SEC-NEW-01`, `SEC-NEW-02`, `SEC-NEW-03`)**:
     * **`SEC-NEW-01` (Medium — Quota Slot Leak & Unmetered Vision Tokens in `ai-chat/route.ts`)**: Releases the reserved AI usage slot (`releaseUsageReservation`) if `extractCalendarImageSummary` fails before streaming starts, and accounts for vision OCR tokens in `incrementUsage`.
     * **`SEC-NEW-02` (Low/Medium — Allowlist Validation on `localStorage` Metric Arrays)**: Adds `readDashboardCyclingMetrics()` and `readDashboardRunningMetrics()` in `TrainingStatusCard.tsx` to validate and deduplicate `localStorage` metric IDs against strict allowlists.
     * **`SEC-NEW-03` (Medium — Unbounded `plannedTss` in MCP `import_plan_workouts_batch`)**: Clamps `raw.plannedTss` to finite `0..1000` and falls back to `calculateWorkoutPlannedTss(...)` in `Web/src/app/mcp/route.ts`.

---

## 1. Execution Rules & Subagent Wave Allocation

1. **Single Parallel Wave (3 Disjoint Subagents)**: Spawn **Agent-FIX-1**, **Agent-FIX-2**, and **Agent-FIX-3** in parallel. Their file write scopes are 100% disjoint.
2. **Exact `FIND` / `REPLACE WITH` Execution**: Apply every `FIND` and `REPLACE WITH` block verbatim in order.
3. **Final Coordinator Verification Gate**: Run `cd Web && npx tsc --noEmit && npm test` once all 3 subagents finish.

| Wave | Agent ID | Assigned Scope | Exclusive Write-Lock Files | Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 1** | **Agent-FIX-1** (`dashboard-widget-clean-and-named-modes`) | Clean Widget Header (No Top Controls), Sensible Layout Mode Names, Safe Storage Readers & Cycling Schedule Icons Agent | `Web/src/components/dashboard/TrainingStatusCard.tsx`<br>`Web/src/components/dashboard/WorkoutScheduleCard.tsx` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-FIX-2** (`settings-customizer-and-plan-setup-direct-import`) | App Settings Home Customizer + Live Preview, Direct Plan Import in Plan Setup Phase & Residual MyWhoosh Cleanup Agent | `Web/src/components/MinimalistPillsMenu.tsx`<br>`Web/src/components/PlanSetupForm.tsx`<br>`Web/src/components/PlanEditor/PlanEditorLayout.tsx`<br>`Web/src/components/PlanEditor/EngineGenerateModal.tsx`<br>`Web/src/components/PlanEditor/WorkoutDetailPanel.tsx` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-FIX-3** (`security-and-csv-mcp-import-fixes`) | Security Audit Hardening (`SEC-NEW-01`, `SEC-NEW-03`) & CSV Cycling Import (`FUNC-02`) Agent | `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`<br>`Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`<br>`Web/src/app/mcp/route.ts` | `cd Web && npx tsc --noEmit && npm test` |

---

## 2. Subagent Prompts (Spawn All 3 in Parallel)

### Agent-FIX-1 Prompt (`dashboard-widget-clean-and-named-modes`)

> **Role**: Clean Widget Header (No Top Controls), Sensible Layout Mode Names, Safe Storage Readers & Cycling Schedule Icons Agent `dashboard-widget-clean-and-named-modes` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/dashboard/TrainingStatusCard.tsx`
> * `Web/src/components/dashboard/WorkoutScheduleCard.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 4 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 1.1: Rename Layout Modes (`Dual Sport Cards`, `Hybrid Overview`, `Cycling Cockpit`, `Classic Running`) and Remove Unused Widget Customizer Icons in `Web/src/components/dashboard/TrainingStatusCard.tsx`

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
import { TrendingUp, Activity, Gauge, SlidersHorizontal, Bike, Zap, Check, Columns2, Layers } from 'lucide-react';
import { useUserMetrics } from '../providers/UserMetricsProvider';
import { interpretTsb } from '@/lib/metrics/fitness';
import { useState, useEffect } from 'react';

export type DashboardStatusLayoutMode =
    | 'DUAL_BOXES'      // 2 Boxes just like now: 1 for Running + 1 for Cycling
    | 'COMBINED_STRIP'  // Sample A: Combined Card + Customizable Cycling Strip
    | 'CYCLING_HERO'    // Sample C: Cycling Hero Cockpit Card
    | 'CLASSIC_RUN';    // Just Like Now: Classic Single Running Status Card

export type CyclingDashboardMetricId =
    | 'cyclingVo2max'
    | 'activeFtp'
    | 'wPerKg'
    | 'weeklyBikeTss'
    | 'weeklyBikeKm'
    | 'ctlBike'
    | 'tsbBike'
    | 'avgEf';

export type RunningDashboardMetricId =
    | 'vdot'
    | 'weeklyRunKm'
    | 'avg3MoRunKm'
    | 'easyTrimp';

export interface DashboardMetricOption<T extends string> {
    id: T;
    label: string;
    shortLabel: string;
    unit: string;
    colorClass: string;
}

export const DASHBOARD_LAYOUT_MODE_OPTIONS: {
    id: DashboardStatusLayoutMode;
    title: string;
    badge: string;
    description: string;
}[] = [
    {
        id: 'DUAL_BOXES',
        title: '2 Boxes (Running Card + Cycling Card)',
        badge: '2 Boxes',
        description: 'Two full-size status boxes side-by-side: one dedicated to Running and one dedicated to Cycling.',
    },
    {
        id: 'COMBINED_STRIP',
        title: 'Sample A (Combined Card + Cycling Strip)',
        badge: 'Sample A',
        description: 'Single Training Status card with Running Shape/VO2max on top and a customizable Cycling Metrics grid strip.',
    },
    {
        id: 'CYCLING_HERO',
        title: 'Sample C (Cycling Hero Cockpit)',
        badge: 'Sample C',
        description: 'Single Cycling-first card with Active FTP (W/kg) & Cycling VO2max hero metrics and Bike CTL/ATL/TSB bars.',
    },
    {
        id: 'CLASSIC_RUN',
        title: 'Classic Running Card (Just Like Now)',
        badge: 'Classic',
        description: 'Original single Training Status card focused on Running Shape, VO2max, and Running CTL/ATL/TSB.',
    },
];
```

**REPLACE WITH:**
```tsx
import { TrendingUp, Activity, Gauge, Bike, Zap } from 'lucide-react';
import { useUserMetrics } from '../providers/UserMetricsProvider';
import { interpretTsb } from '@/lib/metrics/fitness';
import { useState, useEffect } from 'react';

export type DashboardStatusLayoutMode =
    | 'DUAL_BOXES'      // Dual Sport Cards: Running Card + Cycling Card
    | 'COMBINED_STRIP'  // Hybrid Overview: Combined Card + Cycling Strip
    | 'CYCLING_HERO'    // Cycling Cockpit: Power & FTP Focus Card
    | 'CLASSIC_RUN';    // Classic Running: Running Metrics Only Card

export type CyclingDashboardMetricId =
    | 'cyclingVo2max'
    | 'activeFtp'
    | 'wPerKg'
    | 'weeklyBikeTss'
    | 'weeklyBikeKm'
    | 'ctlBike'
    | 'tsbBike'
    | 'avgEf';

export type RunningDashboardMetricId =
    | 'vdot'
    | 'weeklyRunKm'
    | 'avg3MoRunKm'
    | 'easyTrimp';

export interface DashboardMetricOption<T extends string> {
    id: T;
    label: string;
    shortLabel: string;
    unit: string;
    colorClass: string;
}

export const DASHBOARD_LAYOUT_MODE_OPTIONS: {
    id: DashboardStatusLayoutMode;
    title: string;
    badge: string;
    description: string;
}[] = [
    {
        id: 'DUAL_BOXES',
        title: 'Dual Sport Cards (Running + Cycling)',
        badge: 'Dual Cards',
        description: 'Two full-size status cards side-by-side: one dedicated to Running and one dedicated to Cycling.',
    },
    {
        id: 'COMBINED_STRIP',
        title: 'Hybrid Overview (Combined + Cycling Strip)',
        badge: 'Hybrid',
        description: 'Unified Training Status card with Running Shape & VO2max on top plus a customizable Cycling Metrics grid.',
    },
    {
        id: 'CYCLING_HERO',
        title: 'Cycling Cockpit (Power & FTP Focus)',
        badge: 'Cycling',
        description: 'Cycling-first card featuring Active FTP (W/kg), Cycling VO2max, and Bike CTL/ATL/TSB load bars.',
    },
    {
        id: 'CLASSIC_RUN',
        title: 'Classic Running (Run Metrics Only)',
        badge: 'Running',
        description: 'Focused single Training Status card with Running Shape, VO2max, and Running CTL/ATL/TSB.',
    },
];
```

#### Edit 1.2: Add Validated Allowlist Readers (`readDashboardCyclingMetrics`, `readDashboardRunningMetrics`) and Remove Inline Widget Drawer State in `Web/src/components/dashboard/TrainingStatusCard.tsx`

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
export function readDashboardLayoutMode(): DashboardStatusLayoutMode {
    if (typeof window === 'undefined') return 'COMBINED_STRIP';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
        if (raw === 'DUAL_BOXES' || raw === 'COMBINED_STRIP' || raw === 'CYCLING_HERO' || raw === 'CLASSIC_RUN') {
            return raw;
        }
    } catch {
        // ignore
    }
    return 'COMBINED_STRIP';
}

export default function TrainingStatusCard() {
    const {
        marathonShape,
        vdot,
        aerobicVo2max,
        cyclingVo2max,
        activeFtpWatts,
        wPerKg,
        weeklyBikeTss,
        weeklyBikeKm,
        ctlBike,
        atlBike,
        tsbBike,
        avgEfficiencyFactor,
        currentWeekMileage,
        avgWeeklyKmLast3Months,
        correctionFactor,
        ctl,
        atl,
        tsb,
        workloadRatio,
        easyTrimp,
        maxCtl,
        maxAtl,
        ctlPercent,
        atlPercent
    } = useUserMetrics();

    const [showAbsoluteAtl, setShowAbsoluteAtl] = useState(false);
    const [showAbsoluteCtl, setShowAbsoluteCtl] = useState(false);
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
    const [layoutMode, setLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    useEffect(() => {
        const loadPrefs = () => {
            try {
                setLayoutMode(readDashboardLayoutMode());
                const savedBike = localStorage.getItem(STORAGE_KEY_CYCLING_METRICS);
                if (savedBike) {
                    const parsed = JSON.parse(savedBike);
                    if (Array.isArray(parsed)) setSelectedCyclingMetrics(parsed);
                }
                const savedRun = localStorage.getItem(STORAGE_KEY_RUNNING_METRICS);
                if (savedRun) {
                    const parsed = JSON.parse(savedRun);
                    if (Array.isArray(parsed)) setSelectedRunningMetrics(parsed);
                }
            } catch {
                // ignore storage errors
            }
        };
        loadPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
        window.addEventListener('storage', loadPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
            window.removeEventListener('storage', loadPrefs);
        };
    }, []);

    const updateLayoutMode = (mode: DashboardStatusLayoutMode) => {
        setLayoutMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
        } catch {
            // ignore
        }
    };

    const toggleCyclingMetric = (id: CyclingDashboardMetricId) => {
        setSelectedCyclingMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_CYCLING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const toggleRunningMetric = (id: RunningDashboardMetricId) => {
        setSelectedRunningMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_RUNNING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };
```

**REPLACE WITH:**
```tsx
const VALID_CYCLING_METRIC_SET = new Set<string>(CYCLING_METRIC_OPTIONS.map((o) => o.id));
const VALID_RUNNING_METRIC_SET = new Set<string>(RUNNING_METRIC_OPTIONS.map((o) => o.id));

export function readDashboardLayoutMode(): DashboardStatusLayoutMode {
    if (typeof window === 'undefined') return 'COMBINED_STRIP';
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
        if (raw === 'DUAL_BOXES' || raw === 'COMBINED_STRIP' || raw === 'CYCLING_HERO' || raw === 'CLASSIC_RUN') {
            return raw;
        }
    } catch {
        // ignore
    }
    return 'COMBINED_STRIP';
}

export function readDashboardCyclingMetrics(): CyclingDashboardMetricId[] {
    if (typeof window === 'undefined') return DEFAULT_CYCLING_METRICS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CYCLING_METRICS);
        if (!raw) return DEFAULT_CYCLING_METRICS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_CYCLING_METRICS;
        const filtered = Array.from(
            new Set(parsed.filter((item): item is CyclingDashboardMetricId => typeof item === 'string' && VALID_CYCLING_METRIC_SET.has(item)))
        );
        return filtered;
    } catch {
        return DEFAULT_CYCLING_METRICS;
    }
}

export function readDashboardRunningMetrics(): RunningDashboardMetricId[] {
    if (typeof window === 'undefined') return DEFAULT_RUNNING_METRICS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_RUNNING_METRICS);
        if (!raw) return DEFAULT_RUNNING_METRICS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_RUNNING_METRICS;
        const filtered = Array.from(
            new Set(parsed.filter((item): item is RunningDashboardMetricId => typeof item === 'string' && VALID_RUNNING_METRIC_SET.has(item)))
        );
        return filtered;
    } catch {
        return DEFAULT_RUNNING_METRICS;
    }
}

export default function TrainingStatusCard() {
    const {
        marathonShape,
        vdot,
        aerobicVo2max,
        cyclingVo2max,
        activeFtpWatts,
        wPerKg,
        weeklyBikeTss,
        weeklyBikeKm,
        ctlBike,
        atlBike,
        tsbBike,
        avgEfficiencyFactor,
        currentWeekMileage,
        avgWeeklyKmLast3Months,
        correctionFactor,
        ctl,
        atl,
        tsb,
        workloadRatio,
        easyTrimp,
        maxCtl,
        maxAtl,
        ctlPercent,
        atlPercent
    } = useUserMetrics();

    const [showAbsoluteAtl, setShowAbsoluteAtl] = useState(false);
    const [showAbsoluteCtl, setShowAbsoluteCtl] = useState(false);
    const [layoutMode, setLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    useEffect(() => {
        const loadPrefs = () => {
            setLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        loadPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
        window.addEventListener('storage', loadPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, loadPrefs);
            window.removeEventListener('storage', loadPrefs);
        };
    }, []);
```

#### Edit 1.3: Remove Top-of-Widget Customization Buttons, Gear Icons, `"Edit Fields"`, and Inline Drawer from `Web/src/components/dashboard/TrainingStatusCard.tsx`

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
    const renderCustomizerDrawer = () =>
        isCustomizeOpen && (
            <div className="mb-5 p-3.5 rounded-md bg-background-secondary border border-accent-cyan/40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-cyan flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Dashboard Layout &amp; Metric Fields
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsCustomizeOpen(false)}
                        className="text-[11px] text-foreground-muted hover:text-foreground"
                    >
                        Done
                    </button>
                </div>

                {/* 4 Layout Presets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {DASHBOARD_LAYOUT_MODE_OPTIONS.map((opt) => {
                        const active = layoutMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => updateLayoutMode(opt.id)}
                                className={`p-2 rounded text-left border transition-colors ${
                                    active
                                        ? 'bg-accent-cyan/15 border-accent-cyan text-foreground'
                                        : 'bg-background-tertiary/60 border-line text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-semibold truncate">{opt.badge}</span>
                                    {active && <Check className="w-3 h-3 text-accent-cyan shrink-0" />}
                                </div>
                                <span className="block text-[10px] text-foreground-muted mt-0.5 line-clamp-1">{opt.title}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Cycling Fields */}
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan mb-1.5">
                        Cycling Metric Fields
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {CYCLING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedCyclingMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleCyclingMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-accent-cyan/10 border-accent-cyan/40 text-foreground font-medium'
                                            : 'bg-background-tertiary/60 border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel}</span>
                                    <span className={`w-3 h-3 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-accent-cyan text-background' : 'border border-line-strong'}`}>
                                        {checked && <Check className="w-2 h-2" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Running Extra Fields (shown in 2-Box mode) */}
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-workout-recovery mb-1.5">
                        Running Box Metric Fields
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary/60 border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel}</span>
                                    <span className={`w-3 h-3 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-workout-recovery text-background' : 'border border-line-strong'}`}>
                                        {checked && <Check className="w-2 h-2" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );

    const renderRunningProgressBars = () => (
```

**REPLACE WITH:**
```tsx
    const renderRunningProgressBars = () => (
```

And in `Web/src/components/dashboard/TrainingStatusCard.tsx`:

**FIND:**
```tsx
    // ─── MODE 1: DUAL_BOXES (2 Boxes Just Like Now — 1 for Running + 1 for Cycling) ───
    if (layoutMode === 'DUAL_BOXES') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* BOX 1: RUNNING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <div className="flex items-center justify-between gap-2 mb-5 shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground-muted">Running Status</h2>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-workout-recovery/15 text-workout-recovery border border-workout-recovery/30">
                                Run Box
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                            className={`p-1.5 rounded-md border transition-colors ${
                                isCustomizeOpen
                                    ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                                    : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                            }`}
                            title="Customize Dashboard Boxes & Metrics"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {renderCustomizerDrawer()}

                    <div className="grid grid-cols-2 gap-4 mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-workout-recovery/15 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-workout-recovery" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Shape</p>
                                <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">{shapePercent}%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                                <Activity className="w-5 h-5 text-accent-cyan" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Running VO2max</p>
                                <div className="flex items-baseline justify-between gap-1">
                                    <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                        {aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : '-'}
                                    </p>
                                    {correctionFactor !== 1.0 && (
                                        <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                            {correctionFactor.toFixed(1)}x
                                        </span>
                                    )}
                                </div>
                                {vdot > 0 && (
                                    <p className="text-[10px] font-mono text-foreground-muted mt-0.5">
                                        Run VDOT: {vdot.toFixed(1)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {activeRunningOptions.length > 0 && (
                        <div className="mb-5 p-2.5 rounded-md bg-background-tertiary/70 border border-line grid grid-cols-2 gap-2 shrink-0">
                            {activeRunningOptions.map((opt) => (
                                <div key={opt.id} className="p-2 rounded bg-background-secondary border border-line/70">
                                    <span className="block text-[10px] text-foreground-muted truncate">{opt.shortLabel}</span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className={`text-sm font-mono font-bold tabular-nums ${opt.colorClass}`}>
                                            {formatRunningMetricValue(opt.id)}
                                        </span>
                                        <span className="text-[9px] text-foreground-muted font-mono">{opt.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {renderWorkloadDiagram(workloadRatio, 'Running Workload Balance')}
                    {renderRunningProgressBars()}
                </div>

                {/* BOX 2: CYCLING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <div className="flex items-center justify-between gap-2 mb-5 shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground-muted">Cycling Status</h2>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                                Bike Box
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                            className="p-1.5 rounded-md border bg-background-tertiary border-line text-foreground-muted hover:text-foreground transition-colors"
                            title="Customize Dashboard Boxes & Metrics"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
```

**REPLACE WITH:**
```tsx
    // ─── MODE 1: DUAL_BOXES (Dual Sport Cards — Running Status + Cycling Status) ───
    if (layoutMode === 'DUAL_BOXES') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* BOX 1: RUNNING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">Running Status</h2>

                    <div className="grid grid-cols-2 gap-4 mb-5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-workout-recovery/15 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-workout-recovery" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Shape</p>
                                <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">{shapePercent}%</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                                <Activity className="w-5 h-5 text-accent-cyan" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground-muted font-semibold leading-tight">Running VO2max</p>
                                <div className="flex items-baseline justify-between gap-1">
                                    <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                        {aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : '-'}
                                    </p>
                                    {correctionFactor !== 1.0 && (
                                        <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                            {correctionFactor.toFixed(1)}x
                                        </span>
                                    )}
                                </div>
                                {vdot > 0 && (
                                    <p className="text-[10px] font-mono text-foreground-muted mt-0.5">
                                        Run VDOT: {vdot.toFixed(1)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {activeRunningOptions.length > 0 && (
                        <div className="mb-5 p-2.5 rounded-md bg-background-tertiary/70 border border-line grid grid-cols-2 gap-2 shrink-0">
                            {activeRunningOptions.map((opt) => (
                                <div key={opt.id} className="p-2 rounded bg-background-secondary border border-line/70">
                                    <span className="block text-[10px] text-foreground-muted truncate">{opt.shortLabel}</span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className={`text-sm font-mono font-bold tabular-nums ${opt.colorClass}`}>
                                            {formatRunningMetricValue(opt.id)}
                                        </span>
                                        <span className="text-[9px] text-foreground-muted font-mono">{opt.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {renderWorkloadDiagram(workloadRatio, 'Running Workload Balance')}
                    {renderRunningProgressBars()}
                </div>

                {/* BOX 2: CYCLING TRAINING STATUS */}
                <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px]">
                    <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">Cycling Status</h2>
```

And in `Web/src/components/dashboard/TrainingStatusCard.tsx`:

**FIND:**
```tsx
    // ─── MODES 2, 3, 4: SINGLE CARD (COMBINED_STRIP / CYCLING_HERO / CLASSIC_RUN) ───
    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px] relative">
            <div className="flex items-center justify-between gap-2 mb-5 shrink-0">
                <h2 className="text-lg font-semibold text-foreground-muted">
                    {layoutMode === 'CYCLING_HERO' ? 'Cycling Status' : 'Training Status'}
                </h2>
                <div className="flex items-center gap-1.5">
                    <div className="inline-flex rounded-md bg-background-tertiary p-0.5 border border-line text-[10px]">
                        <button
                            type="button"
                            onClick={() => updateLayoutMode('DUAL_BOXES')}
                            className="px-2 py-0.5 rounded font-medium text-foreground-muted hover:text-foreground inline-flex items-center gap-1"
                            title="Switch to 2 Boxes (Running + Cycling)"
                        >
                            <Columns2 className="w-3 h-3" />
                            2 Boxes
                        </button>
                        <button
                            type="button"
                            onClick={() => updateLayoutMode('COMBINED_STRIP')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                layoutMode === 'COMBINED_STRIP'
                                    ? 'bg-surface text-foreground border border-line/60'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Sample A
                        </button>
                        <button
                            type="button"
                            onClick={() => updateLayoutMode('CYCLING_HERO')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                layoutMode === 'CYCLING_HERO'
                                    ? 'bg-surface text-foreground border border-line/60'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Sample C
                        </button>
                        <button
                            type="button"
                            onClick={() => updateLayoutMode('CLASSIC_RUN')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${
                                layoutMode === 'CLASSIC_RUN'
                                    ? 'bg-surface text-foreground border border-line/60'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                        >
                            Classic
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                        className={`p-1.5 rounded-md border transition-colors ${
                            isCustomizeOpen
                                ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                                : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                        }`}
                        title="Customize Dashboard Layout & Metrics"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {renderCustomizerDrawer()}
```

**REPLACE WITH:**
```tsx
    // ─── MODES 2, 3, 4: SINGLE CARD (COMBINED_STRIP / CYCLING_HERO / CLASSIC_RUN) ───
    return (
        <div className="glass-card p-6 h-full flex flex-col justify-between min-h-[400px] relative">
            <h2 className="text-lg font-semibold text-foreground-muted mb-5 shrink-0">
                {layoutMode === 'CYCLING_HERO' ? 'Cycling Status' : 'Training Status'}
            </h2>
```

And in `Web/src/components/dashboard/TrainingStatusCard.tsx`:

**FIND:**
```tsx
            {/* Customizable Cycling Metrics Strip (Shown in Sample A & Sample C) */}
            {(layoutMode === 'COMBINED_STRIP' || layoutMode === 'CYCLING_HERO') && activeCyclingOptions.length > 0 && (
                <div className="mb-5 p-3 rounded-md bg-background-tertiary/70 border border-line space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Cycling Metrics
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsCustomizeOpen(true)}
                            className="text-[10px] text-foreground-muted hover:text-foreground underline"
                        >
                            Edit Fields
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
```

**REPLACE WITH:**
```tsx
            {/* Customizable Cycling Metrics Strip (Configured in App Settings) */}
            {(layoutMode === 'COMBINED_STRIP' || layoutMode === 'CYCLING_HERO') && activeCyclingOptions.length > 0 && (
                <div className="mb-5 p-3 rounded-md bg-background-tertiary/70 border border-line space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Cycling Metrics
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
```

#### Edit 1.4: Fix Cycling Icons (`LONG_RIDE`, `RIDE_INTERVALS`, `BRICK`) & Display `customName` in `Web/src/components/dashboard/WorkoutScheduleCard.tsx` (`FUNC-03`)

Open `Web/src/components/dashboard/WorkoutScheduleCard.tsx`.

**FIND:**
```tsx
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workout.isCompleted ? 'bg-positive/20' : (isTodayPending || isNextPending) ? 'bg-accent-orange/20' : 'bg-surface'}`}>
                                            {workout.workoutType === 'EASY' ? <Activity className="w-4 h-4" /> : workout.workoutType === 'LONG_RUN' ? <Rocket className="w-4 h-4" /> : workout.workoutType === 'TEMPO' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'INTERVALS' ? <Flame className="w-4 h-4" /> : workout.workoutType === 'FARTLEK' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'STRENGTH' ? <Dumbbell className="w-4 h-4" /> : workout.workoutType === 'REST' ? <Moon className="w-4 h-4" /> : workout.workoutType === 'RIDE' ? <Bike className="w-4 h-4" /> : workout.workoutType === 'SWIM' ? <Waves className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${workout.isCompleted ? 'text-positive' : (isTodayPending || isNextPending) ? 'text-accent-orange' : 'text-foreground'}`}>
                                                    {workout.description || workout.workoutType?.replace('_', ' ')}
                                                </p>
```

**REPLACE WITH:**
```tsx
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${workout.isCompleted ? 'bg-positive/20' : (isTodayPending || isNextPending) ? 'bg-accent-orange/20' : 'bg-surface'}`}>
                                            {workout.workoutType === 'EASY' ? <Activity className="w-4 h-4" /> : workout.workoutType === 'LONG_RUN' ? <Rocket className="w-4 h-4" /> : workout.workoutType === 'TEMPO' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'INTERVALS' ? <Flame className="w-4 h-4" /> : workout.workoutType === 'FARTLEK' ? <Zap className="w-4 h-4" /> : workout.workoutType === 'STRENGTH' ? <Dumbbell className="w-4 h-4" /> : workout.workoutType === 'REST' ? <Moon className="w-4 h-4" /> : isCyclingWorkout ? <Bike className="w-4 h-4" /> : (workout.workoutType === 'SWIM' || workout.workoutType === 'OPEN_WATER_SWIM') ? <Waves className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-medium ${workout.isCompleted ? 'text-positive' : (isTodayPending || isNextPending) ? 'text-accent-orange' : 'text-foreground'}`}>
                                                    {(workout as Workout & { customName?: string | null }).customName || workout.description || workout.workoutType?.replace(/_/g, ' ')}
                                                </p>
```

#### Verify Agent-FIX-1:

```bash
cd Web && npx tsc --noEmit
```

---

### Agent-FIX-2 Prompt (`settings-customizer-and-plan-setup-direct-import`)

> **Role**: App Settings Home Customizer + Live Preview, Direct Plan Import in Plan Setup Phase & Residual MyWhoosh Cleanup Agent `settings-customizer-and-plan-setup-direct-import` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/MinimalistPillsMenu.tsx`
> * `Web/src/components/PlanSetupForm.tsx`
> * `Web/src/components/PlanEditor/PlanEditorLayout.tsx`
> * `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
> * `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 13 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 2.1: Import `readDashboardCyclingMetrics` & `readDashboardRunningMetrics` in `Web/src/components/MinimalistPillsMenu.tsx`

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
import {
    DASHBOARD_LAYOUT_MODE_OPTIONS,
    CYCLING_METRIC_OPTIONS,
    RUNNING_METRIC_OPTIONS,
    DEFAULT_CYCLING_METRICS,
    DEFAULT_RUNNING_METRICS,
    STORAGE_KEY_LAYOUT_MODE,
    STORAGE_KEY_CYCLING_METRICS,
    STORAGE_KEY_RUNNING_METRICS,
    EVENT_DASHBOARD_LAYOUT_CHANGE,
    readDashboardLayoutMode,
    type DashboardStatusLayoutMode,
    type CyclingDashboardMetricId,
    type RunningDashboardMetricId,
} from '@/components/dashboard/TrainingStatusCard';
```

**REPLACE WITH:**
```tsx
import {
    DASHBOARD_LAYOUT_MODE_OPTIONS,
    CYCLING_METRIC_OPTIONS,
    RUNNING_METRIC_OPTIONS,
    DEFAULT_CYCLING_METRICS,
    DEFAULT_RUNNING_METRICS,
    STORAGE_KEY_LAYOUT_MODE,
    STORAGE_KEY_CYCLING_METRICS,
    STORAGE_KEY_RUNNING_METRICS,
    EVENT_DASHBOARD_LAYOUT_CHANGE,
    readDashboardLayoutMode,
    readDashboardCyclingMetrics,
    readDashboardRunningMetrics,
    type DashboardStatusLayoutMode,
    type CyclingDashboardMetricId,
    type RunningDashboardMetricId,
} from '@/components/dashboard/TrainingStatusCard';
```

#### Edit 2.2: Use Validated Allowlist Readers & Sync Listeners in `BiometricsSubPage` (`Web/src/components/MinimalistPillsMenu.tsx`)

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
    useEffect(() => {
        try {
            setDashboardLayoutMode(readDashboardLayoutMode());
            const savedBike = localStorage.getItem(STORAGE_KEY_CYCLING_METRICS);
            if (savedBike) {
                const parsed = JSON.parse(savedBike);
                if (Array.isArray(parsed)) setSelectedCyclingMetrics(parsed);
            }
            const savedRun = localStorage.getItem(STORAGE_KEY_RUNNING_METRICS);
            if (savedRun) {
                const parsed = JSON.parse(savedRun);
                if (Array.isArray(parsed)) setSelectedRunningMetrics(parsed);
            }
        } catch {
            // ignore
        }
    }, []);
```

**REPLACE WITH:**
```tsx
    useEffect(() => {
        const syncDashboardPrefs = () => {
            setDashboardLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        syncDashboardPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
        window.addEventListener('storage', syncDashboardPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
            window.removeEventListener('storage', syncDashboardPrefs);
        };
    }, []);
```

#### Edit 2.3: Update Live Preview Labels in `BiometricsSubPage` (`Web/src/components/MinimalistPillsMenu.tsx`) With Sensible Mode Names (No `"Sample A"` / `"Sample C"`)

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Box Extra Metrics (2-Box Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[10px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview inside App Settings */}
                <div className="p-3 rounded-md bg-background-tertiary/80 border border-accent-cyan/30 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                            Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                        </span>
                    </div>

                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Preview Box 1: Running */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-workout-recovery/15 text-workout-recovery">Run Box</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Shape</span>
                                        <span className="text-xs font-mono font-bold text-foreground">84%</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Running VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-cyan">53.2</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Run ATL · Run CTL · Run TSB · Weekly TRIMP
                                </div>
                            </div>

                            {/* Preview Box 2: Cycling */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">Bike Box</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Active FTP</span>
                                        <span className="text-xs font-mono font-bold text-accent-orange">255W (3.40 W/kg)</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Cycling VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-purple">52.1</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Bike ATL · Bike CTL · Bike TSB · Weekly Bike TSS
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO' ? 'Cycling Status (Sample C)' : dashboardLayoutMode === 'COMBINED_STRIP' ? 'Training Status (Sample A)' : 'Training Status (Classic)'}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">1 Box</span>
                            </div>
```

**REPLACE WITH:**
```tsx
                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Card Extra Metrics (Dual Sport Cards Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[10px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview inside Settings */}
                <div className="p-3 rounded-md bg-background-tertiary/80 border border-accent-cyan/30 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                            Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                        </span>
                    </div>

                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Preview Card 1: Running */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-workout-recovery/15 text-workout-recovery">Running Card</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Shape</span>
                                        <span className="text-xs font-mono font-bold text-foreground">84%</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Running VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-cyan">53.2</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Run ATL · Run CTL · Run TSB · Weekly TRIMP
                                </div>
                            </div>

                            {/* Preview Card 2: Cycling */}
                            <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">Cycling Card</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Active FTP</span>
                                        <span className="text-xs font-mono font-bold text-accent-orange">255W (3.40 W/kg)</span>
                                    </div>
                                    <div className="p-1.5 rounded bg-background-secondary">
                                        <span className="block text-[9px] text-foreground-muted">Cycling VO2max</span>
                                        <span className="text-xs font-mono font-bold text-accent-purple">52.1</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[9px] font-mono text-foreground-muted pt-1 border-t border-line/60">
                                    Bike ATL · Bike CTL · Bike TSB · Weekly Bike TSS
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 rounded-md bg-surface border border-line space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO'
                                        ? 'Cycling Status — Cycling Cockpit'
                                        : dashboardLayoutMode === 'COMBINED_STRIP'
                                        ? 'Training Status — Hybrid Overview'
                                        : 'Training Status — Classic Running'}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">Single Card</span>
                            </div>
```

#### Edit 2.4: Add Home Dashboard Layout & Metrics Customizer directly into `AppSettingsSubPage` (`Web/src/components/MinimalistPillsMenu.tsx`)

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
function AppSettingsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const [section, setSection] = useState<'main' | 'api' | 'privacy' | 'danger'>('main');
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (settingsData?.healthTrackingEnabled !== undefined) {
            setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
        }
    }, [settingsData]);

    if (section === 'api') return <ApiSection onBack={() => setSection('main')} />;
    if (section === 'privacy') return <PrivacySection healthTrackingEnabled={healthTrackingEnabled} onBack={() => setSection('main')} />;
    if (section === 'danger') return <DangerSection onBack={() => setSection('main')} />;

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">App Settings</h3>

            <div className="space-y-1.5">
```

**REPLACE WITH:**
```tsx
function AppSettingsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const [section, setSection] = useState<'main' | 'api' | 'privacy' | 'danger'>('main');
    const [healthTrackingEnabled, setHealthTrackingEnabled] = useState(false);
    const [dashboardLayoutMode, setDashboardLayoutMode] = useState<DashboardStatusLayoutMode>('COMBINED_STRIP');
    const [selectedCyclingMetrics, setSelectedCyclingMetrics] = useState<CyclingDashboardMetricId[]>(DEFAULT_CYCLING_METRICS);
    const [selectedRunningMetrics, setSelectedRunningMetrics] = useState<RunningDashboardMetricId[]>(DEFAULT_RUNNING_METRICS);

    const { data: settingsData } = useQuery({
        queryKey: ['user-settings'],
        queryFn: async () => {
            const res = await fetch('/api/settings/update-vdot');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (settingsData?.healthTrackingEnabled !== undefined) {
            setHealthTrackingEnabled(settingsData.healthTrackingEnabled);
        }
    }, [settingsData]);

    useEffect(() => {
        const syncDashboardPrefs = () => {
            setDashboardLayoutMode(readDashboardLayoutMode());
            setSelectedCyclingMetrics(readDashboardCyclingMetrics());
            setSelectedRunningMetrics(readDashboardRunningMetrics());
        };
        syncDashboardPrefs();
        window.addEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
        window.addEventListener('storage', syncDashboardPrefs);
        return () => {
            window.removeEventListener(EVENT_DASHBOARD_LAYOUT_CHANGE, syncDashboardPrefs);
            window.removeEventListener('storage', syncDashboardPrefs);
        };
    }, []);

    const handleSelectDashboardLayoutMode = (mode: DashboardStatusLayoutMode) => {
        setDashboardLayoutMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, mode);
            window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
        } catch {
            // ignore
        }
    };

    const handleToggleDashboardCyclingMetric = (id: CyclingDashboardMetricId) => {
        setSelectedCyclingMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_CYCLING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleToggleDashboardRunningMetric = (id: RunningDashboardMetricId) => {
        setSelectedRunningMetrics((prev) => {
            const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
            try {
                localStorage.setItem(STORAGE_KEY_RUNNING_METRICS, JSON.stringify(next));
                window.dispatchEvent(new Event(EVENT_DASHBOARD_LAYOUT_CHANGE));
            } catch {
                // ignore
            }
            return next;
        });
    };

    if (section === 'api') return <ApiSection onBack={() => setSection('main')} />;
    if (section === 'privacy') return <PrivacySection healthTrackingEnabled={healthTrackingEnabled} onBack={() => setSection('main')} />;
    if (section === 'danger') return <DangerSection onBack={() => setSection('main')} />;

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">App Settings</h3>

            {/* Home Dashboard Layout & Metrics Customizer */}
            <div className="space-y-3 p-3.5 rounded-md bg-surface border border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-accent-cyan font-semibold">Home Dashboard Status Layout &amp; Metrics</h4>
                    <span className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/30">
                        Live Preview
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DASHBOARD_LAYOUT_MODE_OPTIONS.map((opt) => {
                        const active = dashboardLayoutMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectDashboardLayoutMode(opt.id)}
                                className={`p-2.5 rounded-md border text-left transition-all ${
                                    active
                                        ? 'border-accent-cyan bg-accent-cyan/10 text-foreground'
                                        : 'border-line bg-background-secondary text-foreground-muted hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold text-foreground">{opt.badge}</span>
                                    {active && <span className="text-[10px] font-mono text-accent-cyan">Active</span>}
                                </div>
                                <p className="text-[11px] font-medium text-foreground mt-0.5">{opt.title}</p>
                                <p className="text-[10px] text-foreground-muted mt-0.5 leading-snug">{opt.description}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="p-2.5 rounded-md bg-background-secondary border border-line space-y-2">
                    <p className="text-[11px] font-semibold text-accent-cyan">Cycling Metrics to Show</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {CYCLING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedCyclingMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardCyclingMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-accent-cyan/10 border-accent-cyan/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-accent-cyan' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] font-semibold text-workout-recovery pt-1">Running Card Extra Metrics (Dual Sport Cards Mode)</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {RUNNING_METRIC_OPTIONS.map((opt) => {
                            const checked = selectedRunningMetrics.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleToggleDashboardRunningMetric(opt.id)}
                                    className={`flex items-center justify-between px-2 py-1 rounded text-left text-[10px] border transition-colors ${
                                        checked
                                            ? 'bg-workout-recovery/10 border-workout-recovery/40 text-foreground font-medium'
                                            : 'bg-background-tertiary border-line text-foreground-muted hover:text-foreground'
                                    }`}
                                >
                                    <span className="truncate pr-1">{opt.shortLabel} ({opt.unit})</span>
                                    <span className={`text-[9px] font-mono ${checked ? 'text-workout-recovery' : 'text-foreground-muted'}`}>
                                        {checked ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Live Interactive Preview */}
                <div className="p-2.5 rounded-md bg-background-tertiary/80 border border-accent-cyan/30 space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                        Live Preview — {DASHBOARD_LAYOUT_MODE_OPTIONS.find((m) => m.id === dashboardLayoutMode)?.title}
                    </span>
                    {dashboardLayoutMode === 'DUAL_BOXES' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Running Status</span>
                                    <span className="text-[9px] font-mono text-workout-recovery">Running Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {RUNNING_METRIC_OPTIONS.filter((o) => selectedRunningMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-foreground-muted">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-foreground">Cycling Status</span>
                                    <span className="text-[9px] font-mono text-accent-cyan">Cycling Card</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2.5 rounded bg-surface border border-line space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-foreground">
                                    {dashboardLayoutMode === 'CYCLING_HERO'
                                        ? 'Cycling Status — Cycling Cockpit'
                                        : dashboardLayoutMode === 'COMBINED_STRIP'
                                        ? 'Training Status — Hybrid Overview'
                                        : 'Training Status — Classic Running'}
                                </span>
                                <span className="text-[9px] font-mono text-accent-cyan">Single Card</span>
                            </div>
                            {dashboardLayoutMode !== 'CLASSIC_RUN' && (
                                <div className="flex flex-wrap gap-1">
                                    {CYCLING_METRIC_OPTIONS.filter((o) => selectedCyclingMetrics.includes(o.id)).map((o) => (
                                        <span key={o.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background-secondary border border-line/60 text-accent-cyan">
                                            {o.shortLabel} ({o.unit})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
```

#### Edit 2.5: Remove Unused `MYWHOOSH_PLANS` Import & Add `Download, ImagePlus, FileSpreadsheet` Icons in `Web/src/components/PlanSetupForm.tsx` (`FUNC-01` & `UX-02`)

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
import {
    AlertCircle, Save, Check, Trash2, Target, Plus, Upload, X, Zap, Waves, Clock
} from 'lucide-react';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { calculateVdot, calculateTrainingPaces, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    type PlanSettings
} from '@/lib/metrics/goalProjection';
import TargetRaceSection from './setup/TargetRaceSection';
import CalibrationSection from './setup/CalibrationSection';
import GoalTimeRenderer from './setup/GoalTimeRenderer';
import TriathlonGoalTimeRenderer from './setup/TriathlonGoalTimeRenderer';
import PlanVolumeSection from './setup/PlanVolumeSection';
import HeartRateZonesSection from './setup/HeartRateZonesSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getRaceDefaults, adjustDefaultsForVdot, getScaledPhaseDefaults } from '@/lib/plans/defaults';
import { MYWHOOSH_PLANS, MYWHOOSH_PHASES, splitMyWhooshPlanAndPhase, encodeMyWhooshPlanAndPhase, type MyWhooshPhaseOption } from '@/lib/plans/mywhooshMatcher';
```

**REPLACE WITH:**
```tsx
import {
    AlertCircle, Save, Check, Trash2, Target, Plus, Upload, X, Zap, Waves, Clock, Download, ImagePlus
} from 'lucide-react';
import { calculateAllRacePredictions } from '@/lib/metrics/runalyze';
import { calculateVdot, calculateTrainingPaces, predictRaceTime, type RaceDistance, DISTANCES } from '@/lib/metrics/vdot';
import {
    calculateProjectedGoalTime,
    type PlanSettings
} from '@/lib/metrics/goalProjection';
import TargetRaceSection from './setup/TargetRaceSection';
import CalibrationSection from './setup/CalibrationSection';
import GoalTimeRenderer from './setup/GoalTimeRenderer';
import TriathlonGoalTimeRenderer from './setup/TriathlonGoalTimeRenderer';
import PlanVolumeSection from './setup/PlanVolumeSection';
import HeartRateZonesSection from './setup/HeartRateZonesSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getRaceDefaults, adjustDefaultsForVdot, getScaledPhaseDefaults } from '@/lib/plans/defaults';
```

#### Edit 2.6: Add Direct Plan Import State (`setupCsvInputRef`, `isImportingSetupPlan`) in `Web/src/components/PlanSetupForm.tsx` (`UX-02`)

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
    const [message, setMessage] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
```

**REPLACE WITH:**
```tsx
    const [message, setMessage] = useState('');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isImportingSetupPlan, setIsImportingSetupPlan] = useState(false);
    const setupCsvInputRef = useRef<HTMLInputElement | null>(null);
```

#### Edit 2.7: Clean Up `updateSettingsMutation` & `createGoalMutation` in `Web/src/components/PlanSetupForm.tsx` (`FUNC-01`)

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
            const resolvedMyWhooshPlanId = (isCycling || matchToMyWhoosh)
                ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
                : undefined;

            const body: Record<string, unknown> = {
```

**REPLACE WITH:**
```tsx
            const body: Record<string, unknown> = {
```

And in `Web/src/components/PlanSetupForm.tsx`:

**FIND:**
```tsx
            const isCycling = sport === 'CYCLING';
            const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
                ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
                : undefined;

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({
                    timeSeconds,
                    raceDistance: calibrationDistance,
                    runsPerWeek,
                    ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                    swimsPerWeek,
                    strengthPerWeek,
                    weeklyMileageGoal: weeklyMileage * 1000,
                    maxHeartRate,
                    restingHeartRate,
                    weight,
                    hrZone1Max: zone1Max,
                    hrZone2Max: zone2Max,
                    hrZone3Max: zone3Max,
                    hrZone4Max: zone4Max,
                    hrZone5Max: zone5Max,
                    hrZone6Max: zone6Max,
                    thresholdHeartRate: parseInt(thresholdHR) || undefined,
                    thresholdPace: thresholdPaceMin || thresholdPaceSec
                        ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
                        : undefined,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                    maxLongRunKm,
                    calibrationFactor,
                    matchToMyWhoosh: isCycling ? true : matchToMyWhoosh,
                    mywhooshPlanId: effectiveMyWhooshPlanId,
```

**REPLACE WITH:**
```tsx
            const isCycling = sport === 'CYCLING';

            const res = await fetch('/api/settings/update-vdot', {
                method: 'POST',
                body: JSON.stringify({
                    timeSeconds,
                    raceDistance: calibrationDistance,
                    runsPerWeek,
                    ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                    swimsPerWeek,
                    strengthPerWeek,
                    weeklyMileageGoal: weeklyMileage * 1000,
                    maxHeartRate,
                    restingHeartRate,
                    weight,
                    hrZone1Max: zone1Max,
                    hrZone2Max: zone2Max,
                    hrZone3Max: zone3Max,
                    hrZone4Max: zone4Max,
                    hrZone5Max: zone5Max,
                    hrZone6Max: zone6Max,
                    thresholdHeartRate: parseInt(thresholdHR) || undefined,
                    thresholdPace: thresholdPaceMin || thresholdPaceSec
                        ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
                        : undefined,
                    taperWeeks,
                    peakWeeks,
                    buildWeeks,
                    maxLongRunKm,
                    calibrationFactor,
                    matchToMyWhoosh: false,
                    mywhooshPlanId: null,
```

#### Edit 2.8: Clean Up `setSport('CYCLING')` Handler in `Web/src/components/PlanSetupForm.tsx` (`FUNC-01`)

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
                setSport={(nextSport: string) => {
                    setSport(nextSport);
                    if (nextSport === 'CYCLING') {
                        setMatchToMyWhoosh(true);
                        const defaultPlan = MYWHOOSH_PLANS.find((p) => p.id === mywhooshPlanId) || MYWHOOSH_PLANS[0];
                        if (!mywhooshPlanId && defaultPlan) {
                            setMywhooshPlanId(defaultPlan.id);
                        }
                        if (defaultPlan) {
                            setDurationWeeks(String(defaultPlan.weeksCount));
                            if (goalName === 'My First Race' || goalName === 'My Race') {
                                setGoalName(defaultPlan.name);
                            }
                        }
                        setRunsPerWeek(0);
                        setRidesPerWeek(4);
                        setSwimsPerWeek(0);
                        setStrengthPerWeek(1);
                    } else if (nextSport === 'RUN' && runsPerWeek === 0) {
                        setRunsPerWeek(4);
                    }
                }}
```

**REPLACE WITH:**
```tsx
                setSport={(nextSport: string) => {
                    setSport(nextSport);
                    if (nextSport === 'CYCLING') {
                        setMatchToMyWhoosh(false);
                        setMywhooshPlanId('');
                        setDurationWeeks('8');
                        if (goalName === 'My First Race' || goalName === 'My Race') {
                            setGoalName('8-Week Cycling FTP Block');
                        }
                        setRunsPerWeek(0);
                        setRidesPerWeek(4);
                        setSwimsPerWeek(0);
                        setStrengthPerWeek(1);
                    } else if (nextSport === 'RUN' && runsPerWeek === 0) {
                        setRunsPerWeek(4);
                    }
                }}
```

#### Edit 2.9: Replace Passive Text Callout & Advanced-Only CSV Button in `Web/src/components/PlanSetupForm.tsx` With **Direct Plan Import in Plan Setup Phase** (`UX-02`)

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
            {/* Cycling Workout Export (.zwo) & External Plan Import (CSV / AI Calendar Screenshot / MCP) */}
            {(sport === 'CYCLING' || ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (
                <div className="border-t border-glass-border pt-6">
                    <div className="p-4 rounded-md bg-surface border border-accent-cyan/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-accent-cyan">
                                MyWhoosh Workout Export (.zwo) &amp; External Plan Import
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                                Export-Only · No Fake Plan Sync
                            </span>
                        </div>
                        <p className="text-[11px] text-foreground-muted leading-relaxed">
                            Every generated or custom cycling workout in RunFlow can be exported as a <strong>.zwo workout file</strong> for direct upload to{' '}
                            <a href="https://workout.mywhoosh.com" target="_blank" rel="noopener noreferrer" className="text-accent-cyan underline">
                                workout.mywhoosh.com
                            </a>.
                        </p>
                        <p className="text-[11px] text-foreground-muted leading-relaxed">
                            Have an existing training plan from a <strong>MyWhoosh Calendar screenshot</strong>, <strong>CSV file</strong>, or <strong>MCP AI chat</strong>? Once your plan is created, open the <strong>Advanced Plan Studio</strong> to import workouts from a <strong>Calendar Picture</strong> in AI Chat, upload a <strong>.csv</strong> or <strong>.zwo</strong> file, or push workouts via <strong>MCP</strong>.
                        </p>
                    </div>
                </div>
            )}
```

**REPLACE WITH:**
```tsx
            {/* Direct Plan Import in Plan Setup Phase (CSV / Calendar Screenshot AI / .zwo) */}
            <div className="border-t border-glass-border pt-6">
                <div className="p-4 rounded-md bg-surface border border-accent-cyan/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-accent-cyan">
                            Import Existing Training Plan Directly (CSV / Calendar Picture / .zwo)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                            Direct Setup Import
                        </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted leading-relaxed">
                        Already have a schedule from a <strong>CSV file</strong>, a <strong>MyWhoosh / Coach Calendar screenshot</strong>, or a <strong>.zwo workout</strong>? Import it directly right here instead of generating from scratch. All cycling workouts can also be exported as <strong>.zwo</strong> files for{' '}
                        <a href="https://workout.mywhoosh.com" target="_blank" rel="noopener noreferrer" className="text-accent-cyan underline">
                            workout.mywhoosh.com
                        </a>.
                    </p>

                    <input
                        ref={setupCsvInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            setIsImportingSetupPlan(true);
                            setMessage('');
                            try {
                                let targetGoalId = activeGoalId;
                                if (!targetGoalId) {
                                    const isDurationBased = sport === 'NO_RACE' || sport === 'CYCLING';
                                    const effectiveSport = sport === 'CYCLING' ? 'CYCLING' : TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport;
                                    const createRes = await fetch('/api/plans', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            name: goalName && goalName !== 'My First Race' ? goalName : file.name.replace(/\.csv$/i, '') || 'Imported Plan',
                                            sport: effectiveSport,
                                            raceType: isDurationBased ? null : raceType,
                                            raceDate: isDurationBased ? null : (raceDate ? new Date(raceDate).toISOString() : null),
                                            planStartDate: planStartDate ? new Date(planStartDate).toISOString() : new Date().toISOString(),
                                            durationWeeks: parseInt(durationWeeks) || 8,
                                            planSource: 'advanced',
                                            creationMode: 'EXPERT_MANUAL',
                                            matchToMyWhoosh: false,
                                            mywhooshPlanId: null,
                                        }),
                                    });
                                    if (!createRes.ok) throw new Error('Failed to initialize plan for CSV import');
                                    const createData = await createRes.json();
                                    targetGoalId = createData.plan?.id ?? createData.goal?.id;
                                }
                                if (!targetGoalId) throw new Error('Could not resolve plan ID');

                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('formatHint', 'runflow');
                                const previewRes = await fetch(`/api/plan-advanced/${encodeURIComponent(targetGoalId)}/csv/import`, {
                                    method: 'POST',
                                    body: formData,
                                });
                                const previewData = await previewRes.json().catch(() => ({}));
                                if (!previewRes.ok || !previewData.previewId) {
                                    throw new Error(previewData.error || 'Failed to parse CSV file');
                                }

                                const confirmRes = await fetch(`/api/plan-advanced/${encodeURIComponent(targetGoalId)}/csv/import`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ previewId: previewData.previewId, confirm: true }),
                                });
                                const confirmData = await confirmRes.json().catch(() => ({}));
                                if (!confirmRes.ok) {
                                    throw new Error(confirmData.error || 'Failed to confirm CSV import');
                                }

                                if (typeof window !== 'undefined') {
                                    localStorage.removeItem('runflow_onboarding_dismissed');
                                }
                                queryClient.invalidateQueries({ queryKey: ['goals'] });
                                queryClient.invalidateQueries({ queryKey: ['plan'] });
                                queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                                setMessage(`Imported ${confirmData.created ?? previewData.validRows ?? 0} workouts from ${file.name}!`);
                                window.location.href = `/plan-advanced/${encodeURIComponent(targetGoalId)}`;
                            } catch (err) {
                                setMessage(`Error: ${err instanceof Error ? err.message : 'CSV import failed'}`);
                            } finally {
                                setIsImportingSetupPlan(false);
                            }
                        }}
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                            type="button"
                            disabled={isImportingSetupPlan || isLoading}
                            onClick={() => setupCsvInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan text-xs font-semibold hover:bg-accent-cyan/25 transition-colors disabled:opacity-50"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            {isImportingSetupPlan ? 'Importing CSV...' : 'Upload & Import CSV (.csv)'}
                        </button>

                        <button
                            type="button"
                            disabled={isImportingSetupPlan || isLoading}
                            onClick={async () => {
                                setIsImportingSetupPlan(true);
                                setMessage('');
                                try {
                                    let targetGoalId = activeGoalId;
                                    if (!targetGoalId) {
                                        const isDurationBased = sport === 'NO_RACE' || sport === 'CYCLING';
                                        const effectiveSport = sport === 'CYCLING' ? 'CYCLING' : TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport;
                                        const createRes = await fetch('/api/plans', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                name: goalName && goalName !== 'My First Race' ? goalName : 'Imported Calendar Plan',
                                                sport: effectiveSport,
                                                raceType: isDurationBased ? null : raceType,
                                                raceDate: isDurationBased ? null : (raceDate ? new Date(raceDate).toISOString() : null),
                                                planStartDate: planStartDate ? new Date(planStartDate).toISOString() : new Date().toISOString(),
                                                durationWeeks: parseInt(durationWeeks) || 8,
                                                planSource: 'advanced',
                                                creationMode: 'EXPERT_MANUAL',
                                                matchToMyWhoosh: false,
                                                mywhooshPlanId: null,
                                            }),
                                        });
                                        if (!createRes.ok) throw new Error('Failed to create plan for AI Calendar import');
                                        const createData = await createRes.json();
                                        targetGoalId = createData.plan?.id ?? createData.goal?.id;
                                    }
                                    if (!targetGoalId) throw new Error('Could not resolve plan ID');
                                    window.location.href = `/plan-advanced/${encodeURIComponent(targetGoalId)}?import=ai-image`;
                                } catch (err) {
                                    setMessage(`Error: ${err instanceof Error ? err.message : 'Failed to open Calendar Picture importer'}`);
                                    setIsImportingSetupPlan(false);
                                }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-hover border border-glass-border text-foreground text-xs font-medium hover:border-accent-cyan/50 transition-colors disabled:opacity-50"
                        >
                            <ImagePlus className="w-3.5 h-3.5 text-accent-cyan" />
                            Import from Calendar Picture (AI)
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const sampleCsv = [
                                    'date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone',
                                    '2026-10-26,RIDE_INTERVALS,BASE,Sweet Spot 3x10m,10m Warmup + 3x10m @ 90% FTP + 10m Cooldown,,3600,,3',
                                    '2026-10-28,EASY,BASE,Easy Aerobic Run,Easy Zone 2 run,8000,2640,330,2',
                                    '2026-10-31,LONG_RIDE,BASE,Endurance Ride 90m,Zone 2 sustained indoor/outdoor ride,,5400,,2',
                                ].join('\n');
                                const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'runflow_plan_template.csv';
                                document.body.appendChild(a);
                                a.click();
                                URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-glass-border text-foreground-muted hover:text-foreground text-xs transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Sample CSV Template
                        </button>
                    </div>
                </div>
            </div>
```

And remove the duplicate `{mode === 'advanced' && ...}` CSV Import block at lines 1282–1311 of `Web/src/components/PlanSetupForm.tsx`:

**FIND:**
```tsx
            {/* CSV Import (advanced mode only) */}
            {mode === 'advanced' && (
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={async () => {
                            const res = await fetch('/api/plans', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: 'Imported Plan',
                                    sport: 'NO_RACE',
                                    raceType: null,
                                    raceDate: null,
                                    durationWeeks: 12,
                                    planSource: 'advanced',
                                }),
                            });
                            if (res.ok) {
                                const data = await res.json();
                                window.location.href = `/plan/${data.plan?.id ?? data.goal?.id}`;
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-glass-border text-foreground-muted hover:text-foreground hover:border-foreground-muted text-sm transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </button>
                </div>
            )}
```

**REPLACE WITH:**
```tsx
            {/* Direct Plan Import is available above across all setup modes */}
```

#### Edit 2.10: Auto-Open Importer Modal/Panel When Deep-Linked From Plan Setup (`?import=ai-image`, `?import=csv`, `?import=zwo`) in `Web/src/components/PlanEditor/PlanEditorLayout.tsx` (`UX-02`)

Open `Web/src/components/PlanEditor/PlanEditorLayout.tsx`.

**FIND:**
```tsx
    useEffect(() => {
        setChatOpen(isPremium && mode === 'AI_ASSISTED');
    }, [mode, isPremium]);
```

**REPLACE WITH:**
```tsx
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const importParam = new URLSearchParams(window.location.search).get('import');
            if (importParam === 'ai-image') {
                setChatOpen(true);
                return;
            }
            if (importParam === 'csv') {
                setCsvImportOpen(true);
            } else if (importParam === 'zwo') {
                setZwoImportOpen(true);
            }
        }
        setChatOpen(isPremium && mode === 'AI_ASSISTED');
    }, [mode, isPremium]);
```

#### Edit 2.11: Remove Residual Synthetic MyWhoosh Payloads & Imports from `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (`FUNC-01`)

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MYWHOOSH_PLANS, MYWHOOSH_PHASES, splitMyWhooshPlanAndPhase, encodeMyWhooshPlanAndPhase, type MyWhooshPhaseOption } from '@/lib/plans/mywhooshMatcher';
```

**REPLACE WITH:**
```tsx
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
```

#### Edit 2.12: Clean Up `handleSportChange` and `handleGenerate` in `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (`FUNC-01`)

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
    // MyWhoosh
    const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(true);
    const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('mw-plan-ftp-builder');

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSportChange = (s: 'RUN' | 'CYCLING' | 'TRIATHLON') => {
        setSport(s);
        if (s === 'CYCLING') {
            setMatchToMyWhoosh(true);
            if (!mywhooshPlanId) setMywhooshPlanId(MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder');
            setRunsPerWeek(0);
            setRidesPerWeek(4);
            setSwimsPerWeek(0);
            setStrengthPerWeek(1);
        } else if (s === 'TRIATHLON') {
            if (!raceType.includes('TRI') && !raceType.includes('IRONMAN')) {
                setRaceType('HALF_IRONMAN');
            }
            if (runsPerWeek === 0) setRunsPerWeek(3);
            if (ridesPerWeek === 0) setRidesPerWeek(3);
            if (swimsPerWeek === 0) setSwimsPerWeek(2);
        } else {
            if (raceType.includes('TRI') || raceType.includes('IRONMAN')) {
                setRaceType('MARATHON');
            }
            if (runsPerWeek === 0) setRunsPerWeek(4);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        const isCycling = sport === 'CYCLING';
        const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
            ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
            : null;
        const { planId: cleanMwPlanId, phaseKey: selectedMwPhaseKey } = splitMyWhooshPlanAndPhase(effectiveMyWhooshPlanId);
        const selectedMwPlan = MYWHOOSH_PLANS.find((p) => p.id === cleanMwPlanId);
        const selectedMwPhase = MYWHOOSH_PHASES.find((ph) => ph.id === selectedMwPhaseKey);

        try {
            if (goalId) {
                // 1. Snapshot first
                await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'Auto-snapshot before Engine generation',
                        operation: 'engine_generate',
                    }),
                });

                // 2. Call regenerate
                const res = await fetch(`/api/plan-advanced/${goalId}/regenerate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sport: isCycling ? 'TRIATHLON' : sport,
                        raceType: isCycling ? 'OLYMPIC_TRI' : raceType,
                        raceDate,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        matchToMyWhoosh: isCycling ? true : matchToMyWhoosh,
                        mywhooshPlanId: effectiveMyWhooshPlanId,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to generate plan');
                }

                toast.success('Plan adapted and phases regenerated with web engine');
            } else {
                // Create brand new plan via /api/plans
                const res = await fetch('/api/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: isCycling
                            ? (selectedMwPlan
                                ? (selectedMwPhaseKey !== 'ALL' && selectedMwPhase
                                    ? `${selectedMwPlan.name} (${selectedMwPhase.shortLabel})`
                                    : selectedMwPlan.name)
                                : 'MyWhoosh Cycling Plan')
                            : `${raceType.replace(/_/g, ' ')} Plan`,
                        sport: isCycling ? 'CYCLING' : sport,
                        raceType: isCycling ? null : raceType,
                        raceDate: isCycling ? null : new Date(raceDate).toISOString(),
                        durationWeeks: isCycling ? (selectedMwPhase?.weeks ?? selectedMwPlan?.weeksCount ?? 8) : undefined,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal: weeklyMileageGoal * 1000,
                        targetVolume: weeklyMileageGoal * 1000,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        planSource: 'advanced',
                        matchToMyWhoosh,
                        mywhooshPlanId: matchToMyWhoosh ? mywhooshPlanId : null,
                    }),
                });
```

**REPLACE WITH:**
```tsx
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSportChange = (s: 'RUN' | 'CYCLING' | 'TRIATHLON') => {
        setSport(s);
        if (s === 'CYCLING') {
            setRunsPerWeek(0);
            setRidesPerWeek(4);
            setSwimsPerWeek(0);
            setStrengthPerWeek(1);
        } else if (s === 'TRIATHLON') {
            if (!raceType.includes('TRI') && !raceType.includes('IRONMAN')) {
                setRaceType('HALF_IRONMAN');
            }
            if (runsPerWeek === 0) setRunsPerWeek(3);
            if (ridesPerWeek === 0) setRidesPerWeek(3);
            if (swimsPerWeek === 0) setSwimsPerWeek(2);
        } else {
            if (raceType.includes('TRI') || raceType.includes('IRONMAN')) {
                setRaceType('MARATHON');
            }
            if (runsPerWeek === 0) setRunsPerWeek(4);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        const isCycling = sport === 'CYCLING';

        try {
            if (goalId) {
                // 1. Snapshot first
                await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: 'Auto-snapshot before Engine generation',
                        operation: 'engine_generate',
                    }),
                });

                // 2. Call regenerate
                const res = await fetch(`/api/plan-advanced/${goalId}/regenerate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sport: isCycling ? 'TRIATHLON' : sport,
                        raceType: isCycling ? 'OLYMPIC_TRI' : raceType,
                        raceDate,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        matchToMyWhoosh: false,
                        mywhooshPlanId: null,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to generate plan');
                }

                toast.success('Plan adapted and phases regenerated with web engine');
            } else {
                // Create brand new plan via /api/plans
                const res = await fetch('/api/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: isCycling
                            ? '8-Week Cycling FTP Block'
                            : `${raceType.replace(/_/g, ' ')} Plan`,
                        sport: isCycling ? 'CYCLING' : sport,
                        raceType: isCycling ? null : raceType,
                        raceDate: isCycling ? null : new Date(raceDate).toISOString(),
                        durationWeeks: isCycling ? 8 : undefined,
                        currentVdot,
                        ftpWatts,
                        swimCssSecPer100m,
                        runsPerWeek,
                        ridesPerWeek,
                        swimsPerWeek,
                        strengthPerWeek,
                        weeklyMileageGoal: weeklyMileageGoal * 1000,
                        targetVolume: weeklyMileageGoal * 1000,
                        buildWeeks,
                        peakWeeks,
                        taperWeeks,
                        planSource: 'advanced',
                        matchToMyWhoosh: false,
                        mywhooshPlanId: null,
                    }),
                });
```

#### Edit 2.13: Remove Unused `mywhooshMatcher` Imports from `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`

Open `Web/src/components/PlanEditor/WorkoutDetailPanel.tsx`.

**FIND:**
```tsx
import { resolveWorkoutSport, type StructuredWorkoutV2 } from '@/lib/plans/structured';
import {
    MYWHOOSH_WORKOUTS,
    MYWHOOSH_PLANS,
    mywhooshWorkoutToStructuredV2,
    type MyWhooshWorkout,
} from '@/lib/plans/mywhooshMatcher';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';
```

**REPLACE WITH:**
```tsx
import { resolveWorkoutSport, type StructuredWorkoutV2 } from '@/lib/plans/structured';
import { generateMyWhooshZwoXml } from '@/lib/plans/zwoExporter';
```

#### Verify Agent-FIX-2:

```bash
cd Web && npx tsc --noEmit
```

---

### Agent-FIX-3 Prompt (`security-and-csv-mcp-import-fixes`)

> **Role**: Security Audit Hardening (`SEC-NEW-01`, `SEC-NEW-03`) & CSV Cycling Import (`FUNC-02`) Agent `security-and-csv-mcp-import-fixes` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`
> * `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`
> * `Web/src/app/mcp/route.ts`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 3 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 3.1: Fix `SEC-NEW-01` (Release Usage Reservation on Vision OCR Error & Account for Vision Tokens in `incrementUsage`) in `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`

Open `Web/src/app/api/plan-advanced/[goalId]/ai-chat/route.ts`.

**FIND:**
```ts
        let finalUserContent = effectiveMessage;
        if (validatedImage) {
            const planStartHint = goal.planStartDate instanceof Date
                ? goal.planStartDate.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            const extractedSchedule = await extractCalendarImageSummary(
                builderConfig.config,
                validatedImage.mimeType,
                validatedImage.cleanBase64,
                planStartHint,
                req.signal,
            );
            finalUserContent = `${effectiveMessage}\n\n<untrusted_calendar_image_ocr>\n${fenceUntrusted(extractedSchedule)}\n</untrusted_calendar_image_ocr>\n\nConvert every workout from the extracted calendar above into individual \`\`\`workout JSON blocks so the user can import them.`;
        }

        messages.push({ role: 'user', content: finalUserContent });

        // Stream the response
        const encoder = new TextEncoder();
        let heartbeat: NodeJS.Timeout | undefined;
        let reservationClaimed = reservation.claimed;
        let fullResponse = '';

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    const stream = await streamChat(builderConfig.config, messages, { signal: req.signal });

                    for await (const token of stream) {
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    const inputTokens = messages.reduce(
                        (acc, m) => acc + countTokens(m.content, builderConfig.config.model),
                        0
                    );
                    const outputTokens = countTokens(fullResponse, builderConfig.config.model);
```

**REPLACE WITH:**
```ts
        let finalUserContent = effectiveMessage;
        let visionExtraTokens = 0;
        if (validatedImage) {
            const planStartHint = goal.planStartDate instanceof Date
                ? goal.planStartDate.toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            try {
                const extractedSchedule = await extractCalendarImageSummary(
                    builderConfig.config,
                    validatedImage.mimeType,
                    validatedImage.cleanBase64,
                    planStartHint,
                    req.signal,
                );
                visionExtraTokens = 1200 + countTokens(extractedSchedule, builderConfig.config.model);
                finalUserContent = `${effectiveMessage}\n\n<untrusted_calendar_image_ocr>\n${fenceUntrusted(extractedSchedule)}\n</untrusted_calendar_image_ocr>\n\nConvert every workout from the extracted calendar above into individual \`\`\`workout JSON blocks so the user can import them.`;
            } catch (visionErr) {
                if (reservation.claimed) {
                    await releaseUsageReservation(session.user.id).catch(() => undefined);
                }
                throw visionErr;
            }
        }

        messages.push({ role: 'user', content: finalUserContent });

        // Stream the response
        const encoder = new TextEncoder();
        let heartbeat: NodeJS.Timeout | undefined;
        let reservationClaimed = reservation.claimed;
        let fullResponse = '';

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            if (heartbeat) clearInterval(heartbeat);
                        }
                    }, 15000);

                    const stream = await streamChat(builderConfig.config, messages, { signal: req.signal });

                    for await (const token of stream) {
                        fullResponse += token;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }

                    controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                    controller.close();

                    const inputTokens = visionExtraTokens + messages.reduce(
                        (acc, m) => acc + countTokens(m.content, builderConfig.config.model),
                        0
                    );
                    const outputTokens = countTokens(fullResponse, builderConfig.config.model);
```

#### Edit 3.2: Fix `FUNC-02` (Populate `sport`, `structuredSteps`, and `plannedTss` for Cycling & Running Workouts in CSV Import) in `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`

Open `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`.

**FIND:**
```ts
import { WorkoutType, PlanPhase } from '@/generated/prisma/client';
import { parseCsv, type ParsedCsvWorkout } from '@/lib/plans/csv-parser';
import { storePreview, getPreview, deletePreview } from '@/lib/plans/csv-preview-cache';
import { randomUUID } from 'crypto';
```

**REPLACE WITH:**
```ts
import { WorkoutType, PlanPhase } from '@/generated/prisma/client';
import { parseCsv, type ParsedCsvWorkout } from '@/lib/plans/csv-parser';
import { storePreview, getPreview, deletePreview } from '@/lib/plans/csv-preview-cache';
import { buildStructuredStepsForWorkout } from '@/lib/plans';
import { resolveWorkoutSport } from '@/lib/plans/structured';
import { calculateWorkoutPlannedTss } from '@/lib/metrics/plannedTss';
import { randomUUID } from 'crypto';
```

And in `Web/src/app/api/plan-advanced/[goalId]/csv/import/route.ts`:

**FIND:**
```ts
            await createSnapshot(goalId, 'Before CSV import', 'csv_import');

            let createdCount = 0;
            await prisma.$transaction(async (tx) => {
                for (const w of previewData.workouts) {
                    const scheduledDate = new Date(w.date);
                    if (isNaN(scheduledDate.getTime())) continue;

                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            workoutType: w.workoutType as WorkoutType,
                            description: w.description || w.name,
                            phase: (w.phase as PlanPhase) || PlanPhase.BASE,
                            order: 0,
                            targetDistance: w.distanceM,
                            targetDuration: w.durationS,
                            targetPace: w.paceSKm,
                            targetHrZone: w.hrZone,
                            customName: w.name || null,
                            structuredSteps: w.structuredSteps,
                        },
                    });
                    createdCount++;
                }
            });
```

**REPLACE WITH:**
```ts
            await createSnapshot(goalId, 'Before CSV import', 'csv_import');

            const userRecord = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { ftpWatts: true },
            });
            const ftpWatts = userRecord?.ftpWatts || goal.ftpAtCreation || 200;
            const vdot = goal.currentVdot || 45;

            let createdCount = 0;
            await prisma.$transaction(async (tx) => {
                for (const w of previewData.workouts) {
                    const scheduledDate = new Date(w.date);
                    if (isNaN(scheduledDate.getTime())) continue;

                    const wt = w.workoutType as WorkoutType;
                    const resolvedSport = resolveWorkoutSport(wt);
                    const desc = w.description || w.name || wt;
                    const finalSteps = w.structuredSteps ?? buildStructuredStepsForWorkout(
                        {
                            type: wt,
                            description: desc,
                            totalDistance: w.distanceM ?? 0,
                            targetDuration: w.durationS ?? (resolvedSport === 'BIKE' ? 3600 : null),
                            targetPace: w.paceSKm ?? null,
                            targetHrZone: w.hrZone ?? null,
                        } as any,
                        { vdot, ftpWatts },
                    );
                    const plannedTss = calculateWorkoutPlannedTss({
                        workoutType: wt,
                        sport: resolvedSport,
                        targetDistance: w.distanceM || 0,
                        targetDuration: w.durationS || null,
                        targetPace: w.paceSKm || null,
                        structuredSteps: finalSteps,
                        ftpWatts,
                    });

                    await tx.workout.create({
                        data: {
                            goalId,
                            scheduledDate,
                            workoutType: wt,
                            sport: resolvedSport,
                            description: desc,
                            phase: (w.phase as PlanPhase) || PlanPhase.BASE,
                            order: 0,
                            targetDistance: w.distanceM,
                            targetDuration: w.durationS,
                            targetPace: w.paceSKm,
                            targetHrZone: w.hrZone,
                            plannedTss,
                            customName: w.name || null,
                            structuredSteps: (finalSteps as any) ?? undefined,
                        },
                    });
                    createdCount++;
                }
            });
```

#### Edit 3.3: Fix `SEC-NEW-03` (Clamp `plannedTss` to Finite `0..1000` & Compute Fallback TSS in `import_plan_workouts_batch`) in `Web/src/app/mcp/route.ts`

Open `Web/src/app/mcp/route.ts`.

**FIND:**
```ts
                targetFtpPercent: ftpPct,
                targetPowerWatts: ftpPct ? Math.round((ftpWatts * ftpPct) / 100) : null,
                plannedTss: typeof raw.plannedTss === 'number' ? raw.plannedTss : null,
                structuredSteps: structuredSteps as any,
                order: idx,
```

**REPLACE WITH:**
```ts
                targetFtpPercent: ftpPct,
                targetPowerWatts: ftpPct ? Math.round((ftpWatts * ftpPct) / 100) : null,
                plannedTss: typeof raw.plannedTss === 'number' && Number.isFinite(raw.plannedTss) && raw.plannedTss >= 0
                    ? Math.min(1000, Math.round(raw.plannedTss))
                    : calculateWorkoutPlannedTss({
                        workoutType: wt,
                        sport,
                        targetDistance: distM || 0,
                        targetDuration: durationSec || null,
                        structuredSteps: structuredSteps as any,
                        ftpWatts,
                    }),
                structuredSteps: structuredSteps as any,
                order: idx,
```

#### Verify Agent-FIX-3:

```bash
cd Web && npx tsc --noEmit && npm test
```

---

## 3. Final Coordinator Verification Gate

After **Agent-FIX-1**, **Agent-FIX-2**, and **Agent-FIX-3** complete, run:

```bash
cd Web && npx tsc --noEmit && npm test
```
