package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.DashboardCacheDao
import com.runflow.app.data.local.entity.DashboardCacheEntity
import com.runflow.app.data.model.*
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.remote.safeApiCall
import com.runflow.app.data.remote.RunFlowApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val dashboardCacheDao: DashboardCacheDao,
    private val cacheManager: CacheManager
) {
    private val json = Json { 
        ignoreUnknownKeys = true 
        encodeDefaults = true
    }

    /**
     * Get dashboard with cache-first pattern.
     * Emits cached data first (if available), then fetches fresh data.
     */
    fun getDashboardFlow(forceRefresh: Boolean = false): Flow<ApiResult<DashboardResponse>> = flow {
        // First, emit cached data if available
        val cached = getCachedDashboard()
        if (cached != null && !forceRefresh) {
            emit(ApiResult.Success(cached))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.DASHBOARD, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall { apiService.getDashboard() }) {
                is ApiResult.Success -> {
                    cacheDashboard(result.data)
                    emit(result)
                }
                is ApiResult.Error -> {
                    // If we have cached data and network failed, don't emit error
                    if (cached == null) {
                        emit(result)
                    }
                }
                is ApiResult.Loading -> { /* Already emitted */ }
            }
        } else if (cached == null) {
            // No cache and can't fetch (offline)
            emit(ApiResult.Error("No cached data available and device is offline"))
        }
    }

    /**
     * Legacy method for compatibility - still works but doesn't use cache.
     */
    suspend fun getDashboard(): ApiResult<DashboardResponse> {
        return safeApiCall { apiService.getDashboard() }
    }

    suspend fun syncData(): ApiResult<QuickSyncResponse> {
        return safeApiCall { apiService.triggerSync() }
    }

    suspend fun getSyncStatus(): ApiResult<SyncStatus> {
        return safeApiCall { apiService.getSyncStatus() }
    }

    /**
     * Force refresh all data from server - used by refresh button.
     */
    suspend fun refreshAllData(): ApiResult<DashboardResponse> {
        cacheManager.invalidateAllCaches()
        val result = safeApiCall { apiService.getDashboard() }
        if (result is ApiResult.Success) {
            cacheDashboard(result.data)
        }
        return result
    }

    private suspend fun getCachedDashboard(): DashboardResponse? {
        val cached = dashboardCacheDao.getDashboardCacheSync() ?: return null
        return try {
            DashboardResponse(
                stats = json.decodeFromString(cached.statsJson),
                recentActivities = json.decodeFromString(cached.recentActivitiesJson),
                goals = json.decodeFromString(cached.goalsJson),
                syncStatus = json.decodeFromString(cached.syncStatusJson),
                user = json.decodeFromString(cached.userJson)
            )
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun cacheDashboard(data: DashboardResponse) {
        try {
            val cacheEntity = DashboardCacheEntity(
                id = "dashboard",
                statsJson = json.encodeToString(data.stats),
                recentActivitiesJson = json.encodeToString(data.recentActivities),
                goalsJson = json.encodeToString(data.goals),
                syncStatusJson = json.encodeToString(data.syncStatus),
                userJson = json.encodeToString(data.user),
                cachedAt = System.currentTimeMillis()
            )
            dashboardCacheDao.insert(cacheEntity)
            cacheManager.markCacheUpdated(CacheType.DASHBOARD)
        } catch (e: Exception) {
            // Cache error is non-fatal, log and continue
        }
    }
}
