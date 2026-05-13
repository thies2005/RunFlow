# RunFlow Workout Coaching & Recording - Gap Analysis & Implementation Plan

## Executive Summary

RunFlow has a solid foundation for basic GPS recording and training plan display, but its structured workout execution and real-time coaching features are severely incomplete compared to Strava and Runna. The most critical finding is that the **voice coach service exists but is never activated** during recording. Additionally, there is **no concept of structured workout steps** (intervals, warmup, cooldown), no real-time pace zone visual indicator, and no background recording.

---

## Current State (What Exists)

### Recording System
- GPS tracking with route polyline on map (`workout_recording_service.dart`)
- Real-time metrics: distance, duration, current pace, average pace, speed, HR (BLE), cadence (estimated), elevation
- Pause/resume (manual only)
- Post-workout summary with save/sync
- Recording screen with metric cards and expandable map

### Training Plans
- Server-generated plans with `Workout` entities (type, targetDistance, targetPace, targetDuration, scheduledDate)
- Plan screen with calendar view, drag-to-reorder, edit, mark complete
- VDOT-based training pace zones (Easy, Marathon, Threshold, Interval, Repetition)
- Workout adaptation engine based on daily readiness scores
- Navigation from plan to record screen via `workoutId` query parameter

### Voice Coach (EXISTS BUT NON-FUNCTIONAL)
- `VoiceCoachService` with TTS via `flutter_tts: ^4.2.0`
- Complete `evaluate()` method with: phase detection, pace deviation alerts, HR zone alerts, distance milestones, motivational messages
- Cooldown system per message type to avoid over-announcing
- Toggle in recording screen UI
- Auto-enabled when starting from planned workout
- **CRITICAL BUG: `evaluate()` is never called anywhere in the codebase**

---

## Gap Analysis vs Strava/Runna

| Feature | Strava | Runna | RunFlow |
|---------|--------|-------|---------|
| GPS tracking with route | Yes | Yes | **Yes** |
| Real-time pace display | Yes | Yes | **Yes** (noisy, unsmoothed) |
| Heart rate sensor support | Yes | Yes | **Yes** (BLE) |
| Map with route | Yes | Yes | **Yes** |
| Structured interval workouts | Yes | Yes | **NO** |
| Workout steps (warmup/interval/recovery/cooldown) | Yes | Yes | **NO** |
| Interval execution engine with auto-transitions | Yes | Yes | **NO** |
| Target pace loaded during recording | Yes | Yes | **NO** (stub) |
| Real-time pace zone color indicator | Yes | Yes | **NO** |
| Pace deviation visual alert (too fast/too slow) | Yes | Yes | **NO** |
| Voice coaching (TTS pace guidance) | Yes | Yes | **BROKEN** (exists, never activated) |
| "Slow down" / "Speed up" voice cues | Yes | Yes | **Code exists, never called** |
| Audio beep for lap/interval transitions | Yes | Yes | **NO** |
| Haptic feedback on pace alerts | Yes | Yes | **NO** |
| Auto-lap at km markers | Yes | Yes | **NO** |
| Background recording (foreground service) | Yes | Yes | **NO** |
| Smoothed/rolling average pace | Yes | Yes | **NO** |
| Countdown before recording start (3-2-1) | Yes | Yes | **NO** |
| Current pace vs target delta display | Yes | Yes | **NO** |
| Real-time pace graph | Yes | No | **NO** |
| Custom workout builder | Yes | Yes | **NO** |
| Step countdown timer during intervals | Yes | Yes | **NO** |
| Step progress display (e.g. "Interval 3 of 8") | Yes | Yes | **NO** |
| Audio ducking during TTS announcements | Yes | Yes | **NO** |

---

## Implementation Plan

### Phase 1: Fix Voice Coach (Critical Bug Fix)
**Priority: CRITICAL | Estimated Effort: Small**

The voice coach is fully implemented but never activated. This is the single highest-impact fix.

#### Tasks
1. **Add periodic evaluation timer in recording screen** (`record_screen.dart`)
   - Create a `Timer.periodic(Duration(seconds: 30))` that calls `voiceCoachService.evaluate(...)` with current metrics
   - Start timer when recording begins, cancel when paused/stopped
   - Pass: currentPace, targetPace (if workout loaded), currentHR, distance, targetDistance, workoutType, duration, maxHR

2. **Implement `_loadWorkoutDetails()`** (`record_screen.dart` lines 40-42)
   - Load workout by ID from repository
   - Extract targetPace, targetDistance, workoutType
   - Store in state variables accessible to the evaluation timer
   - Auto-enable voice coach when workout is loaded

3. **Add audio focus/ducking** (`voice_coach_service.dart`)
   - Integrate with `audio_session` package or equivalent
   - Duck music/other audio during TTS announcements
   - Restore volume after announcement completes

4. **Add TTS settings screen** (new file)
   - Speech rate slider
   - Announcement frequency (every 30s, 1min, 2min, 5min)
   - Toggle announcement types: pace alerts, HR alerts, distance milestones, motivation
   - Language selection
   - Preview/test button

**Files to modify:**
- `flutter/lib/presentation/screens/record/record_screen.dart` — add timer, load workout details
- `flutter/lib/services/voice_coach_service.dart` — add audio ducking
- New: `flutter/lib/presentation/screens/settings/voice_coach_settings_screen.dart`
- New: `flutter/lib/presentation/providers/voice_coach_settings_provider.dart`

**Acceptance criteria:**
- Voice coach speaks pace alerts during recording when enabled
- "Slow down, you're running too fast" when >15% above target pace
- "Pick it up, you're behind target pace" when >15% below target pace
- Distance milestones announced at 25%, 50%, 75%
- HR zone changes announced
- Motivational messages every 5 minutes
- Audio ducks during announcements

---

### Phase 2: Real-Time Pace Zone Visual Indicator
**Priority: HIGH | Estimated Effort: Medium**

Show runners at a glance whether they are in the right pace zone. This is the most visible coaching feature.

#### Tasks
1. **Add smoothed pace calculation** (`workout_recording_service.dart`)
   - Implement 30-second rolling average pace (buffer of recent pace samples)
   - Expose `smoothedCurrentPaceSecondsPerKm` in `RecordingMetrics`
   - Use for both display and voice coach evaluation

2. **Create PaceZoneIndicator widget** (new file)
   - Horizontal bar/gauge showing pace range
   - Color-coded: green = in zone, red = too fast, yellow/orange = too slow
   - Current pace marker on the gauge
   - Target pace range highlighted
   - Numeric delta display: "+5s/km" or "-3s/km"
   - Labels: "TOO FAST" / "IN ZONE" / "TOO SLOW"

3. **Create PaceZoneCard widget** (new file)
   - Shows current training zone name (Easy/Marathon/Threshold/Interval/Repetition)
   - Shows current pace, target pace range
   - Color matches zone (Easy=blue, Marathon=green, Threshold=yellow, Interval=orange, Repetition=red)

4. **Integrate into recording screen** (`record_screen.dart`)
   - Replace or augment current pace metric card with PaceZoneIndicator
   - Show when a workout with targetPace is loaded
   - Show pace delta prominently

5. **Add haptic feedback on pace zone transitions**
   - Vibrate when exiting target zone
   - Single pulse = entering zone, double pulse = leaving zone
   - Use `HapticFeedback` from Flutter services

**Files to modify:**
- `flutter/lib/services/workout_recording_service.dart` — add smoothed pace
- `flutter/lib/presentation/screens/record/record_screen.dart` — integrate new widgets
- New: `flutter/lib/presentation/widgets/pace_zone_indicator.dart`
- New: `flutter/lib/presentation/widgets/pace_zone_card.dart`
- New: `flutter/lib/domain/entities/pace_zone.dart` — pace zone calculation utilities

**Acceptance criteria:**
- Colored gauge shows current pace vs target pace zone
- "TOO FAST" / "IN ZONE" / "TOO SLOW" labels visible
- Numeric delta displayed (e.g., "+8s/km")
- Smoothed pace used (not noisy instantaneous)
- Haptic vibration when pace zone changes

---

### Phase 3: Structured Workout Steps & Intervals
**Priority: HIGH | Estimated Effort: Large**

The core differentiator of running apps like Runna. Enables "Warmup 10min → 8x(400m fast + 200m jog) → Cooldown 10min" workouts.

#### Tasks
1. **Define WorkoutStep domain entity** (new file)
   ```
   WorkoutStep {
     id: String
     type: StepType (warmup, cooldown, interval, recovery, rest)
     durationTarget: Duration? (time-based step)
     distanceTarget: double? (distance-based step in meters)
     paceTarget: PaceTarget? (zone or specific pace range)
     heartRateTarget: HrZoneTarget?
     repeatCount: int? (for grouping repeated intervals)
     name: String? (user-visible label, e.g. "400m Repeat")
   }
   
   PaceTarget {
     type: PaceTargetType (zone, exact, range)
     zone: TrainingZone? (easy, marathon, threshold, interval, repetition)
     minPaceSecondsPerKm: double?
     maxPaceSecondsPerKm: double?
   }
   
   StructuredWorkout {
     id: String
     name: String
     steps: List<WorkoutStep> (flat list with repeat markers)
     totalEstimatedDuration: Duration
     totalEstimatedDistance: double
   }
   ```

2. **Create WorkoutStepExecutionEngine** (new file)
   - State machine: `not_started → active → completed` per step
   - Tracks current step index, elapsed within step, remaining distance/time
   - Auto-transitions between steps (time-based or distance-based)
   - Handles repeat groups: tracks current repeat iteration
   - Emits events: `stepStarted`, `stepProgress`, `stepCompleted`, `stepTransitionWarning` (5s before end)
   - Exposes: `currentStep`, `currentStepProgress`, `nextStep`, `totalProgress`
   - Integrates with recording service metrics (distance, time, pace)

3. **Add structured workout to Workout entity**
   - Extend `Workout` domain entity with optional `StructuredWorkout?`
   - Server-side: generate interval workouts with steps (not just flat target pace/distance)
   - Local storage: serialize/deserialize steps

4. **Create interval execution UI** (new files)
   - **StepProgressCard**: Shows "Interval 3 of 8", step timer/countdown, step distance remaining
   - **NextStepPreview**: Shows upcoming step (e.g., "Next: 200m Jog Recovery")
   - **OverallWorkoutProgress**: Progress bar across all steps
   - Integrate into recording screen, replacing the simple metric-only view when structured workout is active

5. **Add interval-specific voice coach announcements** (`voice_coach_service.dart`)
   - "Starting warmup, target pace 6:00 per kilometer"
   - "3, 2, 1... Interval!" (countdown before interval start)
   - "Interval 3 of 8. Target pace 4:30 per kilometer"
   - "200 meters remaining in this interval"
   - "Recovery begins. Jog slowly"
   - "Great job! Starting cooldown"
   - "Workout complete! Well done"
   - Auto-announce on step transitions via execution engine events

6. **Add audio beep for transitions**
   - Short beep/chime sound effect at step transitions
   - Countdown beeps: 3 beeps at 3s, 2 beeps at 2s, 1 long beep at start
   - Add `audioplayers` package for beep playback
   - Different sounds for: interval start (energetic), recovery start (soft), workout complete (celebratory)

7. **Load structured workout in recording screen**
   - `_loadWorkoutDetails()` loads the full structured workout
   - Initialize `WorkoutStepExecutionEngine` with the steps
   - Subscribe to step events for UI updates and voice coach triggers
   - Display step progress UI instead of (or alongside) basic metrics

**Files to modify:**
- New: `flutter/lib/domain/entities/workout_step.dart`
- New: `flutter/lib/domain/entities/structured_workout.dart`
- New: `flutter/lib/domain/services/workout_step_execution_engine.dart`
- New: `flutter/lib/presentation/widgets/step_progress_card.dart`
- New: `flutter/lib/presentation/widgets/next_step_preview.dart`
- New: `flutter/lib/presentation/widgets/workout_progress_bar.dart`
- `flutter/lib/domain/entities/dashboard_entities.dart` — extend Workout
- `flutter/lib/data/models/dashboard_models.dart` — add step serialization
- `flutter/lib/presentation/screens/record/record_screen.dart` — integrate execution engine
- `flutter/lib/services/voice_coach_service.dart` — add step-specific announcements
- `flutter/pubspec.yaml` — add `audioplayers` package

**Acceptance criteria:**
- Can execute a structured workout with warmup/intervals/recovery/cooldown steps
- Auto-transitions between steps based on time or distance
- Shows "Interval 3 of 8" progress
- Shows countdown timer/distance remaining per step
- Voice announces step transitions
- Beep sounds play at transitions
- Works with existing recording/pause/resume/stop

---

### Phase 4: Background Recording & Reliability
**Priority: HIGH | Estimated Effort: Medium**

Without background recording, the app is unusable for real workouts because the OS will kill it.

#### Tasks
1. **Add foreground service for Android** 
   - Add `flutter_foreground_task` package
   - Create notification channel with "Recording workout" persistent notification
   - Show distance and duration in notification
   - Keep GPS stream alive when app is backgrounded

2. **Add background location permission handling**
   - Request "Always" location permission (Android) / "Always" location (iOS)
   - Handle permission denial gracefully
   - Show explanation before requesting

3. **Add wakelock / screen keep-awake option**
   - Optional: keep screen on during recording (setting toggle)
   - Use `wakelock_plus` package

4. **Add auto-pause detection**
   - Detect when speed drops below 0.5 m/s for >5 seconds
   - Auto-pause GPS tracking and timer
   - Auto-resume when speed exceeds 1.0 m/s
   - Visual indicator showing "Auto-paused"
   - Setting to enable/disable auto-pause

5. **Add auto-lap at km/mile markers**
   - Track distance milestones
   - Record lap time at each km
   - Announce lap time via voice coach ("1 kilometer, 5 minutes 32 seconds")
   - Store laps in `RecordedWorkout`
   - Display lap splits in summary

**Files to modify:**
- `flutter/lib/services/workout_recording_service.dart` — add auto-pause, auto-lap, background support
- `flutter/lib/domain/entities/recording_entities.dart` — add lap data to RecordedWorkout
- `flutter/lib/presentation/screens/record/record_screen.dart` — auto-pause UI
- `flutter/lib/presentation/screens/settings/` — auto-pause/auto-lap settings
- `flutter/pubspec.yaml` — add `flutter_foreground_task`, `wakelock_plus`

**Acceptance criteria:**
- Recording continues when app is backgrounded on Android
- Persistent notification shows during recording
- Auto-pause works when stopped for >5 seconds
- Auto-lap triggers at each km with voice announcement
- Lap splits stored and shown in summary

---

### Phase 5: Custom Workout Builder & Templates
**Priority: MEDIUM | Estimated Effort: Medium**

Allow users to create their own structured workouts rather than relying solely on server-generated plans.

#### Tasks
1. **Create workout builder screen** (new files)
   - Step-by-step builder: add warmup, add intervals (with repeat count), add cooldown
   - For each step: set type, duration/distance target, pace target (zone or custom)
   - Visual step list with drag-to-reorder
   - Save as template

2. **Create template storage**
   - Local storage for custom workout templates
   - Template list screen
   - Quick-start from template

3. **Create workout preview screen**
   - Show all steps with estimated time/distance
   - Visual timeline of the workout
   - Start button to begin recording with the workout

**Files to modify:**
- New: `flutter/lib/presentation/screens/workout/workout_builder_screen.dart`
- New: `flutter/lib/presentation/screens/workout/workout_templates_screen.dart`
- New: `flutter/lib/presentation/screens/workout/workout_preview_screen.dart`
- New: `flutter/lib/data/datasources/local/workout_template_local_datasource.dart`
- `flutter/lib/presentation/router/app_router.dart` — add new routes

**Acceptance criteria:**
- User can create a custom structured workout
- User can save and reuse workout templates
- User can preview workout before starting
- User can start recording with the custom workout

---

### Phase 6: Recording UX Enhancements
**Priority: MEDIUM | Estimated Effort: Small-Medium**

#### Tasks
1. **Add 3-2-1 countdown before recording starts**
   - After GPS lock, show "Tap to start" 
   - On tap: 3-2-1 countdown with large numbers and beep sounds
   - Recording begins after countdown
   - Voice: "3... 2... 1... Go!"

2. **Add GPS lock indicator and audio cue**
   - Visual indicator when searching for GPS (pulsing dot)
   - Green indicator when GPS is locked (3D fix)
   - Audio cue / haptic when GPS is ready

3. **Add km split display during recording**
   - Show last km split time as a banner
   - "Last km: 5:32" briefly displayed then fades
   - Compare to target pace: green if ahead, red if behind

4. **Add configurable audio cue schedule**
   - Settings for: auto-announce every km, every N minutes, on HR zone change
   - Per-workout-type settings (more frequent for intervals, less for easy)

5. **Add real-time pace mini-graph**
   - Small sparkline showing pace trend over last 2-5 minutes
   - Updates in real-time during recording

**Files to modify:**
- `flutter/lib/presentation/screens/record/record_screen.dart` — countdown, km split banner
- `flutter/lib/services/workout_recording_service.dart` — GPS lock state
- `flutter/lib/services/voice_coach_service.dart` — configurable schedule
- `flutter/lib/presentation/widgets/pace_sparkline.dart` — new mini-graph widget

**Acceptance criteria:**
- 3-2-1 countdown plays before recording starts
- GPS lock has clear visual indicator
- Km splits shown briefly as banner
- Audio cue frequency configurable

---

## Dependency Graph

```
Phase 1 (Fix Voice Coach)
  └── Phase 2 (Pace Zone Indicator) — needs smoothed pace
       └── Phase 3 (Structured Workouts) — needs pace zone display
            ├── Phase 4 (Background Recording) — independent, can parallel
            ├── Phase 5 (Custom Builder) — needs Phase 3 entities
            └── Phase 6 (UX Enhancements) — builds on all above
```

Phases 4 can be done in parallel with Phases 2-3.

## Recommended Implementation Order

1. **Phase 1** — Fix voice coach (smallest change, biggest impact)
2. **Phase 4** — Background recording (fundamental usability)
3. **Phase 2** — Pace zone indicator (most visible coaching feature)
4. **Phase 3** — Structured workouts (largest feature, highest value)
5. **Phase 6** — UX enhancements (polish)
6. **Phase 5** — Custom workout builder (nice-to-have)

## Estimated Total Effort

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 2-3 days | Fix existing code, small additions |
| Phase 2 | 3-5 days | New widgets + smoothed pace |
| Phase 3 | 10-15 days | Major new feature: entities, engine, UI, audio |
| Phase 4 | 3-5 days | Platform-specific foreground service |
| Phase 5 | 5-7 days | Builder UI + template storage |
| Phase 6 | 3-5 days | UX polish items |
| **Total** | **26-40 days** | Full feature parity |

## Key Architectural Decisions

1. **WorkoutStepExecutionEngine as a separate service** — Not embedded in the recording service. The recording service provides raw metrics; the execution engine interprets them against the workout plan. This keeps concerns separated.

2. **Event-driven step transitions** — The execution engine emits events (`stepStarted`, `stepCompleted`, etc.) that the UI and voice coach subscribe to. This avoids tight coupling.

3. **Smoothed pace at the recording service level** — The 30-second rolling average should be computed in the recording service and exposed as a metric, so both the UI and voice coach use the same smoothed value.

4. **Voice coach as a listener to execution engine events** — Rather than having the voice coach poll, the execution engine pushes step transitions to the voice coach. Pace/HR evaluations can still be timer-based.

5. **Structured workout as optional extension** — Not all recordings need a structured workout. The recording screen should gracefully handle both free-run and structured workout modes.
