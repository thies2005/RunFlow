package com.runflow2.app.core.math

import java.time.LocalDate
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * Marathon shape — faithful port of the web's calculateMarathonShape
 * (Web/src/lib/metrics/runalyze.ts): a 66.7% mileage / 33.3% long-run
 * composite, switching to 50% mileage / 25% long runs / 25% cross-training
 * (coefficient 0.5) when cross-training activities exist. Always capped
 * at 100%.
 */
object MarathonShape {

    /** Minimal run view (web ActivityForShape subset). */
    data class Run(val date: LocalDate, val distanceKm: Double)

    /** Minimal cross-training view: zone seconds, else moving time (web parity). */
    data class CrossTraining(val date: LocalDate, val movingTimeSec: Int, val zoneSeconds: List<Int>)

    data class Result(
        val shape: Int,
        val mileageScore: Double,
        val longRunScore: Double,
        val crossTrainingScore: Double,
        val avgWeeklyKm: Double,
        val targetWeeklyKm: Double,
        val longRunPoints: Double,
        val crossTrainingMinutes: Double,
    )

    private const val MILEAGE_WEIGHT = 2.0 / 3.0
    private const val LONG_RUN_WEIGHT = 1.0 / 3.0
    private const val CT_MILEAGE_WEIGHT = 0.50
    private const val CT_LONG_RUN_WEIGHT = 0.25
    private const val CT_AEROBIC_WEIGHT = 0.25
    private const val CT_COEFFICIENT = 0.5
    private const val COMPONENT_CAP = 120.0
    private const val CT_SCORE_CAP = 100.0
    private const val CT_TARGET_WEEKLY_MINUTES = 300.0
    private const val SHAPE_CAP = 100.0

    fun calculate(
        runs: List<Run>,
        crossTraining: List<CrossTraining>,
        effectiveVdot: Double,
        today: LocalDate,
    ): Result {
        if (runs.isEmpty() || effectiveVdot <= 0.0) {
            return Result(0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        }

        // === MILEAGE: avg weekly km over the last 26 weeks vs vdot-km target ===
        val sixMonthsAgo = today.minusDays(182)
        val last6Months = runs.filter { !it.date.isBefore(sixMonthsAgo) }
        val avgWeeklyKm = last6Months.sumOf { it.distanceKm } / 26.0
        val targetWeeklyKm = effectiveVdot
        val mileageScore = min(COMPONENT_CAP, avgWeeklyKm / targetWeeklyKm * 100.0)

        // === LONG RUNS: >= 13 km in the last 10 weeks, 2%/day decay, 10 pts target ===
        val tenWeeksAgo = today.minusDays(70)
        var longRunPoints = 0.0
        for (run in runs) {
            if (run.date.isBefore(tenWeeksAgo) || run.distanceKm < 13.0) continue
            val daysAgo = (today.toEpochDay() - run.date.toEpochDay()).toDouble()
            val basePoints = ((run.distanceKm - 13.0) / 10.0).pow(1.5) * 0.5 + 0.5
            longRunPoints += basePoints * 0.98.pow(daysAgo)
        }
        val longRunScore = min(COMPONENT_CAP, longRunPoints / 10.0 * 100.0)

        // === CROSS-TRAINING: aerobic minutes over 90 days vs 300 min/week ===
        var ctScore = 0.0
        var ctMinutes = 0.0
        if (crossTraining.isNotEmpty()) {
            val ctStart = today.minusDays(90)
            var seconds = 0.0
            for (a in crossTraining) {
                if (a.date.isBefore(ctStart)) continue
                val zoneSum = a.zoneSeconds.sum()
                // zone data when present, moving time otherwise (e.g. swims)
                seconds += if (zoneSum > 0) zoneSum.toDouble() else a.movingTimeSec.toDouble()
            }
            ctMinutes = seconds / 60.0
            val avgWeeklyMinutes = ctMinutes / (90.0 / 7.0)
            ctScore = min(CT_SCORE_CAP, avgWeeklyMinutes / CT_TARGET_WEEKLY_MINUTES * 100.0)
        }

        // === COMBINED ===
        val raw = if (crossTraining.isNotEmpty()) {
            mileageScore * CT_MILEAGE_WEIGHT +
                longRunScore * CT_LONG_RUN_WEIGHT +
                ctScore * CT_COEFFICIENT * CT_AEROBIC_WEIGHT
        } else {
            mileageScore * MILEAGE_WEIGHT + longRunScore * LONG_RUN_WEIGHT
        }

        return Result(
            shape = raw.roundToInt().coerceAtMost(SHAPE_CAP.toInt()),
            mileageScore = mileageScore,
            longRunScore = longRunScore,
            crossTrainingScore = ctScore,
            avgWeeklyKm = avgWeeklyKm,
            targetWeeklyKm = targetWeeklyKm,
            longRunPoints = longRunPoints,
            crossTrainingMinutes = ctMinutes,
        )
    }
}
