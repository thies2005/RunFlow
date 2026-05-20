# RunFlow Plan Generation API — Agent Evaluation Dataset Prompt

Use the prompt below with an AI agent to generate a comprehensive evaluation dataset for RunFlow's plan creation performance.

---

## Full Agent Prompt

```
You are building an evaluation dataset to benchmark the quality of RunFlow's AI-powered training plan generation API. Your job is to produce a JSON dataset of diverse test cases that cover every code path, edge case, and quality criterion the plan generator must satisfy. The dataset will be used to call the live API, collect responses, and score them automatically.

## 1. System Overview

RunFlow is a running and triathlon coaching platform. Its Next.js backend exposes a **public plan generation endpoint** that requires no authentication and returns a full multi-week training plan given a few inputs. There is also an **authenticated API** for creating richer plans with more parameters.

### 1.1 Public Plan Generation Endpoint

```
POST /api/public/plan/generate
Content-Type: application/json
```

**Rate limit:** 10 requests per hour per client IP.

**Request body:**

```json
{
  "raceType": "MARATHON",
  "raceDate": "2026-09-15",
  "fitnessLevel": "intermediate",
  "runsPerWeek": 4,
  "weeklyVolumeKm": 50
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `raceType` | string enum | **yes** | One of: `FIVE_K`, `TEN_K`, `HALF_MARATHON`, `MARATHON`, `FIFTY_K`, `FIFTY_MILE`, `HUNDRED_K`, `HUNDRED_MILE`, `SPRINT_TRI`, `OLYMPIC_TRI`, `HALF_IRONMAN`, `FULL_IRONMAN` |
| `raceDate` | string (ISO date) | **yes** | Must be a future date in `YYYY-MM-DD` format |
| `fitnessLevel` | string enum | **yes** | One of: `beginner`, `intermediate`, `advanced` |
| `runsPerWeek` | integer | no | 2–7. Defaults vary by race type (see §2) |
| `weeklyVolumeKm` | number | no | 10–200 km. Defaults vary by race type (see §2) |

**Fitness level to VDOT mapping:**

| fitnessLevel | VDOT |
|---|---|
| `beginner` | 30 |
| `intermediate` | 40 |
| `advanced` | 50 |

**Success response** (200):

```json
{
  "plan": {
    "raceType": "marathon",
    "raceDate": "2026-09-15",
    "fitnessLevel": "intermediate",
    "vdot": 40,
    "totalWeeks": 16,
    "totalDistanceKm": "687.3",
    "runsPerWeek": 4,
    "weeks": [
      {
        "weekNumber": 0,
        "phase": "BASE",
        "totalDistanceKm": "30.5",
        "workouts": [
          {
            "date": "2026-05-25",
            "dayOfWeek": "Mon",
            "type": "EASY",
            "description": "Easy run – 6.1 km at 6:10/km",
            "displayDescription": "Easy run – 6.1 km at 6:10/km",
            "distanceKm": "6.1",
            "durationMin": "38min",
            "pace": "6:10/km",
            "phase": "BASE",
            "intensityZone": null
          }
        ]
      }
    ]
  }
}
```

**Error responses:**

| Status | When |
|---|---|
| 400 | Invalid input (validation error) or race date not in the future |
| 429 | Rate limit exceeded (includes `retryAfter` field) |
| 500 | Server error during plan generation |

### 1.2 Public Plan Export Endpoint

```
POST /api/public/plan/export
Content-Type: application/json
```

**Rate limit:** 20 requests per hour per client IP.

Accepts the full plan object returned by the generate endpoint and exports it as CSV or HTML.

**Request body:**

```json
{
  "format": "csv",
  "plan": { ... }
}
```

`format` is either `"csv"` or `"html"`.

### 1.3 Authenticated Plan Creation Endpoint

```
POST /api/goals
Authorization: session cookie (NextAuth)
Content-Type: application/json
```

This endpoint supports the full set of plan configuration parameters:

```json
{
  "name": "Berlin Marathon 2026",
  "raceType": "MARATHON",
  "raceDate": "2026-09-27T00:00:00.000Z",
  "targetTime": 12600,
  "weeklyMileageGoal": 60000,
  "planWeeks": 16,
  "runsPerWeek": 5,
  "ridesPerWeek": 0,
  "strengthPerWeek": 1,
  "swimsPerWeek": 0,
  "taperWeeks": 2,
  "peakWeeks": 3,
  "buildWeeks": 4,
  "maxLongRunKm": 32,
  "longRunDay": 6,
  "workoutDay": 3,
  "restDays": [1, 5],
  "sport": "RUN",
  "planStartDate": "2026-06-01T00:00:00.000Z",
  "planSource": "standard"
}
```

| Field | Type | Description |
|---|---|---|
| `name` | string (1–255) | Plan display name |
| `raceType` | enum (see §2) | Any RaceType including ultra and custom |
| `raceDate` | ISO datetime | Must be in the future |
| `targetTime` | integer (seconds) | Target finish time |
| `weeklyMileageGoal` | integer (meters) | e.g. 58000 = 58 km |
| `planWeeks` | integer | Total plan duration |
| `runsPerWeek` | integer (0–7) | Running sessions per week |
| `ridesPerWeek` | integer (0–7) | Cycling sessions |
| `strengthPerWeek` | integer (0–7) | Strength sessions |
| `swimsPerWeek` | integer (0–7) | Swim sessions |
| `taperWeeks` | integer | Taper phase duration |
| `peakWeeks` | integer | Peak phase duration |
| `buildWeeks` | integer | Build phase duration |
| `maxLongRunKm` | integer (6–200) | Maximum long run distance |
| `longRunDay` | integer (0–6) | 0=Sunday, 6=Saturday |
| `workoutDay` | integer (0–6) | Quality session day |
| `restDays` | integer[] (0–6) | Rest day(s) in the week |
| `sport` | `"RUN"` or `"TRIATHLON"` | Plan sport type |
| `planStartDate` | ISO datetime | When the plan begins |
| `planSource` | string | `"standard"`, `"advanced"`, etc. |
| `calibrationTime` | integer (seconds) | Recent race time for VDOT calibration |
| `calibrationDistance` | `"5K"\|"10K"\|"HALF"\|"MARATHON"` | Calibration race distance |
| `backyardLoopDistM` | number | Backyard ultra loop distance in meters |
| `targetLaps` | integer | Target laps for backyard ultra |
| `customDistanceM` | number | Custom race distance in meters |

### 1.4 External API (API Key Auth, Read-Only)

All endpoints below require an API key via `Authorization: Bearer rf_<hex>` header.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/external/v1/goals` | List goals (active by default) |
| `GET` | `/api/external/v1/plan?from=YYYY-MM-DD&to=YYYY-MM-DD` | Get active plan + workouts in date range (default: today to +14 days) |
| `GET` | `/api/external/v1/fitness` | CTL/ATL/TSB history (up to 365 days) |
| `GET` | `/api/external/v1/activities` | List activities |
| `GET` | `/api/external/v1/stats` | Training analytics |

Rate limit: 100 requests per minute.

## 2. Race Types and Default Parameters

Every race type has tuned defaults that the generator uses when the caller omits optional fields:

| Race Type | `raceType` value | Runs/wk | Volume (km/wk) | Max Long Run | Taper | Peak | Build | Generator |
|---|---|---|---|---|---|---|---|---|
| 5K | `FIVE_K` | 4 | 28 | 18 km | 1 | 2 | 4 | Standard |
| 10K | `TEN_K` | 4 | 35 | 22 km | 2 | 2 | 4 | Standard |
| Half Marathon | `HALF_MARATHON` | 4 | 45 | 24 km | 2 | 2 | 4 | Standard |
| Marathon | `MARATHON` | 5 | 58 | 32 km | 2 | 3 | 4 | Standard |
| 50K | `FIFTY_K` | 5 | 70 | 35 km | 2 | 3 | 5 | Ultra |
| 50 Mile | `FIFTY_MILE` | 6 | 80 | 40 km | 2 | 3 | 6 | Ultra |
| 100K | `HUNDRED_K` | 6 | 90 | 45 km | 2 | 3 | 6 | Ultra |
| 100 Mile | `HUNDRED_MILE` | 6 | 105 | 50 km | 3 | 4 | 8 | Ultra |
| 12 Hour | `TWELVE_HOUR` | 5 | 80 | 40 km | 2 | 3 | 5 | Ultra |
| 24 Hour | `TWENTY_FOUR_HOUR` | 6 | 95 | 50 km | 3 | 4 | 6 | Ultra |
| Backyard Ultra | `BACKYARD_ULTRA` | 5 | 60 | 35 km | 2 | 3 | 5 | Ultra |
| Sprint Tri | `SPRINT_TRI` | 3R+2B+2S | 25 | 15 km | 2 | 2 | 4 | Triathlon |
| Olympic Tri | `OLYMPIC_TRI` | 3R+3B+2S | 30 | 18 km | 2 | 2 | 4 | Triathlon |
| Half Ironman | `HALF_IRONMAN` | 3R+3B+2S | 35 | 22 km | 2 | 3 | 4 | Triathlon |
| Full Ironman | `FULL_IRONMAN` | 3R+3B+2S | 40 | 30 km | 3 | 4 | 4 | Triathlon |

VDOT adjustment: When `fitnessLevel=beginner` (VDOT 30), volume is scaled by 0.85x and runsPerWeek is reduced by 1 (min 3). When `fitnessLevel=advanced` (VDOT 50), volume is scaled by 1.15x.

## 3. Workout Types

Each workout in the generated plan has a `type` from this enum:

| Type | Description |
|---|---|
| `EASY` | Aerobic easy run |
| `LONG_RUN` | Weekly long run (50–55% of weekly volume) |
| `TEMPO` | Sustained effort at threshold pace |
| `INTERVALS` | VO2max or cruise intervals |
| `FARTLEK` | Speed play with varied pace |
| `REPETITIONS` | Short fast repetitions with full recovery |
| `RECOVERY` | Very easy recovery run |
| `RACE` | Race day simulation or actual race |
| `REST` | Rest day |
| `CROSS_TRAIN` | Cross training |
| `RIDE` | Cycling session |
| `SWIM` | Swimming session |
| `STRENGTH` | Strength training |
| `BRICK` | Bike-to-run transition workout |
| `LONG_RIDE` | Long cycling session |
| `RIDE_INTERVALS` | Cycling intervals |
| `SWIM_DRILL` | Swimming drills |
| `DOUBLE_DAY` | Two workouts in one day |

## 4. Training Phases

Plans progress through these phases in order:

1. **BASE** — Aerobic foundation building
2. **BUILD** — Volume and intensity increase
3. **PEAK** — Race-specific, highest volume/intensity
4. **TAPER** — Volume reduction before race
5. **RACE_WEEK** — Race week with reduced training

Additional phases used in some generators: `RECOVERY`, `ENDURANCE`, `MENTAL_PREP`, `TUNE_UP`, `MAINTAIN`.

## 5. Plan Generation Algorithm (Key Rules)

Understanding these rules is essential for writing evaluation assertions:

1. **Volume ramp:** Start volume = 60% of peak volume. Weekly growth capped at 10% with 4-week step-loading cycles (3 build weeks + 1 recovery week at 80%).
2. **Long run:** 50–55% of weekly volume, capped by race-type max and 3.5 hours time-on-feet.
3. **Quality sessions:** One per week (intervals/tempo/fartlek/repetitions) based on race type and phase. Selection varies by phase.
4. **Easy/recovery runs:** Fill remaining run slots. Recovery runs placed the day after hard sessions.
5. **Rest days:** User-designated rest days are respected. No workouts scheduled on rest days.
6. **Paces:** Calculated from VDOT using Jack Daniels training pace formula. All workout targets include pace in seconds/km.
7. **Phase assignment:** BASE → BUILD → PEAK → TAPER → RACE_WEEK, with duration determined by `taperWeeks`, `peakWeeks`, `buildWeeks` parameters. Remaining weeks are BASE.
8. **No back-to-back same type:** The generator fixes any consecutive same-type workouts.
9. **Triathlon plans:** Include swim, bike, and run sessions distributed across the week.
10. **Ultra plans:** Higher volume, longer long runs, more conservative progression.

## 6. Dataset Generation Instructions

Generate a JSON file containing an array of test cases. Each test case must include:

### 6.1 Test Case Schema

```json
{
  "id": "unique-test-case-id",
  "category": "category-name",
  "description": "What this test case validates",
  "input": {
    "raceType": "MARATHON",
    "raceDate": "2026-11-15",
    "fitnessLevel": "intermediate",
    "runsPerWeek": 5,
    "weeklyVolumeKm": 55
  },
  "assertions": [
    {
      "type": "response_ok",
      "description": "Response must be HTTP 200"
    },
    {
      "type": "field_equals",
      "path": "plan.runsPerWeek",
      "value": 5,
      "description": "Runs per week matches request"
    },
    {
      "type": "field_range",
      "path": "plan.totalDistanceKm",
      "min": 400,
      "max": 1200,
      "description": "Total distance in plausible range for marathon plan"
    },
    {
      "type": "week_count",
      "description": "Total weeks must be > 0",
      "min": 1
    }
  ]
}
```

### 6.2 Assertion Types

| Type | Fields | Description |
|---|---|---|
| `response_ok` | — | HTTP status must be 200 |
| `response_error` | `status` | HTTP status must equal `status` |
| `field_equals` | `path`, `value` | Response field at `path` equals `value` |
| `field_not_equals` | `path`, `value` | Response field at `path` does not equal `value` |
| `field_range` | `path`, `min?`, `max?` | Response field at `path` is within numeric range |
| `field_exists` | `path` | Response field at `path` exists and is not null |
| `field_type` | `path`, `valueType` | Field is of type `valueType` (string, number, array) |
| `week_count` | `min?`, `max?` | `plan.weeks.length` is within range |
| `workout_types_contain` | `values` | At least one workout across all weeks has type in `values` |
| `workout_types_not_contain` | `values` | No workout has type in `values` |
| `phases_contain` | `values` | Plan phases include all values in `values` |
| `phases_ordered` | `values` | Phases appear in the specified order (BASE before BUILD before PEAK before TAPER before RACE_WEEK) |
| `volume_progression` | `direction` | Weekly total distances generally increase then decrease (`direction: "build_then_taper"`) |
| `long_run_exists` | — | At least one LONG_RUN workout exists in the plan |
| `max_long_run` | `maxKm` | No LONG_RUN workout exceeds `maxKm` |
| `no_rest_day_violations` | — | REST or rest-day workouts only appear on legitimate rest days |
| `no_back_to_back_same_type` | — | No two consecutive days have the same workout type |
| `pace_valid` | — | All workout paces are positive numbers or "-" for REST |
| `distance_valid` | — | All workout distances are positive or zero (for REST) |
| `date_monotonic` | — | Workout dates are strictly increasing within each week |
| `race_week_exists` | — | Final week has phase RACE_WEEK or includes a RACE workout type |
| `custom_validator` | `code` | Custom JavaScript validation expression |

### 6.3 Required Coverage Categories

Generate **at least 5 test cases per category** (minimum 80 total). Here are the categories:

#### A. Basic Race Types (happy path)
- Each race type with intermediate fitness, default parameters
- At least one per race type: `FIVE_K`, `TEN_K`, `HALF_MARATHON`, `MARATHON`, `FIFTY_K`, `HUNDRED_MILE`, `SPRINT_TRI`, `FULL_IRONMAN`

#### B. Fitness Levels
- Same race (e.g., marathon) with `beginner`, `intermediate`, `advanced`
- Verify VDOT mapping, volume scaling, run count adjustments

#### C. Runs Per Week Variations
- 5K with 2, 4, 6, 7 runs per week
- Marathon with 3, 5, 7 runs per week

#### D. Volume Variations
- Marathon at 20 km/wk, 58 km/wk, 120 km/wk
- Verify long run scaling, easy run scaling

#### E. Short Plans (Edge Cases)
- Race date 3 weeks from today (very short plan)
- Race date 5 weeks from today
- Verify phase scaling for short plans

#### F. Long Plans
- Race date 24+ weeks from today
- Verify extended base phase, proper phase transitions

#### G. Phase Structure
- Verify correct phase order: BASE → BUILD → PEAK → TAPER → RACE_WEEK
- Verify taper volume reduction (60–80% of peak)
- Verify recovery weeks (every 4th week at ~80%)

#### H. Workout Type Distribution
- Verify LONG_RUN appears at least once per week
- Verify quality sessions (INTERVALS/TEMPO/FARTLEK) appear in BUILD/PEAK
- Verify REST days present
- Verify no back-to-back same type

#### I. Triathlon-Specific
- Sprint/Olympic/Half/Full with swim+ride+run workouts
- Verify BRICK workouts for longer triathlon distances
- Verify multi-sport scheduling (no swim and ride on same day typically)

#### J. Ultra-Specific
- 50K, 100K, 100 mile with high volume
- Verify longer long runs, more conservative progression

#### K. Error / Validation Cases
- Past race date → expect 400
- Invalid race type → expect 400
- Missing required field → expect 400
- `runsPerWeek: 1` (below minimum 2) → expect 400
- `weeklyVolumeKm: 5` (below minimum 10) → expect 400
- `weeklyVolumeKm: 250` (above max 200) → expect 400
- Empty request body → expect 400

#### L. VDOT-Based Pace Validation
- Beginner 5K paces should be slower than advanced 5K paces
- Marathon paces should differ from 5K paces for same VDOT
- Verify all paces are > 0 for non-REST workouts

#### M. Cross-Parameter Interactions
- High runsPerWeek + low volume → short individual runs
- Low runsPerWeek + high volume → very long individual runs
- Beginner + marathon → conservative volume

#### N. Boundary Dates
- Race date tomorrow (1–2 day plan)
- Race date exactly 1 week from today
- Race date exactly 52 weeks from today

#### O. Volume Progression Quality
- Verify weekly totals generally increase during BASE/BUILD
- Verify weekly totals decrease during TAPER
- Verify peak week is the highest-volume week before taper
- Verify total distance is > 0

### 6.4 Output Format

Return a single JSON object:

```json
{
  "metadata": {
    "version": "1.0",
    "generatedAt": "2026-05-20T00:00:00Z",
    "totalTestCases": 80,
    "categories": ["basic_race_types", "fitness_levels", ...],
    "baseUrl": "https://runflow.app"
  },
  "testCases": [
    { ... },
    { ... }
  ]
}
```

### 6.5 Example Test Cases

```json
{
  "id": "marathon_intermediate_default",
  "category": "basic_race_types",
  "description": "Standard marathon plan for intermediate runner with default parameters",
  "input": {
    "raceType": "MARATHON",
    "raceDate": "2026-10-18",
    "fitnessLevel": "intermediate"
  },
  "assertions": [
    { "type": "response_ok" },
    { "type": "field_equals", "path": "plan.vdot", "value": 40 },
    { "type": "field_exists", "path": "plan.weeks" },
    { "type": "week_count", "min": 10, "max": 25 },
    { "type": "phases_ordered", "values": ["BASE", "BUILD", "PEAK", "TAPER", "RACE_WEEK"] },
    { "type": "workout_types_contain", "values": ["LONG_RUN", "EASY"] },
    { "type": "long_run_exists" },
    { "type": "max_long_run", "maxKm": 33 },
    { "type": "volume_progression", "direction": "build_then_taper" },
    { "type": "no_back_to_back_same_type" },
    { "type": "date_monotonic" },
    { "type": "race_week_exists" }
  ]
}
```

```json
{
  "id": "5k_beginner_min_runs",
  "category": "runs_per_week_variations",
  "description": "5K plan for beginner with minimum 2 runs per week",
  "input": {
    "raceType": "FIVE_K",
    "raceDate": "2026-08-10",
    "fitnessLevel": "beginner",
    "runsPerWeek": 2
  },
  "assertions": [
    { "type": "response_ok" },
    { "type": "field_equals", "path": "plan.vdot", "value": 30 },
    { "type": "field_equals", "path": "plan.runsPerWeek", "value": 2 },
    { "type": "week_count", "min": 5 },
    { "type": "workout_types_contain", "values": ["LONG_RUN"] },
    { "type": "max_long_run", "maxKm": 19 },
    { "type": "phases_contain", "values": ["TAPER", "RACE_WEEK"] },
    { "type": "pace_valid" },
    { "type": "distance_valid" }
  ]
}
```

```json
{
  "id": "invalid_past_race_date",
  "category": "error_validation",
  "description": "Race date in the past should return 400",
  "input": {
    "raceType": "MARATHON",
    "raceDate": "2020-01-01",
    "fitnessLevel": "intermediate"
  },
  "assertions": [
    { "type": "response_error", "status": 400 }
  ]
}
```

```json
{
  "id": "sprint_tri_advanced",
  "category": "triathlon_specific",
  "description": "Sprint triathlon plan for advanced athlete includes swim and ride sessions",
  "input": {
    "raceType": "SPRINT_TRI",
    "raceDate": "2026-08-20",
    "fitnessLevel": "advanced"
  },
  "assertions": [
    { "type": "response_ok" },
    { "type": "field_equals", "path": "plan.vdot", "value": 50 },
    { "type": "workout_types_contain", "values": ["RIDE", "SWIM"] },
    { "type": "phases_contain", "values": ["TAPER", "RACE_WEEK"] },
    { "type": "max_long_run", "maxKm": 16 },
    { "type": "volume_progression", "direction": "build_then_taper" },
    { "type": "week_count", "min": 6, "max": 20 }
  ]
}
```

```json
{
  "id": "marathon_beginner_vs_advanced_pace",
  "category": "vdot_pace_validation",
  "description": "Beginner marathon paces should be slower than advanced for the same race type",
  "input": {
    "raceType": "MARATHON",
    "raceDate": "2026-11-01",
    "fitnessLevel": "beginner"
  },
  "comparisons": [
    {
      "compareWith": "marathon_advanced_pace",
      "assertion": "beginner average easy pace > advanced average easy pace (i.e., slower)"
    }
  ],
  "assertions": [
    { "type": "response_ok" },
    { "type": "field_equals", "path": "plan.vdot", "value": 30 },
    { "type": "pace_valid" },
    { "type": "long_run_exists" }
  ]
}
```

## 7. Evaluation Scoring Rubric

When evaluating a generated plan response, score it on these dimensions (each 0–10):

| Dimension | Weight | Description |
|---|---|---|
| **Structural Validity** | 20% | Response structure matches expected schema. All required fields present. No null/unexpected values. |
| **Phase Correctness** | 15% | Phases appear in correct order (BASE→BUILD→PEAK→TAPER→RACE_WEEK). Phase durations match input parameters. |
| **Volume Progression** | 20% | Volume increases during base/build, peaks before taper, decreases during taper. Recovery weeks (~80% of previous) appear every 4th week. |
| **Workout Diversity** | 10% | Plan includes appropriate mix of EASY, LONG_RUN, quality sessions, REST. No back-to-back same type. |
| **Pace Consistency** | 10% | Paces are physiologically plausible for the given VDOT. Easy pace > threshold pace > interval pace (in sec/km). |
| **Parameter Respect** | 15% | Plan respects input parameters: runsPerWeek, weeklyVolumeKm, maxLongRunKm, restDays, etc. |
| **Edge Case Handling** | 10% | Very short/long plans, extreme parameters, and invalid inputs are handled gracefully. |

**Overall score** = weighted average. A score ≥ 7.0 is passing. A score ≥ 9.0 is excellent.

## 8. Usage Instructions

1. Generate the dataset using this prompt.
2. For each test case, send a `POST` request to `{baseUrl}/api/public/plan/generate` with the `input` object.
3. Validate the response against every assertion in `assertions`.
4. For comparison test cases (category `vdot_pace_validation`), make both requests and compare results.
5. Calculate per-dimension scores and the overall weighted score.
6. Output a summary report with pass/fail per test case and dimension scores.

Example call using curl:

```bash
curl -X POST https://runflow.app/api/public/plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "raceType": "MARATHON",
    "raceDate": "2026-10-18",
    "fitnessLevel": "intermediate",
    "runsPerWeek": 5,
    "weeklyVolumeKm": 58
  }'
```
```
