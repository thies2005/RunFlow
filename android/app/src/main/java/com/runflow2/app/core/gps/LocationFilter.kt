package com.runflow2.app.core.gps

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.sqrt

/** One GPS fix handed to [LocationFilter]; pure Kotlin (no Android types) so it is JVM-testable. */
data class GpsSample(
    val latitude: Double,
    val longitude: Double,
    val altitudeMeters: Double,
    val accuracyMeters: Float,
    val speedMetersPerSecond: Float,
    val timestampMs: Long,
)

/**
 * Deterministic GPS smoothing filter for 1 Hz running tracks.
 *
 * Pipeline per sample:
 * 1. hard gates: accuracy > 100 m and non-monotonic timestamps are rejected;
 * 2. spike rejection vs. the last accepted fix, with a recovery clause for
 *    dramatically better fixes that agree with the prediction (bad-fix cluster exit);
 * 3. per-axis Kalman position/velocity smoothing in a local meter frame
 *    (equirectangular projection around the first accepted fix, R = 6371000 m);
 * 4. EMA altitude with outlier suppression.
 *
 * Returns the smoothed sample (input timestamp, accuracy and speed preserved)
 * or null when the sample is rejected. Fully deterministic: the same input
 * sequence always yields the same output sequence.
 *
 * Tuning rationale (runner at 1 Hz; realistic top speed ~6 m/s, hard ceiling 12 m/s):
 * - process noise: continuous white-noise-acceleration model with
 *   sigma_a = 0.1 m/s² (a runner accelerates gently; larger values make the
 *   filter track accuracy-ring noise and inflate point-to-point arc length);
 * - measurement noise: R = (accuracy / 2)² with a 3 m² variance floor so fake
 *   0-accuracy fixes cannot dominate;
 * - innovation clamped to 3·sqrt(P) per axis to avoid velocity blowups;
 * - output smoothing: an EMA (alpha = 0.3) over the Kalman posterior position,
 *   applied outside the state update so the filter math is untouched — the
 *   posterior still carries ~0.5 m per-axis step jitter which would otherwise
 *   add ~3% of arc length on a noisy 3 m/s track;
 * - altitude EMA alpha = 0.15, single-sample jumps > 15 m treated as outliers;
 * - automatic reset on a > 15 s time gap or after > 5 consecutive rejections;
 * - a first fix with accuracy > 10 m starts a 5-sample warm-up in which the
 *   position is updated measurement-only (no velocity extrapolation in predict).
 */
class LocationFilter {

    private companion object {
        const val EARTH_RADIUS_M = 6371000.0

        // Hard gates.
        const val MAX_ACCURACY_M = 100.0f
        const val FIRST_FIX_MAX_ACCURACY_M = 50.0f

        // Spike rejection.
        const val SPIKE_MIN_JUMP_M = 30.0
        const val SPIKE_ACCURACY_FACTOR = 3.0
        const val SPEED_CEILING_MPS = 12.0
        const val RECOVERY_ACCURACY_FACTOR = 0.5

        // Reset triggers.
        const val GAP_RESET_MS = 15_000L
        const val MAX_CONSECUTIVE_REJECTIONS = 5

        // Kalman tuning.
        const val MEAS_VAR_FLOOR_M2 = 3.0
        const val ACCURACY_TO_SIGMA = 0.5
        const val SIGMA_A_MPS2 = 0.1
        const val INITIAL_VELOCITY_VAR_M2 = 4.0
        const val INNOVATION_CLAMP_SIGMAS = 3.0

        // Output smoothing (does not feed back into the Kalman state).
        const val OUT_EMA_ALPHA = 0.3

        // Altitude smoothing.
        const val ALT_EMA_ALPHA = 0.15
        const val ALT_OUTLIER_JUMP_M = 15.0
        const val ALT_OUTLIER_REANCHOR_STREAK = 5

        // Post-reset baseline sanity: a fresh baseline far from the last known
        // position is only trusted with a genuinely good fix (e.g. tunnel exit).
        const val POST_RESET_MAX_JUMP_M = 150.0
        const val POST_RESET_GOOD_ACCURACY_M = 15.0f

        // First-fix warm-up.
        const val WARMUP_ACCURACY_M = 10.0f
        const val WARMUP_SAMPLES = 5
    }

    private var hasBaseline = false
    private var lat0 = 0.0
    private var lon0 = 0.0
    private var cosLat0 = 1.0
    private var lastAcceptedMs = 0L
    private var lastAcceptedX = 0.0
    private var lastAcceptedY = 0.0
    private var lastAccuracy = 0.0f

    private var kfX = AxisKF()
    private var kfY = AxisKF()
    private var warmUpRemaining = 0

    // Output EMA state (local meter frame), seeded at the baseline anchor.
    private var outEmaX = 0.0
    private var outEmaY = 0.0

    private var hasAltEstimate = false
    private var altEstimateM = 0.0
    private var altOutlierStreak = 0

    private var consecutiveRejections = 0

    // Last smoothed output position; intentionally kept across reset() so a
    // post-reset baseline can be sanity-checked against where the runner was.
    private var hasLastOutput = false
    private var lastOutputLat = 0.0
    private var lastOutputLon = 0.0

    /**
     * Feeds one raw fix through the pipeline. Returns the smoothed sample
     * (same [GpsSample.timestampMs], [GpsSample.accuracyMeters] and
     * [GpsSample.speedMetersPerSecond] as the input) or null when rejected.
     */
    fun filter(sample: GpsSample): GpsSample? {
        val acc = sample.accuracyMeters
        if (acc > MAX_ACCURACY_M) return reject()
        if (hasBaseline) {
            val dtMs = sample.timestampMs - lastAcceptedMs
            if (dtMs <= 0L) return reject()
            if (dtMs > GAP_RESET_MS) reset() // long gap (e.g. auto-pause): re-anchor here
        }
        if (!hasBaseline) return acceptBaseline(sample)

        val dt = (sample.timestampMs - lastAcceptedMs) / 1000.0
        val x = toX(sample.longitude)
        val y = toY(sample.latitude)

        // Spike rejection vs. the last accepted fix. The speed branch additionally
        // requires the jump to exceed 3× accuracy so accuracy-ring noise at 1 Hz
        // can never look like a speed spike.
        val d = hypot(x - lastAcceptedX, y - lastAcceptedY)
        val jumpLimitM = max(SPIKE_MIN_JUMP_M, SPIKE_ACCURACY_FACTOR * acc)
        val speedAnomaly = d / dt > SPEED_CEILING_MPS && d > SPIKE_ACCURACY_FACTOR * acc
        if (d > jumpLimitM || speedAnomaly) {
            val recovering = acc < RECOVERY_ACCURACY_FACTOR * lastAccuracy &&
                residualWithinPrediction(x, y, dt, acc.toDouble())
            if (!recovering) return reject()
        }

        // Kalman predict + update in the local meter frame.
        val extrapolate = warmUpRemaining == 0
        kfX.predict(dt, extrapolate)
        kfY.predict(dt, extrapolate)
        val measVar = measurementVariance(acc)
        kfX.update(x, measVar)
        kfY.update(y, measVar)

        if (warmUpRemaining > 0) {
            warmUpRemaining--
            if (acc < WARMUP_ACCURACY_M) warmUpRemaining = 0
        }

        // Altitude EMA with outlier rejection.
        if (!hasAltEstimate) {
            altEstimateM = sample.altitudeMeters
            hasAltEstimate = true
        } else if (abs(sample.altitudeMeters - altEstimateM) <= ALT_OUTLIER_JUMP_M) {
            altEstimateM += ALT_EMA_ALPHA * (sample.altitudeMeters - altEstimateM)
            altOutlierStreak = 0
        } else {
            // Outlier jump — keep the estimate, but a persistent offset (e.g. a
            // first-fix vertical error) must not freeze elevation for the session.
            altOutlierStreak++
            if (altOutlierStreak >= ALT_OUTLIER_REANCHOR_STREAK) {
                altEstimateM = sample.altitudeMeters
                altOutlierStreak = 0
            }
        }

        // Output-side smoothing: EMA over the posterior position. This removes
        // the residual per-step Kalman jitter that inflates point-to-point arc
        // length; the internal state estimate is unaffected.
        outEmaX += OUT_EMA_ALPHA * (kfX.p - outEmaX)
        outEmaY += OUT_EMA_ALPHA * (kfY.p - outEmaY)

        lastAcceptedMs = sample.timestampMs
        lastAcceptedX = x
        lastAcceptedY = y
        lastAccuracy = acc
        consecutiveRejections = 0

        val outLat = fromY(outEmaY)
        val outLon = fromX(outEmaX)
        lastOutputLat = outLat
        lastOutputLon = outLon
        hasLastOutput = true

        return GpsSample(
            latitude = outLat,
            longitude = outLon,
            altitudeMeters = altEstimateM,
            accuracyMeters = sample.accuracyMeters,
            speedMetersPerSecond = sample.speedMetersPerSecond,
            timestampMs = sample.timestampMs,
        )
    }

    /** Clears all state; the next accepted sample becomes the new baseline. */
    fun reset() {
        hasBaseline = false
        lastAcceptedMs = 0L
        lastAcceptedX = 0.0
        lastAcceptedY = 0.0
        lastAccuracy = 0.0f
        kfX = AxisKF()
        kfY = AxisKF()
        warmUpRemaining = 0
        outEmaX = 0.0
        outEmaY = 0.0
        hasAltEstimate = false
        altEstimateM = 0.0
        altOutlierStreak = 0
        consecutiveRejections = 0
    }

    private fun acceptBaseline(s: GpsSample): GpsSample? {
        if (s.accuracyMeters > FIRST_FIX_MAX_ACCURACY_M) return reject()
        if (hasLastOutput && s.accuracyMeters > POST_RESET_GOOD_ACCURACY_M) {
            val dx = toRadians(s.longitude - lastOutputLon) * EARTH_RADIUS_M * cos(toRadians(lastOutputLat))
            val dy = toRadians(s.latitude - lastOutputLat) * EARTH_RADIUS_M
            if (hypot(dx, dy) > POST_RESET_MAX_JUMP_M) return reject()
        }
        lat0 = s.latitude
        lon0 = s.longitude
        cosLat0 = cos(toRadians(lat0))
        val posVar = measurementVariance(s.accuracyMeters)
        kfX = AxisKF().apply { initialize(posVar) }
        kfY = AxisKF().apply { initialize(posVar) }
        warmUpRemaining = if (s.accuracyMeters > WARMUP_ACCURACY_M) WARMUP_SAMPLES else 0
        hasBaseline = true
        lastAcceptedMs = s.timestampMs
        lastAcceptedX = 0.0
        lastAcceptedY = 0.0
        lastAccuracy = s.accuracyMeters
        outEmaX = 0.0
        outEmaY = 0.0
        altEstimateM = s.altitudeMeters
        hasAltEstimate = true
        altOutlierStreak = 0
        consecutiveRejections = 0
        lastOutputLat = s.latitude
        lastOutputLon = s.longitude
        hasLastOutput = true
        return s // baseline echoes the fix; smoothing starts from the next sample
    }

    /** Distance from the velocity-predicted position to the fix, vs. the accuracy ring. */
    private fun residualWithinPrediction(x: Double, y: Double, dt: Double, ringM: Double): Boolean {
        val px = if (warmUpRemaining == 0) kfX.p + kfX.v * dt else kfX.p
        val py = if (warmUpRemaining == 0) kfY.p + kfY.v * dt else kfY.p
        val rx = x - px
        val ry = y - py
        return rx * rx + ry * ry <= ringM * ringM
    }

    private fun measurementVariance(acc: Float): Double {
        val sigma = ACCURACY_TO_SIGMA * acc
        return max(sigma * sigma, MEAS_VAR_FLOOR_M2)
    }

    private fun reject(): GpsSample? {
        consecutiveRejections++
        if (consecutiveRejections > MAX_CONSECUTIVE_REJECTIONS) reset()
        return null
    }

    private fun toRadians(deg: Double) = deg * PI / 180.0

    private fun toX(lon: Double) = toRadians(lon - lon0) * EARTH_RADIUS_M * cosLat0

    private fun toY(lat: Double) = toRadians(lat - lat0) * EARTH_RADIUS_M

    private fun fromX(x: Double) = lon0 + (x / (EARTH_RADIUS_M * cosLat0)) * 180.0 / PI

    private fun fromY(y: Double) = lat0 + (y / EARTH_RADIUS_M) * 180.0 / PI

    /** 1-D position/velocity Kalman filter over one axis of the local meter frame. */
    private class AxisKF {
        var p = 0.0 // position (m)
        var v = 0.0 // velocity (m/s)
        var p00 = 1.0 // Var[p]
        var p01 = 0.0 // Cov[p, v]
        var p11 = 1.0 // Var[v]

        fun initialize(posVar: Double) {
            p = 0.0
            v = 0.0
            p00 = posVar
            p01 = 0.0
            p11 = INITIAL_VELOCITY_VAR_M2
        }

        /** Time-variant predict; velocity extrapolation is skipped during warm-up. */
        fun predict(dt: Double, extrapolateVelocity: Boolean) {
            if (extrapolateVelocity) p += v * dt
            // P = F·P·Fᵀ + Q, continuous white-noise-acceleration Q with sigma_a
            val q = SIGMA_A_MPS2 * SIGMA_A_MPS2
            val dt2 = dt * dt
            p00 = p00 + 2.0 * dt * p01 + dt2 * p11 + q * dt2 * dt2 / 4.0
            p01 = p01 + dt * p11 + q * dt2 * dt / 2.0
            p11 = p11 + q * dt2
        }

        /** Measurement update with position z (m); innovation clamped to 3·sqrt(P). */
        fun update(z: Double, measVar: Double) {
            var y = z - p
            val clamp = INNOVATION_CLAMP_SIGMAS * sqrt(p00)
            if (y > clamp) y = clamp else if (y < -clamp) y = -clamp
            val s = p00 + measVar
            val k0 = p00 / s
            val k1 = p01 / s
            p += k0 * y
            v += k1 * y
            p00 = (1.0 - k0) * p00
            p11 = p11 - k1 * p01
            p01 = (1.0 - k0) * p01
        }
    }
}
