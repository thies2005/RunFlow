package com.runflow2.app.data.sync

import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.CreateActivityRequest
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.UpdateActivityRequest
import com.runflow2.app.data.net.UpdateProfileRequest
import com.runflow2.app.data.repo.SettingsRepository
import com.runflow2.app.data.sync.applyTo
import com.runflow2.app.data.sync.mergeInto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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
) {
    companion object {
        const val TYPE_ACTIVITY_CREATE = "activity_create"
        const val TYPE_ACTIVITY_UPDATE = "activity_update"
        const val TYPE_PROFILE_UPDATE = "profile_update"
        private const val PAGE_SIZE = 100
        private const val MAX_PAGES = 60
        private const val STRAVA_TRIGGER_INTERVAL_MS = 6 * 60 * 60 * 1000L // 6h
    }

    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    private val _status = MutableStateFlow(SyncStatus())
    val status: StateFlow<SyncStatus> = _status

    /** Outbox depth for UI badges. */
    val pendingCount = db.syncQueueDao().observePendingCount()

    suspend fun syncNow(reason: String): SyncResult = mutex.withLock {
        if (!authStore.state.value.loggedIn) return SyncResult(skipped = true)
        _status.value = _status.value.copy(running = true, lastMessage = "Syncing…")
        val result = try {
            withContext(Dispatchers.IO) { runSync() }
        } catch (e: IOException) {
            _status.value = SyncStatus(running = false, lastSyncAt = _status.value.lastSyncAt,
                lastMessage = "Offline — changes stay queued")
            return SyncResult(skipped = true)
        } catch (e: HttpException) {
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
        result
    }

    private suspend fun runSync(): SyncResult {
        var pushed = 0
        var failed = 0

        cleanDemoDataOnFirstLogin()

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
                        db.syncQueueDao().markDead(item.id, now)
                    } else if (item.retryCount + 1 >= item.maxRetries) {
                        db.syncQueueDao().markDead(item.id, now)
                    } else {
                        db.syncQueueDao().incrementRetry(item.id, now)
                    }
                    progress = true
                } catch (e: IOException) {
                    // Connection dropped: stop draining, retry next window.
                    db.syncQueueDao().incrementRetry(item.id, now)
                    break
                }
            }
            if (!progress) break
        }

        // ---- pull: server state wins ----
        var (pulled, pruned) = pullActivities()

        // ---- server-side Strava import, throttled to every 6h ----
        val lastTrigger = settings.settingsOnce().lastStravaTriggerAt
        if (System.currentTimeMillis() - lastTrigger > STRAVA_TRIGGER_INTERVAL_MS) {
            try {
                val imported = client.api().triggerServerSync().activitiesSynced
                settings.setLastStravaTrigger(System.currentTimeMillis())
                if (imported > 0) {
                    val again = pullActivities()
                    pulled += again.first
                    pruned += again.second
                }
            } catch (e: HttpException) {
                if (e.code() == 409) settings.setLastStravaTrigger(System.currentTimeMillis())
                // otherwise ignore: import is best-effort
            } catch (e: IOException) {
                // best-effort only
            }
        }

        // ---- profile ----
        try {
            val profile = db.profileDao().get()
            if (profile == null || !profile.dirty) {
                val server = client.api().profile().user
                db.profileDao().upsert(server.applyTo(profile ?: ProfileEntity()))
            }
        } catch (e: IOException) {
            // offline mid-sync: fine
        } catch (e: HttpException) {
            if (e.code() == 401) throw e
        }

        return SyncResult(pushed = pushed, pulled = pulled, pruned = pruned, failed = failed)
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
        }
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

    /** Demo/seed data is cleared once, the first time the user logs in. */
    private suspend fun cleanDemoDataOnFirstLogin() {
        val s = settings.settingsOnce()
        if (!s.demoCleaned) {
            db.activityDao().deleteDemo()
            db.goalDao().deleteDemo()
            db.workoutDao().deleteDemo()
            settings.setDemoCleaned()
        }
    }
}
