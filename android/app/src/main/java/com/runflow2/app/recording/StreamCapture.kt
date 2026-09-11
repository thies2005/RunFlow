package com.runflow2.app.recording

import com.runflow2.app.core.math.StreamMath
import com.runflow2.app.data.net.ActivityStreamsDto
import kotlin.math.ceil

/**
 * Synthesizes Strava-style streams from the recording's GPS points (~1 Hz
 * fixes carrying time, altitude and speed) so phone-recorded runs get the
 * same analysis charts (pace, GAP, elevation) as Strava-imported ones.
 * heartrate/cadence stay absent until a sensor source exists.
 */
object StreamCapture {

    /** Persisted-sample cap: hours of 1 Hz GPS would bloat Room; ~2000 samples chart identically. */
    const val MAX_SAMPLES = StreamMath.MAX_POINTS

    fun build(points: List<GeoPt>): ActivityStreamsDto? {
        if (points.size < 2) return null
        val step = if (points.size > MAX_SAMPLES) {
            ceil(points.size / MAX_SAMPLES.toDouble()).toInt()
        } else 1
        val t0 = points.first().t
        val time = ArrayList<Double>(points.size / step + 1)
        val altitude = ArrayList<Double>(points.size / step + 1)
        val velocity = ArrayList<Double>(points.size / step + 1)
        var i = 0
        while (i < points.size) {
            val p = points[i]
            time += (p.t - t0) / 1000.0
            altitude += p.ele
            velocity += p.speed
            i += step
        }
        return ActivityStreamsDto(time = time, altitude = altitude, velocitySmooth = velocity)
    }
}
