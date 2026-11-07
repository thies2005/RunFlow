package com.runflow2.app.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.runflow2.app.RunFlowApp
import com.runflow2.app.data.health.HealthConnectManager
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException

/** Local-only import; WorkManager must not impose a network constraint. */
class LocalHealthImportWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val health = (applicationContext as RunFlowApp).container.healthConnect
        return try {
            if (!health.canReadInBackground()) return Result.success()
            when (health.importIfEnabled()) {
                is HealthConnectManager.ImportResult.Failed -> Result.retry()
                else -> Result.success()
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<LocalHealthImportWorker>(30, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "runflow_local_health_import", ExistingPeriodicWorkPolicy.KEEP, request,
            )
        }
    }
}
