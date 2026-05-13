# Advanced Plan Builder - Implementation Plan

## Overview

A **web-only**, premium-tier plan builder that lives alongside the existing plan page at `/plan-advanced`. It provides a sophisticated, coach-level interface for creating and editing training plans with mass edits, progressive intervals, AI analysis, CSV import/export, and a continuous calendar view.

**Access**: Premium tier only (tier2/tier3 users)  
**Location**: `Web/src/app/plan-advanced/`  
**Route**: `/plan-advanced` and `/plan-advanced/[goalId]`

---

## Phase 0: Database Schema Changes

### Enum Changes (Prisma Schema)

#### Expand `RaceType` — Support all distances, ultra, and triathlon

**Current** (`Web/prisma/schema.prisma:860`):
```
enum RaceType {
  FIVE_K
  TEN_K
  HALF_MARATHON
  MARATHON
}
```

**New:**
```
enum RaceType {
  // Standard running
  FIVE_K
  TEN_K
  HALF_MARATHON
  MARATHON
  // Ultra running
  FIFTY_K
  FIFTY_MILE
  HUNDRED_K
  HUNDRED_MILE
  TWELVE_HOUR
  TWENTY_FOUR_HOUR
  BACKYARD_ULTRA         // Last runner standing format
  CUSTOM_DISTANCE        // Any user-defined distance
  // Triathlon
  SPRINT_TRI             // 750m swim / 20km bike / 5km run
  OLYMPIC_TRI            // 1.5km swim / 40km bike / 10km run
  HALF_IRONMAN           // 1.9km swim / 90km bike / 21.1km run
  FULL_IRONMAN           // 3.8km swim / 180km bike / 42.2km run
  CUSTOM_TRI             // User-defined triathlon distances
}
```

#### Expand `WorkoutType` — Add triathlon-specific workouts

```
enum WorkoutType {
  // Existing
  EASY
  LONG_RUN
  TEMPO
  INTERVALS
  FARTLEK
  REPETITIONS
  RECOVERY
  RACE
  REST
  CROSS_TRAIN
  RIDE
  SWIM
  STRENGTH
  OTHER
  // New for advanced plan builder
  BRICK                  // Bike-to-run transition workout (triathlon)
  OPEN_WATER_SWIM        // Open water specific swim session
  LONG_RIDE              // Long endurance ride (triathlon/cycling)
  RIDE_INTERVALS         // Structured bike intervals
  SWIM_DRILL             // Technique-focused swim
  TRANSITION_PRACTICE    // T1/T2 transition practice
  DOUBLE_DAY             // Two-a-day marker (AM/PM sessions, stored as separate Workout rows linked by groupId)
}
```

#### New enum `PlanSport`

```
enum PlanSport {
  RUN
  TRIATHLON
}
```

#### New enum `PlanCreationMode`

```
enum PlanCreationMode {
  EXPERT_MANUAL          // Fully manual, no guidance
  GUIDED                 // Step-by-step wizard with AI feedback
  AI_ASSISTED            // AI proposes full plan, user refines
  STANDARD_BUILDER       // Existing auto-generate from PlanConfig
  CSV_IMPORT             // Imported from CSV file
}
```

#### Expand `PlanPhase` — Add ultra/triathlon/multi-goal phases

**Current** (`Web/prisma/schema.prisma:884`):
```
enum PlanPhase {
  BASE
  BUILD
  PEAK
  TAPER
  RACE_WEEK
  RECOVERY
}
```

**New:**
```
enum PlanPhase {
  // Existing
  BASE
  BUILD
  PEAK
  TAPER
  RACE_WEEK
  RECOVERY
  // New for advanced plan builder
  ENDURANCE              // Ultra: extended endurance block between BUILD and PEAK
  MENTAL_PREP            // Backyard ultra: mental conditioning (night runs, fatigue adaptation)
  TUNE_UP                // Multi-goal: mini-taper block for sub-goal events
  MAINTAIN               // No-race plans: steady-state maintenance after build
}
```

### Schema Changes to `Goal` Model

Add these fields to the existing `Goal` model:

> **Breaking change for no-race mode:** The existing `raceType  RaceType` field must become `raceType  RaceType?` (nullable). The existing `raceDate  DateTime` field must become `raceDate  DateTime?` (nullable). All existing code that reads `raceType` or `raceDate` must handle null. For standard plans, these are always populated. For no-race/general-fitness plans, they are null.

```
sport              PlanSport           @default(RUN)
creationMode       PlanCreationMode    @default(STANDARD_BUILDER)
customDistanceM    Float?              // For CUSTOM_DISTANCE race type
customSwimDistM    Float?              // For CUSTOM_TRI
customBikeDistM    Float?              // For CUSTOM_TRI
customRunDistM     Float?              // For CUSTOM_TRI
backyardLoopDistM  Float?              // For BACKYARD_ULTRA (default 6706m = 4.167 miles)
backyardLoopTimeS  Int?                // Time per loop in seconds (default 3600 applied at app level for backyard ultra only)
targetLaps         Int?                // For backyard ultra: how many loops is the goal
planSource         String              @default("standard")  // "standard" | "advanced" | "csv_import"
guidanceLevel      String              @default("none")  // "none" | "light" | "full"

// Multi-goal support
parentGoalId       String?             // Null for main goals, points to parent for sub-goals
priority           GoalPriority        @default(PRIMARY)  // Priority relative to siblings
trainingFocus      String?             // What this goal's training focuses on: "endurance" | "speed" | "tri_build" | etc.
parentGoal         Goal?               @relation("GoalHierarchy", fields: [parentGoalId], references: [id])
subGoals           Goal[]              @relation("GoalHierarchy")
```

### New enum `GoalPriority`

```
enum GoalPriority {
  PRIMARY             // The A-race, the main goal everything is built around
  SECONDARY           // Important tune-up race, affects periodization
  TUNE_UP             // Training race / tune-up, minimal taper
  MILESTONE           // Fitness checkpoint (e.g., "run 20km continuous by week 8")
}
```

### Multi-Goal Architecture

A single advanced plan can contain **one primary goal** and **multiple sub-goals**. All share the same timeline and workout pool.

**Example**: Half marathon (October, tune-up) + Full Ironman (December, primary)

```
Goal (PRIMARY):  Full Ironman — December 15, 2026
├── SubGoal (SECONDARY): Half Marathon — October 12, 2026
├── SubGoal (TUNE_UP): Olympic Tri — September 7, 2026
└── SubGoal (MILESTONE): Complete 100km week — Week 14
```

**Rules:**
- Only ONE primary goal per plan
- Sub-goals inherit `userId`, `sport` can differ from parent (e.g., running tune-up inside triathlon plan)
- Workouts are linked to the overall plan (parent goal) but can be `tagged` with a subGoalId to indicate which event they serve
- Periodization is computed for the PRIMARY goal, then adjusted for sub-goals
- Sub-goals can have their own mini-taper (3-5 days for tune-up, 1-2 weeks for secondary)
- The timeline shows ALL events as markers, with the primary goal's periodization as the backbone

**Workout tagging** — add field to `Workout`:
```
subGoalId           String?             // Which sub-goal this workout primarily serves (null = general plan)
subGoal             Goal?               @relation("WorkoutSubGoal", fields: [subGoalId], references: [id])
```

**How multi-goal periodization works:**

The primary goal defines the macro cycle. Sub-goals create "focus shifts" within it:

```
Week  1-8:  BASE        → Focus: General aerobic build (serves Ironman)
Week  9-12: BUILD_A     → Focus: Run volume + tri base (serves Ironman)
Week 13:    TUNE-UP     → Mini-taper for Olympic Tri (Sep 7) [SECONDARY]
Week 14:    RECOVERY    → Recovery from Olympic Tri
Week 15-18: BUILD_B     → Focus: Bike volume increase (serves Ironman)
Week 19-22: PEAK_RUN    → Focus: Half marathon specific (Oct 12) [SECONDARY]
Week 23:    TUNE-UP     → Mini-taper for Half Marathon [SECONDARY]
Week 24:    RECOVERY    → Recovery from Half Marathon
Week 25-28: PEAK_TRI    → Focus: Full Ironman specific work
Week 29-30: TAPER       → Ironman taper
Week 31:    RACE_WEEK   → Ironman (Dec 15) [PRIMARY]
```

The periodization engine calculates:
1. Macro cycle for PRIMARY goal (standard BASE → BUILD → PEAK → TAPER → RACE)
2. For each sub-goal, inserts a "focus block" centered on its race date
3. Focus blocks include: pre-race mini-taper + race week + post-race recovery
4. Focus blocks for SECONDARY goals are 2-3 weeks (1 week mini-taper + race week + 1 week recovery)
5. Focus blocks for TUNE_UP goals are 1-2 weeks (3-5 day mini-taper + race + 3-5 day recovery)
6. MILESTONE goals don't create focus blocks, they just appear as markers on the timeline
7. Between focus blocks, training resumes toward the PRIMARY goal's phase

**Volume handling during sub-goal focus blocks:**
- SECONDARY race week: volume drops to 60-70% of normal (mini-taper)
- TUNE_UP race week: volume drops to 75-85% of normal
- Post-race recovery week: volume drops to 50-60% of normal
- These drops are accounted for in the PRIMARY goal's volume trajectory (the engine doesn't "make up" the lost volume)

### New Model `GuidedPlanSession` — Tracks guided/AI-assisted creation flow

```
model GuidedPlanSession {
  id              String   @id @default(cuid())
  goalId          String?    // Null until plan is created
  userId          String
  currentStep     String     // "sport" | "distance" | "experience" | "schedule" | "preferences" | "review"
  responses       Json       // All user responses so far
  aiRecommendation Json?     // AI-generated recommendation based on responses
  isComplete      Boolean    @default(false)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  goal            Goal?      @relation(fields: [goalId], references: [id])
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([goalId])
}
```

### New Models (add to `Web/prisma/schema.prisma`)

#### 1. `PlanSnapshot` — Undo/Version History

```
model PlanSnapshot {
  id          String   @id @default(cuid())
  goalId      String
  snapshot    Json       // Full serialized state of all workouts at this point
  description String?    // e.g. "Mass edit: scaled volume by 10%"
  operation   String?    // e.g. "MASS_SCALE", "BULK_DELETE", "AI_GENERATE"
  createdAt   DateTime   @default(now())
  goal        Goal       @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId, createdAt])
}
```

- Auto-saved before every mutation (mass edit, AI generation, bulk operation)
- Undo restores from the most recent snapshot
- Limit: keep last 50 snapshots per goal, prune older ones via cron

#### 2. `WeekTemplate` — Reusable Weekly Templates

```
model WeekTemplate {
  id          String   @id @default(cuid())
  userId      String
  name        String     // e.g. "Recovery Week", "5K Build Week A"
  description String?
  days        Json       // Array of 7 days, each with workout configs
  isDefault   Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- `days` structure:
```json
[
  {
    "dayIndex": 0,
    "workoutType": "REST",
    "targetDistance": null,
    "targetDuration": null,
    "targetPace": null
  },
  {
    "dayIndex": 1,
    "workoutType": "EASY",
    "targetDistance": 8000,
    "targetPace": null
  }
  // ... 7 entries
]
```

#### 3. `IntervalProgression` — Progressive Interval Schemes

```
model IntervalProgression {
  id          String   @id @default(cuid())
  goalId      String
  name        String     // e.g. "5K Interval Build"
  workoutType WorkoutType  // INTERVALS, REPETITIONS, FARTLEK, TEMPO
  startWeek   Int         // Week index (1-based)
  endWeek     Int         // Week index
  weeks       Json        // Array of per-week interval configs
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  goal        Goal        @relation(fields: [goalId], references: [id], onDelete: Cascade)
  workouts    Workout[]   // Reverse relation for Workout.intervalProgressionId

  @@index([goalId])
}
```

- `weeks` structure:
```json
[
  {
    "weekIndex": 1,
    "warmup": { "distance": 2000, "pace": "E" },
    "main": [
      { "reps": 4, "distance": 400, "pace": "R", "restSeconds": 90 }
    ],
    "cooldown": { "distance": 2000, "pace": "E" },
    "totalDistance": 7600
  },
  {
    "weekIndex": 2,
    "warmup": { "distance": 2000, "pace": "E" },
    "main": [
      { "reps": 6, "distance": 400, "pace": "R", "restSeconds": 90 }
    ],
    "cooldown": { "distance": 2000, "pace": "E" },
    "totalDistance": 8400
  }
]
```

#### 4. `AiPlanAnalysis` — AI Analysis Results

```
model AiPlanAnalysis {
  id                  String   @id @default(cuid())
  goalId              String     @unique
  overallScore        Float?     // 0-100 quality score
  overallSummary      String?    @db.Text
  weekAnalyses        Json?      // Array of per-week analysis objects
  riskFlags           Json?      // Array of risk flag objects
  raceReadiness       Json?      // Race readiness prediction
  suggestions         Json?      // Array of suggested modifications
  modelUsed           String?    // e.g. "gpt-4o", "claude-opus-4"
  inputTokens         Int        @default(0)
  outputTokens        Int        @default(0)
  generatedAt         DateTime   @default(now())
  goal                Goal       @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId])
}
```

#### 5. Plan Builder AI — Reuse Existing `AiProvider` Infrastructure

**Decision:** No separate `PlanAiConfig` model. Instead, reuse the existing `GlobalAiSettings` + `AiProvider` system.

**Add to `GlobalAiSettings`:**
```
planBuilderProviderId     String?   // Which AiProvider to use for plan builder AI features
planBuilderModel          String    @default("gpt-4o")  // Model for plan analysis/generation
planMaxTokensPerAnalysis  Int       @default(8000)
planBuilderProvider       AiProvider? @relation("PlanBuilderProvider", fields: [planBuilderProviderId], references: [id])
```

**Add to `AiProvider`:**
```
planBuilderInSettings     GlobalAiSettings[] @relation("PlanBuilderProvider")
```

- Uses the same API key, base URL, and token tracking as existing AI chat
- Admin selects which provider to use for plan builder in the existing AI config tab
- Token usage for plan builder is tracked per-provider via existing `AiDailyTokenUsage`
- Per-analysis limit (`planMaxTokensPerAnalysis`) prevents runaway token usage

#### 6. `PlanPaceProfile` — Adapting Paces & HR Zones

```
model PlanPaceProfile {
  id          String   @id @default(cuid())
  goalId      String     @unique
  baseVdot    Float      // Starting VDOT
  profiles    Json       // Array of phase-based pace/HR configs
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  goal        Goal       @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId])
}
```

- `profiles` structure (paces that adapt as fitness improves):
```json
[
  {
    "phase": "BASE",
    "weekStart": 1,
    "weekEnd": 4,
    "vdotAdjustment": 0,
    "easyPaceRange": [360, 390],      // sec/km
    "tempoPaceRange": [320, 340],
    "intervalPaceRange": [290, 310],
    "repetitionPaceRange": [270, 285],
    "longRunPaceRange": [370, 410],
    "hrZoneOverrides": null            // null = use user defaults
  },
  {
    "phase": "BUILD",
    "weekStart": 5,
    "weekEnd": 8,
    "vdotAdjustment": 0.5,            // VDOT increases by 0.5
    "easyPaceRange": [355, 385],
    "tempoPaceRange": [315, 335],
    "intervalPaceRange": [285, 305],
    "repetitionPaceRange": [265, 280],
    "longRunPaceRange": [365, 405],
    "hrZoneOverrides": null
  }
]
```

### Schema Modifications to Existing Models

**Goal** — add relations:
```
snapshots             PlanSnapshot[]
intervalProgressions  IntervalProgression[]
aiAnalysis            AiPlanAnalysis?
paceProfile           PlanPaceProfile?
taggedWorkouts        Workout[]       @relation("WorkoutSubGoal")  // Reverse relation for Workout.subGoalId
guidedPlanSessions    GuidedPlanSession[]
```

> Note: `planSource` is defined in the "Schema Changes to Goal Model" section above. Do not duplicate.
> Note: `WeekTemplate` is user-scoped (not goal-scoped), so the relation is on User only.

**User** — add relations:
```
weekTemplates         WeekTemplate[]
guidedPlanSessions    GuidedPlanSession[]
```

**Workout** — add fields:
```
customName            String?       // User-overridden workout name
color                 String?       // Custom color override
intervalProgressionId String?
intervalProgression   IntervalProgression? @relation(fields: [intervalProgressionId], references: [id])
structuredSteps       Json?         // Structured workout steps (warmup/intervals/cooldown)
groupId               String?       // Links DOUBLE_DAY AM/PM sessions (shared UUID between paired workouts)
```

**DOUBLE_DAY implementation note:** A two-a-day is stored as **two separate Workout rows** sharing the same `groupId`. This allows each session to be independently linked to different activities (e.g., AM swim + PM run), tracked for completion, and typed correctly. The `DOUBLE_DAY` WorkoutType is used only as a display marker; the individual sessions use their actual types (EASY, SWIM, etc.).

---

## Phase 0.5: Multi-Sport & Race Type Support

### Running: Standard Distances (existing)

| RaceType | Distance | Default Plan Weeks | Key Phases |
|----------|----------|--------------------|------------|
| FIVE_K | 5,000m | 8-12 | BASE → BUILD → PEAK → TAPER |
| TEN_K | 10,000m | 8-12 | BASE → BUILD → PEAK → TAPER |
| HALF_MARATHON | 21,097m | 12-16 | BASE → BUILD → PEAK → TAPER |
| MARATHON | 42,195m | 16-20 | BASE → BUILD → PEAK → TAPER |

### Running: Ultra Distances (new)

| RaceType | Distance | Default Plan Weeks | Key Phases |
|----------|----------|--------------------|------------|
| FIFTY_K | 50,000m | 16-20 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| FIFTY_MILE | 80,467m | 20-24 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| HUNDRED_K | 100,000m | 20-24 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| HUNDRED_MILE | 160,934m | 24-30 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| TWELVE_HOUR | Timed | 16-24 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| TWENTY_FOUR_HOUR | Timed | 20-28 | BASE → BUILD → ENDURANCE → PEAK → TAPER |
| BACKYARD_ULTRA | Infinite loops | 20-28 | BASE → BUILD → ENDURANCE → MENTAL_PREP → TAPER |
| CUSTOM_DISTANCE | User-defined | Calculated from distance | Adaptive |

**Ultra-specific plan generation differences:**
- Additional `ENDURANCE` phase between BUILD and PEAK (focus on time-on-feet, back-to-back long runs)
- `MENTAL_PREP` phase for backyard ultras (night running, sleep deprivation adaptation)
- Long runs peak at higher % of race distance (up to 60-80km for 100-milers, vs 32km cap for marathon)
- Back-to-back long runs on consecutive days (Sat long + Sun medium-long)
- Higher emphasis on nutrition/hydration rehearsal in long runs
- Walking/running strategy sessions for ultra distances
- For timed events (12h/24h): pace-based targets instead of distance-based
- For backyard ultra: loop-pace consistency drills, nighttime loop simulation

**Ultra-specific workout types:**
- Double-day long runs (AM/PM split)
- Night running sessions
- Fueling practice runs (targeting specific calorie/hydration rates)
- Terrain-specific runs (if race has significant vertical gain)

### Triathlon Distances (new)

| RaceType | Swim | Bike | Run | Default Plan Weeks |
|----------|------|------|-----|--------------------|
| SPRINT_TRI | 750m | 20km | 5km | 12-16 |
| OLYMPIC_TRI | 1,500m | 40km | 10km | 16-20 |
| HALF_IRONMAN | 1,900m | 90km | 21.1km | 20-24 |
| FULL_IRONMAN | 3,800m | 180km | 42.2km | 24-30 |
| CUSTOM_TRI | User-defined | User-defined | User-defined | Calculated |

**Triathlon-specific plan generation:**
- Three-sport weekly structure: `runsPerWeek`, `ridesPerWeek`, `swimsPerWeek` (all configurable)
- New required fields on Goal: `swimsPerWeek` (already exists but now mandatory for tri plans)
- Additional phase considerations:
  - Swim technique development in BASE phase
  - Brick workouts (bike → run) starting in BUILD phase, increasing frequency toward race
  - Open water swim practice in PEAK phase
  - T1/T2 transition practice sessions
- Weekly structure example (Olympic, 6 sessions/week):
  ```
  Mon: REST or Swim Drill
  Tue: Ride + Short Run (Brick)
  Wed: Swim (endurance)
  Thu: Run (quality: tempo/intervals)
  Fri: Swim Drill or REST
  Sat: Long Ride
  Sun: Long Run or Long Brick
  ```
- Volume distribution (Olympic/Half): ~40% bike, ~30% run, ~20% swim, ~10% strength
- Volume distribution (Full Ironman): ~45% bike, ~30% run, ~15% swim, ~10% strength

**Triathlon-specific WorkoutTypes:**
- `BRICK`: Bike-to-run session. Stored with two segments (bike distance + run distance)
- `OPEN_WATER_SWIM`: Outdoor swim session (navigation, sighting practice)
- `LONG_RIDE`: Endurance ride (2-6+ hours depending on distance)
- `RIDE_INTERVALS`: Structured bike intervals (e.g., 5x5min @ threshold)
- `SWIM_DRILL`: Technique work (drills, kick sets, pull sets)
- `TRANSITION_PRACTICE`: T1 (swim→bike) and T2 (bike→run) rehearsals
- `DOUBLE_DAY`: Two sessions in one day (e.g., AM swim + PM run)

### VDOT & Pace Calculations for Multi-Sport

**Running**: Existing VDOT system works for all running distances. For ultra distances, add:
- "Ultra easy pace" (slower than regular easy, factoring in fatigue accumulation)
- Walk/run strategy pace calculator
- Elevation-adjusted pace for mountain ultras

**Swim**: Swim pace derived from a separate swim fitness metric:
- If user has swim activities → calculate CSS (Critical Swim Speed) from best 400m and 2000m times
- If no swim data → estimate from run VDOT with a conversion factor
- Swim training zones: Easy (CSS + 8-10s/100m), Threshold (CSS), Interval (CSS - 4-6s/100m)

**Bike**: Bike pace/power derived from:
- If user has bike activities with power data → FTP-based zones
- If only HR data → HR-based zones
- If no bike data → estimate from run VDOT
- Bike training zones: Recovery (<55% FTP), Endurance (56-75%), Tempo (76-90%), Threshold (91-105%), VO2Max (106-120%)

### Plan Creation Modes

The advanced plan builder supports three distinct creation experiences based on user expertise:

---

#### Mode 1: EXPERT_MANUAL — Fully Manual (No Guidance)

**Target user**: Coaches, experienced athletes who know exactly what they want.

**Flow:**
1. Select sport (Run / Triathlon)
2. Select race type OR custom distance
3. Set race date + plan start date
4. Name the plan
5. → **Empty plan opens immediately** in the editor
6. User builds everything from scratch: add workouts day-by-day, create progressions, set paces
7. No AI prompts, no suggestions, no guidance popups
8. Full access to all tools: mass edit, templates, progressions, CSV import

**UI**: Minimal creation dialog, no wizard steps, straight to editor.

**AI available but optional**: User can trigger AI analysis/tools from the toolbar at any time, but nothing is proactively suggested.

---

#### Mode 2: GUIDED — Step-by-Step Wizard with AI Feedback

**Target user**: Beginners, intermediate athletes who want coaching guidance but make their own decisions.

**Flow** (via `GuidedPlanSession`):

**Step 1: Sport Selection**
- "What are you training for?"
- Options: Running event / Triathlon / Just want to run (no race)
- AI tip: Explains what each option means for training structure

**Step 2: Goal Definition**
- Running: Select race type (5K through ultra, custom distance, or "just run")
- Triathlon: Select distance (Sprint/Olympic/Half/Full/Custom)
- Custom distance: Enter distance in km or miles
- Backyard ultra: Confirm loop distance and set target laps
- "No race" option: Set a general goal (e.g., "Run 5x/week for 3 months")
- AI tip: Describes what training for this distance typically looks like

**Step 3: Experience & Fitness Assessment**
- "How long have you been running/training consistently?"
  - Options: <6 months, 6-12 months, 1-3 years, 3+ years
- "What's your recent race result or typical easy run pace?"
  - Optional: can enter a recent race time → calculates VDOT
  - Or skip and let system estimate from Strava data
- "How many days per week can you train?"
  - Slider: 3-7 days (running), 4-10 days (triathlon)
- AI tip: Based on responses, suggests appropriate training frequency and volume

**Step 4: Schedule Preferences**
- "Which days work best for longer/harder workouts?"
- "Which days do you prefer to rest?"
- "Do you have any days that are completely unavailable?"
- Optional: Morning/evening preference
- AI tip: Explains optimal placement of quality sessions

**Step 5: Plan Duration & Review**
- Shows recommended plan length based on goal + experience
- User can adjust (shorter/longer)
- Shows summary of all choices
- AI provides a brief assessment: "Based on your experience and goals, here's what I recommend..."
  - Suggests weekly volume range
  - Suggests periodization approach
  - Flags if the goal seems too aggressive or conservative

**Step 6: Generation Choice**
- "Generate my plan" (uses all preferences to auto-generate)
- "Start with AI suggestions" (AI proposes 2-3 plan options to choose from)
- Either way, the plan opens in the editor for full customization

**Throughout the wizard:**
- Each step has a "Why?" button that shows AI-powered explanations
- "Ask AI" chat bubble in the corner for questions at any step
- Responses stored in `GuidedPlanSession.responses` JSON
- User can go back to any step and change answers
- The wizard remembers partial progress (can close and resume)

**GuidedPlanSession.responses example:**
```json
{
  "sport": "TRIATHLON",
  "raceType": "OLYMPIC_TRI",
  "experience": "1-3 years",
  "recentRace": { "type": "TEN_K", "time": 2700 },
  "estimatedVdot": 42.5,
  "trainingDaysPerWeek": 6,
  "longWorkoutDay": 6,
  "restDays": [1],
  "unavailableDays": [],
  "planDurationWeeks": 18,
  "preferences": {
    "swimFrequency": "comfortable",
    "brickFrequency": "moderate",
    "strengthIncluded": true
  }
}
```

---

#### Mode 3: AI_ASSISTED — AI Proposes, User Refines

**Target user**: Anyone who wants AI to do the heavy lifting, then fine-tunes.

**Flow:**
1. Minimal input: Sport, race type, race date, VDOT/fitness level (quick assessment)
2. AI generates 2-3 complete plan options with different approaches:
   - **Option A: Conservative** (lower volume, more recovery, longer build)
   - **Option B: Balanced** (moderate volume, standard periodization)
   - **Option C: Aggressive** (higher volume, faster build, more quality)
3. Each option shows:
   - Weekly volume range
   - Peak week distance
   - Number of quality sessions per week
   - Key workouts preview
   - AI confidence score for the user's fitness level
4. User selects one (or mixes elements from multiple)
5. Plan opens in editor with AI-generated workouts
6. **AI remains active**: Suggests adjustments as user edits
   - "I notice you moved three hard sessions together. This creates a high-risk block. Consider..."
   - "Your long run progression jumps from 18km to 28km in one week. Suggest inserting a 22km week..."
   - Inline suggestions appear as dismissible cards on affected weeks/workouts
7. User can dismiss AI suggestions or apply with one click

**AI Proposal format:**
```json
{
  "options": [
    {
      "id": "conservative",
      "label": "Conservative Build",
      "description": "Lower risk, steady progression. Best if returning from injury or new to the distance.",
      "weeklyVolume": { "min": 35000, "max": 65000 },
      "peakWeekDistance": 65000,
      "qualitySessionsPerWeek": 2,
      "longRunPeak": 22000,
      "confidence": 0.92,
      "totalWeeks": 18,
      "highlights": [
        "3-week cycles with 1 recovery week",
        "Gradual long run buildup (10% max weekly increase)",
        "Two quality sessions (one interval, one tempo)"
      ]
    },
    {
      "id": "balanced",
      "label": "Balanced Plan",
      "description": "Standard periodization. Recommended for most runners with 1+ year experience.",
      "weeklyVolume": { "min": 40000, "max": 80000 },
      "peakWeekDistance": 80000,
      "qualitySessionsPerWeek": 2,
      "longRunPeak": 28000,
      "confidence": 0.85,
      "totalWeeks": 16,
      "highlights": [...]
    },
    {
      "id": "aggressive",
      "label": "High Performance",
      "description": "Higher volume and intensity. For experienced runners targeting a significant PR.",
      "weeklyVolume": { "min": 50000, "max": 100000 },
      "peakWeekDistance": 100000,
      "qualitySessionsPerWeek": 3,
      "longRunPeak": 32000,
      "confidence": 0.65,
      "totalWeeks": 14,
      "highlights": [...]
    }
  ]
}
```

### Plan Generation Engine Updates

The existing `Web/src/lib/plans/index.ts` (1,147 lines) needs to be extended:

**New file: `Web/src/lib/plans/generators/run-ultra.ts`**
- Ultra-specific phase structure (add ENDURANCE, MENTAL_PREP phases)
- Back-to-back long run scheduling
- Time-based targets for timed events
- Loop-pace targets for backyard ultras
- Nutrition/hydration rehearsal scheduling
- Night running session scheduling
- Progressive long run caps adjusted for ultra distances

**New file: `Web/src/lib/plans/generators/triathlon.ts`**
- Three-sport periodization engine
- Swim CSS-based pace calculation
- Bike zone calculation (FTP or HR-based)
- Brick workout scheduling and progression
- Sport-specific volume distribution per phase
- Multi-sport taper strategy (swim tapers faster than bike/run)
- Open water swim scheduling in later phases

**New file: `Web/src/lib/plans/generators/ai-proposal.ts`**
- Generates 2-3 plan options using the premium AI model
- Sends sport, race type, VDOT, duration, preferences as context
- AI returns structured plan proposals
- Each proposal is validated against training principles before presenting
- Fallback to algorithmic generation if AI is unavailable

**Modified file: `Web/src/lib/plans/index.ts`**
- Route to correct generator based on `PlanSport` and `RaceType`
- Add ultra-specific `PLAN_CONSTANTS` (higher volume caps, longer long runs)
- Add triathlon-specific weekly structure generation
- Keep existing 5K-HM-Marathon generation unchanged

**New file: `Web/src/lib/plans/generators/multi-goal.ts`**
- Multi-goal periodization engine
- Input: primary goal config + array of sub-goals (each with race type, date, priority)
- Output: merged phase structure with focus blocks for each sub-goal
- Key function: `generateMultiGoalPhases()`
  - Computes macro cycle from PRIMARY goal
  - For each sub-goal, calculates focus block windows
  - Merges all blocks into a single coherent phase timeline
  - Resolves conflicts (e.g., overlapping focus blocks → prioritize higher-priority event)
  - Returns phase array with `focusGoalId` on each phase indicating which event it serves
- Key function: `calculateVolumeForWeek()`
  - Takes macro cycle volume trajectory + sub-goal focus blocks
  - Applies volume reductions during taper/recovery blocks
  - Ensures PRIMARY goal's peak volume is still achievable
- Key function: `resolveConflicts()`
  - When two sub-goals are <3 weeks apart → merge focus blocks
  - When sub-goal falls in PRIMARY taper → adjust sub-goal to TUNE_UP priority
  - Returns warnings if plan is too congested (e.g., "3 races in 4 weeks is not recommended")

**Multi-goal phase structure example:**
```typescript
type MultiGoalPhase = {
  weekIndex: number;
  phase: PlanPhase;
  focusGoalId: string;      // Which goal this week primarily serves
  focusGoalName: string;    // Display name
  volumeMultiplier: number; // 1.0 = full volume, 0.6 = reduced
  phaseLabel: string;       // Custom label: "PEAK → Half Marathon" or "TAPER → Ironman"
  isRaceWeek: boolean;
  isRecoveryWeek: boolean;
};
```

### New WorkoutType Color Additions

```typescript
// Add to existing WORKOUT_COLORS:
BRICK:              { bg: 'bg-violet-500/20',  text: 'text-violet-400',  dot: 'bg-violet-400' },
OPEN_WATER_SWIM:    { bg: 'bg-sky-500/20',     text: 'text-sky-400',     dot: 'bg-sky-400' },
LONG_RIDE:          { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
RIDE_INTERVALS:     { bg: 'bg-teal-500/20',    text: 'text-teal-400',    dot: 'bg-teal-400' },
SWIM_DRILL:         { bg: 'bg-blue-400/20',    text: 'text-blue-300',    dot: 'bg-blue-300' },
TRANSITION_PRACTICE:{ bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
DOUBLE_DAY:         { bg: 'bg-rose-400/20',    text: 'text-rose-300',    dot: 'bg-rose-300' },
```

---

## Phase 1: Backend API Routes

### Directory Structure

```
Web/src/app/api/plan-advanced/
├── route.ts                    # GET list of goals, POST create new advanced plan
├── [goalId]/
│   ├── route.ts                # GET full plan, DELETE plan
│   ├── workouts/
│   │   ├── route.ts            # GET/POST workouts
│   │   ├── [workoutId]/
│   │   │   └── route.ts        # PATCH/DELETE single workout
│   │   └── bulk/
│   │       └── route.ts        # PATCH bulk operations (mass edit)
│   ├── snapshot/
│   │   └── route.ts            # GET snapshots (undo history), POST create snapshot
│   ├── undo/
│   │   └── route.ts            # POST undo to last snapshot
│   ├── template/
│   │   └── route.ts            # GET/POST/PUT/DELETE templates
│   ├── apply-template/
│   │   └── route.ts            # POST apply template to week range
│   ├── progression/
│   │   ├── route.ts            # GET/POST/PUT/DELETE interval progressions
│   │   └── apply/
│   │       └── route.ts        # POST apply progression to workouts
│   ├── ai-analysis/
│   │   └── route.ts            # POST trigger AI analysis, GET latest analysis
│   ├── sub-goals/
│   │   ├── route.ts            # GET all sub-goals, POST add sub-goal
│   │   └── [subGoalId]/
│   │       └── route.ts        # PATCH/DELETE sub-goal (edit priority, date, remove)
│   ├── regenerate/
│   │   └── route.ts            # POST regenerate plan phase structure after sub-goal changes
│   ├── pace-profile/
│   │   └── route.ts            # GET/PUT pace profile
│   ├── csv/
│   │   ├── import/
│   │   │   └── route.ts        # POST import CSV (multi-format)
│   │   └── export/
│   │       └── route.ts        # GET export CSV (multi-format)
│   └── analysis/
│       └── route.ts            # GET plan analytics (volume, intensity distribution, etc.)

Web/src/app/api/admin/
├── ai-settings/                    # (existing) — add plan builder provider selector to existing AI config tab
```

> Note: No separate `plan-ai-config/` admin route. Plan builder AI config is integrated into the existing AI settings admin tab.

### API Endpoints Detail

#### `POST /api/plan-advanced` — Create New Advanced Plan

**Request:**
```json
{
  "source": "blank" | "standard",
  "raceType": "MARATHON",
  "raceDate": "2026-10-15",
  "planStartDate": "2026-06-01",
  "name": "Berlin Marathon 2026",
  // If source="standard", include standard plan config:
  "runsPerWeek": 5,
  "weeklyMileageGoal": 80000,
  "taperWeeks": 3,
  // ... other PlanConfig fields
}
```

**Response:** Full goal with empty workouts (blank) or auto-generated workouts (standard)

#### `PATCH /api/plan-advanced/[goalId]/workouts/bulk` — Mass Edit

**Request:**
```json
{
  "operation": "DELETE" | "MOVE" | "CHANGE_TYPE" | "SCALE" | "SHIFT" | "CHANGE_INTENSITY",
  "workoutIds": ["id1", "id2", ...],
  // Operation-specific params:
  "params": {
    // For MOVE: { "targetDate": "2026-06-15" } or { "dayOffset": 3 }
    // For CHANGE_TYPE: { "newType": "TEMPO" }
    // For SCALE: { "volumeFactor": 1.1, "intensityFactor": 1.0 }
    // For SHIFT: { "days": 2 } (positive = forward, negative = backward)
    // For CHANGE_INTENSITY: { "paceAdjustment": -5 } (sec/km faster)
  }
}
```

- Creates a `PlanSnapshot` before executing
- Returns updated workouts

#### `POST /api/plan-advanced/[goalId]/ai-analysis` — AI Analysis

**Request:**
```json
{
  "analysisType": "full" | "week" | "risks" | "readiness" | "alternatives",
  "targetWeekIndex": 5,  // Only for "week" type
  "context": "User wants to increase mileage but is feeling fatigued"
}
```

**Response:**
```json
{
  "overallScore": 82,
  "overallSummary": "Well-structured plan with good progression...",
  "weekAnalyses": [...],
  "riskFlags": [
    { "type": "OVERTRAINING", "weekIndex": 7, "severity": "medium", "message": "..." }
  ],
  "raceReadiness": {
    "predictedTime": 10800,
    "confidence": 0.75,
    "trajectory": "on_track"
  },
  "suggestions": [...]
}
```

#### `POST /api/plan-advanced/[goalId]/csv/import` — CSV Import

**Request:** `multipart/form-data` with CSV file + format hint

**Supported Formats:**

1. **TrainingPeaks**: Columns: `Date, Title, Description, Type, Distance, Duration, Pace, Heart Rate, Notes`
2. **FinalSurge**: Columns: `Date, Activity Type, Workout Name, Description, Planned Distance, Planned Duration, Planned Pace`
3. **RunFlow Custom**: Columns: `date, workout_type, phase, name, description, distance_m, duration_s, pace_s_km, hr_zone, structured_steps`

**Response (preview mode, `confirm=false` or first call):**
```json
{
  "previewId": "prev_abc123",      // Server-cached preview ID (15-min TTL)
  "imported": 84,
  "skipped": 2,
  "errors": [...],
  "preview": true,
  "rows": [...]                    // First 10 parsed workout previews
}
```

**Confirm call:** `POST /api/plan-advanced/[goalId]/csv/import` with `{ "previewId": "prev_abc123", "confirm": true }`

**CSV Preview Caching:** The server parses the CSV once and stores the parsed result in-memory (or Redis if available) keyed by `previewId` with a 15-minute TTL. The confirm call retrieves the cached parse result and creates workouts without re-parsing. This avoids double-parsing and ensures the user confirms exactly what they previewed.

#### `GET /api/plan-advanced/[goalId]/csv/export` — CSV Export

**Query params:** `format=trainingpeaks|finalsurge|runflow`

**Response:** CSV file download

---

## Phase 2: Frontend Components

### Directory Structure

```
Web/src/app/plan-advanced/
├── layout.tsx                          # Auth guard, premium tier check
├── page.tsx                            # Landing: no-goal state or redirect
├── [goalId]/
│   └── page.tsx                        # Main plan editor
├── components/
│   ├── PlanLanding.tsx                 # No-goal state: "Create New" options
│   ├── CreatePlanDialog.tsx            # Plan creation modal (blank vs standard)
│   ├── PlanEditorLayout.tsx            # Main 3-panel layout
│   ├── Calendar/
│   │   ├── MiniCalendar.tsx            # Left panel mini calendar
│   │   ├── CalendarDay.tsx             # Single day cell in mini calendar
│   │   ├── CalendarWeek.tsx            # Week row
│   │   ├── WorkoutDot.tsx             # Color-coded workout indicator
│   │   └── CalendarHeader.tsx         # Month/year navigation
│   ├── Editor/
│   │   ├── WorkoutDetailPanel.tsx      # Right panel: single workout editor
│   │   ├── WorkoutListPanel.tsx        # Right panel: week/day workout list
│   │   ├── WeekSummaryBar.tsx          # Week metrics bar
│   │   ├── PhaseSelector.tsx           # Phase override control
│   │   └── StructuredWorkoutEditor.tsx # Interval/step builder
│   ├── MassEdit/
│   │   ├── MassEditToolbar.tsx         # Floating toolbar when items selected
│   │   ├── SelectionOverlay.tsx        # Checkbox overlay on workouts
│   │   ├── BulkDeleteDialog.tsx
│   │   ├── BulkMoveDialog.tsx
│   │   ├── BulkTypeChangeDialog.tsx
│   │   ├── BulkScaleDialog.tsx         # Volume/intensity scaling
│   │   └── TemplateApplyDialog.tsx     # Apply template to week range
│   ├── Progression/
│   │   ├── ProgressionTimeline.tsx     # Visual timeline of interval progression
│   │   ├── ProgressionBuilder.tsx      # Create/edit progression
│   │   ├── ProgressionWeekCard.tsx     # Single week in progression
│   │   └── AiProgressionSuggest.tsx    # AI-suggested progressions
│   ├── AI/
│   │   ├── AiAnalysisPanel.tsx         # AI analysis sidebar/panel
│   │   ├── PlanScoreGauge.tsx          # Visual quality score (0-100)
│   │   ├── WeekAnalysisCard.tsx        # Per-week AI commentary
│   │   ├── RiskFlagBadge.tsx           # Risk indicator
│   │   ├── RaceReadinessCard.tsx       # Race readiness prediction
│   │   └── AiSuggestionCard.tsx        # AI suggestion with apply button
│   ├── MultiGoal/
│   │   ├── EventsPanel.tsx             # Collapsible list of all goals (primary + sub-goals)
│   │   ├── EventCard.tsx               # Single event entry (name, date, priority badge, sport icon)
│   │   ├── AddSubGoalDialog.tsx        # Modal to add a new sub-goal (sport, race type, date, priority)
│   │   ├── EditSubGoalDialog.tsx       # Edit/remove an existing sub-goal
│   │   ├── GoalTimeline.tsx            # Horizontal timeline bar with event markers
│   │   ├── GoalTimelineMarker.tsx      # Single marker on timeline (color-coded by priority)
│   │   ├── PrioritySelector.tsx        # PRIMARY / SECONDARY / TUNE_UP / MILESTONE selector
│   │   └── MultiGoalPhaseLabel.tsx     # Phase label showing which goal it serves
│   ├── CsvImportExport/
│   │   ├── CsvImportDialog.tsx         # Import wizard with format detection
│   │   ├── CsvExportDialog.tsx         # Export with format selection
│   │   ├── CsvPreview.tsx             # Preview imported data before applying
│   │   └── FormatSelector.tsx         # TrainingPeaks / FinalSurge / RunFlow
│   ├── PaceProfile/
│   │   ├── PaceProfileEditor.tsx       # Edit adapting paces per phase
│   │   ├── PaceTimeline.tsx            # Visual pace changes across plan
│   │   └── HrZoneEditor.tsx           # HR zone overrides per phase
│   ├── Toolbar/
│   │   ├── PlanToolbar.tsx             # Top toolbar
│   │   ├── ModeToggle.tsx              # Expert | Guided | AI-Assisted toggle (persistent, top center)
│   │   ├── UndoRedoButtons.tsx
│   │   ├── ViewModeToggle.tsx          # Calendar/list/analysis view
│   │   └── PlanActionsMenu.tsx         # Export, import, delete plan
│   └── Shared/
│       ├── WorkoutTypeColors.ts        # Color mapping for workout types
│       ├── PlanKeyboardShortcuts.tsx    # Keyboard shortcuts handler
│       └── InfiniteScroll.tsx          # Virtual scrolling for weeks
```

### Layout Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Undo][Redo] │ Plan Name │ ┌─────────────────────┐ │ [AI][CSV][Tmpl]  │
│              │            │ Mode: [Expert|Guided|AI]│ │ [Prog][Pace]    │
│              │            └─────────────────────┘ │ [View: Cal|Ana]   │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │  🏁 Events ──────────────────────────────────────────    │
│              │  ├─ ⭐ Full Ironman (Dec 15) [PRIMARY]                  │
│  Mini Cal    │  ├─ 🏃 Half Marathon (Oct 12) [SECONDARY]              │
│              │  └─ 🏊 Olympic Tri (Sep 7) [TUNE_UP]  [+ Add Event]   │
│  ┌─────────┐│  ─────────────────────────────────────────────────────   │
│  │ Jun 2026││  Timeline: ───●──────●──────────●────────────────▶      │
│  │ Mo Tu ..││             Olympic  Half      Ironman                  │
│  │ .. .. ..││             (Sep)    (Oct)     (Dec)                    │
│  │ .. .. ..││                                                       │
│  │ .. .. ..││   ┌─────────────────────────────────────────────┐       │
│  │ Jul 2026││   │ Week 3: BASE │ 42.5km │ ▼ Phase │ 🎯 Ironman│      │
│  │ .. .. ..││   ├─────────────────────────────────────────────┤       │
│  │ .. .. ..││   │ Mon  Easy 8km    │ 🔵                       │       │
│  │ .. .. ..││   │ Tue  REST        │ ⬜                       │       │
│  │         ││   │ Wed  Intervals   │ 🟡 4x400m               │       │
│  │ Select: ││   │ Thu  Easy 6km    │ 🔵                       │       │
│  │ Week 3  ││   │ Fri  REST        │ ⬜                       │       │
│  │ ■ multi ││   │ Sat  Long 15km   │ 🟢                       │       │
│  │         ││   │ Sun  Easy 5km    │ 🔵                       │       │
│  │ Actions: ││   └─────────────────────────────────────────────┘       │
│  [Template]││                                                       │
│  [Mass Edit]│  ┌─────────────────────────────────────────────┐       │
│  [AI]      ││  │ Week 14: TUNE-UP │ 28km │ 🎯 Olympic Tri   │       │
│  [Goals]   ││  │ Mon  Easy 5km    │ 🔵 (reduced volume)      │       │
│              │  │ Tue  REST        │ ⬜                       │       │
│              │  │ Wed  Open Water  │ 🩵 (tri-specific)        │       │
│              │  │ Thu  REST        │ ⬜                       │       │
│              │  │ Fri  Easy 3km + strides │ 🔵               │       │
│              │  │ Sat  RACE 🏁    │ 🟣 Olympic Tri           │       │
│              │  │ Sun  REST        │ ⬜ (recovery)             │       │
│              │  └─────────────────────────────────────────────┘       │
├──────────────┴───────────────────────────────────────────────────────┤
│ Selected: 3 workouts | [Delete] [Move] [Change Type] [Scale]        │
└──────────────────────────────────────────────────────────────────────┘
```

**Multi-goal timeline bar** — always visible between the toolbar and the week content:
- Horizontal bar spanning the full plan duration
- Markers for each event (color-coded by priority: gold=PRIMARY, blue=SECONDARY, gray=TUNE_UP, green=MILESTONE)
- Current week indicator (vertical line)
- Click event marker → scroll to that event's week
- Mini phase labels between markers ("BASE", "BUILD", "TAPER", etc.)
- Shows which goal each phase block serves (label + color)

**Events panel** — collapsible section above the timeline:
- Lists all goals in the plan (primary + sub-goals)
- Each shows: name, date, priority badge, sport icon
- Click to expand: shows mini-summary (weeks until, current phase for this event)
- `[+ Add Event]` button to add sub-goals
- Drag to reorder priority (top = highest priority)
┌──────────────────────────────────────────────────────────────────────────┐
│ [Undo][Redo] │ Plan Name │ ┌─────────────────────┐ │ [AI][CSV][Tmpl]  │
│              │            │ Mode: [Expert|Guided|AI]│ │ [Prog][Pace]    │
│              │            └─────────────────────┘ │ [View: Cal|Ana]   │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │                                                       │
│  Mini Cal    │           Main Content Area                           │
│              │                                                       │
│  ┌─────────┐│   (Changes based on view mode)                        │
│  │ Jun 2026││                                                       │
│  │ Mo Tu ..││   Calendar View: Week-by-week with infinite scroll     │
│  │ .. .. ..││   List View: Detailed workout cards per day            │
│  │ .. .. ..││   Analysis View: AI insights, metrics, charts          │
│  │ .. .. ..││                                                       │
│  │ Jul 2026││   ┌─────────────────────────────────────────────┐     │
│  │ .. .. ..││   │ Week 3: BASE │ 42.5km planned │ ▼ Phase     │     │
│  │ .. .. ..││   ├─────────────────────────────────────────────┤     │
│  │ .. .. ..││   │ Mon  Easy 8km    │ 🔵                       │     │
│  │ .. .. ..││   │ Tue  REST        │ ⬜                       │     │
│  │ .. .. ..││   │ Wed  Intervals   │ 🟡 4x400m               │     │
│  │         ││   │ Thu  Easy 6km    │ 🔵                       │     │
│  │ Select: ││   │ Fri  REST        │ ⬜                       │     │
│  │ Week 3  ││   │ Sat  Long 15km   │ 🟢                       │     │
│  │ ■ multi ││   │ Sun  Easy 5km    │ 🔵                       │     │
│  │         ││   └─────────────────────────────────────────────┘     │
│  Actions:  ││                                                       │
│  [Template]││                                                       │
│  [Mass Edit]│                                                       │
│  [AI]      ││                                                       │
├──────────────┴───────────────────────────────────────────────────────┤
│ Selected: 3 workouts | [Delete] [Move] [Change Type] [Scale]        │
└──────────────────────────────────────────────────────────────────────┘
```

### Workout Type Color Scheme

```typescript
const WORKOUT_COLORS: Record<WorkoutType, { bg: string; text: string; dot: string }> = {
  EASY:         { bg: 'bg-blue-500/20',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  LONG_RUN:     { bg: 'bg-green-500/20',  text: 'text-green-400',  dot: 'bg-green-400' },
  TEMPO:        { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
  INTERVALS:    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  FARTLEK:      { bg: 'bg-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  REPETITIONS:  { bg: 'bg-red-500/20',    text: 'text-red-400',    dot: 'bg-red-400' },
  RECOVERY:     { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  RACE:         { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  REST:         { bg: 'bg-gray-500/20',   text: 'text-gray-400',   dot: 'bg-gray-400' },
  RIDE:         { bg: 'bg-teal-500/20',   text: 'text-teal-400',   dot: 'bg-teal-400' },
  SWIM:         { bg: 'bg-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  STRENGTH:     { bg: 'bg-pink-500/20',   text: 'text-pink-400',   dot: 'bg-pink-400' },
  CROSS_TRAIN:  { bg: 'bg-lime-500/20',   text: 'text-lime-400',   dot: 'bg-lime-400' },
  OTHER:        { bg: 'bg-slate-500/20',  text: 'text-slate-400',  dot: 'bg-slate-400' },
};
```

---

## Phase 3: Core Features Implementation

### 3.1 Infinite Scroll Calendar

**Component**: `MiniCalendar.tsx` + `InfiniteScroll.tsx`

- Use `@tanstack/react-virtual` for virtualized rendering of weeks
- Load weeks in chunks of 8 (2 months at a time)
- Fetch workouts for visible window + 2 week buffer
- Left panel shows condensed month grid with color-coded dots
- Clicking a week in the calendar scrolls the main content to that week
- Today is highlighted, race date is marked with a flag icon

**Data fetching strategy:**
```
Query key: ['advanced-plan', goalId, startWeek, endWeek]
Prefetch next 4 weeks when user scrolls to 75% of current window
```

### 3.2 Mass Edit System

**Component**: `MassEditToolbar.tsx` + `SelectionOverlay.tsx`

**Selection modes:**
1. **Click + Shift+Click**: Range select within a week
2. **Ctrl/Cmd + Click**: Multi-select individual workouts
3. **Week header checkbox**: Select all workouts in a week
4. **Phase header checkbox**: Select all workouts in a phase
5. **Drag selection**: Draw a rectangle to select workouts (stretch goal)

**Operations:**

| Operation | UI | API |
|-----------|-----|-----|
| Bulk Delete | Confirm dialog → delete | `PATCH /workouts/bulk { operation: "DELETE" }` |
| Bulk Move | Date picker → move all | `PATCH /workouts/bulk { operation: "MOVE" }` |
| Change Type | Dropdown → new type | `PATCH /workouts/bulk { operation: "CHANGE_TYPE" }` |
| Scale Volume | Slider (50%-200%) + preview | `PATCH /workouts/bulk { operation: "SCALE", params: { volumeFactor } }` |
| Scale Intensity | Slider + pace zone preview | `PATCH /workouts/bulk { operation: "SCALE", params: { intensityFactor } }` |
| Shift Schedule | +/- days spinner | `PATCH /workouts/bulk { operation: "SHIFT", params: { days } }` |
| Apply Template | Template picker + week range | `POST /apply-template` |

**Auto-save + Undo:**
- Before each bulk operation, create `PlanSnapshot`
- Undo button restores last snapshot
- Undo history shown as dropdown with operation descriptions
- Keyboard: `Ctrl+Z` = undo, `Ctrl+Shift+Z` = redo (if snapshot stack allows)

### 3.3 Progressive Intervals

**Component**: `ProgressionBuilder.tsx` + `ProgressionTimeline.tsx`

**Flow:**
1. User clicks "Add Progression" in toolbar
2. Chooses workout type (INTERVALS, REPETITIONS, FARTLEK, TEMPO)
3. Selects week range (start week → end week)
4. **Manual mode**: Define each week's intervals manually
   - Add warmup, main set (reps x distance @ pace + rest), cooldown
   - Copy previous week and modify
   - Use pace suggestions from `PlanPaceProfile`
5. **AI mode**: Click "AI Suggest" → AI generates progressive scheme
   - Based on race type, current VDOT, phase, and goals
   - User can edit AI suggestions before applying
6. Apply progression → generates/updates workouts for each week
7. Visual timeline shows progression across weeks (bar chart of volume/intensity)

**Progression rules engine:**
- 10% max volume increase per week
- Every 4th week is a deload (reduce reps/volume by 20-30%)
- Pace targets auto-calculated from `PlanPaceProfile` per phase
- Can layer multiple progressions (e.g., one for intervals, one for long runs)

### 3.4 Adapting Training Paces & HR Zones

**Component**: `PaceProfileEditor.tsx` + `PaceTimeline.tsx`

**Concept:** Instead of static paces, the plan has a `PlanPaceProfile` that defines how paces adapt across phases.

**Logic:**
1. Base paces calculated from starting VDOT (using existing `calculateTrainingPaces()`)
2. Each phase can have a VDOT adjustment (e.g., +0.5 in BUILD, +1.0 in PEAK)
3. User can override individual pace ranges per phase
4. HR zone overrides can also be set per phase
5. When a workout is created/edited, target paces are pulled from the active phase's profile
6. Visual timeline shows how paces change across the plan duration

**Integration with existing system:**
- Uses `Web/src/lib/metrics/vdot.ts` → `calculateTrainingPaces()` for base calculations
- Phase progression uses VDOT adjustments to scale paces
- Overrides stored in `PlanPaceProfile.profiles` JSON

### 3.5 AI Plan Analysis

**Component**: `AiAnalysisPanel.tsx` + sub-components

**AI Provider:** Uses `PlanAiConfig` (separate from user AI settings)

**Analysis types:**

#### Full Plan Analysis (triggered manually or on significant changes)
- Sends full plan context: race type, VDOT, all weeks with workouts, paces, volume
- AI system prompt includes running coaching expertise, periodization principles
- Returns: overall score, week-by-week analysis, risk flags, race readiness prediction

#### Risk Analysis (automatic, debounced after plan changes)
- Analyzes: weekly volume jumps >10%, insufficient recovery weeks, back-to-back hard days
- Flags: overtraining risk, undertraining risk, taper too aggressive/conservative
- Severity: low (yellow), medium (orange), high (red)

#### Race Readiness Prediction
- Uses plan volume, intensity distribution, VDOT trajectory
- Predicts finish time with confidence interval
- Compares to target time

#### Auto-generate Alternatives
- User selects a workout or week → "Suggest Alternatives"
- AI generates 2-3 alternative workout options
- Each with explanation of why it might be better
- One-click apply to replace the workout

**AI Context sent to model:**
```
System: You are an expert running coach analyzing a training plan.
Context: Race type, VDOT, plan duration, weekly structure
Plan data: All workouts with dates, types, distances, paces, phases
Pace profile: Current training paces per phase
User context: Recent activity history, fitness metrics (if available)
Multi-goal context: All sub-goals with dates, priorities, and their focus blocks
```

When multi-goal is active, the AI additionally analyzes:
- Whether sub-goals are well-placed relative to the primary goal
- Whether the mini-taper/recovery blocks are appropriately sized
- Whether training focus shifts make sense between events
- Whether two sub-goals are too close together and should be reconsidered
- Whether the primary goal's training is compromised by too many sub-goals

**Token budget:** Max 8K tokens per analysis, monthly budget configurable by admin.

### 3.6 CSV Import/Export

**Component**: `CsvImportDialog.tsx` + `CsvExportDialog.tsx`

#### Import Flow:
1. User uploads CSV file
2. **Auto-detect format**: Parse headers and match against known formats
3. Show preview with mapped fields (date → date, distance → distance, etc.)
4. User confirms mapping or adjusts
5. **Preview import**: Show first 10 rows as workouts, highlight any issues
6. User confirms → import creates workouts for the active goal
7. All imported workouts get tagged with `planSource: "csv_import"`

#### Export Flow:
1. Select format (TrainingPeaks / FinalSurge / RunFlow Custom)
2. Choose date range (full plan or specific weeks)
3. Preview export data
4. Download CSV file

#### Format Specifications:

**TrainingPeaks Format:**
```csv
Date,Title,Description,Type,Total Distance,Total Duration,Target Pace,Target Heart Rate,Notes
06/01/2026,Easy Run,"Easy aerobic run",Run,8000,2400,360,,
06/02/2026,Rest Day,"Full rest",Rest,,,,,
```

**FinalSurge Format:**
```csv
Date,Activity Type,Workout Name,Description,Planned Distance,Planned Duration,Planned Pace,Planned HR Zone,Notes
2026-06-01,Run,Easy Run,"Easy aerobic run",8 km,40 min,6:00/km,,
```

**RunFlow Custom Format:**
```csv
date,workout_type,phase,name,description,distance_m,duration_s,pace_s_km,hr_zone,structured_steps
2026-06-01,EASY,BASE,Easy Run,"Easy aerobic run",8000,2400,360,,
2026-06-03,INTERVALS,BUILD,4x400m @ R pace,"Interval session",7600,2700,290,5,"[{""type"":""warmup"",""distance"":2000},{""type"":""interval"",""reps"":4,""distance"":400,""pace"":""R"",""rest"":90},{""type"":""cooldown"",""distance"":2000}]"
```

---

## Phase 4: Admin Section Updates

### Existing Admin AI Tab Update

Add a "Plan Builder" sub-section to the existing `Web/src/components/admin/AiSettingsTab.tsx`:

**UI additions:**
- Plan Builder Provider selector (dropdown of existing `AiProvider` entries)
- Plan Builder Model selector (e.g., `gpt-4o`, `claude-opus-4`)
- Max tokens per analysis (default 8000)
- Test plan analysis button (runs a sample analysis to verify connection)

**API:** Uses existing `GET/PUT /api/admin/ai-settings` — just adds `planBuilderProviderId` and `planBuilderModel` fields.

---

## Phase 5: Landing Page & Plan Creation

### Plan Coexistence — Standard & Advanced

Both standard plans (`/plan`) and advanced plans (`/plan-advanced`) can coexist simultaneously. Users are not forced to choose one or the other.

**Standard → Advanced migration:**
- The existing `/plan` page gets a new button: **"Open in Advanced Editor →"**
- Clicking it:
  1. Sets `Goal.planSource = "advanced"` on the existing goal
  2. Redirects to `/plan-advanced/[goalId]`
  3. All existing workouts are preserved and immediately editable in the advanced editor
  4. The plan can still be viewed (read-only) on `/plan` afterward
- No data duplication — the same `Goal` and `Workout` records are shared
- The advanced editor simply provides richer editing tools on the same data

### `PlanLanding.tsx` — No Active Plan State

When user navigates to `/plan-advanced` and has no active advanced plan:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           Advanced Plan Builder                             │
│           Premium Training Planning                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ⭐ Main Goal — Your A-Race                          │   │
│  │                                                      │   │
│  │  [Running]  [Triathlon]  [No Race / General Fitness] │   │
│  │                                                      │   │
│  │  Running:        Triathlon:                          │   │
│  │   5K   10K        Sprint                            │   │
│  │   Half  Marathon   Olympic                          │   │
│  │   50K  50 Mile     Half Ironman                     │   │
│  │   100K 100 Mile    Full Ironman                     │   │
│  │   12hr  24hr       Custom                           │   │
│  │   Backyard Ultra                                    │   │
│  │   Custom Distance                                   │   │
│  │                                                      │   │
│  │  📅 Plan starts:  [June 1, 2026]   🏁 Race: [Dec 15, 2026] │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🏃 Sub-Goals — Tune-ups & milestones along the way  │   │
│  │                                                      │   │
│  │  (none yet — optional)                               │   │
│  │                                                      │   │
│  │  [+ Add Sub-Goal]                                    │   │
│  │                                                      │   │
│  │  💡 Example: Add a half marathon 10 weeks before     │   │
│  │     your Ironman as a tune-up race. The plan will     │   │
│  │     automatically include a mini-taper and recovery.  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Create Plan          [→]                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ─── or ───                                                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📂 Import from CSV                                 │   │
│  │  Import existing plan from TrainingPeaks, FinalSurge │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Recent Plans:                                              │
│  • Berlin Marathon 2026 (completed)                         │
│  • 10K Spring Race (completed)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sub-goals are optional at creation time.** The user creates the main goal, and can add sub-goals either:
1. During creation (via "Add Sub-Goal" button above)
2. At any time inside the editor (via the Events panel → [+ Add Event])

### `AddSubGoalDialog.tsx` — Add a Sub-Goal

**Minimal flow:**
1. Sport (defaults to parent's sport, can differ — e.g., running tune-up inside triathlon plan)
2. Race type / distance
3. Event date
4. Priority: SECONDARY / TUNE_UP / MILESTONE
5. → Creates sub-goal linked to parent, recalculates phase structure

**AI-Assisted mode extra:** After adding a sub-goal, AI suggests:
- Whether the date is well-placed relative to the primary goal
- What priority it recommends
- Whether it conflicts with any other sub-goals
- How to adjust training around this event

### `CreatePlanDialog.tsx` — Plan Creation (Unified)

The creation flow is the same regardless of mode. Mode is selected later via the toolbar toggle.

**Minimal flow:**
1. What are you training for? (Running / Triathlon / No Race)
2. Select distance / race type
3. When does your plan start? (Date picker)
4. When is the race / goal date? (Date picker)
5. (Optional) Add sub-goals — can skip and add later
6. → **Empty plan opens immediately in the editor** (or CSV import path)
7. Default mode is **Expert Manual**. User can toggle to Guided or AI-Assisted at any time from the toolbar.

### "No Race" Mode — Simplified Rolling Plans

When the user selects **"No Race / General Fitness"**, the plan operates differently:

**Creation:**
- No race date required
- User sets plan start date + duration (e.g., "12 weeks" or "ongoing")
- User sets training days/week and general volume target

**Plan structure:**
- Uses simplified phase cycle: `BASE → BUILD → MAINTAIN` (no PEAK/TAPER/RACE_WEEK)
- `MAINTAIN` phase uses the `PlanPhase.MAINTAIN` enum value
- Volume builds progressively during BASE → BUILD, then holds steady in MAINTAIN
- Recovery weeks still apply every 4th week (same step-loading cycle as race plans)
- No periodization toward a target date — volume is capped at the user's weekly goal

**In the editor:**
- No race marker on the timeline
- Phase labels show BASE/BUILD/MAINTAIN instead of the full race periodization
- AI analysis focuses on volume consistency and injury prevention rather than race readiness
- "Race Readiness" card is hidden; replaced with "Fitness Progress" card

**Stored on Goal:**
- `raceType = null` (field becomes nullable for no-race goals)
- `raceDate = plan end date` (or null for ongoing plans)
- `planSource = "advanced"`
- `creationMode = EXPERT_MANUAL | GUIDED | AI_ASSISTED`

### Mode Toggle — Persistent in Toolbar

**Component**: `ModeToggle.tsx` — sits in the top toolbar, always visible when editing a plan.

```
┌─────────────────────────────────────────┐
│  Mode:  [Expert Manual] [Guided] [AI]   │
└─────────────────────────────────────────┘
```

- Three-state toggle: `EXPERT_MANUAL` | `GUIDED` | `AI_ASSISTED`
- Visually prominent (pill-style segmented control) so the user always knows the active mode
- Per-user preference persisted in localStorage (default for new plans, sticky across sessions)
- Per-plan override stored on `Goal.guidanceLevel` field in DB
- **Priority**: `Goal.guidanceLevel` (per-plan) takes precedence over localStorage. If the user explicitly toggles mode on a specific plan, that choice is saved to the DB and always used for that plan. localStorage is only the fallback for plans that haven't been toggled yet.

#### What changes when you switch modes:

| | Expert Manual | Guided | AI-Assisted |
|---|---|---|---|
| **Wizard/Onboarding** | Never shown | Guided wizard panels appear in the editor sidebar when the plan is empty or incomplete | AI proposal cards appear when plan is empty |
| **Inline suggestions** | None | Occasional dismissible tip cards (e.g., "Tip: This week has 3 hard days. Consider...") | Proactive AI suggestions on every edit (e.g., "Your long run jumped 40%. Suggest...") |
| **AI toolbar buttons** | Available but manual-only (click to trigger) | Same + "Ask AI" chat bubble | Same + auto-triggered analysis after major edits |
| **Workout editor** | All fields exposed, raw editing | Same + helper tooltips on fields explaining what values mean | Same + AI suggests values based on context |
| **Mass edit** | All operations available, no warnings | Same + confirmation warnings for risky operations | Same + AI auto-suggests safer alternatives |
| **Progression builder** | Manual only | Manual + "Explain this progression" button | Manual + "AI Suggest" auto-generates progressions |
| **Pace profile** | Manual only | Manual + tooltips explaining zones | Manual + AI auto-fills based on VDOT + phase |

#### Switching modes mid-edit:

- Switching is **instant and non-destructive** — no data is lost, no plan regeneration
- Switching **to Guided** when plan exists: guided tips start appearing as you click on weeks/workouts. A brief "Guided mode enabled" toast appears.
- Switching **to AI-Assisted** when plan exists: AI immediately scans the current plan and shows inline suggestion cards on any issues it finds. No regeneration — it works with what's already there.
- Switching **to Expert Manual**: all AI suggestions/tips immediately hide. No confirmation dialog.
- The mode choice is cosmetic/behavioral — it controls what UI surfaces are shown, not what data is stored or what you can do.

#### Guided Mode — Contextual Wizard Panels

When a plan is empty or has missing sections in Guided mode:

Instead of a pre-creation wizard, guided panels appear **inside the editor** as contextual cards:

```
┌─────────────────────────────────────────────────────────┐
│  Week 1: BASE                        No workouts yet    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  🎓 Guided: Build your first week              │    │
│  │                                                 │    │
│  │  For a 10K plan at your level, a typical BASE   │    │
│  │  week includes:                                 │    │
│  │  • 3-4 easy runs (building aerobic base)        │    │
│  │  • 1 long run (start at ~30% of peak distance)  │    │
│  │  • Optional: 1 light stride session             │    │
│  │                                                 │    │
│  │  Would you like me to suggest a starting week?  │    │
│  │  [Suggest Week] [Skip] [Don't show again]       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  + Add Workout                                          │
└─────────────────────────────────────────────────────────┘
```

**Guided context data** (stored in `GuidedPlanSession`):
```json
{
  "sport": "TRIATHLON",
  "raceType": "OLYMPIC_TRI",
  "experience": "1-3 years",
  "estimatedVdot": 42.5,
  "trainingDaysPerWeek": 6,
  "longWorkoutDay": 6,
  "restDays": [1],
  "planDurationWeeks": 18,
  "dismissedTips": ["week1_build", "taper_explanation"],
  "completedSteps": ["sport", "distance", "schedule"]
}
```

The guided session data is populated lazily:
- When user first toggles to Guided mode, a `GuidedPlanSession` is created
- The session collects info as the user interacts with guided panels
- If the user dismisses all tips, the session marks `guidanceLevel: "minimal"` and stops showing cards
- User can reset guidance via a "Show tips again" button

#### AI-Assisted Mode — Proactive Analysis

When switching to AI-Assisted mode on an existing plan:

1. **Immediate scan**: AI analyzes the full plan in the background (debounced, 2s)
2. **Suggestion cards appear inline** on weeks/workouts that have issues or improvement opportunities
3. **Top bar summary**: "AI found 4 suggestions (2 risks, 2 improvements)"

```
┌─────────────────────────────────────────────────────────┐
│  Week 7: BUILD                         🟡 42.5km plan  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ⚠️ AI Suggestion — Volume Jump                 │    │
│  │                                                 │    │
│  │  Week 7 volume (42.5km) is 18% higher than      │    │
│  │  week 6 (36.0km). Recommended max: 10% jump.    │    │
│  │                                                 │    │
│  │  Suggested: Scale week 7 down to ~39.6km        │    │
│  │  [Apply] [Dismiss] [Edit Manually]               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Mon  Easy 8km    │ 🔵                                  │
│  Tue  REST        │ ⬜                                  │
│  Wed  Intervals   │ 🟡  ← ┌────────────────────────┐   │
│  Thu  Easy 6km    │ 🔵     │ 💡 Move this tempo to  │   │
│  Fri  REST        │ ⬜     │ Thursday for better    │   │
│  Sat  Long 15km   │ 🟢     │ recovery spacing       │   │
│  Sun  Easy 5km    │ 🔵     │ [Apply] [Dismiss]     │   │
│                         └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**AI suggestion types:**

| Trigger | Suggestion | Severity |
|---------|-----------|----------|
| Volume jump >10% week-over-week | "Scale back volume" | Warning |
| Back-to-back hard days | "Add rest day between" | Warning |
| No recovery week in 4+ weeks | "Insert deload week" | Info |
| Taper not aggressive enough | "Reduce taper volume" | Warning |
| Too much volume for race distance | "Consider reducing weekly km" | Warning |
| Missing key workout types for phase | "Add tempo run in BUILD phase" | Info |
| Pace targets inconsistent with VDOT | "Adjust paces to match fitness" | Info |
| Brick workout missing (triathlon) | "Add brick session in week X" | Info |
| Long run progression stalled | "Suggest long run progression" | Info |

---

## Phase 6: Implementation Order — Subagent Execution Plan

### Execution Model

Each phase is executed by an **implementing subagent** (150k context max), followed by a **review subagent** that validates the output. The final phase is a comprehensive cross-phase review.

**Subagent context budget per phase (~150k):**
- Plan section for this phase: ~5-15k
- Existing code files to read: ~40-60k
- New code being written: ~30-50k
- Headroom for reasoning: ~30-50k

**Rules for implementing agents:**
1. Read ONLY the plan sections listed in "Context Slice" — do not load the full plan
2. Run `flutter analyze` (Flutter) or `npx tsc --noEmit` (Web) after every phase
3. Run relevant tests after every phase
4. Create a `PHASE_N_COMPLETE.md` file listing all files created/modified

**Rules for review agents:**
1. Read the phase's plan section + `PHASE_N_COMPLETE.md` + all listed output files
2. Check acceptance criteria one by one
3. Check for: missing relations, unused imports, type errors, missing error handling, inconsistent naming
4. Output: `PHASE_N_REVIEW.md` with PASS/FAIL per criterion + list of issues to fix
5. If FAIL: implementing agent runs again with the review feedback

---

### Phase 1: Database Schema & Migration

**Goal:** All schema changes applied, Prisma client regenerated, existing code still compiles.

**Context Slice:** Plan sections: "Phase 0: Database Schema Changes" + "Phase 0.5: Multi-Sport & Race Type Support" (enums + Goal fields + new models)

**Input files to read:**
- `Web/prisma/schema.prisma`
- `Web/src/lib/plans/index.ts` (first 40 lines — to understand current RaceType/WorkoutType imports)

**Tasks:**
1. Expand `RaceType` enum (add ultra + triathlon types)
2. Expand `WorkoutType` enum (add BRICK, OPEN_WATER_SWIM, LONG_RIDE, etc.)
3. Expand `PlanPhase` enum (add ENDURANCE, MENTAL_PREP, TUNE_UP, MAINTAIN)
4. Add new enums: `PlanSport`, `PlanCreationMode`, `GoalPriority`
5. Add new fields to `Goal` model (sport, creationMode, custom distances, parentGoalId, priority, guidanceLevel, planSource, etc.)
6. Make `raceType` and `raceDate` nullable on `Goal` (for no-race mode)
7. Create new models: `PlanSnapshot`, `WeekTemplate`, `IntervalProgression`, `AiPlanAnalysis`, `PlanPaceProfile`, `GuidedPlanSession`
8. Add fields to `Workout` model (customName, color, intervalProgressionId, structuredSteps, groupId, subGoalId)
9. Add `planBuilderProviderId` + `planBuilderModel` to `GlobalAiSettings`
10. Add all reverse relations (User.weekTemplates, User.guidedPlanSessions, Goal.taggedWorkouts, etc.)
11. Run `npx prisma generate` + `npx prisma migrate dev`
12. Fix any existing code that breaks due to nullable `raceType`/`raceDate` (add null checks in `Web/src/lib/plans/index.ts`)

**Output files:** `Web/prisma/schema.prisma` (modified), `Web/src/lib/plans/index.ts` (modified), migration file

**Acceptance criteria:**
- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` succeeds
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] All new enums have correct values matching the plan
- [ ] All new models have proper relations, indexes, and cascade deletes
- [ ] Existing tests still pass (`npm test`)

**Review agent checks:** Schema completeness, relation consistency (both sides defined), index coverage, nullable correctness.

---

### Phase 2: Core Backend API — CRUD & Snapshots

**Goal:** All plan-advanced API routes for basic CRUD, snapshots, undo, sub-goals, and pace profiles.

**Context Slice:** Plan section "Phase 1: Backend API Routes" (directory structure + endpoint details)

**Input files to read:**
- `Web/prisma/schema.prisma` (from Phase 1)
- `Web/src/app/api/plan/` (existing plan API for patterns)
- `Web/src/auth.ts` (auth patterns)

**Tasks:**
1. `plan-advanced/route.ts` — GET list, POST create (blank/standard/no-race)
2. `plan-advanced/[goalId]/route.ts` — GET full plan, DELETE
3. `plan-advanced/[goalId]/workouts/route.ts` — GET/POST
4. `plan-advanced/[goalId]/workouts/[workoutId]/route.ts` — PATCH/DELETE
5. `plan-advanced/[goalId]/snapshot/route.ts` — GET list, POST create
6. `plan-advanced/[goalId]/undo/route.ts` — POST restore
7. `plan-advanced/[goalId]/sub-goals/route.ts` — GET/POST
8. `plan-advanced/[goalId]/sub-goals/[subGoalId]/route.ts` — PATCH/DELETE
9. `plan-advanced/[goalId]/pace-profile/route.ts` — GET/PUT
10. `plan-advanced/[goalId]/regenerate/route.ts` — POST
11. `plan-advanced/[goalId]/analysis/route.ts` — GET stats
12. All routes: auth guard, premium tier check, input validation, error handling
13. Snapshot auto-creation before mutations, tier-based limits (10/30/50)

**Acceptance criteria:**
- [ ] All endpoints return proper HTTP status codes
- [ ] Auth guard on every route (session check)
- [ ] Premium tier check (tier2+ or admin)
- [ ] Snapshot created before destructive operations
- [ ] Sub-goal creation triggers phase recalculation
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests for each endpoint

**Review agent checks:** Auth on every route, error handling, Prisma transactions for multi-step ops, snapshot limit enforcement.

---

### Phase 3: Backend API — Bulk Ops, Templates, Progressions, CSV

**Goal:** All remaining API routes: bulk ops, templates, progression CRUD+apply, CSV import/export, AI analysis trigger.

**Context Slice:** Plan section "Phase 1: Backend API Routes" (bulk endpoint detail, CSV spec, AI analysis)

**Input files to read:** Phase 2 output files (API patterns), `Web/src/lib/plans/index.ts`

**Tasks:**
1. `[goalId]/workouts/bulk/route.ts` — PATCH bulk ops (DELETE, MOVE, CHANGE_TYPE, SCALE, SHIFT, CHANGE_INTENSITY)
2. `[goalId]/template/route.ts` — GET/POST/PUT/DELETE
3. `[goalId]/apply-template/route.ts` — POST
4. `[goalId]/progression/route.ts` — GET/POST/PUT/DELETE
5. `[goalId]/progression/apply/route.ts` — POST
6. `[goalId]/csv/import/route.ts` — POST (preview + confirm via previewId)
7. `[goalId]/csv/export/route.ts` — GET
8. `[goalId]/ai-analysis/route.ts` — GET/POST
9. `Web/src/lib/plans/csv-parser.ts` — multi-format parser (TrainingPeaks, FinalSurge, RunFlow)
10. `Web/src/lib/plans/csv-preview-cache.ts` — in-memory preview cache with 15-min TTL
11. All bulk ops: create snapshot before execution

**Acceptance criteria:**
- [ ] Bulk operations modify multiple workouts atomically (transaction)
- [ ] CSV parser handles all 3 formats
- [ ] CSV preview→confirm flow works with previewId
- [ ] Template apply creates workouts for target week range
- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests for CSV parser, bulk operation logic

**Review agent checks:** Transaction safety on bulk ops, CSV edge cases, preview cache cleanup.

---

### Phase 4: Plan Generation Engines

**Goal:** Ultra, triathlon, multi-goal periodization, no-race generators all functional.

**Context Slice:** Plan section "Phase 0.5: Multi-Sport & Race Type Support" (ultra/tri specs, multi-goal phase structure)

**Input files to read:** `Web/src/lib/plans/index.ts` (full file), `Web/src/lib/metrics/vdot.ts`

**Tasks:**
1. `generators/run-ultra.ts` — ultra-specific phases, back-to-back long runs, backyard ultra loops
2. `generators/triathlon.ts` — 3-sport periodization, brick scheduling
3. `generators/multi-goal.ts` — `generateMultiGoalPhases()`, `resolveConflicts()`
4. `generators/ai-proposal.ts` — AI plan proposals (conservative/balanced/aggressive)
5. `generators/no-race.ts` — BASE → BUILD → MAINTAIN rolling cycle
6. `swim-pace.ts` — CSS calculation from 400m/2000m times
7. `bike-zones.ts` — FTP/HR-based bike training zones
8. Update `index.ts` — route to correct generator based on PlanSport + RaceType

**Acceptance criteria:**
- [ ] Ultra generator produces ENDURANCE phase, back-to-back long runs
- [ ] Triathlon generator produces correct swim/bike/run distribution per phase
- [ ] Multi-goal phases correctly insert focus blocks and mini-tapers
- [ ] No-race generator produces BASE → BUILD → MAINTAIN without PEAK/TAPER
- [ ] All generators respect 10% weekly volume cap
- [ ] Unit tests for each generator (minimum 3 tests each)
- [ ] `npx tsc --noEmit` passes

**Review agent checks:** Training science correctness, edge cases (1-week plans, overlapping sub-goals).

---

### Phase 5: Frontend Core — Layout, Landing, Calendar

**Goal:** The plan-advanced route exists with landing page, create dialog, 3-panel editor shell, and read-only calendar view.

**Context Slice:** Plan sections: "Phase 2: Frontend Components" (directory structure + layout), "Phase 5: Landing Page & Plan Creation"

**Input files to read:** `Web/src/app/plan/` (existing plan page), `Web/src/app/layout.tsx`, `Web/src/app/globals.css`

**Tasks:**
1. `plan-advanced/layout.tsx` + `page.tsx` + `[goalId]/page.tsx`
2. `PlanLanding.tsx` — sport/distance selection, sub-goals, CSV import, standard→advanced
3. `CreatePlanDialog.tsx` — unified creation flow (run/tri/no-race)
4. `PlanEditorLayout.tsx` — 3-panel layout
5. `Calendar/` — MiniCalendar, CalendarDay, CalendarWeek, CalendarHeader, WorkoutDot
6. `Shared/WorkoutTypeColors.ts` — full color mapping
7. `Shared/InfiniteScroll.tsx` — virtualized week scroll (`@tanstack/react-virtual`)
8. `Toolbar/` — PlanToolbar, ViewModeToggle, PlanActionsMenu, UndoRedoButtons
9. Install `@tanstack/react-virtual`

**Acceptance criteria:**
- [ ] `/plan-advanced` shows landing page when no active plan
- [ ] Create dialog produces a new Goal via POST API
- [ ] Editor layout renders 3 panels (mini-cal, main, toolbar)
- [ ] Infinite scroll renders weeks with workout dots
- [ ] Premium tier gate works (non-premium sees upsell)
- [ ] `npx tsc --noEmit` passes

**Review agent checks:** Responsive layout, React Query integration, loading/error states, accessibility.

---

### Phase 6: Frontend Editing — CRUD, Drag-Drop, Mass Edit

**Goal:** Full editing: single workout CRUD, drag-drop, auto-save, undo/redo, mass selection + bulk dialogs.

**Context Slice:** Plan section "Phase 3: Core Features Implementation" (3.1 Infinite Scroll, 3.2 Mass Edit System)

**Input files to read:** Phase 5 output (editor layout), Phase 2 output (CRUD APIs), existing drag-drop code

**Tasks:**
1. `Editor/` — WorkoutDetailPanel, WorkoutListPanel, WeekSummaryBar, PhaseSelector, StructuredWorkoutEditor
2. `MassEdit/` — MassEditToolbar, SelectionOverlay, BulkDeleteDialog, BulkMoveDialog, BulkTypeChangeDialog, BulkScaleDialog, TemplateApplyDialog
3. Selection modes (click, shift+click, ctrl+click, week/phase header checkboxes)
4. Auto-save (500ms debounce, "Saving…" indicator)
5. Undo/redo (Ctrl+Z / Ctrl+Shift+Z, snapshot dropdown)
6. `Shared/PlanKeyboardShortcuts.tsx`

**Acceptance criteria:**
- [ ] Single workout: create, edit, delete inline
- [ ] Drag-drop reorders workouts within and across days
- [ ] Auto-save fires 500ms after last change
- [ ] Undo restores from snapshot, redo re-applies
- [ ] All 6 bulk operations execute and show result
- [ ] Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, Ctrl+A, Delete
- [ ] `npx tsc --noEmit` passes

**Review agent checks:** Optimistic updates with rollback, selection state, bulk error handling, keyboard accessibility.

---

### Phase 7: Frontend Advanced — Progressions, Paces, Multi-Goal

**Goal:** Progression builder, pace profile editor, and full multi-goal UI.

**Context Slice:** Plan sections: "3.3 Progressive Intervals", "3.4 Adapting Training Paces", multi-goal component specs

**Input files to read:** Phase 5+6 output, Phase 2 output (progression, pace-profile, sub-goals APIs), Phase 4 (generators)

**Tasks:**
1. `Progression/` — ProgressionBuilder, ProgressionTimeline, ProgressionWeekCard, AiProgressionSuggest
2. `PaceProfile/` — PaceProfileEditor, PaceTimeline, HrZoneEditor
3. `MultiGoal/` — EventsPanel, EventCard, AddSubGoalDialog, EditSubGoalDialog, GoalTimeline, GoalTimelineMarker, PrioritySelector, MultiGoalPhaseLabel

**Acceptance criteria:**
- [ ] Progression builder: define weeks manually or via AI suggest
- [ ] Pace profile shows pace ranges adapting per phase
- [ ] Events panel lists all goals with priority badges
- [ ] Adding sub-goal triggers phase recalculation via API
- [ ] Timeline marker click scrolls to that week
- [ ] `npx tsc --noEmit` passes

**Review agent checks:** Progression math, pace calculation accuracy, timeline edge cases.

---

### Phase 8: Frontend — Mode Toggle, Guided, AI-Assisted, AI Analysis

**Goal:** Mode toggle with all 3 behaviors, guided panels, AI suggestions, full AI analysis panel.

**Context Slice:** Plan sections: "Mode Toggle", "3.5 AI Plan Analysis", "Guided Mode", "AI-Assisted Mode"

**Input files to read:** Phase 5+6+7 output, Phase 2+3 output (AI analysis API), `Web/src/components/admin/`

**Tasks:**
1. `Toolbar/ModeToggle.tsx` — 3-state segmented control
2. Mode persistence: localStorage default, Goal.guidanceLevel per-plan override
3. Guided mode: tip cards, "Suggest Week", GuidedPlanSession integration
4. AI-Assisted mode: proactive scan, inline suggestion cards
5. `AI/` — AiAnalysisPanel, PlanScoreGauge, WeekAnalysisCard, RiskFlagBadge, RaceReadinessCard, AiSuggestionCard
6. Add plan builder provider selector to existing admin AI settings tab

**Acceptance criteria:**
- [ ] Mode toggle persists per-plan
- [ ] Expert: no tips/suggestions; Guided: tip cards; AI-Assisted: inline suggestions
- [ ] AI analysis panel: score gauge, risk flags, race readiness
- [ ] "Apply" on suggestion card modifies the workout/week
- [ ] Switching modes is instant and non-destructive
- [ ] `npx tsc --noEmit` passes

**Review agent checks:** Mode state management, AI token budget enforcement, admin auth on config.

---

### Phase 9: CSV Import/Export UI + Polish + Integration

**Goal:** CSV wizard UI, keyboard shortcuts, performance, standard→advanced migration, premium gates, no-race UI.

**Context Slice:** Plan sections: "3.6 CSV Import/Export", "Key Technical Decisions"

**Input files to read:** Phase 3 output (CSV API), Phase 5+6 output, `Web/src/app/plan/`

**Tasks:**
1. `CsvImportExport/` — CsvImportDialog, CsvExportDialog, CsvPreview, FormatSelector
2. Install `papaparse`, `file-saver`
3. Performance: lazy load AI panel, code-split CSV, prefetch on scroll
4. Add "Open in Advanced Editor →" button to existing `/plan` page
5. No-race mode UI: hide race marker, MAINTAIN labels, Fitness Progress card
6. Premium tier gate: upsell page for non-premium
7. Mobile-responsive layout (tablet minimum)

**Acceptance criteria:**
- [ ] CSV import: upload → preview → confirm creates workouts
- [ ] CSV export: downloads correct format file
- [ ] "Open in Advanced Editor" on `/plan` works
- [ ] No-race plan displays correctly
- [ ] Non-premium users see upsell
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds

**Review agent checks:** CSV edge cases, bundle size, responsive breakpoints, premium gate bypass.

---

### Phase 10: Final Comprehensive Review

**Goal:** Full cross-phase validation, E2E testing, consistency check.

**Agent type:** Review agent only (no implementation).

**Input:** All `PHASE_N_COMPLETE.md` + `PHASE_N_REVIEW.md` files, full plan document, all created/modified files.

**Checks:**
1. **Schema consistency:** All models have proper relations, all enums used correctly
2. **API completeness:** Every route in the plan's directory tree exists
3. **Frontend completeness:** Every component in the plan's directory tree exists
4. **Cross-phase integration:** Frontend calls correct API endpoints, API uses correct Prisma models
5. **Type safety:** `npx tsc --noEmit` passes with zero errors
6. **Test coverage:** Unit tests for generators, CSV parser, bulk ops, pace calcs
7. **Build validation:** `npm run build` succeeds
8. **E2E scenarios:** Expert manual flow, Guided flow, AI-Assisted flow, mode switching, multi-goal (Ironman + HM + Oly Tri), multi-goal conflict, triathlon plan, ultra plan, no-race plan, standard→advanced migration, CSV round-trip
9. **Security:** Auth on all routes, admin check on admin routes, no exposed API keys
10. **Performance:** Calendar scroll smooth at 30+ weeks, mass edit preview < 500ms

**Output:** `FINAL_REVIEW.md` with PASS/FAIL per check, remaining issues, severity ratings.

---

### Phase Dependency Graph

```
Phase 1 (Schema)
    ↓
Phase 2 (Core API) ──→ Phase 3 (Advanced API)
    ↓                       ↓
Phase 4 (Generators) ←─────┘
    ↓
Phase 5 (Frontend Shell)
    ↓
Phase 6 (Frontend Editing)
    ↓
Phase 7 (Frontend Advanced) ──→ Phase 8 (Mode Toggle + AI)
    ↓                                ↓
Phase 9 (CSV + Polish) ←────────────┘
    ↓
Phase 10 (Final Review)
```

**Parallelizable:** Phases 2+4 can run in parallel (both depend only on Phase 1). Phase 3 depends on Phase 2 patterns but not output.

---

### Review Agent Template

Every review agent receives this prompt structure:

```
You are a code review agent. Your job is to validate Phase N of the Advanced Plan Builder.

## Your inputs:
1. The plan section for this phase (attached)
2. PHASE_N_COMPLETE.md — list of all files created/modified
3. All files listed in PHASE_N_COMPLETE.md

## Your task:
For each acceptance criterion:
1. Check if it is satisfied
2. If FAIL: describe exactly what's wrong and what file/line to fix
3. Rate severity: CRITICAL (blocks next phase) / MAJOR (must fix) / MINOR (can defer)

## Additional checks:
- No TODO/FIXME comments left in production code
- No console.log statements (use proper logging)
- All public APIs have JSDoc comments
- Error messages are user-friendly (no raw Prisma errors)
- No hardcoded strings that should be constants

## Output:
Create PHASE_N_REVIEW.md with:
- Summary: PASS / FAIL (with count of issues)
- Table: criterion | status | notes
- List of issues with file:line references
- Recommendation: PROCEED to next phase / REWORK needed
```

---

## Key Technical Decisions

### Virtual Scrolling
Use `@tanstack/react-virtual` for the week-by-week infinite scroll. Each "row" is a full week. Estimated row height: ~280px. Overscan: 3 weeks above and below viewport.

### State Management
- **Server state**: TanStack React Query (same as existing web app)
- **Local UI state**: React useState/useReducer for selection, edit modals
- **Optimistic updates**: For single workout edits, optimistic with rollback
- **Snapshot-based undo**: Server-side snapshots, not client-side state history

### Auto-Save
- Debounce: 500ms after last change
- Creates snapshot before every mutation batch
- Visual indicator: "Saving..." → "Saved" → (no indicator)
- **Snapshot limit (tier-based, 1/10 of AI chat monthly quota):**
  - tier1: 10 snapshots per goal
  - tier2: 30 snapshots per goal
  - tier3: 50 snapshots per goal
- Older snapshots pruned via background cron job
- Admin always has tier3 limits

### Premium Tier Access
- Check `UserAiSettings.usageTier` in `layout.tsx`
- If tier1 or none: show upsell page with feature preview
- If tier2/tier3: allow full access
- Admin-gated override: `isAdmin` always has access

### Performance
- Lazy load AI analysis panel
- Code-split CSV import/export (dynamic import)
- Prefetch next 4 weeks of data on scroll
- Debounce mass edit preview calculations
- Cache pace profile calculations

---

## Dependencies to Add

```json
{
  "@tanstack/react-virtual": "^3.x",
  "papaparse": "^5.x",           // CSV parsing
  "file-saver": "^2.x",          // CSV download
  "@dnd-kit/core": "existing",
  "@dnd-kit/sortable": "existing",
  "date-fns": "existing"
}
```

---

## Testing Strategy

- **Unit tests**: Plan generation for all race types (5K through ultra, all triathlon distances), CSV parsers, pace calculations (run + swim CSS + bike FTP), bulk operations, multi-sport weekly structure generation, multi-goal phase merging, sub-goal conflict resolution, volume adjustments during focus blocks
- **Integration tests**: API endpoints for all CRUD + bulk operations, GuidedPlanSession flow, AI analysis pipeline, sub-goal CRUD + phase recalculation
- **E2E tests**: 
  - Expert manual: create blank plan → add workouts → mass edit → undo → export CSV
  - Guided: create plan → toggle to Guided → interact with tip cards → dismiss tips → add workouts with guidance
  - AI-Assisted: create plan → toggle to AI → review inline suggestions → apply suggestion → toggle back to Expert → confirm suggestions hidden
  - Mode switching: create plan → toggle between all 3 modes → verify non-destructive behavior → verify persisted preference
  - Multi-goal: create plan with Ironman primary → add half marathon sub-goal (SECONDARY) → add Olympic tri sub-goal (TUNE_UP) → verify timeline shows all events → verify mini-taper weeks → verify recovery weeks → remove sub-goal → verify phase recalculation
  - Multi-goal conflict: add two sub-goals <3 weeks apart → verify conflict warning → verify merged focus blocks
  - Triathlon: create tri plan → brick workouts → multi-sport pace profile → export
  - Ultra: create ultra plan → back-to-back long runs → progression builder → AI analysis
- **Manual QA**: Calendar scroll performance, mass edit UX, AI analysis quality, triathlon workout editing, ultra long run scheduling, multi-goal timeline rendering, sub-goal phase transitions
