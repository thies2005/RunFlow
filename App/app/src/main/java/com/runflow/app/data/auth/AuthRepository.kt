package com.runflow.app.data.auth

import com.runflow.app.data.model.LoginRequest
import com.runflow.app.data.model.LoginResponse
import com.runflow.app.data.model.LogoutRequest
import com.runflow.app.data.model.RefreshTokenRequest
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.remote.RunFlowApiService
import com.runflow.app.data.remote.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: RunFlowApiService,
    private val tokenManager: AuthTokenManager
) {
    val isAuthenticated = tokenManager.isAuthenticated

    suspend fun login(code: String): ApiResult<LoginResponse> {
        return when (val result = safeApiCall { apiService.login(LoginRequest(code)) }) {
            is ApiResult.Success -> {
                val response = result.data
                tokenManager.saveTokens(response.accessToken, response.refreshToken)
                tokenManager.saveUserId(response.user.id)
                ApiResult.Success(response)
            }
            is ApiResult.Error -> result
            is ApiResult.Loading -> ApiResult.Loading
        }
    }

    suspend fun logout(): ApiResult<Unit> {
        val refreshToken = getCurrentRefreshToken()
        return try {
            if (refreshToken != null) {
                safeApiCall { apiService.logout(LogoutRequest(refreshToken)) }
            }
            tokenManager.clearTokens()
            ApiResult.Success(Unit)
        } catch (e: Exception) {
            tokenManager.clearTokens()
            ApiResult.Success(Unit)
        }
    }

    suspend fun refreshToken(): ApiResult<String> {
        val refreshToken = getCurrentRefreshToken()
            ?: return ApiResult.Error("No refresh token available")

        return when (val result = safeApiCall {
            apiService.refreshToken(RefreshTokenRequest(refreshToken))
        }) {
            is ApiResult.Success -> {
                val response = result.data
                tokenManager.saveTokens(response.accessToken, response.refreshToken)
                ApiResult.Success(response.accessToken)
            }
            is ApiResult.Error -> {
                // Clear tokens on refresh failure - user needs to re-login
                tokenManager.clearTokens()
                result
            }
            is ApiResult.Loading -> ApiResult.Loading
        }
    }

    private suspend fun getCurrentRefreshToken(): String? {
        var token: String? = null
        tokenManager.refreshToken.collect { token = it }
        return token
    }
}
