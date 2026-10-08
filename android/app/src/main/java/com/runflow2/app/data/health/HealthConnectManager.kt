package com.runflow2.app.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.repo.SettingsRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Read-only Health Connect integration: pulls runs and daily recovery metrics into the local DB. */
class HealthConnectManager(
    private val appContext: Context,
    private val repository: RunFlowRepository,
    private val settings: SettingsRepository,
) {

    /** Serializes imports across Settings, SyncWorker and startup callers. */
    private val importMutex = Mutex()

    /** Run-import read permissions: the session plus the metrics read from its window. */
    val activityPermissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ElevationGainedRecord::class),
    )

    /** Daily recovery metric read permissions (resting HR / HRV / sleep → readiness inputs). */
    val healthPermissions = setOf(
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
    )

    /** The read permissions the import needs — also the request set in Settings. */
    val permissions = activityPermissions + healthPermissions

    sealed interface Availability {
        data object Available : Availability
        /** Not installed / needs setup on this device. */
        data object Unavailable : Availability
    }

    /** Session types treated as a run. */
    private val runningTypes = setOf(
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL,
    )

    fun availability(): Availability =
        if (HealthConnectClient.getSdkStatus(appContext) == HealthConnectClient.SDK_AVAILABLE) {
            Availability.Available
        } else {
            Availability.Unavailable
        }

    fun clientOrNull(): HealthConnectClient? =
        if (availability() == Availability.Available) HealthConnectClient.getOrCreate(appContext) else null

    /** True when the FULL set is granted — the Settings screen's granted indicator. */
    suspend fun hasAllPermissions(client: HealthConnectClient): Boolean =
        client.permissionController.getGrantedPermissions().containsAll(permissions)

    sealed interface ImportResult {
        data class Imported(val imported: Int, val duplicates: Int) : ImportResult
        data object NoPermission : ImportResult
        data object Unavailable : ImportResult
        data class Failed(val message: String) : ImportResult
    }

    /** Re-import overlap so late-written records are still picked up. */
    private val reimportWindowMs = 7L * 24 * 3600 * 1000
    /** First-ever import reach-back. */
    private val initialWindowMs = 90L * 24 * 3600 * 1000

    /** Runs the import when the run toggle or any metric toggle is enabled; cheap no-op otherwise. */
    suspend fun importIfEnabled(): ImportResult {
        val s = settings.settingsOnce()
        if (!s.healthConnectImportEnabled && !s.hcRestingHrEnabled && !s.hcHrvEnabled && !s.hcSleepEnabled) {
            return ImportResult.Unavailable
        }
        return importInternal(
            runs = s.healthConnectImportEnabled,
            restingHr = s.hcRestingHrEnabled,
            hrv = s.hcHrvEnabled,
            sleep = s.hcSleepEnabled,
        )
    }

    /**
     * Reads running sessions from Health Connect and stores every new one as
     * a local activity (queued for server upload when signed in). Idempotent:
     * the record id + fuzzy duplicate check make re-runs free of duplicates.
     */
    suspend fun importRuns(nowMs: Long = System.currentTimeMillis()): ImportResult =
        importInternal(runs = true, restingHr = false, hrv = false, sleep = false, nowMs = nowMs)

    /**
     * Reads the daily recovery metrics the hc*Enabled toggles ask for into the
     * daily_entries table. Gated per metric type on its own Health Connect
     * permission — a device that writes only sleep must not block the
     * resting-HR import.
     */
    suspend fun importDailyMetrics(nowMs: Long = System.currentTimeMillis()): ImportResult {
        val s = settings.settingsOnce()
        return importInternal(
            runs = false,
            restingHr = s.hcRestingHrEnabled,
            hrv = s.hcHrvEnabled,
            sleep = s.hcSleepEnabled,
            nowMs = nowMs,
        )
    }

    /**
     * One mutex-serialized pass over everything requested. Runs and daily
     * metrics share the window derived from healthConnectLastImportAt and a
     * single combined last-import summary ("2 imported · RHR 30d · sleep 28d")
     * so interleaved imports can't overwrite each other's summary.
     */
    private suspend fun importInternal(
        runs: Boolean,
        restingHr: Boolean,
        hrv: Boolean,
        sleep: Boolean,
        nowMs: Long = System.currentTimeMillis(),
    ): ImportResult = withContext(Dispatchers.IO) {
        val client = clientOrNull() ?: run {
            AppLog.d(TAG, "import skipped — Health Connect unavailable")
            return@withContext ImportResult.Unavailable
        }

        // Serialize all callers (Settings toggle, "Import now", SyncWorker):
        // two concurrent imports would both pass the record-id check before
        // either commits, inserting the same run twice — locally and, when
        // signed in, on the server. Daily metrics share the lock so the
        // shared window and summary can't race either.
        importMutex.withLock {
            try {
                // Inside try: getGrantedPermissions is a binder IPC into the
                // Health Connect service and can throw (provider updating,
                // process death) — callers from UI coroutines must not crash.
                val granted = client.permissionController.getGrantedPermissions()
                val last = settings.settingsOnce().healthConnectLastImportAt
                val sinceMs = (if (last > 0) last - reimportWindowMs else nowMs - initialWindowMs)
                    .coerceAtLeast(0)

                val summary = mutableListOf<String>()
                var imported = 0
                var duplicates = 0
                var runsDenied = false

                if (runs) {
                    if (!granted.containsAll(activityPermissions)) {
                        runsDenied = true
                        AppLog.d(TAG, "run import skipped — permissions not granted")
                    } else {
                        val (runImported, runDuplicates, runsPart) = importRunsLocked(client, sinceMs, nowMs)
                        imported = runImported
                        duplicates = runDuplicates
                        summary += runsPart
                    }
                }
                if (restingHr || hrv || sleep) {
                    importDailyMetricsLocked(client, granted, sinceMs, nowMs, restingHr, hrv, sleep, summary)
                }

                // Preserve the old contract: a run import without permissions
                // returns NoPermission and writes no summary.
                if (runsDenied && summary.isEmpty()) {
                    return@withLock ImportResult.NoPermission
                }
                val summaryText = when {
                    summary.isNotEmpty() -> summary.joinToString(" · ")
                    restingHr || hrv || sleep -> "no daily metrics"
                    else -> "no new runs"
                }
                settings.setHealthConnectLastImport(nowMs, summaryText)
                AppLog.i(TAG, "Health Connect import: $summaryText")
                ImportResult.Imported(imported, duplicates)
            } catch (e: Exception) {
                AppLog.w(TAG, "Health Connect import failed (${e.message})", e)
                ImportResult.Failed(e.message ?: "error")
            }
        }
    }

    /**
     * Reads the run sessions + their metrics over [sinceMs, now]. Must be
     * called under [importMutex]; returns (imported, duplicates, summary part).
     */
    private suspend fun importRunsLocked(
        client: HealthConnectClient,
        sinceMs: Long,
        nowMs: Long,
    ): Triple<Int, Int, String> {
        val range = TimeRangeFilter.between(
            Instant.ofEpochMilli(sinceMs),
            Instant.ofEpochMilli(nowMs + 60_000),
        )

        val sessions = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range))
            .records
            .filter { it.exerciseType in runningTypes }
            .sortedBy { it.startTime }
        if (sessions.isEmpty()) return Triple(0, 0, "no new runs")

        val distances = client.readRecords(ReadRecordsRequest(DistanceRecord::class, range)).records
        val steps = client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
        val heartRates = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records
        val elevations = client.readRecords(ReadRecordsRequest(ElevationGainedRecord::class, range)).records
        val calories = client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class, range)).records

        var imported = 0
        var duplicates = 0
        sessions.forEach { session ->
            val start = session.startTime
            val end = session.endTime
            if (!end.isAfter(start)) return@forEach

            // Only metrics from the SAME source app as the session:
            // two writer apps both syncing the same run (Garmin +
            // Strava is the classic setup) would otherwise sum to
            // double the real distance/steps/calories.
            val origin = session.metadata.dataOrigin
            fun <T> List<T>.fromOrigin(metadata: (T) -> androidx.health.connect.client.records.metadata.Metadata) =
                filter { metadata(it).dataOrigin == origin }

            val distance = distances.fromOrigin { it.metadata }
                .overlapping(start, end, { it.startTime }, { it.endTime })
                .sumOf { it.distance.inMeters }
            val stepCount = steps.fromOrigin { it.metadata }
                .overlapping(start, end, { it.startTime }, { it.endTime })
                .takeIf { it.isNotEmpty() }?.sumOf { it.count }
            val hrSamples = heartRates.fromOrigin { it.metadata }
                .overlapping(start, end, { it.startTime }, { it.endTime })
                .flatMap { r -> r.samples.filter { !it.time.isBefore(start) && !it.time.isAfter(end) } }
            val avgHr = hrSamples.takeIf { it.isNotEmpty() }?.let { list ->
                list.map { it.beatsPerMinute }.average().toInt()
            }
            val maxHr = hrSamples.maxOfOrNull { it.beatsPerMinute.toInt() }
            val elevation = elevations.fromOrigin { it.metadata }
                .overlapping(start, end, { it.startTime }, { it.endTime })
                .takeIf { it.isNotEmpty() }?.sumOf { it.elevation.inMeters }
            val kcal = calories.fromOrigin { it.metadata }
                .overlapping(start, end, { it.startTime }, { it.endTime })
                .takeIf { it.isNotEmpty() }?.sumOf { it.energy.inKilocalories }?.toInt()

            val snapshot = HcRunSnapshot(
                recordId = session.metadata.id,
                title = session.title,
                startEpochMs = start.toEpochMilli(),
                endEpochMs = end.toEpochMilli(),
                distanceMeters = distance,
                steps = stepCount,
                avgHr = avgHr,
                maxHr = maxHr,
                elevationMeters = elevation,
                caloriesKcal = kcal,
            )
            if (!HealthConnectMapping.isImportable(snapshot)) return@forEach

            val existingById = repository.activityByHcRecordId(snapshot.recordId)
            val neighbours = repository.activitiesBetweenStart(
                snapshot.startEpochMs - HealthConnectMapping.DUPLICATE_START_TOLERANCE_MS,
                snapshot.startEpochMs + HealthConnectMapping.DUPLICATE_START_TOLERANCE_MS,
            )
            if (HealthConnectMapping.isDuplicate(snapshot, existingById, neighbours)) {
                duplicates++
                return@forEach
            }
            repository.saveActivity(
                HealthConnectMapping.toActivityEntity(snapshot, weightKg = repository.profileOnce().weightKg)
            )
            imported++
        }

        val summary = if (imported == 0 && duplicates == 0) "no new runs"
        else "$imported imported" + if (duplicates > 0) " · $duplicates already known" else ""
        return Triple(imported, duplicates, summary)
    }

    /**
     * Reads the requested daily recovery metrics over the shared window and
     * merges them into daily_entries (one row per local day). Appends one
     * summary part per type that had data ("RHR 30d", "HRV 30d", "sleep 28d";
     * sleep counts only days whose sessions passed the nap filter) and returns
     * the number of daily rows actually written. Must be called under
     * [importMutex].
     */
    private suspend fun importDailyMetricsLocked(
        client: HealthConnectClient,
        granted: Set<String>,
        sinceMs: Long,
        nowMs: Long,
        wantRestingHr: Boolean,
        wantHrv: Boolean,
        wantSleep: Boolean,
        summary: MutableList<String>,
    ): Int {
        val zone = ZoneId.systemDefault()
        val range = TimeRangeFilter.between(
            Instant.ofEpochMilli(sinceMs),
            Instant.ofEpochMilli(nowMs + 60_000),
        )
        val rhrByDay = mutableMapOf<LocalDate, Double>()
        val hrvByDay = mutableMapOf<LocalDate, Double>()
        val sleepByDay = mutableMapOf<LocalDate, HcSleepAggregate>()

        if (wantRestingHr) {
            if (HealthPermission.getReadPermission(RestingHeartRateRecord::class) in granted) {
                rhrByDay += HealthConnectMapping.aggregateRestingHr(
                    client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records.map { r ->
                        HcRhrSample(
                            day = r.time.atZone(zone).toLocalDate(),
                            bpm = r.beatsPerMinute.toDouble(),
                            epochMs = r.time.toEpochMilli(),
                        )
                    },
                )
            } else {
                AppLog.d(TAG, "resting-HR import skipped — permission not granted")
            }
        }
        if (wantHrv) {
            if (HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class) in granted) {
                hrvByDay += HealthConnectMapping.aggregateHrv(
                    client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range)).records.map { r ->
                        HcHrvSample(
                            day = r.time.atZone(zone).toLocalDate(),
                            rmssdMs = r.heartRateVariabilityMillis,
                            epochMs = r.time.toEpochMilli(),
                        )
                    },
                )
            } else {
                AppLog.d(TAG, "HRV import skipped — permission not granted")
            }
        }
        if (wantSleep) {
            if (HealthPermission.getReadPermission(SleepSessionRecord::class) in granted) {
                sleepByDay += HealthConnectMapping.aggregateSleep(
                    client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records.map { s ->
                        HealthConnectMapping.toSleepSession(
                            startEpochMs = s.startTime.toEpochMilli(),
                            endEpochMs = s.endTime.toEpochMilli(),
                            stages = s.stages.map { st ->
                                HcSleepStage(
                                    startEpochMs = st.startTime.toEpochMilli(),
                                    endEpochMs = st.endTime.toEpochMilli(),
                                    kind = sleepStageKind(st.stage),
                                )
                            },
                        )
                    },
                )
            } else {
                AppLog.d(TAG, "sleep import skipped — permission not granted")
            }
        }

        var written = 0
        for (day in (rhrByDay.keys + hrvByDay.keys + sleepByDay.keys).sorted()) {
            val existing = repository.dailyEntryByDate(day.toString())
            val merged = HealthConnectMapping.mergeIntoEntry(
                existing = existing,
                day = day,
                rhr = rhrByDay[day],
                hrv = hrvByDay[day],
                sleep = sleepByDay[day],
            )
            // mergeIntoEntry returns the row unchanged when there is nothing
            // new — only write (and count) days that actually changed.
            if (merged != existing) {
                repository.saveDailyEntry(merged)
                written++
            }
        }

        if (rhrByDay.isNotEmpty()) summary += "RHR ${rhrByDay.size}d"
        if (hrvByDay.isNotEmpty()) summary += "HRV ${hrvByDay.size}d"
        if (sleepByDay.isNotEmpty()) summary += "sleep ${sleepByDay.size}d"
        return written
    }

    /** Stage types RunFlow doesn't track (awake, out-of-bed, unknown) fall into OTHER and are ignored. */
    private fun sleepStageKind(type: Int): HcSleepStageKind = when (type) {
        SleepSessionRecord.STAGE_TYPE_DEEP -> HcSleepStageKind.DEEP
        SleepSessionRecord.STAGE_TYPE_REM -> HcSleepStageKind.REM
        SleepSessionRecord.STAGE_TYPE_LIGHT -> HcSleepStageKind.LIGHT
        else -> HcSleepStageKind.OTHER
    }

    /** Records that overlap the session window ([IntervalRecord] is internal in the SDK). */
    private fun <T> List<T>.overlapping(
        start: Instant,
        end: Instant,
        startTime: (T) -> Instant,
        endTime: (T) -> Instant,
    ): List<T> = filter { startTime(it).isBefore(end) && endTime(it).isAfter(start) }

    private companion object {
        const val TAG = "HealthConnect"
    }
}
