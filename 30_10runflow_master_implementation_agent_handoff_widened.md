# RunFlow v2.8.1 Widened Master Implementation & Remediation Agent Playbook

* **Target Repository**: `thies2005/runflow` (`Web/` Next.js 15 App Router + Prisma 7.6.0 & `android/` Kotlin + Jetpack Compose + Room v16)
* **Base Handoff Audited**: `30.10runflow_master_implementation_agent_handoff.md` & `30.10runflow_unified_web_android_master_agent_playbook.md`
* **Date**: October 30, 2026
* **Scope**: Complete post-handoff audit, root-cause remediation of all video-verified Android & sync bugs, restoration of 5 dropped Analytics charts, and disjoint subagent execution prompts.

---

## 1. Post-Handoff Audit & Root-Cause Matrix

An exhaustive audit of `30.10runflow_master_implementation_agent_handoff.md` against the codebase and live screen recording identified 6 critical implementation gaps and regressions:

| # | Bug / Inconsistency | Affected Files | Exact Root Cause in Code | Locked-In Remediation |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Changes Do Not Sync Directly (`"N pending sync"` stuck on bottom bar)** | `RunFlowRepository.kt`<br>`SyncManager.kt`<br>`PlanMappers.kt` | 1. `persistWorkoutEdit`, `saveProfile`, `updateCyclingFtp`, `saveActivity`, `deleteWorkout`, and `saveManualDailyEntry` enqueue items into `syncQueueDao` (or mark `dirty = true`), **but never invoke `SyncManager`**. `syncNow()` is only called on app startup, login, pull-to-refresh, or manual Settings button.<br>2. When linking a newly recorded local activity (`serverId == null`) to a workout, `completeWorkoutWithActivity` writes the local UUID into `PatchWorkoutRequest.linkedActivityId`. The server returns `404 Activity not found` (`Web/src/app/api/mobile/v1/workouts/[id]/route.ts:86`), causing `SyncManager.kt:189` to **permanently dead-letter** the workout update.<br>3. `PlanMappers.kt:129` sets `workout.activityId = linkedActivityId` (which is `serverId` on server pull), whereas local links use local `ActivityEntity.id`. | 1. Add a **fast push-only** trigger `SyncManager.pushPendingNow(reason)` (drains outbox + pushes dirty profile/readiness without slow full pulls or Strava imports) and invoke it automatically after every repository mutation.<br>2. In `SyncManager.handleOutboxItem(TYPE_WORKOUT_UPDATE)`, dynamically resolve `req.linkedActivityId` via `activityDao.byId(id)?.serverId`. If the local activity exists but `serverId == null`, defer the item (`IOException`) until `TYPE_ACTIVITY_CREATE` finishes.<br>3. In `SyncManager.pullPlans()`, resolve server `linkedActivityId` to local `activityDao.byServerId(serverId)?.id ?: serverId`. |
| **2** | **Already-Linked Workouts / Activities Show Up Again** | `CompleteWorkoutSheet.kt`<br>`WorkoutMatcher.kt`<br>`RunFlowRepository.kt` | 1. `CompleteWorkoutSheet.kt:86` filters `allActivities` only by date window (`±1d` / `±7d`) and never checks if an activity is already linked (`w.activityId`) to another workout.<br>2. `RunFlowRepository.matchWorkoutsWithActivities()` (`line 833`) only queries `workoutDao.pendingBetween(...)` and ignores completed workouts, so `WorkoutMatcher` keeps suggesting activities that are already linked to completed workouts. | 1. In `CompleteWorkoutSheet.kt`, collect all goal workouts, build `claimedActivityIds` (both `act.id` and `act.serverId` for any `w.id != workout.id`), and **hide already-linked activities by default**.<br>2. Add a small toggle button at the bottom of the sheet: **`"Show already-linked activities (N)"`** so the user can reassign an activity if needed (automatically unlinking the old workout on save).<br>3. Pass all `claimedActivityIds` (from both completed and pending workouts) into `WorkoutMatcher.matchWorkouts()` so linked activities are never re-suggested. |
| **3** | **Home Screen (`Today`) Only Shows `"Start workout"` (No `"Complete"` or `"Link"` Option)** | `DashboardScreen.kt` | `DashboardScreen.kt:831–847` only renders a single full-width `"Start workout"` button for uncompleted workouts and never mounts `CompleteWorkoutSheet`. Workouts that cannot be done in the app's GPS recorder (`STRENGTH`, `SWIM`, `CROSS_TRAIN`, indoor MyWhoosh rides) still show `"Start workout"` with no way to complete or link them on the Home screen. | 1. Mount `CompleteWorkoutSheet` on `DashboardScreen.kt`.<br>2. Add helper `WorkoutEntity.canRecordInApp(type)`: returns `true` for outdoor `RUN` and outdoor `RIDE` workouts, and `false` for `STRENGTH`, `SWIM`, `CROSS_TRAIN`, and indoor/MyWhoosh rides.<br>3. For **in-app recordable workouts**, show **two side-by-side buttons**: primary **`[ ▶ Start ]`** and tonal **`[ ✓ Complete ]`** (which opens `CompleteWorkoutSheet`).<br>4. For **non-in-app workouts**, show **only** the full-width **`[ ✓ Complete ]`** button (opening `CompleteWorkoutSheet` to link or complete without activity).<br>5. On completed Today workouts, allow tapping **`[ 🔗 Relink ]`** to open `CompleteWorkoutSheet`. |
| **4** | **Analytics Heading Spacing & Recovery / Readiness Screen Pushed Too Low** | `Common.kt`<br>`RecoveryAnalyticsTab.kt`<br>`RunningAnalyticsTab.kt`<br>`CyclingAnalyticsTab.kt`<br>`OverviewAnalyticsTab.kt` | `SectionTitle` in `Common.kt:223` uses `Row(modifier = modifier.fillMaxWidth())`. In `RecoveryAnalyticsTab.kt` (`170`, `379`, `499`), `RunningAnalyticsTab.kt` (`86`, `343`), `CyclingAnalyticsTab.kt` (`288`, `510`), and `OverviewAnalyticsTab.kt` (`132`), `SectionTitle` was placed as the first unweighted child inside another `Row(Modifier.fillMaxWidth())` alongside a trailing badge (`"Full data"`, `"On-Device"`, `"Server Verified"`, `"42d / 1Y Peak"`, `"Neutral"`). `SectionTitle` consumes 100% width, crushing the trailing badge into `0px` width so its text wraps **1 character per line vertically (10–15 lines tall)**. Because the outer `Row` uses `Alignment.CenterVertically`, the heading floats inside a ~220dp vertical void and pushes the Readiness ring and VDOT stats way down. | 1. Fix `SectionTitle` in `Common.kt` so that when `trailing == null` it does not wrap the `Text` in a greedy `fillMaxWidth()` `Row` (or uses `Modifier.weight(1f, fill = false)` when `trailing != null`).<br>2. Refactor all Analytics card headers to pass badges/icons via `SectionTitle("...", trailing = { ... })` with `maxLines = 1` on badge texts, and place multi-chip selectors (`30d / 90d / 1Y`) cleanly without squeezing.<br>3. Add a compact `"Log / Edit Today"` button on `DailyReadinessCompositeCard` in `RecoveryAnalyticsTab.kt` to open `DailyFormSheet`. |
| **5** | **5 Diagrams Removed in Analytics Refactor + Broken MMP Power Curve** | `OverviewAnalyticsTab.kt`<br>`RunningAnalyticsTab.kt`<br>`CyclingAnalyticsTab.kt`<br>`AnalyticsEngine.kt`<br>`RunFlowRepository.kt` | **A. 5 Removed Analytics Diagrams**: When splitting `AnalyticsScreen.kt` into 4 tabs, Agent-7 dropped:<br>  1. `Overview`: `90d / 180d / 1Y` range selector chips on PMC (leaving `rangeDays` at line 62 unused) + `CTL / ATL / TSB` metric progress bars (`maxCtl`, `maxAtl`, `TsbBar`).<br>  2. `Overview` / `Run`: **7-Zone Heart Rate Time-in-Zone Distribution Chart** (`ZoneDistribution(bundle.zoneSeconds)` in `Charts.kt:372`).<br>  3. `Run`: **Running Load (PMC) Chart** (`bundle.runFitnessSeries` computed at `AnalyticsEngine.kt:321` is completely unused).<br>  4. `Run`: **Race Predictions Card** (`5K`, `10K`, `Half`, `Marathon` Ideal vs. Shape-Adjusted via `AnalyticsEngine.racePredictions` + `VdotMath.predictTimeWithShapeSec`).<br>  5. `Run`: Visual curve `Canvas` on **Running Best Efforts Curve** (currently text-only) + `This Week` vs `12-Week Avg` (`bundle.avgWeeklyKm12`) tiles on **Weekly Running Volume**.<br>**B. Broken MMP Graph**:<br>  1. When 1Hz `streamsJson` aren't cached locally, `extractPowerMmp` (`AnalyticsEngine.kt:415`) returns the exact same `npWatts` for every duration from `15s` to `20m` (creating a flat horizontal line) and doesn't check `movingTimeSec >= dur`.<br>  2. `CyclingMmpCurveCard` (`CyclingAnalyticsTab.kt:313`) anchors Y at `0..maxW` with zero padding, no Y/X axis labels, no gradient fill, and no touch scrubber. | 1. **Restore all 5 removed diagrams/elements** across `OverviewAnalyticsTab.kt` and `RunningAnalyticsTab.kt`.<br>2. **Auto-Fetch Missing Ride/Run Streams**: In `RunFlowRepository`, automatically trigger background `fetchAndCacheStreams` for synced rides/runs missing `streamsJson` and call `invalidateAnalyticsCache()` when downloaded.<br>3. **Realistic Hyperbolic Fallback Curve**: When streams cannot be fetched (offline or summary-only activity), cap durations at `dur <= movingTimeSec` and interpolate a smooth Monod-Scherrer power decay between `maxWatts` (`5s`), `npWatts` (`~20m`), and `averageWatts` (`movingTimeSec`).<br>4. **Redesign MMP Canvas**: Padded Y-axis (`paddedRange`) with left `AxisLabels`, log-spaced X-axis duration labels (`5s`, `1m`, `5m`, `20m`, `60m`), smooth cubic/quadratic path + gradient fill for `42d`, dashed `1Y Peak` curve, and interactive drag scrubber. |
| **6** | **Zones Duplicated Across `AthleteScreen`, `HrZonesScreen`, and `Analytics`** | `AthleteScreen.kt`<br>`HrZonesScreen.kt`<br>`RunningAnalyticsTab.kt`<br>`CyclingAnalyticsTab.kt`<br>`RunFlowRoot.kt` | 1. `AthleteScreen.kt:271` renders `CyclingFtpCard` (Auto-estimate FTP, Manual FTP, and the full 7-Zone Coggan Power table) inline on the Athlete tab, while also showing `"Heart Rate & Power Zones"` in the `"More"` menu (`line 312`).<br>2. `HrZonesScreen.kt` is titled `"Heart Rate & Power Zones"` but only contains HR zones—Power Zones & FTP settings are missing from `HrZonesScreen.kt`.<br>3. Static zone boundary tables appear again in `Analytics`. | 1. **Remove `CyclingFtpCard` from `AthleteScreen.kt`** (leave only a single-line `"Cycling FTP"` metric row inside `"Body & thresholds"`).<br>2. **Move all FTP & Coggan Power Zone settings into `HrZonesScreen.kt`** alongside HR Zones (with a `[ Heart Rate | Cycling Power ]` segmented switcher + optional Training Paces reference tab).<br>3. In `Analytics`, keep actual **Time-in-Zone distribution bar charts** (`ZoneDistribution` for HR and `CyclingPowerZoneDistributionCard` for Power), strip static boundary tables, and add an **`"Edit Zones →"`** action button navigating directly to `HrZonesScreen`. |

---

## 2. Disjoint Subagent Execution Plan (3 Android/Sync Subagents — Zero Overlapping File Locks)

| Agent ID | Assigned Scope | Exclusive Write-Lock Files | Verification Command |
| :--- | :--- | :--- | :--- |
| **Agent-A** (`sync-linking-and-home-actions`) | **Direct Fast-Push Sync, 1:1 Activity Linking + Toggle, Home Screen `Start` + `Complete` / `Link` Actions** | `android/app/src/main/java/com/runflow2/app/data/sync/SyncManager.kt`<br>`android/app/src/main/java/com/runflow2/app/data/sync/PlanMappers.kt`<br>`android/app/src/main/java/com/runflow2/app/data/repo/RunFlowRepository.kt`<br>`android/app/src/main/java/com/runflow2/app/domain/plan/WorkoutMatcher.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/CompleteWorkoutSheet.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/PlanScreen.kt` | `cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest` |
| **Agent-B** (`analytics-layout-diagrams-and-mmp`) | **`SectionTitle` Layout Fix, Restore All 5 Removed Analytics Diagrams, Background Stream Fetch + MMP Curve Redesign** | `android/app/src/main/java/com/runflow2/app/ui/components/Common.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/components/Charts.kt`<br>`android/app/src/main/java/com/runflow2/app/domain/analytics/AnalyticsEngine.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/analytics/OverviewAnalyticsTab.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/analytics/RunningAnalyticsTab.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/analytics/CyclingAnalyticsTab.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/analytics/RecoveryAnalyticsTab.kt` | `cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest` |
| **Agent-C** (`zones-consolidation-athlete-and-navigation`) | **Move FTP & Power Zones from `AthleteScreen` into `HrZonesScreen`, Wire `"Edit Zones →"` from Analytics** | `android/app/src/main/java/com/runflow2/app/ui/screens/AthleteScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/screens/HrZonesScreen.kt`<br>`android/app/src/main/java/com/runflow2/app/ui/RunFlowRoot.kt`<br>`30.10runflow_master_implementation_agent_handoff.md` | `cd android && ./gradlew :app:compileDebugKotlin testDebugUnitTest` |

---

## 3. Copy-Paste Prompts for Each Subagent

### Agent-A Prompt (`sync-linking-and-home-actions`)

> **Role**: Direct Fast-Push Sync, 1:1 Activity Linking & Home Screen Workout Actions Agent `sync-linking-and-home-actions`
> **Exclusive Write Scope**:
> * `android/app/src/main/java/com/runflow2/app/data/sync/SyncManager.kt`
> * `android/app/src/main/java/com/runflow2/app/data/sync/PlanMappers.kt`
> * `android/app/src/main/java/com/runflow2/app/data/repo/RunFlowRepository.kt`
> * `android/app/src/main/java/com/runflow2/app/domain/plan/WorkoutMatcher.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/CompleteWorkoutSheet.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/PlanScreen.kt`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Execute the following 4 tasks completely:
>
> #### Task A.1: Fast Push-Only Sync on Every Local Mutation & Dynamic `linkedActivityId` Resolution (`SyncManager.kt`, `RunFlowRepository.kt`, `PlanMappers.kt`)
> 1. In `SyncManager.kt`:
>    * Add a `CoroutineScope(SupervisorJob() + Dispatchers.IO)` and a debounced fast-push method `fun triggerFastPush(reason: String = "mutation")` that launches `pushPendingNow(reason)` after a `250ms` debounce.
>    * Implement `suspend fun pushPendingNow(reason: String): SyncResult = mutex.withLock { ... }`:
>      * Wait for `authStore.state.first { it.initialized }`; if `!authStore.state.value.loggedIn`, return `SyncResult(skipped = true)`.
>      * Run **only the fast push steps** (no `pullActivities()`, no `pullPlans()`, no `triggerServerSync()`):
>        1. `uploadLocalPlans()`
>        2. Drain the `syncQueueDao` outbox (`handleOutboxItem` loop)
>        3. Push dirty daily readiness entries (the push loop of `syncReadiness()`, skipping the 90-day history pull)
>      * Update `_status.value` and `settings.setLastSync(...)` cleanly so the `"N pending sync"` banner in `RunFlowRoot.kt` disappears immediately once the fast push finishes.
>    * In `SyncManager.handleOutboxItem` under `TYPE_WORKOUT_UPDATE` (`SyncManager.kt:441`):
>      * Before calling `client.api().patchWorkout(localId, req)`, inspect `req.linkedActivityId`.
>      * If `req.linkedActivityId != null`, check `val localAct = db.activityDao().byId(req.linkedActivityId)`.
>      * If `localAct != null`:
>        * If `localAct.serverId != null`, replace `req = req.copy(linkedActivityId = localAct.serverId)`.
>        * If `localAct.serverId == null` (the local activity has not yet been uploaded to the server), throw `IOException("Deferring workout update until linked activity ${localAct.id} is uploaded")` so the outbox item is retried instead of getting dead-lettered with HTTP 404!
>    * In `SyncManager.pullPlans()` (`SyncManager.kt:516`), after `val (goal, serverWorkouts) = g.toEntities() ?: continue`, map each `serverWorkout`: if `serverWorkout.activityId != null`, resolve `val localActId = db.activityDao().byServerId(serverWorkout.activityId)?.id ?: serverWorkout.activityId` so `workout.activityId` always uses the local `ActivityEntity.id` when present.
>    * Register `repository.onMutationCommitted = { triggerFastPush(it) }` in `SyncManager`'s `init` block.
> 2. In `RunFlowRepository.kt`:
>    * Add `@Volatile var onMutationCommitted: ((String) -> Unit)? = null`.
>    * Invoke `onMutationCommitted?.invoke(...)` at the end of: `persistWorkoutEdit`, `createWorkoutInGoal`, `deleteWorkout`, `deleteGoalWithWorkouts`, `completeGoal`, `undoLastEdit`, `saveProfile`, `updateCyclingFtp`, `setPrimaryLoadMetric`, `saveActivity`, `updateActivityDetails`, `deleteActivity`, and `saveManualDailyEntry`.
>
> #### Task A.2: Background Stream Backfill for Synced Rides & Runs (`RunFlowRepository.kt`)
> 1. In `RunFlowRepository.kt`, add `private val streamBackfillInFlight = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()` and a `CoroutineScope(SupervisorJob() + Dispatchers.IO)` helper `private fun backfillMissingStreamsAsync(candidates: List<ActivityEntity>)`:
>    * When `authStore.state.value.loggedIn`, find up to 8 activities from `candidates` (prioritizing `RIDE` / `VIRTUAL_RIDE` with power or recent `RUN`s) where `streamsJson == null && serverId != null && !isDemo && streamBackfillInFlight.add(id)`.
>    * In a background coroutine, call `fetchAndCacheStreams(act.id, act.serverId!!)` for each; if any returned `true`, call `invalidateAnalyticsCache()`.
> 2. Call `backfillMissingStreamsAsync(allRows)` inside `RunFlowRepository.analytics(rangeDays)` so missing power/pace streams are fetched automatically on demand and fall back to the mathematical curve only when offline or when the activity has no server streams.
>
> #### Task A.3: Exclude Already-Linked Activities by Default + Small Toggle in `CompleteWorkoutSheet.kt` & `WorkoutMatcher.kt`
> 1. In `WorkoutMatcher.kt`:
>    * Add parameter `claimedActivityIds: Set<String> = emptySet()` to `findBestMatch(workout, activities, claimedActivityIds)` and `matchWorkouts(workouts, activities, initialClaimedActivityIds)`.
>    * Exclude any candidate activity where `act.id in claimedActivityIds || (act.serverId != null && act.serverId in claimedActivityIds)`.
>    * Inside `matchWorkouts`, maintain a mutable `claimed = initialClaimedActivityIds.toMutableSet()` and add `best.id` (and `best.serverId`) as each workout claims a suggestion so two workouts on the same day never suggest the same activity.
> 2. In `RunFlowRepository.kt` (`matchWorkoutsWithActivities` at line 833 and `saveActivity` at line 261):
>    * Query all workouts for the active goal (or in the ±30d window, including completed workouts) to collect all already-linked `activityId`s (`w.activityId` and `w.suggestedActivityId` from other workouts, plus their matching `ActivityEntity.id` / `serverId`), and pass that set as `claimedActivityIds` to `WorkoutMatcher`.
> 3. In `CompleteWorkoutSheet.kt`:
>    * Collect `val goalWorkouts by container.repository.workoutsForGoal(workout.goalId).collectAsState(initial = emptyList())`.
>    * Build `val linkedToOtherWorkoutMap: Map<String, WorkoutEntity>` mapping both `act.id` and `act.serverId` to the `WorkoutEntity` (`w.id != workout.id && w.activityId != null`) that already claims that activity.
>    * Add `var showAlreadyLinked by remember { mutableStateOf(false) }`.
>    * Split `allCandidateActivities` (within `±dayWindow`) into `unlinkedCandidates` (`act.id !in linkedToOtherWorkoutMap || act.id == workout.activityId`) and `alreadyLinkedCandidates` (`act.id in linkedToOtherWorkoutMap && act.id != workout.activityId`).
>    * By default, display `unlinkedCandidates` (or `allCandidateActivities` when `showAlreadyLinked == true`).
>    * If `alreadyLinkedCandidates.isNotEmpty()`, render a small compact toggle `TextButton` at the bottom of the list:
>      `Text(if (showAlreadyLinked) "Hide already-linked activities (${alreadyLinkedCandidates.size})" else "Show already-linked activities (${alreadyLinkedCandidates.size})")`.
>    * When an already-linked activity is shown, display a small caption `"Already linked to ${otherWorkout.customName ?: otherWorkout.workoutType}"`, and if the user links it to the current workout, `completeWorkoutWithActivity` in `RunFlowRepository.kt` must first clear `activityId = null` on any other workout that previously referenced that `activityId`.
> 4. In `PlanScreen.kt:137`, build `activitiesById` indexing both `act.id` and `act.serverId` (`buildMap { activities.forEach { put(it.id, it); it.serverId?.let { s -> put(s, it) } } }`) so compliance calculations always find the linked activity regardless of whether `id` or `serverId` is stored.
>
> #### Task A.4: Home Screen (`DashboardScreen.kt`) Workout Actions — `Start` + `Complete` for In-App Recordable, `Complete` Only for Non-In-App, and Link Sheet
> 1. In `DashboardScreen.kt`:
>    * Add `var showCompleteSheetForWorkout by remember { mutableStateOf<com.runflow2.app.data.db.WorkoutEntity?>(null) }`.
>    * Add helper function:
>      ```kotlin
>      private fun com.runflow2.app.data.db.WorkoutEntity.canRecordInApp(type: WorkoutType): Boolean {
>          val s = sport.uppercase()
>          val wt = (webWorkoutType ?: workoutType).uppercase()
>          if (s == "SWIM" || s == "STRENGTH" || wt in setOf("SWIM", "SWIM_DRILL", "OPEN_WATER_SWIM", "STRENGTH", "WORKOUT", "CROSS_TRAIN", "REST", "TRANSITION_PRACTICE", "VIRTUAL_RIDE")) {
>              return false
>          }
>          if (description.contains("MyWhoosh", ignoreCase = true) || description.contains("Zwift", ignoreCase = true)) {
>              return false
>          }
>          return type in setOf(
>              WorkoutType.EASY, WorkoutType.RECOVERY, WorkoutType.LONG_RUN,
>              WorkoutType.TEMPO, WorkoutType.INTERVALS, WorkoutType.FARTLEK,
>              WorkoutType.REPETITIONS, WorkoutType.RACE, WorkoutType.RIDE,
>          )
>      }
>      ```
>    * In the Today's Workout card (`DashboardScreen.kt:831–847`):
>      * When `!w.isCompleted && type != WorkoutType.REST`:
>        * If `w.canRecordInApp(type)` is `true`, render **two side-by-side buttons** in a `Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp))`:
>          1. `Button(onClick = { onStartWorkout(w.id) }, modifier = Modifier.weight(1f))` with `Icons.Outlined.PlayArrow` and `Text("Start")`
>          2. ` androidx.compose.material3.FilledTonalButton(onClick = { showCompleteSheetForWorkout = w }, modifier = Modifier.weight(1f))` with `Icons.Outlined.Check` and `Text("Complete")`
>        * If `w.canRecordInApp(type)` is `false`, render **only a single full-width button**:
>          * `Button(onClick = { showCompleteSheetForWorkout = w }, modifier = Modifier.fillMaxWidth())` with `Icons.Outlined.Check` and `Text("Complete")` (which opens `CompleteWorkoutSheet` so the user can link an external activity or complete without activity).
>      * When `w.isCompleted`:
>        * Look up the linked activity (`val linkedAct = activities.firstOrNull { it.id == w.activityId || (it.serverId != null && it.serverId == w.activityId) }`).
>        * Render a `Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically)` showing:
>          * `InfoChip(if (linkedAct != null) "✓ ${linkedAct.name}" else "✓ Completed", container = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)`
>          * `TextButton(onClick = { showCompleteSheetForWorkout = w }) { Text(if (linkedAct != null) "Relink 🔗" else "Link activity 🔗") }`
>    * At the bottom of `DashboardScreen.kt`, mount `CompleteWorkoutSheet`:
>      ```kotlin
>      showCompleteSheetForWorkout?.let { target ->
>          val liveTarget = workouts.firstOrNull { it.id == target.id } ?: target
>          CompleteWorkoutSheet(
>              workout = liveTarget,
>              container = container,
>              onDismiss = { showCompleteSheetForWorkout = null },
>          )
>      }
>      ```

---

### Agent-B Prompt (`analytics-layout-diagrams-and-mmp`)

> **Role**: Analytics Heading Spacing Fix, Restoration of 5 Removed Diagrams & MMP Curve Redesign Agent `analytics-layout-diagrams-and-mmp`
> **Exclusive Write Scope**:
> * `android/app/src/main/java/com/runflow2/app/ui/components/Common.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/components/Charts.kt`
> * `android/app/src/main/java/com/runflow2/app/domain/analytics/AnalyticsEngine.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/analytics/OverviewAnalyticsTab.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/analytics/RunningAnalyticsTab.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/analytics/CyclingAnalyticsTab.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/analytics/RecoveryAnalyticsTab.kt`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Execute the following 5 tasks completely:
>
> #### Task B.1: Fix `SectionTitle` `fillMaxWidth()` Collision in `Common.kt` & All 4 Analytics Tabs
> 1. In `android/app/src/main/java/com/runflow2/app/ui/components/Common.kt:217`:
>    Update `SectionTitle` so it never starves sibling composables if placed inside a `Row`, and properly weights its title when `trailing` is provided:
>    ```kotlin
>    @Composable
>    fun SectionTitle(
>        text: String,
>        modifier: Modifier = Modifier,
>        trailing: (@Composable () -> Unit)? = null,
>    ) {
>        if (trailing == null) {
>            Text(
>                text = text,
>                modifier = modifier,
>                style = MaterialTheme.typography.titleMedium,
>                fontWeight = FontWeight.SemiBold,
>                color = MaterialTheme.colorScheme.onSurface,
>            )
>        } else {
>            Row(
>                modifier = modifier.fillMaxWidth(),
>                verticalAlignment = Alignment.CenterVertically,
>                horizontalArrangement = Arrangement.SpaceBetween,
>            ) {
>                Text(
>                    text = text,
>                    modifier = Modifier.weight(1f, fill = false).padding(end = 8.dp),
>                    style = MaterialTheme.typography.titleMedium,
>                    fontWeight = FontWeight.SemiBold,
>                    color = MaterialTheme.colorScheme.onSurface,
>                )
>                trailing()
>            }
>        }
>    }
>    ```
> 2. Across `RecoveryAnalyticsTab.kt`, `RunningAnalyticsTab.kt`, `CyclingAnalyticsTab.kt`, and `OverviewAnalyticsTab.kt`, replace every outer `Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { SectionTitle("..."); ... }` with `SectionTitle("...", trailing = { ... })` and ensure all badge `Text` elements have `maxLines = 1` so no header ever wraps vertically or creates excessive vertical whitespace above/below headings.
> 3. In `RecoveryAnalyticsTab.kt` (`DailyReadinessCompositeCard`), add a compact `"Log / Edit"` `TextButton` in the card header (or bottom row) that opens `DailyFormSheet(container = container, onDismiss = ...)` so the user can log or update today's readiness directly from the Recovery tab.
>
> #### Task B.2: Restore Removed Diagrams in `OverviewAnalyticsTab.kt` (PMC Range FilterChips, CTL/ATL/TSB Metric Bars, & 7-Zone HR Distribution Chart)
> 1. In `AnalyticsScreen.kt`, add parameter `onOpenZones: () -> Unit = {}` and pass it down to `OverviewAnalyticsTab`, `RunningAnalyticsTab`, and `CyclingAnalyticsTab`.
> 2. In `OverviewAnalyticsTab.kt`:
>    * Inside the **Fitness & Form (PMC)** card (`line 120`):
>      * Add the `90d | 180d | 1Y` `FilterChip` selector row wired to `rangeDays` (`listOf(90, 180, 365)`).
>      * Above `PmcChart`, restore the interactive **CTL / ATL / TSB Metric Progress Bars**:
>        * `Fitness (CTL)` bar (`bundle.ctl` vs `maxOf(bundle.maxCtl, bundle.ctl, 1.0)`) and `Fatigue (ATL)` bar (`bundle.atl` vs `maxOf(bundle.maxAtl, bundle.atl, 1.0)`), with tap-to-toggle between absolute values and `% of all-time peak`.
>        * Bidirectional center-zero `Form (TSB)` bar (`TsbBar(tsb = bundle.tsb)`).
>    * Below the Load & Injury Risk card, **restore the 7-Zone Heart Rate Distribution Card**:
>      * Render `ZoneDistribution(zonesSeconds = bundle.zoneSeconds)` (from `Charts.kt:372`) when `bundle.zoneSeconds.sum() > 0`, with `SectionTitle("Heart Rate Zone Distribution", trailing = { TextButton(onClick = onOpenZones) { Text("Edit Zones →") } })`.
>
> #### Task B.3: Restore Removed Diagrams in `RunningAnalyticsTab.kt` (Running PMC Chart, Race Predictions Card, Best Efforts Curve Canvas, & 12-Week Avg Volume Tiles)
> 1. In `RunningAnalyticsTab.kt`:
>    * **Training Paces Card**: Add `trailing = { TextButton(onClick = onOpenZones) { Text("Edit Zones →") } }` to `SectionTitle("Training Paces ...")`.
>    * **Restore Race Predictions Card** (using `val predVo2 = bundle.aerobicVo2max ?: bundle.effectiveVdot`):
>      * When `predVo2 != null && predVo2 > 0`, render a **Race Predictions (`5K`, `10K`, `Half Marathon`, `Marathon`)** card comparing **Now (Shape-Adjusted)** (`VdotMath.predictTimeWithShapeSec(predVo2, distM, shapeScore)`) vs **Ideal VDOT** (`VdotMath.predictTimeSec(predVo2, distM)`), with a visual readiness ratio bar per distance.
>    * **Restore Running Load (PMC) Card (`bundle.runFitnessSeries`)**:
>      * When `bundle.runFitnessSeries.isNotEmpty()`, render a **Running Load (PMC)** card with `90d / 180d / 1Y` range chips, `CTL / ATL / TSB` toggles, and `FitnessChart(daily = bundle.runFitnessSeries.map { it.toDailyLoad() }.takeLast(runRangeDays), ...)`.
>    * **Add Visual Pace Curve Canvas to `Running Best Efforts Curve`**:
>      * Above the PR table in `Running Best Efforts Curve` (`line 330`), when `bundle.bestEfforts.size >= 2`, render a `140.dp` `Canvas` plotting pace (`sec/km`, fastest at top, padded range with left `AxisLabels` formatted as `m:ss`) across the standard distances (`400m` to `Marathon`) with a smooth curve, gradient fill, and data point dots.
>    * **Restore `This Week` & `12-Week Avg` StatTiles on `Weekly Running Volume (26 Weeks)`**:
>      * Above `WeeklyVolumeBars` (`line 398`), render a `Row` with two `StatTile`s: `This Week` (`Format.distance(bundle.currentWeekKm, unit, 1)`) and `12-Week Avg` (`Format.distance(bundle.avgWeeklyKm12, unit, 1)`).
>
> #### Task B.4: Fix MMP Power Curve Fallback Math in `AnalyticsEngine.kt` & Redesign `CyclingMmpCurveCard` in `CyclingAnalyticsTab.kt`
> 1. In `AnalyticsEngine.kt` (`extractPowerMmp` at lines `401–428`):
>    * Use `BestEffortsEngine.findMeanMaximalPowerWithTime` when both `watts` and `time` streams are present in `streamsJson`, or `findMeanMaximalPower(wattsStream, listOf(dur))` when `wattsStream` is present.
>    * When `wattsStream == null` (fallback before streams are fetched or for summary-only rides):
>      * **Never extrapolate beyond the ride's actual duration**: if `r.movingTimeSec < dur`, skip this ride for `dur` (`0.0`).
>      * Compute a smooth, physiologically realistic hyperbolic power-decay estimate between `maxW` (`r.maxWatts ?: (baseW * 1.65)`), `npW` (`r.npWatts ?: r.averageWatts ?: 0.0`), and `avgW` (`r.averageWatts ?: npW`):
>        ```kotlin
>        val baseW = r.npWatts ?: r.averageWatts ?: 0.0
>        val avgW = r.averageWatts ?: baseW
>        val peak5s = (r.maxWatts?.takeIf { it > baseW } ?: (baseW * 1.65))
>        // Monod-Scherrer / power-law decay anchored at 5s -> peak5s, 1200s -> baseW, movingTime -> avgW
>        val decayFrac = (5.0 / dur.toDouble()).pow(0.28)
>        val aerobicBase = if (dur <= 1200) baseW * (1.0 - 0.04 * ln(dur / 60.0).coerceAtLeast(0.0)) else avgW
>        val estimatedW = (aerobicBase + (peak5s - aerobicBase) * decayFrac).coerceAtLeast(avgW * 0.90)
>        ```
>        This guarantees a strictly decreasing curve (`5s > 15s > 30s > 1m > 2m > 5m > 10m > 20m > 30m > 60m`) and ensures `p300 > p1200` so `cpWatts` and `wPrimeKj` compute cleanly even before full streams finish downloading.
> 2. In `CyclingAnalyticsTab.kt` (`CyclingMmpCurveCard` at lines `262–403`):
>    * Replace the bare `Canvas` with a full, polished chart matching `Charts.kt`:
>      * Compute `val allWatts = durations.flatMap { listOfNotNull(mmp42Map[it]?.maxWatts, mmp1yMap[it]?.maxWatts) }` and use a padded Y-range (`minW = (allWatts.minOrNull() ?: 100.0) * 0.90`, `maxW = (allWatts.maxOrNull() ?: 400.0) * 1.06`) so the curve fills the vertical canvas and dots never clip at `y = 0`.
>      * Add a left-hand Y-axis column (`38.dp` wide) showing `${maxW.roundToInt()}W`, `${((minW + maxW) / 2).roundToInt()}W`, and `${minW.roundToInt()}W`.
>      * Add `var scrubIndex by remember { mutableStateOf<Int?>(null) }` with `pointerInput(durations.size) { detectDragGestures(...) }` so dragging across the MMP chart highlights the selected duration and displays a live readout pill (`"5m · 42d: 285 W · 1Y Peak: 310 W"`).
>      * Draw a smooth curve (`quadraticTo` / cubic bezier) with a `Brush.verticalGradient` area fill under the `42d` curve, a dashed stroke (`PathEffect.dashPathEffect`) for the `1Y Peak` curve, and crisp circular markers at each duration.
>      * Add a bottom X-axis label row displaying `5s`, `30s`, `2m`, `10m`, and `60m` (or first/mid/last durations).
> 3. In `CyclingAnalyticsTab.kt` (`CyclingPowerZoneDistributionCard` at line `547`):
>    * Keep the **stacked horizontal bar** and **time-in-zone percentage rows** (`Z1..Z7` duration and `%`), remove the static watt-boundary definitions column (`rangeText`), and add `trailing = { TextButton(onClick = onOpenZones) { Text("Edit Zones →") } }` to `SectionTitle("7-Zone Power Distribution")`.

---

### Agent-C Prompt (`zones-consolidation-athlete-and-navigation`)

> **Role**: Heart Rate & Power Zones Consolidation (`AthleteScreen.kt` → `HrZonesScreen.kt`) & Navigation Wiring Agent `zones-consolidation-athlete-and-navigation`
> **Exclusive Write Scope**:
> * `android/app/src/main/java/com/runflow2/app/ui/screens/AthleteScreen.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/screens/HrZonesScreen.kt`
> * `android/app/src/main/java/com/runflow2/app/ui/RunFlowRoot.kt`
> * `30.10runflow_master_implementation_agent_handoff.md`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Execute the following 4 tasks completely:
>
> #### Task C.1: Remove `CyclingFtpCard` & Power Zones Table from `AthleteScreen.kt`
> 1. In `android/app/src/main/java/com/runflow2/app/ui/screens/AthleteScreen.kt`:
>    * Remove the `SectionTitle("Cycling FTP & Power Zones")` and `CyclingFtpCard(...)` items (lines `270–285`) and delete the `CyclingFtpCard` composable (`lines 455–647`).
>    * Inside the `"Body & thresholds"` card (`lines 253–267`), add a single clean summary line for Cycling FTP:
>      ```kotlin
>      val activeFtp = if (settings.ftpWatts > 0) settings.ftpWatts else (analytics?.cycling?.eFtpWatts ?: AnalyticsEngine.estimateBikeFtpFromVdot(analytics?.effectiveVdot ?: 0.0, p?.weightKg ?: 70.0) ?: 0)
>      MetricLine(Icons.Outlined.Bolt, "Cycling FTP", if (activeFtp > 0) "$activeFtp W${if (settings.ftpWatts == 0) " (auto)" else ""}" else "—")
>      ```
>    * In the `"More"` menu card (`line 312`), keep `MenuRow(Icons.Outlined.MonitorHeart, "Heart Rate & Power Zones", "Edit HR zones, Cycling FTP & Coggan power zones", onHrZones)`.
>
> #### Task C.2: Move All Cycling FTP & 7-Zone Coggan Power Settings into `HrZonesScreen.kt`
> 1. In `android/app/src/main/java/com/runflow2/app/ui/screens/HrZonesScreen.kt`:
>    * Collect `val settings by container.settings.settings.collectAsState(initial = AppSettings())` and `val analytics by produceState<AnalyticsBundle?>(null) { value = container.repository.analytics(365) }`.
>    * Add a top 2-tab `SingleChoiceSegmentedButtonRow` inside `HrZonesScreen`:
>      * **Tab 0: `Heart Rate Zones`** (`Icons.Outlined.MonitorHeart`) — renders the Karvonen Auto toggle, Max HR & Resting HR quick-edit row, manual `Z1..Z6` BPM sliders, and 7-zone HR preview bars.
>      * **Tab 1: `Power & FTP Zones`** (`Icons.Outlined.Bolt`) — renders:
>        1. **Cycling FTP Configuration Card**:
>           * `Manual FTP` / `Active FTP (eFTP)` and `Power / Weight (W/kg)` `StatTile`s.
>           * `Auto-estimate FTP` toggle (`PixelSwitch` calling `container.repository.updateCyclingFtp(settings.ftpWatts, checked)`).
>           * `Manual FTP (Watts)` inline `OutlinedTextField` + `[ Save FTP ]` button (or dialog) calling `container.repository.updateCyclingFtp(watts, settings.autoEstimateFtp)`.
>        2. **Coggan 7-Zone Power Model Card**:
>           * Full 7-zone breakdown (`Z1 Active Recovery < 55%` through `Z7 Neuromuscular > 150%`) with colored zone pills, `% FTP` ranges, and live calculated watt boundaries (`< ${z.maxWatts} W`, `${z.minWatts}–${z.maxWatts} W`, `> ${z.minWatts} W`) plus proportional visual preview bars.
>
> #### Task C.3: Wire `onOpenZones` in `RunFlowRoot.kt`
> 1. In `android/app/src/main/java/com/runflow2/app/ui/RunFlowRoot.kt` (`composable(Routes.ANALYTICS)` at line `359`):
>    * Pass `onOpenZones = { navController.navigate(Routes.HR_ZONES) }` into `AnalyticsScreen(container = container, targetSection = section, onOpenZones = { navController.navigate(Routes.HR_ZONES) })`.
>
> #### Task C.4: Update `30.10runflow_master_implementation_agent_handoff.md`
> 1. Update `30.10runflow_master_implementation_agent_handoff.md` to document:
>    * Fast-push direct mutation synchronization (`SyncManager.triggerFastPush` & dynamic `linkedActivityId` resolution).
>    * Strict 1:1 activity-to-workout linking with the `"Show already-linked activities"` reassignment toggle in `CompleteWorkoutSheet.kt`.
>    * Context-aware Home Screen (`Today`) workout actions (`Start` + `Complete` for in-app GPS workouts; `Complete` only for non-in-app workouts).
>    * Fixed `SectionTitle` layout behavior, all restored Analytics charts (PMC range chips & metric bars, 7-zone HR distribution, Running PMC, Race Predictions, Best Efforts curve canvas, 12w volume tiles), and the upgraded MMP curve with automatic stream backfill + hyperbolic decay fallback.
>    * Consolidated Heart Rate & Power/FTP Zones inside `HrZonesScreen.kt`.
