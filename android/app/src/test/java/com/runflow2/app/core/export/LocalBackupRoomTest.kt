package com.runflow2.app.core.export

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import android.content.Context
import com.runflow2.app.data.db.*
import com.runflow2.app.data.sync.toSnapshotJson
import com.runflow2.app.data.sync.parseSnapshotJson
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = android.app.Application::class, sdk = [35])
class LocalBackupRoomTest {
    private lateinit var db: AppDatabase
    @Before fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext<Context>(), AppDatabase::class.java).allowMainThreadQueries().build()
    }
    @After fun tearDown() = db.close()

    @Test fun `roundtrip preserves local data and clears remote state`() = runTest {
        val activity = ActivityEntity(id = "a", name = "Run", type = "RUN", startDate = 123,
            distanceMeters = 5000.0, movingTimeSec = 1500, averageHr = null, maxHr = null,
            averageCadence = null, totalElevation = 0.0, calories = null, trimp = 0.0,
            trainingType = null, estimatedVdot = null, routeJson = null, lapsJson = null,
            serverId = "remote", dirty = true)
        db.activityDao().upsertAll(listOf(activity))
        val workout = WorkoutEntity(id = "w", goalId = "g", scheduledDate = 123,
            workoutType = "EASY", phase = "BASE", description = "", targetDistanceKm = null,
            targetPaceSecPerKm = null, targetDurationSec = null, activityId = "remote",
            suggestedActivityId = "a", dismissedActivityId = "remote")
        db.workoutDao().upsertAll(listOf(workout))
        db.planSnapshotDao().insertSnapshot(PlanSnapshotEntity(goalId = "g", createdAtEpochMs = 123,
            workoutsJson = listOf(workout).toSnapshotJson()))
        db.syncQueueDao().insert(SyncQueueEntity(entityType = "activity_update", localId = "a", payloadJson = "{}"))
        db.chatDao().upsert(ChatMessageEntity("m", "s", "user", "Hello", 123, "a"))
        val manager = LocalBackupManager(db)
        val backup = manager.exportToString()
        db.activityDao().clear()
        val prepared = manager.prepareImport(backup)
        manager.applyPrepared(prepared)
        val restored = db.activityDao().all().single()
        assertEquals("a", restored.id)
        assertEquals(5000.0, restored.distanceMeters, 0.0)
        assertNull(restored.serverId)
        assertFalse(restored.dirty)
        assertEquals(0, db.syncQueueDao().pendingCount())
        assertEquals("m", db.chatDao().newestForActivity("a")?.id)
        val restoredWorkout = db.workoutDao().forGoal("g").single()
        assertEquals("a", restoredWorkout.activityId)
        assertEquals("a", restoredWorkout.suggestedActivityId)
        assertEquals("a", restoredWorkout.dismissedActivityId)
        val snapshot = db.planSnapshotDao().latestForGoal("g", 1).single()
        val restoredSnapshotWorkout = parseSnapshotJson(snapshot.workoutsJson)!!.single()
        assertEquals("a", restoredSnapshotWorkout.activityId)
        assertEquals("a", restoredSnapshotWorkout.suggestedActivityId)
        assertEquals("a", restoredSnapshotWorkout.dismissedActivityId)
    }


    @Test fun `unresolved activity links reject backup without changing existing data`() = runTest {
        val workout = WorkoutEntity(id = "w", goalId = "g", scheduledDate = 123,
            workoutType = "EASY", phase = "BASE", description = "", targetDistanceKm = null,
            targetPaceSecPerKm = null, targetDurationSec = null, activityId = "missing")
        db.workoutDao().upsertAll(listOf(workout))
        db.syncQueueDao().insert(SyncQueueEntity(entityType = "activity_update", localId = "a", payloadJson = "{}"))
        val manager = LocalBackupManager(db)
        val backup = manager.exportToString()
        assertTrue(runCatching { manager.prepareImport(backup) }.isFailure)
        assertEquals("missing", db.workoutDao().forGoal("g").single().activityId)
        assertEquals(1, db.syncQueueDao().pendingCount())
    }

    @Test fun `unsupported or incomplete backups leave data untouched`() = runTest {
        db.syncQueueDao().insert(SyncQueueEntity(entityType = "activity_update", localId = "a", payloadJson = "{}"))
        val manager = LocalBackupManager(db)
        for (content in listOf("""{"format":"runflow-backup","version":99}""", """{"format":"runflow-backup","version":1}""")) {
            assertTrue(runCatching { manager.prepareImport(content) }.isFailure)
            assertEquals(1, db.syncQueueDao().pendingCount())
        }
    }
}
