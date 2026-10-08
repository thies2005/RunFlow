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
    val gpsSmoothing: Boolean = true,
    // ---- account / sync ----
    val serverUrl: String = "", // empty = default production server
    val lastSyncAt: Long = 0L,
    val lastSyncSummary: String = "",
    val demoCleaned: Boolean = false,
    val lastStravaTriggerAt: Long = 0L,
    val aiSessionId: String = "",
    // ---- login nudge ----
    val loginPromptDismissed: Boolean = false,
    val loginPromptRemindAt: Long = 0L,
    // ---- Health Connect ----
    val healthConnectImportEnabled: Boolean = false,
    val healthConnectLastImportAt: Long = 0L,
    val healthConnectLastImportSummary: String = "",
    // ---- Health Connect metrics + readiness ----
    val hcRestingHrEnabled: Boolean = false,
    val hcHrvEnabled: Boolean = false,
    val hcSleepEnabled: Boolean = false,
    val healthMetricsSyncEnabled: Boolean = true,
    val offlineModeChosen: Boolean = false,
    val readinessLastPushAt: Long = 0L,
    // ---- body auto-refresh (hrRest/hrMax/zones from recorded data) ----
    val bodyAutoRefreshDay: Long = 0L, // epoch day of the last refresh; 0 = never
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
        val GPS_SMOOTHING = booleanPreferencesKey("gps_smoothing")
        val SERVER_URL = stringPreferencesKey("server_url")
        val LAST_SYNC_AT = longPreferencesKey("last_sync_at")
        val LAST_SYNC_SUMMARY = stringPreferencesKey("last_sync_summary")
        val DEMO_CLEANED = booleanPreferencesKey("demo_cleaned")
        val LAST_STRAVA_TRIGGER = longPreferencesKey("last_strava_trigger")
        val AI_SESSION_ID = stringPreferencesKey("ai_session_id")
        val LOGIN_PROMPT_DISMISSED = booleanPreferencesKey("login_prompt_dismissed")
        val LOGIN_PROMPT_REMIND_AT = longPreferencesKey("login_prompt_remind_at")
        val HC_IMPORT_ENABLED = booleanPreferencesKey("health_connect_import_enabled")
        val HC_LAST_IMPORT_AT = longPreferencesKey("health_connect_last_import_at")
        val HC_LAST_IMPORT_SUMMARY = stringPreferencesKey("health_connect_last_import_summary")
        val HC_RESTING_HR_ENABLED = booleanPreferencesKey("hc_resting_hr_enabled")
        val HC_HRV_ENABLED = booleanPreferencesKey("hc_hrv_enabled")
        val HC_SLEEP_ENABLED = booleanPreferencesKey("hc_sleep_enabled")
        val HEALTH_METRICS_SYNC_ENABLED = booleanPreferencesKey("health_metrics_sync_enabled")
        val OFFLINE_MODE_CHOSEN = booleanPreferencesKey("offline_mode_chosen")
        val READINESS_LAST_PUSH_AT = longPreferencesKey("readiness_last_push_at")
        val BODY_AUTO_REFRESH_DAY = longPreferencesKey("body_auto_refresh_day")
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
            gpsSmoothing = p[Keys.GPS_SMOOTHING] ?: true,
            serverUrl = p[Keys.SERVER_URL] ?: "",
            lastSyncAt = p[Keys.LAST_SYNC_AT] ?: 0L,
            lastSyncSummary = p[Keys.LAST_SYNC_SUMMARY] ?: "",
            demoCleaned = p[Keys.DEMO_CLEANED] ?: false,
            lastStravaTriggerAt = p[Keys.LAST_STRAVA_TRIGGER] ?: 0L,
            aiSessionId = p[Keys.AI_SESSION_ID] ?: "",
            loginPromptDismissed = p[Keys.LOGIN_PROMPT_DISMISSED] ?: false,
            loginPromptRemindAt = p[Keys.LOGIN_PROMPT_REMIND_AT] ?: 0L,
            healthConnectImportEnabled = p[Keys.HC_IMPORT_ENABLED] ?: false,
            healthConnectLastImportAt = p[Keys.HC_LAST_IMPORT_AT] ?: 0L,
            healthConnectLastImportSummary = p[Keys.HC_LAST_IMPORT_SUMMARY] ?: "",
            hcRestingHrEnabled = p[Keys.HC_RESTING_HR_ENABLED] ?: false,
            hcHrvEnabled = p[Keys.HC_HRV_ENABLED] ?: false,
            hcSleepEnabled = p[Keys.HC_SLEEP_ENABLED] ?: false,
            healthMetricsSyncEnabled = p[Keys.HEALTH_METRICS_SYNC_ENABLED] ?: true,
            offlineModeChosen = p[Keys.OFFLINE_MODE_CHOSEN] ?: false,
            readinessLastPushAt = p[Keys.READINESS_LAST_PUSH_AT] ?: 0L,
            bodyAutoRefreshDay = p[Keys.BODY_AUTO_REFRESH_DAY] ?: 0L,
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

    suspend fun setGpsSmoothing(enabled: Boolean) =
        context.dataStore.edit { it[Keys.GPS_SMOOTHING] = enabled }

    /** Stores an origin-only server URL; the default server is stored as "". */
    suspend fun setServerUrl(url: String) = context.dataStore.edit {
        val normalized = com.runflow2.app.data.net.Api.normalizeServerUrl(url)
        it[Keys.SERVER_URL] = if (normalized == com.runflow2.app.data.net.Api.DEFAULT_BASE_URL) "" else normalized
    }

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

    /** "Dismiss" on the login nudge: never show it again. */
    suspend fun setLoginPromptDismissed() = context.dataStore.edit {
        it[Keys.LOGIN_PROMPT_DISMISSED] = true
    }

    /** "Remind in a week": snooze the login nudge until [at]. */
    suspend fun setLoginPromptRemindAt(at: Long) = context.dataStore.edit {
        it[Keys.LOGIN_PROMPT_REMIND_AT] = at
    }

    // ---- Health Connect ----

    /** Import toggle: when true, runs are pulled from Health Connect on sync. */
    suspend fun setHealthConnectImportEnabled(enabled: Boolean) = context.dataStore.edit {
        it[Keys.HC_IMPORT_ENABLED] = enabled
    }

    suspend fun setHealthConnectLastImport(at: Long, summary: String) = context.dataStore.edit {
        it[Keys.HC_LAST_IMPORT_AT] = at
        it[Keys.HC_LAST_IMPORT_SUMMARY] = summary
    }

    /** Per-metric Health Connect import toggles feeding the readiness score. */
    suspend fun setHcRestingHrEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_RESTING_HR_ENABLED] = enabled }

    suspend fun setHcHrvEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_HRV_ENABLED] = enabled }

    suspend fun setHcSleepEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_SLEEP_ENABLED] = enabled }

    /** When true, daily health metrics sync to the server for signed-in users. */
    suspend fun setHealthMetricsSyncEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HEALTH_METRICS_SYNC_ENABLED] = enabled }

    /** "Use offline" on the login nudge: suppress the sign-in prompt until login. */
    suspend fun setOfflineModeChosen(chosen: Boolean) =
        context.dataStore.edit { it[Keys.OFFLINE_MODE_CHOSEN] = chosen }

    suspend fun setReadinessLastPushAt(at: Long) =
        context.dataStore.edit { it[Keys.READINESS_LAST_PUSH_AT] = at }

    /** Epoch day of the last body auto-refresh (hrRest/hrMax/zones); 0 = never. */
    val bodyAutoRefreshDay: Flow<Long> =
        context.dataStore.data.map { it[Keys.BODY_AUTO_REFRESH_DAY] ?: 0L }

    /** Stamps the body auto-refresh as done for [epochDay] (only on actual change). */
    suspend fun setBodyAutoRefreshDay(epochDay: Long) =
        context.dataStore.edit { it[Keys.BODY_AUTO_REFRESH_DAY] = epochDay }
}
