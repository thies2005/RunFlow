package com.runflow.app.data.auth

import com.runflow.app.BuildConfig
import com.runflow.app.di.TokenRefreshClient
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles token refresh operations directly via OkHttpClient
 * to avoid circular dependency with AuthRepository -> RunFlowApiService -> OkHttpClient
 */
@Singleton
class TokenRefreshManager @Inject constructor(
    private val tokenManager: AuthTokenManager,
    @TokenRefreshClient private val okHttpClient: OkHttpClient
) {

    /**
     * Refresh the access token using the refresh token.
     * Returns true if refresh was successful, false otherwise.
     */
    suspend fun refreshToken(): Boolean {
        val refreshToken = runBlocking {
            tokenManager.refreshToken.firstOrNull()
        } ?: return false

        return try {
            val requestBody = FormBody.Builder()
                .add("refreshToken", refreshToken)
                .build()

            val apiUrl = BuildConfig.API_BASE_URL
            val baseUrl = if (apiUrl.endsWith("/")) apiUrl else "$apiUrl/"

            val request = Request.Builder()
                .url("${baseUrl}mobile/v1/auth/refresh")
                .post(requestBody)
                .build()

            val response = okHttpClient.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    // Parse the JSON response manually
                    val accessToken = extractJsonValue(responseBody, "accessToken")
                    val newRefreshToken = extractJsonValue(responseBody, "refreshToken")

                    if (accessToken != null && newRefreshToken != null) {
                        tokenManager.saveTokens(accessToken, newRefreshToken)
                        return true
                    }
                }
            }

            false
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Simple JSON parser to extract a string value by key.
     * This avoids pulling in a full JSON library dependency.
     */
    private fun extractJsonValue(json: String, key: String): String? {
        val searchKey = "\"$key\""
        val keyIndex = json.indexOf(searchKey)
        if (keyIndex == -1) return null

        val colonIndex = json.indexOf(":", keyIndex)
        if (colonIndex == -1) return null

        var valueStart = colonIndex + 1
        while (valueStart < json.length && json[valueStart].isWhitespace()) {
            valueStart++
        }

        if (valueStart >= json.length) return null

        // Check if value is a string
        if (json[valueStart] == '"') {
            valueStart++
            val valueEnd = json.indexOf('"', valueStart)
            if (valueEnd == -1) return null
            return json.substring(valueStart, valueEnd)
        }

        // Not a string, read until comma or closing brace
        var valueEnd = valueStart
        while (valueEnd < json.length && json[valueEnd] != ',' && json[valueEnd] != '}' && !json[valueEnd].isWhitespace()) {
            valueEnd++
        }

        return json.substring(valueStart, valueEnd)
    }
}
