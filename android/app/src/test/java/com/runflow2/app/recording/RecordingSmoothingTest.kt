package com.runflow2.app.recording

import com.runflow2.app.core.gps.GpsSample
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos

/**
 * Drives [RecordingController.onLocation] with deterministic GPS tracks to pin
 * the Kalman smoothing integration: with smoothing on, a noisy straight walk
 * stays close to the true distance and implied-speed spikes are dropped; with
 * smoothing off, the raw pre-filter behavior (including the old <60 m gate)
 * is preserved exactly.
 */
class RecordingSmoothingTest {

    private companion object {
        const val T0 = 1_700_000_000_000L
        const val START_LAT = 45.0
        const val START_LON = 9.0
        val METERS_PER_DEG_LAT = PI * 6_371_000.0 / 180.0
        val METERS_PER_DEG_LON = METERS_PER_DEG_LAT * cos(START_LAT * PI / 180.0)
    }

    private fun runningController(smoothing: Boolean = true): RecordingController =
        RecordingController(gpsSmoothingEnabled = smoothing).apply {
            start(null, countdownSec = 1)
            beginCountdownTick() // 1 -> 0 -> RUNNING
        }

    /** Noise-free straight line heading east at 3 m/s, 1 Hz. */
    private fun cleanWalk(n: Int): List<GpsSample> =
        (0 until n).map { i ->
            GpsSample(
                latitude = START_LAT,
                longitude = START_LON + 3.0 * i / METERS_PER_DEG_LON,
                altitudeMeters = 100.0,
                accuracyMeters = 5f,
                speedMetersPerSecond = 3.0f,
                timestampMs = T0 + i * 1000L,
            )
        }

    /** Same line with deterministic Gaussian fix noise (accuracy ring ~2σ). */
    private fun noisyWalk(n: Int, sigmaM: Double = 2.0, seed: Long = 42L): List<GpsSample> {
        val rnd = Random(seed)
        return (0 until n).map { i ->
            val eastM = 3.0 * i + rnd.nextGaussian() * sigmaM
            val northM = rnd.nextGaussian() * sigmaM
            GpsSample(
                latitude = START_LAT + northM / METERS_PER_DEG_LAT,
                longitude = START_LON + eastM / METERS_PER_DEG_LON,
                altitudeMeters = 100.0,
                accuracyMeters = 5f,
                speedMetersPerSecond = 3.0f,
                timestampMs = T0 + i * 1000L,
            )
        }
    }

    private fun feed(controller: RecordingController, samples: List<GpsSample>) {
        samples.forEach {
            controller.onLocation(
                lat = it.latitude,
                lng = it.longitude,
                ele = it.altitudeMeters,
                speed = it.speedMetersPerSecond.toDouble(),
                accuracy = it.accuracyMeters,
                t = it.timestampMs,
            )
        }
    }

    /** 25 m sideways jump in 1 s: inside the old d<60 gate but implies 25 m/s. */
    private fun spikeAfter(track: List<GpsSample>, accuracy: Float = 5f): GpsSample =
        track.last().let {
            it.copy(
                latitude = it.latitude + 25.0 / METERS_PER_DEG_LAT,
                accuracyMeters = accuracy,
                timestampMs = it.timestampMs + 1000L,
            )
        }

    @Test
    fun `smoothing on keeps noisy walk distance close to truth`() {
        val controller = runningController()
        val n = 90
        feed(controller, noisyWalk(n))
        val truth = 3.0 * (n - 1) // 267 m east at 3 m/s
        val dist = controller.state.value.distanceM
        assertTrue("distance $dist vs truth $truth", abs(dist - truth) / truth < 0.08)
    }

    @Test
    fun `smoothing on ignores an implied 25 m per second spike`() {
        val controller = runningController()
        val lead = cleanWalk(30)
        feed(controller, lead)
        val before = controller.state.value

        feed(controller, listOf(spikeAfter(lead)))
        val after = controller.state.value
        assertEquals(before.distanceM, after.distanceM, 0.001) // no distance for the spike
        assertEquals(before.points.size, after.points.size) // and no polyline point

        // walking on re-anchors and keeps accumulating distance
        val resume = lead.last().let {
            it.copy(
                longitude = it.longitude + 6.0 / METERS_PER_DEG_LON,
                timestampMs = it.timestampMs + 2000L,
            )
        }
        feed(controller, listOf(resume))
        assertTrue(controller.state.value.distanceM > before.distanceM + 2.0)
    }

    @Test
    fun `rejected spike with better accuracy still improves the gps chip`() {
        val controller = runningController()
        val lead = cleanWalk(10)
        feed(controller, lead)
        assertEquals(5f, controller.state.value.gpsAccuracyM)
        val before = controller.state.value

        feed(controller, listOf(spikeAfter(lead, accuracy = 3f)))
        val s = controller.state.value
        assertEquals(3f, s.gpsAccuracyM) // chip reflects the raw signal quality
        assertEquals(before.points.size, s.points.size) // but no point was added
        assertEquals(before.distanceM, s.distanceM, 0.001) // and no distance either
    }

    @Test
    fun `smoothing off preserves raw behavior`() {
        val controller = runningController(smoothing = false)
        val lead = cleanWalk(30)
        feed(controller, lead)
        val before = controller.state.value
        assertEquals(29 * 3.0, before.distanceM, 0.5) // raw fixes counted as-is
        assertEquals(30, before.points.size)

        // 25 m jump sits inside the old gates -> still counted (pre-filter behavior)
        feed(controller, listOf(spikeAfter(lead)))
        val spiked = controller.state.value
        assertEquals(31, spiked.points.size)
        assertEquals(before.distanceM + 25.0, spiked.distanceM, 1.0)

        // >60 m jump is still dropped by the old noise gate (point kept, no distance)
        val jump = lead.last().let {
            it.copy(
                latitude = it.latitude + 100.0 / METERS_PER_DEG_LAT,
                timestampMs = it.timestampMs + 2000L,
            )
        }
        feed(controller, listOf(jump))
        val jumped = controller.state.value
        assertEquals(32, jumped.points.size)
        assertEquals(spiked.distanceM, jumped.distanceM, 0.001)
    }
}
