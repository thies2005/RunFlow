# Multi-Agent Playbook: Full MyWhoosh Plan & Phase Selector, Plan Builder UX, Dashboard Reminders & Cycling VO2max Engine

* **Target Environment**: Google Antigravity IDE / Agent Manager
* **Target Model**: **Gemini 3.8 Flash Medium** (`gemini-3.8-flash`, `thinking_level: medium`)
* **Scope**: Implement all **8 requested MyWhoosh, Plan Builder, Onboarding, Dashboard, Settings, and Cycling VO2max improvements** across **4 disjoint parallel subagents** (`24` files, `56` verified `FIND`/`REPLACE WITH` blocks):

  1. **Full MyWhoosh Training Plan Catalog & Two-Stage Selector (`General Plan` $\rightarrow$ `Phase of Plan`)**: Expands `mywhoosh_plans.json` to all **15 official MyWhoosh Training Plans** across all 4 official categories (*Beginner*: New Rider Welcome, Beginner Fitness & Endurance, Little Pebble Gravel; *Target FTP*: Beginner FTP Builder, 8-Week FTP Booster, Advanced FTP Development; *Specific Race Discipline*: Gran Fondo, Road Race, Time Trial ITT, Climb & Mountain, Sprinting, Criterium, Triathlon Sprint/Olympic, Triathlon 70.3/140.6; *UAE Team Emirates & Pro*: Train Like Tadej, FTP & Ramp Testing Block) and adds a two-stage selector for **1. General Plan** $\rightarrow$ **2. Phase of Plan** (`All Phases`, `Phase 1: Early Base`, `Phase 2: Late Base`, `Phase 3: Early Build`, `Phase 4: Late Build`, `Phase 5: Preparation`).
  2. **Hide Run Calibration & Start Weekly Mileage When `Runs / Week === 0`**: Automatically hides `CalibrationSection` and `Start Weekly Mileage` whenever `runsPerWeek === 0` (including pure MyWhoosh cycling plans).
  3. **Running Plan + Cycling Mode Selector (`MyWhoosh Virtual Workouts` vs. `Offline / Outdoor Cycling`)**: When adding cycling rides (`ridesPerWeek > 0`) to a Running, Triathlon, or No-Race plan, displays an explicit 2-card selector to choose between **MyWhoosh Virtual Workouts (`.zwo` & `%FTP` steps)** and **Offline / Outdoor Cycling (Endurance, Tempo & Intervals)**.
  4. **Streamlined MyWhoosh Cycling Plan UI**: Removes redundant running phase sliders (`Taper`, `Peak`, `Build`), `Experience Level`, and `Long Run Day` / `Quality Day` when `sport === 'CYCLING'` (or `runsPerWeek === 0`).
  5. **Fix `/onboarding?step=4` Back Navigation to Dashboard**: Adds a direct `Dashboard` button in `OnboardingWizard.tsx` and sets `runflow_onboarding_dismissed` in `mobile-layout.tsx` so navigating back from `/onboarding?step=4` never traps the user in an onboarding loop.
  6. **Rename `Heart Rate Zones` $\rightarrow$ `Heart Rate & Power Zones`**: Updates the Profile/Settings menu label (`MinimalistPillsMenu.tsx`) and setup section header (`HeartRateZonesSection.tsx`) to `Heart Rate & Power Zones`.
  7. **Hide Empty `This Week's Workouts` & Add Dismissible `No Active Training Plan` Reminder**: Hides `WorkoutScheduleCard` when `weeklyWorkouts.length === 0`, adds a `Hide Reminder` button on the `No Active Training Plan` card, and restores/allows creating a training plan directly when clicking **Profile Icon $\rightarrow$ Training Plan**.
  8. **Cycling $\text{VO}_2\text{max}$ Physiological Engine & Multi-Sport Metrics**: Adds `calculateCyclingVo2Max` (`(10.8 * MAP_watts) / weightKg + 7`) to `power.ts`, `cyclingAnalytics.ts`, and `/api/analytics/stats`, and displays **Cycling $\text{VO}_2\text{max}$** alongside Running $\text{VO}_2\text{max}$ and VDOT on the Dashboard (`TrainingStatusCard`), Cycling Analytics (`CyclingAnalyticsSection`), Combined Analytics (`analytics/page.tsx`), and Ride Modal (`ActivityDetailsModal`).

## 1. Execution Rules & Subagent Wave Allocation

1. **Single Parallel Wave (4 Disjoint Subagents)**: Spawn **Agent-MW-1**, **Agent-MW-2**, **Agent-MW-3**, and **Agent-MW-4** in parallel. Their file write scopes are 100% disjoint.
2. **Exact `FIND` / `REPLACE WITH` Execution**: Apply every `FIND` and `REPLACE WITH` block verbatim in order.
3. **Final Coordinator Verification Gate**: Run `cd Web && npx tsc --noEmit && npm test` once all 4 subagents finish.

| Wave | Agent ID | Assigned Scope | Exclusive Write-Lock Files | Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 1** | **Agent-MW-1** (`mywhoosh-full-catalog-and-phases`) | MyWhoosh Full Catalog, 5-Phase Matcher & Plan Engine Agent | `Web/src/data/mywhoosh_plans.json`<br>`Web/src/data/mywhoosh_workouts.json`<br>`Web/src/lib/plans/mywhooshMatcher.ts`<br>`Web/src/lib/plans/index.ts`<br>`Web/src/lib/plans/generators/no-race.ts` | `cd Web && npx tsc --noEmit && npm test -- src/lib/plans/__tests__/index.test.ts` |
| **Wave 1** | **Agent-MW-2** (`plan-builder-mywhoosh-phase-selector-and-clean-ux`) | Plan Builder MyWhoosh 2-Stage Selector, Cycling Mode & Clean UX Agent | `Web/src/components/PlanSetupForm.tsx`<br>`Web/src/components/setup/TargetRaceSection.tsx`<br>`Web/src/components/setup/PlanVolumeSection.tsx`<br>`Web/src/components/PlanEditor/EngineGenerateModal.tsx` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-MW-3** (`onboarding-back-dashboard-reminders-and-menu`) | Onboarding Back-Navigation, Dashboard Widgets & Settings Menu Agent | `Web/src/components/OnboardingWizard.tsx`<br>`Web/src/app/mobile-layout.tsx`<br>`Web/src/app/page.tsx`<br>`Web/src/components/views/DashboardView.tsx`<br>`Web/src/components/dashboard/WorkoutScheduleCard.tsx`<br>`Web/src/components/MinimalistPillsMenu.tsx`<br>`Web/src/components/setup/HeartRateZonesSection.tsx` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-MW-4** (`cycling-vo2max-engine-and-metrics-ui`) | Cycling VO2max Physiological Engine & Multi-Sport Metrics Agent | `Web/src/lib/metrics/power.ts`<br>`Web/src/lib/metrics/cyclingAnalytics.ts`<br>`Web/src/app/api/analytics/stats/route.ts`<br>`Web/src/components/providers/UserMetricsProvider.tsx`<br>`Web/src/components/dashboard/TrainingStatusCard.tsx`<br>`Web/src/components/Analytics/CyclingAnalyticsSection.tsx`<br>`Web/src/app/analytics/page.tsx`<br>`Web/src/components/ActivityDetailsModal.tsx` | `cd Web && npx tsc --noEmit && npm test` |

## 2. Subagent Prompts (Spawn All 4 in Parallel)

### Agent-MW-1 Prompt (`mywhoosh-full-catalog-and-phases`)

> **Role**: MyWhoosh Full Catalog, 5-Phase Matcher & Plan Engine Agent `mywhoosh-full-catalog-and-phases` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/data/mywhoosh_plans.json`
> * `Web/src/data/mywhoosh_workouts.json`
> * `Web/src/lib/plans/mywhooshMatcher.ts`
> * `Web/src/lib/plans/index.ts`
> * `Web/src/lib/plans/generators/no-race.ts`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 6 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 1.1: Expand `Web/src/data/mywhoosh_plans.json` to All 15 Official MyWhoosh Training Plans & 5-Phase Structure

Open `Web/src/data/mywhoosh_plans.json`.

**FIND:**
```json
[
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
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
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
      "BASE": [
        "mw-tempo-cruise-2",
        "mw-endurance-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-endurance-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
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
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sweetspot-1"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-vo2max-1",
        "mw-threshold-1",
        "mw-sweetspot-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-uae-pogacar",
    "name": "UAE Team Emirates \u2014 Train Like Tadej",
    "category": "UAE Team Emirates",
    "level": "Advanced",
    "weeksCount": 6,
    "ridesPerWeek": 3,
    "description": "Pro-tour climbing torque intervals, over-unders, and 40/20s VO2max sessions designed with UAE Team Emirates coaches.",
    "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
    "workoutIdsByPhase": {
      "BASE": [
        "mw-uae-tadej-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-vo2max-40-20",
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
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
      "BASE": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-2",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-sweetspot-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  }
]
```

**REPLACE WITH:**
```json
[
  {
    "id": "mw-plan-beginner-welcome",
    "name": "MyWhoosh New Rider Welcome Plan",
    "category": "Beginner",
    "level": "Beginner",
    "weeksCount": 4,
    "ridesPerWeek": 3,
    "description": "4-week introductory indoor cycling plan designed by Coach Kevin Poulton to build pedaling efficiency, cadence control, and aerobic base.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-recovery-spin-1",
        "mw-endurance-1",
        "mw-tempo-varied-1"
      ],
      "LATE_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-tempo-varied-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-recovery-spin-1",
        "mw-endurance-1",
        "mw-tempo-varied-1"
      ],
      "BUILD": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-tempo-cruise-2"
      ],
      "PEAK": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-beginner-endurance",
    "name": "MyWhoosh Beginner Fitness & Endurance",
    "category": "Beginner",
    "level": "Beginner",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Progressive 5-phase aerobic conditioning plan for riders building from 45-minute spins to sustained 90-minute Zone 2 & Tempo rides.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-recovery-spin-1",
        "mw-endurance-1",
        "mw-endurance-1"
      ],
      "LATE_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-tempo-varied-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-endurance-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-little-pebble-gravel",
    "name": "MyWhoosh Little Pebble (Beginner Gravel)",
    "category": "Beginner",
    "level": "Beginner / Intermediate",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Official MyWhoosh Little Pebble gravel preparation plan combining seated low-cadence gravel torque, varied tempo, and sustained endurance.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-gravel-pebble-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-gravel-pebble-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-gravel-pebble-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-climb-torque-1",
        "mw-gravel-pebble-1",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-gravel-pebble-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-gravel-pebble-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-gravel-pebble-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-climb-torque-1",
        "mw-gravel-pebble-1",
        "mw-endurance-progressive-3"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-ftp-builder-beginner",
    "name": "MyWhoosh Beginner FTP Builder",
    "category": "Target FTP",
    "level": "Beginner / Intermediate",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Structured introduction to Tempo and Sweet Spot intervals designed to raise Functional Threshold Power without excessive anaerobic strain.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-ftp-ramp-test-1",
        "mw-endurance-1",
        "mw-tempo-varied-1"
      ],
      "LATE_BASE": [
        "mw-tempo-varied-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-threshold-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-ftp-ramp-test-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-tempo-cruise-2"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-sweetspot-1",
        "mw-ftp-ramp-test-1"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-ftp-builder",
    "name": "MyWhoosh 8-Week FTP Builder / Booster",
    "category": "Target FTP",
    "level": "All Levels",
    "weeksCount": 8,
    "ridesPerWeek": 4,
    "description": "Progressive 5-phase threshold and sweet-spot block targeting a measurable increase in 20-minute Functional Threshold Power.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-sweetspot-1",
        "mw-threshold-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-vo2max-1",
        "mw-threshold-overunder-2",
        "mw-sweetspot-2",
        "mw-endurance-long-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-threshold-1",
        "mw-recovery-spin-1",
        "mw-ftp-ramp-test-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sweetspot-1"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-vo2max-1",
        "mw-threshold-1",
        "mw-sweetspot-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-ftp-advanced",
    "name": "MyWhoosh Advanced FTP Development",
    "category": "Target FTP",
    "level": "Advanced",
    "weeksCount": 12,
    "ridesPerWeek": 4,
    "description": "High-density threshold over-unders, 2x20m Sweet Spot, and VO2max ceiling boosters designed by Coach Kevin Poulton for experienced riders.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-sweetspot-1",
        "mw-sweetspot-2",
        "mw-tempo-cruise-2",
        "mw-endurance-progressive-3"
      ],
      "EARLY_BUILD": [
        "mw-threshold-1",
        "mw-threshold-overunder-2",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "LATE_BUILD": [
        "mw-vo2max-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-40-20",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-threshold-1",
        "mw-recovery-spin-1",
        "mw-ftp-ramp-test-1"
      ],
      "BASE": [
        "mw-sweetspot-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "BUILD": [
        "mw-threshold-1",
        "mw-threshold-overunder-2",
        "mw-endurance-progressive-3"
      ],
      "PEAK": [
        "mw-vo2max-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-40-20"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-gran-fondo",
    "name": "MyWhoosh Gran Fondo Plan",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 12,
    "ridesPerWeek": 4,
    "description": "5-phase long-distance Gran Fondo preparation focusing on fatigue resistance, sustained climbing tempo, and 2+ hour endurance efficiency.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-gravel-pebble-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-long-2",
        "mw-endurance-progressive-3"
      ],
      "EARLY_BUILD": [
        "mw-climb-torque-1",
        "mw-sweetspot-2",
        "mw-tempo-cruise-2",
        "mw-endurance-progressive-3"
      ],
      "LATE_BUILD": [
        "mw-threshold-1",
        "mw-climb-torque-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-tempo-varied-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-progressive-3"
      ],
      "BUILD": [
        "mw-climb-torque-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-climb-torque-1",
        "mw-endurance-progressive-3"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-road-race",
    "name": "MyWhoosh Road Race Plan",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 12,
    "ridesPerWeek": 4,
    "description": "Prepares road racers for breakaway efforts, peloton surges, VO2max climbs, and late-race sprint finishes across 5 progressive 4-week phases.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-sprint-neuromuscular-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "LATE_BUILD": [
        "mw-crit-surge-1",
        "mw-vo2max-40-20",
        "mw-sprint-neuromuscular-1",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-sprint-neuromuscular-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-endurance-progressive-3"
      ],
      "PEAK": [
        "mw-crit-surge-1",
        "mw-vo2max-40-20",
        "mw-sprint-neuromuscular-1"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-tt-specialist",
    "name": "MyWhoosh Time Trial & Aero Threshold Plan",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Focuses on sustained 90-103% FTP power output at high cadence for individual time trials (ITT) and non-drafting bike splits.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-sweetspot-2",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-sweetspot-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-threshold-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-2",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-sweetspot-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-climbing",
    "name": "MyWhoosh Climb & Mountain Specialist",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 8,
    "ridesPerWeek": 4,
    "description": "Targets W/kg climbing performance with low-cadence torque intervals, sustained threshold climbs, and out-of-the-saddle VO2max attacks.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-climb-torque-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-climb-torque-1",
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-uae-tadej-1",
        "mw-climb-torque-1",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-1",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-climb-torque-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-climb-torque-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-uae-tadej-1",
        "mw-climb-torque-1",
        "mw-threshold-1"
      ],
      "PEAK": [
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-1"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-sprinting",
    "name": "MyWhoosh Sprinting & Anaerobic Power",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Develops neuromuscular peak watts (Z7), anaerobic capacity (Z6), and high-cadence lead-out speed for bunch sprints.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sprint-neuromuscular-1"
      ],
      "LATE_BASE": [
        "mw-sprint-neuromuscular-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-sprint-neuromuscular-1",
        "mw-under35-hiit-1",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-sprint-neuromuscular-1",
        "mw-crit-surge-1",
        "mw-vo2max-40-20"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-sprint-neuromuscular-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sprint-neuromuscular-1"
      ],
      "BUILD": [
        "mw-sprint-neuromuscular-1",
        "mw-under35-hiit-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-sprint-neuromuscular-1",
        "mw-crit-surge-1",
        "mw-vo2max-40-20"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-criterium",
    "name": "MyWhoosh Criterium Race Plan",
    "category": "Specific Race Discipline",
    "level": "Advanced",
    "weeksCount": 8,
    "ridesPerWeek": 4,
    "description": "High-intensity criterium repeatability plan featuring 30/30s corner accelerations, 40/20s micro-intervals, and lactacid clearance under load.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-sweetspot-1",
        "mw-under35-hiit-1",
        "mw-sprint-neuromuscular-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-crit-surge-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-40-20",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-crit-surge-1",
        "mw-vo2max-40-20",
        "mw-sprint-neuromuscular-1",
        "mw-under35-hiit-1"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-crit-surge-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-tempo-varied-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-crit-surge-1",
        "mw-threshold-overunder-2",
        "mw-vo2max-40-20"
      ],
      "PEAK": [
        "mw-crit-surge-1",
        "mw-vo2max-40-20",
        "mw-sprint-neuromuscular-1"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-triathlon-base",
    "name": "MyWhoosh Triathlon \u2014 Sprint & Olympic",
    "category": "Specific Race Discipline",
    "level": "Intermediate",
    "weeksCount": 8,
    "ridesPerWeek": 3,
    "description": "Structured 5-phase MyWhoosh cycling progression designed for Sprint and Olympic distance triathletes (Aerobic Endurance, Varied Tempo, Sweet Spot, and Race Openers).",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-threshold-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "BASE": [
        "mw-endurance-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-endurance-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-triathlon-703",
    "name": "MyWhoosh Triathlon \u2014 70.3 & Ironman (140.6)",
    "category": "Specific Race Discipline",
    "level": "Intermediate / Advanced",
    "weeksCount": 12,
    "ridesPerWeek": 3,
    "description": "Sustained aero-position power and low-decoupling endurance rides tailored for Half Ironman (70.3) and Full Ironman bike legs.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-endurance-1",
        "mw-tempo-cruise-2",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-tempo-cruise-2",
        "mw-sweetspot-1",
        "mw-endurance-progressive-3"
      ],
      "EARLY_BUILD": [
        "mw-sweetspot-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "LATE_BUILD": [
        "mw-threshold-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-endurance-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-tempo-cruise-2",
        "mw-endurance-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "PEAK": [
        "mw-threshold-1",
        "mw-sweetspot-2",
        "mw-endurance-progressive-3"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-endurance-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-uae-pogacar",
    "name": "UAE Team Emirates \u2014 Train Like Tadej",
    "category": "UAE Team Emirates & Pro",
    "level": "Advanced",
    "weeksCount": 6,
    "ridesPerWeek": 3,
    "description": "Pro-tour climbing torque intervals, over-unders, and 40/20s VO2max sessions designed with UAE Team Emirates coaches.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-uae-tadej-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "LATE_BASE": [
        "mw-uae-tadej-1",
        "mw-climb-torque-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-vo2max-40-20",
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1",
        "mw-uae-tadej-1"
      ],
      "BASE": [
        "mw-uae-tadej-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "BUILD": [
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-vo2max-40-20",
        "mw-uae-tadej-1",
        "mw-threshold-overunder-2"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ]
    }
  },
  {
    "id": "mw-plan-ftp-testing",
    "name": "MyWhoosh FTP & Ramp Testing Block",
    "category": "UAE Team Emirates & Pro",
    "level": "All Levels",
    "weeksCount": 4,
    "ridesPerWeek": 3,
    "description": "4-week physiological testing and calibration block featuring openers, MyWhoosh 20-minute & Ramp FTP assessment, and threshold verification.",
    "externalUrl": "https://mywhoosh.com/everything-you-need-to-know-about-mywhoosh-training-plans/",
    "workoutIdsByPhase": {
      "EARLY_BASE": [
        "mw-taper-opener-1",
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ],
      "LATE_BASE": [
        "mw-endurance-1",
        "mw-sweetspot-1",
        "mw-endurance-long-2"
      ],
      "EARLY_BUILD": [
        "mw-threshold-1",
        "mw-tempo-varied-1",
        "mw-endurance-long-2"
      ],
      "LATE_BUILD": [
        "mw-vo2max-1",
        "mw-threshold-1",
        "mw-recovery-spin-1"
      ],
      "PREPARATION": [
        "mw-taper-opener-1",
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ],
      "BASE": [
        "mw-taper-opener-1",
        "mw-ftp-ramp-test-1",
        "mw-endurance-1"
      ],
      "BUILD": [
        "mw-sweetspot-1",
        "mw-threshold-1",
        "mw-endurance-long-2"
      ],
      "PEAK": [
        "mw-taper-opener-1",
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ],
      "TAPER": [
        "mw-taper-opener-1",
        "mw-recovery-spin-1"
      ],
      "RACE_WEEK": [
        "mw-ftp-ramp-test-1",
        "mw-recovery-spin-1"
      ]
    }
  }
]
```

#### Edit 1.2: Add Climbing, Sprint, Criterium, Gravel & FTP Ramp Assessment Workouts to `Web/src/data/mywhoosh_workouts.json`

Open `Web/src/data/mywhoosh_workouts.json`.

**FIND:**
```json
        "durationSeconds": 360,
        "powerLowPct": 0.45,
        "powerHighPct": 0.6,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-triathlon-base",
      "mw-plan-triathlon-703",
      "mw-plan-tt-specialist"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  }
]
```

**REPLACE WITH:**
```json
        "durationSeconds": 360,
        "powerLowPct": 0.45,
        "powerHighPct": 0.6,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-triathlon-base",
      "mw-plan-triathlon-703",
      "mw-plan-tt-specialist"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  },
  {
    "id": "mw-ftp-ramp-test-1",
    "name": "MyWhoosh Ramp & 20min FTP Assessment",
    "category": "Testing",
    "description": "Official MyWhoosh FTP Test session (10m progressive warmup, 3x1m openers, 20m maximal sustained threshold test @ 100-105% FTP, 10m cooldown)",
    "durationSeconds": 2700,
    "tss": 64.0,
    "intensityFactor": 0.92,
    "zoneSeconds": {
      "z1": 600,
      "z2": 600,
      "z3": 300,
      "ss": 0,
      "z4": 1020,
      "z5": 180,
      "z6": 0
    },
    "stepsSummary": "10m Warmup, 3x1m Openers, 20m All-Out FTP Test @ ~102% FTP, 10m Cooldown",
    "steps": [
      {
        "type": "warmup",
        "durationSeconds": 600,
        "powerLowPct": 0.45,
        "powerHighPct": 0.75,
        "cadenceRpm": 90
      },
      {
        "type": "interval",
        "repeatCount": 3,
        "durationSeconds": 60,
        "powerLowPct": 1.1,
        "powerHighPct": 1.1,
        "offDurationSeconds": 60,
        "offPowerPct": 0.55,
        "cadenceRpm": 100
      },
      {
        "type": "steadystate",
        "durationSeconds": 1200,
        "powerLowPct": 1.02,
        "powerHighPct": 1.02,
        "cadenceRpm": 92
      },
      {
        "type": "cooldown",
        "durationSeconds": 540,
        "powerLowPct": 0.45,
        "powerHighPct": 0.6,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-ftp-testing",
      "mw-plan-ftp-builder",
      "mw-plan-ftp-advanced"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  },
  {
    "id": "mw-climb-torque-1",
    "name": "Alpe Climbing Low-Cadence Torque 4x8m",
    "category": "Climbing",
    "description": "Official MyWhoosh Climbing session (10m Warmup, 4x8m @ 92% FTP at 65-72rpm climbing torque (4m @ 55% FTP), 10m Cooldown)",
    "durationSeconds": 3840,
    "tss": 74.2,
    "intensityFactor": 0.83,
    "zoneSeconds": {
      "z1": 960,
      "z2": 960,
      "z3": 0,
      "ss": 960,
      "z4": 960,
      "z5": 0,
      "z6": 0
    },
    "stepsSummary": "10m Warmup, 4x8m @ 92% FTP (68rpm torque, 4m recovery), 10m Cooldown",
    "steps": [
      {
        "type": "warmup",
        "durationSeconds": 600,
        "powerLowPct": 0.5,
        "powerHighPct": 0.75,
        "cadenceRpm": 88
      },
      {
        "type": "interval",
        "repeatCount": 4,
        "durationSeconds": 480,
        "powerLowPct": 0.92,
        "powerHighPct": 0.92,
        "offDurationSeconds": 240,
        "offPowerPct": 0.55,
        "cadenceRpm": 68
      },
      {
        "type": "cooldown",
        "durationSeconds": 720,
        "powerLowPct": 0.45,
        "powerHighPct": 0.65,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-climbing",
      "mw-plan-gran-fondo",
      "mw-plan-uae-pogacar"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  },
  {
    "id": "mw-sprint-neuromuscular-1",
    "name": "Sprint & Anaerobic Power 2x6x15s",
    "category": "Sprint",
    "description": "Official MyWhoosh Sprint session (12m Warmup, 2 sets of 6x (15s Max Sprint @ 165% FTP, 105s Z1 spin), 10m Endurance Z2, 8m Cooldown)",
    "durationSeconds": 3240,
    "tss": 66.8,
    "intensityFactor": 0.86,
    "zoneSeconds": {
      "z1": 1260,
      "z2": 1800,
      "z3": 0,
      "ss": 0,
      "z4": 0,
      "z5": 0,
      "z6": 180
    },
    "stepsSummary": "12m Warmup, 12x (15s @ 165% FTP / 1m45s @ 52% FTP), 10m @ 68% FTP, 8m Cooldown",
    "steps": [
      {
        "type": "warmup",
        "durationSeconds": 720,
        "powerLowPct": 0.5,
        "powerHighPct": 0.75,
        "cadenceRpm": 90
      },
      {
        "type": "interval",
        "repeatCount": 6,
        "durationSeconds": 15,
        "powerLowPct": 1.65,
        "powerHighPct": 1.65,
        "offDurationSeconds": 105,
        "offPowerPct": 0.52,
        "cadenceRpm": 110
      },
      {
        "type": "steadystate",
        "durationSeconds": 600,
        "powerLowPct": 0.68,
        "powerHighPct": 0.68,
        "cadenceRpm": 90
      },
      {
        "type": "interval",
        "repeatCount": 6,
        "durationSeconds": 15,
        "powerLowPct": 1.65,
        "powerHighPct": 1.65,
        "offDurationSeconds": 105,
        "offPowerPct": 0.52,
        "cadenceRpm": 110
      },
      {
        "type": "cooldown",
        "durationSeconds": 480,
        "powerLowPct": 0.45,
        "powerHighPct": 0.6,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-sprinting",
      "mw-plan-criterium",
      "mw-plan-road-race"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  },
  {
    "id": "mw-crit-surge-1",
    "name": "Criterium Race Surges & Over-Unders",
    "category": "Criterium",
    "description": "Official MyWhoosh Criterium session (10m Warmup, 3 sets of 8x (30s @ 130% FTP corner acceleration / 30s @ 82% FTP pack float), 10m Cooldown)",
    "durationSeconds": 3120,
    "tss": 71.5,
    "intensityFactor": 0.91,
    "zoneSeconds": {
      "z1": 600,
      "z2": 1080,
      "z3": 720,
      "ss": 0,
      "z4": 0,
      "z5": 360,
      "z6": 360
    },
    "stepsSummary": "10m Warmup, 3x8m (30s @ 130% FTP / 30s @ 82% FTP), 10m Cooldown",
    "steps": [
      {
        "type": "warmup",
        "durationSeconds": 600,
        "powerLowPct": 0.5,
        "powerHighPct": 0.78,
        "cadenceRpm": 92
      },
      {
        "type": "interval",
        "repeatCount": 8,
        "durationSeconds": 30,
        "powerLowPct": 1.3,
        "powerHighPct": 1.3,
        "offDurationSeconds": 30,
        "offPowerPct": 0.82,
        "cadenceRpm": 102
      },
      {
        "type": "steadystate",
        "durationSeconds": 240,
        "powerLowPct": 0.55,
        "powerHighPct": 0.55,
        "cadenceRpm": 88
      },
      {
        "type": "interval",
        "repeatCount": 8,
        "durationSeconds": 30,
        "powerLowPct": 1.3,
        "powerHighPct": 1.3,
        "offDurationSeconds": 30,
        "offPowerPct": 0.82,
        "cadenceRpm": 102
      },
      {
        "type": "steadystate",
        "durationSeconds": 240,
        "powerLowPct": 0.55,
        "powerHighPct": 0.55,
        "cadenceRpm": 88
      },
      {
        "type": "interval",
        "repeatCount": 8,
        "durationSeconds": 30,
        "powerLowPct": 1.3,
        "powerHighPct": 1.3,
        "offDurationSeconds": 30,
        "offPowerPct": 0.82,
        "cadenceRpm": 102
      },
      {
        "type": "cooldown",
        "durationSeconds": 600,
        "powerLowPct": 0.45,
        "powerHighPct": 0.62,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-criterium",
      "mw-plan-road-race"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  },
  {
    "id": "mw-gravel-pebble-1",
    "name": "Little Pebble Gravel Variable Tempo",
    "category": "Gravel",
    "description": "Official MyWhoosh Little Pebble Gravel session (10m Warmup, 3x10m Gravel Tempo @ 84% FTP with 78rpm seated torque surges, 10m Cooldown)",
    "durationSeconds": 3600,
    "tss": 59.0,
    "intensityFactor": 0.77,
    "zoneSeconds": {
      "z1": 600,
      "z2": 1200,
      "z3": 1800,
      "ss": 0,
      "z4": 0,
      "z5": 0,
      "z6": 0
    },
    "stepsSummary": "10m Warmup, 3x10m @ 84% FTP (78rpm gravel cadence, 3m20s recovery), 10m Cooldown",
    "steps": [
      {
        "type": "warmup",
        "durationSeconds": 600,
        "powerLowPct": 0.5,
        "powerHighPct": 0.72,
        "cadenceRpm": 88
      },
      {
        "type": "interval",
        "repeatCount": 3,
        "durationSeconds": 600,
        "powerLowPct": 0.84,
        "powerHighPct": 0.84,
        "offDurationSeconds": 200,
        "offPowerPct": 0.55,
        "cadenceRpm": 78
      },
      {
        "type": "cooldown",
        "durationSeconds": 600,
        "powerLowPct": 0.45,
        "powerHighPct": 0.62,
        "cadenceRpm": 85
      }
    ],
    "planIds": [
      "mw-plan-little-pebble-gravel",
      "mw-plan-gran-fondo"
    ],
    "mywhooshWebLibraryUrl": "https://workout.mywhoosh.com/workouts-library",
    "externalDetailUrl": "https://mywhooshinfo.com/workouts/"
  }
]
```

#### Edit 1.3: Add 5-Phase Constants (`MYWHOOSH_PHASES`), Composite `planId::phaseKey` Parsing & Phase Progression to `Web/src/lib/plans/mywhooshMatcher.ts`

Open `Web/src/lib/plans/mywhooshMatcher.ts`.

**FIND:**
```ts
export const MYWHOOSH_WORKOUTS: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];
export const MYWHOOSH_PLANS: MyWhooshTrainingPlan[] = mywhooshPlansCatalog as MyWhooshTrainingPlan[];

export function getMyWhooshWorkoutById(id: string): MyWhooshWorkout | null {
    return MYWHOOSH_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function getMyWhooshPlanById(planId: string): MyWhooshTrainingPlan | null {
    return MYWHOOSH_PLANS.find((p) => p.id === planId) ?? null;
}
```

**REPLACE WITH:**
```ts
export const MYWHOOSH_WORKOUTS: MyWhooshWorkout[] = mywhooshCatalog as MyWhooshWorkout[];
export const MYWHOOSH_PLANS: MyWhooshTrainingPlan[] = mywhooshPlansCatalog as MyWhooshTrainingPlan[];

export interface MyWhooshPhaseOption {
    id: 'ALL' | 'EARLY_BASE' | 'LATE_BASE' | 'EARLY_BUILD' | 'LATE_BUILD' | 'PREPARATION';
    label: string;
    shortLabel: string;
    weeks: number | null;
    description: string;
}

export const MYWHOOSH_PHASES: MyWhooshPhaseOption[] = [
    {
        id: 'ALL',
        label: 'All Phases — Full Progressive Plan',
        shortLabel: 'All Phases',
        weeks: null,
        description: 'Progresses automatically through Early Base, Late Base, Early Build, Late Build, and Preparation.',
    },
    {
        id: 'EARLY_BASE',
        label: 'Phase 1: Early Base (4 Weeks — Aerobic Foundation)',
        shortLabel: 'Phase 1 · Early Base',
        weeks: 4,
        description: '4-week block focused on Zone 2 aerobic efficiency, pedaling economy, and foundational endurance.',
    },
    {
        id: 'LATE_BASE',
        label: 'Phase 2: Late Base (4 Weeks — Tempo & Sweet Spot)',
        shortLabel: 'Phase 2 · Late Base',
        weeks: 4,
        description: '4-week block introducing varied tempo (76–90% FTP) and muscular endurance intervals.',
    },
    {
        id: 'EARLY_BUILD',
        label: 'Phase 3: Early Build (4 Weeks — Threshold Development)',
        shortLabel: 'Phase 3 · Early Build',
        weeks: 4,
        description: '4-week block targeting Functional Threshold Power (91–105% FTP) and sustained Sweet Spot.',
    },
    {
        id: 'LATE_BUILD',
        label: 'Phase 4: Late Build (4 Weeks — VO2max & High Intensity)',
        shortLabel: 'Phase 4 · Late Build',
        weeks: 4,
        description: '4-week high-intensity block featuring VO2max intervals, over-unders, and race-specific surges.',
    },
    {
        id: 'PREPARATION',
        label: 'Phase 5: Preparation & Taper (4 Weeks — Peak & Openers)',
        shortLabel: 'Phase 5 · Preparation',
        weeks: 4,
        description: '4-week sharpening and taper block with race openers, recovery spins, and peak power freshness.',
    },
];

export function splitMyWhooshPlanAndPhase(rawId?: string | null): {
    planId: string;
    phaseKey: MyWhooshPhaseOption['id'];
} {
    if (!rawId) return { planId: '', phaseKey: 'ALL' };
    const [baseId, rawPhase] = rawId.split('::');
    const validPhase = MYWHOOSH_PHASES.find((p) => p.id === rawPhase)?.id ?? 'ALL';
    return { planId: baseId || '', phaseKey: validPhase };
}

export function encodeMyWhooshPlanAndPhase(
    planId: string,
    phaseKey: MyWhooshPhaseOption['id'] = 'ALL',
): string {
    if (!planId) return '';
    const cleanBase = planId.split('::')[0];
    return phaseKey && phaseKey !== 'ALL' ? `${cleanBase}::${phaseKey}` : cleanBase;
}

export function getMyWhooshWorkoutById(id: string): MyWhooshWorkout | null {
    return MYWHOOSH_WORKOUTS.find((w) => w.id === id) ?? null;
}

export function getMyWhooshPlanById(planId: string): MyWhooshTrainingPlan | null {
    const { planId: cleanId } = splitMyWhooshPlanAndPhase(planId);
    return MYWHOOSH_PLANS.find((p) => p.id === cleanId) ?? null;
}
```

#### Edit 1.4: Honor Selected MyWhoosh Phase (`EARLY_BASE`..`PREPARATION` or Progressive `ALL`) in `findClosestMyWhooshWorkout` (`Web/src/lib/plans/mywhooshMatcher.ts`)

Open `Web/src/lib/plans/mywhooshMatcher.ts`.

**FIND:**
```ts
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
```

**REPLACE WITH:**
```ts
    // 1. If a specific MyWhoosh Training Plan is selected, pick from its phase rotation first
    if (params.mywhooshPlanId) {
        const { planId: cleanPlanId, phaseKey: explicitPhase } = splitMyWhooshPlanAndPhase(params.mywhooshPlanId);
        const plan = getMyWhooshPlanById(cleanPlanId);
        if (plan) {
            const resolvedPhaseKey =
                explicitPhase !== 'ALL' && plan.workoutIdsByPhase[explicitPhase]
                    ? explicitPhase
                    : params.phase && plan.workoutIdsByPhase[params.phase]
                    ? params.phase
                    : 'BASE';
            const phaseWorkoutIds =
                plan.workoutIdsByPhase[resolvedPhaseKey] ||
                plan.workoutIdsByPhase.EARLY_BASE ||
                plan.workoutIdsByPhase.BASE ||
                [];
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
```

#### Edit 1.5: Add Structured Offline/Outdoor Cycling Variety When Adding Rides to a Running Plan in `Web/src/lib/plans/index.ts`

Open `Web/src/lib/plans/index.ts`.

**FIND:**
```ts
    const totalCardio = remainingRides + remainingSwims;
    const cardioFreeDays = getAvailableCrossTrainingDays(totalCardio, usedDays, protectedDays);

    for (const d of cardioFreeDays) {
        usedDays.add(d);
        if (remainingRides > 0) {
            remainingRides--;
            workouts.push({
                dayOffset: d,
                type: WorkoutType.RIDE,
                description: 'Bike Ride: 60min (Zone 1-2)',
                totalDistance: 0,
                targetPace: 0,
                targetDuration: 3600,
                phase: phase as PlanPhase,
                targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
            });
        } else if (remainingSwims > 0) {
```

**REPLACE WITH:**
```ts
    const totalCardio = remainingRides + remainingSwims;
    const cardioFreeDays = getAvailableCrossTrainingDays(totalCardio, usedDays, protectedDays);
    let ridesPlacedInRunWeek = 0;

    for (const d of cardioFreeDays) {
        usedDays.add(d);
        if (remainingRides > 0) {
            remainingRides--;
            ridesPlacedInRunWeek++;
            if (ridesPlacedInRunWeek === 2 && ridesPerWeek >= 2 && phase !== 'TAPER') {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE_INTERVALS,
                    description: 'Bike Intervals: 60min (Tempo / Sweet Spot Z3-Z4)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 3600,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE_INTERVALS),
                });
            } else if (ridesPlacedInRunWeek === 3 && ridesPerWeek >= 3 && phase !== 'TAPER') {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.LONG_RIDE,
                    description: 'Long Endurance Ride: 90min (Zone 2)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 5400,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.LONG_RIDE),
                });
            } else {
                workouts.push({
                    dayOffset: d,
                    type: WorkoutType.RIDE,
                    description: 'Bike Endurance: 60min (Zone 1-2)',
                    totalDistance: 0,
                    targetPace: 0,
                    targetDuration: 3600,
                    phase: phase as PlanPhase,
                    targetHrZone: workoutTypeToHrZone(WorkoutType.RIDE),
                });
            }
        } else if (remainingSwims > 0) {
```

#### Edit 1.6: Map Full MyWhoosh 5-Phase Progression (`EARLY_BASE`..`PREPARATION`) in `Web/src/lib/plans/generators/no-race.ts`

Open `Web/src/lib/plans/generators/no-race.ts`.

**FIND:**
```ts
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: w.phase,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideCounter % Math.max(1, ridesPerWeek),
                });
```

**REPLACE WITH:**
```ts
                const weekIndex = Math.max(0, Math.floor((w.date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                const progressPct = totalWeeks > 1 ? weekIndex / totalWeeks : 0;
                const fivePhaseName =
                    progressPct < 0.25
                        ? 'EARLY_BASE'
                        : progressPct < 0.50
                        ? 'LATE_BASE'
                        : progressPct < 0.75
                        ? 'EARLY_BUILD'
                        : progressPct < 0.90
                        ? 'LATE_BUILD'
                        : 'PREPARATION';
                const match = findClosestMyWhooshWorkout({
                    workoutType: w.type,
                    targetDurationSeconds: w.targetDuration || 3600,
                    description: w.description,
                    phase: fivePhaseName,
                    mywhooshPlanId: config.mywhooshPlanId,
                    rideIndexInWeek: rideCounter % Math.max(1, ridesPerWeek),
                });
```

#### Verify Agent-MW-1:

```bash
cd Web && npx tsc --noEmit && npm test -- src/lib/plans/__tests__/index.test.ts
```

### Agent-MW-2 Prompt (`plan-builder-mywhoosh-phase-selector-and-clean-ux`)

> **Role**: Plan Builder MyWhoosh 2-Stage Selector, Cycling Mode & Clean UX Agent `plan-builder-mywhoosh-phase-selector-and-clean-ux` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/PlanSetupForm.tsx`
> * `Web/src/components/setup/TargetRaceSection.tsx`
> * `Web/src/components/setup/PlanVolumeSection.tsx`
> * `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 17 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 2.1: Streamline `TargetRaceSection.tsx` for MyWhoosh Cycling Plans & Allow Goal Name Input When Creating From Settings

Open `Web/src/components/setup/TargetRaceSection.tsx`.

**FIND:**
```tsx
    durationWeeks?: string;
    setDurationWeeks?: (_val: string) => void;
    experienceLevel?: string;
    setExperienceLevel?: (_val: string) => void;
}
```

**REPLACE WITH:**
```tsx
    durationWeeks?: string;
    setDurationWeeks?: (_val: string) => void;
    experienceLevel?: string;
    setExperienceLevel?: (_val: string) => void;
    showGoalNameInSettings?: boolean;
}
```

#### Edit 2.2: Hide Running Experience Level & Redundant Duration Input When `sport === 'CYCLING'` in `Web/src/components/setup/TargetRaceSection.tsx`

Open `Web/src/components/setup/TargetRaceSection.tsx`.

**FIND:**
```tsx
    durationWeeks = '12',
    setDurationWeeks,
    experienceLevel = 'INTERMEDIATE',
    setExperienceLevel,
}: TargetRaceSectionProps) {
    const inputClass = "bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
                <Target className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Target Race</h3>
            </div>

            {(mode === 'onboarding' || mode === 'advanced') && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Goal Name</label>
                    <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className={`${inputClass} ${formErrors.goalName ? 'border-negative focus:ring-negative' : ''}`}
                        placeholder="e.g., Berlin Marathon 2026"
                    />
                    {formErrors.goalName && <p className="text-negative text-xs mt-1">{formErrors.goalName}</p>}
                </div>
            )}
```

**REPLACE WITH:**
```tsx
    durationWeeks = '12',
    setDurationWeeks,
    experienceLevel = 'INTERMEDIATE',
    setExperienceLevel,
    showGoalNameInSettings = false,
}: TargetRaceSectionProps) {
    const inputClass = "bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-orange mb-2">
                <Target className="w-5 h-5" />
                <h3 className="text-sm font-semibold">{sport === 'CYCLING' ? 'Cycling Training Plan' : 'Target Race'}</h3>
            </div>

            {(mode === 'onboarding' || mode === 'advanced' || showGoalNameInSettings) && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Goal / Plan Name</label>
                    <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className={`${inputClass} ${formErrors.goalName ? 'border-negative focus:ring-negative' : ''}`}
                        placeholder={sport === 'CYCLING' ? 'e.g., MyWhoosh FTP Builder' : 'e.g., Berlin Marathon 2026'}
                    />
                    {formErrors.goalName && <p className="text-negative text-xs mt-1">{formErrors.goalName}</p>}
                </div>
            )}
```

#### Edit 2.3: Hide Experience Level & Manual Duration Input on MyWhoosh Cycling Plans in `Web/src/components/setup/TargetRaceSection.tsx`

Open `Web/src/components/setup/TargetRaceSection.tsx`.

**FIND:**
```tsx
            {(mode === 'onboarding' || mode === 'advanced') && setExperienceLevel && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-2">Experience Level</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setExperienceLevel(level)}
                                className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                                    experienceLevel === level
                                        ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                        : 'border-glass-border bg-surface text-foreground-muted hover:border-foreground-muted'
                                }`}
                            >
                                {level.charAt(0) + level.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}
```

**REPLACE WITH:**
```tsx
            {(mode === 'onboarding' || mode === 'advanced') && setExperienceLevel && sport !== 'CYCLING' && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-2">Experience Level</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setExperienceLevel(level)}
                                className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                                    experienceLevel === level
                                        ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                        : 'border-glass-border bg-surface text-foreground-muted hover:border-foreground-muted'
                                }`}
                            >
                                {level.charAt(0) + level.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}
```

#### Edit 2.4: Show Manual Plan Duration Only for `NO_RACE` (Since MyWhoosh Cycling Plan & Phase Set Duration Automatically) in `Web/src/components/setup/TargetRaceSection.tsx`

Open `Web/src/components/setup/TargetRaceSection.tsx`.

**FIND:**
```tsx
            {(sport === 'NO_RACE' || sport === 'CYCLING') && setDurationWeeks && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Plan Duration (weeks)</label>
                    <input
                        type="number"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(e.target.value)}
                        min={4}
                        max={52}
                        placeholder="8"
                        className={inputClass}
                    />
                    {sport === 'CYCLING' && (
                        <p className="text-[11px] text-accent-cyan mt-1">
                            Automatically matched to your selected MyWhoosh Training Plan duration (adjustable).
                        </p>
                    )}
                </div>
            )}
```

**REPLACE WITH:**
```tsx
            {sport === 'NO_RACE' && setDurationWeeks && (
                <div>
                    <label className="block text-xs text-foreground-muted mb-1">Plan Duration (weeks)</label>
                    <input
                        type="number"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(e.target.value)}
                        min={4}
                        max={52}
                        placeholder="12"
                        className={inputClass}
                    />
                </div>
            )}
```

#### Edit 2.5: Hide Running Training Phases (`Taper`/`Peak`/`Build`) & `Long Run Day`/`Quality Day` on Cycling Plans (`sport === 'CYCLING'` or `runsPerWeek === 0`) in `Web/src/components/setup/PlanVolumeSection.tsx`

Open `Web/src/components/setup/PlanVolumeSection.tsx`.

**FIND:**
```tsx
    restDays: number[];
    setRestDays: (_val: number[]) => void;
    computedPlanWeeks?: number;
}

export default function PlanVolumeSection({
    runsPerWeek,
    setRunsPerWeek,
    ridesPerWeek,
    setRidesPerWeek,
    swimsPerWeek,
    setSwimsPerWeek,
    strengthPerWeek,
    setStrengthPerWeek,
    raceType,
    weeklyMileage,
    setWeeklyMileage,
    maxLongRunKm,
    setMaxLongRunKm,
    taperWeeks,
    setTaperWeeks,
    peakWeeks,
    setPeakWeeks,
    buildWeeks,
    setBuildWeeks,
    showSchedulingSettings,
    setShowSchedulingSettings,
    longRunDay,
    setLongRunDay,
    qualityDay,
    setQualityDay,
    swimDay,
    setSwimDay,
    restDays,
    setRestDays,
    computedPlanWeeks
}: PlanVolumeSectionProps) {
```

**REPLACE WITH:**
```tsx
    restDays: number[];
    setRestDays: (_val: number[]) => void;
    computedPlanWeeks?: number;
    sport?: string;
}

export default function PlanVolumeSection({
    runsPerWeek,
    setRunsPerWeek,
    ridesPerWeek,
    setRidesPerWeek,
    swimsPerWeek,
    setSwimsPerWeek,
    strengthPerWeek,
    setStrengthPerWeek,
    raceType,
    weeklyMileage,
    setWeeklyMileage,
    maxLongRunKm,
    setMaxLongRunKm,
    taperWeeks,
    setTaperWeeks,
    peakWeeks,
    setPeakWeeks,
    buildWeeks,
    setBuildWeeks,
    showSchedulingSettings,
    setShowSchedulingSettings,
    longRunDay,
    setLongRunDay,
    qualityDay,
    setQualityDay,
    swimDay,
    setSwimDay,
    restDays,
    setRestDays,
    computedPlanWeeks,
    sport = 'RUN',
}: PlanVolumeSectionProps) {
```

#### Edit 2.6: Conditionally Render Running `Training Phases` & `Long Run Day`/`Quality Day` Only When `sport !== 'CYCLING'` and `runsPerWeek > 0` in `Web/src/components/setup/PlanVolumeSection.tsx`

Open `Web/src/components/setup/PlanVolumeSection.tsx`.

**FIND:**
```tsx
            {/* Training Phases */}
            <div className="border-t border-glass-border pt-6">
                <h3 className="text-sm font-semibold text-foreground-muted mb-4">Training Phases</h3>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted">Taper</label>
                            <span className="text-workout-recovery font-bold font-mono tabular-nums">{taperWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="4"
                            value={taperWeeks}
                            onChange={(e) => setTaperWeeks(parseInt(e.target.value))}
                            aria-label="Taper weeks"
                            aria-valuenow={taperWeeks}
                            aria-valuemin={0}
                            aria-valuemax={4}
                            className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-cyan"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted">Peak</label>
                            <span className="text-workout-long-run font-bold font-mono tabular-nums">{peakWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="6"
                            value={peakWeeks}
                            onChange={(e) => setPeakWeeks(parseInt(e.target.value))}
                            aria-label="Peak weeks"
                            aria-valuenow={peakWeeks}
                            aria-valuemin={0}
                            aria-valuemax={6}
                            className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-purple"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-foreground-muted">Build</label>
                            <span className="text-workout-tempo font-bold font-mono tabular-nums">{buildWeeks}w</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={buildWeeks}
                            onChange={(e) => setBuildWeeks(parseInt(e.target.value))}
                            aria-label="Build weeks"
                            aria-valuenow={buildWeeks}
                            aria-valuemin={0}
                            aria-valuemax={10}
                            className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-workout-tempo"
                        />
                    </div>
                </div>
                {computedPlanWeeks ? (
                    <span className="text-xs text-foreground-muted mt-2">
                        {Math.max(0, computedPlanWeeks - taperWeeks - peakWeeks - buildWeeks)} weeks base phase (remaining)
                    </span>
                ) : (
                    <p className="text-xs text-foreground-muted mt-2">Remaining weeks will be Base phase.</p>
                )}
            </div>

            {/* Workout Scheduling (Collapsible - Advanced) */}
            <div className="border-t border-glass-border pt-4">
                <button
                    type="button"
                    onClick={() => setShowSchedulingSettings(!showSchedulingSettings)}
                    className="flex items-center justify-between w-full text-left py-2"
                >
                    <h3 className="text-sm font-semibold text-foreground-muted">Workout Scheduling</h3>
                    {showSchedulingSettings ? (
                        <ChevronUp className="w-4 h-4 text-foreground-muted" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-foreground-muted" />
                    )}
                </button>

                {showSchedulingSettings && (
                    <div className="space-y-4 mt-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-foreground-muted mb-2">Long Run Day</label>
                                <select
                                    value={longRunDay}
                                    onChange={e => setLongRunDay(parseInt(e.target.value))}
                                    className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-muted mb-2">Quality Day</label>
                                <select
                                    value={qualityDay}
                                    onChange={e => setQualityDay(parseInt(e.target.value))}
                                    className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                            </div>
                        </div>
```

**REPLACE WITH:**
```tsx
            {/* Training Phases (Hidden for MyWhoosh Cycling plans or 0-run plans since MyWhoosh has its own 5-phase selector) */}
            {sport !== 'CYCLING' && runsPerWeek > 0 && (
                <div className="border-t border-glass-border pt-6">
                    <h3 className="text-sm font-semibold text-foreground-muted mb-4">Training Phases</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-foreground-muted">Taper</label>
                                <span className="text-workout-recovery font-bold font-mono tabular-nums">{taperWeeks}w</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                value={taperWeeks}
                                onChange={(e) => setTaperWeeks(parseInt(e.target.value))}
                                aria-label="Taper weeks"
                                aria-valuenow={taperWeeks}
                                aria-valuemin={0}
                                aria-valuemax={4}
                                className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-cyan"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-foreground-muted">Peak</label>
                                <span className="text-workout-long-run font-bold font-mono tabular-nums">{peakWeeks}w</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="6"
                                value={peakWeeks}
                                onChange={(e) => setPeakWeeks(parseInt(e.target.value))}
                                aria-label="Peak weeks"
                                aria-valuenow={peakWeeks}
                                aria-valuemin={0}
                                aria-valuemax={6}
                                className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-purple"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-foreground-muted">Build</label>
                                <span className="text-workout-tempo font-bold font-mono tabular-nums">{buildWeeks}w</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={buildWeeks}
                                onChange={(e) => setBuildWeeks(parseInt(e.target.value))}
                                aria-label="Build weeks"
                                aria-valuenow={buildWeeks}
                                aria-valuemin={0}
                                aria-valuemax={10}
                                className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-workout-tempo"
                            />
                        </div>
                    </div>
                    {computedPlanWeeks ? (
                        <span className="text-xs text-foreground-muted mt-2">
                            {Math.max(0, computedPlanWeeks - taperWeeks - peakWeeks - buildWeeks)} weeks base phase (remaining)
                        </span>
                    ) : (
                        <p className="text-xs text-foreground-muted mt-2">Remaining weeks will be Base phase.</p>
                    )}
                </div>
            )}

            {/* Workout Scheduling (Collapsible - Advanced) */}
            <div className="border-t border-glass-border pt-4">
                <button
                    type="button"
                    onClick={() => setShowSchedulingSettings(!showSchedulingSettings)}
                    className="flex items-center justify-between w-full text-left py-2"
                >
                    <h3 className="text-sm font-semibold text-foreground-muted">Workout Scheduling</h3>
                    {showSchedulingSettings ? (
                        <ChevronUp className="w-4 h-4 text-foreground-muted" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-foreground-muted" />
                    )}
                </button>

                {showSchedulingSettings && (
                    <div className="space-y-4 mt-4 animate-fade-in">
                        {runsPerWeek > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-foreground-muted mb-2">Long Run Day</label>
                                    <select
                                        value={longRunDay}
                                        onChange={e => setLongRunDay(parseInt(e.target.value))}
                                        className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                    >
                                        <option value={0}>Sunday</option>
                                        <option value={1}>Monday</option>
                                        <option value={2}>Tuesday</option>
                                        <option value={3}>Wednesday</option>
                                        <option value={4}>Thursday</option>
                                        <option value={5}>Friday</option>
                                        <option value={6}>Saturday</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-foreground-muted mb-2">Quality Day</label>
                                    <select
                                        value={qualityDay}
                                        onChange={e => setQualityDay(parseInt(e.target.value))}
                                        className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-accent-orange outline-hidden"
                                    >
                                        <option value={0}>Sunday</option>
                                        <option value={1}>Monday</option>
                                        <option value={2}>Tuesday</option>
                                        <option value={3}>Wednesday</option>
                                        <option value={4}>Thursday</option>
                                        <option value={5}>Friday</option>
                                        <option value={6}>Saturday</option>
                                    </select>
                                </div>
                            </div>
                        )}
```

#### Edit 2.7: Import `MYWHOOSH_PHASES`, `splitMyWhooshPlanAndPhase`, and `encodeMyWhooshPlanAndPhase` in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
import { MYWHOOSH_PLANS } from '@/lib/plans/mywhooshMatcher';
```

**REPLACE WITH:**
```tsx
import { MYWHOOSH_PLANS, MYWHOOSH_PHASES, splitMyWhooshPlanAndPhase, encodeMyWhooshPlanAndPhase, type MyWhooshPhaseOption } from '@/lib/plans/mywhooshMatcher';
```

#### Edit 2.8: Support `runsPerWeek === 0` Calibration Guard & Create-When-No-Active-Goal in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
    // Settings mutation (update settings)
    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            const rawTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
            const timeSeconds = rawTimeSeconds > 0 ? rawTimeSeconds : (sport === 'CYCLING' ? 1500 : 0);

            if (timeSeconds === 0) throw new Error('Time cannot be zero');
```

**REPLACE WITH:**
```tsx
    // Settings mutation (update settings)
    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            const rawTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
            const timeSeconds = rawTimeSeconds > 0 ? rawTimeSeconds : ((sport === 'CYCLING' || runsPerWeek === 0) ? 1500 : 0);

            if (timeSeconds === 0) throw new Error('Time cannot be zero');
```

#### Edit 2.9: Allow Creating a New Plan Directly From `mode === 'settings'` When `!activeGoalId` in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
    const handleSubmit = () => {
        const errors: Record<string, string> = {};
        if (mode === 'onboarding' || mode === 'advanced' || mode === 'modal') {
            if (!goalName.trim()) errors.goalName = "Goal name is required";
            if (sport !== 'NO_RACE' && sport !== 'CYCLING' && !raceDate) errors.raceDate = "Race date is required";
            if (!planStartDate) errors.planStartDate = "Plan start date is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setMessage('Please fix the errors in the form.');
            return;
        }

        setFormErrors({});
        setMessage('');

        if (mode === 'onboarding' || mode === 'advanced' || mode === 'modal') {
            createGoalMutation.mutate();
        } else {
            updateSettingsMutation.mutate();
        }
    };

    const isLoading = createGoalMutation.isPending || updateSettingsMutation.isPending;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const activeGoalId: string | undefined = goalsData?.goals?.find((g: { isActive: boolean }) => g.isActive)?.id;
```

**REPLACE WITH:**
```tsx
    const activeGoalId: string | undefined = goalsData?.goals?.find((g: { isActive: boolean }) => g.isActive)?.id;
    const isCreatingPlan = mode === 'onboarding' || mode === 'advanced' || mode === 'modal' || !activeGoalId;

    const handleSubmit = () => {
        const errors: Record<string, string> = {};
        if (isCreatingPlan) {
            if (!goalName.trim()) errors.goalName = "Goal name is required";
            if (sport !== 'NO_RACE' && sport !== 'CYCLING' && !raceDate) errors.raceDate = "Race date is required";
            if (!planStartDate) errors.planStartDate = "Plan start date is required";
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setMessage('Please fix the errors in the form.');
            return;
        }

        setFormErrors({});
        setMessage('');

        if (isCreatingPlan) {
            createGoalMutation.mutate();
        } else {
            updateSettingsMutation.mutate();
        }
    };

    const isLoading = createGoalMutation.isPending || updateSettingsMutation.isPending;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

#### Edit 2.10: Add Two-Stage MyWhoosh Selector (General Plan -> Phase of Plan), Hide Run Calibration on 0 Runs, and Add MyWhoosh vs. Offline Cycling Selector When Adding Rides to Running Plans in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
                durationWeeks={durationWeeks}
                setDurationWeeks={setDurationWeeks}
                experienceLevel={experienceLevel}
                setExperienceLevel={adjustDefaultsForExperience}
            />

            <CalibrationSection
                calibrationMode={calibrationMode}
                setCalibrationMode={setCalibrationMode}
                selectedActivityId={selectedActivityId}
                setSelectedActivityId={setSelectedActivityId}
                calibrationDistance={calibrationDistance}
                setCalibrationDistance={setCalibrationDistance}
                hours={hours}
                setHours={setHours}
                minutes={minutes}
                setMinutes={setMinutes}
                seconds={seconds}
                setSeconds={setSeconds}
                setCalibrationFactor={setCalibrationFactor}
                currentVdot={currentVdot}
                raceActivities={raceActivities}
            />
```

**REPLACE WITH:**
```tsx
                durationWeeks={durationWeeks}
                setDurationWeeks={setDurationWeeks}
                experienceLevel={experienceLevel}
                setExperienceLevel={adjustDefaultsForExperience}
                showGoalNameInSettings={!activeGoalId}
            />

            {runsPerWeek > 0 && (
                <CalibrationSection
                    calibrationMode={calibrationMode}
                    setCalibrationMode={setCalibrationMode}
                    selectedActivityId={selectedActivityId}
                    setSelectedActivityId={setSelectedActivityId}
                    calibrationDistance={calibrationDistance}
                    setCalibrationDistance={setCalibrationDistance}
                    hours={hours}
                    setHours={setHours}
                    minutes={minutes}
                    setMinutes={setMinutes}
                    seconds={seconds}
                    setSeconds={setSeconds}
                    setCalibrationFactor={setCalibrationFactor}
                    currentVdot={currentVdot}
                    raceActivities={raceActivities}
                />
            )}
```

#### Edit 2.11: Replace Single MyWhoosh Dropdown With MyWhoosh General Plan -> Phase Selector & Running+Cycling Mode Selector (MyWhoosh vs. Offline Cycling) in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
            {/* MyWhoosh Training Plan Selector (always visible and preselected when sport === 'CYCLING') */}
            {(sport === 'CYCLING' || ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (
                <div className="border-t border-glass-border pt-6 space-y-3">
                    {sport !== 'CYCLING' && (
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
                    )}

                    {(sport === 'CYCLING' || matchToMyWhoosh) && (
                        <div className="p-3.5 rounded-md bg-surface border border-accent-cyan/40 space-y-2">
                            <label className="block text-xs font-semibold text-accent-cyan">
                                {sport === 'CYCLING' ? 'Select MyWhoosh Cycling Training Plan' : 'MyWhoosh Training Plan / Workout Selector'}
                            </label>
                            <select
                                value={mywhooshPlanId || (sport === 'CYCLING' ? (MYWHOOSH_PLANS[0]?.id ?? '') : '')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setMywhooshPlanId(val);
                                    const selectedPlan = MYWHOOSH_PLANS.find((p) => p.id === val);
                                    if (sport === 'CYCLING' && selectedPlan) {
                                        setDurationWeeks(String(selectedPlan.weeksCount));
                                        if (
                                            goalName === 'My First Race' ||
                                            goalName === 'My Race' ||
                                            MYWHOOSH_PLANS.some((p) => p.name === goalName)
                                        ) {
                                            setGoalName(selectedPlan.name);
                                        }
                                    }
                                }}
                                className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan"
                            >
                                {sport !== 'CYCLING' && (
                                    <option value="">Auto-Match Closest MyWhoosh Workout by Phase &amp; Duration</option>
                                )}
                                {MYWHOOSH_PLANS.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} ({plan.category} · {plan.level} · {plan.weeksCount}w)
                                    </option>
                                ))}
                            </select>
                            {(mywhooshPlanId || sport === 'CYCLING') && (
                                <p className="text-[11px] text-foreground-muted">
                                    {MYWHOOSH_PLANS.find((p) => p.id === (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id))?.description}
                                </p>
                            )}
                            {sport === 'CYCLING' && (
                                <p className="text-[11px] text-accent-cyan">
                                    Pure cycling plan preselected from MyWhoosh. Use the sliders below to add optional Runs, Swims, or Strength/Gym sessions per week.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <PlanVolumeSection
                runsPerWeek={runsPerWeek}
                setRunsPerWeek={setRunsPerWeek}
                ridesPerWeek={ridesPerWeek}
                setRidesPerWeek={setRidesPerWeek}
                swimsPerWeek={swimsPerWeek}
                setSwimsPerWeek={setSwimsPerWeek}
                strengthPerWeek={strengthPerWeek}
                setStrengthPerWeek={setStrengthPerWeek}
                weeklyMileage={weeklyMileage}
                setWeeklyMileage={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setWeeklyMileage(val);
                }}
                raceType={raceType}
                maxLongRunKm={maxLongRunKm}
                setMaxLongRunKm={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setMaxLongRunKm(val);
                }}
                taperWeeks={taperWeeks}
                setTaperWeeks={setTaperWeeks}
                peakWeeks={peakWeeks}
                setPeakWeeks={setPeakWeeks}
                buildWeeks={buildWeeks}
                setBuildWeeks={setBuildWeeks}
                showSchedulingSettings={showSchedulingSettings}
                setShowSchedulingSettings={setShowSchedulingSettings}
                longRunDay={longRunDay}
                setLongRunDay={setLongRunDay}
                qualityDay={qualityDay}
                setQualityDay={setQualityDay}
                swimDay={swimDay}
                setSwimDay={setSwimDay}
                restDays={restDays}
                setRestDays={setRestDays}
                computedPlanWeeks={computedPlanWeeks}
            />
```

**REPLACE WITH:**
```tsx
            {/* MyWhoosh Two-Stage Selector (General Plan -> Phase of Plan) */}
            {(sport === 'CYCLING' || ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (() => {
                const { planId: selectedBasePlanId, phaseKey: selectedPhaseKey } = splitMyWhooshPlanAndPhase(
                    mywhooshPlanId || (sport === 'CYCLING' ? (MYWHOOSH_PLANS[0]?.id ?? 'mw-plan-ftp-builder') : '')
                );
                const activeMwPlan = MYWHOOSH_PLANS.find((p) => p.id === selectedBasePlanId) || (sport === 'CYCLING' ? MYWHOOSH_PLANS[0] : undefined);
                const activePhaseMeta = MYWHOOSH_PHASES.find((ph) => ph.id === selectedPhaseKey) || MYWHOOSH_PHASES[0];
                const categories = Array.from(new Set(MYWHOOSH_PLANS.map((p) => p.category)));

                return (
                    <div className="border-t border-glass-border pt-6 space-y-3">
                        {sport !== 'CYCLING' && (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-foreground-muted">
                                    Cycling Workout Mode ({ridesPerWeek} {ridesPerWeek === 1 ? 'Ride' : 'Rides'} / Week)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setMatchToMyWhoosh(true)}
                                        className={`p-3 rounded-md border text-left transition-all ${
                                            matchToMyWhoosh
                                                ? 'border-accent-cyan bg-accent-cyan/10 text-foreground'
                                                : 'border-glass-border bg-surface text-foreground-muted hover:border-foreground-muted'
                                        }`}
                                    >
                                        <span className="text-xs font-semibold block text-accent-cyan">MyWhoosh Virtual Workouts</span>
                                        <span className="text-[11px] text-foreground-muted mt-0.5 block">
                                            Match rides to MyWhoosh plans (%FTP intervals, cadence &amp; .zwo export)
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMatchToMyWhoosh(false)}
                                        className={`p-3 rounded-md border text-left transition-all ${
                                            !matchToMyWhoosh
                                                ? 'border-accent-orange bg-accent-orange/10 text-foreground'
                                                : 'border-glass-border bg-surface text-foreground-muted hover:border-foreground-muted'
                                        }`}
                                    >
                                        <span className="text-xs font-semibold block text-foreground">Offline / Outdoor Cycling</span>
                                        <span className="text-[11px] text-foreground-muted mt-0.5 block">
                                            Standard outdoor/offline rides (Zone 2 Endurance, Tempo &amp; Intervals)
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {(sport === 'CYCLING' || matchToMyWhoosh) && (
                            <div className="p-4 rounded-md bg-surface border border-accent-cyan/40 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-accent-cyan mb-1">
                                            1. MyWhoosh General Training Plan
                                        </label>
                                        <select
                                            value={selectedBasePlanId}
                                            onChange={(e) => {
                                                const newBaseId = e.target.value;
                                                const nextComposite = encodeMyWhooshPlanAndPhase(newBaseId, selectedPhaseKey);
                                                setMywhooshPlanId(nextComposite);
                                                const foundPlan = MYWHOOSH_PLANS.find((p) => p.id === newBaseId);
                                                if (sport === 'CYCLING' && foundPlan) {
                                                    const nextWeeks = activePhaseMeta.weeks ?? foundPlan.weeksCount;
                                                    setDurationWeeks(String(nextWeeks));
                                                    setRidesPerWeek(foundPlan.ridesPerWeek || 4);
                                                    if (
                                                        goalName === 'My First Race' ||
                                                        goalName === 'My Race' ||
                                                        MYWHOOSH_PLANS.some((p) => goalName.startsWith(p.name))
                                                    ) {
                                                        setGoalName(
                                                            selectedPhaseKey !== 'ALL'
                                                                ? `${foundPlan.name} (${activePhaseMeta.shortLabel})`
                                                                : foundPlan.name
                                                        );
                                                    }
                                                }
                                            }}
                                            className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan"
                                        >
                                            {sport !== 'CYCLING' && (
                                                <option value="">Auto-Match Closest MyWhoosh Workout by Phase &amp; Duration</option>
                                            )}
                                            {categories.map((cat) => (
                                                <optgroup key={cat} label={cat}>
                                                    {MYWHOOSH_PLANS.filter((p) => p.category === cat).map((plan) => (
                                                        <option key={plan.id} value={plan.id}>
                                                            {plan.name} ({plan.level} · {plan.weeksCount}w)
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-accent-cyan mb-1">
                                            2. Phase of Plan (MyWhoosh 5-Phase System)
                                        </label>
                                        <select
                                            value={selectedPhaseKey}
                                            disabled={!selectedBasePlanId}
                                            onChange={(e) => {
                                                const nextPhase = e.target.value as MyWhooshPhaseOption['id'];
                                                const baseId = selectedBasePlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder';
                                                setMywhooshPlanId(encodeMyWhooshPlanAndPhase(baseId, nextPhase));
                                                const phaseObj = MYWHOOSH_PHASES.find((ph) => ph.id === nextPhase);
                                                const foundPlan = MYWHOOSH_PLANS.find((p) => p.id === baseId);
                                                if (sport === 'CYCLING' && foundPlan) {
                                                    const nextWeeks = phaseObj?.weeks ?? foundPlan.weeksCount;
                                                    setDurationWeeks(String(nextWeeks));
                                                    if (
                                                        goalName === 'My First Race' ||
                                                        goalName === 'My Race' ||
                                                        MYWHOOSH_PLANS.some((p) => goalName.startsWith(p.name))
                                                    ) {
                                                        setGoalName(
                                                            nextPhase !== 'ALL' && phaseObj
                                                                ? `${foundPlan.name} (${phaseObj.shortLabel})`
                                                                : foundPlan.name
                                                        );
                                                    }
                                                }
                                            }}
                                            className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan disabled:opacity-50"
                                        >
                                            {MYWHOOSH_PHASES.map((ph) => (
                                                <option key={ph.id} value={ph.id}>
                                                    {ph.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {activeMwPlan && (
                                    <div className="rounded bg-background-secondary/70 border border-line p-2.5 space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <span className="font-semibold text-foreground">{activeMwPlan.name}</span>
                                            <span className="font-mono text-[11px] text-accent-cyan">
                                                {activePhaseMeta.weeks ?? activeMwPlan.weeksCount} Weeks · {activeMwPlan.level} · {activePhaseMeta.shortLabel}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-foreground-muted">{activeMwPlan.description}</p>
                                        <p className="text-[11px] text-accent-cyan/90">{activePhaseMeta.description}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            <PlanVolumeSection
                runsPerWeek={runsPerWeek}
                setRunsPerWeek={setRunsPerWeek}
                ridesPerWeek={ridesPerWeek}
                setRidesPerWeek={setRidesPerWeek}
                swimsPerWeek={swimsPerWeek}
                setSwimsPerWeek={setSwimsPerWeek}
                strengthPerWeek={strengthPerWeek}
                setStrengthPerWeek={setStrengthPerWeek}
                weeklyMileage={weeklyMileage}
                setWeeklyMileage={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setWeeklyMileage(val);
                }}
                raceType={raceType}
                maxLongRunKm={maxLongRunKm}
                setMaxLongRunKm={(val: number) => {
                    if (mode === 'settings' && settingsLoadedRef.current) {
                        userChangedVolumeRef.current = true;
                    }
                    setMaxLongRunKm(val);
                }}
                taperWeeks={taperWeeks}
                setTaperWeeks={setTaperWeeks}
                peakWeeks={peakWeeks}
                setPeakWeeks={setPeakWeeks}
                buildWeeks={buildWeeks}
                setBuildWeeks={setBuildWeeks}
                showSchedulingSettings={showSchedulingSettings}
                setShowSchedulingSettings={setShowSchedulingSettings}
                longRunDay={longRunDay}
                setLongRunDay={setLongRunDay}
                qualityDay={qualityDay}
                setQualityDay={setQualityDay}
                swimDay={swimDay}
                setSwimDay={setSwimDay}
                restDays={restDays}
                setRestDays={setRestDays}
                computedPlanWeeks={computedPlanWeeks}
                sport={sport}
            />
```

#### Edit 2.12: Hide `Start Weekly Mileage` When `runsPerWeek === 0` and Show `Create Training Plan` Label When `!activeGoalId` in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
            {/* Start Weekly Mileage */}
            <div className="border-t border-glass-border pt-6">
                <div className="flex justify-between mb-2">
                    <label className="text-xs text-foreground-muted">Start Weekly Mileage</label>
                    <span className="text-positive font-bold">{startWeeklyMileage} km</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={Math.round(weeklyMileage)}
                    step="5"
                    value={startWeeklyMileage}
                    onChange={(e) => setStartWeeklyMileage(parseInt(e.target.value))}
                    className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-positive"
                />
                <div className="flex justify-between text-xs text-foreground-muted mt-1">
                    <span>0km</span>
                    <span>{Math.round(weeklyMileage / 2)}km</span>
                    <span>{Math.round(weeklyMileage)}km</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">
                    {internalStatsData?.avgWeeklyKmLast4Weeks > 0
                        ? `Based on your last 4 weeks avg (${internalStatsData.avgWeeklyKmLast4Weeks} km/wk). Adjust if needed.`
                        : 'Your current weekly mileage at the start of the plan.'}
                </p>
            </div>
```

**REPLACE WITH:**
```tsx
            {/* Start Weekly Mileage (only when running is part of the plan) */}
            {runsPerWeek > 0 && (
                <div className="border-t border-glass-border pt-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-foreground-muted">Start Weekly Mileage</label>
                        <span className="text-positive font-bold">{startWeeklyMileage} km</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.round(weeklyMileage)}
                        step="5"
                        value={startWeeklyMileage}
                        onChange={(e) => setStartWeeklyMileage(parseInt(e.target.value))}
                        className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-positive"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1">
                        <span>0km</span>
                        <span>{Math.round(weeklyMileage / 2)}km</span>
                        <span>{Math.round(weeklyMileage)}km</span>
                    </div>
                    <p className="text-xs text-foreground-muted mt-1">
                        {internalStatsData?.avgWeeklyKmLast4Weeks > 0
                            ? `Based on your last 4 weeks avg (${internalStatsData.avgWeeklyKmLast4Weeks} km/wk). Adjust if needed.`
                            : 'Your current weekly mileage at the start of the plan.'}
                    </p>
                </div>
            )}
```

#### Edit 2.13: Update Submit Button Text for `isCreatingPlan` in `Web/src/components/PlanSetupForm.tsx`

Open `Web/src/components/PlanSetupForm.tsx`.

**FIND:**
```tsx
                {isLoading ? (
                    <>
                        <Save className="animate-spin w-5 h-5" />
                        {mode === 'onboarding' ? 'Generating Plan...' : 'Updating...'}
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        {mode === 'onboarding' ? 'Generate Training Plan' : 'Save & Regenerate Plan'}
                    </>
                )}
```

**REPLACE WITH:**
```tsx
                {isLoading ? (
                    <>
                        <Save className="animate-spin w-5 h-5" />
                        {isCreatingPlan ? 'Generating Plan...' : 'Updating...'}
                    </>
                ) : (
                    <>
                        <Check className="w-5 h-5" />
                        {isCreatingPlan ? 'Generate Training Plan' : 'Save & Regenerate Plan'}
                    </>
                )}
```

#### Edit 2.14: Add MyWhoosh General Plan -> Phase Selector & Hide Unneeded Running Fields When `sport === 'CYCLING'` in `Web/src/components/PlanEditor/EngineGenerateModal.tsx`

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
import { MYWHOOSH_PLANS } from '@/lib/plans/mywhooshMatcher';
```

**REPLACE WITH:**
```tsx
import { MYWHOOSH_PLANS, MYWHOOSH_PHASES, splitMyWhooshPlanAndPhase, encodeMyWhooshPlanAndPhase, type MyWhooshPhaseOption } from '@/lib/plans/mywhooshMatcher';
```

#### Edit 2.15: Update `EngineGenerateModal.tsx` to Support MyWhoosh Phase Selection & Hide Running Phase/Mileage Inputs on Cycling Plans

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
        const isCycling = sport === 'CYCLING';
        const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
            ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
            : null;
        const selectedMwPlan = MYWHOOSH_PLANS.find((p) => p.id === effectiveMyWhooshPlanId);
```

**REPLACE WITH:**
```tsx
        const isCycling = sport === 'CYCLING';
        const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
            ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
            : null;
        const { planId: cleanMwPlanId, phaseKey: selectedMwPhaseKey } = splitMyWhooshPlanAndPhase(effectiveMyWhooshPlanId);
        const selectedMwPlan = MYWHOOSH_PLANS.find((p) => p.id === cleanMwPlanId);
        const selectedMwPhase = MYWHOOSH_PHASES.find((ph) => ph.id === selectedMwPhaseKey);
```

#### Edit 2.16: Use Selected MyWhoosh Phase Duration & Name When Creating a Cycling Plan in `Web/src/components/PlanEditor/EngineGenerateModal.tsx`

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
                        name: isCycling
                            ? (selectedMwPlan?.name || 'MyWhoosh Cycling Plan')
                            : `${raceType.replace(/_/g, ' ')} Plan`,
                        sport: isCycling ? 'CYCLING' : sport,
                        raceType: isCycling ? null : raceType,
                        raceDate: isCycling ? null : new Date(raceDate).toISOString(),
                        durationWeeks: isCycling ? (selectedMwPlan?.weeksCount || 8) : undefined,
```

**REPLACE WITH:**
```tsx
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
```

#### Edit 2.17: Hide Running Phase Inputs on Cycling Plans & Add 2-Stage MyWhoosh Plan + Phase Selector in `Web/src/components/PlanEditor/EngineGenerateModal.tsx`

Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx`.

**FIND:**
```tsx
                    {/* Weekly Target Volume & Phase Weeks */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Peak Weekly Km</label>
                            <input
                                type="number"
                                min={10}
                                max={250}
                                value={weeklyMileageGoal}
                                onChange={(e) => setWeeklyMileageGoal(parseInt(e.target.value, 10) || 40)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Build Weeks</label>
                            <input
                                type="number"
                                min={1}
                                max={24}
                                value={buildWeeks}
                                onChange={(e) => setBuildWeeks(parseInt(e.target.value, 10) || 4)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Peak Weeks</label>
                            <input
                                type="number"
                                min={1}
                                max={8}
                                value={peakWeeks}
                                onChange={(e) => setPeakWeeks(parseInt(e.target.value, 10) || 3)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-foreground-muted mb-1">Taper Weeks</label>
                            <input
                                type="number"
                                min={1}
                                max={4}
                                value={taperWeeks}
                                onChange={(e) => setTaperWeeks(parseInt(e.target.value, 10) || 3)}
                                className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* MyWhoosh Training Plan Selector */}
                    {(sport === 'CYCLING' || sport === 'TRIATHLON' || ridesPerWeek > 0) && (
                        <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold text-accent-cyan uppercase tracking-wider block">
                                        Match Cycling to MyWhoosh
                                    </span>
                                    <p className="text-[10px] text-foreground-muted">
                                        Populate bike rides with structured MyWhoosh training workouts
                                    </p>
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
                                <div className="pt-1 space-y-1.5">
                                    <label className="block text-[10px] font-medium text-foreground-secondary">
                                        MyWhoosh Training Plan
                                    </label>
                                    <select
                                        value={mywhooshPlanId}
                                        onChange={(e) => setMywhooshPlanId(e.target.value)}
                                        className="w-full bg-background-tertiary border border-glass-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                                    >
                                        <option value="">Auto-Match Closest MyWhoosh Workout</option>
                                        {MYWHOOSH_PLANS.map((plan) => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} ({plan.category} · {plan.level} · {plan.weeksCount}w)
                                            </option>
                                        ))}
                                    </select>
                                    {mywhooshPlanId && (
                                        <p className="text-[10px] text-foreground-muted">
                                            {MYWHOOSH_PLANS.find((p) => p.id === mywhooshPlanId)?.description}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
```

**REPLACE WITH:**
```tsx
                    {/* Volume & Phase Weeks (hidden on pure MyWhoosh Cycling plans with 0 runs) */}
                    {sport !== 'CYCLING' && runsPerWeek > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Peak Run (km/wk)</label>
                                <input
                                    type="number"
                                    min={10}
                                    max={250}
                                    value={weeklyMileageGoal}
                                    onChange={(e) => setWeeklyMileageGoal(parseInt(e.target.value, 10) || 40)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Build Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={buildWeeks}
                                    onChange={(e) => setBuildWeeks(parseInt(e.target.value, 10) || 4)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Peak Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={peakWeeks}
                                    onChange={(e) => setPeakWeeks(parseInt(e.target.value, 10) || 3)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-foreground-muted mb-1">Taper Weeks</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={4}
                                    value={taperWeeks}
                                    onChange={(e) => setTaperWeeks(parseInt(e.target.value, 10) || 3)}
                                    className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* MyWhoosh Training Plan & Phase Selector */}
                    {(sport === 'CYCLING' || sport === 'TRIATHLON' || ridesPerWeek > 0) && (() => {
                        const { planId: basePlanId, phaseKey } = splitMyWhooshPlanAndPhase(mywhooshPlanId);
                        const categories = Array.from(new Set(MYWHOOSH_PLANS.map((p) => p.category)));
                        return (
                            <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2.5">
                                {sport !== 'CYCLING' && (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[11px] font-semibold text-accent-cyan uppercase tracking-wider block">
                                                Cycling Mode: {matchToMyWhoosh ? 'MyWhoosh Virtual Workouts' : 'Offline / Outdoor Rides'}
                                            </span>
                                            <p className="text-[10px] text-foreground-muted">
                                                Toggle ON for MyWhoosh structured workouts (.zwo) or OFF for standard outdoor rides
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMatchToMyWhoosh(!matchToMyWhoosh)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${matchToMyWhoosh ? 'bg-accent-cyan' : 'bg-glass-border'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchToMyWhoosh ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                )}

                                {(sport === 'CYCLING' || matchToMyWhoosh) && (
                                    <div className="pt-1 space-y-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-accent-cyan mb-1">
                                                1. MyWhoosh General Plan
                                            </label>
                                            <select
                                                value={basePlanId}
                                                onChange={(e) => setMywhooshPlanId(encodeMyWhooshPlanAndPhase(e.target.value, phaseKey))}
                                                className="w-full bg-background-tertiary border border-glass-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                                            >
                                                {sport !== 'CYCLING' && (
                                                    <option value="">Auto-Match Closest MyWhoosh Workout</option>
                                                )}
                                                {categories.map((cat) => (
                                                    <optgroup key={cat} label={cat}>
                                                        {MYWHOOSH_PLANS.filter((p) => p.category === cat).map((plan) => (
                                                            <option key={plan.id} value={plan.id}>
                                                                {plan.name} ({plan.level} · {plan.weeksCount}w)
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-accent-cyan mb-1">
                                                2. Phase of Plan
                                            </label>
                                            <select
                                                value={phaseKey}
                                                disabled={!basePlanId}
                                                onChange={(e) => setMywhooshPlanId(encodeMyWhooshPlanAndPhase(basePlanId || 'mw-plan-ftp-builder', e.target.value as MyWhooshPhaseOption['id']))}
                                                className="w-full bg-background-tertiary border border-glass-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none disabled:opacity-50"
                                            >
                                                {MYWHOOSH_PHASES.map((ph) => (
                                                    <option key={ph.id} value={ph.id}>
                                                        {ph.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {basePlanId && (
                                            <p className="text-[10px] text-foreground-muted">
                                                {MYWHOOSH_PLANS.find((p) => p.id === basePlanId)?.description}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
```

#### Verify Agent-MW-2:

```bash
cd Web && npx tsc --noEmit
```

### Agent-MW-3 Prompt (`onboarding-back-dashboard-reminders-and-menu`)

> **Role**: Onboarding Back-Navigation, Dashboard Widgets & Settings Menu Agent `onboarding-back-dashboard-reminders-and-menu` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/OnboardingWizard.tsx`
> * `Web/src/app/mobile-layout.tsx`
> * `Web/src/app/page.tsx`
> * `Web/src/components/views/DashboardView.tsx`
> * `Web/src/components/dashboard/WorkoutScheduleCard.tsx`
> * `Web/src/components/MinimalistPillsMenu.tsx`
> * `Web/src/components/setup/HeartRateZonesSection.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 11 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 3.1: Add Direct `Dashboard` Back Button on `/onboarding?step=4` (and All Onboarding Steps) in `Web/src/components/OnboardingWizard.tsx`

Open `Web/src/components/OnboardingWizard.tsx`.

**FIND:**
```tsx
                {/* Header: Back button + step indicator */}
                <div className="flex items-center justify-between mb-4">
                    {step > 0 ? (
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            className="btn-secondary flex items-center gap-2 px-4 py-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    ) : (
                        <div />
                    )}
                    <span className="text-sm text-foreground-muted font-mono tabular-nums">
                        Step {step + 1} of 5
                    </span>
                </div>
```

**REPLACE WITH:**
```tsx
                {/* Header: Back to Dashboard + step navigation */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem('runflow_onboarding_dismissed', 'true');
                                }
                                clearOnboardingState();
                                router.push('/');
                            }}
                            className="btn-secondary flex items-center gap-2 px-4 py-2"
                            title="Return to Dashboard"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Dashboard
                        </button>
                        {step > 0 && searchParams.get('step') !== '4' && (
                            <button
                                type="button"
                                onClick={() => setStep(Math.max(0, step - 1))}
                                className="px-3 py-2 rounded-md text-xs text-foreground-muted hover:text-foreground border border-line hover:bg-surface transition-colors"
                            >
                                Previous Step
                            </button>
                        )}
                    </div>
                    <span className="text-sm text-foreground-muted font-mono tabular-nums">
                        {searchParams.get('step') === '4' ? 'Plan Builder' : `Step ${step + 1} of 5`}
                    </span>
                </div>
```

#### Edit 3.2: Prevent `mobile-layout.tsx` From Redirect-Looping Users Back to `/onboarding?step=4` When Returning to Dashboard

Open `Web/src/app/mobile-layout.tsx`.

**FIND:**
```tsx
    useEffect(() => {
        if (shouldRedirectToLogin) {
            router.push('/login');
        } else if (shouldRedirectToOnboarding) {
            router.push('/onboarding?step=4');
        }
    }, [router, shouldRedirectToLogin, shouldRedirectToOnboarding]);
```

**REPLACE WITH:**
```tsx
    useEffect(() => {
        if (shouldRedirectToLogin) {
            router.push('/login');
        } else if (shouldRedirectToOnboarding) {
            try {
                localStorage.setItem('runflow_onboarding_dismissed', 'true');
            } catch {
                // ignore storage errors
            }
            router.push('/onboarding?step=4');
        }
    }, [router, shouldRedirectToLogin, shouldRedirectToOnboarding]);
```

#### Edit 3.3: Return `null` in `WorkoutScheduleCard.tsx` When No Workouts Are Scheduled This Week

Open `Web/src/components/dashboard/WorkoutScheduleCard.tsx`.

**FIND:**
```tsx
    // Find interesting workouts logic moved here
    const firstUncompletedIndex = weeklyWorkouts.findIndex((w: Workout) => !w.isCompleted);

    return (
        <div className="glass-card p-6 h-full flex flex-col">
```

**REPLACE WITH:**
```tsx
    // Hide "This Week's Workouts" card completely when no workouts are scheduled
    if (!weeklyWorkouts || weeklyWorkouts.length === 0) {
        return null;
    }

    // Find interesting workouts logic moved here
    const firstUncompletedIndex = weeklyWorkouts.findIndex((w: Workout) => !w.isCompleted);

    return (
        <div className="glass-card p-6 h-full flex flex-col">
```

#### Edit 3.4: Hide Empty `This Week's Workouts` & Add Dismissible `No Active Training Plan` Reminder on Desktop Dashboard (`Web/src/app/page.tsx`)

Open `Web/src/app/page.tsx`.

**FIND:**
```tsx
    const [raceResultModal, setRaceResultModal] = useState<{
        goal: Goal;
        suggestedActivity: SuggestedRaceActivity | null;
        mode: 'suggest' | 'review' | 'pick';
    } | null>(null);
```

**REPLACE WITH:**
```tsx
    const [raceResultModal, setRaceResultModal] = useState<{
        goal: Goal;
        suggestedActivity: SuggestedRaceActivity | null;
        mode: 'suggest' | 'review' | 'pick';
    } | null>(null);
    const [hideNoPlanReminder, setHideNoPlanReminder] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('runflow_hide_no_plan_prompt') === 'true';
    });

    useEffect(() => {
        const syncNoPlanPref = () => {
            setHideNoPlanReminder(localStorage.getItem('runflow_hide_no_plan_prompt') === 'true');
        };
        window.addEventListener('runflow-plan-reminder-change', syncNoPlanPref);
        window.addEventListener('storage', syncNoPlanPref);
        return () => {
            window.removeEventListener('runflow-plan-reminder-change', syncNoPlanPref);
            window.removeEventListener('storage', syncNoPlanPref);
        };
    }, []);
```

#### Edit 3.5: Dynamically Collapse Empty Dashboard Columns & Add `Hide Reminder` Button in `Web/src/app/page.tsx`

Open `Web/src/app/page.tsx`.

**FIND:**
```tsx
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            <div className="lg:col-span-1">
                                <WorkoutScheduleCard
                                    weeklyWorkouts={weeklyWorkouts}
                                    today={today}
                                    onEditWorkout={(w) => {
                                        setEditingWorkout(w);
                                        setInitialComplete(false);
                                    }}
                                    onCompleteWorkout={(w) => {
                                        setEditingWorkout(w);
                                        setInitialComplete(true);
                                    }}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                {planTileGoal ? (
                                    <RaceCountdown
                                        goal={planTileGoal}
                                        className="h-full"
                                        isIncompleteArchived={!activeGoal && !!incompleteGoal}
                                        onSelectRace={(goal, activity, mode) => {
                                            setRaceResultModal({
                                                goal,
                                                suggestedActivity: activity,
                                                mode,
                                            });
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center glass-card p-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                            <Target className="w-8 h-8 text-accent-orange" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                        <p className="text-foreground-muted mb-6 text-sm">
                                            You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                        </p>
                                        <button
                                            onClick={() => router.push('/onboarding?step=4')}
                                            className="btn-primary py-2 px-6"
                                        >
                                            Create Training Plan
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="lg:col-span-1 h-full flex flex-col">
                                <TrainingStatusCard />
                            </div>
                        </div>
```

**REPLACE WITH:**
```tsx
                        {(() => {
                            const showWorkoutsCard = weeklyWorkouts.length > 0;
                            const showPlanCard = Boolean(planTileGoal) || !hideNoPlanReminder;
                            const visibleCount = (showWorkoutsCard ? 1 : 0) + (showPlanCard ? 1 : 0) + 1;
                            const gridColsClass =
                                visibleCount === 3
                                    ? 'lg:grid-cols-3'
                                    : visibleCount === 2
                                    ? 'lg:grid-cols-2'
                                    : 'lg:grid-cols-1';

                            return (
                                <div className={`grid grid-cols-1 ${gridColsClass} gap-6 items-stretch`}>
                                    {showWorkoutsCard && (
                                        <div className="lg:col-span-1">
                                            <WorkoutScheduleCard
                                                weeklyWorkouts={weeklyWorkouts}
                                                today={today}
                                                onEditWorkout={(w) => {
                                                    setEditingWorkout(w);
                                                    setInitialComplete(false);
                                                }}
                                                onCompleteWorkout={(w) => {
                                                    setEditingWorkout(w);
                                                    setInitialComplete(true);
                                                }}
                                            />
                                        </div>
                                    )}
                                    {showPlanCard && (
                                        <div className="lg:col-span-1">
                                            {planTileGoal ? (
                                                <RaceCountdown
                                                    goal={planTileGoal}
                                                    className="h-full"
                                                    isIncompleteArchived={!activeGoal && !!incompleteGoal}
                                                    onSelectRace={(goal, activity, mode) => {
                                                        setRaceResultModal({
                                                            goal,
                                                            suggestedActivity: activity,
                                                            mode,
                                                        });
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center glass-card p-8 text-center relative">
                                                    <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                                        <Target className="w-8 h-8 text-accent-orange" />
                                                    </div>
                                                    <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                                    <p className="text-foreground-muted mb-6 text-sm">
                                                        You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                                    </p>
                                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                                        <button
                                                            onClick={() => router.push('/onboarding?step=4')}
                                                            className="btn-primary py-2 px-6"
                                                        >
                                                            Create Training Plan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                localStorage.setItem('runflow_hide_no_plan_prompt', 'true');
                                                                setHideNoPlanReminder(true);
                                                                window.dispatchEvent(new Event('runflow-plan-reminder-change'));
                                                            }}
                                                            className="px-4 py-2 rounded-md text-xs font-medium border border-line text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                                                        >
                                                            Hide Reminder
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-foreground-muted mt-3">
                                                        You can always create or reopen a plan from your Profile menu → Training Plan.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="lg:col-span-1 h-full flex flex-col">
                                        <TrainingStatusCard />
                                    </div>
                                </div>
                            );
                        })()}
```

#### Edit 3.6: Mirror Empty Workouts Hide & Dismissible `No Active Training Plan` Card in `Web/src/components/views/DashboardView.tsx`

Open `Web/src/components/views/DashboardView.tsx`.

**FIND:**
```tsx
import { useState } from 'react';
```

**REPLACE WITH:**
```tsx
import { useState, useEffect } from 'react';
```

#### Edit 3.7: Add `hideNoPlanReminder` State & Dynamic Grid Columns in `Web/src/components/views/DashboardView.tsx`

Open `Web/src/components/views/DashboardView.tsx`.

**FIND:**
```tsx
    const planTileGoal: Goal | null = activeGoal || incompleteGoal || null;

    return (
```

**REPLACE WITH:**
```tsx
    const planTileGoal: Goal | null = activeGoal || incompleteGoal || null;
    const [hideNoPlanReminder, setHideNoPlanReminder] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('runflow_hide_no_plan_prompt') === 'true';
    });

    useEffect(() => {
        const syncNoPlanPref = () => {
            setHideNoPlanReminder(localStorage.getItem('runflow_hide_no_plan_prompt') === 'true');
        };
        window.addEventListener('runflow-plan-reminder-change', syncNoPlanPref);
        window.addEventListener('storage', syncNoPlanPref);
        return () => {
            window.removeEventListener('runflow-plan-reminder-change', syncNoPlanPref);
            window.removeEventListener('storage', syncNoPlanPref);
        };
    }, []);

    return (
```

#### Edit 3.8: Update Grid in `Web/src/components/views/DashboardView.tsx` to Hide Empty `WorkoutScheduleCard` & Allow Dismissing `No Active Training Plan`

Open `Web/src/components/views/DashboardView.tsx`.

**FIND:**
```tsx
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        <div className="lg:col-span-1">
                            <WorkoutScheduleCard
                                weeklyWorkouts={weeklyWorkouts}
                                today={new Date().toDateString()}
                                onEditWorkout={(w) => onEditWorkout(w, false)}
                                onCompleteWorkout={(w) => onEditWorkout(w, true)}
                            />
                        </div>
                        <div className="lg:col-span-1">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center glass-card p-8 min-h-[300px]">
                                    <div className="w-8 h-8 rounded-full border-4 border-accent-orange border-t-transparent animate-spin mb-4"></div>
                                    <p className="text-foreground-muted text-sm">Loading plan...</p>
                                </div>
                            ) : activeGoal ? (
                                <RaceCountdown
                                    goal={activeGoal}
                                    className="h-full"
                                    onSelectRace={(goal, activity, mode) => {
                                        setRaceResultModal({
                                            goal,
                                            suggestedActivity: activity,
                                            mode,
                                        });
                                    }}
                                />
                            ) : planTileGoal ? (
                                <RaceCountdown
                                    goal={planTileGoal}
                                    className="h-full"
                                    isIncompleteArchived={!activeGoal && !!incompleteGoal}
                                    onSelectRace={(goal, activity, mode) => {
                                        setRaceResultModal({
                                            goal,
                                            suggestedActivity: activity,
                                            mode,
                                        });
                                    }}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center glass-card p-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                        <Target className="w-8 h-8 text-accent-orange" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                    <p className="text-foreground-muted mb-6 text-sm">
                                        You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                    </p>
                                    <button
                                        onClick={() => router.push('/onboarding?step=4')}
                                        className="btn-primary py-2 px-6"
                                    >
                                        Create Training Plan
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-1 h-full flex flex-col">
                            <TrainingStatusCard />
                        </div>
                    </div>
```

**REPLACE WITH:**
```tsx
                    {(() => {
                        const showWorkoutsCard = weeklyWorkouts.length > 0;
                        const showPlanCard = isLoading || Boolean(activeGoal) || Boolean(planTileGoal) || !hideNoPlanReminder;
                        const visibleCount = (showWorkoutsCard ? 1 : 0) + (showPlanCard ? 1 : 0) + 1;
                        const gridColsClass =
                            visibleCount === 3
                                ? 'md:grid-cols-2 lg:grid-cols-3'
                                : visibleCount === 2
                                ? 'md:grid-cols-2 lg:grid-cols-2'
                                : 'grid-cols-1';

                        return (
                            <div className={`grid grid-cols-1 ${gridColsClass} gap-6 items-stretch`}>
                                {showWorkoutsCard && (
                                    <div className="lg:col-span-1">
                                        <WorkoutScheduleCard
                                            weeklyWorkouts={weeklyWorkouts}
                                            today={new Date().toDateString()}
                                            onEditWorkout={(w) => onEditWorkout(w, false)}
                                            onCompleteWorkout={(w) => onEditWorkout(w, true)}
                                        />
                                    </div>
                                )}
                                {showPlanCard && (
                                    <div className="lg:col-span-1">
                                        {isLoading ? (
                                            <div className="h-full flex flex-col items-center justify-center glass-card p-8 min-h-[300px]">
                                                <div className="w-8 h-8 rounded-full border-4 border-accent-orange border-t-transparent animate-spin mb-4"></div>
                                                <p className="text-foreground-muted text-sm">Loading plan...</p>
                                            </div>
                                        ) : activeGoal ? (
                                            <RaceCountdown
                                                goal={activeGoal}
                                                className="h-full"
                                                onSelectRace={(goal, activity, mode) => {
                                                    setRaceResultModal({
                                                        goal,
                                                        suggestedActivity: activity,
                                                        mode,
                                                    });
                                                }}
                                            />
                                        ) : planTileGoal ? (
                                            <RaceCountdown
                                                goal={planTileGoal}
                                                className="h-full"
                                                isIncompleteArchived={!activeGoal && !!incompleteGoal}
                                                onSelectRace={(goal, activity, mode) => {
                                                    setRaceResultModal({
                                                        goal,
                                                        suggestedActivity: activity,
                                                        mode,
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center glass-card p-8 text-center">
                                                <div className="w-16 h-16 rounded-full bg-accent-orange/10 flex items-center justify-center mb-4">
                                                    <Target className="w-8 h-8 text-accent-orange" />
                                                </div>
                                                <h3 className="text-xl font-semibold text-foreground mb-2">No Active Training Plan</h3>
                                                <p className="text-foreground-muted mb-6 text-sm">
                                                    You don&apos;t have an active training plan yet. Create one when you&apos;re ready to start training!
                                                </p>
                                                <div className="flex flex-wrap items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => router.push('/onboarding?step=4')}
                                                        className="btn-primary py-2 px-6"
                                                    >
                                                        Create Training Plan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            localStorage.setItem('runflow_hide_no_plan_prompt', 'true');
                                                            setHideNoPlanReminder(true);
                                                            window.dispatchEvent(new Event('runflow-plan-reminder-change'));
                                                        }}
                                                        className="px-4 py-2 rounded-md text-xs font-medium border border-line text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                                                    >
                                                        Hide Reminder
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-foreground-muted mt-3">
                                                    You can always create or reopen a plan from your Profile menu → Training Plan.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="lg:col-span-1 h-full flex flex-col">
                                    <TrainingStatusCard />
                                </div>
                            </div>
                        );
                    })()}
```

#### Edit 3.9: Rename Menu Item to `Heart Rate & Power Zones` and Restore/Open Plan Builder When Clicking Profile Icon -> `Training Plan` in `Web/src/components/MinimalistPillsMenu.tsx`

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
        {
            id: 'hr-zones',
            label: 'Heart Rate Zones',
            subtitle: 'LTHR & 7 training zones',
            icon: Heart,
            iconColor: 'text-accent-pink',
            iconBg: 'bg-accent-pink/15',
            rightIcon: ChevronRight,
            subPage: 'hr-zones',
        },
```

**REPLACE WITH:**
```tsx
        {
            id: 'hr-zones',
            label: 'Heart Rate & Power Zones',
            subtitle: 'Running HR, Cycling FTP & 7 zones',
            icon: Heart,
            iconColor: 'text-accent-pink',
            iconBg: 'bg-accent-pink/15',
            rightIcon: ChevronRight,
            subPage: 'hr-zones',
        },
```

#### Edit 3.10: Auto-Restore Hidden `No Active Training Plan` Reminder When Opening `Training Plan` From Profile Menu (`Web/src/components/MinimalistPillsMenu.tsx`)

Open `Web/src/components/MinimalistPillsMenu.tsx`.

**FIND:**
```tsx
function TrainingPlanSubPage({ onBack }: { onBack: () => void }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(true);
    }, []);
```

**REPLACE WITH:**
```tsx
function TrainingPlanSubPage({ onBack }: { onBack: () => void }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        setIsOpen(true);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('runflow_hide_no_plan_prompt');
            window.dispatchEvent(new Event('runflow-plan-reminder-change'));
        }
    }, []);
```

#### Edit 3.11: Rename Section Header in `Web/src/components/setup/HeartRateZonesSection.tsx` to `Heart Rate & Power Zones`

Open `Web/src/components/setup/HeartRateZonesSection.tsx`.

**FIND:**
```tsx
                <h3 className="text-sm font-semibold text-foreground-muted">Heart Rate & Zone Settings</h3>
```

**REPLACE WITH:**
```tsx
                <h3 className="text-sm font-semibold text-foreground-muted">Heart Rate &amp; Power Zones</h3>
```

#### Verify Agent-MW-3:

```bash
cd Web && npx tsc --noEmit
```

### Agent-MW-4 Prompt (`cycling-vo2max-engine-and-metrics-ui`)

> **Role**: Cycling VO2max Physiological Engine & Multi-Sport Metrics Agent `cycling-vo2max-engine-and-metrics-ui` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/lib/metrics/power.ts`
> * `Web/src/lib/metrics/cyclingAnalytics.ts`
> * `Web/src/app/api/analytics/stats/route.ts`
> * `Web/src/components/providers/UserMetricsProvider.tsx`
> * `Web/src/components/dashboard/TrainingStatusCard.tsx`
> * `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`
> * `Web/src/app/analytics/page.tsx`
> * `Web/src/components/ActivityDetailsModal.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 22 exact `FIND` / `REPLACE WITH` edits in order:

#### Edit 4.1: Add `calculateCyclingVo2Max` and `classifyCyclingVo2Max` (ACSM / Storer / Hawley-Noakes Equation) to `Web/src/lib/metrics/power.ts`

Open `Web/src/lib/metrics/power.ts`.

**FIND:**
```ts
/**
 * Estimates cycling FTP from running VDOT.
 * Based on VO2max to cycling power relationship:
 * Power at VO2max (W/kg) ~ (VO2 - 7) / 10.8; FTP is ~75% of VO2max power.
 */
export function estimateBikeFtpFromVdot(vdot: number, weightKg: number = 70): number | null {
    if (!vdot || vdot <= 0 || weightKg <= 0) return null;
    const powerVo2PerKg = Math.max(0, (vdot - 7) / 10.8);
    const ftpPerKg = powerVo2PerKg * 0.75;
    return Math.round(ftpPerKg * weightKg);
}
```

**REPLACE WITH:**
```ts
/**
 * Estimates cycling FTP from running VDOT.
 * Based on VO2max to cycling power relationship:
 * Power at VO2max (W/kg) ~ (VO2 - 7) / 10.8; FTP is ~75% of VO2max power.
 */
export function estimateBikeFtpFromVdot(vdot: number, weightKg: number = 70): number | null {
    if (!vdot || vdot <= 0 || weightKg <= 0) return null;
    const powerVo2PerKg = Math.max(0, (vdot - 7) / 10.8);
    const ftpPerKg = powerVo2PerKg * 0.75;
    return Math.round(ftpPerKg * weightKg);
}

/**
 * Calculates Cycling VO2max (mL/kg/min) using the ACSM / Storer / Hawley-Noakes
 * metabolic equation for cycle ergometry:
 *   VO2max (mL/kg/min) = (10.8 * MAP_watts) / weightKg + 7
 *
 * Maximal Aerobic Power (MAP, ~5-minute peak power) is resolved using:
 * 1. Measured 5-minute (300s) peak power if >= FTP / 0.90.
 * 2. FTP-derived MAP = ftpWatts / 0.833 (since FTP is ~83.3% of 5-min MAP, i.e. MAP = 120% FTP, top of Coggan Z5).
 * 3. Single-ride submaximal HR + Power estimation (when rideWatts and avgHr >= 60% maxHr are provided).
 */
export function calculateCyclingVo2Max(params: {
    ftpWatts?: number | null;
    peak5MinWatts?: number | null;
    weightKg?: number | null;
    rideWatts?: number | null;
    avgHr?: number | null;
    maxHr?: number | null;
}): number | null {
    const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 75;
    const ftp = params.ftpWatts && params.ftpWatts > 0 ? params.ftpWatts : null;
    const peak5m = params.peak5MinWatts && params.peak5MinWatts > 0 ? params.peak5MinWatts : null;

    let mapWatts: number | null = null;
    if (peak5m && (!ftp || peak5m >= ftp * 1.05)) {
        mapWatts = peak5m;
    } else if (ftp) {
        mapWatts = ftp / 0.833;
    } else if (peak5m) {
        mapWatts = peak5m;
    } else if (params.rideWatts && params.rideWatts > 0) {
        if (params.avgHr && params.maxHr && params.maxHr > 0) {
            const hrRatio = params.avgHr / params.maxHr;
            if (hrRatio >= 0.60) {
                const pctVo2 = Math.min(1.0, Math.max(0.35, 1.45 * hrRatio - 0.45));
                const rideVo2 = (10.8 * params.rideWatts) / weight + 7;
                const est = rideVo2 / pctVo2;
                return Math.min(90, Math.max(20, Number(est.toFixed(1))));
            }
        }
        mapWatts = params.rideWatts / 0.833;
    }

    if (!mapWatts || mapWatts <= 0) return null;
    const vo2max = (10.8 * mapWatts) / weight + 7;
    return Math.min(90, Math.max(20, Number(vo2max.toFixed(1))));
}

export function classifyCyclingVo2Max(vo2max: number | null): string {
    if (!vo2max || vo2max <= 0) return 'Unrated';
    if (vo2max >= 70) return 'World Class / Pro';
    if (vo2max >= 60) return 'Competitive / Cat 1-2';
    if (vo2max >= 52) return 'Trained / Cat 3-4';
    if (vo2max >= 44) return 'Fitness / Sportive';
    return 'Developing';
}
```

#### Edit 4.2: Include `cyclingVo2max` in `CyclingAnalyticsData` Interface in `Web/src/lib/metrics/power.ts`

Open `Web/src/lib/metrics/power.ts`.

**FIND:**
```ts
export interface CyclingAnalyticsData {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: CogganPowerZone[];
    };
```

**REPLACE WITH:**
```ts
export interface CyclingAnalyticsData {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        cyclingVo2max?: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: CogganPowerZone[];
    };
```

#### Edit 4.3: Compute `cyclingVo2max` & Parse Fallback Title Watts in `Web/src/lib/metrics/cyclingAnalytics.ts`

Open `Web/src/lib/metrics/cyclingAnalytics.ts`.

**FIND:**
```ts
import {
    CogganPowerZone,
    STANDARD_POWER_DURATIONS,
    calculatePowerCurve,
    estimateFtpFromPowerCurve,
    calculateCogganPowerZones,
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
} from '@/lib/metrics/power';

export interface CyclingAnalyticsData {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: CogganPowerZone[];
    };
```

**REPLACE WITH:**
```ts
import {
    CogganPowerZone,
    STANDARD_POWER_DURATIONS,
    calculatePowerCurve,
    estimateFtpFromPowerCurve,
    calculateCogganPowerZones,
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
    calculateCyclingVo2Max,
} from '@/lib/metrics/power';

export interface CyclingAnalyticsData {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        cyclingVo2max: number | null;
        autoEstimateFtp: boolean;
        weightKg: number | null;
        wPerKg: number | null;
        zones: CogganPowerZone[];
    };
```

#### Edit 4.4: Extract Title Watts Fallback & Return `cyclingVo2max` in `getCyclingAnalytics` (`Web/src/lib/metrics/cyclingAnalytics.ts`)

Open `Web/src/lib/metrics/cyclingAnalytics.ts`.

**FIND:**
```ts
    for (const r of allRides) {
        const streams = parseStreams(r.streams);
        let eftp: number | null = null;

        if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
            const curve = calculatePowerCurve(streams.watts, streams.time);
            curve.forEach(pt => {
                const durIdx = STANDARD_POWER_DURATIONS.indexOf(pt.durationSec);
                if (durIdx !== -1 && pt.peakWatts > allTimePeakWatts[durIdx]) {
                    allTimePeakWatts[durIdx] = pt.peakWatts;
                }
            });
            eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts);
        } else {
            if (r.weightedAverageWatts || r.averageWatts) {
                eftp = estimateFtpFromPowerCurve([], r.weightedAverageWatts ?? r.averageWatts);
            }
            // No watts stream: estimate MMP points from summary watts so the
            // all-time curve is populated for rides without raw streams.
            applyEstimatedMmpPoints(allTimePeakWatts, r);
        }

        if (eftp && (allTimeEftp === null || eftp > allTimeEftp)) {
            allTimeEftp = eftp;
        }
    }
```

**REPLACE WITH:**
```ts
    for (const r of allRides) {
        const streams = parseStreams(r.streams);
        let eftp: number | null = null;
        const titleMatch = (r.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
        const parsedTitleW = titleMatch ? parseInt(titleMatch[1], 10) : null;
        const validTitleW = parsedTitleW && parsedTitleW >= 40 && parsedTitleW <= 1500 ? parsedTitleW : null;

        if (/\bftp\s*test\b/i.test(r.name || '') && validTitleW) {
            eftp = validTitleW;
        } else if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
            const curve = calculatePowerCurve(streams.watts, streams.time);
            curve.forEach(pt => {
                const durIdx = STANDARD_POWER_DURATIONS.indexOf(pt.durationSec);
                if (durIdx !== -1 && pt.peakWatts > allTimePeakWatts[durIdx]) {
                    allTimePeakWatts[durIdx] = pt.peakWatts;
                }
            });
            eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts ?? validTitleW);
        } else {
            const fallbackW = r.weightedAverageWatts ?? r.averageWatts ?? validTitleW;
            if (fallbackW) {
                eftp = estimateFtpFromPowerCurve([], fallbackW);
            }
            applyEstimatedMmpPoints(allTimePeakWatts, {
                ...r,
                averageWatts: r.averageWatts ?? validTitleW,
            });
        }

        if (eftp && (allTimeEftp === null || eftp > allTimeEftp)) {
            allTimeEftp = eftp;
        }
    }
```

#### Edit 4.5: Compute `cyclingVo2max` From `resolvedFtp`, 5-Min Peak Power, and `weightKg` in `Web/src/lib/metrics/cyclingAnalytics.ts`

Open `Web/src/lib/metrics/cyclingAnalytics.ts`.

**FIND:**
```ts
    // Resolve FTP
    const resolvedFtp = user?.ftpWatts ?? allTimeEftp ?? 200;
    const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
    const zones = calculateCogganPowerZones(resolvedFtp, weightKg);
```

**REPLACE WITH:**
```ts
    // Resolve FTP & Cycling VO2max
    const resolvedFtp = user?.ftpWatts ?? allTimeEftp ?? 200;
    const wPerKg = (resolvedFtp && weightKg) ? Number((resolvedFtp / weightKg).toFixed(2)) : null;
    const zones = calculateCogganPowerZones(resolvedFtp, weightKg);
    const dur300Idx = STANDARD_POWER_DURATIONS.indexOf(300);
    const peak5MinWatts = dur300Idx !== -1 ? Math.max(rangePeakWatts[dur300Idx] || 0, allTimePeakWatts[dur300Idx] || 0) : 0;
    const cyclingVo2max = (user?.ftpWatts || allTimeEftp || allRides.length > 0)
        ? calculateCyclingVo2Max({
              ftpWatts: resolvedFtp,
              peak5MinWatts: peak5MinWatts > 0 ? peak5MinWatts : null,
              weightKg,
          })
        : null;
```

#### Edit 4.6: Include `cyclingVo2max` in `getCyclingAnalytics` Return Value in `Web/src/lib/metrics/cyclingAnalytics.ts`

Open `Web/src/lib/metrics/cyclingAnalytics.ts`.

**FIND:**
```ts
    return {
        ftp: {
            ftpWatts: user?.ftpWatts ?? null,
            eFtpWatts: allTimeEftp,
            autoEstimateFtp: user?.autoEstimateFtp ?? true,
            weightKg,
            wPerKg,
            zones,
        },
```

**REPLACE WITH:**
```ts
    return {
        ftp: {
            ftpWatts: user?.ftpWatts ?? null,
            eFtpWatts: allTimeEftp,
            cyclingVo2max,
            autoEstimateFtp: user?.autoEstimateFtp ?? true,
            weightKg,
            wPerKg,
            zones,
        },
```

#### Edit 4.7: Compute and Return `cyclingVo2max` & `activeFtpWatts` in `/api/analytics/stats` (`Web/src/app/api/analytics/stats/route.ts`)

Open `Web/src/app/api/analytics/stats/route.ts`.

**FIND:**
```ts
import { AnalyticsService } from '@/lib/services/analytics';
import { computeCoreMetrics } from '@/lib/metrics/coreMetrics';
import { getActivityContribution } from '@/lib/metrics/fitness';
```

**REPLACE WITH:**
```ts
import { AnalyticsService } from '@/lib/services/analytics';
import { computeCoreMetrics } from '@/lib/metrics/coreMetrics';
import { getActivityContribution } from '@/lib/metrics/fitness';
import { calculateCyclingVo2Max } from '@/lib/metrics/power';
```

#### Edit 4.8: Select `ftpWatts`, `weight`, and Ride Watts to Calculate `cyclingVo2max` in `Web/src/app/api/analytics/stats/route.ts`

Open `Web/src/app/api/analytics/stats/route.ts`.

**FIND:**
```ts
        // 1. Fetch User Settings & Active Goal
        const [user, activeGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { hrMax: true, vdotCorrectionFactor: true, effectiveVo2maxCorrectionFactor: true, matchToMyWhoosh: true, includeCrossTraining: true, vdotReferenceRaceDate: true, autoRevolvingVo2max: true }
            }),
            prisma.goal.findFirst({
                where: { userId, isActive: true },
            })
        ]);
```

**REPLACE WITH:**
```ts
        // 1. Fetch User Settings & Active Goal
        const [user, activeGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { hrMax: true, weight: true, ftpWatts: true, vdotCorrectionFactor: true, effectiveVo2maxCorrectionFactor: true, matchToMyWhoosh: true, includeCrossTraining: true, vdotReferenceRaceDate: true, autoRevolvingVo2max: true }
            }),
            prisma.goal.findFirst({
                where: { userId, isActive: true },
            })
        ]);
```

#### Edit 4.9: Include Ride Name & Watts in Activity Query and Return `cyclingVo2max` in `Web/src/app/api/analytics/stats/route.ts`

Open `Web/src/app/api/analytics/stats/route.ts`.

**FIND:**
```ts
            select: {
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true, // M-01: Include stored TRIMP for fitness calculations
                averageHr: true,
                hasHeartrate: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            },
```

**REPLACE WITH:**
```ts
            select: {
                name: true,
                type: true,
                startDate: true,
                distance: true,
                movingTime: true,
                trimp: true, // M-01: Include stored TRIMP for fitness calculations
                averageHr: true,
                hasHeartrate: true,
                averageWatts: true,
                weightedAverageWatts: true,
                npWatts: true,
                hrZone1Time: true,
                hrZone2Time: true,
                hrZone3Time: true,
                hrZone4Time: true,
                hrZone5Time: true,
                hrZone6Time: true,
                hrZone7Time: true,
            },
```

#### Edit 4.10: Compute `cyclingVo2max` From User FTP or Best Ride Watts in `Web/src/app/api/analytics/stats/route.ts`

Open `Web/src/app/api/analytics/stats/route.ts`.

**FIND:**
```ts
        return cachedResponse({
            currentWeekMileage,
            vdot,
            effectiveVO2max,
            rawVO2max,
```

**REPLACE WITH:**
```ts
        let bestRideFtp = user?.ftpWatts ?? null;
        for (const ca of crossTrainingActivities) {
            if (ca.type === 'RIDE' || ca.type === 'VIRTUAL_RIDE') {
                const titleMatch = ((ca as any).name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
                const titleW = titleMatch ? parseInt(titleMatch[1], 10) : null;
                const validTitleW = titleW && titleW >= 40 && titleW <= 1500 ? titleW : null;
                const rideSustained = (ca as any).npWatts ?? (ca as any).weightedAverageWatts ?? (ca as any).averageWatts ?? validTitleW;
                if (rideSustained && rideSustained > 0) {
                    const estFtp = /\bftp\s*test\b/i.test((ca as any).name || '') && validTitleW
                        ? validTitleW
                        : Math.round(rideSustained * 0.95);
                    if (!bestRideFtp || estFtp > bestRideFtp) {
                        bestRideFtp = estFtp;
                    }
                }
            }
        }
        const cyclingVo2max = bestRideFtp
            ? calculateCyclingVo2Max({ ftpWatts: bestRideFtp, weightKg: user?.weight ?? 75 })
            : null;

        return cachedResponse({
            currentWeekMileage,
            vdot,
            effectiveVO2max,
            rawVO2max,
            cyclingVo2max,
            activeFtpWatts: bestRideFtp,
```

#### Edit 4.11: Expose `cyclingVo2max` and `activeFtpWatts` in `Web/src/components/providers/UserMetricsProvider.tsx`

Open `Web/src/components/providers/UserMetricsProvider.tsx`.

**FIND:**
```tsx
    aerobicVo2max: number;
    correctionFactor: number;
```

**REPLACE WITH:**
```tsx
    aerobicVo2max: number;
    cyclingVo2max: number;
    activeFtpWatts: number;
    correctionFactor: number;
```

#### Edit 4.12: Populate `cyclingVo2max` and `activeFtpWatts` in `UserMetricsProvider` Value (`Web/src/components/providers/UserMetricsProvider.tsx`)

Open `Web/src/components/providers/UserMetricsProvider.tsx`.

**FIND:**
```tsx
        vdot: stats?.vdot || 0,
        aerobicVo2max: stats?.effectiveVO2max || 0,
        correctionFactor: stats?.vdotCorrectionFactor || 1.0,
```

**REPLACE WITH:**
```tsx
        vdot: stats?.vdot || 0,
        aerobicVo2max: stats?.effectiveVO2max || 0,
        cyclingVo2max: stats?.cyclingVo2max || 0,
        activeFtpWatts: stats?.activeFtpWatts || 0,
        correctionFactor: stats?.vdotCorrectionFactor || 1.0,
```

#### Edit 4.13: Display Both Running VO2max (with VDOT Reference) and Cycling VO2max on Dashboard `Web/src/components/dashboard/TrainingStatusCard.tsx`

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
    const {
        marathonShape,
        aerobicVo2max,
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
```

**REPLACE WITH:**
```tsx
    const {
        marathonShape,
        vdot,
        aerobicVo2max,
        cyclingVo2max,
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
```

#### Edit 4.14: Render Cycling VO2max Badge Alongside Running VO2max & VDOT in `Web/src/components/dashboard/TrainingStatusCard.tsx`

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
    // Check for empty data
    const hasData = ctl > 0 || atl > 0 || aerobicVo2max > 0;
```

**REPLACE WITH:**
```tsx
    // Check for empty data
    const hasData = ctl > 0 || atl > 0 || aerobicVo2max > 0 || cyclingVo2max > 0;
```

#### Edit 4.15: Show Running VO2max, VDOT, and Cycling VO2max in `TrainingStatusCard.tsx` Top Metrics Grid

Open `Web/src/components/dashboard/TrainingStatusCard.tsx`.

**FIND:**
```tsx
                {/* Aerobic Fitness (VO2max) — HR-based trend indicator */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-foreground-muted font-semibold leading-tight">Aerobic Fitness (VO2max)</p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : '-'}
                            </p>
                            {correctionFactor !== 1.0 && (
                                <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                    {correctionFactor.toFixed(1)}x
                                </span>
                            )}
                        </div>
                    </div>
                </div>
```

**REPLACE WITH:**
```tsx
                {/* Aerobic Fitness (VO2max) — Running HR-based + Cycling Power-based */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-cyan/15 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground-muted font-semibold leading-tight">Aerobic Fitness (VO2max)</p>
                        <div className="flex items-baseline justify-between gap-1">
                            <p className="text-2xl font-mono tabular-nums font-semibold text-foreground leading-tight">
                                {aerobicVo2max > 0 ? aerobicVo2max.toFixed(1) : cyclingVo2max > 0 ? cyclingVo2max.toFixed(1) : '-'}
                            </p>
                            {correctionFactor !== 1.0 && (
                                <span className="text-xs font-mono tabular-nums text-accent-cyan font-semibold bg-accent-cyan/10 px-1 py-0.5 rounded leading-none shrink-0 border border-accent-cyan/20">
                                    {correctionFactor.toFixed(1)}x
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] font-mono text-foreground-muted">
                            {vdot > 0 && <span>Run VDOT: {vdot.toFixed(1)}</span>}
                            {cyclingVo2max > 0 && (
                                <span className="text-accent-orange font-semibold">
                                    {vdot > 0 ? '· ' : ''}Bike VO2: {cyclingVo2max.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
```

#### Edit 4.16: Add `Cycling VO2max` KPI Card to `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`

Open `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`.

**FIND:**
```tsx
interface CyclingApiResponse {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        autoEstimateFtp: boolean;
```

**REPLACE WITH:**
```tsx
interface CyclingApiResponse {
    ftp: {
        ftpWatts: number | null;
        eFtpWatts: number | null;
        cyclingVo2max?: number | null;
        autoEstimateFtp: boolean;
```

#### Edit 4.17: Display `Cycling VO2max` (`mL/kg/min`) in the Hero KPI Strip of `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`

Open `Web/src/components/Analytics/CyclingAnalyticsSection.tsx`.

**FIND:**
```tsx
                {/* eFTP Badge */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-accent-purple" /> Estimated FTP
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                                {data.ftp.eFtpWatts ? `${data.ftp.eFtpWatts}` : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">W</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5">
                            {data.ftp.eFtpWatts
                                ? '95% of 20m peak or 5m curve'
                                : 'Needs 5m+ hard effort'}
                        </div>
                    </div>
                </div>
```

**REPLACE WITH:**
```tsx
                {/* Cycling VO2max & eFTP Card */}
                <div className="glass-card p-4 flex flex-col justify-between">
                    <div className="text-xs text-foreground-muted mb-1 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-accent-purple" /> Cycling VO2max
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-mono font-bold text-accent-purple tabular-nums">
                                {data.ftp.cyclingVo2max ? data.ftp.cyclingVo2max.toFixed(1) : '-'}
                            </span>
                            <span className="text-xs text-foreground-muted font-medium">mL/kg/min</span>
                        </div>
                        <div className="text-xs text-foreground-muted mt-0.5 flex items-center justify-between">
                            <span>eFTP: {data.ftp.eFtpWatts ? `${data.ftp.eFtpWatts} W` : '-'}</span>
                            <span className="text-[10px] text-accent-purple/90 font-mono">ACSM MAP</span>
                        </div>
                    </div>
                </div>
```

#### Edit 4.18: Add `Cycling VO2max` to Cycling Highlights on Combined Analytics (`Web/src/app/analytics/page.tsx`)

Open `Web/src/app/analytics/page.tsx`.

**FIND:**
```tsx
                                    {/* Cycling Highlights */}
                                    <div className="glass-card p-6 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-accent-orange" />
                                                    <h3 className="font-semibold text-foreground text-base">Cycling Highlights</h3>
                                                </div>
                                                <span className="text-xs font-mono bg-accent-orange/15 text-accent-orange px-2 py-0.5 rounded-full font-medium">
                                                    FTP {cyclingData?.ftp?.ftpWatts ?? cyclingData?.ftp?.eFtpWatts ?? '-'} W
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                                <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                                    <span className="text-foreground-muted block mb-1">Period Bike TSS</span>
                                                    <span className="text-lg font-mono font-bold text-foreground">
                                                        {cyclingData?.summary?.totalBikeTss ? cyclingData.summary.totalBikeTss.toLocaleString() : '0'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                                    <span className="text-foreground-muted block mb-1">Aerobic EF</span>
                                                    <span className="text-lg font-mono font-bold text-foreground">
                                                        {cyclingData?.summary?.avgEfficiencyFactor ? `${cyclingData.summary.avgEfficiencyFactor.toFixed(2)}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
```

**REPLACE WITH:**
```tsx
                                    {/* Cycling Highlights */}
                                    <div className="glass-card p-6 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-accent-orange" />
                                                    <h3 className="font-semibold text-foreground text-base">Cycling Highlights</h3>
                                                </div>
                                                <span className="text-xs font-mono bg-accent-orange/15 text-accent-orange px-2 py-0.5 rounded-full font-medium">
                                                    FTP {cyclingData?.ftp?.ftpWatts ?? cyclingData?.ftp?.eFtpWatts ?? '-'} W
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs">
                                                <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                                    <span className="text-foreground-muted block mb-1">Cycling VO2max</span>
                                                    <span className="text-lg font-mono font-bold text-accent-purple">
                                                        {cyclingData?.ftp?.cyclingVo2max ? cyclingData.ftp.cyclingVo2max.toFixed(1) : '-'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                                    <span className="text-foreground-muted block mb-1">Period Bike TSS</span>
                                                    <span className="text-lg font-mono font-bold text-foreground">
                                                        {cyclingData?.summary?.totalBikeTss ? cyclingData.summary.totalBikeTss.toLocaleString() : '0'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-background-tertiary rounded-lg border border-line">
                                                    <span className="text-foreground-muted block mb-1">Aerobic EF</span>
                                                    <span className="text-lg font-mono font-bold text-foreground">
                                                        {cyclingData?.summary?.avgEfficiencyFactor ? `${cyclingData.summary.avgEfficiencyFactor.toFixed(2)}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
```

#### Edit 4.19: Compute and Display Per-Ride `Cycling VO2max` in `Web/src/components/ActivityDetailsModal.tsx`

Open `Web/src/components/ActivityDetailsModal.tsx`.

**FIND:**
```tsx
import {
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
    calculateCogganPowerZones,
} from '@/lib/metrics/power';
```

**REPLACE WITH:**
```tsx
import {
    calculateNormalizedPower,
    calculateIntensityFactor,
    calculateVariabilityIndex,
    calculateBikeTss,
    calculateEfficiencyFactor,
    calculateAerobicDecoupling,
    calculatePowerZoneTimes,
    calculateCogganPowerZones,
    calculateCyclingVo2Max,
} from '@/lib/metrics/power';
```

#### Edit 4.20: Add `cyclingVo2max` to `powerMetrics` in `Web/src/components/ActivityDetailsModal.tsx`

Open `Web/src/components/ActivityDetailsModal.tsx`.

**FIND:**
```tsx
        const athleteWeight = cyclingSettings?.weightKg || null;
        const wPerKg: number | null = (avgWatts && athleteWeight && athleteWeight > 0) ? Number((avgWatts / athleteWeight).toFixed(2)) : null;
        const cogganDefinitions = calculateCogganPowerZones(ftp, athleteWeight);
```

**REPLACE WITH:**
```tsx
        const athleteWeight = cyclingSettings?.weightKg || null;
        const wPerKg: number | null = (avgWatts && athleteWeight && athleteWeight > 0) ? Number((avgWatts / athleteWeight).toFixed(2)) : null;
        const cogganDefinitions = calculateCogganPowerZones(ftp, athleteWeight);
        const cyclingVo2max = calculateCyclingVo2Max({
            ftpWatts: ftp,
            rideWatts: npWatts ?? avgWatts,
            weightKg: athleteWeight,
            avgHr: activity.averageHr || det?.averageHr,
            maxHr: userHrMax || activity.maxHr,
        });
```

#### Edit 4.21: Return `cyclingVo2max` From `powerMetrics` & Render It in `ActivityDetailsModal.tsx` Training Load Section

Open `Web/src/components/ActivityDetailsModal.tsx`.

**FIND:**
```tsx
            wPerKg,
            cogganZones,
            totalPowerZoneSec,
            activePowerZones,
        };
    }, [activity, detailedActivity, cyclingSettings, name]);
```

**REPLACE WITH:**
```tsx
            wPerKg,
            cyclingVo2max,
            cogganZones,
            totalPowerZoneSec,
            activePowerZones,
        };
    }, [activity, detailedActivity, cyclingSettings, name, userHrMax]);
```

#### Edit 4.22: Display `Cycling VO2max` Below Normalized Power in `Web/src/components/ActivityDetailsModal.tsx`

Open `Web/src/components/ActivityDetailsModal.tsx`.

**FIND:**
```tsx
                            ) : isRide ? (
                                <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                                    <span className="text-foreground-muted">Normalized Power</span>
                                    <span className="text-accent-orange font-medium font-mono tabular-nums">
                                        {powerMetrics?.npWatts ? `${powerMetrics.npWatts} W` : '-'}
                                    </span>
                                </div>
                            ) : null}
```

**REPLACE WITH:**
```tsx
                            ) : isRide ? (
                                <>
                                    <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
                                        <span className="text-foreground-muted">Normalized Power</span>
                                        <span className="text-accent-orange font-medium font-mono tabular-nums">
                                            {powerMetrics?.npWatts ? `${powerMetrics.npWatts} W` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-foreground-muted">Cycling VO2max</span>
                                        <span className="text-accent-purple font-medium font-mono tabular-nums">
                                            {powerMetrics?.cyclingVo2max ? `${powerMetrics.cyclingVo2max.toFixed(1)} mL/kg/min` : '-'}
                                        </span>
                                    </div>
                                </>
                            ) : null}
```

#### Verify Agent-MW-4:

```bash
cd Web && npx tsc --noEmit && npm test
```

## 3. Final Coordinator Verification Gate

After **Agent-MW-1**, **Agent-MW-2**, **Agent-MW-3**, and **Agent-MW-4** complete, run:

```bash
cd Web && npx tsc --noEmit && npm test
```
