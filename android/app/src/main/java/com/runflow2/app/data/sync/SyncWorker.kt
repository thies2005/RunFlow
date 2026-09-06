package com.runflow2.app.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.runflow2.app.RunFlowApp
import java.util.concurrent.TimeUnit

/** Periodic background reconciliation: outbox push + server pull every 30 min. */
class SyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val container = (applicationContext as RunFlowApp).container
        val result = container.syncManager.syncNow("worker")
        return when {
            result.skipped -> Result.success() // not logged in / offline — nothing to do
            result.failed > 0 -> Result.retry()
            else -> Result.success()
        }
    }

    companion object {
        private const val UNIQUE_NAME = "runflow_periodic_sync"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(30, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        /** Immediate one-shot sync (e.g. right after saving a run). */
        fun syncNow(context: Context) {
            val request = androidx.work.OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "${UNIQUE_NAME}_now",
                androidx.work.ExistingWorkPolicy.REPLACE,
                request,
            )
        }
    }
}
