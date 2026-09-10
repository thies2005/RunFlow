package com.runflow2.app.data.repo

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityDao
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.GoalDao
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.PlanSnapshotDao
import com.runflow2.app.data.db.PlanSnapshotEntity
import com.runflow2.app.data.db.ProfileDao
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.SyncQueueDao
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.db.WorkoutDao
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.sync.SyncManager
import com.runflow2.app.data.sync.MAX_PLAN_SNAPSHOTS_PER_GOAL
import com.runflow2.app.data.sync.parseSnapshotJson
import com.runflow2.app.data.sync.restoreDiff
import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.data.sync.toCreateRequest
import com.runflow2.app.data.sync.toCreateWorkoutPayload
import com.runflow2.app.data.sync.toEntities
import com.runflow2.app.data.sync.toEntity
import com.runflow2.app.data.sync.toPatchRequest
import com.runflow2.app.data.sync.toSnapshotJson
import com.runflow2.app.data.sync.toUpdateRequest
import com.runflow2.app.domain.analytics.ActivityInput
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.domain.model.ActivityType
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.PlanGenerator
import com.runflow2.app.domain.plan.PlanSpec
import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

class RunFlowRepository(
    private val db: AppDatabase,
    private val activityDao: ActivityDao,
    private val goalDao: GoalDao,
    private val workoutDao: WorkoutDao,
    private val profileDao: ProfileDao,
    private val syncQueueDao: SyncQueueDao,
    private val planSnapshotDao: PlanSnapshotDao,
    private val authStore: AuthStore,
    private val network: NetworkClient,
) {
    // ---------- profile ----------
    val profile: Flow<ProfileEntity?> = profileDao.observe()

    suspend fun profileOnce(): ProfileEntity = profileDao.get() ?: ProfileEntity()

    /** Saves locally immediately; queues an upload when logged in. */
    suspend fun saveProfile(profile: ProfileEntity) {
        if (authStore.state.value.loggedIn) {
            val payload = Api.json.encodeToString(
                com.runflow2.app.data.net.UpdateProfileRequest.serializer(),
                profile.toUpdateRequest(),
            )
            db.withTransaction {
                profileDao.upsert(profile.copy(dirty = true))
                syncQueueDao.deletePendingFor(SyncManager.TYPE_PROFILE_UPDATE, "1")
                syncQueueDao.insert(
                    SyncQueueEntity(
                        entityType = SyncManager.TYPE_PROFILE_UPDATE,
                        localId = "1",
                        payloadJson = payload,
                    )
                )
            }
        } else {
            profileDao.upsert(profile)
        }
    }

    // ---------- activities ----------
    val activities: Flow<List<ActivityEntity>> = activityDao.observeAll()
    fun recentActivities(limit: Int): Flow<List<ActivityEntity>> = activityDao.observeRecent(limit)

    suspend fun activity(id: String): ActivityEntity? = activityDao.byId(id)

    /** Saves locally immediately; queues an upload when logged in. */
    suspend fun saveActivity(a: ActivityEntity) {
        if (authStore.state.value.loggedIn && a.serverId == null) {
            val payload = Api.json.encodeToString(
                com.runflow2.app.data.net.CreateActivityRequest.serializer(),
                a.toCreateRequest(),
            )
            db.withTransaction {
                activityDao.upsert(a.copy(dirty = true, updatedAt = System.currentTimeMillis()))
                syncQueueDao.deletePendingFor(SyncManager.TYPE_ACTIVITY_CREATE, a.id)
                syncQueueDao.insert(
                    SyncQueueEntity(
                        entityType = SyncManager.TYPE_ACTIVITY_CREATE,
                        localId = a.id,
                        payloadJson = payload,
                    )
                )
            }
        } else {
            activityDao.upsert(a)
        }
    }

    suspend fun deleteActivity(id: String) = activityDao.delete(id)

    suspend fun clearActivities() = activityDao.clear()

    // ---------- goals & workouts ----------
    val activeGoal: Flow<GoalEntity?> = goalDao.observeActive()
    val goals: Flow<List<GoalEntity>> = goalDao.observeAll()

    fun workoutsForGoal(goalId: String): Flow<List<WorkoutEntity>> = workoutDao.observeForGoal(goalId)

    suspend fun workout(id: String): WorkoutEntity? = workoutDao.byId(id)

    suspend fun goal(id: String): GoalEntity? = goalDao.byId(id)

    suspend fun pendingWorkoutsToday(today: LocalDate): List<WorkoutEntity> {
        val from = Format.epochMillis(today)
        val to = Format.epochMillis(today.plusDays(1)) - 1
        return workoutDao.pendingBetween(from, to)
    }

    // ---------- plan edit snapshots (undo) ----------

    /** Undo depth for the UI: how many snapshots exist for a goal. */
    fun snapshotCountForGoal(goalId: String): Flow<Int> = planSnapshotDao.snapshotCountForGoal(goalId)

    /**
     * Captures the goal's current workouts as an undo snapshot (web:
     * snapshot.ts createSnapshot — the API routes auto-snapshot before every
     * workout mutation). Taken for local-only plans too: undo is pure local
     * and must work offline. The history is pruned to the newest
     * [MAX_PLAN_SNAPSHOTS_PER_GOAL] rows per goal.
     */
    private suspend fun snapshotGoal(goalId: String) {
        planSnapshotDao.insertSnapshot(
            PlanSnapshotEntity(
                goalId = goalId,
                createdAtEpochMs = System.currentTimeMillis(),
                workoutsJson = workoutDao.forGoal(goalId).toSnapshotJson(),
            )
        )
        planSnapshotDao.deleteOldestBeyond(goalId, MAX_PLAN_SNAPSHOTS_PER_GOAL)
    }

    /**
     * Undoes the last plan edit by restoring the goal's newest snapshot
     * (web: snapshot.ts restoreFromSnapshot, but as an id-diff instead of a
     * delete-all-and-recreate so sync state survives). Everything happens in
     * one transaction; the consumed snapshot is deleted so the next undo goes
     * one step further back. Returns false when there is nothing to undo.
     */
    suspend fun undoLastEdit(goalId: String): Boolean {
        val snapshot = planSnapshotDao.latestForGoal(goalId, 1).firstOrNull() ?: return false
        val snap = parseSnapshotJson(snapshot.workoutsJson)
        if (snap == null) {
            // Corrupt snapshot: useless data — drop it so undo can reach older ones.
            planSnapshotDao.delete(snapshot.id)
            return false
        }
        val goal = goalDao.byId(goalId)
        val synced = goal != null && !goal.isLocalOnly && authStore.state.value.loggedIn
        val stats = db.withTransaction {
            val plan = restoreDiff(workoutDao.forGoal(goalId), snap)
            // rows changed since the snapshot: put their snapshot state back
            for (s in plan.updates) {
                val entity = s.toEntity()
                if (synced) {
                    val payload = Api.json.encodeToString(
                        com.runflow2.app.data.net.PatchWorkoutRequest.serializer(),
                        entity.toPatchRequest(),
                    )
                    workoutDao.upsert(entity.copy(dirty = true))
                    syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_UPDATE, entity.id)
                    syncQueueDao.insert(
                        SyncQueueEntity(
                            entityType = SyncManager.TYPE_WORKOUT_UPDATE,
                            localId = entity.id,
                            payloadJson = payload,
                        )
                    )
                } else {
                    workoutDao.upsert(entity)
                }
            }
            // rows deleted since the snapshot: bring them back
            for (s in plan.reinstates) {
                val pendingDelete = syncQueueDao.pendingFor(SyncManager.TYPE_WORKOUT_DELETE, s.id)
                if (pendingDelete.isEmpty() && synced) {
                    // The server row is gone (delete already pushed) or the
                    // create was cancelled before it ever left: re-create it
                    // server-side with a fresh temp id, exactly like a new
                    // workout — the outbox reconciles temp → server id.
                    val id = UUID.randomUUID().toString()
                    val entity = s.toEntity().copy(id = id, dirty = true)
                    val payload = Api.json.encodeToString(
                        com.runflow2.app.data.net.WorkoutCreatePayload.serializer(),
                        entity.toCreateWorkoutPayload(goalId),
                    )
                    workoutDao.upsert(entity)
                    syncQueueDao.insert(
                        SyncQueueEntity(
                            entityType = SyncManager.TYPE_WORKOUT_CREATE,
                            localId = id,
                            payloadJson = payload,
                        )
                    )
                } else {
                    // Local-only plan — or the delete never left the device:
                    // cancel it and revive the row. For synced plans mark it
                    // dirty + push the snapshot state, so an edit that landed
                    // on the server between snapshot and delete can't silently
                    // overwrite the restore on the next pull.
                    pendingDelete.forEach { syncQueueDao.markCompleted(it.id) }
                    if (synced) {
                        val entity = s.toEntity().copy(dirty = true)
                        val payload = Api.json.encodeToString(
                            com.runflow2.app.data.net.PatchWorkoutRequest.serializer(),
                            entity.toPatchRequest(),
                        )
                        workoutDao.upsert(entity)
                        syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_UPDATE, entity.id)
                        syncQueueDao.insert(
                            SyncQueueEntity(
                                entityType = SyncManager.TYPE_WORKOUT_UPDATE,
                                localId = entity.id,
                                payloadJson = payload,
                            )
                        )
                    } else {
                        workoutDao.upsert(s.toEntity())
                    }
                }
            }
            // rows created since the snapshot: remove them again (same
            // outbox conventions as deleteWorkout)
            for (w in plan.removals) {
                if (synced) {
                    val pendingCreate = syncQueueDao.pendingFor(SyncManager.TYPE_WORKOUT_CREATE, w.id)
                    if (pendingCreate.isEmpty()) {
                        syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_UPDATE, w.id)
                        syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_DELETE, w.id)
                        syncQueueDao.insert(
                            SyncQueueEntity(
                                entityType = SyncManager.TYPE_WORKOUT_DELETE,
                                localId = w.id,
                                payloadJson = Api.json.encodeToString(
                                    com.runflow2.app.data.net.WorkoutDeletePayload.serializer(),
                                    com.runflow2.app.data.net.WorkoutDeletePayload(goalId = goalId),
                                ),
                            )
                        )
                    } else {
                        // the server never saw this workout: cancel the create
                        pendingCreate.forEach { syncQueueDao.markCompleted(it.id) }
                    }
                }
                workoutDao.delete(w.id)
            }
            // consume the snapshot so the next undo goes one step further back
            planSnapshotDao.delete(snapshot.id)
            Triple(plan.updates.size, plan.reinstates.size, plan.removals.size)
        }
        AppLog.i("Plan", "undo on goal $goalId: ${stats.first} update(s), ${stats.second} reinstated, ${stats.third} removed")
        return true
    }

    /**
     * Persists a workout edit. For plans that sync with the server, the edit
     * is flagged dirty and a full-state PATCH is queued in the outbox (the
     * outbox keeps the newest payload per workout); local-only plans write
     * straight to Room as before.
     */
    private suspend fun persistWorkoutEdit(w: WorkoutEntity) {
        val goal = goalDao.byId(w.goalId)
        if (goal == null || goal.isLocalOnly || !authStore.state.value.loggedIn) {
            workoutDao.upsert(w)
            return
        }
        val payload = Api.json.encodeToString(
            com.runflow2.app.data.net.PatchWorkoutRequest.serializer(),
            w.toPatchRequest(),
        )
        db.withTransaction {
            workoutDao.upsert(w.copy(dirty = true))
            syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_UPDATE, w.id)
            syncQueueDao.insert(
                SyncQueueEntity(
                    entityType = SyncManager.TYPE_WORKOUT_UPDATE,
                    localId = w.id,
                    payloadJson = payload,
                )
            )
        }
    }

    suspend fun saveWorkout(w: WorkoutEntity) {
        snapshotGoal(w.goalId)
        persistWorkoutEdit(w)
    }

    /**
     * Saves structured steps built by the interval editor. Follows
     * [saveWorkout] exactly: the row is re-loaded, swapped to the new JSON and
     * routed through [persistWorkoutEdit], which flags it dirty and enqueues
     * the workout_update outbox item for synced plans (local-only plans write
     * straight to Room).
     */
    suspend fun saveStructuredSteps(workoutId: String, json: String) {
        val w = workoutDao.byId(workoutId) ?: return
        snapshotGoal(w.goalId)
        persistWorkoutEdit(w.copy(structuredStepsJson = json))
    }

    suspend fun completeWorkout(id: String, activityId: String?) {
        val w = workoutDao.byId(id) ?: return
        persistWorkoutEdit(w.copy(isCompleted = true, completedAt = System.currentTimeMillis(), activityId = activityId))
    }

    suspend fun uncompleteWorkout(id: String) {
        val w = workoutDao.byId(id) ?: return
        persistWorkoutEdit(w.copy(isCompleted = false, completedAt = null, activityId = null))
    }

    /**
     * Inserts a new workout into a goal. Synced plans mint a temp local id,
     * flag it dirty and enqueue a workout_create outbox item (reconciled to
     * the server id when the push drains); local-only plans write straight to
     * Room — they upload wholesale in task 3h.
     */
    suspend fun createWorkoutInGoal(
        goalId: String,
        date: LocalDate,
        workoutType: WorkoutType,
        name: String? = null,
        distanceKm: Double? = null,
        paceSecPerKm: Int? = null,
        phase: PlanPhase,
        structuredStepsJson: String? = null,
    ): String {
        snapshotGoal(goalId)
        val goal = goalDao.byId(goalId)
        val id = UUID.randomUUID().toString()
        val entity = WorkoutEntity(
            id = id,
            goalId = goalId,
            scheduledDate = Format.epochMillis(date),
            workoutType = workoutType.name,
            phase = phase.name,
            description = name?.takeIf { it.isNotBlank() } ?: workoutType.label,
            targetDistanceKm = distanceKm,
            targetPaceSecPerKm = paceSecPerKm,
            targetDurationSec = null,
            customName = name?.takeIf { it.isNotBlank() },
            structuredStepsJson = structuredStepsJson,
        )
        if (goal == null || goal.isLocalOnly || !authStore.state.value.loggedIn) {
            workoutDao.upsert(entity)
        } else {
            val payload = Api.json.encodeToString(
                com.runflow2.app.data.net.WorkoutCreatePayload.serializer(),
                entity.toCreateWorkoutPayload(goalId),
            )
            db.withTransaction {
                workoutDao.upsert(entity.copy(dirty = true))
                syncQueueDao.insert(
                    SyncQueueEntity(
                        entityType = SyncManager.TYPE_WORKOUT_CREATE,
                        localId = id,
                        payloadJson = payload,
                    )
                )
            }
        }
        return id
    }

    /**
     * Deletes a workout. Local-only plans (or signed-out users) hard-delete as
     * before; synced plans enqueue a workout_delete outbox item and delete the
     * local row (the next pull confirms). A workout whose create is still
     * queued never reached the server — its create item is cancelled instead.
     */
    suspend fun deleteWorkout(id: String) {
        val w = workoutDao.byId(id) ?: return
        snapshotGoal(w.goalId)
        val goal = goalDao.byId(w.goalId)
        if (goal != null && !goal.isLocalOnly && authStore.state.value.loggedIn) {
            val pendingCreate = syncQueueDao.pendingFor(SyncManager.TYPE_WORKOUT_CREATE, id)
            db.withTransaction {
                if (pendingCreate.isEmpty()) {
                    // superseded: drop any queued edit, then enqueue the delete
                    syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_UPDATE, id)
                    syncQueueDao.deletePendingFor(SyncManager.TYPE_WORKOUT_DELETE, id)
                    syncQueueDao.insert(
                        SyncQueueEntity(
                            entityType = SyncManager.TYPE_WORKOUT_DELETE,
                            localId = id,
                            payloadJson = Api.json.encodeToString(
                                com.runflow2.app.data.net.WorkoutDeletePayload.serializer(),
                                com.runflow2.app.data.net.WorkoutDeletePayload(goalId = w.goalId),
                            ),
                        )
                    )
                } else {
                    // the server never saw this workout: cancel the create
                    pendingCreate.forEach { syncQueueDao.markCompleted(it.id) }
                }
                workoutDao.delete(id)
            }
        } else {
            workoutDao.delete(id)
        }
    }

    suspend fun shiftWorkoutDate(id: String, days: Int) {
        val w = workoutDao.byId(id) ?: return
        snapshotGoal(w.goalId)
        persistWorkoutEdit(w.copy(scheduledDate = w.scheduledDate + days * 86_400_000L))
    }

    suspend fun deleteGoalWithWorkouts(id: String) {
        val goal = goalDao.byId(id)
        if (goal != null && !goal.isLocalOnly && authStore.state.value.loggedIn) {
            db.withTransaction {
                syncQueueDao.deletePendingFor(SyncManager.TYPE_GOAL_DELETE, id)
                syncQueueDao.insert(
                    SyncQueueEntity(
                        entityType = SyncManager.TYPE_GOAL_DELETE,
                        localId = id,
                        payloadJson = "{}",
                    )
                )
            }
        }
        workoutDao.deleteForGoal(id)
        goalDao.delete(id)
        planSnapshotDao.deleteAllForGoal(id)
    }

    suspend fun completeGoal(id: String) {
        val goal = goalDao.byId(id)
        if (goal != null && !goal.isLocalOnly && authStore.state.value.loggedIn) {
            val payload = Api.json.encodeToString(
                com.runflow2.app.data.net.UpdateGoalRequest.serializer(),
                com.runflow2.app.data.net.UpdateGoalRequest(isActive = false),
            )
            db.withTransaction {
                goalDao.upsert(goal.copy(isActive = false, completedAt = System.currentTimeMillis(), dirty = true))
                syncQueueDao.deletePendingFor(SyncManager.TYPE_GOAL_UPDATE, id)
                syncQueueDao.insert(
                    SyncQueueEntity(
                        entityType = SyncManager.TYPE_GOAL_UPDATE,
                        localId = id,
                        payloadJson = payload,
                    )
                )
            }
        } else {
            goalDao.complete(id, System.currentTimeMillis())
        }
    }

    /** Create a goal and generate its plan locally. Returns goal id. */
    suspend fun createPlan(spec: PlanSpec): String = withContext(Dispatchers.IO) {
        val goalId = UUID.randomUUID().toString()
        val weeks = PlanGenerator.planWeeks(spec)
        val goal = GoalEntity(
            id = goalId,
            name = spec.name,
            raceType = spec.raceType.name,
            raceDate = Format.epochMillis(spec.raceDate, LocalTime.of(9, 0)),
            targetTimeSec = spec.targetTimeSec,
            weeklyKmGoal = spec.weeklyKm,
            planWeeks = weeks,
            runsPerWeek = spec.runsPerWeek,
            strengthPerWeek = spec.strengthPerWeek,
            longRunDay = spec.longRunDay.value,
            workoutDay = spec.workoutDay.value,
            restDays = spec.restDays.joinToString(",") { it.value.toString() },
            taperWeeks = spec.taperWeeks,
            vdotAtCreation = spec.vdot,
            isActive = true,
            createdAt = System.currentTimeMillis(),
            customDistanceKm = spec.customDistanceKm,
            planStartDate = Format.epochMillis(spec.startDate.with(java.time.DayOfWeek.MONDAY), LocalTime.MIDNIGHT),
            isLocalOnly = true,
        )
        // deactivate previous active goals
        val all = goalDao.observeAll().first()
        all.filter { it.isActive }.forEach { goalDao.upsert(it.copy(isActive = false)) }
        goalDao.upsert(goal)

        val drafts = PlanGenerator.generate(spec)
        val workouts = drafts.mapIndexed { i, d ->
            WorkoutEntity(
                id = UUID.randomUUID().toString(),
                goalId = goalId,
                scheduledDate = Format.epochMillis(d.date, LocalTime.of(7, 30)),
                workoutType = d.type.name,
                phase = d.phase.name,
                description = d.description,
                targetDistanceKm = d.distanceKm,
                targetPaceSecPerKm = d.targetPaceSecPerKm?.toInt(),
                targetDurationSec = d.durationSec,
                sortIndex = i,
            )
        }
        workoutDao.upsertAll(workouts)
        goalId
    }

    /**
     * Creates a plan through the web engine (POST /api/plans): the server runs
     * its full generation pipeline and returns the goal with all workouts, so
     * the plan is identical on web and app from the first second. Requires a
     * signed-in session; fails with an exception when unreachable so the
     * caller can fall back to [createPlan].
     */
    suspend fun createPlanViaServer(spec: PlanSpec): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            check(authStore.state.value.loggedIn) { "not signed in" }
            val api = network.api()
            var dto = api.createPlan(spec.toCreatePlanRequest()).goal
            if (dto.workouts.isEmpty()) {
                // Defensive: some deployments answer without embedded workouts.
                dto = api.plans().goals.firstOrNull { it.id == dto.id } ?: dto
            }
            val (goal, workouts) = dto.toEntities() ?: error("server returned an unusable plan")
            db.withTransaction {
                goalDao.observeAll().first()
                    .filter { it.isActive && it.id != goal.id }
                    .forEach { goalDao.upsert(it.copy(isActive = false)) }
                workoutDao.deleteForGoal(goal.id)
                goalDao.upsert(goal)
                workoutDao.upsertAll(workouts)
            }
            AppLog.i("Plan", "plan '${goal.name}' created via web engine (${workouts.size} workouts)")
            goal.id
        }
    }

    // ---------- analytics ----------
    suspend fun analytics(rangeDays: Int = 365): AnalyticsBundle = withContext(Dispatchers.Default) {
        val profile = profileOnce()
        val acts = activityDao.all().map { it.toInput() }
        AnalyticsEngine.compute(
            activities = acts,
            today = LocalDate.now(),
            vdotCorrection = profile.vdotCorrection,
            rangeDays = rangeDays,
        )
    }

    // ---------- helpers ----------
    private fun ActivityEntity.toInput() = ActivityInput(
        id = id,
        type = runCatching { ActivityType.valueOf(type) }.getOrDefault(ActivityType.RUN),
        date = Format.localDate(startDate),
        distanceKm = distanceKm,
        movingTimeSec = movingTimeSec,
        averageHr = averageHr,
        trimp = trimp,
        estimatedVdot = estimatedVdot,
        zoneSeconds = zoneSeconds,
    )

    companion object {
        fun computeTrimp(
            movingTimeSec: Int,
            avgHr: Double?,
            zoneSeconds: List<Int>,
            distanceKm: Double,
            thresholdPaceSecPerKm: Int,
            hrMax: Int = hrMaxFallback,
            hrRest: Int = hrRestFallback,
            isRun: Boolean = true,
        ): Double {
            val minutes = movingTimeSec / 60.0
            val fromHr = avgHr?.let {
                TrainingLoad.trimpFromHr(minutes, it, hrMax, hrRest)
            }
            val fromZones = TrainingLoad.trimpFromZones(zoneSeconds)
            return when {
                fromHr != null && fromHr > 0 -> fromHr
                fromZones > 0 -> fromZones
                else -> {
                    val avgSpeed = if (movingTimeSec > 0) (distanceKm * 1000.0) / movingTimeSec else 0.0
                    val thresholdSpeed = if (thresholdPaceSecPerKm > 0) 1000.0 / thresholdPaceSecPerKm else 3.0
                    TrainingLoad.trimpFallback(minutes, avgSpeed, thresholdSpeed, isRun)
                }
            }
        }

        private const val hrMaxFallback = 190
        private const val hrRestFallback = 55

        fun estimateVdot(distanceKm: Double, movingTimeSec: Int): Double? =
            AnalyticsEngine.estimateVdotFor(distanceKm, movingTimeSec)
    }
}

fun GoalEntity.raceType(): RaceType = runCatching { RaceType.valueOf(raceType) }.getOrDefault(RaceType.MARATHON)

fun WorkoutEntity.type(): WorkoutType = runCatching { WorkoutType.valueOf(workoutType) }
    .getOrDefault(WorkoutType.OTHER)

fun WorkoutEntity.phase(): PlanPhase = runCatching { PlanPhase.valueOf(phase) }.getOrDefault(PlanPhase.BASE)

fun WorkoutEntity.date(): LocalDate = Format.localDate(scheduledDate)
