package com.runflow2.app.core.math

import kotlin.math.roundToInt

/**
 * Extracts running best efforts (PRs) and cycling Mean Maximal Power (MMP) duration curves.
 */
object BestEffortsEngine {

    data class DistanceTarget(
        val label: String,
        val meters: Double,
    )

    val STANDARD_RUN_DISTANCES = listOf(
        DistanceTarget("400m", 400.0),
        DistanceTarget("1k", 1000.0),
        DistanceTarget("1mi", 1609.344),
        DistanceTarget("5k", 5000.0),
        DistanceTarget("10k", 10000.0),
        DistanceTarget("Half", 21097.5),
        DistanceTarget("Marathon", 42195.0),
    )

    val STANDARD_POWER_DURATIONS_SEC = listOf(
        5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600
    )

    data class BestEffort(
        val label: String,
        val distanceMeters: Double,
        val timeSec: Int,
        val startIndex: Int,
        val endIndex: Int,
    ) {
        val paceSecPerKm: Double
            get() = if (distanceMeters > 0.0) timeSec / (distanceMeters / 1000.0) else 0.0
    }

    data class PowerEffort(
        val durationSec: Int,
        val maxWatts: Double,
        val startIndex: Int,
        val endIndex: Int,
    )

    /**
     * Finds best efforts across [targets] using a two-pointer sliding window with linear interpolation.
     *
     * @param distanceStream Cumulative distance meters at each sample index.
     * @param timeStream Elapsed seconds at each sample index.
     * @param targets The target distance benchmarks to extract.
     */
    fun findBestEfforts(
        distanceStream: List<Double>,
        timeStream: List<Int>,
        targets: List<DistanceTarget> = STANDARD_RUN_DISTANCES,
    ): List<BestEffort> {
        if (distanceStream.size < 2 || timeStream.size != distanceStream.size) {
            return emptyList()
        }

        val totalDist = distanceStream.last() - distanceStream.first()
        val results = mutableListOf<BestEffort>()

        for (target in targets) {
            if (totalDist < target.meters) continue

            var bestTimeSec = Int.MAX_VALUE
            var bestStart = -1
            var bestEnd = -1

            var start = 0
            for (end in 1 until distanceStream.size) {
                while (start < end && (distanceStream[end] - distanceStream[start]) >= target.meters) {
                    val windowDist = distanceStream[end] - distanceStream[start]
                    val windowTime = (timeStream[end] - timeStream[start]).toDouble()

                    // Interpolate fractional time for exact distance benchmark
                    val stepDist = distanceStream[end] - distanceStream[end - 1]
                    val stepTime = (timeStream[end] - timeStream[end - 1]).toDouble()
                    val overshoot = windowDist - target.meters

                    val effTime = if (stepDist > 0.0 && overshoot > 0.0) {
                        (windowTime - (overshoot / stepDist) * stepTime).roundToInt().coerceAtLeast(1)
                    } else {
                        windowTime.roundToInt().coerceAtLeast(1)
                    }

                    if (effTime < bestTimeSec) {
                        bestTimeSec = effTime
                        bestStart = start
                        bestEnd = end
                    }
                    start++
                }
            }

            if (bestStart >= 0 && bestTimeSec < Int.MAX_VALUE) {
                results.add(
                    BestEffort(
                        label = target.label,
                        distanceMeters = target.meters,
                        timeSec = bestTimeSec,
                        startIndex = bestStart,
                        endIndex = bestEnd,
                    )
                )
            }
        }

        return results
    }

    /**
     * Computes the Mean Maximal Power (MMP) curve for standard durations (5s to 3600s).
     * Assumes 1 Hz watts stream (1 second per point).
     */
    fun findMeanMaximalPower(
        wattsStream: List<Double>,
        durationsSec: List<Int> = STANDARD_POWER_DURATIONS_SEC,
    ): List<PowerEffort> {
        if (wattsStream.isEmpty()) return emptyList()

        val n = wattsStream.size
        val prefixSum = DoubleArray(n + 1)
        for (i in 0 until n) {
            prefixSum[i + 1] = prefixSum[i] + (if (wattsStream[i].isFinite() && wattsStream[i] >= 0.0) wattsStream[i] else 0.0)
        }

        val results = mutableListOf<PowerEffort>()
        for (dur in durationsSec) {
            if (n < dur) continue

            var maxAvg = 0.0
            var bestStart = 0
            for (i in 0..(n - dur)) {
                val sum = prefixSum[i + dur] - prefixSum[i]
                val avg = sum / dur
                if (avg > maxAvg) {
                    maxAvg = avg
                    bestStart = i
                }
            }

            results.add(
                PowerEffort(
                    durationSec = dur,
                    maxWatts = (maxAvg * 10.0).roundToInt() / 10.0,
                    startIndex = bestStart,
                    endIndex = bestStart + dur,
                )
            )
        }

        return results
    }

    /**
     * Computes Mean Maximal Power for non-uniform time streams using a two-pointer sliding window.
     */
    fun findMeanMaximalPowerWithTime(
        wattsStream: List<Double>,
        timeStream: List<Int>,
        durationsSec: List<Int> = STANDARD_POWER_DURATIONS_SEC,
    ): List<PowerEffort> {
        if (wattsStream.isEmpty() || timeStream.size != wattsStream.size) return emptyList()

        // Check if stream is already uniform 1 Hz (most common)
        val is1Hz = (1 until timeStream.size).all { timeStream[it] - timeStream[it - 1] == 1 }
        if (is1Hz) {
            return findMeanMaximalPower(wattsStream, durationsSec)
        }

        // Resample onto 1-second grid up to total duration
        val totalDuration = timeStream.last() - timeStream.first()
        if (totalDuration <= 0) return emptyList()

        val grid = DoubleArray(totalDuration + 1)
        var streamIdx = 0
        val t0 = timeStream.first()

        for (sec in 0..totalDuration) {
            val t = t0 + sec
            while (streamIdx < timeStream.size - 1 && timeStream[streamIdx + 1] <= t) {
                streamIdx++
            }
            grid[sec] = wattsStream[streamIdx].coerceAtLeast(0.0)
        }

        return findMeanMaximalPower(grid.toList(), durationsSec)
    }
}
