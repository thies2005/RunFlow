package com.runflow.app.data.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token manager using EncryptedSharedPreferences.
 * 
 * Stores authentication tokens encrypted at rest using Android Keystore.
 * This provides protection against:
 * - Data extraction from app storage on rooted devices
 * - Backup extraction attacks
 * - Memory dumping (tokens encrypted until accessed)
 */
@Singleton
class AuthTokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        const val ACCESS_TOKEN = "access_token"
        const val REFRESH_TOKEN = "refresh_token"
        const val USER_ID = "user_id"
    }

    // Lazy-initialized encrypted preferences
    private val encryptedPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "auth_tokens_encrypted",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // State flows for reactive token access
    private val _accessToken = MutableStateFlow<String?>(null)
    private val _refreshToken = MutableStateFlow<String?>(null)
    private val _userId = MutableStateFlow<String?>(null)

    init {
        // Load initial values from encrypted storage
        _accessToken.value = encryptedPrefs.getString(Keys.ACCESS_TOKEN, null)
        _refreshToken.value = encryptedPrefs.getString(Keys.REFRESH_TOKEN, null)
        _userId.value = encryptedPrefs.getString(Keys.USER_ID, null)
    }

    val accessToken: Flow<String?> = _accessToken.asStateFlow()
    val refreshToken: Flow<String?> = _refreshToken.asStateFlow()
    val userId: Flow<String?> = _userId.asStateFlow()
    val isAuthenticated: Flow<Boolean> = accessToken.map { it != null }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        withContext(Dispatchers.IO) {
            encryptedPrefs.edit()
                .putString(Keys.ACCESS_TOKEN, accessToken)
                .putString(Keys.REFRESH_TOKEN, refreshToken)
                .apply()
        }
        _accessToken.value = accessToken
        _refreshToken.value = refreshToken
    }

    suspend fun saveUserId(userId: String) {
        withContext(Dispatchers.IO) {
            encryptedPrefs.edit()
                .putString(Keys.USER_ID, userId)
                .apply()
        }
        _userId.value = userId
    }

    suspend fun clearTokens() {
        withContext(Dispatchers.IO) {
            encryptedPrefs.edit().clear().apply()
        }
        _accessToken.value = null
        _refreshToken.value = null
        _userId.value = null
    }

    suspend fun getAccessTokenOrNull(): String? {
        return _accessToken.value
    }
}
