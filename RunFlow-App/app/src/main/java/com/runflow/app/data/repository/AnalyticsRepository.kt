package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.AnalyticsStatsDao
import com.runflow.app.data.local.entity.AnalyticsStatsEntity
import com.runflow.app.data.model.AnalyticsHistoryResponse
import com.runflow.app.data.model.AnalyticsStats
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
class AnalyticsRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val analyticsStatsDao: AnalyticsStatsDao,
    private val cacheManager: CacheManager
) {
    private val json = Json { 
        ignoreUnknownKeys = true 
        encodeDefaults = true
    }

    /**
     * Get analytics stats with cache-first pattern.
     */
    fun getAnalyticsStatsFlow(forceRefresh: Boolean = false): Flow<ApiResult<AnalyticsStats>> = flow {
        // First, emit cached data if available
        val cached = getCachedStats()
        if (cached != null && !forceRefresh) {
            emit(ApiResult.Success(cached))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.ANALYTICS_STATS, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall { apiService.getAnalyticsStats() }) {
                is ApiResult.Success -> {
                    cacheStats(result.data)
                    emit(result)
                }
                is ApiResult.Error -> {
                    if (cached == null) {
                        emit(result)
                    }
                }
                is ApiResult.Loading -> { /* Already emitted */ }
            }
        } else if (cached == null) {
            emit(ApiResult.Error("No cached data available and device is offline"))
        }
    }

    /**
     * Legacy method for compatibility.
     */
    suspend fun getAnalyticsStats(): ApiResult<AnalyticsStats> {
        return safeApiCall { apiService.getAnalyticsStats() }
    }

    /**
     * Get analytics history - not cached due to variable date ranges.
     */
    suspend fun getAnalyticsHistory(
        startDate: String? = null,
        endDate: String? = null
    ): ApiResult<AnalyticsHistoryResponse> {
        return safeApiCall {
            apiService.getAnalyticsHistory(
                startDate = startDate,
                endDate = endDate
            )
        }
    }

    /**
     * Refresh analytics from server.
     */
    suspend fun refreshAnalytics(): ApiResult<AnalyticsStats> {
        cacheManager.invalidateCache(CacheType.ANALYTICS_STATS)
        val result = safeApiCall { apiService.getAnalyticsStats() }
        if (result is ApiResult.Success) {
            cacheStats(result.data)
        }
        return result
    }

    private suspend fun getCachedStats(): AnalyticsStats? {
        val cached = analyticsStatsDao.getAnalyticsStatsSync() ?: return null
        return try {
            json.decodeFromString(cached.statsJson)
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun cacheStats(stats: AnalyticsStats) {
        try {
            val entity = AnalyticsStatsEntity(
                statsJson = json.encodeToString(stats)
            )
            analyticsStatsDao.insert(entity)
            cacheManager.markCacheUpdated(CacheType.ANALYTICS_STATS)
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }
}
