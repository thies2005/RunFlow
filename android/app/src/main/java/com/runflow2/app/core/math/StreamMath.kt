package com.runflow2.app.core.math

import com.runflow2.app.data.net.ActivityStreamsDto
import kotlin.math.abs
import kotlin.math.ceil

/**
 * Derives chartable series from Strava-style activity streams. This is a
 * faithful port of the web's InteractiveStreamsChart processing
 * (Web/src/components/InteractiveStreamsChart.tsx:49-137) so both clients
 * show identical curves for the same activity.
 */
object StreamMath {

    /** Rendering cap — matches the web's downsampling target. */
    const val MAX_POINTS = 2000

    data class Series(
        val time: List<Double>, // seconds from start
        val heartrate: List<Double>?, // bpm
        val pace: List<Double?>, // min/km (null = outlier/standing)
        val gap: List<Double?>, // min/km, grade-adjusted
        val altitude: List<Double>?, // m
        val cadence: List<Double>?, // spm (Strava rpm doubled)
    ) {
        val hasHr get() = heartrate != null
        val hasPace get() = pace.any { it != null }
        val hasGap get() = gap.any { it != null }
        val hasElevation get() = altitude != null
        val hasCadence get() = cadence != null
        val isEmpty get() = time.size < 2
    }

    /** m/s → min/km; null for standing/outlier samples (web caps at 20 min/km). */
    fun minPerKm(mPerS: Double): Double? {
        if (mPerS <= 0.1) return null
        val minPerKm = (1000.0 / mPerS) / 60.0
        return if (minPerKm > 20.0) null else minPerKm
    }

    /**
     * Metabolic cost ratio vs flat running for a grade in percent — the web's
     * simplified Minetti curve: ~3 % more cost per 1 % uphill, gentle
     * downhill is beneficial to about -10 %, steeper downhill gets harder again.
     */
    fun gapCostRatio(gradePct: Double): Double = when {
        gradePct > 0 -> 1 + (gradePct * 0.03)
        gradePct < 0 -> {
            val g = abs(gradePct)
            if (g < 10) 1 - (g * 0.015) else 0.85 + ((g - 10) * 0.02)
        }
        else -> 1.0
    }

    /** Grade-adjusted pace in min/km; null when the sample is too slow to judge. */
    fun gapMinPerKm(actualPaceMinPerKm: Double, gradePct: Double): Double? {
        val gap = actualPaceMinPerKm / gapCostRatio(gradePct)
        return if (gap > 20.0 || gap < 2.0) null else gap
    }

    fun build(streams: ActivityStreamsDto): Series {
        val time = streams.time
        if (time.size < 2) return Series(emptyList(), null, emptyList(), emptyList(), null, null)
        val velocity = streams.velocitySmooth
        val altitude = streams.altitude
        val heartrate = streams.heartrate
        val cadence = streams.cadence

        val step = if (time.size > MAX_POINTS) ceil(time.size / MAX_POINTS.toDouble()).toInt() else 1

        val t = ArrayList<Double>(time.size / step + 1)
        val hr = heartrate?.let { ArrayList<Double>(time.size / step + 1) }
        val pace = ArrayList<Double?>(time.size / step + 1)
        val gap = ArrayList<Double?>(time.size / step + 1)
        val alt = altitude?.let { ArrayList<Double>(time.size / step + 1) }
        val cad = cadence?.let { ArrayList<Double>(time.size / step + 1) }

        var i = 0
        while (i < time.size) {
            t += time[i]
            // Channels exist as a whole (the lists are only created when the
            // channel does); out-of-bounds guards only cover ragged arrays.
            hr?.add(heartrate!!.getOrElse(i) { Double.NaN })
            alt?.add(altitude!!.getOrElse(i) { Double.NaN })

            val mPerS = velocity?.getOrNull(i)
            pace += mPerS?.let { minPerKm(it) }

            var gapHere: Double? = null
            if (mPerS != null && mPerS > 0.5 && altitude != null && i >= step) {
                val prevAlt = altitude.getOrNull(i - step)
                val prevT = time.getOrNull(i - step)
                if (prevAlt != null && prevT != null) {
                    val timeDelta = time[i] - prevT
                    val elevDelta = altitude[i] - prevAlt
                    val horizDist = mPerS * timeDelta
                    val grade = if (horizDist > 0) (elevDelta / horizDist) * 100.0 else 0.0
                    gapHere = minPerKm(mPerS)?.let { gapMinPerKm(it, grade) }
                }
            }
            gap += gapHere

            cad?.add(cadence!!.getOrElse(i) { Double.NaN } * 2)

            i += step
        }

        return Series(
            time = t,
            heartrate = hr?.takeIf { it.size == t.size },
            pace = pace,
            gap = gap,
            altitude = alt?.takeIf { it.size == t.size },
            cadence = cad?.takeIf { it.size == t.size },
        )
    }
}
