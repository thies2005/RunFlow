package com.runflow2.app

import android.app.Application
import androidx.room.Room
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import com.runflow2.app.data.sync.SyncManager
import com.runflow2.app.data.sync.SyncWorker
import com.runflow2.app.recording.RecordingController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class AppContainer(app: Application) {
    /** Application context — safe to hold for the process lifetime. */
    val appContext: Application = app

    val database: AppDatabase = Room.databaseBuilder(app, AppDatabase::class.java, "runflow.db")
        .addMigrations(
            AppDatabase.MIGRATION_1_2, AppDatabase.MIGRATION_2_3, AppDatabase.MIGRATION_3_4,
            AppDatabase.MIGRATION_4_5, AppDatabase.MIGRATION_5_6, AppDatabase.MIGRATION_6_7,
            AppDatabase.MIGRATION_7_8, AppDatabase.MIGRATION_8_9, AppDatabase.MIGRATION_9_10,
            AppDatabase.MIGRATION_10_11, AppDatabase.MIGRATION_11_12,
            AppDatabase.MIGRATION_12_13, AppDatabase.MIGRATION_13_14,
            AppDatabase.MIGRATION_14_15, AppDatabase.MIGRATION_15_16, AppDatabase.MIGRATION_16_17, AppDatabase.MIGRATION_17_18,
        )
        .build()

    val settings = SettingsRepository(app)
    val authStore = AuthStore(app)
    val network = NetworkClient(authStore, settings = settings)

    val repository = RunFlowRepository(
        db = database,
        activityDao = database.activityDao(),
        goalDao = database.goalDao(),
        workoutDao = database.workoutDao(),
        profileDao = database.profileDao(),
        syncQueueDao = database.syncQueueDao(),
        planSnapshotDao = database.planSnapshotDao(),
        dailyEntryDao = database.dailyEntryDao(),
        authStore = authStore,
        network = network,
        settings = settings,
    )

    val healthConnect = com.runflow2.app.data.health.HealthConnectManager(
        appContext = app,
        repository = repository,
        settings = settings,
    )

    val syncManager = SyncManager(
        db = database,
        client = network,
        authStore = authStore,
        settings = settings,
        repository = repository,
        healthConnect = healthConnect,
    )

    val aiCoach = com.runflow2.app.data.ai.AiCoachRepository(
        db = database,
        client = network,
        authStore = authStore,
        settings = settings,
    )

    val recording = RecordingController()

    /**
     * One-shot deep-link target for the analytics tab ("recovery" | "form"),
     * set by dashboard cards right before navigating and consumed on entry.
     * Same pattern as [RecordingController.pendingWorkoutId].
     */
    @Volatile
    var analyticsTargetSection: String? = null

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        // Leave the engine marker unchanged on failure so the next startup retries.
        appScope.launch {
            try {
                if (settings.readinessScoreEngine() < 2) {
                    repository.recomputeAllReadinessScores()
                    settings.setReadinessScoreEngine(2)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                AppLog.e("App", "Readiness recomputation failed; will retry on startup", e)
            }
        }
    }

    /** Called from the Application: periodic worker + opportunistic startup sync. */
    fun startSyncLoop() {
        SyncWorker.schedule(appContext)
        appScope.launch { syncManager.syncNow("startup") }
    }
}

class RunFlowApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        AppLog.i("App", "RunFlow starting (process pid ${android.os.Process.myPid()})")
        container = AppContainer(this)
        container.startSyncLoop()
    }
}
