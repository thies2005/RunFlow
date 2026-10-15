package com.runflow2.app.domain.analytics

import com.runflow2.app.core.math.MarathonShape
import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.domain.model.ActivityType
import com.runflow2.app.domain.model.TsbStatus
import java.time.DayOfWeek
import java.time.LocalDate
import kotlin.math.exp
import kotlin.math.roundToInt
import kotlin.math.pow

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
    val averageWatts: Double? = null,
    val npWatts: Double? = null,
    val maxWatts: Double? = null,
    val intensityFactor: Double? = null,
    val variabilityIndex: Double? = null,
    val bikeTss: Double? = null,
    val efficiencyFactor: Double? = null,
    val aerobicDecoupling: Double? = null,
    val deviceWatts: Boolean = false,
)

data class WeekVolume(val weekStart: LocalDate, val km: Double, val runs: Int)
data class VdotPoint(val date: LocalDate, val vdot: Double)

data class FitnessPoint(
    val date: LocalDate,
    val ctl: Double,
    val atl: Double,
    val tsb: Double,
    val load: Double = 0.0,
) {
    fun toDailyLoad(): TrainingLoad.DailyLoad = TrainingLoad.DailyLoad(date, load, ctl, atl)
}

data class WeeklyBar(
    val weekStart: LocalDate,
    val value: Double,
    val count: Int = 0,
) {
    fun toWeekVolume(): WeekVolume = WeekVolume(weekStart, value, count)
}

data class ZoneBucket(
    val zone: Int,
    val name: String,
    val seconds: Int,
    val minWatts: Int = 0,
    val maxWatts: Int = 0,
    val percentFtpMin: Int = 0,
    val percentFtpMax: Int = 0,
)

data class CyclingAnalyticsSummary(
    val ftpWatts: Int,
    val eFtpWatts: Int?,
    val wPerKg: Double?,
    val ctlBike: Double,
    val atlBike: Double,
    val tsbBike: Double,
    val bikeFitnessSeries: List<FitnessPoint>,
    val weeklyBikeKm: List<WeeklyBar>,
    val weeklyBikeTss: List<WeeklyBar>,
    val recentRideNpSeries: List<Double>,
    val avgNpWatts: Int?,
    val avgWatts: Int?,
    val totalBikeTss30d: Int,
    val powerZoneDistribution: List<ZoneBucket>,
)

data class AnalyticsBundle(
    val daily: List<TrainingLoad.DailyLoad>,
    val ctl: Double,
    val atl: Double,
    val tsb: Double,
    val tsbStatus: TsbStatus,
    /** All-time peaks of the CTL/ATL series — the "% of max" denominators (web parity). */
    val maxCtl: Double,
    val maxAtl: Double,
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
    val cycling: CyclingAnalyticsSummary? = null,
    // ---- server-override fields (overlaid by RunFlowRepository after
    // compute(); the engine itself always produces the LOCAL defaults) ----
    /**
     * HR-based aerobic-fitness trend — computed locally from recent runs
     * (× the effective-VO2max correction) and replaced by a fresh server
     * snapshot when available. Display only; it never feeds paces (that is
     * effectiveVdot) but IS the primary race-prediction VO2max
     * (web parity: calibratedEffectiveVo2max).
     */
    val aerobicVo2max: Double? = null,
    /** Which source won the VDOT pair — UI must never mix the two sources. */
    val vdotSource: MetricSource = MetricSource.LOCAL,
)

object AnalyticsEngine {

    fun compute(
        activities: List<ActivityInput>,
        today: LocalDate,
        vdotCorrection: Double,
        rangeDays: Int = 365,
        ftpWatts: Int = 0,
        weightKg: Double? = null,
        includeCrossTraining: Boolean = false,
        effectiveVo2maxCorrection: Double = 1.0,
        maxHr: Int = 190,
    ): AnalyticsBundle {
        // CTL/ATL/TSB and zone distribution cover ALL sports (web parity);
        // distance-based metrics (VO₂ max, weekly km, volume bars) stay run-only.
        val runs = activities.filter { it.type == ActivityType.RUN }
        val rides = activities.filter { it.type == ActivityType.RIDE || it.type == ActivityType.VIRTUAL_RIDE }

        // daily TRIMP map
        val trimpByDate = HashMap<LocalDate, Double>()
        for (a in activities) {
            trimpByDate[a.date] = (trimpByDate[a.date] ?: 0.0) + effectiveTrimp(a)
        }

        val daily = TrainingLoad.dailySeriesWarmedUp(trimpByDate, today, rangeDays)
        val latest = daily.lastOrNull()
        val ctl = latest?.ctl ?: 0.0
        val atl = latest?.atl ?: 0.0
        val tsb = ctl - atl

        // % of max needs the peak over the full history, not just the window
        val historyDays = activities.minOfOrNull { it.date }
            ?.let { (today.toEpochDay() - it.toEpochDay()).toInt() + 1 } ?: 0
        val peakSeries = if (historyDays > rangeDays) {
            TrainingLoad.dailySeriesWarmedUp(trimpByDate, today, historyDays)
        } else daily
        val maxCtl = peakSeries.maxOfOrNull { it.ctl } ?: 0.0
        val maxAtl = peakSeries.maxOfOrNull { it.atl } ?: 0.0

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

        // zone totals over range (all sports — zones are HR-based, not run-based)
        val rangeStart = today.minusDays((rangeDays - 1).toLong())
        val zoneTotals = IntArray(7)
        activities.filter { !it.date.isBefore(rangeStart) }.forEach { a ->
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

        // Marathon shape — the web's mileage + long-run (+ cross-training)
        // composite (Web/src/lib/metrics/runalyze.ts), not a CTL ratio.
        // Cross-training counts only when the user opted in; otherwise the
        // 2/3 mileage + 1/3 long-run formula applies.
        val crossTrainingActivities = if (includeCrossTraining) {
            activities
                .filter { it.type == ActivityType.RIDE || it.type == ActivityType.VIRTUAL_RIDE || it.type == ActivityType.SWIM || it.type == ActivityType.WORKOUT }
                .map { MarathonShape.CrossTraining(it.date, it.movingTimeSec, it.zoneSeconds) }
        } else {
            emptyList()
        }
        val shape = effectiveVdot?.let {
            MarathonShape.calculate(
                runs = runs.map { MarathonShape.Run(it.date, it.distanceKm) },
                crossTraining = crossTrainingActivities,
                effectiveVdot = it,
                today = today,
            ).shape.toDouble()
        }

        // Aerobic fitness (VO2max) — the HR-based trend, computed on device
        // (web parity: calculateWeightedEffectiveVO2max × effective-VO2max
        // correction). Display-only metric; a fresh server snapshot replaces
        // it in RunFlowRepository.applyServerMetrics.
        val aerobicVo2maxLocal = weightedAerobicVo2max(runs, maxHr, today)
            ?.let { it * effectiveVo2maxCorrection }
            ?.let { (it * 10.0).roundToInt() / 10.0 }
            ?.takeIf { it > 0.0 }

        // ---- cycling analytics summary ----
        val vdotEftp = effectiveVdot?.let { estimateBikeFtpFromVdot(it, weightKg ?: 70.0) }
        val rideMaxNp = rides.mapNotNull { it.npWatts }.maxOrNull()?.roundToInt()
        val eFtpWatts = vdotEftp ?: rideMaxNp
        val activeFtp = if (ftpWatts > 0) ftpWatts else (eFtpWatts ?: 0)
        val wPerKg = if (activeFtp > 0 && weightKg != null && weightKg > 0.0) {
            (activeFtp / weightKg * 100.0).roundToInt() / 100.0
        } else null

        // Daily bike load series (prefer bikeTss, fallback to TRIMP)
        val bikeLoadByDate = HashMap<LocalDate, Double>()
        for (r in rides) {
            val load = if ((r.bikeTss ?: 0.0) > 0.0) r.bikeTss!! else effectiveTrimp(r)
            bikeLoadByDate[r.date] = (bikeLoadByDate[r.date] ?: 0.0) + load
        }
        val bikeDaily = TrainingLoad.dailySeriesWarmedUp(bikeLoadByDate, today, rangeDays)
        val latestBike = bikeDaily.lastOrNull()
        val ctlBike = latestBike?.ctl ?: 0.0
        val atlBike = latestBike?.atl ?: 0.0
        val tsbBike = ctlBike - atlBike
        val bikeFitnessSeries = bikeDaily.map {
            FitnessPoint(date = it.date, ctl = it.ctl, atl = it.atl, tsb = it.tsb, load = it.trimp)
        }

        // Weekly cycling volume (km) and TSS, last 26 weeks
        val weeklyBikeKm = ArrayList<WeeklyBar>(26)
        val weeklyBikeTss = ArrayList<WeeklyBar>(26)
        for (w in 25 downTo 0) {
            val ws = weekStart.minusWeeks(w.toLong())
            val we = ws.plusDays(6)
            val inWeek = rides.filter { !it.date.isBefore(ws) && !it.date.isAfter(we) }
            val weekKm = inWeek.sumOf { it.distanceKm }
            val weekTss = inWeek.sumOf { if ((it.bikeTss ?: 0.0) > 0.0) it.bikeTss!! else effectiveTrimp(it) }
            weeklyBikeKm += WeeklyBar(ws, weekKm, inWeek.size)
            weeklyBikeTss += WeeklyBar(ws, weekTss, inWeek.size)
        }

        // Recent ride power series & summary
        val ridesWithPower = rides.filter { it.npWatts != null || it.averageWatts != null }
        val recentRideNpSeries = ridesWithPower.mapNotNull { it.npWatts ?: it.averageWatts }.takeLast(20)
        val avgNpWatts = if (ridesWithPower.any { it.npWatts != null }) {
            ridesWithPower.mapNotNull { it.npWatts }.average().roundToInt()
        } else null
        val avgWatts = if (ridesWithPower.any { it.averageWatts != null }) {
            ridesWithPower.mapNotNull { it.averageWatts }.average().roundToInt()
        } else null
        val cutoff30 = today.minusDays(30)
        val totalBikeTss30d = rides.filter { !it.date.isBefore(cutoff30) }
            .sumOf { if ((it.bikeTss ?: 0.0) > 0.0) it.bikeTss!! else effectiveTrimp(it) }
            .roundToInt()

        // 7-Zone Coggan power distribution
        val cogganZones = calculateCogganZones(if (activeFtp > 0) activeFtp else 200, weightKg)
        val powerZoneTotals = IntArray(7)
        rides.filter { !it.date.isBefore(rangeStart) }.forEach { r ->
            r.zoneSeconds.forEachIndexed { idx, sec ->
                if (idx in 0..6) powerZoneTotals[idx] += sec
            }
        }
        val powerZoneDistribution = cogganZones.mapIndexed { idx, zb ->
            zb.copy(seconds = powerZoneTotals[idx])
        }

        val cyclingSummary = CyclingAnalyticsSummary(
            ftpWatts = ftpWatts,
            eFtpWatts = eFtpWatts,
            wPerKg = wPerKg,
            ctlBike = ctlBike,
            atlBike = atlBike,
            tsbBike = tsbBike,
            bikeFitnessSeries = bikeFitnessSeries,
            weeklyBikeKm = weeklyBikeKm,
            weeklyBikeTss = weeklyBikeTss,
            recentRideNpSeries = recentRideNpSeries,
            avgNpWatts = avgNpWatts,
            avgWatts = avgWatts,
            totalBikeTss30d = totalBikeTss30d,
            powerZoneDistribution = powerZoneDistribution,
        )

        return AnalyticsBundle(
            daily = daily,
            ctl = ctl,
            atl = atl,
            tsb = tsb,
            tsbStatus = TsbStatus.from(tsb),
            maxCtl = maxCtl,
            maxAtl = maxAtl,
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
            cycling = cyclingSummary,
            aerobicVo2max = aerobicVo2maxLocal,
        )
    }

    /** Coggan 7-zone power boundaries based on FTP. */
    fun calculateCogganZones(ftpWatts: Int, weightKg: Double? = null): List<ZoneBucket> {
        val ftp = ftpWatts.coerceAtLeast(1)
        val z1Max = (ftp * 0.55).roundToInt()
        val z2Max = (ftp * 0.75).roundToInt()
        val z3Max = (ftp * 0.90).roundToInt()
        val z4Max = (ftp * 1.05).roundToInt()
        val z5Max = (ftp * 1.20).roundToInt()
        val z6Max = (ftp * 1.50).roundToInt()

        return listOf(
            ZoneBucket(1, "Active Recovery", 0, minWatts = 0, maxWatts = z1Max, percentFtpMin = 0, percentFtpMax = 55),
            ZoneBucket(2, "Endurance", 0, minWatts = z1Max + 1, maxWatts = z2Max, percentFtpMin = 56, percentFtpMax = 75),
            ZoneBucket(3, "Tempo", 0, minWatts = z2Max + 1, maxWatts = z3Max, percentFtpMin = 76, percentFtpMax = 90),
            ZoneBucket(4, "Lactate Threshold", 0, minWatts = z3Max + 1, maxWatts = z4Max, percentFtpMin = 91, percentFtpMax = 105),
            ZoneBucket(5, "VO2max", 0, minWatts = z4Max + 1, maxWatts = z5Max, percentFtpMin = 106, percentFtpMax = 120),
            ZoneBucket(6, "Anaerobic Capacity", 0, minWatts = z5Max + 1, maxWatts = z6Max, percentFtpMin = 121, percentFtpMax = 150),
            ZoneBucket(7, "Neuromuscular Power", 0, minWatts = z6Max + 1, maxWatts = 9999, percentFtpMin = 151, percentFtpMax = 999),
        )
    }

    /** Normalized Power (NP) calculated using 30s rolling average, 4th power algorithm. */
    fun calculateNormalizedPower(watts: List<Double>, time: List<Double>? = null): Double? {
        if (watts.size < 30) return null
        val n = watts.size
        val prefix = DoubleArray(n + 1)
        for (i in 0 until n) {
            prefix[i + 1] = prefix[i] + watts[i]
        }
        val rollingCount = n - 30 + 1
        if (rollingCount <= 0) return null
        var sum4th = 0.0
        for (i in 29 until n) {
            val rollingAvg = (prefix[i + 1] - prefix[i + 1 - 30]) / 30.0
            sum4th += rollingAvg.pow(4.0)
        }
        val mean4th = sum4th / rollingCount
        return kotlin.math.round(mean4th.pow(0.25))
    }

    /** Intensity Factor (IF) = NP / FTP. */
    fun calculateIntensityFactor(npWatts: Double, ftpWatts: Int): Double? {
        if (npWatts <= 0.0 || ftpWatts <= 0) return null
        return (npWatts / ftpWatts * 1000.0).roundToInt() / 1000.0
    }

    /** Variability Index (VI) = NP / Avg Watts. */
    fun calculateVariabilityIndex(npWatts: Double, avgWatts: Double): Double? {
        if (npWatts <= 0.0 || avgWatts <= 0.0) return null
        return (npWatts / avgWatts * 100.0).roundToInt() / 100.0
    }

    /** Bike TSS = (sec * NP * IF) / (FTP * 3600) * 100. */
    fun calculateBikeTss(movingTimeSec: Int, npWatts: Double, ifFactor: Double, ftpWatts: Int): Double {
        if (movingTimeSec <= 0 || npWatts <= 0.0 || ifFactor <= 0.0 || ftpWatts <= 0) return 0.0
        return ((movingTimeSec * npWatts * ifFactor) / (ftpWatts * 3600.0)) * 100.0
    }

    /** Estimate cycling FTP from running VDOT. */
    fun estimateBikeFtpFromVdot(vdot: Double, weightKg: Double = 70.0): Int? {
        if (vdot <= 0.0 || weightKg <= 0.0) return null
        val powerVo2PerKg = ((vdot - 7.0) / 10.8).coerceAtLeast(0.0)
        val ftpPerKg = powerVo2PerKg * 0.75
        return (ftpPerKg * weightKg).roundToInt()
    }

    /** Efficiency Factor (EF) = NP / Avg HR. */
    fun calculateEfficiencyFactor(npWatts: Double, avgHr: Double): Double? {
        if (avgHr <= 0.0 || npWatts <= 0.0) return null
        return (npWatts / avgHr * 100.0).roundToInt() / 100.0
    }

    /** Calculate time in 7 Coggan zones from a watts stream. */
    fun calculatePowerZoneTimes(watts: List<Double>, time: List<Double>?, ftpWatts: Int): List<Int> {
        if (ftpWatts <= 0 || watts.isEmpty()) return List(7) { 0 }
        val z1Max = (ftpWatts * 0.55).roundToInt()
        val z2Max = (ftpWatts * 0.75).roundToInt()
        val z3Max = (ftpWatts * 0.90).roundToInt()
        val z4Max = (ftpWatts * 1.05).roundToInt()
        val z5Max = (ftpWatts * 1.20).roundToInt()
        val z6Max = (ftpWatts * 1.50).roundToInt()

        val zones = DoubleArray(7)
        val n = watts.size
        for (i in 0 until n) {
            val duration = if (time != null && i < time.size - 1) {
                (time[i + 1] - time[i]).coerceIn(0.0, 30.0)
            } else 1.0
            val w = watts[i]
            when {
                w <= z1Max -> zones[0] += duration
                w <= z2Max -> zones[1] += duration
                w <= z3Max -> zones[2] += duration
                w <= z4Max -> zones[3] += duration
                w <= z5Max -> zones[4] += duration
                w <= z6Max -> zones[5] += duration
                else -> zones[6] += duration
            }
        }
        return zones.map { it.roundToInt() }
    }

    /** Estimated VDOT for a single run (only meaningful for solid efforts). */
    fun estimateVdotFor(distanceKm: Double, movingTimeSec: Int): Double? {
        if (distanceKm < 3.0 || movingTimeSec < 300) return null
        val v = VdotMath.vdot(distanceKm * 1000.0, movingTimeSec.toDouble())
        return v.takeIf { it in 15.0..90.0 }
    }

    // ---- HR-based aerobic fitness (VO2max), ported from the web's
    // calculateEffectiveVO2max / calculateWeightedEffectiveVO2max
    // (Web/src/lib/metrics/runalyze.ts). Display-only metric: it never
    // feeds paces or plan creation — that is the performance-based VDOT. ----

    private const val VO2MAX_MIN_DISTANCE_M = 3000.0 // 3 km
    private const val VO2MAX_MIN_DURATION_SEC = 720 // 12 minutes
    private const val VO2MAX_MIN_HR_PERCENT = 0.60
    private const val VO2MAX_DECAY_HALF_LIFE_DAYS = 30.0
    private const val VO2MAX_MIN_ACTIVITIES_FOR_MEDIAN = 5
    private const val VO2MAX_MAX_LOOKBACK_DAYS = 120
    private const val VO2MAX_OUTLIER_SIGMA = 1.5
    private const val VO2MAX_CAP = 85.0

    /**
     * Effective VO2max for a single run: Daniels/Gilbert oxygen cost at the
     * run's velocity divided by the fraction of VO2max sustained, estimated
     * from %HRmax via the Runalyze exponential relation blended with the
     * Swain equation above 85% HRmax. Null for too-short/too-easy efforts.
     */
    private fun effectiveVo2maxFor(distanceMeters: Double, timeSec: Int, avgHr: Double, maxHr: Int): Double? {
        if (timeSec < VO2MAX_MIN_DURATION_SEC || distanceMeters < VO2MAX_MIN_DISTANCE_M || avgHr <= 0.0 || maxHr <= 0) {
            return null
        }
        val hrPercent = avgHr / maxHr
        if (hrPercent < VO2MAX_MIN_HR_PERCENT) return null

        val timeMin = timeSec / 60.0
        val velocity = distanceMeters / timeMin // m/min
        val vo2Cost = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity

        val expPctVo2 = exp(1.92 * (hrPercent - 1.0)) * 0.64 + 0.26 * hrPercent
        val swainPctVo2 = 1.45 * hrPercent - 0.45
        val rawPctVo2 = if (hrPercent < 0.85) 0.65 * expPctVo2 + 0.35 * swainPctVo2 else swainPctVo2
        val percentVo2max = rawPctVo2.coerceIn(0.0, 1.0)
        if (percentVo2max <= 0.01) return null

        val vo2 = vo2Cost / percentVo2max
        // Cap at 85 (elite) to filter invalid GPS/HR data; 1-decimal rounding
        return ((vo2 * 10.0).roundToInt() / 10.0)
            .takeIf { it > 0.0 }
            ?.coerceAtMost(VO2MAX_CAP)
    }

    /**
     * Recency-weighted average aerobic VO2max over recent runs (raw, no
     * correction — the caller applies the effective-VO2max factor). With 5+
     * valid activities, outliers outside ±1.5·IQR of the median are excluded
     * (web parity). Null when no run qualifies.
     */
    private fun weightedAerobicVo2max(runs: List<ActivityInput>, maxHr: Int, today: LocalDate): Double? {
        if (maxHr <= 0) return null

        val entries = ArrayList<Pair<Double, Double>>() // (vo2, recency weight)
        for (run in runs) {
            val avgHr = run.averageHr ?: continue
            if (avgHr <= 0.0) continue
            if (run.distanceKm * 1000.0 < VO2MAX_MIN_DISTANCE_M) continue
            if (run.movingTimeSec < VO2MAX_MIN_DURATION_SEC) continue
            val daysAgo = (today.toEpochDay() - run.date.toEpochDay()).toDouble()
            if (daysAgo > VO2MAX_MAX_LOOKBACK_DAYS) continue
            if (avgHr / maxHr < VO2MAX_MIN_HR_PERCENT) continue
            val vo2 = effectiveVo2maxFor(run.distanceKm * 1000.0, run.movingTimeSec, avgHr, maxHr) ?: continue
            val decayConstant = kotlin.math.ln(2.0) / VO2MAX_DECAY_HALF_LIFE_DAYS
            entries += vo2 to exp(-decayConstant * daysAgo)
        }
        if (entries.isEmpty()) return null

        val inliers = if (entries.size >= VO2MAX_MIN_ACTIVITIES_FOR_MEDIAN) {
            val sorted = entries.map { it.first }.sorted()
            val median = sorted[sorted.size / 2]
            val q1 = sorted[(sorted.size * 0.25).toInt()]
            val q3 = sorted[(sorted.size * 0.75).toInt()]
            val iqr = q3 - q1
            val lower = median - VO2MAX_OUTLIER_SIGMA * iqr
            val upper = median + VO2MAX_OUTLIER_SIGMA * iqr
            entries.filter { it.first >= lower && it.first <= upper }
        } else {
            entries
        }
        val totalWeight = inliers.sumOf { it.second }
        if (totalWeight <= 0.0) return null
        return (inliers.sumOf { it.first * it.second } / totalWeight)
            .let { (it * 10.0).roundToInt() / 10.0 }
            .takeIf { it > 0.0 }
    }

    /**
     * Load of an activity as the model sees it: stored TRIMP, else zone-based,
     * else the web's flat fallback (2.5/min) — never zero just because a ride
     * arrived without heart rate.
     */
    private fun effectiveTrimp(a: ActivityInput): Double = when {
        a.trimp > 0.0 -> a.trimp
        a.zoneSeconds.sum() > 0 -> TrainingLoad.trimpFromZones(a.zoneSeconds)
        else -> (a.movingTimeSec / 60.0) * TrainingLoad.FLAT_TRIMP_PER_MIN
    }

    fun racePredictions(effectiveVdot: Double): List<Triple<String, Double, Int>> =
        VdotMath.predictionDistances.mapNotNull { (label, dist) ->
            VdotMath.predictTimeSec(effectiveVdot, dist)?.let { Triple(label, dist, it.toInt()) }
        }
}
