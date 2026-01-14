package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.ActivityDao
import com.runflow.app.data.local.entity.ActivityEntity
import com.runflow.app.data.model.*
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.remote.safeApiCall
import com.runflow.app.data.remote.RunFlowApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ActivitiesRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val activityDao: ActivityDao,
    private val cacheManager: CacheManager
) {
    /**
     * Get activities with cache-first pattern.
     * Returns Flow that emits cached data first, then fresh data.
     */
    fun getActivitiesFlow(
        limit: Int = 20,
        offset: Int = 0,
        type: String? = null,
        raceEligible: Boolean? = null,
        forceRefresh: Boolean = false
    ): Flow<ApiResult<ActivitiesResponse>> = flow {
        // First, emit cached data if available
        val cachedActivities = getCachedActivities()
        if (cachedActivities.isNotEmpty() && !forceRefresh) {
            emit(ApiResult.Success(ActivitiesResponse(
                activities = cachedActivities,
                total = cachedActivities.size,
                limit = limit,
                offset = offset,
                hasMore = false
            )))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.ACTIVITIES, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall {
                apiService.getActivities(limit, offset, type, raceEligible)
            }) {
                is ApiResult.Success -> {
                    cacheActivities(result.data.activities)
                    emit(result)
                }
                is ApiResult.Error -> {
                    if (cachedActivities.isEmpty()) {
                        emit(result)
                    }
                }
                is ApiResult.Loading -> { /* Already emitted */ }
            }
        } else if (cachedActivities.isEmpty()) {
            emit(ApiResult.Error("No cached data available and device is offline"))
        }
    }

    /**
     * Legacy method for compatibility.
     */
    suspend fun getActivities(
        limit: Int = 20,
        offset: Int = 0,
        type: String? = null,
        raceEligible: Boolean? = null
    ): ApiResult<ActivitiesResponse> {
        return safeApiCall {
            apiService.getActivities(
                limit = limit,
                offset = offset,
                type = type,
                raceEligible = raceEligible
            )
        }
    }

    suspend fun getActivity(id: String): ApiResult<Activity> {
        return when (val result = safeApiCall { apiService.getActivity(id) }) {
            is ApiResult.Success -> ApiResult.Success(result.data.activity)
            is ApiResult.Error -> result
            is ApiResult.Loading -> result
        }
    }

    suspend fun createActivity(request: ManualActivityRequest): ApiResult<Activity> {
        return safeApiCall { apiService.createActivity(request) }
    }

    /**
     * Refresh activities from server.
     */
    suspend fun refreshActivities(): ApiResult<ActivitiesResponse> {
        cacheManager.invalidateCache(CacheType.ACTIVITIES)
        val result = safeApiCall { apiService.getActivities(limit = 50, offset = 0) }
        if (result is ApiResult.Success) {
            cacheActivities(result.data.activities)
        }
        return result
    }

    private suspend fun getCachedActivities(): List<Activity> {
        return try {
            activityDao.getAllActivities()
                .first()
                .map { it.toActivity() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun cacheActivities(activities: List<Activity>) {
        try {
            val entities = activities.map { it.toEntity() }
            activityDao.clearAll()
            activityDao.insertAll(entities)
            cacheManager.markCacheUpdated(CacheType.ACTIVITIES)
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private fun ActivityEntity.toActivity(): Activity {
        return Activity(
            id = id,
            stravaId = stravaId.toString(),
            type = ActivityType.fromValue(type),
            name = name,
            startDate = startDate,
            distance = distance,
            movingTime = movingTime,
            averageHr = averageHr,
            estimatedVdot = vdot
        )
    }

    private fun Activity.toEntity(): ActivityEntity {
        return ActivityEntity(
            id = id,
            stravaId = stravaId?.toLongOrNull() ?: 0L,
            name = name,
            type = type.name,
            startDate = startDate,
            distance = distance,
            movingTime = movingTime,
            averageHr = averageHr,
            vdot = estimatedVdot
        )
    }
}
