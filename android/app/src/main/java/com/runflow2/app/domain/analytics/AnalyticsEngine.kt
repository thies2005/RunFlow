package com.runflow2.app.domain.analytics

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.domain.model.ActivityType
import com.runflow2.app.domain.model.TsbStatus
import java.time.DayOfWeek
import java.time.LocalDate

/** A minimal activity view used by the analytics engine. */
data class ActivityInput(
    val id: String,
    val type: ActivityType,
    val date: LocalDate,
    val distanceKm: Double,
    val movingTimeSec: Int,
    val averageHr: Double?,
    val trimp: Double,
    val estimatedVdot: Double?,
    val zoneSeconds: List<Int>,
)

data class WeekVolume(val weekStart: LocalDate, val km: Double, val runs: Int)
data class VdotPoint(val date: LocalDate, val vdot: Double)

data class AnalyticsBundle(
    val daily: List<TrainingLoad.DailyLoad>,
    val ctl: Double,
    val atl: Double,
    val tsb: Double,
    val tsbStatus: TsbStatus,
    val rawVdot: Double?,
    val effectiveVdot: Double?,
    val vdotCorrection: Double,
    val marathonShape: Double?,
    val currentWeekKm: Double,
    val avgWeeklyKm12: Double,
    val zoneSeconds: List<Int>,
    val weeklyVolume: List<WeekVolume>,
    val vdotTrend: List<VdotPoint>,
    val totalRuns: Int,
)

object AnalyticsEngine {

    fun compute(
        activities: List<ActivityInput>,
        today: LocalDate,
        vdotCorrection: Double,
        rangeDays: Int = 365,
    ): AnalyticsBundle {
        val runs = activities.filter { it.type == ActivityType.RUN }

        // daily TRIMP map
        val trimpByDate = HashMap<LocalDate, Double>()
        for (a in runs) {
            trimpByDate[a.date] = (trimpByDate[a.date] ?: 0.0) + a.trimp
        }

        val daily = TrainingLoad.dailySeriesWarmedUp(trimpByDate, today, rangeDays)
        val latest = daily.lastOrNull()
        val ctl = latest?.ctl ?: 0.0
        val atl = latest?.atl ?: 0.0
        val tsb = ctl - atl

        // best recent performance VDOT (last 90 days, >= 5 km runs)
        val cutoff = today.minusDays(90)
        val rawVdot = runs
            .filter { it.date.isAfter(cutoff) && it.distanceKm >= 5.0 && (it.estimatedVdot ?: 0.0) > 20.0 }
            .maxOfOrNull { it.estimatedVdot ?: 0.0 }
            ?.takeIf { it > 0.0 }
        val effectiveVdot = rawVdot?.times(vdotCorrection)

        // current week (Monday start)
        val weekStart = today.with(DayOfWeek.MONDAY)
        val currentWeekKm = runs.filter { !it.date.isBefore(weekStart) }.sumOf { it.distanceKm }

        // average weekly km over last 12 weeks
        val w12Start = weekStart.minusWeeks(11)
        val total12 = runs.filter { !it.date.isBefore(w12Start) && it.date.isBefore(weekStart.plusDays(7)) }
            .sumOf { it.distanceKm }
        val avgWeeklyKm12 = total12 / 12.0

        // zone totals over range
        val rangeStart = today.minusDays((rangeDays - 1).toLong())
        val zoneTotals = IntArray(7)
        runs.filter { !it.date.isBefore(rangeStart) }.forEach { a ->
            a.zoneSeconds.forEachIndexed { i, s -> zoneTotals[i] += s }
        }

        // weekly volume, last 26 weeks
        val weekly = ArrayList<WeekVolume>(26)
        for (w in 25 downTo 0) {
            val ws = weekStart.minusWeeks(w.toLong())
            val we = ws.plusDays(6)
            val inWeek = runs.filter { !it.date.isBefore(ws) && !it.date.isAfter(we) }
            weekly += WeekVolume(ws, inWeek.sumOf { it.distanceKm }, inWeek.size)
        }

        // vdot trend (weekly best)
        val trend = ArrayList<VdotPoint>()
        for (w in 25 downTo 0) {
            val ws = weekStart.minusWeeks(w.toLong())
            val we = ws.plusDays(6)
            val best = runs.filter { !it.date.isBefore(ws) && !it.date.isAfter(we) && it.estimatedVdot != null }
                .maxOfOrNull { it.estimatedVdot!! }
            if (best != null) trend += VdotPoint(ws, best)
        }

        val shape = if (effectiveVdot != null) {
            (ctl / TrainingLoad.MARATHON_CTL_TARGET * 100.0).coerceIn(0.0, 115.0)
        } else null

        return AnalyticsBundle(
            daily = daily,
            ctl = ctl,
            atl = atl,
            tsb = tsb,
            tsbStatus = TsbStatus.from(tsb),
            rawVdot = rawVdot,
            effectiveVdot = effectiveVdot,
            vdotCorrection = vdotCorrection,
            marathonShape = shape,
            currentWeekKm = currentWeekKm,
            avgWeeklyKm12 = avgWeeklyKm12,
            zoneSeconds = zoneTotals.toList(),
            weeklyVolume = weekly,
            vdotTrend = trend,
            totalRuns = runs.size,
        )
    }

    /** Estimated VDOT for a single run (only meaningful for solid efforts). */
    fun estimateVdotFor(distanceKm: Double, movingTimeSec: Int): Double? {
        if (distanceKm < 3.0 || movingTimeSec < 300) return null
        val v = VdotMath.vdot(distanceKm * 1000.0, movingTimeSec.toDouble())
        return v.takeIf { it in 15.0..90.0 }
    }

    fun racePredictions(effectiveVdot: Double): List<Triple<String, Double, Int>> =
        VdotMath.predictionDistances.mapNotNull { (label, dist) ->
            VdotMath.predictTimeSec(effectiveVdot, dist)?.let { Triple(label, dist, it.toInt()) }
        }
}
