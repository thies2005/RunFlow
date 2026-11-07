package com.runflow2.app.data.sync

import androidx.room.withTransaction
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.db.ActivitySyncCursor
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.net.ActivityDto
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.BaselineDto
import com.runflow2.app.data.net.CreateActivityRequest
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.RunFlowApi
import com.runflow2.app.data.net.TriggerSyncRequest
import com.runflow2.app.data.net.PatchWorkoutRequest
import com.runflow2.app.data.net.UpdateActivityRequest
import com.runflow2.app.data.net.UpdateGoalRequest
import com.runflow2.app.data.net.UpdateProfileRequest
import com.runflow2.app.data.net.toWireBody
import com.runflow2.app.data.net.WorkoutCreatePayload
import com.runflow2.app.data.net.WorkoutDeletePayload
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import com.runflow2.app.data.repo.UploadResult
import com.runflow2.app.data.repo.mayUploadActivity
import com.runflow2.app.data.repo.mayUploadHealthDate
import com.runflow2.app.data.sync.applyTo
import com.runflow2.app.data.sync.mergeInto
import com.runflow2.app.data.sync.reconcileCreatedWorkout
import com.runflow2.app.data.sync.toDailyEntry
import com.runflow2.app.data.sync.toWorkoutEntity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import retrofit2.HttpException
import java.io.IOException
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

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
 * reconciles it with the server: server data is pulled first, preserving
 * dirty edits and queued deletion tombstones, then pending edits are pushed.
 * Completed pulls prune rows the server no longer has. The outbox survives
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
        const val TYPE_ACTIVITY_DELETE = "activity_delete"
        const val TYPE_PROFILE_UPDATE = "profile_update"
        const val TYPE_WORKOUT_CREATE = "workout_create"
        const val TYPE_WORKOUT_UPDATE = "workout_update"
        const val TYPE_WORKOUT_DELETE = "workout_delete"
        const val TYPE_GOAL_UPDATE = "goal_update"
        const val TYPE_GOAL_DELETE = "goal_delete"
        private const val MAX_OUTBOX_PER_SYNC = 100
        private const val PAGE_SIZE = 100
        private const val MAX_PAGES = 60
        private const val STRAVA_TRIGGER_INTERVAL_MS = 6 * 60 * 60 * 1000L // 6h
        /** Device-plan uploads per sync cycle, bounding the work per drain. */
        private const val MAX_PLAN_UPLOADS_PER_SYNC = 5
        /** Readiness day-records pushed per sync cycle (a backlog after long offline periods). */
        private const val MAX_READINESS_PUSHES_PER_SYNC = 8
        /** History window pulled on the first readiness sync. */
        private const val READINESS_PULL_DAYS = 90L
    }

    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val syncScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var fastPushJob: Job? = null

    init {
        repository.onMutationCommitted = { triggerFastPush(it) }
    }

    private val _status = MutableStateFlow(SyncStatus())
    val status: StateFlow<SyncStatus> = _status

    /** Outbox depth for UI badges. */
    val pendingCount = db.syncQueueDao().observePendingCount()

    /** Stop new traffic before waiting for in-flight reconciliation to leave the mutex. */
    suspend fun disconnect(restore: Boolean = false) {
        client.invalidateConnection()
        if (restore) settings.beginRestore() else settings.setConnectionEnabled(false)
        client.awaitConnectionWrites()
        fastPushJob?.cancel()
        mutex.withLock {
            authStore.clear()
            settings.setUploadActivitiesEnabled(false)
            settings.setUploadPlansEnabled(false)
            settings.setHealthMetricsSyncEnabled(false)
            repository.detachRemoteState()
        }
    }

    fun triggerFastPush(reason: String = "mutation") {
        fastPushJob?.cancel()
        fastPushJob = syncScope.launch {
            delay(250)
            // Cancel only the debounce, not an in-flight server write.
            syncScope.launch { pushPendingNow(reason) }
        }
    }

    suspend fun pushPendingNow(reason: String): SyncResult = guardSync("fast push", reason) { mutex.withLock {
        if (!settings.settingsOnce().connectionEnabled) return SyncResult(skipped = true)
        client.awaitReady()
        client.awaitOrigin(settings.settings.map { it.serverUrl })
        authStore.state.first { it.initialized }
        if (!authStore.state.value.loggedIn) {
            AppLog.d(TAG, "pushPendingNow skipped (not signed in), reason=$reason")
            return SyncResult(skipped = true)
        }
        AppLog.i(TAG, "pushPendingNow start, reason=$reason")
        _status.value = _status.value.copy(running = true, lastMessage = "Syncing…")
        val result = try {
            withContext(Dispatchers.IO) {
                cleanDemoDataOnFirstLogin()
                if (uploadsAllowed()) uploadLocalPlans()
                val (pushed, failed) = drainOutbox()
                try {
                    if (uploadsAllowed()) pushDirtyReadiness()
                } catch (e: IOException) {
                    AppLog.w(TAG, "readiness fast-push skipped (${e.message ?: "io error"})")
                } catch (e: HttpException) {
                    if (e.code() == 401) throw e
                    if (e.code() == 429) deferUploads(e, general = true)
                    AppLog.w(TAG, "readiness fast-push failed: HTTP ${e.code()}", e)
                }
                SyncResult(pushed = pushed, failed = failed)
            }
        } catch (e: IOException) {
            AppLog.w(TAG, "pushPendingNow offline (${e.message ?: "io error"}), reason=$reason", e)
            _status.value = SyncStatus(
                running = false,
                lastSyncAt = _status.value.lastSyncAt,
                lastMessage = "Offline — changes stay queued",
            )
            return SyncResult(skipped = true)
        } catch (e: HttpException) {
            AppLog.e(TAG, "pushPendingNow aborted: server error ${e.code()}", e)
            _status.value = SyncStatus(
                running = false,
                lastSyncAt = _status.value.lastSyncAt,
                lastMessage = "Server error ${e.code()}",
            )
            return SyncResult(failed = 1)
        } finally {
            _status.value = _status.value.copy(running = false)
        }

        val now = System.currentTimeMillis()
        val msg = buildString {
            append(if (result.pushed > 0) "↑${result.pushed} " else "")
            append(if (result.failed > 0) "⚠${result.failed}" else "")
            val pending = db.syncQueueDao().pendingCount()
            if (pending > 0) append(" $pending queued")
            if (!generalReadsAllowed()) append(" Server rate limited — retry later")
            if (isEmpty()) append("Up to date")
        }
        _status.value = SyncStatus(running = false, lastSyncAt = now, lastMessage = msg.trim())
        settings.setLastSync(now, msg.trim())
        AppLog.i(TAG, "pushPendingNow done (${msg.trim()}), reason=$reason")
        result
    } }

    suspend fun syncNow(reason: String, forceStrava: Boolean = false): SyncResult = guardSync("sync", reason) { mutex.withLock {
        healthConnect?.let { hc ->
            runCatching { hc.importIfEnabled() }.onFailure {
                if (it is CancellationException) throw it
                AppLog.w(TAG, "Health Connect import error (${it.message})")
            }
        }
        if (!settings.settingsOnce().connectionEnabled) return SyncResult(skipped = true)
        client.awaitReady()
        client.awaitOrigin(settings.settings.map { it.serverUrl })
        // Wait for the persisted session to be restored: without this, the
        // startup sync races AuthStore's DataStore read and no-ops even for
        // signed-in users.
        authStore.state.first { it.initialized }
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

        // Pulled server data may move the athlete's body metrics (resting HR,
        // believable max HR, auto zone boundaries) — best-effort so a failure
        // here can never fail the sync.
        runCatching { repository.refreshBodyFromData() }
            .onFailure { if (it is CancellationException) throw it; AppLog.w(TAG, "body auto-refresh failed (${it.message})") }

        // The server's two-metric VDOT/VO2max stats — fetched after the pull so
        // the server's fresh computation reflects the data just synced.
        // Best-effort: a failure keeps the previous snapshot and analytics fall
        // back to the on-device engine (offline port) when it goes stale.
        if (generalReadsAllowed()) repository.refreshServerMetrics()
            .onFailure {
                if (it is CancellationException) throw it
                if (it is HttpException && it.code() == 429) deferUploads(it, general = true)
                if (it is HttpException && it.code() == 401) throw it
                AppLog.w(TAG, "server metrics refresh failed (${it.message})")
            }

        val now = System.currentTimeMillis()
        val msg = buildString {
            append(if (result.pushed > 0) "↑${result.pushed} " else "")
            append(if (result.pulled > 0) "↓${result.pulled} " else "")
            append(if (result.failed > 0) "⚠${result.failed}" else "")
            val pending = db.syncQueueDao().pendingCount()
            if (pending > 0) append(" $pending queued")
            if (!generalReadsAllowed()) append(" Server rate limited — retry later")
            if (isEmpty()) append("Up to date")
        }
        _status.value = SyncStatus(running = false, lastSyncAt = now, lastMessage = msg.trim())
        settings.setLastSync(now, msg.trim())
        AppLog.i(TAG, "sync done (${msg.trim()}), reason=$reason")
        result
    } }

    /** Explicit recovery: download first, archive local edits, then replace only the profile. */
    suspend fun restoreWebProfile(context: android.content.Context): java.io.File = mutex.withLock {
        withContext(Dispatchers.IO) {
            client.awaitReady()
            client.awaitOrigin(settings.settings.map { it.serverUrl })
            val account = authStore.state.first { it.initialized }
            check(account.loggedIn && !account.userId.isNullOrBlank()) { "Sign in before restoring your web profile." }
            val before = settings.settingsOnce()
            val origin = com.runflow2.app.data.net.Api.normalizeServerUrl(before.serverUrl)
            if (!generalReadsAllowed()) {
                val seconds = ((before.generalReadCooldownUntil - System.currentTimeMillis()) / 1000 + 1).coerceAtLeast(1)
                throw IOException("Server rate limited. Try again in $seconds seconds.")
            }
            val snapshot = db.withTransaction {
                ProfileRecoverySnapshot(db.profileDao().get(), db.syncQueueDao().allForType(TYPE_PROFILE_UPDATE))
            }
            _status.value = _status.value.copy(running = true, lastMessage = "Downloading web profile…")
            try {
                val server = client.api().profile().user
                check(server.id == account.userId) { "Server returned a different account. Local profile was kept." }
                check(profilePreferences(settings.settingsOnce()) == profilePreferences(before)) {
                    "Profile settings changed during download. Try again."
                }
                check(com.runflow2.app.data.net.Api.normalizeServerUrl(settings.settingsOnce().serverUrl) == origin) {
                    "Server changed during download. Try again."
                }
                val backupSettings = org.json.JSONObject().apply {
                    put("accountId", account.userId); put("server", origin)
                    put("ftpWatts", before.ftpWatts); put("autoEstimateFtp", before.autoEstimateFtp)
                    put("includeCrossTraining", before.includeCrossTraining)
                    put("effectiveVo2maxCorrection", before.effectiveVo2maxCorrection)
                    put("primaryLoadMetric", before.primaryLoadMetric)
                }
                val archive = ProfileRecovery(context.applicationContext, db).replaceFromWeb(
                    server, account.email, snapshot, backupSettings,
                ) {
                    check(authStore.state.value.loggedIn && authStore.state.value.userId == account.userId && client.baseUrl == origin) {
                        "Account or server changed during download. Local profile was kept."
                    }
                }
                applyProfileSettings(server)
                settings.markProfileHydrated(settings.profileHydrationKey(account.userId, origin))
                authStore.updateEmailIfMissing(server.email)
                repository.invalidateAnalyticsCache()
                _status.value = _status.value.copy(lastMessage = "Web profile restored")
                AppLog.i(TAG, "Web profile restored; previous local profile archived")
                archive
            } catch (e: HttpException) {
                if (e.code() == 429) deferUploads(e, general = true)
                _status.value = _status.value.copy(lastMessage = "Web profile restore deferred")
                throw e
            } finally {
                _status.value = _status.value.copy(running = false)
            }
        }
    }

    private fun profilePreferences(s: com.runflow2.app.data.repo.AppSettings): List<Any> =
        listOf(s.ftpWatts, s.autoEstimateFtp, s.includeCrossTraining, s.effectiveVo2maxCorrection, s.primaryLoadMetric)

    private suspend fun applyProfileSettings(server: com.runflow2.app.data.net.UserDto) {
        server.ftpWatts?.let { settings.setFtpWatts(it) }
        server.autoEstimateFtp?.let { settings.setAutoEstimateFtp(it) }
        server.effectiveVo2maxCorrectionFactor?.let { settings.setEffectiveVo2maxCorrection(it) }
        server.includeCrossTraining?.let { settings.setIncludeCrossTraining(it) }
        server.primaryLoadMetric?.let { settings.setPrimaryLoadMetric(it) }
    }

    private suspend inline fun guardSync(operation: String, reason: String, block: () -> SyncResult): SyncResult =
        guardSyncFailures(block) { e ->
            AppLog.e(TAG, "$operation failed unexpectedly, reason=$reason", e)
            _status.value = _status.value.copy(running = false, lastMessage = "Sync failed — changes stay queued")
        }

    private suspend fun runSync(forceStrava: Boolean): SyncResult {
        var pushed = 0
        var failed = 0

        cleanDemoDataOnFirstLogin()

        AppLog.i(TAG, "sync account=${authStore.state.value.userId ?: "unknown"} origin=${com.runflow2.app.data.net.Api.normalizeServerUrl(settings.settingsOnce().serverUrl)}")
        // ---- profile ----
        try {
            val profile = db.profileDao().get()
            if (!generalReadsAllowed()) {
                AppLog.i(TAG, "profile pull deferred by server rate limit")
            } else if (profile == null || !profile.dirty) {
                val userId = authStore.state.value.userId
                val origin = settings.settingsOnce().serverUrl
                val server = client.api().profile().user
                if (userId.isNullOrBlank() || authStore.state.value.userId != userId ||
                    settings.settingsOnce().serverUrl != origin || server.id != userId) {
                    throw IOException("Profile account or origin changed during pull")
                }
                val stored = db.withTransaction {
                    val current = db.profileDao().get()
                    if (current != profile || current?.dirty == true) false
                    else { db.profileDao().upsert(server.applyTo(current ?: ProfileEntity(), authStore.state.value.email)); true }
                }
                if (!stored) throw IOException("Profile changed during pull")
                settings.markProfileHydrated(settings.profileHydrationKey(userId, origin))
                applyProfileSettings(server)
                // A Strava account may only get its email server-side later
                // (profile:read_all scope) — persist it once it shows up.
                authStore.updateEmailIfMissing(server.email)
                AppLog.i(TAG, "profile pull succeeded")
            } else {
                AppLog.i(TAG, "profile pull skipped: local edits pending")
            }
        } catch (e: IOException) {
            // offline mid-sync: fine
            failed++
            AppLog.w(TAG, "profile pull skipped (${e.message ?: "io error"})")
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            if (e.code() == 429) deferUploads(e, general = true)
            failed++
            AppLog.w(TAG, "profile pull failed: HTTP ${e.code()}", e)
        } catch (e: CancellationException) { throw e
        } catch (e: Exception) { failed++; AppLog.e(TAG, "profile pull failed", e) }

        var pulled = 0
        var pruned = 0
        try {
            val (count, removed) = if (generalReadsAllowed()) pullPlans() else {
                AppLog.i(TAG, "plan pull deferred by server rate limit")
                0 to 0
            }
            pulled += count
            pruned += removed
            if (generalReadsAllowed()) AppLog.i(TAG, "plan pull succeeded: $count plan(s), $removed pruned")
        } catch (e: CancellationException) { throw e
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            if (e.code() == 429) deferUploads(e, general = true)
            failed++
            AppLog.w(TAG, "plan pull failed: HTTP ${e.code()}", e)
        } catch (e: Exception) { failed++; AppLog.e(TAG, "plan pull failed", e) }

        try {
            val (count, removed) = pullActivities()
            pulled += count
            pruned += removed
            AppLog.i(TAG, "activity pull succeeded: $count activity(ies), $removed pruned")
        } catch (e: CancellationException) { throw e
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            if (e.code() == 429) deferUploads(e)
            failed++
            AppLog.w(TAG, "activity pull failed: HTTP ${e.code()}", e)
        } catch (e: Exception) { failed++; AppLog.e(TAG, "activity pull failed", e) }

        if (uploadsAllowed()) uploadLocalPlans()
        val (outboxPushed, outboxFailed) = drainOutbox()
        pushed += outboxPushed
        failed += outboxFailed

        // ---- server-side Strava import. Throttled to every 6h for the
        // periodic/startup path; explicit user pulls (pull-to-refresh, manual
        // "Sync now") force it so fresh Strava activities show up on demand. ----
        val lastTrigger = settings.settingsOnce().lastStravaTriggerAt
        if (uploadsAllowed() && (forceStrava || System.currentTimeMillis() - lastTrigger > STRAVA_TRIGGER_INTERVAL_MS)) {
            try {
                val api = client.api()
                val started = try {
                    api.triggerServerSync(TriggerSyncRequest(automatic = !forceStrava))
                } catch (error: HttpException) {
                    if (error.code() != 409) throw error
                    null // Another client already started the same import.
                }
                settings.setLastStravaTrigger(System.currentTimeMillis())
                val imported = started?.activitiesSynced ?: 0
                // Startup and periodic sync stay nonblocking. A manual sync can
                // follow a short import and fetch its changes before returning.
                if (imported > 0 || (forceStrava && (started == null || started.syncStarted) &&
                        awaitStravaImport(api, started?.lastSyncAt))) {
                    val again = pullActivities()
                    pulled += again.first
                    pruned += again.second
                }
            } catch (e: HttpException) {
                if (e.code() == 401) throw e
                if (e.code() == 429) deferUploads(e)
                AppLog.w(TAG, "server Strava import failed: HTTP ${e.code()}", e)
            } catch (e: IOException) {
                AppLog.w(TAG, "server Strava import unreachable (${e.message ?: "io error"})", e)
            }
        }

        // ---- readiness: daily health metrics + score push / history pull ----
        try {
            if (generalReadsAllowed()) syncReadiness()
        } catch (e: IOException) {
            // offline mid-sync: whatever was pushed stays queued (dirty)
            AppLog.w(TAG, "readiness sync skipped (${e.message ?: "io error"})")
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
            if (e.code() == 429) deferUploads(e, general = true)
            AppLog.w(TAG, "readiness sync failed: HTTP ${e.code()}", e)
        }

        // ---- workout auto-link suggestions (Decision U2 / D6) ----
        try {
            repository.matchWorkoutsWithActivities()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            AppLog.w(TAG, "workout auto-link matching failed: ${e.message}", e)
        }

        return SyncResult(pushed = pushed, pulled = pulled, pruned = pruned, failed = failed)
    }

    private suspend fun generalReadsAllowed(): Boolean = settings.settingsOnce().generalReadCooldownUntil <= System.currentTimeMillis()

    private suspend fun uploadsAllowed(): Boolean {
        val s = settings.settingsOnce()
        val now = System.currentTimeMillis()
        return s.uploadCooldownUntil <= now && s.generalReadCooldownUntil <= now
    }

    private suspend fun deferUploads(error: HttpException, general: Boolean = false) {
        val response = error.response()
        val body = runCatching {
            response?.errorBody()?.source()?.peek()?.let { source ->
                source.request(16_385)
                source.readUtf8(minOf(source.buffer.size, 16_384))
            }
        }.getOrNull()
        val until = maxOf(settings.settingsOnce().uploadCooldownUntil,
            retryAfterUntil(response?.headers()?.get("Retry-After"), System.currentTimeMillis(), body))
        settings.setUploadCooldownUntil(until)
        if (general) settings.setGeneralReadCooldownUntil(maxOf(settings.settingsOnce().generalReadCooldownUntil, until))
        AppLog.w(TAG, "${if (general) "general requests and uploads" else "uploads"} deferred until $until after HTTP 429")
    }

    private suspend fun drainOutbox(): Pair<Int, Int> {
        var pushed = 0
        var failed = 0
        if (!uploadsAllowed()) return 0 to 0
        val policy = settings.settingsOnce()
        if (policy.uploadActivitiesEnabled && policy.uploadExistingActivitiesEnabled) queueExistingActivities()
        val batch = db.syncQueueDao().nextBatch(MAX_OUTBOX_PER_SYNC)
        for (candidate in batch) {
            val item = db.syncQueueDao().pendingById(candidate.id) ?: continue
            if (!settings.settingsOnce().connectionEnabled) break
            if (item.entityType.startsWith("activity_")) {
                if (!policy.uploadActivitiesEnabled) continue
                val activity = db.activityDao().byId(item.localId)
                if (activity == null && !policy.uploadExistingActivitiesEnabled) continue
                if (activity != null && !policy.mayUploadActivity(activity.startDate)) continue
            }
            if ((item.entityType.startsWith("workout_") || item.entityType.startsWith("goal_") || item.entityType == TYPE_PROFILE_UPDATE) && !policy.uploadPlansEnabled) continue
            if (item.entityType == TYPE_PROFILE_UPDATE) {
                val s = settings.settingsOnce()
                val account = authStore.state.value
                val profile = db.profileDao().get()
                val hydrated = !account.userId.isNullOrBlank() && s.profileHydrationKey == settings.profileHydrationKey(account.userId, s.serverUrl)
                if (!hydrated && (profile == null || profile.name.trim().equals("RunFlow Athlete", ignoreCase = true))) {
                    AppLog.w(TAG, "Profile update deferred: use web profile in Settings")
                    continue
                }
            }
            val now = System.currentTimeMillis()
            try {
                handleOutboxItem(item.id, item.entityType, item.localId, item.payloadJson)
                db.syncQueueDao().markCompleted(item.id)
                pushed++
            } catch (e: HttpException) {
                if (e.code() == 401) throw e
                failed++
                if (e.code() == 429) {
                    deferUploads(e, general = item.entityType !in setOf(TYPE_ACTIVITY_CREATE, TYPE_ACTIVITY_UPDATE, TYPE_ACTIVITY_DELETE))
                    AppLog.w(TAG, "outbox rate limited; queued items retained", e)
                    break
                } else if (e.code() in 400..499 && e.code() != 408) {
                    AppLog.e(TAG, "outbox ${item.entityType}(${item.localId}) dead-lettered: HTTP ${e.code()}", e)
                    markOutboxDead(item.id, item.entityType, now)
                } else if (item.retryCount + 1 >= item.maxRetries) {
                    AppLog.e(TAG, "outbox ${item.entityType}(${item.localId}) dead-lettered after ${item.retryCount + 1} tries: HTTP ${e.code()}", e)
                    markOutboxDead(item.id, item.entityType, now)
                } else {
                    db.syncQueueDao().incrementRetry(item.id, now)
                    AppLog.w(TAG, "outbox ${item.entityType}(${item.localId}) deferred: HTTP ${e.code()}", e)
                }
            } catch (e: IOException) {
                AppLog.w(TAG, "outbox push interrupted — will retry", e)
                db.syncQueueDao().incrementRetry(item.id, now)
                break
            }
        }
        if (pushed > 0) AppLog.i(TAG, "pushed $pushed outbox item(s)")
        return pushed to failed
    }

    private suspend fun queueExistingActivities() {
        val candidates = db.activityDao().pendingHistoryUploads(MAX_OUTBOX_PER_SYNC)
        for (activity in candidates) {
            if (settings.settingsOnce().let { !it.connectionEnabled || !it.uploadActivitiesEnabled || !it.uploadExistingActivitiesEnabled }) return
            db.withTransaction {
                val current = db.activityDao().byId(activity.id)
                if (current != null && current.serverId == null && !current.isDemo &&
                    db.syncQueueDao().pendingFor(TYPE_ACTIVITY_CREATE, current.id).isEmpty()) {
                    db.activityDao().upsert(current.copy(dirty = true))
                    db.syncQueueDao().insert(SyncQueueEntity(entityType = TYPE_ACTIVITY_CREATE, localId = current.id,
                        payloadJson = json.encodeToString(CreateActivityRequest.serializer(), current.toCreateRequest())))
                }
            }
        }
    }

    /**
     * Pushes dirty readiness day records and baseline (no history pull).
     */
    private suspend fun pushDirtyReadiness(): Int {
        val s = settings.settingsOnce()
        if (!s.healthMetricsSyncEnabled) return 0

        val series = repository.dailyLoadSeries()
        repository.recomputeDailyReadiness(LocalDate.now(), series)

        // ---- push: dirty days, oldest first, bounded like the plan uploads ----
        val dirty = db.dailyEntryDao().dirtyEntries().filter { s.mayUploadHealthDate(it.date) }.sortedBy { it.date }
        val pushedDates = ArrayList<String>(dirty.size)
        for (entry in dirty) {
            if (pushedDates.size >= MAX_READINESS_PUSHES_PER_SYNC) break
            try {
                client.api().postReadinessDaily(repository.readinessPayloadFor(entry, if (s.uploadExistingHealthEnabled) series else emptyList(),
                    if (s.uploadExistingHealthEnabled) null else s.healthMetricsConsentSince))
                pushedDates += entry.date
            } catch (e: HttpException) {
                if (e.code() == 401 || e.code() == 429) throw e
                // one bad day must not starve the rest of the queue
                AppLog.w(TAG, "readiness push for ${entry.date} failed: HTTP ${e.code()}", e)
            }
        }
        if (pushedDates.isNotEmpty()) {
            db.dailyEntryDao().markClean(pushedDates)
            settings.setReadinessLastPushAt(System.currentTimeMillis())
            AppLog.i(TAG, "readiness pushed ${pushedDates.size} day(s)")
        }

        // ---- baseline upload after a successful push (best-effort) ----
        if (pushedDates.isNotEmpty() && s.uploadExistingHealthEnabled) {
            val baseline = BaselineDto(
                rhrMedian30Day = repository.rhrBaseline30d(),
                sleepAverage28Day = repository.sleepAverage28d(),
            )
            if (baseline.rhrMedian30Day != null || baseline.sleepAverage28Day != null) {
                client.api().putReadinessBaseline(baseline)
            }
        }
        return pushedDates.size
    }

    /**
     * Health-metrics reconciliation, gated on [AppSettings.healthMetricsSyncEnabled]:
     *  1. refresh today's score cache (the Health Connect import ran earlier
     *     and leaves the cache columns null on fresh rows);
     *  2. push every dirty day as a POST /readiness/daily upsert and mark the
     *     accepted dates clean — failures stay dirty and retry next sync;
     *  3. on the very first sync (no push ever happened) pull the server's
     *     90-day history so a second device starts from shared data — dirty
     *     local rows win, otherwise a strictly newer server record replaces
     *     the local one;
     *  4. after a successful push, upload the RHR/sleep baselines (skipped
     *     silently when neither has enough data yet).
     */
    private suspend fun syncReadiness() {
        val s = settings.settingsOnce()
        if (!s.healthMetricsSyncEnabled) return
        val isFirstSync = s.readinessLastPushAt == 0L

        if (uploadsAllowed()) pushDirtyReadiness()

        // ---- first-sync pull: backfill from the server's history ----
        if (isFirstSync) {
            val today = LocalDate.now()
            val history = client.api().getReadinessHistory(
                start = today.minusDays(READINESS_PULL_DAYS).toString(),
                end = today.toString(),
            )
            var pulledReadiness = 0
            for (dto in history) {
                val merged = dto.toDailyEntry(db.dailyEntryDao().byDate(dto.date)) ?: continue
                db.dailyEntryDao().upsert(merged)
                pulledReadiness++
            }
            if (pulledReadiness > 0) AppLog.i(TAG, "readiness history pulled $pulledReadiness day(s)")
        }
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
        val policy = settings.settingsOnce()
        if (!policy.connectionEnabled || !policy.uploadPlansEnabled || policy.uploadPlansConsentSince <= 0L) return
        // Wide query, success-capped loop: a permanently rejected plan must
        // not occupy an upload slot and starve later goals.
        val goals = db.goalDao().localOnlyGoals(50, policy.uploadExistingPlansEnabled, policy.uploadPlansConsentSince)
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
                if (e.code() == 401) throw e
                if (e.code() == 429) { deferUploads(e, general = true); break }
                AppLog.w(TAG, "plan ${goal.id} upload failed: HTTP ${e.code()} — stays local", e)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Unexpected (mapping/serialization bug): log and keep going —
                // one bad plan must not abort the whole sync.
                AppLog.e(TAG, "plan ${goal.id} upload failed unexpectedly — stays local", e)
            }
        }
        if (uploaded > 0) AppLog.i(TAG, "uploaded $uploaded local plan(s)")
    }

    private suspend fun handleOutboxItem(queueId: Long, type: String, localId: String, payloadJson: String) {
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
                    db.activityDao().byId(localId)?.let { db.activityDao().upsert(it.copy(dirty = false)) }
                }
            }
            TYPE_ACTIVITY_DELETE -> {
                val obj = runCatching { json.parseToJsonElement(payloadJson).jsonObject }.getOrNull()
                val serverId = obj?.get("activityId")?.jsonPrimitive?.content ?: localId
                val resp = api.deleteActivity(serverId)
                if (!resp.isSuccessful && resp.code() != 404) throw HttpException(resp)
            }
            TYPE_PROFILE_UPDATE -> {
                val req = json.decodeFromString(UpdateProfileRequest.serializer(), payloadJson)
                client.api().updateProfile(req)
                db.profileDao().get()?.let { db.profileDao().upsert(it.copy(dirty = false)) }
            }
            TYPE_WORKOUT_UPDATE -> {
                var req = json.decodeFromString(PatchWorkoutRequest.serializer(), payloadJson)
                if (req.linkedActivityId != null) {
                    val localAct = db.activityDao().byId(req.linkedActivityId!!)
                    if (localAct != null) {
                        if (localAct.serverId != null) {
                            req = req.copy(linkedActivityId = localAct.serverId)
                        } else {
                            throw IOException("Deferring workout update until linked activity ${localAct.id} is uploaded")
                        }
                    }
                }
                client.api().patchWorkout(localId, req.toWireBody())
                db.withTransaction {
                    val newer = db.syncQueueDao().pendingFor(TYPE_WORKOUT_UPDATE, localId).any { it.id != queueId }
                    if (!newer) db.workoutDao().byId(localId)?.let { db.workoutDao().upsert(it.copy(dirty = false)) }
                }
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
                            .onFailure { if (it is CancellationException) throw it }
                    } else {
                        val server = dto.toWorkoutEntity(payload.goalId)
                        val dup = db.workoutDao().byId(dto.id)
                        if (server == null || (dup != null && dup.id != local.id)) {
                            // Unusable response, or a pull already brought this
                            // server row in: drop the temp row, server wins.
                            db.workoutDao().delete(local.id)
                        } else {
                            val remapped = db.withTransaction {
                                val fresh = db.workoutDao().byId(local.id) ?: return@withTransaction false
                                val updates = db.syncQueueDao().pendingFor(TYPE_WORKOUT_UPDATE, local.id)
                                db.workoutDao().upsert(reconcileCreatedWorkout(fresh, server).copy(dirty = updates.isNotEmpty()))
                                db.workoutDao().delete(local.id)
                                // Keep queued edits on the real server ID and
                                // protect them from a pull until acknowledged.
                                updates.forEach { item ->
                                    db.syncQueueDao().insert(item.copy(id = 0, localId = dto.id))
                                    db.syncQueueDao().markCompleted(item.id)
                                }
                                true
                            }
                            if (!remapped) runCatching { api.deleteWorkout(payload.goalId, dto.id) }
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
        val deletedGoals = db.syncQueueDao().allForType(TYPE_GOAL_DELETE).map { it.localId }.toSet()
        val deletedWorkouts = db.syncQueueDao().allForType(TYPE_WORKOUT_DELETE).map { it.localId }.toSet()
        var pulled = 0
        var pruned = 0
        val seenIds = HashSet<String>(serverGoals.size)
        for (g in serverGoals) {
            seenIds += g.id
            if (g.id in deletedGoals) continue
            val (goal, rawServerWorkouts) = g.toEntities() ?: continue
            val serverWorkouts = rawServerWorkouts.filterNot { it.id in deletedWorkouts }.map { sw ->
                if (sw.activityId != null) {
                    val localActId = db.activityDao().byServerId(sw.activityId)?.id ?: sw.activityId
                    sw.copy(activityId = localActId)
                } else {
                    sw
                }
            }
            val existing = db.goalDao().byId(goal.id)
            db.goalDao().upsert(if (existing?.dirty == true) existing else goal)
            val localWorkouts = db.workoutDao().forGoal(goal.id)
            db.workoutDao().upsertAll(mergeServerWorkouts(localWorkouts, serverWorkouts))
            val serverIds = serverWorkouts.map { it.id }.toSet()
            // An unmappable workout means this goal was only partially pulled.
            if (rawServerWorkouts.size == g.workouts.size) {
                localWorkouts.filter { it.id !in serverIds && !it.dirty }.forEach {
                    db.workoutDao().delete(it.id)
                }
            } else {
                AppLog.w(TAG, "plan ${g.id} contains unmappable workouts; pruning skipped")
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

    private suspend fun markOutboxDead(id: Long, type: String, now: Long) {
        db.withTransaction {
            db.syncQueueDao().markDead(id, now)
            // If a local deletion was rejected, its server row may have
            // been intentionally skipped earlier. Reconcile that history.
            if (type == TYPE_ACTIVITY_DELETE) {
                authStore.state.value.userId?.let { userId ->
                    val scope = "${client.baseUrl}|$userId"
                    db.activitySyncCursorDao().remove(scope)
                    db.activitySyncCursorDao().clearUnseen(scope)
                }
            }
        }
    }

    private suspend fun awaitStravaImport(api: RunFlowApi, lastSyncAt: String?): Boolean =
        withTimeoutOrNull(20_000L) {
            var sawRunning = false
            repeat(9) { attempt ->
                delay(2_000L)
                val status = api.serverSyncProgress()
                if (status.syncInProgress) {
                    sawRunning = true
                } else if (sawRunning || (status.lastSyncAt != null && status.lastSyncAt != lastSyncAt) || attempt >= 2) {
                    return@withTimeoutOrNull true
                }
            }
            false
        } ?: false

    /** Returns the number of changed rows and tombstones applied. */
    private suspend fun pullActivities(): Pair<Int, Int> {
        val userId = authStore.state.value.userId ?: return 0 to 0
        val origin = client.baseUrl
        val scope = "$origin|$userId"
        val api = client.api()
        val cursorDao = db.activitySyncCursorDao()
        fun requireCurrentAccount() {
            if (authStore.state.value.userId != userId || client.baseUrl != origin) {
                throw IOException("Activity sync session changed")
            }
        }

        suspend fun requireCurrentCheckpoint(expected: String?) {
            requireCurrentAccount()
            if (cursorDao.get(scope)?.cursor != expected) {
                throw IOException("Activity sync checkpoint changed")
            }
        }

        val checkpoint = cursorDao.get(scope)
        var cursor = checkpoint?.cursor
        var snapshot = checkpoint?.snapshot ?: true
        var resetUsed = false
        var pulled = 0
        var pruned = 0
        repeat(MAX_PAGES) { pageIndex ->
            requireCurrentAccount()
            val page = try {
                api.activityChanges(cursor)
            } catch (error: HttpException) {
                // Older servers don't have this route. Clear the cursor so an
                // upgrade/rollback cannot resume from a stale checkpoint.
                if (pageIndex == 0 && error.code() in setOf(404, 405, 501)) {
                    db.withTransaction {
                        requireCurrentCheckpoint(cursor)
                        cursorDao.remove(scope)
                        cursorDao.clearUnseen(scope)
                    }
                    return pullLegacyActivities(api, ::requireCurrentAccount)
                }
                throw error
            }
            if (page.reset) {
                if (resetUsed) throw IOException("Activity change feed repeatedly requested a reset")
                resetUsed = true
                snapshot = true
                db.withTransaction {
                    requireCurrentCheckpoint(cursor)
                    cursorDao.remove(scope)
                    cursorDao.clearUnseen(scope)
                }
                cursor = null
                return@repeat
            }
            if (page.cursor.isBlank() || (page.hasMore && page.cursor == cursor)) {
                throw IOException("Invalid activity change cursor")
            }
            db.withTransaction {
                requireCurrentCheckpoint(cursor)
                if (snapshot && cursor == null) cursorDao.beginSnapshot(scope)
                pulled += applyActivityRows(page.activities)
                for (id in page.deletedIds) pruned += db.activityDao().deleteCleanByServerId(id)
                if (snapshot) {
                    page.activities.map { it.id }.chunked(500).forEach { cursorDao.markSeen(scope, it) }
                    if (!page.hasMore) {
                        pruned += cursorDao.pruneUnseen(scope)
                        cursorDao.clearUnseen(scope)
                    }
                }
                cursorDao.put(ActivitySyncCursor(scope, page.cursor, snapshot && page.hasMore))
            }
            cursor = page.cursor
            if (!page.hasMore) {
                if (!snapshot) return pulled to pruned
                // Replay writes made while the snapshot was being paginated.
                snapshot = false
            }
        }
        return pulled to pruned
    }

    /** Compatibility with servers that only expose offset pagination. */
    private suspend fun pullLegacyActivities(api: RunFlowApi, requireCurrentAccount: () -> Unit): Pair<Int, Int> {
        var offset = 0
        val seen = mutableSetOf<String>()
        var pulled = 0
        var expectedTotal: Int? = null
        var stable = true
        repeat(MAX_PAGES) {
            requireCurrentAccount()
            val page = api.activities(limit = PAGE_SIZE, offset = offset)
            if (page.hasMore && page.activities.isEmpty()) throw IOException("Invalid legacy activity page")
            if (expectedTotal == null) expectedTotal = page.total
            if (expectedTotal != page.total || page.activities.any { !seen.add(it.id) }) stable = false
            val pruned = db.withTransaction {
                requireCurrentAccount()
                pulled += applyActivityRows(page.activities)
                if (!page.hasMore && stable && seen.size == expectedTotal) pruneMissingActivities(seen) else 0
            }
            if (!page.hasMore) return pulled to pruned
            offset += page.activities.size
        }
        // A bounded partial scan cannot prove any rows were deleted.
        return pulled to 0
    }

    /** Called inside the same Room transaction as the cursor checkpoint. */
    private suspend fun applyActivityRows(rows: List<ActivityDto>): Int {
        if (rows.isEmpty()) return 0
        val pendingDeletes = db.syncQueueDao().pendingPayloads(TYPE_ACTIVITY_DELETE).mapNotNull { payload ->
            runCatching { json.parseToJsonElement(payload).jsonObject["activityId"]?.jsonPrimitive?.content }.getOrNull()
        }.toHashSet()
        val dao = db.activityDao()
        val now = System.currentTimeMillis()
        var count = 0
        for (dto in rows) {
            if (dto.id in pendingDeletes) continue
            val existing = dao.byServerId(dto.id)
            if (existing?.dirty == true) continue
            dao.upsert(dto.mergeInto(existing, now))
            count++
        }
        return count
    }

    private suspend fun pruneMissingActivities(seen: Set<String>): Int {
        val dao = db.activityDao()
        return dao.cleanServerIds().filterNot { it in seen }.sumOf { dao.deleteCleanByServerId(it) }
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

/** Converts unexpected sync failures into a retryable result, while preserving cancellation. */
internal suspend inline fun guardSyncFailures(block: () -> SyncResult, onFailure: (Exception) -> Unit): SyncResult =
    try {
        block()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        onFailure(e)
        SyncResult(failed = 1)
    }

/** Retry-After permits delta seconds or an RFC 7231 date. Invalid values fall back to one minute. */
internal fun retryAfterUntil(header: String?, now: Long, body: String? = null): Long {
    fun secondsUntil(seconds: Long?): Long? = seconds?.takeIf { it >= 0 }?.let {
        now + it.coerceAtMost((Long.MAX_VALUE - now) / 1000) * 1000
    }
    secondsUntil(header?.trim()?.toLongOrNull())?.let { return it }
    val date = runCatching { ZonedDateTime.parse(header, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli() }.getOrNull()
    if (date != null && date > now) return date
    val bodySeconds = runCatching {
        val root = Json.parseToJsonElement(body ?: return@runCatching null).jsonObject
        root["details"]?.jsonObject?.get("retryAfter")?.jsonPrimitive?.longOrNull
    }.getOrNull()
    return secondsUntil(bodySeconds) ?: now + 60_000L
}
