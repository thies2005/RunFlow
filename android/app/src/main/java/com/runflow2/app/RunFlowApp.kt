package com.runflow2.app

import android.app.Application
import androidx.room.Room
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
        .addMigrations(AppDatabase.MIGRATION_1_2)
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
        authStore = authStore,
    )

    val syncManager = SyncManager(
        db = database,
        client = network,
        authStore = authStore,
        settings = settings,
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
        // Hot-swap the API base URL when the server setting changes.
        appScope.launch {
            settings.settings.collect { s ->
                val url = s.serverUrl.ifEmpty { Api.DEFAULT_BASE_URL }
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
        container = AppContainer(this)
        container.seedIfFirstLaunch()
        container.startSyncLoop()
    }
}
