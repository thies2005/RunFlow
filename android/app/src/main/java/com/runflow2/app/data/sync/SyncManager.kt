package com.runflow2.app.data.sync

import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.CreateActivityRequest
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.PatchWorkoutRequest
import com.runflow2.app.data.net.UpdateActivityRequest
import com.runflow2.app.data.net.UpdateGoalRequest
import com.runflow2.app.data.net.UpdateProfileRequest
import com.runflow2.app.data.net.WorkoutCreatePayload
import com.runflow2.app.data.net.WorkoutDeletePayload
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import com.runflow2.app.data.repo.UploadResult
import com.runflow2.app.data.sync.applyTo
import com.runflow2.app.data.sync.mergeInto
import com.runflow2.app.data.sync.reconcileCreatedWorkout
import com.runflow2.app.data.sync.toWorkoutEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException
import java.io.IOException

data class SyncStatus(
    val running: Boolean = false,
    val lastSyncAt: Long? = null,
    val lastMessage: String? = null,
)

data class SyncResult(
    val pushed: Int = 0,
    val pulled: Int = 0,
    val pruned: Int = 0,
    val failed: Int = 0,
    val skipped: Boolean = false,
)

/**
 * Offline-first reconciliation against the RunFlow server.
 *
 * Room is the single source of truth for the UI; this manager only
 * reconciles it with the server: local pending edits are pushed first
 * (outbox), then server deltas overwrite everything else (server wins),
 * and rows the server no longer has are pruned. The outbox survives
 * process death, reboots and indefinite offline periods.
 */
class SyncManager(
    private val db: AppDatabase,
    private val client: NetworkClient,
    private val authStore: AuthStore,
    private val settings: SettingsRepository,
    private val repository: RunFlowRepository,
    private val healthConnect: com.runflow2.app.data.health.HealthConnectManager? = null,
) {
    companion object {
        private const val TAG = "Sync"
        const val TYPE_ACTIVITY_CREATE = "activity_create"
        const val TYPE_ACTIVITY_UPDATE = "activity_update"
        const val TYPE_PROFILE_UPDATE = "profile_update"
        const val TYPE_WORKOUT_CREATE = "workout_create"
        const val TYPE_WORKOUT_UPDATE = "workout_update"
        const val TYPE_WORKOUT_DELETE = "workout_delete"
        const val TYPE_GOAL_UPDATE = "goal_update"
        const val TYPE_GOAL_DELETE = "goal_delete"
        private const val PAGE_SIZE = 100
        private const val MAX_PAGES = 60
        private const val STRAVA_TRIGGER_INTERVAL_MS = 6 * 60 * 60 * 1000L // 6h
        /** Device-plan uploads per sync cycle, bounding the work per drain. */
        private const val MAX_PLAN_UPLOADS_PER_SYNC = 5
    }

    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    private val _status = MutableStateFlow(SyncStatus())
    val status: StateFlow<SyncStatus> = _status

    /** Outbox depth for UI badges. */
    val pendingCount = db.syncQueueDao().observePendingCount()

    suspend fun syncNow(reason: String, forceStrava: Boolean = false): SyncResult = mutex.withLock {
        // Wait for the persisted session to be restored: without this, the
        // startup sync races AuthStore's DataStore read and no-ops even for
        // signed-in users.
        authStore.state.first { it.initialized }
        // Health Connect import is a local feature — run it regardless of
        // sign-in state. Cheap no-op unless the setting is enabled.
        healthConnect?.let { hc ->
            runCatching { hc.importIfEnabled() }.onFailure {
                AppLog.w(TAG, "Health Connect import error (${it.message})")
            }
        }
        if (!authStore.state.value.loggedIn) {
            AppLog.d(TAG, "sync skipped (not signed in), reason=$reason")
            return SyncResult(skipped = true)
        }
        AppLog.i(TAG, "sync start, reason=$reason forceStrava=$forceStrava")
        _status.value = _status.value.copy(running = true, lastMessage = "Syncing…")
        val result = try {
            withContext(Dispatchers.IO) { runSync(forceStrava) }
        } catch (e: IOException) {
            AppLog.w(TAG, "sync offline (${e.message ?: "io error"}), reason=$reason", e)
            _status.value = SyncStatus(running = false, lastSyncAt = _status.value.lastSyncAt,
                lastMessage = "Offline — changes stay queued")
            return SyncResult(skipped = true)
        } catch (e: HttpException) {
            AppLog.e(TAG, "sync aborted: server error ${e.code()}", e)
            _status.value = SyncStatus(running = false, lastSyncAt = _status.value.lastSyncAt,
                lastMessage = "Server error ${e.code()}")
            return SyncResult(failed = 1)
        } finally {
            // ensure running flag always clears even on unexpected throw
            _status.value = _status.value.copy(running = false)
        }
        val now = System.currentTimeMillis()
        val msg = buildString {
            append(if (result.pushed > 0) "↑${result.pushed} " else "")
            append(if (result.pulled > 0) "↓${result.pulled} " else "")
            append(if (result.failed > 0) "⚠${result.failed}" else "")
            if (isEmpty()) append("Up to date")
        }
        _status.value = SyncStatus(running = false, lastSyncAt = now, lastMessage = msg.trim())
        settings.setLastSync(now, msg.trim())
        AppLog.i(TAG, "sync done (${msg.trim()}), reason=$reason")
        result
    }

    private suspend fun runSync(forceStrava: Boolean): SyncResult {
        var pushed = 0
        var failed = 0

        cleanDemoDataOnFirstLogin()

        // ---- upload: device-created plans the server has never seen ----
        // Runs BEFORE the outbox drain: the plan must exist server-side
        // before any queued workout_create/workout_update items drain against
        // it (their routes are goal-scoped and would 404 against a goal the
        // server doesn't know). Pull comes last so the freshly imported plan
        // round-trips as ordinary server truth.
        uploadLocalPlans()

        // ---- push: drain the outbox, oldest first ----
        while (true) {
            val batch = db.syncQueueDao().nextBatch(20)
            if (batch.isEmpty()) break
            var progress = false
            for (item in batch) {
                val now = System.currentTimeMillis()
                try {
                    handleOutboxItem(item.entityType, item.localId, item.payloadJson)
                    db.syncQueueDao().markCompleted(item.id)
                    pushed++
                    progress = true
                } catch (e: HttpException) {
                    failed++
                    if (e.code() in 400..499 && e.code() != 408 && e.code() != 429) {
                        // Client error: retrying can never succeed — dead-letter,
                        // but retain the row so nothing is silently lost.
                        AppLog.e(TAG, "outbox ${item.entityType}(${item.localId}) dead-lettered: HTTP ${e.code()}", e)
                        db.syncQueueDao().markDead(item.id, now)
                    } else if (item.retryCount + 1 >= item.maxRetries) {
                        AppLog.e(TAG, "outbox ${item.entityType}(${item.localId}) dead-lettered after ${item.retryCount + 1} tries: HTTP ${e.code()}", e)
                        db.syncQueueDao().markDead(item.id, now)
                    } else {
                        AppLog.w(TAG, "outbox ${item.entityType}(${item.localId}) retry ${item.retryCount + 1}/${item.maxRetries}: HTTP ${e.code()}", e)
                        db.syncQueueDao().incrementRetry(item.id, now)
                    }
                    progress = true
                } catch (e: IOException) {
                    // Connection dropped: stop draining, retry next window.
                    AppLog.w(TAG, "outbox push interrupted (${e.message ?: "io error"}) — will retry", e)
                    db.syncQueueDao().incrementRetry(item.id, now)
                    break
                }
            }
            if (!progress) break
        }
        if (pushed > 0) AppLog.i(TAG, "pushed $pushed outbox item(s)")

        // ---- pull: server state wins ----
        var (pulled, pruned) = pullActivities()
        if (pulled > 0 || pruned > 0) AppLog.i(TAG, "pulled $pulled activity(ies), pruned $pruned")

        // ---- pull plans (server-generated goals + workouts) ----
        try {
            val (planPulled, planPruned) = pullPlans()
            if (planPulled > 0 || planPruned > 0) AppLog.i(TAG, "pulled $planPulled plan(s), pruned $planPruned")
            pulled += planPulled
            pruned += planPruned
        } catch (e: IOException) {
            AppLog.w(TAG, "plan pull skipped (${e.message ?: "io error"})")
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            AppLog.w(TAG, "plan pull failed: HTTP ${e.code()}", e)
        }

        // ---- server-side Strava import. Throttled to every 6h for the
        // periodic/startup path; explicit user pulls (pull-to-refresh, manual
        // "Sync now") force it so fresh Strava activities show up on demand. ----
        val lastTrigger = settings.settingsOnce().lastStravaTriggerAt
        if (forceStrava || System.currentTimeMillis() - lastTrigger > STRAVA_TRIGGER_INTERVAL_MS) {
            try {
                val imported = client.api().triggerServerSync().activitiesSynced
                settings.setLastStravaTrigger(System.currentTimeMillis())
                AppLog.i(TAG, "server Strava import: $imported activity(ies)")
                if (imported > 0) {
                    val again = pullActivities()
                    pulled += again.first
                    pruned += again.second
                }
            } catch (e: HttpException) {
                if (e.code() == 409) settings.setLastStravaTrigger(System.currentTimeMillis())
                // otherwise ignore: import is best-effort
                AppLog.w(TAG, "server Strava import failed: HTTP ${e.code()}", e)
            } catch (e: IOException) {
                // best-effort only
                AppLog.w(TAG, "server Strava import unreachable (${e.message ?: "io error"})", e)
            }
        }

        // ---- profile ----
        try {
            val profile = db.profileDao().get()
            if (profile == null || !profile.dirty) {
                val server = client.api().profile().user
                db.profileDao().upsert(server.applyTo(profile ?: ProfileEntity(), authStore.state.value.email))
                // A Strava account may only get its email server-side later
                // (profile:read_all scope) — persist it once it shows up.
                authStore.updateEmailIfMissing(server.email)
            }
        } catch (e: IOException) {
            // offline mid-sync: fine
            AppLog.w(TAG, "profile pull skipped (${e.message ?: "io error"})")
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            AppLog.w(TAG, "profile pull failed: HTTP ${e.code()}", e)
        }

        return SyncResult(pushed = pushed, pulled = pulled, pruned = pruned, failed = failed)
    }

    /**
     * Uploads local-only plans (device-created, never on the server), oldest
     * first, capped at [MAX_PLAN_UPLOADS_PER_SYNC] per cycle to bound the
     * work of a single drain. Failures never abort the sync: network errors
     * and 5xx are inherently retryable and simply leave the plan local until
     * the next cycle; permanent 4xx rejections are logged and skipped the
     * same way (the plan remains device-only instead of poisoning the sync).
     */
    private suspend fun uploadLocalPlans() {
        // Wide query, success-capped loop: a permanently rejected plan must
        // not occupy an upload slot and starve later goals.
        val goals = db.goalDao().localOnlyGoals(50)
        if (goals.isEmpty()) return
        var uploaded = 0
        for (goal in goals) {
            if (uploaded >= MAX_PLAN_UPLOADS_PER_SYNC) break
            try {
                when (val result = repository.uploadLocalPlan(goal.id)) {
                    is UploadResult.Success -> uploaded++
                    is UploadResult.Rejected ->
                        AppLog.w(TAG, "plan ${goal.id} upload rejected (HTTP ${result.code}) — stays local")
                    is UploadResult.Retryable ->
                        AppLog.w(TAG, "plan ${goal.id} upload deferred (network/server) — stays local")
                    UploadResult.Skipped -> Unit
                }
            } catch (e: IOException) {
                AppLog.w(TAG, "plan ${goal.id} upload offline (${e.message ?: "io error"}) — stays local", e)
            } catch (e: HttpException) {
                AppLog.w(TAG, "plan ${goal.id} upload failed: HTTP ${e.code()} — stays local", e)
            } catch (e: Exception) {
                // Unexpected (mapping/serialization bug): log and keep going —
                // one bad plan must not abort the whole sync.
                AppLog.e(TAG, "plan ${goal.id} upload failed unexpectedly — stays local", e)
            }
        }
        if (uploaded > 0) AppLog.i(TAG, "uploaded $uploaded local plan(s)")
    }

    private suspend fun handleOutboxItem(type: String, localId: String, payloadJson: String) {
        val api = client.api()
        when (type) {
            TYPE_ACTIVITY_CREATE -> {
                val req = json.decodeFromString(CreateActivityRequest.serializer(), payloadJson)
                val dto = api.createActivity(req).activity
                val local = db.activityDao().byId(localId)
                if (local != null) {
                    // If some other row already claims this server id, drop the dup.
                    val dup = db.activityDao().byServerId(dto.id)
                    if (dup != null && dup.id != local.id) db.activityDao().delete(local.id)
                    else db.activityDao().upsert(dto.mergeInto(local, System.currentTimeMillis()))
                }
            }
            TYPE_ACTIVITY_UPDATE -> {
                val obj = json.parseToJsonElement(payloadJson).jsonObject
                val serverId = obj["activityId"]?.jsonPrimitive?.content
                if (serverId != null) {
                    api.updateActivity(
                        serverId,
                        json.decodeFromString(UpdateActivityRequest.serializer(), payloadJson),
                    )
                }
            }
            TYPE_PROFILE_UPDATE -> {
                val req = json.decodeFromString(UpdateProfileRequest.serializer(), payloadJson)
                client.api().updateProfile(req)
                db.profileDao().get()?.let { db.profileDao().upsert(it.copy(dirty = false)) }
            }
            TYPE_WORKOUT_UPDATE -> {
                val req = json.decodeFromString(PatchWorkoutRequest.serializer(), payloadJson)
                client.api().patchWorkout(localId, req)
                db.workoutDao().byId(localId)?.let { db.workoutDao().upsert(it.copy(dirty = false)) }
            }
            TYPE_WORKOUT_CREATE -> {
                val payload = json.decodeFromString(WorkoutCreatePayload.serializer(), payloadJson)
                try {
                    val dto = api.createWorkout(payload.goalId, payload.workout).workout
                    val local = db.workoutDao().byId(localId)
                    if (local == null) {
                        // The row vanished mid-drain (deleted while the create
                        // was in flight): remove the just-created server row so
                        // the server doesn't keep an orphan the user deleted.
                        runCatching { api.deleteWorkout(payload.goalId, dto.id) }
                    } else {
                        val server = dto.toWorkoutEntity(payload.goalId)
                        val dup = db.workoutDao().byId(dto.id)
                        if (server == null || (dup != null && dup.id != local.id)) {
                            // Unusable response, or a pull already brought this
                            // server row in: drop the temp row, server wins.
                            db.workoutDao().delete(local.id)
                        } else {
                            db.workoutDao().upsert(reconcileCreatedWorkout(local, server))
                            db.workoutDao().delete(local.id)
                            // Re-point queued full-state PATCHes from the temp
                            // id to the server id so later edits still land.
                            db.syncQueueDao().pendingFor(TYPE_WORKOUT_UPDATE, local.id).forEach { item ->
                                db.syncQueueDao().insert(item.copy(id = 0, localId = dto.id))
                                db.syncQueueDao().markCompleted(item.id)
                            }
                        }
                    }
                } catch (e: HttpException) {
                    if (e.code() in 400..499 && e.code() != 408 && e.code() != 429) {
                        // The server rejected the create for good: clear dirty
                        // so the next pull prunes the temp row instead of
                        // keeping it (and re-pushing it) forever.
                        db.workoutDao().byId(localId)?.let { db.workoutDao().upsert(it.copy(dirty = false)) }
                    }
                    throw e
                }
            }
            TYPE_WORKOUT_DELETE -> {
                val payload = json.decodeFromString(WorkoutDeletePayload.serializer(), payloadJson)
                val resp = api.deleteWorkout(payload.goalId, localId)
                // 404 = already gone on the server: the delete still succeeded.
                if (!resp.isSuccessful && resp.code() != 404) throw HttpException(resp)
            }
            TYPE_GOAL_UPDATE -> {
                val req = json.decodeFromString(UpdateGoalRequest.serializer(), payloadJson)
                client.api().updateGoal(localId, req)
                db.goalDao().byId(localId)?.let { db.goalDao().upsert(it.copy(dirty = false)) }
            }
            TYPE_GOAL_DELETE -> {
                val resp = client.api().deleteGoal(localId)
                // 404 = already gone on the server: the delete still succeeded.
                if (!resp.isSuccessful && resp.code() != 404) throw HttpException(resp)
            }
        }
    }

    /**
     * Pulls server-generated plans into Room. Web plans arrive with server
     * ids; local edits (dirty rows) win over the server until their outbox
     * item is pushed; plans deleted on the web are pruned locally. Local-only
     * plans are never touched.
     */
    private suspend fun pullPlans(): Pair<Int, Int> {
        val serverGoals = client.api().plans().goals
        var pulled = 0
        var pruned = 0
        val seenIds = HashSet<String>(serverGoals.size)
        for (g in serverGoals) {
            seenIds += g.id
            val (goal, serverWorkouts) = g.toEntities() ?: continue
            val existing = db.goalDao().byId(goal.id)
            db.goalDao().upsert(if (existing?.dirty == true) existing else goal)
            val localWorkouts = db.workoutDao().forGoal(goal.id)
            db.workoutDao().upsertAll(mergeServerWorkouts(localWorkouts, serverWorkouts))
            val serverIds = serverWorkouts.map { it.id }.toSet()
            localWorkouts.filter { it.id !in serverIds && !it.dirty }.forEach {
                db.workoutDao().delete(it.id)
            }
            pulled++
        }
        // prune synced plans the server no longer returns (deleted there)
        db.goalDao().serverGoals().forEach { local ->
            if (local.id !in seenIds && !local.dirty) {
                db.workoutDao().deleteForGoal(local.id)
                db.goalDao().delete(local.id)
                pruned++
            }
        }
        return pulled to pruned
    }

    /** Returns pulled count and pruned count. */
    private suspend fun pullActivities(): Pair<Int, Int> {
        var offset = 0
        val seen = mutableSetOf<String>()
        var pulled = 0
        var page = 0
        while (page < MAX_PAGES) {
            val res = client.api().activities(limit = PAGE_SIZE, offset = offset)
            if (res.activities.isEmpty()) break
            val now = System.currentTimeMillis()
            for (dto in res.activities) {
                seen += dto.id
                val existing = db.activityDao().byServerId(dto.id)
                db.activityDao().upsert(dto.mergeInto(existing, now))
                pulled++
            }
            if (!res.hasMore) break
            offset += res.activities.size
            page++
        }
        // prune synced non-demo rows the server no longer returns (deleted there)
        var pruned = 0
        db.activityDao().all().forEach { local ->
            if (local.serverId != null && !local.dirty && !local.isDemo && local.serverId !in seen) {
                db.activityDao().delete(local.id)
                pruned++
            }
        }
        return pulled to pruned
    }

    /**
     * Demo/seed data is cleared once, the first time the user logs in. The
     * seeded demo profile keeps its metrics (they are useful defaults) but its
     * demo email must never survive a real login — the account email wins.
     */
    private suspend fun cleanDemoDataOnFirstLogin() {
        val s = settings.settingsOnce()
        if (!s.demoCleaned) {
            db.activityDao().deleteDemo()
            db.goalDao().deleteDemo()
            db.workoutDao().deleteDemo()
            val accountEmail = authStore.state.value.email
            db.profileDao().get()?.let { p ->
                if (p.email == com.runflow2.app.data.seed.DemoSeeder.DEMO_EMAIL) {
                    db.profileDao().upsert(p.copy(email = accountEmail ?: ""))
                }
            }
            settings.setDemoCleaned()
            AppLog.i(TAG, "demo data cleared on first login (account=${accountEmail ?: "unknown"})")
        }
    }
}
