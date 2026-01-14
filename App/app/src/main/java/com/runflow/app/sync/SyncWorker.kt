package com.runflow.app.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.runflow.app.data.repository.DashboardRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val dashboardRepository: DashboardRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            when (val result = dashboardRepository.syncData()) {
                is com.runflow.app.data.remote.ApiResult.Success -> Result.success()
                is com.runflow.app.data.remote.ApiResult.Error -> {
                    // Retry on network errors
                    if (runAttemptCount < 3) {
                        Result.retry()
                    } else {
                        Result.failure()
                    }
                }
                is com.runflow.app.data.remote.ApiResult.Loading -> Result.success()
            }
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }

    companion object {
        const val WORK_NAME = "runflow_sync_worker"
    }
}
