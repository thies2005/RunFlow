package com.runflow.app.data.auth

import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Authentication interceptor that adds Bearer tokens to requests
 * and automatically handles token refresh on 401 responses.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: AuthTokenManager,
    private val tokenRefreshManager: TokenRefreshManager
) : Interceptor {

    // Flag to prevent multiple concurrent token refresh attempts
    private val isRefreshing = AtomicBoolean(false)

    // Mutex for synchronizing refresh operations
    private val refreshLock = Any()

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth for auth endpoints to prevent infinite loops
        if (originalRequest.url.encodedPath.contains("/auth/")) {
            return chain.proceed(originalRequest)
        }

        // Get current access token
        val token = runBlocking {
            tokenManager.accessToken.firstOrNull()
        }

        // Build authenticated request
        val authenticatedRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .build()
        } else {
            originalRequest.newBuilder()
                .header("Content-Type", "application/json")
                .build()
        }

        // Execute the request
        var response = chain.proceed(authenticatedRequest)

        // Handle 401 Unauthorized - token might be expired
        if (response.code == 401 && token != null) {
            response.close()

            // Try to refresh token and retry request
            val newResponse = refreshTokenAndRetry(chain, originalRequest)
            if (newResponse != null) {
                return newResponse
            }
        }

        return response
    }

    /**
     * Refresh the access token and retry the original request.
     * Returns null if refresh fails.
     */
    private fun refreshTokenAndRetry(
        chain: Interceptor.Chain,
        originalRequest: okhttp3.Request
    ): Response? {
        // Wait for any existing refresh to complete
        synchronized(refreshLock) {
            while (isRefreshing.get()) {
                try {
                    (refreshLock as Object).wait(1000)
                } catch (e: InterruptedException) {
                    return null
                }
            }

            // Double-check after acquiring lock
            val currentToken = runBlocking {
                tokenManager.accessToken.firstOrNull()
            }
            if (currentToken != null && currentToken != getTokenFromRequest(originalRequest)) {
                // Another thread already refreshed the token, use it
                return retryWithNewToken(chain, originalRequest, currentToken)
            }

            // Mark refresh as in progress
            if (!isRefreshing.compareAndSet(false, true)) {
                // Another thread started refreshing, wait for it
                while (isRefreshing.get()) {
                    try {
                        (refreshLock as Object).wait(100)
                    } catch (e: InterruptedException) {
                        return null
                    }
                }
                // Get the new token and retry
                val newToken = runBlocking {
                    tokenManager.accessToken.firstOrNull()
                }
                return if (newToken != null) {
                    retryWithNewToken(chain, originalRequest, newToken)
                } else {
                    null
                }
            }
        }

        try {
            // Perform token refresh (this is the async part)
            val refreshSuccess = runBlocking {
                tokenRefreshManager.refreshToken()
            }

            if (refreshSuccess) {
                // Get the new token
                val newToken = runBlocking {
                    tokenManager.accessToken.firstOrNull()
                }

                if (newToken != null) {
                    return retryWithNewToken(chain, originalRequest, newToken)
                }
            }
            // If refresh failed, clear tokens and let the request fail
            return null
        } finally {
            // Mark refresh as complete
            isRefreshing.set(false)
            synchronized(refreshLock) {
                (refreshLock as Object).notifyAll()
            }
        }
    }

    /**
     * Retry the original request with a new access token.
     */
    private fun retryWithNewToken(
        chain: Interceptor.Chain,
        originalRequest: okhttp3.Request,
        newToken: String
    ): Response {
        val newRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .header("Content-Type", "application/json")
            .build()

        return chain.proceed(newRequest)
    }

    /**
     * Extract token from request for comparison.
     */
    private fun getTokenFromRequest(request: okhttp3.Request): String? {
        val authHeader = request.header("Authorization")
        return if (authHeader?.startsWith("Bearer ") == true) {
            authHeader.substring(7)
        } else {
            null
        }
    }
}
