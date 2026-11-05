package com.runflow2.app.data.sync

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.net.NetworkClient
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.async
import kotlinx.coroutines.Dispatchers
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import retrofit2.HttpException
import java.io.File
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [30])
class ProfileRecoveryIntegrationTest {
    private lateinit var ctx: Context
    private lateinit var db: AppDatabase
    private lateinit var server: MockWebServer
    private lateinit var client: NetworkClient
    private lateinit var auth: com.runflow2.app.data.net.AuthStore
    private lateinit var settings: com.runflow2.app.data.repo.SettingsRepository
    private lateinit var manager: SyncManager
    private lateinit var repo: com.runflow2.app.data.repo.RunFlowRepository
    private val backupDir get() = File(ctx.filesDir, "profile-recovery")
    private val original = ProfileEntity(name = "Local", email = "local@example.test", sex = "FEMALE",
        birthYear = 1984, weightKg = 71.2, heightCm = 164.0, hrMax = 181, hrRest = 49,
        hrZone1Max = 101, hrZone2Max = 121, hrZone3Max = 141, hrZone4Max = 151,
        hrZone5Max = 161, hrZone6Max = 171, hrZonesAuto = false, thresholdHr = 160,
        thresholdPaceSecPerKm = 310, vdotCorrection = 1.1,
        effectiveVo2maxCorrection = 1.2, dirty = true)

    @Before fun setUp() = runBlocking {
        ctx = ApplicationProvider.getApplicationContext()
        backupDir.deleteRecursively()
        db = Room.inMemoryDatabaseBuilder(ctx, AppDatabase::class.java).build()
        server = MockWebServer().apply { start() }
        settings = com.runflow2.app.data.repo.SettingsRepository(ctx)
        settings.setServerUrl(server.url("/").toString())
        settings.setDemoCleaned()
        settings.setUploadCooldownUntil(0)
        settings.setGeneralReadCooldownUntil(0)
        settings.clearProfileHydration()
        auth = com.runflow2.app.data.net.AuthStore(ctx)
        auth.state.first { it.initialized }
        auth.saveSession(com.runflow2.app.data.net.AuthResponse("qa-token", "qa-refresh", user = com.runflow2.app.data.net.UserDto("user1")))
        client = NetworkClient(auth, settings = settings)
        repo = com.runflow2.app.data.repo.RunFlowRepository(db, db.activityDao(), db.goalDao(), db.workoutDao(), db.profileDao(), db.syncQueueDao(), db.planSnapshotDao(), db.dailyEntryDao(), auth, client, settings)
        manager = SyncManager(db, client, auth, settings, repo)
    }
    @After fun tearDown() { db.close(); server.shutdown(); backupDir.deleteRecursively() }

    private suspend fun seed(): List<SyncQueueEntity> {
        db.profileDao().upsert(original)
        val entries = listOf(
            SyncQueueEntity(entityType = SyncManager.TYPE_PROFILE_UPDATE, localId = "1", payloadJson = "{\"name\":\"pending\"}", retryCount = 2, maxRetries = 7, createdAt = 101, lastAttemptAt = 102),
            SyncQueueEntity(entityType = SyncManager.TYPE_PROFILE_UPDATE, localId = "1", payloadJson = "{\"name\":\"dead\"}", retryCount = 8, maxRetries = 8, dead = true, createdAt = 103, lastAttemptAt = 104),
            SyncQueueEntity(entityType = SyncManager.TYPE_ACTIVITY_CREATE, localId = "activity", payloadJson = "{}", createdAt = 105))
        return entries.map { it.copy(id = db.syncQueueDao().insert(it)) }
    }

    private suspend fun recover(loggedIn: Boolean = true): File {
        if (!loggedIn) auth.clear()
        return manager.restoreWebProfile(ctx)
    }
    private fun assertNoExtraRequest() { assertNull(server.takeRequest(200, TimeUnit.MILLISECONDS)) }

    @Test fun rateLimitedGetLeavesEverythingUntouched() = runBlocking {
        val entries = seed()
        server.enqueue(MockResponse().setResponseCode(429).addHeader("Retry-After", "120"))
        try { recover(); fail("Expected HTTP 429") } catch (e: HttpException) { assertEquals(429, e.code()) }
        assertEquals(original, db.profileDao().get())
        assertEquals(entries.take(2), db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE))
        assertEquals(entries.drop(2), db.syncQueueDao().allForType(SyncManager.TYPE_ACTIVITY_CREATE))
        assertFalse(backupDir.exists())
        assertEquals("GET", server.takeRequest().method)
        assertNoExtraRequest()
    }

    @Test fun successArchivesFullSnapshotAndKeepsUnrelatedQueue() = runBlocking {
        val entries = seed()
        server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody(
            """{"user":{"id":"user1","name":"Web","weight":62.5,"hrMax":175}}"""))
        val backup = recover()
        val current = db.profileDao().get()!!
        assertEquals("Web", current.name); assertEquals(62.5, current.weightKg, 0.001)
        assertEquals(175, current.hrMax); assertFalse(current.dirty)
        assertEquals(original.hrZone2Max, current.hrZone2Max) // server does not supply zones
        assertTrue(db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE).isEmpty())
        assertEquals(entries.drop(2), db.syncQueueDao().allForType(SyncManager.TYPE_ACTIVITY_CREATE))
        val json = JSONObject(backup.readText())
        assertEquals(1, json.getInt("formatVersion"))
        val saved = json.getJSONObject("profile")
        // Assert every persisted property, not only the fields changed by this test.
        val expected = mapOf<String, Any>("id" to original.id, "name" to original.name,
            "email" to original.email, "sex" to original.sex, "birthYear" to original.birthYear,
            "weightKg" to original.weightKg, "heightCm" to original.heightCm, "hrMax" to original.hrMax,
            "hrRest" to original.hrRest, "hrZone1Max" to original.hrZone1Max, "hrZone2Max" to original.hrZone2Max,
            "hrZone3Max" to original.hrZone3Max, "hrZone4Max" to original.hrZone4Max,
            "hrZone5Max" to original.hrZone5Max, "hrZone6Max" to original.hrZone6Max,
            "hrZonesAuto" to original.hrZonesAuto, "thresholdHr" to original.thresholdHr,
            "thresholdPaceSecPerKm" to original.thresholdPaceSecPerKm, "vdotCorrection" to original.vdotCorrection,
            "effectiveVo2maxCorrection" to original.effectiveVo2maxCorrection, "dirty" to original.dirty)
        assertEquals(expected.size, saved.length())
        expected.forEach { (key, value) ->
            if (value is Number) assertEquals(key, value.toDouble(), saved.getDouble(key), 0.0)
            else assertEquals(key, value, saved.get(key))
        }
        val archivedQueue = json.getJSONArray("profileOutbox")
        assertEquals(2, archivedQueue.length())
        entries.take(2).forEachIndexed { index, item ->
            val q = archivedQueue.getJSONObject(index)
            assertEquals(9, q.length()); assertEquals(item.id, q.getLong("id"))
            assertEquals(item.entityType, q.getString("entityType")); assertEquals(item.localId, q.getString("localId"))
            assertEquals(item.payloadJson, q.getString("payloadJson")); assertEquals(item.retryCount, q.getInt("retryCount"))
            assertEquals(item.maxRetries, q.getInt("maxRetries")); assertEquals(item.dead, q.getBoolean("dead"))
            assertEquals(item.createdAt, q.getLong("createdAt")); assertEquals(item.lastAttemptAt, q.getLong("lastAttemptAt"))
        }
        val request = server.takeRequest(); assertEquals("GET", request.method)
        assertEquals("/api/mobile/v1/user/profile", request.path); assertNoExtraRequest()
    }

    @Test fun backupFailureRollsBackDatabase() = runBlocking {
        val entries = seed()
        assertTrue(backupDir.createNewFile()) // prevents creating backup directory
        server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody("""{"user":{"id":"user1","name":"Web"}}"""))
        try { recover(); fail("Expected backup failure") } catch (_: IllegalStateException) { }
        assertEquals(original, db.profileDao().get())
        assertEquals(entries.take(2), db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE))
        assertEquals(entries.drop(2), db.syncQueueDao().allForType(SyncManager.TYPE_ACTIVITY_CREATE))
        assertEquals("GET", server.takeRequest().method); assertNoExtraRequest()
    }

    @Test fun signedOutDoesNotContactServerOrTouchDatabase() = runBlocking {
        val entries = seed()
        try { recover(loggedIn = false); fail("Expected signed-out rejection") } catch (_: IllegalStateException) { }
        assertEquals(original, db.profileDao().get())
        assertEquals(entries.take(2), db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE))
        assertEquals(entries.drop(2), db.syncQueueDao().allForType(SyncManager.TYPE_ACTIVITY_CREATE))
        assertFalse(backupDir.exists()); assertNoExtraRequest()
    }
    @Test fun newerLocalEditDuringDownloadIsPreserved() = runBlocking {
        seed()
        server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody("""{"user":{"id":"user1","name":"Web"}}""").setBodyDelay(400, TimeUnit.MILLISECONDS))
        val attempt = async(Dispatchers.IO) { runCatching { recover() } }
        assertNotNull(server.takeRequest(5, TimeUnit.SECONDS))
        val newer = original.copy(name = "Edited during download")
        db.profileDao().upsert(newer)
        assertTrue(attempt.await().isFailure)
        assertEquals(newer, db.profileDao().get())
        assertEquals(2, db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE).size)
        assertFalse(backupDir.exists())
    }

    @Test fun analyticsDoesNotFetchMissingStreams() = runBlocking {
        seed()
        db.activityDao().upsert(com.runflow2.app.data.db.ActivityEntity(
            id = "missing-stream", name = "Synced run", type = "RUN", startDate = 0,
            distanceMeters = 1000.0, movingTimeSec = 300, averageHr = null, maxHr = null,
            averageCadence = null, totalElevation = 0.0, calories = null, trimp = 0.0,
            trainingType = null, estimatedVdot = null, routeJson = null, lapsJson = null,
            serverId = "server-run",
        ))
        repeat(3) { repo.analytics() }
        assertNoExtraRequest()
    }

    @Test fun rateLimitedFirstLoginRecoversWithoutCreatingGenericProfileUpload() = runBlocking {
        var limited = true
        val requests = java.util.Collections.synchronizedList(mutableListOf<okhttp3.mockwebserver.RecordedRequest>())
        server.dispatcher = object : okhttp3.mockwebserver.Dispatcher() {
            override fun dispatch(request: okhttp3.mockwebserver.RecordedRequest): MockResponse {
                requests.add(request)
                if (request.path == "/api/mobile/v1/user/profile" && limited)
                    return MockResponse().setResponseCode(429).addHeader("Retry-After", "60")
                val body = when {
                    request.path == "/api/mobile/v1/user/profile" -> """{"user":{"id":"user1","name":"Web athlete","weight":62.5,"hrMax":185,"hrZone1Max":120,"hrZone2Max":135,"hrZone3Max":150,"hrZone4Max":165,"hrZone5Max":175,"hrZone6Max":185,"thresholdHeartRate":168,"thresholdPace":290}}"""
                    request.path == "/api/plans" -> """{"goals":[{"id":"web-goal","name":"Web plan","raceDate":"2027-05-01"}]}"""
                    request.path?.startsWith("/api/mobile/v1/activities?") == true -> """{"activities":[{"id":"activity1","name":"Account run","type":"RUN","startDate":"2026-11-05T08:00:00Z","maxHr":180}],"hasMore":false}"""
                    request.path?.startsWith("/api/mobile/v1/readiness/history?") == true -> "[]"
                    else -> "{}"
                }
                return MockResponse().setHeader("Content-Type", "application/json").setBody(body)
            }
        }
        manager.syncNow("first login 429")
        assertNull(db.profileDao().get())
        assertEquals(1, db.activityDao().all().size)
        assertTrue(db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE).isEmpty())
        assertFalse(requests.any { it.path == "/api/plans" }) // shared general bucket is deferred
        assertFalse(requests.any { it.path?.contains("/activities/") == true })
        limited = false
        settings.setGeneralReadCooldownUntil(0); settings.setUploadCooldownUntil(0)
        manager.syncNow("after retry window")
        val profile = db.profileDao().get()!!
        assertEquals("Web athlete", profile.name); assertEquals(62.5, profile.weightKg, 0.001)
        assertEquals(135, profile.hrZone2Max); assertEquals(168, profile.thresholdHr)
        assertEquals(290, profile.thresholdPaceSecPerKm)
        assertEquals("Web plan", db.goalDao().byId("web-goal")?.name)
        assertFalse(profile.dirty)
        assertFalse(requests.any { it.method == "PUT" && it.path == "/api/mobile/v1/user/profile" })
        assertTrue(db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE).isEmpty())
    }

    @Test fun legacyGenericProfileCannotUploadBeforeExplicitRecovery() = runBlocking {
        db.profileDao().upsert(ProfileEntity(dirty = true))
        val item = SyncQueueEntity(entityType = SyncManager.TYPE_PROFILE_UPDATE, localId = "1", payloadJson = """{"name":"RunFlow Athlete","weight":72.0}""")
        val id = db.syncQueueDao().insert(item)
        manager.pushPendingNow("upgrade")
        assertEquals(item.copy(id = id), db.syncQueueDao().allForType(SyncManager.TYPE_PROFILE_UPDATE).single())
        assertTrue(manager.status.value.lastMessage.orEmpty().contains("queued"))
        assertNoExtraRequest()
    }

}
