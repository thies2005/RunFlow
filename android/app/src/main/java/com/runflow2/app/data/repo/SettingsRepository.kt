package com.runflow2.app.data.repo

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.runflow2.app.domain.analytics.ServerMetricSnapshot
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "runflow_settings")

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class AppSettings(
    val onboardingDone: Boolean = false,
    val seeded: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true,
    val amoledBlack: Boolean = false,
    val useImperial: Boolean = false,
    val voiceCoach: Boolean = true,
    val autoPause: Boolean = true,
    val gpsSmoothing: Boolean = true,
    // ---- account / sync ----
    val serverUrl: String = "", // empty = no server
    val connectionEnabled: Boolean = false,
    val restoreInProgress: Boolean = false,
    val uploadActivitiesEnabled: Boolean = false,
    val uploadExistingActivitiesEnabled: Boolean = false,
    val uploadActivitiesConsentSince: Long = 0L,
    val uploadPlansEnabled: Boolean = false,
    val uploadExistingPlansEnabled: Boolean = false,
    val uploadPlansConsentSince: Long = 0L,
    val lastSyncAt: Long = 0L,
    val lastSyncSummary: String = "",
    val demoCleaned: Boolean = false,
    val lastStravaTriggerAt: Long = 0L,
    val uploadCooldownUntil: Long = 0L,
    val generalReadCooldownUntil: Long = 0L,
    /** Account/origin that last supplied a successful signed-in profile GET. */
    val profileHydrationKey: String = "",
    val profileHydratedAt: Long = 0L,
    val aiSessionId: String = "",
    // ---- login nudge ----
    val loginPromptDismissed: Boolean = false,
    val loginPromptRemindAt: Long = 0L,
    // ---- Health Connect ----
    val healthConnectImportEnabled: Boolean = false,
    val healthConnectLastImportAt: Long = 0L,
    val hcFirstGrantObservedAt: Long = 0L,
    val healthConnectLastImportSummary: String = "",
    // ---- Health Connect metrics + readiness ----
    val hcRestingHrEnabled: Boolean = false,
    val hcHrvEnabled: Boolean = false,
    val hcSleepEnabled: Boolean = false,
    val healthMetricsSyncEnabled: Boolean = false,
    val uploadExistingHealthEnabled: Boolean = false,
    val healthMetricsConsentSince: Long = 0L,
    val offlineModeChosen: Boolean = true,
    val readinessLastPushAt: Long = 0L,
    // ---- body auto-refresh (hrRest/hrMax/zones from recorded data) ----
    val bodyAutoRefreshDay: Long = 0L, // epoch day of the last refresh; 0 = never
    // ---- cycling FTP settings ----
    val ftpWatts: Int = 0, // 0 = auto-estimate
    val autoEstimateFtp: Boolean = true,
    // ---- analytics: marathon shape, MyWhoosh matching & VO2max calibration ----
    val includeCrossTraining: Boolean = false,
    val matchToMyWhoosh: Boolean = false,
    val effectiveVo2maxCorrection: Double = 1.0,
    // ---- load & UI preference sync ----
    val primaryLoadMetric: String = "TSS", // "TSS", "DUAL", "TRIMP"
    val effortCardMode: String = "WEEK_AND_MONTH",
)

class SettingsRepository(private val context: Context) {

    companion object {
        @Volatile
        internal var instance: SettingsRepository? = null

        fun clearInstanceForTest() {
            instance = null
        }
    }

    init {
        instance = this
    }

    private object Keys {
        val ONBOARDING_DONE = booleanPreferencesKey("onboarding_done")
        val SEEDED = booleanPreferencesKey("seeded")
        val THEME_MODE = stringPreferencesKey("theme_mode")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
        val AMOLED_BLACK = booleanPreferencesKey("amoled_black")
        val USE_IMPERIAL = booleanPreferencesKey("use_imperial")
        val VOICE_COACH = booleanPreferencesKey("voice_coach")
        val AUTO_PAUSE = booleanPreferencesKey("auto_pause")
        val GPS_SMOOTHING = booleanPreferencesKey("gps_smoothing")
        val SERVER_URL = stringPreferencesKey("server_url")
        val CONNECTION_ENABLED = booleanPreferencesKey("connection_enabled")
        val RESTORE_IN_PROGRESS = booleanPreferencesKey("restore_in_progress")
        val UPLOAD_ACTIVITIES = booleanPreferencesKey("upload_activities_enabled")
        val UPLOAD_EXISTING_ACTIVITIES = booleanPreferencesKey("upload_existing_activities_enabled")
        val UPLOAD_ACTIVITIES_CONSENT_SINCE = longPreferencesKey("upload_activities_consent_since")
        val UPLOAD_EXISTING_HEALTH = booleanPreferencesKey("upload_existing_health_enabled")
        val HEALTH_METRICS_CONSENT_SINCE = longPreferencesKey("health_metrics_consent_since")
        val UPLOAD_PLANS = booleanPreferencesKey("upload_plans_enabled")
        val UPLOAD_EXISTING_PLANS = booleanPreferencesKey("upload_existing_plans_enabled")
        val UPLOAD_PLANS_CONSENT_SINCE = longPreferencesKey("upload_plans_consent_since")
        val LAST_SYNC_AT = longPreferencesKey("last_sync_at")
        val LAST_SYNC_SUMMARY = stringPreferencesKey("last_sync_summary")
        val DEMO_CLEANED = booleanPreferencesKey("demo_cleaned")
        val LAST_STRAVA_TRIGGER = longPreferencesKey("last_strava_trigger")
        val UPLOAD_COOLDOWN_UNTIL = longPreferencesKey("upload_cooldown_until")
        val GENERAL_READ_COOLDOWN_UNTIL = longPreferencesKey("general_read_cooldown_until")
        val PROFILE_HYDRATION_KEY = stringPreferencesKey("profile_hydration_key")
        val PROFILE_HYDRATED_AT = longPreferencesKey("profile_hydrated_at")
        val AI_SESSION_ID = stringPreferencesKey("ai_session_id")
        val LOGIN_PROMPT_DISMISSED = booleanPreferencesKey("login_prompt_dismissed")
        val LOGIN_PROMPT_REMIND_AT = longPreferencesKey("login_prompt_remind_at")
        val HC_IMPORT_ENABLED = booleanPreferencesKey("health_connect_import_enabled")
        val HC_LAST_IMPORT_AT = longPreferencesKey("health_connect_last_import_at")
        val HC_FIRST_GRANT_OBSERVED_AT = longPreferencesKey("hc_first_grant_observed_at")
        val HC_LAST_IMPORT_SUMMARY = stringPreferencesKey("health_connect_last_import_summary")
        val HC_RESTING_HR_ENABLED = booleanPreferencesKey("hc_resting_hr_enabled")
        val HC_HRV_ENABLED = booleanPreferencesKey("hc_hrv_enabled")
        val HC_SLEEP_ENABLED = booleanPreferencesKey("hc_sleep_enabled")
        val HEALTH_METRICS_SYNC_ENABLED = booleanPreferencesKey("health_metrics_upload_consent_v2")
        val OFFLINE_MODE_CHOSEN = booleanPreferencesKey("offline_mode_chosen")
        val READINESS_LAST_PUSH_AT = longPreferencesKey("readiness_last_push_at")
        val READINESS_SCORE_ENGINE = intPreferencesKey("readiness_score_engine")
        val BODY_AUTO_REFRESH_DAY = longPreferencesKey("body_auto_refresh_day")
        // ---- cycling FTP settings ----
        val FTP_WATTS = intPreferencesKey("ftp_watts")
        val AUTO_ESTIMATE_FTP = booleanPreferencesKey("auto_estimate_ftp")
        // ---- analytics: marathon shape, MyWhoosh matching & VO2max calibration ----
        val INCLUDE_CROSS_TRAINING = booleanPreferencesKey("include_cross_training")
        val MATCH_TO_MY_WHOOSH = booleanPreferencesKey("match_to_my_whoosh")
        val EFFECTIVE_VO2MAX_CORRECTION = doublePreferencesKey("effective_vo2max_correction")
        // ---- server two-metric snapshot (VDOT + aerobic VO2max) ----
        val SERVER_METRICS_VDOT = doublePreferencesKey("server_metrics_best_effort_vdot")
        val SERVER_METRICS_AEROBIC_VO2MAX = doublePreferencesKey("server_metrics_aerobic_vo2max")
        val SERVER_METRICS_COMPUTED_AT = longPreferencesKey("server_metrics_computed_at")
        // ---- load & UI preference sync ----
        val PRIMARY_LOAD_METRIC = stringPreferencesKey("primary_load_metric")
        val EFFORT_CARD_MODE = stringPreferencesKey("effort_card_mode")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p ->
        AppSettings(
            onboardingDone = p[Keys.ONBOARDING_DONE] ?: false,
            seeded = p[Keys.SEEDED] ?: false,
            themeMode = p[Keys.THEME_MODE]?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                ?: ThemeMode.SYSTEM,
            dynamicColor = p[Keys.DYNAMIC_COLOR] ?: true,
            amoledBlack = p[Keys.AMOLED_BLACK] ?: false,
            useImperial = p[Keys.USE_IMPERIAL] ?: false,
            voiceCoach = p[Keys.VOICE_COACH] ?: true,
            autoPause = p[Keys.AUTO_PAUSE] ?: true,
            gpsSmoothing = p[Keys.GPS_SMOOTHING] ?: true,
            serverUrl = p[Keys.SERVER_URL] ?: "",
            connectionEnabled = (p[Keys.CONNECTION_ENABLED] ?: false) && !(p[Keys.RESTORE_IN_PROGRESS] ?: false),
            restoreInProgress = p[Keys.RESTORE_IN_PROGRESS] ?: false,
            uploadActivitiesEnabled = p[Keys.UPLOAD_ACTIVITIES] ?: false,
            uploadExistingActivitiesEnabled = p[Keys.UPLOAD_EXISTING_ACTIVITIES] ?: false,
            uploadActivitiesConsentSince = p[Keys.UPLOAD_ACTIVITIES_CONSENT_SINCE] ?: 0L,
            uploadPlansEnabled = p[Keys.UPLOAD_PLANS] ?: false,
            uploadExistingPlansEnabled = p[Keys.UPLOAD_EXISTING_PLANS] ?: false,
            uploadPlansConsentSince = p[Keys.UPLOAD_PLANS_CONSENT_SINCE] ?: 0L,
            lastSyncAt = p[Keys.LAST_SYNC_AT] ?: 0L,
            lastSyncSummary = p[Keys.LAST_SYNC_SUMMARY] ?: "",
            demoCleaned = p[Keys.DEMO_CLEANED] ?: false,
            lastStravaTriggerAt = p[Keys.LAST_STRAVA_TRIGGER] ?: 0L,
            uploadCooldownUntil = p[Keys.UPLOAD_COOLDOWN_UNTIL] ?: 0L,
            generalReadCooldownUntil = p[Keys.GENERAL_READ_COOLDOWN_UNTIL] ?: 0L,
            profileHydrationKey = p[Keys.PROFILE_HYDRATION_KEY] ?: "",
            profileHydratedAt = p[Keys.PROFILE_HYDRATED_AT] ?: 0L,
            aiSessionId = p[Keys.AI_SESSION_ID] ?: "",
            loginPromptDismissed = p[Keys.LOGIN_PROMPT_DISMISSED] ?: false,
            loginPromptRemindAt = p[Keys.LOGIN_PROMPT_REMIND_AT] ?: 0L,
            healthConnectImportEnabled = p[Keys.HC_IMPORT_ENABLED] ?: false,
            healthConnectLastImportAt = p[Keys.HC_LAST_IMPORT_AT] ?: 0L,
            hcFirstGrantObservedAt = p[Keys.HC_FIRST_GRANT_OBSERVED_AT] ?: 0L,
            healthConnectLastImportSummary = p[Keys.HC_LAST_IMPORT_SUMMARY] ?: "",
            hcRestingHrEnabled = p[Keys.HC_RESTING_HR_ENABLED] ?: false,
            hcHrvEnabled = p[Keys.HC_HRV_ENABLED] ?: false,
            hcSleepEnabled = p[Keys.HC_SLEEP_ENABLED] ?: false,
            healthMetricsSyncEnabled = p[Keys.HEALTH_METRICS_SYNC_ENABLED] ?: false,
            uploadExistingHealthEnabled = p[Keys.UPLOAD_EXISTING_HEALTH] ?: false,
            healthMetricsConsentSince = p[Keys.HEALTH_METRICS_CONSENT_SINCE] ?: 0L,
            offlineModeChosen = p[Keys.OFFLINE_MODE_CHOSEN] ?: true,
            readinessLastPushAt = p[Keys.READINESS_LAST_PUSH_AT] ?: 0L,
            bodyAutoRefreshDay = p[Keys.BODY_AUTO_REFRESH_DAY] ?: 0L,
            ftpWatts = p[Keys.FTP_WATTS] ?: 0,
            autoEstimateFtp = p[Keys.AUTO_ESTIMATE_FTP] ?: true,
            includeCrossTraining = p[Keys.INCLUDE_CROSS_TRAINING] ?: false,
            matchToMyWhoosh = p[Keys.MATCH_TO_MY_WHOOSH] ?: false,
            effectiveVo2maxCorrection = p[Keys.EFFECTIVE_VO2MAX_CORRECTION] ?: 1.0,
            primaryLoadMetric = p[Keys.PRIMARY_LOAD_METRIC] ?: "TSS",
            effortCardMode = p[Keys.EFFORT_CARD_MODE] ?: "WEEK_AND_MONTH",
        )
    }

    suspend fun settingsOnce(): AppSettings = settings.first()

    suspend fun setOnboardingDone() = context.dataStore.edit { it[Keys.ONBOARDING_DONE] = true }
    suspend fun setSeeded() = context.dataStore.edit { it[Keys.SEEDED] = true }

    suspend fun setThemeMode(mode: ThemeMode) =
        context.dataStore.edit { it[Keys.THEME_MODE] = mode.name }

    suspend fun setDynamicColor(enabled: Boolean) =
        context.dataStore.edit { it[Keys.DYNAMIC_COLOR] = enabled }

    suspend fun setAmoledBlack(enabled: Boolean) =
        context.dataStore.edit { it[Keys.AMOLED_BLACK] = enabled }

    suspend fun setUseImperial(enabled: Boolean) =
        context.dataStore.edit { it[Keys.USE_IMPERIAL] = enabled }

    suspend fun setVoiceCoach(enabled: Boolean) =
        context.dataStore.edit { it[Keys.VOICE_COACH] = enabled }

    suspend fun setAutoPause(enabled: Boolean) =
        context.dataStore.edit { it[Keys.AUTO_PAUSE] = enabled }

    suspend fun setGpsSmoothing(enabled: Boolean) =
        context.dataStore.edit { it[Keys.GPS_SMOOTHING] = enabled }

    /** Stores an explicit origin; an empty value means no server. */
    suspend fun setServerUrl(url: String) = context.dataStore.edit {
        val normalized = com.runflow2.app.data.net.Api.normalizeServerUrl(url)
        it[Keys.SERVER_URL] = normalized
        it[Keys.CONNECTION_ENABLED] = false
    }

    suspend fun setConnectionEnabled(enabled: Boolean) = context.dataStore.edit {
        require(!enabled || (it[Keys.RESTORE_IN_PROGRESS] != true && !it[Keys.SERVER_URL].isNullOrBlank())) { "Configure a server first" }
        it[Keys.CONNECTION_ENABLED] = enabled
    }
    suspend fun beginRestore() = context.dataStore.edit {
        it[Keys.RESTORE_IN_PROGRESS] = true
        it[Keys.CONNECTION_ENABLED] = false
        it[Keys.UPLOAD_ACTIVITIES] = false
        it[Keys.UPLOAD_EXISTING_ACTIVITIES] = false
        it.remove(Keys.UPLOAD_ACTIVITIES_CONSENT_SINCE)
        it[Keys.UPLOAD_EXISTING_HEALTH] = false
        it.remove(Keys.HEALTH_METRICS_CONSENT_SINCE)
        it[Keys.UPLOAD_PLANS] = false
        it[Keys.UPLOAD_EXISTING_PLANS] = false
        it.remove(Keys.UPLOAD_PLANS_CONSENT_SINCE)
        it[Keys.HEALTH_METRICS_SYNC_ENABLED] = false
    }
    suspend fun finishRestore() = context.dataStore.edit { it[Keys.RESTORE_IN_PROGRESS] = false }
    suspend fun setUploadActivitiesEnabled(enabled: Boolean) = context.dataStore.edit {
        if (enabled && it[Keys.UPLOAD_ACTIVITIES] != true) it[Keys.UPLOAD_ACTIVITIES_CONSENT_SINCE] = System.currentTimeMillis()
        if (!enabled) { it.remove(Keys.UPLOAD_ACTIVITIES_CONSENT_SINCE); it[Keys.UPLOAD_EXISTING_ACTIVITIES] = false }
        it[Keys.UPLOAD_ACTIVITIES] = enabled
    }
    suspend fun setUploadExistingActivitiesEnabled(enabled: Boolean) = context.dataStore.edit {
        require(!enabled || it[Keys.UPLOAD_ACTIVITIES] == true)
        it[Keys.UPLOAD_EXISTING_ACTIVITIES] = enabled
    }
    suspend fun setUploadPlansEnabled(enabled: Boolean) = context.dataStore.edit {
        if (enabled && it[Keys.UPLOAD_PLANS] != true) it[Keys.UPLOAD_PLANS_CONSENT_SINCE] = System.currentTimeMillis()
        if (!enabled) {
            it.remove(Keys.UPLOAD_PLANS_CONSENT_SINCE)
            it[Keys.UPLOAD_EXISTING_PLANS] = false
        }
        it[Keys.UPLOAD_PLANS] = enabled
    }
    suspend fun setUploadExistingPlansEnabled(enabled: Boolean) = context.dataStore.edit {
        require(!enabled || it[Keys.UPLOAD_PLANS] == true) { "Enable plan uploads first" }
        it[Keys.UPLOAD_EXISTING_PLANS] = enabled
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

    suspend fun setUploadCooldownUntil(at: Long) =
        context.dataStore.edit { it[Keys.UPLOAD_COOLDOWN_UNTIL] = at }

    /**
     * Stable provenance for "this account successfully hydrated its profile from
     * this server origin". A row inherited from another account or origin is
     * never treated as a signed-in server profile.
     */
    fun profileHydrationKey(userId: String?, serverUrl: String): String {
        val origin = com.runflow2.app.data.net.Api.normalizeServerUrl(serverUrl)
        return "${userId?.trim().orEmpty()}@$origin"
    }

    suspend fun markProfileHydrated(key: String) = context.dataStore.edit {
        it[Keys.PROFILE_HYDRATION_KEY] = key
        it[Keys.PROFILE_HYDRATED_AT] = System.currentTimeMillis()
    }

    suspend fun clearProfileHydration() = context.dataStore.edit {
        it.remove(Keys.PROFILE_HYDRATION_KEY)
        it.remove(Keys.PROFILE_HYDRATED_AT)
    }

    suspend fun setGeneralReadCooldownUntil(at: Long) =
        context.dataStore.edit { it[Keys.GENERAL_READ_COOLDOWN_UNTIL] = at }

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

    /** Keep the earliest observed grant; HC does not expose its original grant date. */
    suspend fun observeHealthConnectGrant(at: Long = System.currentTimeMillis()) = context.dataStore.edit {
        val previous = it[Keys.HC_FIRST_GRANT_OBSERVED_AT] ?: 0L
        if (previous <= 0 || at < previous) it[Keys.HC_FIRST_GRANT_OBSERVED_AT] = at
    }

    /** Per-metric Health Connect import toggles feeding the readiness score. */
    suspend fun setHcRestingHrEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_RESTING_HR_ENABLED] = enabled }

    suspend fun setHcHrvEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_HRV_ENABLED] = enabled }

    suspend fun setHcSleepEnabled(enabled: Boolean) =
        context.dataStore.edit { it[Keys.HC_SLEEP_ENABLED] = enabled }

    /** When true, daily health metrics sync to the server for signed-in users. */
    suspend fun setHealthMetricsSyncEnabled(enabled: Boolean) = context.dataStore.edit {
        if (enabled && it[Keys.HEALTH_METRICS_SYNC_ENABLED] != true) it[Keys.HEALTH_METRICS_CONSENT_SINCE] = System.currentTimeMillis()
        if (!enabled) { it.remove(Keys.HEALTH_METRICS_CONSENT_SINCE); it[Keys.UPLOAD_EXISTING_HEALTH] = false }
        it[Keys.HEALTH_METRICS_SYNC_ENABLED] = enabled
    }
    suspend fun setUploadExistingHealthEnabled(enabled: Boolean) = context.dataStore.edit {
        require(!enabled || it[Keys.HEALTH_METRICS_SYNC_ENABLED] == true)
        it[Keys.UPLOAD_EXISTING_HEALTH] = enabled
    }

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

    /** Which readiness-scoring engine version produced the cached scores (0 = pre-continuous). */
    suspend fun readinessScoreEngine(): Int =
        context.dataStore.data.first()[Keys.READINESS_SCORE_ENGINE] ?: 0

    suspend fun setReadinessScoreEngine(version: Int) =
        context.dataStore.edit { it[Keys.READINESS_SCORE_ENGINE] = version }

    // ---- server two-metric snapshot (VDOT + aerobic VO2max) ----

    /**
     * The server's last two-metric computation, or null when it was never
     * fetched. Freshness is decided by [com.runflow2.app.domain.analytics.ServerMetrics]
     * at read time, not here.
     */
    suspend fun serverMetricsSnapshotOnce(): ServerMetricSnapshot? {
        val p = context.dataStore.data.first()
        val vdot = p[Keys.SERVER_METRICS_VDOT] ?: return null
        val computedAt = p[Keys.SERVER_METRICS_COMPUTED_AT] ?: return null
        return ServerMetricSnapshot(
            bestEffortVdot = vdot,
            aerobicVo2max = p[Keys.SERVER_METRICS_AEROBIC_VO2MAX],
            computedAtMs = computedAt,
        )
    }

    /** Replaces the cached snapshot; a null aerobic value clears the previous one. */
    suspend fun clearServerMetrics() = context.dataStore.edit {
        it.remove(Keys.SERVER_METRICS_VDOT)
        it.remove(Keys.SERVER_METRICS_AEROBIC_VO2MAX)
        it.remove(Keys.SERVER_METRICS_COMPUTED_AT)
    }

    suspend fun setServerMetrics(snapshot: ServerMetricSnapshot) = context.dataStore.edit {
        it[Keys.SERVER_METRICS_VDOT] = snapshot.bestEffortVdot
        it[Keys.SERVER_METRICS_COMPUTED_AT] = snapshot.computedAtMs
        if (snapshot.aerobicVo2max != null) {
            it[Keys.SERVER_METRICS_AEROBIC_VO2MAX] = snapshot.aerobicVo2max
        } else {
            it.remove(Keys.SERVER_METRICS_AEROBIC_VO2MAX)
        }
    }

    // ---- cycling FTP settings ----

    suspend fun setFtpWatts(watts: Int) = context.dataStore.edit {
        it[Keys.FTP_WATTS] = watts
    }

    suspend fun setAutoEstimateFtp(enabled: Boolean) = context.dataStore.edit {
        it[Keys.AUTO_ESTIMATE_FTP] = enabled
    }

    suspend fun setCyclingFtpSettings(watts: Int, autoEstimate: Boolean) = context.dataStore.edit {
        it[Keys.FTP_WATTS] = watts
        it[Keys.AUTO_ESTIMATE_FTP] = autoEstimate
    }

    // ---- analytics: marathon shape, MyWhoosh matching & VO2max calibration ----

    /** When true, rides/swims count toward the marathon-shape cross-training component. */
    suspend fun setIncludeCrossTraining(enabled: Boolean) = context.dataStore.edit {
        it[Keys.INCLUDE_CROSS_TRAINING] = enabled
    }

    /** When true, cycling workouts match to the closest MyWhoosh workout & enable custom .zwo export. */
    suspend fun setMatchToMyWhoosh(enabled: Boolean) = context.dataStore.edit {
        it[Keys.MATCH_TO_MY_WHOOSH] = enabled
    }

    /** Effective-VO2max calibration multiplier applied to the HR-based aerobic VO2max. */
    suspend fun setEffectiveVo2maxCorrection(factor: Double) = context.dataStore.edit {
        it[Keys.EFFECTIVE_VO2MAX_CORRECTION] = factor
    }

    // ---- load & UI preference sync ----

    /** Sets the primary load metric: "TSS", "DUAL", or "TRIMP" (Decision U1). */
    suspend fun setPrimaryLoadMetric(mode: String) = context.dataStore.edit {
        it[Keys.PRIMARY_LOAD_METRIC] = mode
    }

    /** Sets the effort card display mode: "WEEK_AND_MONTH", "WEEK_ONLY", "LEGACY_KM". */
    suspend fun setEffortCardMode(mode: String) = context.dataStore.edit {
        it[Keys.EFFORT_CARD_MODE] = mode
    }
}

internal fun AppSettings.mayUploadActivity(startDate: Long): Boolean = connectionEnabled && uploadActivitiesEnabled &&
    uploadActivitiesConsentSince > 0L && (uploadExistingActivitiesEnabled || startDate > uploadActivitiesConsentSince)

internal fun AppSettings.mayUploadHealthDate(date: String): Boolean {
    if (!connectionEnabled || !healthMetricsSyncEnabled || healthMetricsConsentSince <= 0L) return false
    if (uploadExistingHealthEnabled) return true
    val consentDay = java.time.Instant.ofEpochMilli(healthMetricsConsentSince).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
    return runCatching { java.time.LocalDate.parse(date).isAfter(consentDay) }.getOrDefault(false)
}
