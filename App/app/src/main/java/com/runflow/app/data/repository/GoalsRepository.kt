package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.GoalDao
import com.runflow.app.data.local.entity.GoalEntity
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
class GoalsRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val goalDao: GoalDao,
    private val cacheManager: CacheManager
) {
    /**
     * Get goals with cache-first pattern.
     */
    fun getGoalsFlow(forceRefresh: Boolean = false): Flow<ApiResult<GoalsResponse>> = flow {
        // First, emit cached data if available
        val cachedGoals = getCachedGoals()
        if (cachedGoals.isNotEmpty() && !forceRefresh) {
            emit(ApiResult.Success(GoalsResponse(goals = cachedGoals)))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.GOALS, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall { apiService.getGoals() }) {
                is ApiResult.Success -> {
                    cacheGoals(result.data.goals)
                    emit(result)
                }
                is ApiResult.Error -> {
                    if (cachedGoals.isEmpty()) {
                        emit(result)
                    }
                }
                is ApiResult.Loading -> { /* Already emitted */ }
            }
        } else if (cachedGoals.isEmpty()) {
            emit(ApiResult.Error("No cached data available and device is offline"))
        }
    }

    /**
     * Legacy method for compatibility.
     */
    suspend fun getGoals(): ApiResult<GoalsResponse> {
        return safeApiCall { apiService.getGoals() }
    }

    suspend fun getGoal(id: String): ApiResult<Goal> {
        return safeApiCall { apiService.getGoal(id) }
    }

    /**
     * Create goal - syncs with server first.
     */
    suspend fun createGoal(request: CreateGoalRequest): ApiResult<Goal> {
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot create goal while offline")
        }
        val result = safeApiCall { apiService.createGoal(request) }
        if (result is ApiResult.Success) {
            cacheGoal(result.data)
            cacheManager.invalidateCache(CacheType.GOALS)
        }
        return result
    }

    /**
     * Update goal - syncs with server first.
     */
    suspend fun updateGoal(id: String, request: UpdateGoalRequest): ApiResult<Goal> {
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot update goal while offline")
        }
        val result = safeApiCall { apiService.updateGoal(id, request) }
        if (result is ApiResult.Success) {
            cacheGoal(result.data)
        }
        return result
    }

    suspend fun deleteGoal(id: String): ApiResult<AuthResponse> {
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot delete goal while offline")
        }
        val result = safeApiCall { apiService.deleteGoal(id) }
        if (result is ApiResult.Success) {
            goalDao.deleteById(id)
        }
        return result
    }

    /**
     * Refresh goals from server.
     */
    suspend fun refreshGoals(): ApiResult<GoalsResponse> {
        cacheManager.invalidateCache(CacheType.GOALS)
        val result = safeApiCall { apiService.getGoals() }
        if (result is ApiResult.Success) {
            cacheGoals(result.data.goals)
        }
        return result
    }

    private suspend fun getCachedGoals(): List<Goal> {
        return try {
            val entities = goalDao.getAllGoals().first()
            entities.map { it.toGoal() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun cacheGoals(goals: List<Goal>) {
        try {
            val entities = goals.map { it.toEntity() }
            goalDao.clearAll()
            goalDao.insertAll(entities)
            cacheManager.markCacheUpdated(CacheType.GOALS)
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private suspend fun cacheGoal(goal: Goal) {
        try {
            goalDao.insert(goal.toEntity())
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private fun GoalEntity.toGoal(): Goal {
        return Goal(
            id = id,
            userId = userId,
            name = name,
            raceType = RaceType.valueOf(raceType),
            raceDate = raceDate,
            targetTime = targetTime,
            currentVdot = currentVdot,
            predictedTime = predictedTime,
            weeklyMileageGoal = weeklyMileageGoal,
            planWeeks = planWeeks,
            runsPerWeek = runsPerWeek,
            longRunDay = longRunDay,
            easyDay1 = easyDay1,
            easyDay2 = easyDay2,
            tempoDay = tempoDay,
            intervalDay = intervalDay,
            restDay = restDay,
            isActive = isActive,
            isCompleted = isCompleted,
            workouts = emptyList(), // Workouts are stored separately
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }

    private fun Goal.toEntity(): GoalEntity {
        return GoalEntity(
            id = id,
            userId = userId,
            name = name,
            raceType = raceType.name,
            raceDate = raceDate,
            targetTime = targetTime,
            currentVdot = currentVdot,
            predictedTime = predictedTime,
            weeklyMileageGoal = weeklyMileageGoal,
            planWeeks = planWeeks,
            runsPerWeek = runsPerWeek,
            longRunDay = longRunDay,
            easyDay1 = easyDay1,
            easyDay2 = easyDay2,
            tempoDay = tempoDay,
            intervalDay = intervalDay,
            restDay = restDay,
            isActive = isActive,
            isCompleted = isCompleted,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
