package com.runflow2.app.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord

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

/** Read-only Health Connect integration: pulls runs into the local DB. */
class HealthConnectManager(
    private val appContext: Context,
    private val repository: RunFlowRepository,
    private val settings: SettingsRepository,
) {

    /** Serializes imports across Settings, SyncWorker and startup callers. */
    private val importMutex = Mutex()

    /** The read permissions the import needs — also the request set in Settings. */
    val permissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ElevationGainedRecord::class),
    )

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

    /** Runs the import when the setting is enabled; cheap no-op otherwise. */
    suspend fun importIfEnabled(): ImportResult {
        val s = settings.settingsOnce()
        if (!s.healthConnectImportEnabled) return ImportResult.Unavailable
        return importRuns()
    }

    /**
     * Reads running sessions from Health Connect and stores every new one as
     * a local activity (queued for server upload when signed in). Idempotent:
     * the record id + fuzzy duplicate check make re-runs free of duplicates.
     */
    suspend fun importRuns(nowMs: Long = System.currentTimeMillis()): ImportResult = withContext(Dispatchers.IO) {
        val client = clientOrNull() ?: run {
            AppLog.d(TAG, "import skipped — Health Connect unavailable")
            return@withContext ImportResult.Unavailable
        }

        // Serialize all callers (Settings toggle, "Import now", SyncWorker):
        // two concurrent imports would both pass the record-id check before
        // either commits, inserting the same run twice — locally and, when
        // signed in, on the server.
        importMutex.withLock {
            try {
                // Inside try: getGrantedPermissions is a binder IPC into the
                // Health Connect service and can throw (provider updating,
                // process death) — callers from UI coroutines must not crash.
                if (!hasAllPermissions(client)) {
                    AppLog.d(TAG, "import skipped — permissions not granted")
                    return@withLock ImportResult.NoPermission
                }
                val last = settings.settingsOnce().healthConnectLastImportAt
                val sinceMs = (if (last > 0) last - reimportWindowMs else nowMs - initialWindowMs)
                    .coerceAtLeast(0)
                val range = TimeRangeFilter.between(
                    Instant.ofEpochMilli(sinceMs),
                    Instant.ofEpochMilli(nowMs + 60_000),
                )

                val sessions = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range))
                    .records
                    .filter { it.exerciseType in runningTypes }
                    .sortedBy { it.startTime }
                if (sessions.isEmpty()) {
                    settings.setHealthConnectLastImport(nowMs, "no new runs")
                    return@withLock ImportResult.Imported(0, 0)
                }

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
                    repository.saveActivity(HealthConnectMapping.toActivityEntity(snapshot))
                    imported++
                }

                val summary = if (imported == 0 && duplicates == 0) "no new runs"
                else "$imported imported" + if (duplicates > 0) " · $duplicates already known" else ""
                settings.setHealthConnectLastImport(nowMs, summary)
                AppLog.i(TAG, "Health Connect import: $summary")
                ImportResult.Imported(imported, duplicates)
            } catch (e: Exception) {
                AppLog.w(TAG, "Health Connect import failed (${e.message})", e)
                ImportResult.Failed(e.message ?: "error")
            }
        }
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
