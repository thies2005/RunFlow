package com.runflow.app.data.repository

import com.runflow.app.data.cache.CacheManager
import com.runflow.app.data.cache.CacheType
import com.runflow.app.data.local.UserProfileDao
import com.runflow.app.data.local.entity.UserProfileEntity
import com.runflow.app.data.model.Sex
import com.runflow.app.data.model.UpdateProfileRequest
import com.runflow.app.data.model.UserProfile
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.remote.safeApiCall
import com.runflow.app.data.remote.RunFlowApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val userProfileDao: UserProfileDao,
    private val cacheManager: CacheManager
) {
    /**
     * Get user profile with cache-first pattern.
     */
    fun getUserProfileFlow(forceRefresh: Boolean = false): Flow<ApiResult<UserProfile>> = flow {
        // First, emit cached data if available
        val cached = getCachedProfile()
        if (cached != null && !forceRefresh) {
            emit(ApiResult.Success(cached))
        }

        // Then fetch from network if needed
        if (cacheManager.shouldFetchFromNetwork(CacheType.USER_PROFILE, forceRefresh)) {
            emit(ApiResult.Loading)
            when (val result = safeApiCall { apiService.getUserProfile() }) {
                is ApiResult.Success -> {
                    cacheProfile(result.data)
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
    suspend fun getUserProfile(): ApiResult<UserProfile> {
        return safeApiCall { apiService.getUserProfile() }
    }

    /**
     * Update user profile - syncs with server first.
     * This includes VDOT correction factor updates.
     */
    suspend fun updateUserProfile(request: UpdateProfileRequest): ApiResult<UserProfile> {
        if (!cacheManager.isOnline()) {
            return ApiResult.Error("Cannot update profile while offline")
        }
        val result = safeApiCall { apiService.updateUserProfile(request) }
        if (result is ApiResult.Success) {
            cacheProfile(result.data)
        }
        return result
    }

    /**
     * Refresh user profile from server.
     */
    suspend fun refreshProfile(): ApiResult<UserProfile> {
        cacheManager.invalidateCache(CacheType.USER_PROFILE)
        val result = safeApiCall { apiService.getUserProfile() }
        if (result is ApiResult.Success) {
            cacheProfile(result.data)
        }
        return result
    }

    private suspend fun getCachedProfile(): UserProfile? {
        val cached = userProfileDao.getUserProfileSync() ?: return null
        return cached.toUserProfile()
    }

    private suspend fun cacheProfile(profile: UserProfile) {
        try {
            userProfileDao.insert(profile.toEntity())
            cacheManager.markCacheUpdated(CacheType.USER_PROFILE)
        } catch (e: Exception) {
            // Cache error is non-fatal
        }
    }

    private fun UserProfileEntity.toUserProfile(): UserProfile {
        return UserProfile(
            id = id,
            name = name,
            email = email,
            image = image,
            sex = sex?.let { runCatching { Sex.valueOf(it) }.getOrNull() },
            birthDate = birthDate,
            hrMax = hrMax,
            hrRest = hrRest,
            weight = weight,
            height = height,
            hrZone1Max = hrZone1Max,
            hrZone2Max = hrZone2Max,
            hrZone3Max = hrZone3Max,
            hrZone4Max = hrZone4Max,
            vdotCorrectionFactor = vdotCorrectionFactor
        )
    }

    private fun UserProfile.toEntity(): UserProfileEntity {
        return UserProfileEntity(
            id = id ?: "default",
            name = name,
            email = email,
            image = image,
            sex = sex?.name,
            birthDate = birthDate,
            hrMax = hrMax,
            hrRest = hrRest,
            weight = weight,
            height = height,
            hrZone1Max = hrZone1Max,
            hrZone2Max = hrZone2Max,
            hrZone3Max = hrZone3Max,
            hrZone4Max = hrZone4Max,
            vdotCorrectionFactor = vdotCorrectionFactor
        )
    }
}
