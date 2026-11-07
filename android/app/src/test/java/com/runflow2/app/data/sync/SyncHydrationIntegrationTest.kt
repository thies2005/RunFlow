package com.runflow2.app.data.sync

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import android.content.Context
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.ProfileEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.net.AuthResponse
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.net.UserDto
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.flow.first
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.Collections

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [30])
class SyncHydrationIntegrationTest {
    @Test fun `authenticated sync hydrates profile and web plan while 429 preserves backlog and cooldown`() = runBlocking {
        val ctx = ApplicationProvider.getApplicationContext<Context>()
        val server = MockWebServer()
        val requests = Collections.synchronizedList(mutableListOf<RecordedRequest>())
        var malformedActivities = true
        var uploadStatus = 429
        var profileLimited = false
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                if (request.path?.substringBefore('?') == "/api/mobile/v1/activities/changes") return MockResponse().setResponseCode(404)
                requests.add(request)
                val response = when {
                    request.path == "/api/mobile/v1/user/profile" && profileLimited -> return MockResponse().setResponseCode(429).addHeader("Retry-After", "180").setBody("""{"error":"Too many requests. Please try again later.","code":"RATE_LIMITED","details":{"retryAfter":120}}""")
                    request.path == "/api/mobile/v1/user/profile" -> """{"user":{"id":"user1","name":"Thies Schuelken","weight":68.5,"hrMax":185}}"""
                    request.path == "/api/plans" -> """{"goals":[{"id":"goal1","name":"Web plan","raceDate":"2027-05-01","isActive":true,"workouts":[{"id":"deleted-workout","scheduledDate":"2027-01-01"},{"id":"kept-workout","scheduledDate":"2027-01-02"}]},{"id":"deleted-goal","raceDate":"2027-05-01"}]}"""
                    request.path?.startsWith("/api/mobile/v1/activities?") == true -> when {
                        !malformedActivities -> """{"activities":[{"id":"deleted-activity"}],"total":1}"""
                        request.path?.contains("offset=0") == true -> """{"activities":[{"id":"partial-page"}],"hasMore":true}"""
                        else -> "not-json"
                    }
                    request.path?.startsWith("/api/mobile/v1/readiness/history?") == true -> "[]"
                    request.path == "/api/mobile/v1/activities" && request.method == "POST" -> return MockResponse().setResponseCode(uploadStatus).setBody("""{"error":"Too many requests. Please try again later.","code":"RATE_LIMITED","details":{"retryAfter":120}}""")
                    else -> "{}"
                }
                return MockResponse().setHeader("Content-Type", "application/json").setBody(response)
            }
        }
        server.start()
        val settings = SettingsRepository(ctx)
        settings.setServerUrl(server.url("/").toString())
        settings.setConnectionEnabled(true)
        settings.setUploadActivitiesEnabled(true)
        settings.setUploadExistingActivitiesEnabled(true)
        settings.setUploadPlansEnabled(true)
        settings.setUploadExistingPlansEnabled(true)
        settings.setHealthMetricsSyncEnabled(true)
        settings.setUploadExistingHealthEnabled(true)
        settings.setDemoCleaned()
        settings.setBodyAutoRefreshDay(java.time.LocalDate.now().toEpochDay())
        settings.setLastStravaTrigger(System.currentTimeMillis())
        val auth = AuthStore(ctx)
        auth.state.first { it.initialized }
        auth.saveSession(AuthResponse("test-token", "test-refresh", user = UserDto("user1", name = "Thies Schuelken")))
        val fixtureName = "sync-hydration-fixture.db"
        ctx.deleteDatabase(fixtureName)
        val db = Room.databaseBuilder(ctx, AppDatabase::class.java, fixtureName).build()
        var succeeded = false
        try {
            db.profileDao().upsert(ProfileEntity())
            db.activityDao().upsert(ActivityEntity(id = "existing", name = "Existing", type = "RUN", startDate = 0,
                distanceMeters = 1000.0, movingTimeSec = 300, averageHr = null, maxHr = null, averageCadence = null,
                totalElevation = 0.0, calories = null, trimp = 0.0, trainingType = null, estimatedVdot = null,
                routeJson = null, lapsJson = null, serverId = "existing-server"))
            val payload = """{"name":"Run","type":"RUN","startDate":"2026-11-01T12:00:00Z","distance":1000.0,"movingTime":300,"elapsedTime":300}"""
            repeat(300) { db.syncQueueDao().insert(SyncQueueEntity(entityType = SyncManager.TYPE_ACTIVITY_CREATE, localId = "local$it", payloadJson = payload)) }
            db.syncQueueDao().insert(SyncQueueEntity(entityType = SyncManager.TYPE_GOAL_DELETE, localId = "deleted-goal", payloadJson = "{}"))
            db.syncQueueDao().insert(SyncQueueEntity(entityType = SyncManager.TYPE_WORKOUT_DELETE, localId = "deleted-workout", payloadJson = "{\"goalId\":\"goal1\"}"))
            db.syncQueueDao().insert(SyncQueueEntity(entityType = SyncManager.TYPE_ACTIVITY_DELETE, localId = "local-deleted", payloadJson = "{\"activityId\":\"deleted-activity\"}"))
            val client = NetworkClient(auth, settings = settings)
            val repo = RunFlowRepository(db, db.activityDao(), db.goalDao(), db.workoutDao(), db.profileDao(), db.syncQueueDao(), db.planSnapshotDao(), db.dailyEntryDao(), auth, client, settings)
            val manager = SyncManager(db, client, auth, settings, repo)
            manager.syncNow("integration")
            assertNotNull(db.activityDao().byId("existing")) // failed second page must not prune
            assertEquals("Thies Schuelken", db.profileDao().get()?.name)
            assertEquals("Web plan", db.goalDao().byId("goal1")?.name)
            assertEquals(68.5, db.profileDao().get()!!.weightKg, 0.001)
            assertEquals(185, db.profileDao().get()!!.hrMax)
            assertEquals(303, db.syncQueueDao().pendingCount())
            assertEquals(0, db.syncQueueDao().failedCount())
            assertTrue(db.syncQueueDao().nextBatch(400).all { it.retryCount == 0 && it.lastAttemptAt == null })
            assertTrue(settings.settingsOnce().uploadCooldownUntil >= System.currentTimeMillis() + 110_000)
            assertNull(db.goalDao().byId("deleted-goal"))
            assertNull(db.workoutDao().byId("deleted-workout"))
            assertNotNull(db.workoutDao().byId("kept-workout"))
            malformedActivities = false
            manager.syncNow("second sync during cooldown")
            assertNull(db.activityDao().byServerId("deleted-activity"))
            val restartedManager = SyncManager(db, client, auth, settings, repo)
            restartedManager.pushPendingNow("manual retry")
            assertEquals(1, requests.count { it.path == "/api/mobile/v1/activities" && it.method == "POST" })
            assertTrue(requests.filter { it.path == "/api/plans" || it.path == "/api/mobile/v1/user/profile" }.all { it.getHeader("Authorization") == "Bearer test-token" })
            settings.setUploadCooldownUntil(0)
            uploadStatus = 503
            restartedManager.pushPendingNow("later retry")
            val queue = db.syncQueueDao().nextBatch(400)
            assertEquals(100, queue.count { it.retryCount == 1 })
            assertEquals(203, queue.count { it.retryCount == 0 })
            assertEquals(101, requests.count { it.path == "/api/mobile/v1/activities" && it.method == "POST" })
            settings.setUploadCooldownUntil(0)
            profileLimited = true
            val countBeforeReadLimit = requests.count { it.path == "/api/mobile/v1/activities" && it.method == "POST" }
            restartedManager.syncNow("profile read rate limit")
            assertTrue(settings.settingsOnce().uploadCooldownUntil >= System.currentTimeMillis() + 170_000)
            assertEquals(countBeforeReadLimit, requests.count { it.path == "/api/mobile/v1/activities" && it.method == "POST" })
            val firstPost = requests.indexOfFirst { it.method == "POST" && it.path == "/api/mobile/v1/activities" }
            assertTrue(requests.indexOfFirst { it.path == "/api/plans" } < firstPost)
            assertTrue(requests.indexOfFirst { it.path == "/api/mobile/v1/user/profile" } < firstPost)
            assertTrue(requests.indexOfFirst { it.path?.startsWith("/api/mobile/v1/activities?") == true } < firstPost)
            succeeded = true
        } finally {
            db.close()
            if (succeeded) System.getenv("RUNFLOW_SYNC_FIXTURE_DIR")?.let { directory ->
                val target = java.io.File(directory).also { it.mkdirs() }
                ctx.getDatabasePath(fixtureName).copyTo(java.io.File(target, fixtureName), overwrite = true)
            }
            server.shutdown()
        }
    }
}
