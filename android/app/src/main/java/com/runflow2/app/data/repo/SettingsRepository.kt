package com.runflow2.app.data.repo

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "runflow_settings")

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class AppSettings(
    val onboardingDone: Boolean = false,
    val seeded: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = false,
    val useImperial: Boolean = false,
    val voiceCoach: Boolean = true,
    val autoPause: Boolean = true,
    // ---- account / sync ----
    val serverUrl: String = "", // empty = default production server
    val lastSyncAt: Long = 0L,
    val lastSyncSummary: String = "",
    val demoCleaned: Boolean = false,
    val lastStravaTriggerAt: Long = 0L,
    val aiSessionId: String = "",
)

class SettingsRepository(private val context: Context) {

    private object Keys {
        val ONBOARDING_DONE = booleanPreferencesKey("onboarding_done")
        val SEEDED = booleanPreferencesKey("seeded")
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
        val USE_IMPERIAL = booleanPreferencesKey("use_imperial")
        val VOICE_COACH = booleanPreferencesKey("voice_coach")
        val AUTO_PAUSE = booleanPreferencesKey("auto_pause")
        val SERVER_URL = stringPreferencesKey("server_url")
        val LAST_SYNC_AT = longPreferencesKey("last_sync_at")
        val LAST_SYNC_SUMMARY = stringPreferencesKey("last_sync_summary")
        val DEMO_CLEANED = booleanPreferencesKey("demo_cleaned")
        val LAST_STRAVA_TRIGGER = longPreferencesKey("last_strava_trigger")
        val AI_SESSION_ID = stringPreferencesKey("ai_session_id")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p ->
        AppSettings(
            onboardingDone = p[Keys.ONBOARDING_DONE] ?: false,
            seeded = p[Keys.SEEDED] ?: false,
            themeMode = p[Keys.THEME_MODE]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                ?: ThemeMode.SYSTEM,
            dynamicColor = p[Keys.DYNAMIC_COLOR] ?: false,
            useImperial = p[Keys.USE_IMPERIAL] ?: false,
            voiceCoach = p[Keys.VOICE_COACH] ?: true,
            autoPause = p[Keys.AUTO_PAUSE] ?: true,
            serverUrl = p[Keys.SERVER_URL] ?: "",
            lastSyncAt = p[Keys.LAST_SYNC_AT] ?: 0L,
            lastSyncSummary = p[Keys.LAST_SYNC_SUMMARY] ?: "",
            demoCleaned = p[Keys.DEMO_CLEANED] ?: false,
            lastStravaTriggerAt = p[Keys.LAST_STRAVA_TRIGGER] ?: 0L,
            aiSessionId = p[Keys.AI_SESSION_ID] ?: "",
        )
    }

    suspend fun settingsOnce(): AppSettings = settings.first()

    suspend fun setOnboardingDone() = context.dataStore.edit { it[Keys.ONBOARDING_DONE] = true }
    suspend fun setSeeded() = context.dataStore.edit { it[Keys.SEEDED] = true }

    suspend fun setThemeMode(mode: ThemeMode) =
        context.dataStore.edit { it[Keys.THEME_MODE] = mode.name }

    suspend fun setDynamicColor(enabled: Boolean) =
        context.dataStore.edit { it[Keys.DYNAMIC_COLOR] = enabled }

    suspend fun setUseImperial(enabled: Boolean) =
        context.dataStore.edit { it[Keys.USE_IMPERIAL] = enabled }

    suspend fun setVoiceCoach(enabled: Boolean) =
        context.dataStore.edit { it[Keys.VOICE_COACH] = enabled }

    suspend fun setAutoPause(enabled: Boolean) =
        context.dataStore.edit { it[Keys.AUTO_PAUSE] = enabled }

    suspend fun setServerUrl(url: String) =
        context.dataStore.edit { it[Keys.SERVER_URL] = url.trim().trimEnd('/') }

    suspend fun setLastSync(at: Long, summary: String) = context.dataStore.edit {
        it[Keys.LAST_SYNC_AT] = at
        it[Keys.LAST_SYNC_SUMMARY] = summary
    }

    suspend fun setDemoCleaned() = context.dataStore.edit { it[Keys.DEMO_CLEANED] = true }

    /** After a demo-data reset the demo cleanup on login should run again. */
    suspend fun setDemoCleanedFalseForReset() =
        context.dataStore.edit { it[Keys.DEMO_CLEANED] = false }

    suspend fun setLastStravaTrigger(at: Long) =
        context.dataStore.edit { it[Keys.LAST_STRAVA_TRIGGER] = at }

    suspend fun setAiSessionId(id: String) =
        context.dataStore.edit { it[Keys.AI_SESSION_ID] = id }
}
