package com.runflow2.app.domain.plan

import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.WorkoutEntity
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

/**
 * 3-Color Plan Compliance Engine (Task 1.5 / Decision U5):
 * - Green (ON_TARGET): 0.85 .. 1.15 ratio
 * - Amber (DEVIATED): 0.60 .. 0.85 or 1.15 .. 1.35 ratio
 * - Red (OFF_TARGET): < 0.60 or > 1.35 ratio
 * - Missed, Completed unlinked, and Pending statuses
 */
object ComplianceCalculator {

    enum class ComplianceStatus {
        ON_TARGET,
        DEVIATED,
        OFF_TARGET,
        MISSED,
        COMPLETED_UNLINKED,
        PENDING,
    }

    enum class ComplianceColor {
        GREEN,
        AMBER,
        RED,
        GRAY,
    }

    data class WorkoutCompliance(
        val status: ComplianceStatus,
        val color: ComplianceColor,
        val ratio: Double?,
        val label: String,
    )

    data class WeeklyCompliance(
        val plannedTss: Double,
        val actualTss: Double,
        val plannedKm: Double,
        val actualKm: Double,
        val plannedDurationSec: Int,
        val actualDurationSec: Int,
        val completedCount: Int,
        val totalCount: Int,
        val complianceRatio: Double,
        val compliancePct: Int,
        val status: ComplianceStatus,
        val statusColor: ComplianceColor,
    )

    fun evaluateRatio(ratio: Double): Pair<ComplianceStatus, ComplianceColor> {
        return when {
            ratio in 0.85..1.15 -> ComplianceStatus.ON_TARGET to ComplianceColor.GREEN
            (ratio in 0.60..<0.85) || (ratio in 1.15..1.35) -> ComplianceStatus.DEVIATED to ComplianceColor.AMBER
            else -> ComplianceStatus.OFF_TARGET to ComplianceColor.RED
        }
    }

    private fun epochMillisToLocalDate(epochMs: Long, zoneId: ZoneId): LocalDate {
        return Instant.ofEpochMilli(epochMs).atZone(zoneId).toLocalDate()
    }

    fun calculateWorkoutCompliance(
        workout: WorkoutEntity,
        actualActivity: ActivityEntity? = null,
        today: LocalDate = LocalDate.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): WorkoutCompliance {
        val schedDate = epochMillisToLocalDate(workout.scheduledDate, zoneId)
        val isPast = schedDate.isBefore(today)

        if (!workout.isCompleted) {
            return if (isPast) {
                WorkoutCompliance(
                    status = ComplianceStatus.MISSED,
                    color = ComplianceColor.RED,
                    ratio = 0.0,
                    label = "Missed",
                )
            } else {
                WorkoutCompliance(
                    status = ComplianceStatus.PENDING,
                    color = ComplianceColor.GRAY,
                    ratio = null,
                    label = "Upcoming",
                )
            }
        }

        // Workout is completed
        val hasLinked = !workout.activityId.isNullOrBlank() || actualActivity != null
        if (!hasLinked) {
            return WorkoutCompliance(
                status = ComplianceStatus.COMPLETED_UNLINKED,
                color = ComplianceColor.GREEN,
                ratio = 1.0,
                label = "Completed (unlinked)",
            )
        }

        // Determine actual values from linked activity
        val plannedTss = workout.plannedTss ?: 0.0
        val actualTss = actualActivity?.let { a ->
            a.bikeTss ?: (if (a.trimp > 0) (a.trimp * 0.85) else 0.0)
        } ?: 0.0

        val plannedKm = workout.targetDistanceKm ?: 0.0
        val actualKm = actualActivity?.distanceKm ?: 0.0

        val plannedDur = workout.targetDurationSec ?: 0
        val actualDur = actualActivity?.movingTimeSec ?: 0

        var ratio: Double? = null
        if (plannedTss > 0.0 && actualTss > 0.0) {
            ratio = actualTss / plannedTss
        } else if (plannedKm > 0.0 && actualKm > 0.0) {
            ratio = actualKm / plannedKm
        } else if (plannedDur > 0 && actualDur > 0) {
            ratio = actualDur.toDouble() / plannedDur.toDouble()
        } else {
            ratio = 1.0
        }

        val (status, color) = evaluateRatio(ratio)
        val roundedRatio = (ratio * 100.0).roundToInt() / 100.0
        val label = when (status) {
            ComplianceStatus.ON_TARGET -> "On Target"
            ComplianceStatus.DEVIATED -> "Deviated"
            else -> "Off Target"
        }

        return WorkoutCompliance(
            status = status,
            color = color,
            ratio = roundedRatio,
            label = label,
        )
    }

    fun calculateWeeklyCompliance(
        workouts: List<WorkoutEntity>,
        activitiesById: Map<String, ActivityEntity> = emptyMap(),
        today: LocalDate = LocalDate.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): WeeklyCompliance {
        var plannedTss = 0.0
        var actualTss = 0.0
        var plannedKm = 0.0
        var actualKm = 0.0
        var plannedDur = 0
        var actualDur = 0
        var completedCount = 0

        for (w in workouts) {
            val pTss = w.plannedTss ?: 0.0
            val pKm = w.targetDistanceKm ?: 0.0
            val pDur = w.targetDurationSec ?: 0

            plannedTss += pTss
            plannedKm += pKm
            plannedDur += pDur

            if (w.isCompleted) {
                completedCount++
                val act = w.activityId?.let { activitiesById[it] }
                if (act != null) {
                    val aTss = act.bikeTss ?: (if (act.trimp > 0) act.trimp * 0.85 else 0.0)
                    actualTss += if (aTss > 0.0) aTss else pTss
                    actualKm += act.distanceKm
                    actualDur += act.movingTimeSec
                } else {
                    actualTss += pTss
                    actualKm += pKm
                    actualDur += pDur
                }
            }
        }

        var complianceRatio = 0.0
        if (plannedTss > 0.0) {
            complianceRatio = actualTss / plannedTss
        } else if (plannedKm > 0.0) {
            complianceRatio = actualKm / plannedKm
        } else if (plannedDur > 0) {
            complianceRatio = actualDur.toDouble() / plannedDur.toDouble()
        } else if (workouts.isNotEmpty()) {
            complianceRatio = completedCount.toDouble() / workouts.size.toDouble()
        }

        val compliancePct = (complianceRatio * 100.0).roundToInt()
        val (status, color) = evaluateRatio(complianceRatio)

        return WeeklyCompliance(
            plannedTss = (plannedTss * 10.0).roundToInt() / 10.0,
            actualTss = (actualTss * 10.0).roundToInt() / 10.0,
            plannedKm = (plannedKm * 10.0).roundToInt() / 10.0,
            actualKm = (actualKm * 10.0).roundToInt() / 10.0,
            plannedDurationSec = plannedDur,
            actualDurationSec = actualDur,
            completedCount = completedCount,
            totalCount = workouts.size,
            complianceRatio = (complianceRatio * 100.0).roundToInt() / 100.0,
            compliancePct = compliancePct,
            status = status,
            statusColor = color,
        )
    }
}
