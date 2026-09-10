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
import com.runflow2.app.data.sync.toCreateRequest
import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.data.sync.toEntities
import com.runflow2.app.data.sync.toPatchRequest
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

    suspend fun saveWorkout(w: WorkoutEntity) = persistWorkoutEdit(w)

    /**
     * Saves structured steps built by the interval editor. Follows
     * [saveWorkout] exactly: the row is re-loaded, swapped to the new JSON and
     * routed through [persistWorkoutEdit], which flags it dirty and enqueues
     * the workout_update outbox item for synced plans (local-only plans write
     * straight to Room).
     */
    suspend fun saveStructuredSteps(workoutId: String, json: String) {
        val w = workoutDao.byId(workoutId) ?: return
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

    /** Single-workout deletes only stay deleted for local-only plans (no server route). */
    suspend fun deleteWorkout(id: String) = workoutDao.delete(id)

    suspend fun shiftWorkoutDate(id: String, days: Int) {
        val w = workoutDao.byId(id) ?: return
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
