package com.runflow2.app

import android.app.Application
import androidx.room.Room
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.AuthStore
import com.runflow2.app.data.net.NetworkClient
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import com.runflow2.app.data.seed.DemoSeeder
import com.runflow2.app.data.sync.SyncManager
import com.runflow2.app.data.sync.SyncWorker
import com.runflow2.app.recording.RecordingController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class AppContainer(app: Application) {
    /** Application context — safe to hold for the process lifetime. */
    val appContext: Application = app

    val database: AppDatabase = Room.databaseBuilder(app, AppDatabase::class.java, "runflow.db")
        .addMigrations(
            AppDatabase.MIGRATION_1_2, AppDatabase.MIGRATION_2_3, AppDatabase.MIGRATION_3_4,
            AppDatabase.MIGRATION_4_5, AppDatabase.MIGRATION_5_6, AppDatabase.MIGRATION_6_7,
            AppDatabase.MIGRATION_7_8, AppDatabase.MIGRATION_8_9,
        )
        .build()

    val settings = SettingsRepository(app)
    val authStore = AuthStore(app)
    val network = NetworkClient(authStore)

    val repository = RunFlowRepository(
        db = database,
        activityDao = database.activityDao(),
        goalDao = database.goalDao(),
        workoutDao = database.workoutDao(),
        profileDao = database.profileDao(),
        syncQueueDao = database.syncQueueDao(),
        planSnapshotDao = database.planSnapshotDao(),
        authStore = authStore,
        network = network,
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

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        // Hot-swap the API base URL when the server setting changes. Values
        // are normalized to origin-only so a stored URL that still contains a
        // path (e.g. /api/mobile/v1) can never leak into the OAuth redirect.
        appScope.launch {
            settings.settings.collect { s ->
                val url = Api.normalizeServerUrl(s.serverUrl)
                if (network.baseUrl != url) {
                    network.baseUrl = url
                    network.reset()
                }
            }
        }
    }

    fun seedIfFirstLaunch() {
        appScope.launch {
            val s = settings.settings.first()
            if (!s.seeded) {
                DemoSeeder(database.profileDao(), database.workoutDao())
                    .seed(
                        insertActivity = { database.activityDao().upsert(it.copy(isDemo = true)) },
                        insertGoal = { database.goalDao().upsert(it.copy(isDemo = true)) },
                    )
                settings.setSeeded()
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
        container.seedIfFirstLaunch()
        container.startSyncLoop()
    }
}
