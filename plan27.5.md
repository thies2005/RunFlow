# Plan Generation: SOTA Audit & Improvement Plan

## Executive Summary

RunFlow's plan generation is **competent but not state-of-the-art**. It implements Daniels-Gilbert VDOT correctly, has solid periodization fundamentals (BASE/BUILD/PEAK/TAPER with step loading), and recently added important guardrails (VDOT capping, quality session scaling, structured steps). However, it falls significantly behind modern apps (Garmin Coach, COROS, TrainingPeaks) in three critical areas: **adaptive feedback**, **workout variety**, and **physiological integration**.

**Current level: "Smart Template Generator"** — deterministic, race-specific plans with correct pacing but no adaptation to how the athlete responds to training.

**SOTA level: "Adaptive Coaching Engine"** — continuously adjusting plans based on completed workouts, physiological metrics (HRV, ACWR), and individual response patterns.

---

## What's Working Well

| Area | Assessment |
|------|-----------|
| VDOT calculation | ✅ Correct Daniels-Gilbert formula |
| Training pace zones | ✅ Proper E/M/T/I/R zones from VDOT |
| Step loading (3+1) | ✅ 10% growth cap, 20% recovery weeks |
| Race-specific periodization | ✅ Phase-appropriate quality sessions per distance |
| Volume safety rails | ✅ Long run caps, time-on-feet limits, growth caps |
| Quality session scaling | ✅ Recently added — scales by weekly volume and race type |
| VDOT guardrails | ✅ 15% improvement cap prevents unsafe pacing |
| Structured workout steps | ✅ Machine-readable warmup/work/cooldown steps |
| HR profile data flow | ✅ Wizard → backend pipeline established |
| Test coverage | ✅ 56+ unit tests covering core logic |

---

## Gap Analysis: RunFlow vs. SOTA

### 🔴 Critical Gaps (No Implementation)

| Gap | Impact | SOTA Reference |
|-----|--------|---------------|
| **No adaptive feedback** | Plan ignores all completed workout data — every week is predetermined | Garmin Coach, COROS: adjust weekly based on performance |
| **No Acute:Chronic Workload Ratio (ACWR)** | No injury risk monitoring; relies solely on 10% rule | TrainingPeaks: ACWR 0.8-1.3 sweet spot |
| **No workout variety within phases** | BUILD phase generates identical workouts every week | Pfitzinger: 4-6 distinct workout templates per phase |
| **No HRV/readiness integration** | HR data collected but unused in plan generation | Garmin: Training Readiness Score affects daily prescription |
| **Only 1 quality session/week** | Sub-optimal for runners doing 5+ days; AI proposals mention "3 quality sessions" but generator can't produce them | Daniels, Pfitzinger: 2-3 quality sessions standard for 5+ days |

### 🟡 Significant Gaps (Partial/Missing)

| Gap | Current State | SOTA |
|-----|--------------|------|
| **Long run variety** | Always easy pace (MP segments only in PEAK HM/M) | Progressive, negative split, back-to-back, tempo finish |
| **No medium-long runs** | Only long run + easy runs | Pfitzinger MLR: 75-85% of long run distance, separate category |
| **HR zones unused in generation** | HR data flows through but `workoutTypeToHrZone()` is a static lookup | Should compute concrete bpm ranges and embed in structured steps |
| **No workout-level periodization** | Each week in a phase has the same quality session | Mesocycle rotation: week 1 intervals, week 2 threshold, week 3 combined |
| **Taper model is linear** | Fixed fractions per week | Research shows exponential taper outperforms linear |
| **No warmup/cooldown scaling** | Always 1.5km/1.0km | Should scale with total workout distance |
| **Cross-training is static** | Swim always 1500m, ride always 60min | Should periodize with plan phase |

### 🟢 Minor Gaps

| Gap | Current State | SOTA |
|-----|--------------|------|
| Recovery run ≠ easy run distance | Same distance for both | Recovery should be shorter (60-75% of easy) |
| No hill repeats / progression runs | Missing workout types entirely | Common in BUILD phase across all methodologies |
| No age/sex adjustment | Same recovery for all | Older athletes need more recovery between hard sessions |
| No double-day support | Max 1 session per day | Needed for >100km/week runners |
| No block periodization option | Linear only | Some athletes respond better to concentrated blocks |

---

## Proposed Improvements (Prioritized)

> [!IMPORTANT]
> This plan is ordered by **impact-to-effort ratio**. Each phase is independently shippable. Phases 1-3 would bring RunFlow to competitive parity with Garmin Coach. Phases 4-6 would put it ahead.

---

### Phase 1: Workout Variety & Mesocycle Rotation
**Impact: High | Effort: Medium | Files: ~3**

The single biggest quality improvement. Currently BUILD phase generates the exact same workout every week for 4+ weeks straight. Real coaching programs rotate workout stimuli.

#### Changes

##### [MODIFY] [index.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/index.ts)

1. **Add workout rotation within phases** — Instead of a single quality session per phase, define 2-3 templates per phase and rotate by week index:
   ```
   5K BUILD: Week A = 5x1km @ I | Week B = 3x1600m @ I | Week C = 8x600m @ I-R
   Marathon BUILD: Week A = 10km @ T | Week B = 3x2mile cruise intervals | Week C = 6km T + 4km MP
   ```

2. **Add missing workout types**:
   - **Progression runs**: Start easy, finish at threshold (great for BUILD)
   - **Cruise intervals**: 4-6x ~1km at threshold with short recovery (Daniels "cruise intervals")
   - **Hill repeats**: 6-10x hill in BASE phase (replaces one fartlek slot)
   - **Tempo + MP combo**: Mixed-pace quality session for HM/Marathon PEAK

3. **Support 2 quality sessions/week** when `runsPerWeek >= 5`:
   - Primary quality: Phase-specific (current logic)
   - Secondary quality: Complementary stimulus (e.g., if primary is intervals, secondary is threshold)
   - Both respect `MIN_GAP_DAYS` from each other and from long run

4. **Add medium-long run (MLR)** for marathon plans when `runsPerWeek >= 5`:
   - 75% of long run distance
   - Placed mid-week
   - Easy to steady pace

##### [NEW] [workout-templates.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/workout-templates.ts)

Central registry of workout templates with metadata:
```typescript
type WorkoutTemplate = {
  id: string;
  name: string;
  type: WorkoutType;
  phase: Phase[];
  raceTypes: RaceType[];
  getDistance: (weeklyVolume: number) => number;
  getPace: (paces: TrainingPaces) => number;
  getDescription: (distance: number, pace: number) => string;
  getStructuredSteps: (distance: number, paces: TrainingPaces) => StructuredWorkoutStep[];
  minRunsPerWeek: number;
  priority: 'primary' | 'secondary';
};
```

##### [MODIFY] [descriptions.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/descriptions.ts)

Add display descriptions for new workout types (progression run, cruise intervals, hill repeats).

**Acceptance Criteria:**
- BUILD phase produces at least 2 distinct quality sessions across the phase
- Marathon plans with 5+ runs/week include a secondary quality session
- Generated plans contain at least 4 distinct workout type/structure combinations

---

### Phase 2: Adaptive Feedback Loop
**Impact: Very High | Effort: High | Files: ~6**

The most impactful SOTA feature: the plan reacts to actual training. This doesn't require ML — a rule-based system with ACWR is highly effective.

#### Changes

##### [NEW] [adaptive-engine.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/adaptive-engine.ts)

Core adaptive logic:

1. **Compliance scoring**: Compare planned vs. actual workouts for the past 7 days
   - `completionRate`: % of planned workouts completed
   - `volumeDeviation`: actual km vs. planned km
   - `paceDeviation`: actual pace vs. target pace for quality sessions

2. **Acute:Chronic Workload Ratio (ACWR)**:
   ```typescript
   function calculateACWR(activities: Activity[], today: Date): {
     acuteLoad: number;     // last 7 days
     chronicLoad: number;   // rolling 28-day avg
     ratio: number;         // acute / chronic
     riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
   }
   ```
   - Risk bands: <0.8 (undertraining), 0.8-1.3 (optimal), 1.3-1.5 (high risk), >1.5 (very high risk)

3. **Weekly adjustment rules** (applied before generating next week):
   - ACWR > 1.5 → reduce volume 15%, replace quality with easy
   - ACWR 1.3-1.5 → reduce volume 5%, maintain quality
   - Completion rate < 60% for 2+ weeks → reduce volume 10%
   - Pace deviation > 5% faster than target for 2+ weeks → consider VDOT update
   - Pace deviation > 10% slower → flag potential fatigue or illness

4. **VDOT recalculation**: When adaptive engine detects sustained performance change (3+ quality sessions trending faster/slower), recommend VDOT re-assessment

##### [NEW] [training-load.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/metrics/training-load.ts)

Training load calculations:
- **TRIMP** (Training Impulse): `duration * HR_factor` (already have `trimp.ts`, extend it)
- **Session Load**: Distance × intensity factor (for non-HR workouts)
- **Training Monotony**: `mean(daily_loads) / stdev(daily_loads)` over 7 days
- **Training Strain**: `weekly_load × monotony`

##### [NEW] [plan-adjustment.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/plan-adjustment.ts)

API endpoint logic for weekly plan adjustment:
```typescript
async function adjustPlanForNextWeek(goalId: string, userId: string): Promise<AdjustmentResult> {
  // 1. Get recent activities
  // 2. Calculate ACWR, compliance, performance deviation
  // 3. Determine adjustment factors
  // 4. Regenerate next week's workouts with adjusted volume/intensity
  // 5. Create new workouts, soft-delete old unstarted ones
}
```

##### [MODIFY] [plan-creation.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/services/plan-creation.ts)

- Store adaptive parameters on Goal: `lastAdaptiveCheck`, `currentACWR`, `adaptiveVdot`
- Add method to recalculate VDOT from recent race efforts automatically

##### [NEW] API route for weekly plan adjustment

`POST /api/plan/[goalId]/adjust` — triggers adaptive recalculation

##### [MODIFY] Flutter dashboard

Show ACWR status, compliance score, and "plan adjusted" notifications

**Acceptance Criteria:**
- ACWR is calculated and displayed on dashboard
- If ACWR > 1.5, next week's volume is automatically reduced
- If athlete misses 2+ weeks of workouts, plan adapts down
- VDOT re-assessment suggested when performance trend changes

---

### Phase 3: Long Run Variety & Progression
**Impact: Medium-High | Effort: Low-Medium | Files: ~2**

Long runs are currently monotonous (always easy pace, with MP segments only in PEAK for HM/Marathon). Real coaching programs vary long run structure.

#### Changes

##### [MODIFY] [index.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/index.ts)

1. **Long run rotation** (cycle through by week):
   - **Easy long run**: Current default (zones 1-2)
   - **Progressive long run**: Last 3-5km at marathon pace
   - **Steady long run**: Middle portion at steady/aerobic pace
   - **Fast-finish long run**: Final 20-30% at threshold pace (BUILD/PEAK only)
   - **Back-to-back long runs**: Saturday long + Sunday medium-long (marathon/ultra, high-volume only)

2. **Long run progression formula**:
   ```
   Week 1 of cycle: Easy long run
   Week 2: Steady long run (middle at aerobic pace)
   Week 3: Progressive/fast-finish long run
   Week 4 (recovery): Short easy long run (80% of previous week)
   ```

3. **Recovery run distance fix**: Recovery runs should be 60-75% of easy run distance, not identical

##### [MODIFY] [descriptions.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/descriptions.ts)

Add display descriptions for new long run variants.

**Acceptance Criteria:**
- Marathon plans show at least 3 distinct long run types across a training cycle
- Recovery runs are shorter than easy runs
- Progressive long runs include structured steps with pace changes

---

### Phase 4: Exponential Taper Model
**Impact: Medium | Effort: Low | Files: ~1**

Research (Mujika & Padilla, 2003) shows exponential tapers outperform linear ones. Current implementation uses fixed fractions.

#### Changes

##### [MODIFY] [index.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/index.ts)

Replace `TAPER_FRACTIONS` with exponential decay:

```typescript
function getExponentialTaperVolume(
  weeksUntilRace: number,
  taperWeeks: number,
  peakVolume: number,
  raceType: RaceType
): number {
  // Research-based: Volume = peak * e^(-t * decay_rate)
  // Where t = 1..taperWeeks, decay_rate varies by distance
  const decayRate = getDecayRate(raceType); // 0.3-0.5
  const t = taperWeeks - weeksUntilRace + 1;
  const fraction = Math.exp(-decayRate * t);
  
  // Maintain intensity: reduce volume, not quality
  // Minimum volume floor to prevent complete detraining
  const minFraction = raceType === 'MARATHON' ? 0.35 : 0.40;
  return Math.round(peakVolume * Math.max(fraction, minFraction));
}
```

Key principles:
- Reduce volume 40-60% total over the taper
- **Maintain frequency**: Don't drop runs/week during taper
- **Maintain intensity**: Keep quality sessions but reduce number of reps/duration
- **Sharper drop in final week**: Exponential naturally achieves this

**Acceptance Criteria:**
- Taper volume curve is non-linear (steeper reduction toward race day)
- Quality sessions maintained during taper but with reduced volume
- Taper maintains the same runs/week as peak phase

---

### Phase 5: HR Zone-Aware Plan Generation
**Impact: Medium | Effort: Medium | Files: ~4**

HR data flows through the system but isn't used in plan generation. The HR zones collected in the wizard should produce concrete bpm targets in workouts.

#### Changes

##### [NEW] [hr-zones.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/hr-zones.ts)

LTHR-based zone calculator:
```typescript
function calculateHRZones(lthr: number): HRZoneSet {
  return {
    z1: { min: 0, max: Math.round(lthr * 0.75), label: 'Recovery' },
    z2: { min: Math.round(lthr * 0.75), max: Math.round(lthr * 0.87), label: 'Aerobic' },
    z3: { min: Math.round(lthr * 0.87), max: Math.round(lthr * 0.94), label: 'Tempo' },
    z4: { min: Math.round(lthr * 0.94), max: lthr, label: 'Threshold' },
    z5: { min: lthr, max: Math.round(lthr * 1.05), label: 'VO2max' },
    z6: { min: Math.round(lthr * 1.05), max: Math.round(lthr * 1.10), label: 'Anaerobic' },
    z7: { min: Math.round(lthr * 1.10), max: 999, label: 'Neuromuscular' },
  };
}
```

##### [MODIFY] [index.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/index.ts)

- Accept `thresholdHeartRate` in `PlanConfig`
- When LTHR available, attach concrete bpm ranges to structured steps
- Replace static `workoutTypeToHrZone()` with computed zones

##### [MODIFY] structured steps in [index.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/plans/index.ts)

Enhance `StructuredWorkoutStep` type:
```typescript
type StructuredWorkoutStep = {
  // ... existing fields ...
  hrTargetMinBpm?: number;
  hrTargetMaxBpm?: number;
  hrZoneLabel?: string;
  paceTargetMinSecondsPerKm?: number;
  paceTargetMaxSecondsPerKm?: number;
};
```

##### [MODIFY] DB schema (migration)

Add optional columns to `Workout` table for concrete zone targets (as planned in deferred Phase 3 of plan26.5).

**Acceptance Criteria:**
- When LTHR is provided, workouts include concrete bpm ranges
- Structured steps show both pace and HR targets
- Flutter workout display shows "Z2 Aerobic: 139-151 bpm" not just "Zone 2"

---

### Phase 6: Critical Speed as Alternative Pacing Model
**Impact: Medium | Effort: Medium | Files: ~3**

VDOT is good but based on population averages. Critical Speed (CS) is individually derived and more physiologically grounded for prescribing threshold and interval intensities.

#### Changes

##### [NEW] [critical-speed.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/metrics/critical-speed.ts)

```typescript
function calculateCriticalSpeed(
  efforts: { distanceM: number; timeS: number }[] // 2-3 maximal efforts
): { criticalSpeed: number; dPrime: number } {
  // Hyperbolic model: t = D'/CS + D/CS  =>  t = (D' + D) / CS
  // Linear regression: time = D/CS + D'/CS
  // CS = critical speed (m/s), D' = anaerobic distance capacity (m)
}

function csTrainingPaces(cs: number, dPrime: number): TrainingPaces {
  // Easy: 70-80% CS
  // Threshold: 95-100% CS  
  // Interval: CS + factor based on D'
  // Repetition: derived from D' 
}
```

##### [MODIFY] [plan-creation.ts](file:///c:/Users/thies/Antigravity/Full%20RunFlow/Web/src/lib/services/plan-creation.ts)

- When user has 2+ recent maximal efforts at different distances, calculate CS
- Use CS-derived paces instead of VDOT-derived paces for the plan
- Fall back to VDOT when CS data isn't available

##### [MODIFY] Flutter wizard

Add optional "Critical Speed test" flow where user inputs 2-3 time trial results.

**Acceptance Criteria:**
- CS calculated from 2+ maximal efforts when available
- CS-derived paces used in plan when available, VDOT as fallback
- Threshold and interval paces more accurately reflect individual physiology

---

## Verification Plan

### Automated Tests

For each phase, before merging:
```bash
cd Web && npm test                    # Backend tests pass
cd flutter && flutter analyze         # Zero errors
cd flutter && flutter test            # Zero failures
cd flutter && flutter build apk --release --dart-define=STRAVA_CLIENT_ID=193995
```

Additional test requirements per phase:
- **Phase 1**: Tests verifying workout variety within BUILD phase, 2-quality-session scheduling
- **Phase 2**: Tests for ACWR calculation, compliance scoring, adjustment rules
- **Phase 3**: Tests for long run rotation, recovery run distance < easy run distance
- **Phase 4**: Tests for exponential taper curve, volume monotonically decreasing toward race
- **Phase 5**: Tests for HR zone calculation from LTHR, bpm ranges on structured steps
- **Phase 6**: Tests for CS calculation, CS-derived vs VDOT-derived pace comparison

### Manual Verification

After each phase:
1. Generate a 16-week marathon plan (VDOT 45, 5 runs/week) and inspect:
   - Workout variety across BUILD weeks
   - Long run type rotation
   - Taper curve shape
   - HR zones on workouts (if LTHR provided)
2. Generate a 12-week 5K plan (VDOT 50, 4 runs/week) and verify distance-specific adjustments
3. Check plan in Flutter app for display correctness

---

## Open Questions

> [!IMPORTANT]
> **Q1: Adaptive feedback scope** — Should the adaptive engine regenerate the entire remaining plan, or only adjust the next 1-2 weeks? Full regeneration is simpler but may confuse users who memorized their upcoming workouts. Week-by-week is more surgical but requires state tracking.

> [!IMPORTANT]  
> **Q2: Critical Speed test UX** — Is the CS test flow too advanced for RunFlow's target audience? It requires users to perform 2-3 time trials. Could be gated behind an "Advanced" plan creation mode.

> [!WARNING]
> **Q3: Phase 2 DB impact** — The adaptive engine needs to store ACWR history and compliance metrics. This could go on the Goal record (simple) or a separate `TrainingLog` table (more flexible). Which approach is preferred?

> [!NOTE]
> **Q4: Phase ordering** — Phases 1, 3, and 4 are low-risk pure algorithmic improvements. Phase 2 (adaptive) is the highest-impact but also highest-effort. Should we ship 1+3+4 first for a quick quality win, then tackle 2?
