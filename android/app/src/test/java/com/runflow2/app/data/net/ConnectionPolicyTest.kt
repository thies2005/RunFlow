package com.runflow2.app.data.net

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.first
import com.runflow2.app.data.repo.mayUploadHealthDate
import kotlinx.coroutines.runBlocking
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.IOException
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [30])
class ConnectionPolicyTest {
    private lateinit var server: MockWebServer
    private lateinit var settings: SettingsRepository
    private lateinit var client: NetworkClient

    @Before fun setup() = runBlocking {
        server = MockWebServer().apply { start() }
        settings = SettingsRepository(ApplicationProvider.getApplicationContext<Context>())
        settings.setServerUrl(server.url("/").toString())
        settings.setUploadActivitiesEnabled(false)
        settings.setUploadPlansEnabled(false)
        settings.setHealthMetricsSyncEnabled(false)
        client = NetworkClient(null, settings = settings)
        client.awaitReady()
        client.awaitOrigin(settings.settings.map { it.serverUrl })
    }

    @After fun teardown() { client.invalidateConnection(); server.shutdown() }

    private fun request(path: String, method: String = "GET") = Request.Builder()
        .url(server.url(path)).method(method, if (method == "GET") null else "{}".toRequestBody()).build()

    @Test fun disabledOrUnconfiguredNeverReachesServer() = runBlocking {
        try { client.okHttp.newCall(request("/api/plans")).execute(); fail("expected disabled") } catch (_: IOException) {}
        assertEquals(0, server.requestCount)
        settings.setServerUrl("")
        try { client.okHttp.newCall(request("/api/plans")).execute(); fail("expected unconfigured") } catch (_: IOException) {}
        assertEquals(0, server.requestCount)
    }

    @Test fun directWritesRequireMatchingConsentEvenWhenConnected() = runBlocking {
        settings.setConnectionEnabled(true)
        val paths = listOf("/api/mobile/v1/activities", "/api/plans/import", "/api/mobile/v1/user/profile", "/api/mobile/v1/readiness/daily")
        for (path in paths) {
            try { client.okHttp.newCall(request(path, "POST")).execute(); fail("expected consent gate for $path") } catch (_: IOException) {}
        }
        assertEquals(0, server.requestCount)
        settings.setUploadActivitiesEnabled(true)
        server.enqueue(MockResponse().setBody("ok"))
        client.okHttp.newCall(request(paths.first(), "POST")).execute().use { assertEquals(200, it.code) }
        assertEquals(1, server.requestCount)
        settings.setConnectionEnabled(false)
        settings.setUploadPlansEnabled(true)
        try { client.okHttp.newCall(request(paths[1], "POST")).execute(); fail("expected disabled") } catch (_: IOException) {}
        assertEquals(1, server.requestCount)
    }

    @Test fun invalidatingConnectionCancelsInFlightCallAndFenceRejectsStaleCommit() = runBlocking {
        settings.setConnectionEnabled(true)
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE))
        val generation = client.connectionGeneration()
        val result = async(Dispatchers.IO) { runCatching { client.okHttp.newCall(request("/api/plans")).execute() } }
        assertNotNull(server.takeRequest(5, TimeUnit.SECONDS))
        client.invalidateConnection()
        assertTrue(result.await().isFailure)
        try { client.withConnectionFence(generation) { fail("stale response committed") }; fail("expected invalidation") } catch (_: IOException) {}
    }

    @Test fun invalidOriginsNeverFallback() {
        assertEquals("", Api.normalizeServerUrl("  "))
        listOf("https://example.test/path", "https://example.test/?token=x", "https://user@example.test", "https://").forEach {
            assertThrows(IllegalArgumentException::class.java) { Api.normalizeServerUrl(it) }
        }
    }
    @Test fun redirectNeverContactsAnotherOrigin() = runBlocking {
        settings.setConnectionEnabled(true)
        MockWebServer().use { other ->
            other.start()
            server.enqueue(MockResponse().setResponseCode(302).addHeader("Location", other.url("/target")))
            client.okHttp.newCall(request("/api/plans")).execute().use { assertEquals(302, it.code) }
            assertNull(other.takeRequest(300, TimeUnit.MILLISECONDS))
        }
    }

    @Test fun existingPlansRequireSeparateHistoryConsent() = runBlocking {
        settings.setConnectionEnabled(true)
        settings.setUploadPlansEnabled(true)
        val consent = settings.settingsOnce().uploadPlansConsentSince
        val db = androidx.room.Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext<Context>(), com.runflow2.app.data.db.AppDatabase::class.java
        ).build()
        try {
            fun goal(id: String, created: Long) = com.runflow2.app.data.db.GoalEntity(
                id = id, name = id, raceType = "5K", raceDate = created, targetTimeSec = null,
                weeklyKmGoal = 20.0, planWeeks = 8, runsPerWeek = 3, strengthPerWeek = 0,
                longRunDay = 7, workoutDay = 3, restDays = "", taperWeeks = 1,
                vdotAtCreation = null, isActive = true, createdAt = created, isDemo = false,
            )
            db.goalDao().upsert(goal("old-restored", consent - 1))
            db.goalDao().upsert(goal("new", consent + 1))
            val policy = settings.settingsOnce()
            assertEquals(listOf("new"), db.goalDao().localOnlyGoals(50, policy.uploadExistingPlansEnabled, policy.uploadPlansConsentSince).map { it.id })
            val auth = AuthStore(ApplicationProvider.getApplicationContext<Context>())
            val repo = com.runflow2.app.data.repo.RunFlowRepository(db, db.activityDao(), db.goalDao(), db.workoutDao(), db.profileDao(), db.syncQueueDao(), db.planSnapshotDao(), db.dailyEntryDao(), auth, client, settings)
            assertEquals(com.runflow2.app.data.repo.UploadResult.Skipped, repo.uploadLocalPlan("old-restored"))
            assertEquals(0, server.requestCount)
            settings.setUploadExistingPlansEnabled(true)
            val withHistory = settings.settingsOnce()
            assertEquals(2, db.goalDao().localOnlyGoals(50, withHistory.uploadExistingPlansEnabled, withHistory.uploadPlansConsentSince).size)
            settings.beginRestore()
            assertFalse(settings.settingsOnce().uploadExistingPlansEnabled)
        } finally { db.close(); settings.finishRestore() }
    }

    @Test fun backfilledActivityAndPreviousHealthDatesRequireHistoryConsent() = runBlocking {
        settings.setConnectionEnabled(true)
        settings.setUploadActivitiesEnabled(true)
        settings.setHealthMetricsSyncEnabled(true)
        val current = settings.settingsOnce()
        val yesterday = java.time.LocalDate.now().minusDays(1).toString()
        assertFalse(current.mayUploadHealthDate(yesterday))
        val db = androidx.room.Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext<Context>(), com.runflow2.app.data.db.AppDatabase::class.java
        ).build()
        try {
            val auth = AuthStore(ApplicationProvider.getApplicationContext<Context>())
            auth.state.first { it.initialized }
            auth.saveSession(AuthResponse("test", "refresh", user = UserDto("account")))
            val repo = com.runflow2.app.data.repo.RunFlowRepository(db, db.activityDao(), db.goalDao(), db.workoutDao(), db.profileDao(), db.syncQueueDao(), db.planSnapshotDao(), db.dailyEntryDao(), auth, client, settings)
            val old = com.runflow2.app.data.db.ActivityEntity(id = "hc-backfill", name = "Old run", type = "RUN",
                startDate = current.uploadActivitiesConsentSince - 10000, distanceMeters = 5000.0, movingTimeSec = 1800,
                averageHr = null, maxHr = null, averageCadence = null, totalElevation = 0.0, calories = null,
                trimp = 0.0, trainingType = null, estimatedVdot = null, routeJson = null, lapsJson = null,
                isDemo = false, hcRecordId = "hc-1")
            repo.saveActivity(old)
            assertTrue(db.syncQueueDao().allForType(com.runflow2.app.data.sync.SyncManager.TYPE_ACTIVITY_CREATE).isEmpty())
            settings.setUploadExistingActivitiesEnabled(true)
            settings.setUploadExistingHealthEnabled(true)
            assertTrue(settings.settingsOnce().mayUploadHealthDate(yesterday))
            assertEquals(listOf("hc-backfill"), db.activityDao().pendingHistoryUploads(10).map { it.id })
        } finally { db.close() }
    }

    @Test fun deadLetteredActivityDoesNotStarveOtherHistory() = runBlocking {
        val db = androidx.room.Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext<Context>(), com.runflow2.app.data.db.AppDatabase::class.java
        ).build()
        try {
            fun activity(id: String, date: Long) = com.runflow2.app.data.db.ActivityEntity(
                id = id, name = id, type = "RUN", startDate = date, distanceMeters = 5000.0,
                movingTimeSec = 1800, averageHr = null, maxHr = null, averageCadence = null,
                totalElevation = 0.0, calories = null, trimp = 0.0, trainingType = null,
                estimatedVdot = null, routeJson = null, lapsJson = null, isDemo = false)
            db.activityDao().upsert(activity("rejected", 1L))
            db.activityDao().upsert(activity("eligible", 2L))
            db.syncQueueDao().insert(com.runflow2.app.data.db.SyncQueueEntity(
                entityType = "activity_create", localId = "rejected", payloadJson = "{}", dead = true))
            assertEquals(listOf("eligible"), db.activityDao().pendingHistoryUploads(1).map { it.id })
        } finally { db.close() }
    }

}
