package com.runflow2.app.data.health

import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.repo.RunFlowRepository
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * One running session read from Health Connect — the transfer type between
 * the Health Connect SDK records and the local [ActivityEntity]. Kept free of
 * SDK/Android types so mapping + dedupe are unit-testable.
 */
data class HcRunSnapshot(
    val recordId: String,
    val title: String?,
    val startEpochMs: Long,
    val endEpochMs: Long,
    val distanceMeters: Double,
    val steps: Long?,
    val avgHr: Int?,
    val maxHr: Int?,
    val elevationMeters: Double?,
    val caloriesKcal: Int?,
)

/**
 * One resting-HR reading (Health Connect stores one per measurement, not a
 * continuous stream). [day] is the local calendar date of [epochMs].
 */
data class HcRhrSample(val day: LocalDate, val bpm: Double, val epochMs: Long)

/**
 * One HRV (RMSSD) reading. Like resting HR: point samples, aggregated to one
 * value per day — the LAST sample of the day wins (wearables refine the
 * nightly reading towards the morning; the final value is the considered one).
 */
data class HcHrvSample(val day: LocalDate, val rmssdMs: Double, val epochMs: Long)

/** Which tracked bucket a sleep stage falls into; everything else is ignored. */
enum class HcSleepStageKind { DEEP, REM, LIGHT, OTHER }

/** One sleep stage inside a session (SDK Stage reduced to ms + bucket). */
data class HcSleepStage(val startEpochMs: Long, val endEpochMs: Long, val kind: HcSleepStageKind)

/**
 * One sleep session with its stage minutes already summed. [totalMinutes] is
 * the wall-clock session length (start..end) and can exceed deep+rem+light —
 * awake time inside the session is deliberately not redistributed.
 */
data class HcSleepSession(
    val startEpochMs: Long,
    val endEpochMs: Long,
    val deepMinutes: Int,
    val remMinutes: Int,
    val lightMinutes: Int,
    val totalMinutes: Int,
)

/** Aggregated per-day sleep minutes — the daily_entries sleep columns. */
data class HcSleepAggregate(
    val sleepMinutes: Int,
    val deepMinutes: Int,
    val remMinutes: Int,
    val lightMinutes: Int,
)

/**
 * Pure mapping/dedupe logic for the Health Connect import.
 * [isDuplicate] implements two layers of protection:
 *  1. the Health Connect record id — a re-import of the same session never
 *     lands twice;
 *  2. a fuzzy start-time + distance match — a session already recorded by
 *     RunFlow itself, synced from the server, or imported from another source
 *     app writing the same workout into Health Connect is skipped.
 */
object HealthConnectMapping {

    /** Sessions must be at least this long/far to be worth importing. */
    const val MIN_IMPORT_DISTANCE_M = 1000.0
    const val MIN_IMPORT_DURATION_SEC = 300

    const val DUPLICATE_START_TOLERANCE_MS = 2 * 60 * 1000L
    const val DUPLICATE_DISTANCE_TOLERANCE = 0.10

    fun movingTimeSec(s: HcRunSnapshot): Int =
        ((s.endEpochMs - s.startEpochMs) / 1000L).toInt().coerceAtLeast(1)

    fun isImportable(s: HcRunSnapshot): Boolean =
        s.distanceMeters >= MIN_IMPORT_DISTANCE_M &&
            movingTimeSec(s) >= MIN_IMPORT_DURATION_SEC

    /**
     * True when the session is already known: by Health Connect record id, or
     * by a start-time neighbour (±2 min) whose distance is within ±10%.
     */
    fun isDuplicate(
        s: HcRunSnapshot,
        existingByRecordId: ActivityEntity?,
        sameStartWindow: List<ActivityEntity>,
    ): Boolean {
        if (existingByRecordId != null) return true
        return sameStartWindow.any { e ->
            e.distanceMeters > 0 &&
                abs(e.distanceMeters - s.distanceMeters) / max(e.distanceMeters, s.distanceMeters) <=
                DUPLICATE_DISTANCE_TOLERANCE
        }
    }

    fun defaultName(s: HcRunSnapshot): String {
        val date = Instant.ofEpochMilli(s.startEpochMs).atZone(ZoneId.systemDefault()).toLocalDate()
        return "Run ${Format.dateWithYear(date)} · ${Format.oneDecimal(s.distanceMeters / 1000.0)} km"
    }

    fun toActivityEntity(s: HcRunSnapshot, id: String = UUID.randomUUID().toString(), weightKg: Double = 72.0): ActivityEntity {
        val moving = movingTimeSec(s)
        val km = s.distanceMeters / 1000.0
        return ActivityEntity(
            id = id,
            name = s.title?.takeIf { it.isNotBlank() } ?: defaultName(s),
            type = "RUN",
            startDate = s.startEpochMs,
            distanceMeters = s.distanceMeters,
            movingTimeSec = moving,
            averageHr = s.avgHr?.toDouble(),
            maxHr = s.maxHr,
            averageCadence = s.steps?.let { st -> if (moving > 0) st * 60.0 / moving else null },
            totalElevation = s.elevationMeters ?: 0.0,
            // Source apps that don't write TotalCaloriesBurned leave kcal null —
            // fall back to the MET estimate instead of importing calorie-less runs.
            calories = s.caloriesKcal ?: estimateCalories(s, weightKg),
            trimp = 0.0,
            trainingType = null,
            estimatedVdot = RunFlowRepository.estimateVdot(km, moving),
            routeJson = null,
            lapsJson = null,
            hcRecordId = s.recordId,
        )
    }

    /** MET fallback for sessions whose source app wrote no calorie records. */
    fun estimateCalories(s: HcRunSnapshot, weightKg: Double = 72.0): Int? =
        com.runflow2.app.core.math.CalorieMath.estimate(movingTimeSec(s), s.distanceMeters, weightKg)

    // ---- daily recovery metrics (readiness inputs) ----

    /** Sessions shorter than this are naps — they don't count as nightly sleep. */
    const val MIN_SLEEP_SESSION_MINUTES = 180

    /** Per-day resting HR: the MINIMUM reading of the day (lowest = most rested). */
    fun aggregateRestingHr(samples: List<HcRhrSample>): Map<LocalDate, Double> =
        samples.groupBy { it.day }.mapValues { (_, day) -> day.minOf { it.bpm } }

    /** Per-day HRV: the LAST sample of the day (max epochMs) — see [HcHrvSample]. */
    fun aggregateHrv(samples: List<HcHrvSample>): Map<LocalDate, Double> =
        samples.groupBy { it.day }.mapValues { (_, day) -> day.maxBy { it.epochMs }.rmssdMs }

    /**
     * Builds a session from its stages: sums the tracked stage minutes and
     * guards untracked/malformed stages (awake, out-of-bed, zero-length) —
     * they contribute nothing instead of crashing or double-counting.
     */
    fun toSleepSession(startEpochMs: Long, endEpochMs: Long, stages: List<HcSleepStage>): HcSleepSession {
        fun minutesOf(kind: HcSleepStageKind) = stages
            .filter { it.kind == kind && it.endEpochMs > it.startEpochMs }
            .sumOf { ((it.endEpochMs - it.startEpochMs) / 60_000L).toInt() }
        return HcSleepSession(
            startEpochMs = startEpochMs,
            endEpochMs = endEpochMs,
            deepMinutes = minutesOf(HcSleepStageKind.DEEP),
            remMinutes = minutesOf(HcSleepStageKind.REM),
            lightMinutes = minutesOf(HcSleepStageKind.LIGHT),
            totalMinutes = ((endEpochMs - startEpochMs) / 60_000L).coerceAtLeast(0).toInt(),
        )
    }

    /**
     * Per-day sleep aggregation. Sessions shorter than [MIN_SLEEP_SESSION_MINUTES]
     * are naps and dropped; a session belongs ENTIRELY to the local calendar
     * date of its END (wake-morning attribution) — the night's sleep shows up
     * on the morning you woke, so sessions crossing midnight are not split.
     */
    fun aggregateSleep(sessions: List<HcSleepSession>, zone: ZoneId = ZoneId.systemDefault()): Map<LocalDate, HcSleepAggregate> =
        sessions.asSequence()
            .filter { it.totalMinutes >= MIN_SLEEP_SESSION_MINUTES }
            .groupBy { Instant.ofEpochMilli(it.endEpochMs).atZone(zone).toLocalDate() }
            .mapValues { (_, day) ->
                HcSleepAggregate(
                    sleepMinutes = day.sumOf { it.totalMinutes },
                    deepMinutes = day.sumOf { it.deepMinutes },
                    remMinutes = day.sumOf { it.remMinutes },
                    lightMinutes = day.sumOf { it.lightMinutes },
                )
            }

    /**
     * Merges one day's Health-Connect aggregates into a daily entry, returning
     * the row to upsert. The merge rule, precisely:
     *  - a manually edited row (manuallyEdited = true) is fully user-owned —
     *    nothing is written, updatedAt/dirty stay untouched;
     *  - otherwise HC fills ONLY null fields and refreshes stale HC-written
     *    ones (source* == "hc"); a field whose source is "manual" is never
     *    overwritten (defensive — manual edits also set manuallyEdited);
     *  - source* = "hc" is stamped only on fields HC actually wrote;
     *  - dirty flips true and updatedAt moves to [nowMs] whenever any field
     *    changed; a no-op merge returns [existing] unchanged;
     *  - subjective fields (exhaustion/soreness/stress/note) and the cached
     *    readiness score are carried over as-is.
     * Sleep is one field group: all four minute columns are written together
     * under sourceSleep. The caller only merges days that have data, so a
     * missing row plus a present metric creates a new entry (dirty = true).
     */
    fun mergeIntoEntry(
        existing: DailyEntryEntity?,
        day: LocalDate,
        rhr: Double?,
        hrv: Double?,
        sleep: HcSleepAggregate?,
        nowMs: Long = System.currentTimeMillis(),
    ): DailyEntryEntity {
        val newRhr = rhr?.roundToInt()
        if (existing == null) {
            return DailyEntryEntity(
                date = day.toString(),
                restingHr = newRhr,
                hrvMs = hrv,
                sleepMinutes = sleep?.sleepMinutes,
                deepMinutes = sleep?.deepMinutes,
                remMinutes = sleep?.remMinutes,
                lightMinutes = sleep?.lightMinutes,
                exhaustionLevel = null,
                muscleSoreness = null,
                stressLevel = null,
                note = null,
                sourceRhr = if (newRhr != null) "hc" else null,
                sourceHrv = if (hrv != null) "hc" else null,
                sourceSleep = if (sleep != null) "hc" else null,
                manuallyEdited = false,
                updatedAt = nowMs,
                dirty = true,
                score = null,
                state = null,
                confidence = null,
                componentScoresJson = null,
            )
        }
        if (existing.manuallyEdited) return existing

        var changed = false
        var restingHr = existing.restingHr
        var sourceRhr = existing.sourceRhr
        var hrvMs = existing.hrvMs
        var sourceHrv = existing.sourceHrv
        var sleepMinutes = existing.sleepMinutes
        var deepMinutes = existing.deepMinutes
        var remMinutes = existing.remMinutes
        var lightMinutes = existing.lightMinutes
        var sourceSleep = existing.sourceSleep

        if (newRhr != null && existing.sourceRhr != "manual" && newRhr != existing.restingHr) {
            restingHr = newRhr
            sourceRhr = "hc"
            changed = true
        }
        if (hrv != null && existing.sourceHrv != "manual" && hrv != existing.hrvMs) {
            hrvMs = hrv
            sourceHrv = "hc"
            changed = true
        }
        if (sleep != null && existing.sourceSleep != "manual" && sleep != existing.sleepAggregate()) {
            sleepMinutes = sleep.sleepMinutes
            deepMinutes = sleep.deepMinutes
            remMinutes = sleep.remMinutes
            lightMinutes = sleep.lightMinutes
            sourceSleep = "hc"
            changed = true
        }
        if (!changed) return existing
        return existing.copy(
            restingHr = restingHr,
            hrvMs = hrvMs,
            sleepMinutes = sleepMinutes,
            deepMinutes = deepMinutes,
            remMinutes = remMinutes,
            lightMinutes = lightMinutes,
            sourceRhr = sourceRhr,
            sourceHrv = sourceHrv,
            sourceSleep = sourceSleep,
            updatedAt = nowMs,
            dirty = true,
        )
    }

    private fun DailyEntryEntity.sleepAggregate() = HcSleepAggregate(
        sleepMinutes = sleepMinutes ?: 0,
        deepMinutes = deepMinutes ?: 0,
        remMinutes = remMinutes ?: 0,
        lightMinutes = lightMinutes ?: 0,
    )
}
