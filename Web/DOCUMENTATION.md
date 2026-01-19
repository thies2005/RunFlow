# RunFlow Documentation

> A comprehensive guide to the RunFlow running performance dashboard

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Metrics & Calculations](#4-metrics--calculations)
5. [API Reference](#5-api-reference)
6. [Component Architecture](#6-component-architecture)
7. [Strava Integration](#7-strava-integration)
8. [Training Plans](#8-training-plans)
9. [Development Guide](#9-development-guide)
10. [Deployment](#10-deployment)
11. [Troubleshooting](#11-troubleshooting)
12. [Mobile App (Capacitor)](#12-mobile-app-capacitor)

---

## 1. Project Overview

RunFlow is a production-grade **running performance dashboard** that combines structured training plans with deep analytics. It is designed for runners who want to:

- **Sync activities automatically** from Strava or Google Health Connect
- **Track fitness metrics** using scientifically-established models
- **Create training plans** for races (5K, 10K, Half Marathon, Marathon)
- **Analyze performance trends** and training effectiveness
- **Monitor training load** using CTL/ATL/TSB metrics

### 1.1 Key Features

| Feature | Description |
|---------|-------------|
| **Strava Integration** | OAuth authentication with real-time webhook support |
| **VDOT Calculator** | Based on Jack Daniels' Running Formula |
| **Fitness Metrics** | CTL (Chronic Training Load), ATL (Acute Training Load), TSB (Training Stress Balance) |
| **TRIMP** | Training Impulse calculation based on heart rate |
| **Running TSS** | Running-specific Training Stress Score |
| **Marathon Shape** | Predictive model for marathon readiness |
| **Training Plans** | Automated workout generation based on VDOT |

### 1.2 Technology Stack

```
Frontend/Backend:
  - Next.js 14 (App Router)
  - TypeScript (strict mode)
  - Tailwind CSS
  - React Query (@tanstack/react-query)
  - Recharts (data visualization)
  - next-themes (dark/light mode)

Database & ORM:
  - PostgreSQL 16
  - Prisma ORM

Authentication:
  - NextAuth.js
  - Strava OAuth
  - Email (Magic Code / Password)

Infrastructure:
  - Docker (multi-stage builds)
  - Docker Compose (orchestration)
  - Redis (rate limiting & locks)
```

---

## 2. Architecture

### 2.1 Directory Structure

```
RunFlow/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                     # Static assets
├── scripts/
│   ├── restore.sh             # Database restore script
│   └── entrypoint.sh          # Container entry point
├── android/                   # Native Android wrapper (Capacitor)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── analytics/     # Analytics endpoints
│   │   │   ├── sync/          # Strava sync
│   │   │   ├── webhooks/      # Strava webhooks
│   │   │   └── auth/          # NextAuth handlers
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── analytics/         # Analytics pages
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── analysis/          # Analysis charts
│   │   └── providers/         # Context providers
│   └── lib/                   # Core business logic
│       ├── metrics/           # Analytics calculations
│       │   ├── vdot.ts        # VDOT calculator
│       │   ├── fitness.ts     # CTL/ATL/TSB
│       │   ├── trimp.ts       # Heart rate training impulse
│       │   └── runalyze.ts    # Runalyze algorithms
│       ├── strava/            # Strava integration
│       ├── services/          # Business logic services
│       └── utils/             # Utility functions
├── tests/                     # Test files
├── docker-compose.yml         # Production deployment
├── docker-compose.dev.yml     # Development overrides
├── Dockerfile                 # Multi-stage container build
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── next.config.js             # Next.js configuration
```

### 2.2 Service Layer Architecture

RunFlow uses a **Service Layer Pattern** to separate business logic from API routes:

```
Request -> API Route -> Service Layer -> Prisma/Database -> Response
                    |
                    v
              Metrics Calculations
```

Key services:
- `src/lib/services/analytics.ts` - Analytics aggregation
- `src/lib/strava/sync.ts` - Strava synchronization
- `src/lib/services/plan.ts` - Training plan generation

### 2.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           RunFlow Data Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Strava  │───▶│ Webhook  │───▶│ Database │◀───│  Sync    │     │
│  │          │    │ Handler  │    │          │    │ Service  │     │
│  └──────────┘    └──────────┘    └────┬─────┘    └──────────┘     │
│                                      │                            │
│                                      ▼                            │
│                              ┌──────────────┐                      │
│                              │ Activities   │                      │
│                              │ with HR data │                      │
│                              └──────┬───────┘                      │
│                                     │                             │
│                                     ▼                             │
│                       ┌─────────────────────────┐                 │
│                       │   Metrics Calculation   │                 │
│                       │   (TRIMP, rTSS, VDOT)   │                 │
│                       └───────────┬─────────────┘                 │
│                                   │                               │
│                                   ▼                               │
│                       ┌─────────────────────────┐                 │
│                       │   Fitness Metrics       │                 │
│                       │   (CTL, ATL, TSB)       │                 │
│                       └───────────┬─────────────┘                 │
│                                   │                               │
│                                   ▼                               │
│                       ┌─────────────────────────┐                 │
│                       │   Dashboard Display     │                 │
│                       └─────────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───────│  Activity   │       │    Goal     │
├─────────────┤ 1   N ├─────────────┤ N   1 ├─────────────┤
│ id          │       │ id          │       │ id          │
│ email       │       │ stravaId    │       │ name        │
│ stravaId    │       │ type        │       │ raceType    │
│ hrMax       │       │ distance    │       │ raceDate    │
│ hrRest      │       │ movingTime  │       │ targetTime  │
│ weight      │       │ averageHr   │       │ isActive    │
│ ...         │       │ trimp       │       │ ...         │
├─────────────┤       │ runningTss  │       ├─────────────┤
│ DailyFitness│       │ estimatedVdot│      │ Workout     │
├─────────────┤       │ ...         │ 1   N ├─────────────┤
│ userId      │       └─────────────┘       │ id          │
│ date        │                              │ goalId      │
│ ctl         │                              │ workoutType │
│ atl         │                              │ description │
│ tsb         │                              │ isCompleted │
└─────────────┘                              └─────────────┘
```

### 3.2 User Model

The `User` model stores athlete profile information and authentication:

```prisma
model User {
  // Identity
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  image         String?

  // Strava OAuth
  stravaId              String?   @unique
  stravaAccessToken     String?
  stravaRefreshToken    String?
  stravaTokenExpiry     DateTime?

  // Athlete Profile (for calculations)
  sex           Sex       @default(MALE)
  birthDate     DateTime?
  hrMax         Int?      // Maximum heart rate
  hrRest        Int?      // Resting heart rate
  weight        Float?    // kg
  height        Float?    // cm

  // HR Zone thresholds (% of hrMax)
  hrZone1Max    Int       @default(60)  // Z1: Recovery
  hrZone2Max    Int       @default(70)  // Z2: Endurance
  hrZone3Max    Int       @default(80)  // Z3: Tempo
  hrZone4Max    Int       @default(90)  // Z4: Threshold
  // Z5: 90%+ (VO2max)
  // RunFlow uses a 7-Zone model internally mapping these 5 values.
  // Z6 (Anaerobic) and Z7 (Neuromuscular) are derived above Z5.

  // VDOT Correction
  vdotCorrectionFactor    Float     @default(1.0)
  vdotReferenceRaceDate   DateTime?
  vdotReferenceRaceTime   Int?      // seconds
  vdotReferenceRaceType   String?   // "5K", "10K", "HALF", "MARATHON"

  // Sync Status
  lastSyncAt     DateTime?
  syncInProgress Boolean   @default(false)

  // Relations
  activities     Activity[]
  goals          Goal[]
  DailyFitness   DailyFitness[]
}
```

### 3.3 Activity Model

Stores synchronized Strava activities:

```prisma
model Activity {
  id              String       @id @default(cuid())
  userId          String
  stravaId        BigInt       @unique

  // Activity Type
  type            ActivityType // RUN, RIDE, SWIM, etc.
  sportType       String?

  // Basic Metrics
  name            String
  description     String?
  startDate       DateTime
  timezone        String?
  distance        Float        // meters
  movingTime      Int          // seconds
  elapsedTime     Int          // seconds

  // Speed
  averageSpeed        Float?   // m/s
  maxSpeed            Float?   // m/s
  gradeAdjustedSpeed  Float?   // m/s (GAP)

  // Heart Rate
  averageHr       Float?
  maxHr           Int?
  averageCadence  Float?      // spm
  hasHeartrate    Boolean     @default(false)

  // Elevation
  totalElevation  Float?      // meters gained
  elevHigh        Float?
  elevLow         Float?
  calories        Float?

  // Calculated Metrics
  trimp           Float?      // HR-based training impulse
  runningTss      Float?      // Running-specific stress
  estimatedVdot   Float?      // VDOT from this activity

  // HR Zone Breakdown (seconds)
  hrZone1Time     Int?
  hrZone2Time     Int?
  hrZone3Time     Int?
  hrZone4Time     Int?
  hrZone5Time     Int?

  // Raw Data
  rawJson         Json?
  streams         Json?       // time, hr, distance, altitude, velocity

  // Classification
  trainingType    WorkoutType? // Auto-tagged or manual

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

### 3.4 DailyFitness Model

Cached daily fitness metrics for performance:

```prisma
model DailyFitness {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime

  // Metrics (pre-calculated)
  ctl         Float    @default(0)   // Chronic Training Load
  atl         Float    @default(0)   // Acute Training Load
  tsb         Float    @default(0)   // Training Stress Balance
  ctlRunning  Float    @default(0)   // Running-only CTL

  // Daily Load (source data)
  trimp       Float    @default(0)
  runningTss  Float    @default(0)

  @@unique([userId, date])
}
```

### 3.5 Goal & Workout Models

Training plan structure:

```prisma
model Goal {
  id              String      @id @default(cuid())
  userId          String

  // Race Details
  name            String
  raceType        RaceType    // FIVE_K, TEN_K, HALF_MARATHON, MARATHON
  raceDate        DateTime
  targetTime      Int?        // seconds

  // Predictions
  currentVdot         Float?
  predictedTime       Int?    // seconds
  marathonShapeFactor Float   @default(1.0)

  // Plan Settings
  weeklyMileageGoal  Float?   // km/week at peak
  planWeeks          Int      @default(12)
  runsPerWeek        Int      @default(4)
  ridesPerWeek       Int      @default(0)
  strengthPerWeek    Int      @default(0)
  swimsPerWeek       Int      @default(0)

  // Phase Customization
  taperWeeks    Int         @default(2)
  peakWeeks     Int         @default(4)
  buildWeeks    Int         @default(4)

  // Preferred Days
  longRunDay    Int         @default(0) // Sunday
  workoutDay    Int         @default(3) // Wednesday
  restDays      Json        @default("[1, 5]")

  // Status
  isActive      Boolean     @default(true)
  completedAt   DateTime?

  workouts      Workout[]
}

model Workout {
  id              String      @id @default(cuid())
  goalId          String

  scheduledDate   DateTime
  workoutType     WorkoutType // EASY, LONG_RUN, TEMPO, INTERVALS, etc.
  description     String

  targetDistance  Float?      // meters
  targetDuration  Int?        // seconds
  targetPace      Float?      // sec/km
  targetHrZone    Int?        // 1-5

  isCompleted     Boolean     @default(false)
  completedAt     DateTime?
  linkedActivityId String?    // Links to actual Activity

  goal            Goal        @relation(fields: [goalId], ...)
}
```

### 3.6 Enums

```typescript
enum Sex {
  MALE
  FEMALE
}

enum ActivityType {
  RUN
  VIRTUAL_RIDE
  RIDE
  WALK
  HIKE
  SWIM
  WORKOUT
  OTHER
}

enum RaceType {
  FIVE_K
  TEN_K
  HALF_MARATHON
  MARATHON
}

enum WorkoutType {
  EASY           // Easy run
  LONG_RUN       // Long run
  TEMPO          // Tempo run
  INTERVALS      // Interval training
  REPETITIONS    // Repetition training
  RECOVERY       // Recovery run
  RACE           // Race
  REST           // Rest day
  CROSS_TRAIN    // Cross-training
  RIDE           // Cycling
  SWIM           // Swimming
  STRENGTH       // Strength training
  OTHER          // Other
}
```

---

## 4. Metrics & Calculations

### 4.1 VDOT (VDOT Calculator)

**Source**: `src/lib/metrics/vdot.ts`

Based on **Jack Daniels' Running Formula** (Daniels-Gilbert formula).

#### Calculation Formula

```typescript
// Velocity in meters per minute
const velocity = distanceMeters / timeMinutes;

// Oxygen cost (ml/kg/min)
const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity²;

// %VO2max sustained for this duration
const percentVO2max = 0.8 +
  0.1894393 * e^(-0.012778 * timeMinutes) +
  0.2989558 * e^(-0.1932605 * timeMinutes);

// VDOT = VO2 / %VO2max
const vdot = vo2 / percentVO2max;
```

#### Training Paces

| Pace Type | %VO2max | Description |
|-----------|---------|-------------|
| E (Easy) | 65-79% | Easy/recovery running |
| M (Marathon) | ~78% | Marathon pace |
| T (Threshold) | 88% | Lactate threshold |
| I (Interval) | 100% | VO2max intervals |
| R (Repetition) | 105% | Speed/repetitions |

#### Usage Example

```typescript
import { calculateVdot, analyzeRace, formatPace } from '@/lib/metrics/vdot';

// Calculate VDOT from a race result
const vdot = calculateVdot({
  distance: '10K',
  timeSeconds: 2700 // 45:00
});
// => vdot ≈ 45.0

// Get full analysis
const analysis = analyzeRace({ distance: '5K', timeSeconds: 1500 });
// => {
//      vdot: 42.5,
//      predictions: { '5K': 1500, '10K': 3150, HALF: 6990, MARATHON: 14700 },
//      trainingPaces: { easy: {...}, marathon: 330, threshold: 280, ... }
//    }

// Format pace
formatPace(330); // "5:30/km"
```

### 4.2 Fitness Metrics (CTL/ATL/TSB)

**Source**: `src/lib/metrics/fitness.ts`

Based on **Banister's Impulse-Response Model**.

#### Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| CTL (Chronic Training Load) | 42-day EWMA of TRIMP | Represents fitness |
| ATL (Acute Training Load) | 7-day EWMA of TRIMP | Represents fatigue |
| TSB (Training Stress Balance) | CTL - ATL | Represents form/freshness |

#### Calculation

```typescript
// Decay factors
const CTL_DECAY = exp(-1/42);  // ~0.9765
const ATL_DECAY = exp(-1/7);   // ~0.8669

// Daily update
ctl = ctl * CTL_DECAY + trimp * (1 - CTL_DECAY);
atl = atl * ATL_DECAY + trimp * (1 - ATL_DECAY);
tsb = ctl - atl;
```

#### TSB Interpretation

| TSB Range | Status | Description |
|-----------|--------|-------------|
| >= +25 | Peaked | Ready to race! |
| +5 to +24 | Fresh | Good form |
| -10 to +4 | Neutral | Optimal training zone |
| -30 to -11 | Fatigued | Monitor recovery |
| < -30 | Very Fatigued | Risk of overtraining |

### 4.3 TRIMP (Training Impulse)

**Source**: `src/lib/metrics/trimp.ts`

TRIMP measures training load based on heart rate duration.

#### Calculation

```typescript
// For activities with HR data
const avgHrRatio = (avgHr - hrRest) / (hrMax - hrRest);
const durationMinutes = movingTime / 60;
const trimp = durationMinutes * avgHrRatio * 0.64 * exp(avgHrRatio * 1.92);
```

#### HR Zone Contributions

```typescript
// Zone time in seconds
const trimp = (zone1Time * 0.2) + (zone2Time * 0.4) +
              (zone3Time * 0.6) + (zone4Time * 0.8) + (zone5Time * 1.0);
```

### 4.4 Running TSS

**Source**: `src/lib/metrics/fitness.ts`

Running-specific Training Stress Score.

```typescript
// Intensity Factor = threshold_pace / actual_pace
const intensityFactor = thresholdPaceSecPerKm / actualPace;

// rTSS = duration_hours × IF² × 100
const tss = durationHours * intensityFactor² * 100;
```

### 4.5 Activity Contribution

Different activities contribute differently to training load:

| Activity Type | CTL | Running TSS | Category |
|---------------|-----|-------------|----------|
| Run, VirtualRun, TrailRun | Yes | Yes | Running |
| Ride, VirtualRide | Yes | No | Cycling |
| Swim, Rowing, Elliptical | Yes | No | Cross-training |
| Walk, Hike | Yes | No | Light activity |

---

## 5. API Reference

### 5.1 Authentication

All API routes use NextAuth.js session authentication.
Supports:
- **Strava OAuth**: For main activity syncing.
- **Email/Password**: Traditional login.
- **Magic Link**: Passwordless login via email.

```
GET /api/auth/signin  - Sign in page
GET /api/auth/signout - Sign out
GET /api/auth/session - Get current session
POST /api/auth/callback/credentials - Email login
```

### 5.2 Dashboard API

#### GET /api/dashboard

Returns unified dashboard data.

**Response:**
```typescript
{
  stats: {
    currentWeekMileage: number;      // km
    lastSyncAt: string | null;       // ISO date
    syncInProgress: boolean;
    totalActivities: number;
  };
  recentActivities: ActivityListItem[];
  activeGoals: Goal[];
  todayWorkout: WorkoutWithLinkedActivity | null;
}
```

### 5.3 Sync API

#### POST /api/sync

Triggers Strava activity synchronization.

**Rate Limiting:** 100 requests per 15 minutes

**Response:**
```typescript
{
  success: boolean;
  synced: number;              // Activities synced
  total: number;               // Total activities
  message: string;
}
```

#### GET /api/sync/status

Returns current sync status.

**Response:**
```typescript
{
  syncInProgress: boolean;
  lastSyncAt: string | null;
  totalActivities: number;
}
```

### 5.4 Webhooks API

#### POST /api/webhooks/strava

Handles Strava webhook events.

**Events:**
- `create` - New activity created
- `update` - Activity updated
- `delete` - Activity deleted

**Validation:** Uses `STRAVA_VERIFY_TOKEN` for signature verification.

### 5.5 Analytics API

#### GET /api/analytics/stats

Returns detailed analytics statistics.

**Response:**
```typescript
{
  currentWeekMileage: number;
  effectiveVO2max: number;
  rawVO2max: number;
  vdotCorrectionFactor: number;
  marathonShape: {
    shape: number;           // 0-100 score
    mileageScore: number;
    longRunScore: number;
    crossTrainingScore: number;
    details: { ... };
  };
  currentVdot: number | null;
  ctl: number;
  atl: number;
  tsb: number;
  workloadRatio: number;     // ATL/CTL
  easyTrimp: number;         // Z1+Z2 TRIMP
  hrMax?: number;
}
```

#### GET /api/analytics/history?days=90

Returns fitness history for charting.

**Response:**
```typescript
{
  history: Array<{
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
  }>;
}
```

### 5.6 Activities API

#### GET /api/activities?limit=20&offset=0

Returns paginated activity list.

**Query Parameters:**
- `limit` (default: 20) - Items per page
- `offset` (default: 0) - Pagination offset
- `type` (optional) - Filter by activity type

**Response:**
```typescript
{
  activities: ActivityListItem[];
  total: number;
  limit: number;
  offset: number;
}
```

#### POST /api/activities/manual

Create a manual activity (not from Strava).

**Request:**
```typescript
{
  name: string;
  type: ActivityType;
  distance: number;         // meters
  movingTime: number;       // seconds
  averageHr?: number;
  startDate: string;        // ISO date
}
```

#### PUT /api/activities/[id]

Update an activity (mainly for training type overrides).

**Request:**
```typescript
{
  trainingType: WorkoutType | null;
}
```

#### DELETE /api/activities/[id]

Delete an activity.

### 5.7 Goals API

#### GET /api/goals

Returns all user goals.

**Response:**
```typescript
{
  goals: Goal[];
}
```

#### POST /api/goals

Create a new goal/training plan.

**Request:**
```typescript
{
  name: string;
  raceType: RaceType;
  raceDate: string;         // ISO date
  targetTime?: number;      // seconds
  weeklyMileageGoal?: number; // km
  planWeeks?: number;
  runsPerWeek?: number;
  ridesPerWeek?: number;
  strengthPerWeek?: number;
  swimsPerWeek?: number;
  longRunDay?: number;      // 0=Sunday, ..., 6=Saturday
  workoutDay?: number;
  restDays?: number[];
}
```

#### PUT /api/goals/[id]

Update a goal.

#### DELETE /api/goals/[id]

Delete a goal and all associated workouts.

### 5.8 Workouts API

#### GET /api/goals/[goalId]/workouts

Get all workouts for a goal.

**Response:**
```typescript
{
  workouts: WorkoutWithLinkedActivity[];
}
```

#### PUT /api/workouts/[id]

Update a workout.

**Request:**
```typescript
{
  workoutType?: WorkoutType;
  description?: string;
  targetDistance?: number;
  targetDuration?: number;
  targetPace?: number;
  targetHrZone?: number;
  isCompleted?: boolean;
  linkedActivityId?: string | null;
}
```

### 5.9 Settings API

#### GET /api/settings/profile

Get user profile and settings.

**Response:**
```typescript
{
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    hrMax: number | null;
    hrRest: number | null;
    weight: number | null;
    height: number | null;
    hrZone1Max: number;
    hrZone2Max: number;
    hrZone3Max: number;
    hrZone4Max: number;
    vdotCorrectionFactor: number;
  };
}
```

#### PUT /api/settings/profile

Update user profile.

**Request:**
```typescript
{
  hrMax?: number;
  hrRest?: number;
  weight?: number;
  height?: number;
  hrZone1Max?: number;
  hrZone2Max?: number;
  hrZone3Max?: number;
  hrZone4Max?: number;
  vdotCorrectionFactor?: number;
}
```

---

## 6. Component Architecture

### 6.1 Component Tree

```
App
├── Providers
│   ├── ThemeProvider
│   ├── UserMetricsProvider
│   └── NotificationProvider
├── Dashboard
│   ├── RaceCountdown
│   ├── TodayWorkout
│   ├── TrainingStatusCard (CTL/ATL/TSB)
│   ├── WorkoutScheduleCard
│   └── ActivityList
├── Analytics
│   ├── AnalyticsDashboard
│   ├── CombinedAnalyticsChart
│   ├── FitnessChart (CTL/ATL/TSB over time)
│   └── RacePredictionChart
└── Modals
    ├── ProfileModal
    ├── SettingsModal
    ├── EditWorkoutModal
    ├── ActivityDetailsModal
    └── ShapeCalibrationModal
```

### 6.2 Key Components

#### AnalyticsDashboard (`src/components/AnalyticsDashboard.tsx`)

Main analytics view with all metrics and charts.

**Features:**
- VDOT display with calibration
- Marathon Shape score
- CTL/ATL/TSB cards with color-coded status
- Fitness trend chart
- Race prediction chart
- Weekly mileage chart

#### FitnessChart (`src/components/FitnessChart.tsx`)

Uses Recharts to display CTL/ATL/TSB over time.

**Props:**
```typescript
interface FitnessChartProps {
  data: Array<{
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
  }>;
  height?: number;
}
```

#### WorkoutScheduleCard (`src/components/dashboard/WorkoutScheduleCard.tsx`)

Displays weekly workout schedule with edit capabilities.

**Features:**
- Drag-and-drop reordering (via @dnd-kit)
- Inline editing of workouts
- Linking to actual activities
- Completion status

#### TrainingStatusCard (`src/components/dashboard/TrainingStatusCard.tsx`)

Shows current fitness metrics with color-coded status.

**Status Colors:**
- Green (Peaked): TSB >= +25
- Lime (Fresh): TSB >= +5
- Yellow (Neutral): TSB >= -10
- Orange (Fatigued): TSB >= -30
- Red (Very Fatigued): TSB < -30

#### ActivityDetailsModal (`src/components/ActivityDetailsModal.tsx`)

Detailed view of a single activity.

**Features:**
- Basic metrics (distance, time, pace)
- Heart rate zones
- Elevation chart
- Interactive streams chart (if data available)
- Training type classification

### 6.3 Context Providers

#### UserMetricsProvider (`src/components/providers/UserMetricsProvider.tsx`)

Provides user metrics (HR zones, VDOT correction) to all child components.

```typescript
const UserMetricsContext = {
  hrMax: number | null;
  hrRest: number | null;
  vdotCorrectionFactor: number;
  updateUserMetrics: (data: Partial<UserMetrics>) => Promise<void>;
};
```

#### ThemeProvider (`src/components/providers/ThemeProvider.tsx`)

Manages dark/light mode using `next-themes`.

---

## 7. Strava Integration

### 7.1 OAuth Flow

```
1. User clicks "Connect with Strava"
2. Redirect to Strava authorization page
3. User approves access
4. Strava redirects to callback with code
5. NextAuth exchanges code for tokens
6. Tokens stored in User model
```

### 7.2 Scopes Required

- `read:activity` - Read activities
- `activity:read_all` - Access all activities (not just recent)
- `profile:read_all` - Read athlete profile

### 7.3 Webhook Setup

Strava does not provide a UI for webhook subscription. Use `curl`:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=https://your-domain.com/api/webhooks/strava \
  -d verify_token=YOUR_VERIFY_TOKEN
```

**Verify Webhook Subscription:**

```bash
curl -X GET https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

### 7.4 Rate Limiting

Strava API limits:
- **Standard**: 100 requests per 15 minutes
- **Premium**: 1000 requests per 15 minutes

RunFlow implements:
- In-memory rate limiting
- Request queuing for large syncs
- Exponential backoff on errors

### 7.5 Token Refresh

Strava access tokens expire after 6 hours. RunFlow automatically:

1. Detects expired tokens via API errors
2. Uses refresh token to get new access token
3. Updates User model with new tokens
4. Retries the failed request

---

## 8. Training Plans

### 8.1 Plan Phases

RunFlow training plans follow a periodized approach:

```
┌─────────────────────────────────────────────────────┐
│                    TRAINING PLAN                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  BASE   │  │  BUILD  │  │  PEAK   │  │  TAPER  │ │
│  │ Phase   │  │ Phase   │  │ Phase   │  │ Phase   │ │
│  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤ │
│  │ ~40%    │  │ ~35%    │  │ ~15%    │  │ ~10%    │ │
│  │ Easy    │  │ Tempo/  │  │ Inter-  │  │ Easy    │ │
│  │ +       │  │ Intervals│ vals    │  │ sharpen-│ │
│  │ Long    │  │         │  │         │  │ ing     │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 8.2 Workout Generation

Workouts are generated based on:

1. **User's VDOT** - Determines paces for all workouts
2. **Race Type** - Dictates the mix of workout types
3. **Plan Duration** - Affects phase lengths
4. **Weekly Mileage Goal** - Scales workout distances
5. **Preferred Days** - User's available training days

### 8.3 Workout Types

| Type | Purpose | Typical Content |
|------|---------|-----------------|
| EASY | Build aerobic base | 4-8 km @ easy pace |
| LONG_RUN | Endurance | 12-32 km @ easy/marathon pace |
| TEMPO | Lactate threshold | 4-10 km @ threshold pace |
| INTERVALS | VO2max | 5x1km @ interval pace |
| REPETITIONS | Speed/economy | 10x200m @ repetition pace |
| RECOVERY | Active recovery | 3-5 km very easy |
| RACE | Taper/race | Race pace efforts |

### 8.4 Cross-Training

Cross-training activities are scheduled based on user preferences:

- **RIDE** - Cycling (indoor/outdoor)
- **SWIM** - Swimming
- **STRENGTH** - Strength training
- **CROSS_TRAIN** - Other activities

These contribute to CTL but not to running-specific TSS.

---

## 9. Development Guide

### 9.1 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- Strava API credentials

### 9.2 Local Development

```bash
# Clone repository
git clone https://github.com/thies2005/RunFlow.git
cd RunFlow

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
nano .env

# Set up database
docker compose up -d db
npm run db:push

# Run development server
npm run dev
```

Development server runs at `http://localhost:3000`

### 9.3 Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- vdot.test.ts
```

### 9.4 Database Operations

```bash
# Push schema changes (dev)
npm run db:push

# Generate Prisma client
npm run db:generate

# Open Prisma Studio
npm run db:studio
```

### 9.5 Code Style

RunFlow uses:
- **TypeScript** strict mode
- **ESLint** with Next.js config
- **Prettier** for formatting (recommended)

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### 9.6 Adding New Metrics

To add a new calculated metric:

1. **Create calculation function** in `src/lib/metrics/`
2. **Add TypeScript type** in `src/lib/types.ts`
3. **Update analytics service** to calculate the metric
4. **Add database field** if caching is needed (Prisma schema)
5. **Create UI component** to display the metric

Example structure:

```typescript
// src/lib/metrics/newMetric.ts
export function calculateNewMetric(input: MetricInput): number {
  // Calculation logic
  return result;
}

// src/lib/services/analytics.ts
export async function getAnalytics(userId: string) {
  // ...
  const newMetric = calculateNewMetric(data);
  return { ..., newMetric };
}
```

---

## 10. Deployment

### 10.1 Production Build

```bash
# Build and start all services
docker compose up -d --build
```

This builds:
- `app` - Next.js application
- `db` - PostgreSQL database
- `migrator` - Database schema migration
- `backup` - Automated backups
- `tunnel` - Cloudflare Tunnel (optional)

### 10.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Your application URL |
| `NEXTAUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `STRAVA_CLIENT_ID` | Yes | From Strava API settings |
| `STRAVA_CLIENT_SECRET` | Yes | From Strava API settings |
| `STRAVA_VERIFY_TOKEN` | Yes | Custom string for webhook validation |
| `DATABASE_URL` | Optional | Default: `postgresql://runflow:runflow@db:5432/runflow` |
| `ENCRYPTION_KEY` | Optional | For encrypting Strava tokens |
| `TUNNEL_TOKEN` | Optional | Cloudflare Tunnel token |
| `POSTGRES_USER` | Optional | Default: `runflow` |
| `POSTGRES_PASSWORD` | Optional | Default: `runflow` |
| `POSTGRES_DB` | Optional | Default: `runflow` |

### 10.3 Backup Strategy

Automated backups run every 6 hours and retain:
- **Daily backups**: 7 days
- **Weekly backups**: 4 weeks
- **Monthly backups**: 6 months

Backups are stored in `./backups` directory.

**Restore from backup:**

```bash
./scripts/restore.sh "backup_file_name.sql.gz"
```

### 10.4 Cloudflare Tunnel (Optional)

For secure access without port forwarding:

1. Create a Cloudflare Tunnel
2. Get the tunnel token
3. Add `TUNNEL_TOKEN` to `.env`
4. The tunnel service will start automatically

### 10.5 Updating

```bash
# Pull latest changes
git pull origin master

# Rebuild and restart
docker compose up -d --build
```

### 10.6 Platform Support

RunFlow builds natively for:
- `linux/amd64` - Standard servers/VPS
- `linux/arm64` - ARM servers (e.g., Raspberry Pi 4, Oracle Cloud ARM)

Buildx automatically creates multi-architecture images.

---

## 11. Troubleshooting

### 11.1 Sync Issues

**Problem:** Activities not syncing from Strava

**Solutions:**
1. Check Strava token is valid: Look at `stravaTokenExpiry` in database
2. Manually trigger sync: Use sync button in dashboard
3. Verify webhook is subscribed: Use curl to check subscription
4. Check rate limiting: Wait 15 minutes if limit exceeded

### 11.2 VDOT Calculations

**Problem:** VDOT seems incorrect

**Solutions:**
1. Ensure heart rate data is available for activities
2. Verify HR zones are configured correctly in settings
3. Check if VDOT correction factor is applied
4. Calibrate using a known race result

### 11.3 Database Issues

**Problem:** Database connection errors

**Solutions:**
1. Verify database is healthy: `docker compose ps`
2. Check database logs: `docker compose logs db`
3. Restart database: `docker compose restart db`
4. Verify DATABASE_URL is correct

### 11.4 Build Errors

**Problem:** Docker build fails

**Solutions:**
1. Clear Docker cache: `docker builder prune -a`
2. Check for sufficient disk space
3. Verify network connectivity for npm downloads
4. Try building without cache: `docker compose build --no-cache`

### 11.5 Webhook Validation

**Problem:** Strava webhook not validating

**Solutions:**
1. Verify STRAVA_VERIFY_TOKEN matches in both `.env` and Strava subscription
2. Ensure webhook URL is publicly accessible (not localhost)
3. Check Strava API application settings for correct callback domain
4. Test webhook manually using Strava's "Send test event" button

---

## Appendix

### A. Metrics Formulas Reference

#### VDOT (Daniels-Gilbert)
```
VO2 = -4.60 + 0.182258v + 0.000104v²
%VO2max = 0.8 + 0.1894393e^(-0.012778t) + 0.2989558e^(-0.1932605t)
VDOT = VO2 / %VO2max
```
where v = velocity (m/min), t = time (min)

#### TRIMP (Banister)
```
TRIMP = t × HR_ratio × 0.64e^(1.92 × HR_ratio)
HR_ratio = (HR_avg - HR_rest) / (HR_max - HR_rest)
```

#### Running TSS
```
TSS = t(h) × IF² × 100
IF = pace_threshold / pace_actual
```

#### Fitness (Exponential Weighted Moving Average)
```
CTL_today = CTL_yesterday × e^(-1/42) + TRIMP × (1 - e^(-1/42))
ATL_today = ATL_yesterday × e^(-1/7) + TRIMP × (1 - e^(-1/7))
TSB = CTL - ATL
```

### B. Links

- **Jack Daniels' Running Formula**: Book by Jack Daniels
- **Banister Impulse-Response Model**: Original research on training load
- **Strava API Documentation**: https://developers.strava.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs

---

## 12. Mobile App (Capacitor)

RunFlow uses **Capacitor** to wrap the Next.js web application into a native Android app. This allows for a unified codebase while leveraging native device features.

### 12.1 Health Connect Integration

The mobile app integrates with **Google Health Connect** to sync workouts from other apps (like Garmin, Peloton, etc.) directly into RunFlow.

- **Plugin**: `@capacitor-community/health-connect` (or similar wrapper)
- **Data Flow**: `Health Connect -> Android App -> RunFlow Web API` -> Database
- **Sync Logic**: Checks for new activities on app launch or manual sync trigger.

### 12.2 Build Process

To build the Android app:

```bash
# 1. Build the Next.js web app (static export)
npm run build

# 2. Sync with Capacitor
npx cap sync

# 3. Open Android Studio to build APK/Bundle
npx cap open android
```

---

**RunFlow v1.2.0** | https://github.com/thies2005/RunFlow
