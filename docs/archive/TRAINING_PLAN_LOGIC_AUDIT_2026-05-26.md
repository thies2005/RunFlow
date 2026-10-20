# Training Plan Logic Audit - 2026-05-26

## Scope

Audited the generated training plan flow from backend plan generation through workout persistence and Flutter display, with focus on whether workouts carry explicit, explainable HR and pace targets.

## Findings

1. Backend plan generation had a single VDOT-derived pace source, but persisted only one scalar `targetPace`. This made workout cards show a point target instead of the intended training range.
2. Backend assigned rough `targetHrZone` numbers with `workoutTypeToHrZone`, but did not persist zone names or BPM ranges. Users had to infer what `Zone 2` or `Zone 4` meant.
3. HR profile fields were accepted by plan creation, but the selected LTHR value was not used to materialize BPM targets on workouts.
4. `displayDescription` and `intensityZone` improved readability, but were stored indirectly through `customName` and `[auto] intensity:` notes, not as complete target metadata.
5. Structured workout steps preserved machine-readable execution data, but did not replace the need for top-level target summaries on workout lists and dashboards.
6. Flutter dashboard and plan screens displayed only distance and single pace, with no HR target summary and no range-aware pace formatting.
7. Existing fallback behavior was important: historical workouts may not have concrete target fields, so the client must still work with `targetPace` and `targetHrZone` only.

## Implementation

Added optional persisted target metadata to `Workout`:

- `targetHrZoneLabel`
- `targetHrMinBpm`
- `targetHrMaxBpm`
- `targetPaceZoneLabel`
- `targetPaceMinSecondsPerKm`
- `targetPaceMaxSecondsPerKm`

Backend plan generation now enriches all generated workouts with:

- LTHR-based HR zone labels and BPM ranges when `thresholdHeartRate` is available.
- Pace zone labels and seconds-per-km ranges derived from the same VDOT pace table used for plan generation.
- Safe null values when a target does not apply or the needed HR profile is missing.

Flutter now:

- Deserializes and maps the new workout target fields.
- Shows pace ranges when available, falling back to the existing single `targetPace`.
- Shows HR zone label/BPM summary when available, falling back to `Z{targetHrZone}`.

## Remaining Risks

1. Advanced plan-editor Web UI still has older target display paths that may benefit from the same labels in a follow-up.
2. Generated structured steps still use simple warmup/work/cooldown shapes; richer repeat-group modeling remains future work.
3. Existing historical workouts will not have these fields unless backfilled; the client handles this through fallbacks.
4. APK build could not be verified in this environment because the Android SDK is unavailable.
