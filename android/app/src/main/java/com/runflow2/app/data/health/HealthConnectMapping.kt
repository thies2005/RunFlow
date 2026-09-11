package com.runflow2.app.data.health

import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.repo.RunFlowRepository
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import kotlin.math.abs
import kotlin.math.max

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

    fun toActivityEntity(s: HcRunSnapshot, id: String = UUID.randomUUID().toString()): ActivityEntity {
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
            calories = s.caloriesKcal,
            trimp = 0.0,
            trainingType = null,
            estimatedVdot = RunFlowRepository.estimateVdot(km, moving),
            routeJson = null,
            lapsJson = null,
            hcRecordId = s.recordId,
        )
    }
}
