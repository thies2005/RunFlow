package com.runflow2.app.core.export

import com.runflow2.app.data.db.AppDatabase
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream

@Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
class LocalBackupManagerTest {

    @Test
    fun `Summary totalCount sums all entities correctly`() {
        val summary = LocalBackupManager.Summary(
            profilesCount = 1,
            goalsCount = 2,
            workoutsCount = 14,
            activitiesCount = 5,
            dailyEntriesCount = 7,
            planSnapshotsCount = 3,
        )
        assertEquals(32, summary.totalCount)
    }

    @Test
    fun `importFrom rejects invalid format`() = runTest {
        // AppDatabase is not invoked if JSON is corrupt or has invalid format
        val fakeDb = object : AppDatabase() {
            override fun activityDao() = throw UnsupportedOperationException()
            override fun goalDao() = throw UnsupportedOperationException()
            override fun workoutDao() = throw UnsupportedOperationException()
            override fun profileDao() = throw UnsupportedOperationException()
            override fun syncQueueDao() = throw UnsupportedOperationException()
            override fun chatDao() = throw UnsupportedOperationException()
            override fun planSnapshotDao() = throw UnsupportedOperationException()
            override fun dailyEntryDao() = throw UnsupportedOperationException()
            override fun clearAllTables() = throw UnsupportedOperationException()
            override fun createInvalidationTracker() = throw UnsupportedOperationException()
            override fun createOpenHelper(config: androidx.room.DatabaseConfiguration) = throw UnsupportedOperationException()
        }

        val manager = LocalBackupManager(fakeDb)

        val invalidJson = """{"format":"other-format","version":1}"""
        val result = manager.importFrom(ByteArrayInputStream(invalidJson.toByteArray(Charsets.UTF_8)))
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `importFrom fails gracefully on corrupt json`() = runTest {
        val fakeDb = object : AppDatabase() {
            override fun activityDao() = throw UnsupportedOperationException()
            override fun goalDao() = throw UnsupportedOperationException()
            override fun workoutDao() = throw UnsupportedOperationException()
            override fun profileDao() = throw UnsupportedOperationException()
            override fun syncQueueDao() = throw UnsupportedOperationException()
            override fun chatDao() = throw UnsupportedOperationException()
            override fun planSnapshotDao() = throw UnsupportedOperationException()
            override fun dailyEntryDao() = throw UnsupportedOperationException()
            override fun clearAllTables() = throw UnsupportedOperationException()
            override fun createInvalidationTracker() = throw UnsupportedOperationException()
            override fun createOpenHelper(config: androidx.room.DatabaseConfiguration) = throw UnsupportedOperationException()
        }

        val manager = LocalBackupManager(fakeDb)
        val corrupt = ByteArrayInputStream("not json at all".toByteArray(Charsets.UTF_8))
        val result = manager.importFrom(corrupt)
        assertTrue(result.isFailure)
    }
}
