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
import com.runflow2.app.data.net.AiFeedbackDto
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.GenerateFeedbackRequest
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.sync.SyncManager
import com.runflow2.app.data.sync.MAX_PLAN_SNAPSHOTS_PER_GOAL
import com.runflow2.app.data.sync.parseSnapshotJson
import com.runflow2.app.data.sync.remapSnapshotJson
import com.runflow2.app.data.sync.remapUploadedPlan
import com.runflow2.app.data.sync.restoreDiff
import com.runflow2.app.data.sync.toJsonOrNull
import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.data.sync.toCreateRequest
import com.runflow2.app.data.sync.toCreateWorkoutPayload
import com.runflow2.app.data.sync.toEntities
import com.runflow2.app.data.sync.toEntity
import com.runflow2.app.data.sync.toImportPlanRequest
import com.runflow2.app.data.sync.toImportWorkoutRequest
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
import com.runflow2.app.domain.plan.PlanMath
import com.runflow2.app.domain.plan.PlanSpec
import com.runflow2.app.domain.plan.WebPlanEngine
import com.runflow2.app.domain.plan.WebStructuredPlan
import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import retrofit2.HttpException
import java.io.IOException
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import kotlin.math.roundToInt

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

    /** Health Connect import lookups (dedupe by record id / start-time window). */
    suspend fun activityByHcRecordId(hcRecordId: String): ActivityEntity? =
        activityDao.byHcRecordId(hcRecordId)

    suspend fun activitiesBetweenStart(fromMs: Long, toMs: Long): List<ActivityEntity> =
        activityDao.betweenStart(fromMs, toMs)

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

    /**
     * Fetches the full server record for a synced activity and caches its
     * streams into the local row (first successful fetch only — local or
     * previously cached streams are never overwritten). Returns true when
     * streams were cached and the caller should reload the row.
     */
    suspend fun fetchAndCacheStreams(activityId: String, serverId: String): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            val streams = network.api().activityDetail(serverId).activity.streams
                ?: return@runCatching false
            if (streams.time.size < 2) return@runCatching false
            val json = streams.toJsonOrNull() ?: return@runCatching false
            val existing = activityDao.byId(activityId) ?: return@runCatching false
            if (existing.streamsJson != null) return@runCatching false
            activityDao.updateStreams(activityId, json)
            AppLog.i("Activity", "cached ${streams.time.size} stream samples for $activityId")
            true
        }.getOrDefault(false)
    }

    // ---------- AI activity feedback (web's "AI overview") ----------

    sealed interface AiFeedbackResult {
        data class Ready(val feedback: AiFeedbackDto) : AiFeedbackResult
        data object None : AiFeedbackResult
        data class Queued(val message: String) : AiFeedbackResult
        data class Error(val message: String) : AiFeedbackResult
    }

    /** Loads the cached server-side feedback, if any. */
    suspend fun loadActivityFeedback(serverId: String): AiFeedbackResult = withContext(Dispatchers.IO) {
        runCatching {
            val res = network.api().activityFeedback(serverId)
            res.feedback?.let { AiFeedbackResult.Ready(it) } ?: AiFeedbackResult.None
        }.getOrDefault(AiFeedbackResult.Error("Could not load the AI analysis"))
    }

    /**
     * Triggers on-demand generation. The server allows 90 s; this client's
     * read timeout is 30 s, so slow generations surface as [AiFeedbackResult.Queued]
     * while the server keeps working and caches the result.
     */
    suspend fun generateActivityFeedback(serverId: String, regenerate: Boolean): AiFeedbackResult =
        withContext(Dispatchers.IO) {
            try {
                val res = network.api().generateActivityFeedback(
                    GenerateFeedbackRequest(activityId = serverId, regenerate = regenerate)
                )
                when {
                    res.isSuccessful -> {
                        val body = res.body()
                        when {
                            body?.queued == true ->
                                AiFeedbackResult.Queued(body.message ?: "Queued — it will appear shortly.")
                            body?.feedback != null -> AiFeedbackResult.Ready(body.feedback)
                            else -> loadActivityFeedback(serverId)
                        }
                    }
                    res.code() == 429 ->
                        AiFeedbackResult.Queued("Server busy — the analysis is queued and will appear shortly.")
                    res.code() == 403 -> AiFeedbackResult.Error("AI features are not enabled on your account.")
                    else -> AiFeedbackResult.Error("Server error ${res.code()}")
                }
            } catch (e: java.io.IOException) {
                AiFeedbackResult.Queued("Still generating — tap refresh in a moment.")
            }
        }

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
                // goalId is forced: a snapshot taken before a plan upload still
                // carries the old local goal id inside its workout entries.
                val entity = s.toEntity().copy(goalId = goalId)
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
                    val entity = s.toEntity().copy(id = id, goalId = goalId, dirty = true)
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
                        val entity = s.toEntity().copy(goalId = goalId, dirty = true)
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

    /**
     * Offline plan creation with the on-device port of the web generator
     * ([WebPlanEngine]): the workouts are identical to what the server would
     * generate. Used when [createPlanViaServer] cannot reach the API — this
     * is the only local generation path.
     */
    suspend fun createPlanOffline(spec: PlanSpec): String = withContext(Dispatchers.IO) {
        val goalId = UUID.randomUUID().toString()
        val weeks = PlanMath.planWeeks(spec)
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

        val generated = WebPlanEngine.generateTrainingPlan(WebPlanEngine.configFromSpec(spec))
        val workouts = generated.mapIndexed { i, w ->
            // webWorkoutType/webPhase keep the RAW web enum values (BRICK,
            // TRANSITION_PRACTICE, ENDURANCE, …); workoutType/phase store the
            // collapsed domain values the UI renders. The upload path prefers
            // the raw columns so the server sees exactly what it would have
            // generated itself.
            WorkoutEntity(
                id = UUID.randomUUID().toString(),
                goalId = goalId,
                scheduledDate = Format.epochMillis(w.date, LocalTime.of(7, 30)),
                workoutType = WebPlanEngine.toDomainWorkoutType(w.type).name,
                phase = WebPlanEngine.toDomainPhase(w.phase).name,
                webWorkoutType = w.type,
                webPhase = w.phase,
                description = w.description,
                targetDistanceKm = w.totalDistance / 1000.0,
                targetPaceSecPerKm = w.targetPace?.roundToInt(),
                targetDurationSec = w.targetDuration?.roundToInt(),
                sortIndex = i,
                structuredStepsJson = w.structuredSteps?.let { structuredStepsJson(it) },
                targetHrZone = w.targetHrZone,
                targetHrMinBpm = w.targetHrMinBpm?.roundToInt(),
                targetHrMaxBpm = w.targetHrMaxBpm?.roundToInt(),
                targetPaceMinSecPerKm = w.targetPaceMinSecondsPerKm,
                targetPaceMaxSecPerKm = w.targetPaceMaxSecondsPerKm,
            )
        }
        workoutDao.upsertAll(workouts)
        goalId
    }

    /** Serializes the ported generator's steps in the server's flat JSON shape. */
    private fun structuredStepsJson(plan: WebStructuredPlan): String {
        val steps = JsonArray(plan.steps.map { s ->
            buildJsonObject {
                put("type", s.type)
                put("name", s.name)
                s.distanceMeters?.let { put("distanceMeters", it) }
                s.durationSeconds?.let { put("durationSeconds", it) }
                s.paceSecondsPerKm?.let { put("paceSecondsPerKm", it) }
                s.hrZone?.let { put("hrZone", it) }
            }
        })
        return buildJsonObject {
            put("version", 1)
            put("source", "generated-plan")
            put("steps", steps)
        }.toString()
    }

    /**
     * Creates a plan through the web engine (POST /api/plans): the server runs
     * its full generation pipeline and returns the goal with all workouts, so
     * the plan is identical on web and app from the first second. Requires a
     * signed-in session; fails with an exception when unreachable so the
     * caller can fall back to [createPlanOffline].
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

    /**
     * Uploads a device-created plan to POST /api/plans/import: the goal
     * scalars plus the explicit workout list are serialized with their RAW
     * web enum values (webWorkoutType/webPhase, falling back to the collapsed
     * domain columns) and the server stores them verbatim — no regeneration,
     * so "local == server" holds after upload. On success the local ids are
     * remapped onto the server ids in ONE transaction (goal id, workout ids
     * via the idMap, queued outbox items, undo snapshots), which makes the
     * operation crash-safe: a failure mid-transaction leaves the plan fully
     * local; nothing is half-remapped.
     */
    suspend fun uploadLocalPlan(goalId: String): UploadResult = withContext(Dispatchers.IO) {
        val goal = goalDao.byId(goalId) ?: return@withContext UploadResult.Skipped
        if (!goal.isLocalOnly) return@withContext UploadResult.Skipped
        val workouts = workoutDao.forGoal(goalId)
        if (workouts.isEmpty()) return@withContext UploadResult.Skipped // server rejects empty plans

        val request = goal.toImportPlanRequest(workouts.mapIndexed { i, w -> w.toImportWorkoutRequest(i) })

        val response = try {
            network.api().importPlan(request)
        } catch (e: IOException) {
            AppLog.w("Plan", "plan upload offline (${e.message ?: "io error"}) — stays local, retried next sync", e)
            return@withContext UploadResult.Retryable
        } catch (e: HttpException) {
            if (e.code() in 400..499 && e.code() != 408 && e.code() != 429) {
                // Permanent rejection (bad payload, auth): retrying can never
                // succeed. The plan stays local and un-mapped; a later sync
                // may still upload it once whatever caused the rejection is
                // fixed (e.g. re-login).
                AppLog.e("Plan", "plan upload rejected: HTTP ${e.code()}", e)
                return@withContext UploadResult.Rejected(e.code())
            }
            AppLog.w("Plan", "plan upload failed: HTTP ${e.code()} — retried next sync", e)
            return@withContext UploadResult.Retryable
        }

        // Pending outbox items that reference the local ids: workout-scoped
        // items (localId = workout id) and goal-scoped ones (localId = goal
        // id). They are re-pointed onto the server ids inside the remap.

        var uploadedCount = 0
        db.withTransaction {
            // Re-read inside the transaction: edits, completions, creations or
            // deletions that happened during the upload round-trip must
            // survive the id remap (the request above used the pre-read
            // snapshot; the remap below uses the live rows).
            val fresh = workoutDao.forGoal(goal.id)
            val workoutQueueItems = buildMap {
                for (w in fresh) {
                    for (type in uploadQueueTypes) {
                        val items = syncQueueDao.pendingFor(type, w.id)
                        if (items.isNotEmpty()) merge(w.id, items) { a, b -> a + b }
                    }
                }
            }
            val goalQueueItems = syncQueueDao.pendingFor(SyncManager.TYPE_GOAL_UPDATE, goalId) +
                syncQueueDao.pendingFor(SyncManager.TYPE_GOAL_DELETE, goalId)

            val remap = remapUploadedPlan(
                goal = goal,
                workouts = fresh,
                serverGoalId = response.goalId,
                idMap = response.idMap,
                workoutQueueItems = workoutQueueItems,
                goalQueueItems = goalQueueItems,
            )

            // swap the local-only rows for their server-identified twins
            workoutDao.deleteForGoal(goal.id)
            goalDao.delete(goal.id)
            goalDao.upsert(remap.goal)
            workoutDao.upsertAll(remap.workouts)
            // undo history follows the goal AND its workout ids to their new
            // ids — otherwise restoreDiff would see zero id overlap with the
            // server-identified rows and churn the whole plan on undo
            planSnapshotDao.latestForGoal(goal.id, MAX_PLAN_SNAPSHOTS_PER_GOAL).forEach { snap ->
                remapSnapshotJson(snap.workoutsJson, response.idMap, response.goalId)
                    ?.let { planSnapshotDao.updateWorkoutsJson(snap.id, it) }
            }
            planSnapshotDao.repointGoal(goal.id, response.goalId)
            // re-point queued edits so they land on the server rows
            remap.consumedQueueIds.forEach { syncQueueDao.markCompleted(it) }
            remap.reQueued.forEach { syncQueueDao.insert(it) }
            uploadedCount = fresh.size
        }
        AppLog.i("Plan", "plan '${goal.name}' uploaded ($uploadedCount workouts) → ${response.goalId}")
        UploadResult.Success(response.goalId, uploadedCount)
    }

    /** Outbox types whose localId references a workout id (re-pointed after upload). */
    private val uploadQueueTypes = arrayOf(
        SyncManager.TYPE_WORKOUT_CREATE,
        SyncManager.TYPE_WORKOUT_UPDATE,
        SyncManager.TYPE_WORKOUT_DELETE,
    )

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

/** Outcome of [RunFlowRepository.uploadLocalPlan]. */
sealed interface UploadResult {
    /** Plan imported server-side; local rows re-pointed onto [serverGoalId]. */
    data class Success(val serverGoalId: String, val workoutCount: Int) : UploadResult

    /** Permanent server rejection (4xx): retrying cannot succeed this cycle. */
    data class Rejected(val code: Int) : UploadResult

    /** Network or 5xx failure: the plan stays local and retries next sync. */
    data object Retryable : UploadResult

    /** Nothing to do: goal missing, already synced, or no workouts. */
    data object Skipped : UploadResult
}
