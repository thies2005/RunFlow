package com.runflow.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

// Extension to create DataStore
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "runflow_preferences")

@Singleton
class PreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    // Preference keys
    companion object {
        val HR_MAX = stringPreferencesKey("hr_max")
        val HR_REST = stringPreferencesKey("hr_rest")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        val SYNC_NOTIFICATIONS = booleanPreferencesKey("sync_notifications")
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val USER_ID = stringPreferencesKey("user_id")
    }

    // Heart Rate Settings
    val hrMax: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[HR_MAX]
    }

    val hrRest: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[HR_REST]
    }

    suspend fun saveHeartRateSettings(max: String, rest: String) {
        context.dataStore.edit { preferences ->
            preferences[HR_MAX] = max
            preferences[HR_REST] = rest
        }
    }

    // Notification Settings
    val notificationsEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[NOTIFICATIONS_ENABLED] ?: true
    }

    val syncNotifications: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[SYNC_NOTIFICATIONS] ?: true
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATIONS_ENABLED] = enabled
        }
    }

    suspend fun setSyncNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[SYNC_NOTIFICATIONS] = enabled
        }
    }

    // Auth Settings
    val authToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[AUTH_TOKEN]
    }

    val userId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_ID]
    }

    suspend fun saveAuthToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN] = token
        }
    }

    suspend fun saveUserId(id: String) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = id
        }
    }

    suspend fun clearAuth() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN)
            preferences.remove(USER_ID)
        }
    }
}
