package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.WorkoutDao
import com.runflow.app.data.local.entity.WorkoutEntity
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
class WorkoutsRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val workoutDao: WorkoutDao,
    private val cacheManager: CacheManager
) {
    /**
     * Get workouts with cache-first pattern.
     */
    fun getWorkoutsFlow(
        goalId: String? = null,
        weekStart: String? = null,
        weekEnd: String? = null,
        forceRefresh: Boolean = false
    ): Flow<ApiResult<WorkoutsResponse>> = flow {
        // First, emit cached data if available
        val cachedWorkouts = getCachedWorkouts(goalId)
        if (cachedWorkouts.isNotEmpty() && !forceRefresh) {
            emit(ApiResult.Success(WorkoutsResponse(workouts = cachedWorkouts)))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.WORKOUTS, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall {
                apiService.getWorkouts(goalId, weekStart, weekEnd)
            }) {
                is ApiResult.Success -> {
                    cacheWorkouts(result.data.workouts)
                    emit(result)
                }
                is ApiResult.Error -> {
                    if (cachedWorkouts.isEmpty()) {
                        emit(result)
                    }
                }
                is ApiResult.Loading -> { /* Already emitted */ }
            }
        } else if (cachedWorkouts.isEmpty()) {
            emit(ApiResult.Error("No cached data available and device is offline"))
        }
    }

    /**
     * Legacy method for compatibility.
     */
    suspend fun getWorkouts(
        goalId: String? = null,
        weekStart: String? = null,
        weekEnd: String? = null
    ): ApiResult<WorkoutsResponse> {
        return safeApiCall {
            apiService.getWorkouts(
                goalId = goalId,
                weekStart = weekStart,
                weekEnd = weekEnd
            )
        }
    }

    suspend fun getWorkout(id: String): ApiResult<Workout> {
        return safeApiCall { apiService.getWorkout(id) }
    }

    /**
     * Create workout - syncs with server first to ensure consistency.
     */
    suspend fun createWorkout(request: CreateWorkoutRequest): ApiResult<Workout> {
        // Sync before mutation
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot create workout while offline")
        }
        val result = safeApiCall { apiService.createWorkout(request) }
        if (result is ApiResult.Success) {
            cacheWorkout(result.data)
            cacheManager.invalidateCache(CacheType.WORKOUTS)
        }
        return result
    }

    /**
     * Update workout - syncs with server first to ensure consistency.
     */
    suspend fun updateWorkout(id: String, request: UpdateWorkoutRequest): ApiResult<Workout> {
        // Sync before mutation
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot update workout while offline")
        }
        val result = safeApiCall { apiService.updateWorkout(id, request) }
        if (result is ApiResult.Success) {
            cacheWorkout(result.data)
        }
        return result
    }

    suspend fun deleteWorkout(id: String): ApiResult<AuthResponse> {
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot delete workout while offline")
        }
        val result = safeApiCall { apiService.deleteWorkout(id) }
        if (result is ApiResult.Success) {
            workoutDao.deleteById(id)
        }
        return result
    }

    /**
     * Complete workout (link activity) - syncs with server first.
     */
    suspend fun completeWorkout(id: String, activityId: String): ApiResult<Workout> {
        // Sync before mutation - ensures we have latest data
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot complete workout while offline")
        }
        val result = safeApiCall { apiService.completeWorkout(id, CompleteWorkoutRequest(activityId)) }
        if (result is ApiResult.Success) {
            cacheWorkout(result.data)
        }
        return result
    }

    /**
     * Refresh workouts from server.
     */
    suspend fun refreshWorkouts(): ApiResult<WorkoutsResponse> {
        cacheManager.invalidateCache(CacheType.WORKOUTS)
        val result = safeApiCall { apiService.getWorkouts() }
        if (result is ApiResult.Success) {
            cacheWorkouts(result.data.workouts)
        }
        return result
    }

    private suspend fun getCachedWorkouts(goalId: String? = null): List<Workout> {
        return try {
            val entities = if (goalId != null) {
                workoutDao.getWorkoutsByGoalId(goalId).first()
            } else {
                workoutDao.getAllWorkouts().first()
            }
            entities.map { it.toWorkout() }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private suspend fun cacheWorkouts(workouts: List<Workout>) {
        try {
            val entities = workouts.map { it.toEntity() }
            workoutDao.clearAll()
            workoutDao.insertAll(entities)
            cacheManager.markCacheUpdated(CacheType.WORKOUTS)
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private suspend fun cacheWorkout(workout: Workout) {
        try {
            workoutDao.insert(workout.toEntity())
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private fun WorkoutEntity.toWorkout(): Workout {
        return Workout(
            id = id,
            goalId = goalId,
            scheduledDate = scheduledDate,
            workoutType = WorkoutType.valueOf(workoutType),
            description = description,
            targetDistance = targetDistance,
            targetDuration = targetDuration,
            targetPace = targetPace,
            targetHrZone = targetHrZone,
            isCompleted = isCompleted,
            completedAt = completedAt,
            linkedActivityId = linkedActivityId,
            phase = PlanPhase.valueOf(phase),
            order = order,
            notes = notes
        )
    }

    private fun Workout.toEntity(): WorkoutEntity {
        return WorkoutEntity(
            id = id,
            goalId = goalId,
            scheduledDate = scheduledDate,
            workoutType = workoutType.name,
            description = description,
            targetDistance = targetDistance,
            targetDuration = targetDuration,
            targetPace = targetPace,
            targetHrZone = targetHrZone,
            isCompleted = isCompleted,
            completedAt = completedAt,
            linkedActivityId = linkedActivityId,
            phase = phase.name,
            order = order,
            notes = notes
        )
    }
}
