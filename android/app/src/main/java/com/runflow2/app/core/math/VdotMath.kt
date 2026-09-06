package com.runflow2.app.core.math

import kotlin.math.exp
import kotlin.math.sqrt

/**
 * Daniels–Gilbert VDOT math, ported from the RunFlow Flutter/Web implementation
 * (flutter/lib/core/utils/vdot.dart).
 */
object VdotMath {

    /** VO2 (ml/kg/min) for a given speed in meters per minute. */
    fun vo2ForSpeed(v: Double): Double = -4.60 + 0.182258 * v + 0.000104 * v * v

    /** Fraction of VO2max sustainable for a given time in minutes. */
    fun pctVo2maxForTime(tMin: Double): Double =
        0.8 + 0.1894393 * exp(-0.012778 * tMin) + 0.2989558 * exp(-0.1932605 * tMin)

    /** VDOT equivalent of a race performance. */
    fun vdot(distanceM: Double, timeSec: Double): Double {
        if (distanceM <= 0.0 || timeSec <= 0.0) return 0.0
        val tMin = timeSec / 60.0
        val v = distanceM / tMin // m/min
        return vo2ForSpeed(v) / pctVo2maxForTime(tMin)
    }

    /** Running speed (m/min) at a given fraction of a VDOT. */
    fun speedForVo2Fraction(vdot: Double, fraction: Double): Double {
        val vo2 = vdot * fraction
        val a = 0.000104
        val b = 0.182258
        val c = -4.60 - vo2
        val disc = b * b - 4 * a * c
        if (disc < 0) return 0.0
        return (-b + sqrt(disc)) / (2 * a)
    }

    /** Pace in seconds per km for a fraction of a VDOT. */
    fun paceSecPerKmForFraction(vdot: Double, fraction: Double): Double {
        val speed = speedForVo2Fraction(vdot, fraction)
        return if (speed <= 0.0) 0.0 else 1000.0 / speed * 60.0
    }

    /**
     * Predicted time (seconds) to cover [distanceM] at a given VDOT.
     * Bisection on time: vdot(distance, t) is strictly decreasing in t.
     */
    fun predictTimeSec(vdot: Double, distanceM: Double): Double? {
        if (vdot <= 0.0 || distanceM <= 0.0) return null
        var lo = 0.5 // minutes
        var hi = 2880.0 // 48 hours
        repeat(64) {
            val mid = (lo + hi) / 2.0
            if (vdot(distanceM, mid * 60.0) > vdot) lo = mid else hi = mid
        }
        return ((lo + hi) / 2.0) * 60.0
    }

    /** Common race prediction distances in meters. */
    val predictionDistances: List<Pair<String, Double>> = listOf(
        "5K" to 5000.0,
        "10K" to 10000.0,
        "Half Marathon" to 21097.5,
        "Marathon" to 42195.0,
    )
}
