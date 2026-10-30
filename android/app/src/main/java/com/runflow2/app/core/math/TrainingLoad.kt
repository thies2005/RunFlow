package com.runflow2.app.core.math

import com.runflow2.app.domain.model.TsbStatus
import java.time.LocalDate
import java.util.Locale
import kotlin.math.exp
import kotlin.math.round
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Training-load engine: Banister TRIMP, CTL/ATL/TSB impulse-response model.
 * Ported from the RunFlow server implementation (Web/src/lib — DailyFitness).
 */
object TrainingLoad {

    const val CTL_TIME_CONSTANT = 42.0 // days (fitness)
    const val ATL_TIME_CONSTANT = 7.0 // days (fatigue)

    /** Banister TRIMP from average heart rate (Karvonen reserve ratio). */
    fun trimpFromHr(minutes: Double, avgHr: Double, hrMax: Int, hrRest: Int): Double? {
        if (minutes <= 0.0 || hrMax <= hrRest) return null
        val ratio = (avgHr - hrRest) / (hrMax - hrRest)
        if (ratio < 0.0 || ratio > 1.2) return null
        return minutes * ratio * 0.64 * exp(ratio * 1.92)
    }

    private val zoneWeights = doubleArrayOf(0.25, 0.45, 0.65, 0.80, 0.90, 0.95, 1.00)

    /** TRIMP from time-in-zone (7 zones) as a fallback when average HR is missing. */
    fun trimpFromZones(zoneSeconds: List<Int>): Double {
        var trimp = 0.0
        zoneSeconds.forEachIndexed { i, sec ->
            val w = zoneWeights[i.coerceIn(0, 6)]
            trimp += (sec / 60.0) * w * 0.64 * exp(w * 1.92)
        }
        return trimp
    }

    /**
     * TRIMP estimated from pace when neither HR nor zone times exist.
     * Maps speed relative to threshold pace onto a heart-rate-reserve ratio.
     */
    fun trimpFromPace(minutes: Double, avgSpeedMS: Double, thresholdSpeedMS: Double): Double {
        if (minutes <= 0.0 || thresholdSpeedMS <= 0.0) return 0.0
        val speedRatio = (avgSpeedMS / thresholdSpeedMS).coerceIn(0.4, 1.05)
        val hrReserve = ((speedRatio - 0.4) / 0.6).coerceIn(0.35, 1.0)
        return minutes * hrReserve * 0.64 * exp(hrReserve * 1.92)
    }

    /**
     * Web parity for non-run sports without HR: a flat load per minute — the
     * run-pace curve would score a bike ride as a max-effort run.
     */
    const val FLAT_TRIMP_PER_MIN = 2.5

    /** Last-resort TRIMP: pace curve for runs, flat rate for everything else. */
    fun trimpFallback(minutes: Double, avgSpeedMS: Double, thresholdSpeedMS: Double, isRun: Boolean): Double =
        if (isRun) trimpFromPace(minutes, avgSpeedMS, thresholdSpeedMS)
        else minutes * FLAT_TRIMP_PER_MIN

    data class DailyLoad(
        val date: LocalDate,
        val trimp: Double,
        val ctl: Double,
        val atl: Double,
    ) {
        val tsb: Double get() = ctl - atl
    }

    /**
     * Day-by-day CTL/ATL evolution over [days] days ending [endDate] (inclusive).
     * Uses yesterday's values to update today's (standard impulse-response form).
     */
    fun dailySeries(
        trimpByDate: Map<LocalDate, Double>,
        endDate: LocalDate,
        days: Int,
    ): List<DailyLoad> {
        val start = endDate.minusDays((days - 1).toLong())
        var ctl = 0.0
        var atl = 0.0
        val result = ArrayList<DailyLoad>(days)
        var d = start
        while (!d.isAfter(endDate)) {
            val trimp = trimpByDate[d] ?: 0.0
            ctl = ctl * exp(-1.0 / CTL_TIME_CONSTANT) + trimp * (1 - exp(-1.0 / CTL_TIME_CONSTANT))
            atl = atl * exp(-1.0 / ATL_TIME_CONSTANT) + trimp * (1 - exp(-1.0 / ATL_TIME_CONSTANT))
            result += DailyLoad(d, trimp, ctl, atl)
            d = d.plusDays(1)
        }
        return result
    }

    /** Warm up the model before the display window so CTL/ATL are realistic. */
    fun dailySeriesWarmedUp(
        trimpByDate: Map<LocalDate, Double>,
        endDate: LocalDate,
        days: Int,
        warmupDays: Int = 120,
    ): List<DailyLoad> {
        val warmed = dailySeries(trimpByDate, endDate, days + warmupDays)
        return warmed.subList(warmupDays, warmed.size)
    }

    fun tsbStatus(tsb: Double): TsbStatus = TsbStatus.from(tsb)

    /**
     * Projects future CTL / ATL series from [from] up to [to] (inclusive)
     * using daily planned TSS targets.
     */
    fun projectFutureSeries(
        lastCtl: Double,
        lastAtl: Double,
        plannedTssByDate: Map<LocalDate, Double>,
        from: LocalDate,
        to: LocalDate,
    ): List<DailyLoad> {
        var ctl = lastCtl
        var atl = lastAtl
        val result = mutableListOf<DailyLoad>()
        var d = from
        while (!d.isAfter(to)) {
            val tss = plannedTssByDate[d] ?: 0.0
            ctl = ctl * exp(-1.0 / CTL_TIME_CONSTANT) + tss * (1 - exp(-1.0 / CTL_TIME_CONSTANT))
            atl = atl * exp(-1.0 / ATL_TIME_CONSTANT) + tss * (1 - exp(-1.0 / ATL_TIME_CONSTANT))
            result += DailyLoad(d, tss, ctl, atl)
            d = d.plusDays(1)
        }
        return result
    }

    /**
     * 7-day CTL ramp rate (change in CTL over the last 7 days).
     */
    fun ctlRampRate7d(series: List<DailyLoad>): Double {
        if (series.isEmpty()) return 0.0
        val current = series.last().ctl
        val past = if (series.size >= 8) series[series.size - 8].ctl else series.first().ctl
        return current - past
    }

    data class FosterMetrics(
        val mean: Double,
        val stdDev: Double,
        val monotony: Double,
        val strain: Double,
    )

    /**
     * Foster Monotony & Strain computed over daily loads (last 7 days).
     */
    fun fosterMonotonyStrain(dailyLoads: List<Double>): FosterMetrics {
        if (dailyLoads.isEmpty()) return FosterMetrics(0.0, 0.0, 0.0, 0.0)
        val window = dailyLoads.takeLast(7)
        val mean = window.average()
        val variance = window.sumOf { (it - mean) * (it - mean) } / window.size
        val stdDev = sqrt(variance)
        val monotony = if (stdDev > 0.001) mean / stdDev else (if (mean > 0.0) 10.0 else 0.0)
        val weeklyLoad = window.sum()
        val strain = weeklyLoad * monotony
        return FosterMetrics(
            mean = mean,
            stdDev = stdDev,
            monotony = monotony,
            strain = strain,
        )
    }

    /**
     * Acute-to-Chronic Workload Ratio (ACWR): ATL / CTL.
     */
    fun acwr(atl: Double, ctl: Double): Double {
        return if (ctl > 0.0) atl / ctl else 0.0
    }

    /**
     * Resolves unified effective TSS per activity (Decision U1):
     * - Rides (RIDE, VIRTUAL_RIDE): bikeTss > 0 ? bikeTss : round(trimp * 0.85)
     * - Runs (RUN): runningTss > 0 ? runningTss : round(trimp * 0.85)
     * - Strength (WORKOUT, STRENGTH): max(round(trimp), round(h * 36))
     * - Other Cardio (SWIM, HIKE, WALK, OTHER): trimp > 0 ? round(trimp * 0.85) : round(h * 40)
     */
    fun resolveEffectiveTss(
        type: String?,
        movingTimeSec: Int,
        runningTss: Double = 0.0,
        bikeTss: Double = 0.0,
        trimp: Double = 0.0,
        trainingType: String? = null,
    ): Double {
        val t = (type ?: "").uppercase(Locale.ROOT)
        val trainType = (trainingType ?: "").uppercase(Locale.ROOT)
        val h = movingTimeSec / 3600.0

        return when {
            t == "RIDE" || t == "VIRTUAL_RIDE" ->
                if (bikeTss > 0.0) bikeTss.roundToInt().toDouble() else (trimp * 0.85).roundToInt().toDouble()
            t == "RUN" ->
                if (runningTss > 0.0) runningTss.roundToInt().toDouble() else (trimp * 0.85).roundToInt().toDouble()
            t == "WORKOUT" || t == "STRENGTH" || trainType == "STRENGTH" ->
                maxOf(trimp.roundToInt().toDouble(), (h * 36.0).roundToInt().toDouble())
            else ->
                if (trimp > 0.0) (trimp * 0.85).roundToInt().toDouble() else (h * 40.0).roundToInt().toDouble()
        }
    }
}
