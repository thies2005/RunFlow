package com.runflow2.app.core.math

import com.runflow2.app.domain.model.TsbStatus
import java.time.LocalDate
import kotlin.math.exp

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

    /** CTL a runner roughly needs to be "in marathon shape" (tunable constant). */
    const val MARATHON_CTL_TARGET = 65.0
}
