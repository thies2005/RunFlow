package com.runflow2.app.domain.plan

import com.runflow2.app.domain.model.RaceType
import java.time.LocalDate

/**
 * Input for local plan generation — consumed by the web engine port
 * ([WebPlanEngine]) and the server request mapping ([toCreatePlanRequest]).
 */
data class PlanSpec(
    val name: String,
    val raceType: RaceType,
    val raceDate: LocalDate,
    val startDate: LocalDate,
    val targetTimeSec: Int? = null,
    val weeklyKm: Double,
    val runsPerWeek: Int,
    val longRunKm: Double,
    val strengthPerWeek: Int = 0,
    val longRunDay: java.time.DayOfWeek = java.time.DayOfWeek.SUNDAY,
    val workoutDay: java.time.DayOfWeek = java.time.DayOfWeek.THURSDAY,
    val restDays: Set<java.time.DayOfWeek> = setOf(java.time.DayOfWeek.TUESDAY, java.time.DayOfWeek.FRIDAY),
    val taperWeeks: Int = 2,
    val vdot: Double? = null,
    val customDistanceKm: Double? = null,
    // Only used by the web engine (POST /api/plans calibration block); the
    // local generator resolves paces from [vdot] directly.
    val calibrationTimeSec: Int? = null,
    val calibrationDistance: String? = null, // 5K | 10K | HALF | MARATHON
    // ---- web-parity options (advanced wizard screen). Null = engine default,
    // exactly like the web form's optional fields. ----
    val ridesPerWeek: Int? = null,
    val swimsPerWeek: Int? = null,
    val startWeeklyKm: Double? = null,
    val peakWeeks: Int? = null,
    val buildWeeks: Int? = null,
    val swimDay: java.time.DayOfWeek? = null,
    val backyardLoopKm: Double? = null,
    val targetLaps: Int? = null,
    val customSwimKm: Double? = null,
    val customBikeKm: Double? = null,
    val customRunKm: Double? = null,
    val maxHeartRate: Int? = null,
    val restingHeartRate: Int? = null,
    val thresholdHeartRate: Int? = null,
    val thresholdPaceSecPerKm: Int? = null,
)

/** Shared plan date math (used by the wizard, seeder and both engine paths). */
object PlanMath {

    /** Whole training weeks between start and race date, clamped to 4..52. */
    fun planWeeks(spec: PlanSpec): Int {
        var w = 0
        var d = spec.startDate
        while (d.isBefore(spec.raceDate)) {
            w++
            d = d.plusWeeks(1)
        }
        return w.coerceIn(4, 52)
    }
}
