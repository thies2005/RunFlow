package com.runflow2.app.core.gps

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

private const val EARTH_RADIUS_M = 6371000.0
private const val T0 = 1_700_000_000_000L
private const val START_LAT = 45.0
private const val START_LON = 9.0
private val METERS_PER_DEG_LAT = PI * EARTH_RADIUS_M / 180.0
private val METERS_PER_DEG_LON = METERS_PER_DEG_LAT * cos(START_LAT * PI / 180.0)

/** Noise-free straight line heading east at a constant speed, 1 Hz. */
private fun cleanTrack(points: Int, speedMps: Double = 3.0): List<GpsSample> =
    (0 until points).map { i ->
        GpsSample(
            latitude = START_LAT,
            longitude = START_LON + speedMps * i / METERS_PER_DEG_LON,
            altitudeMeters = 100.0,
            accuracyMeters = 5f,
            speedMetersPerSecond = speedMps.toFloat(),
            timestampMs = T0 + i * 1000L,
        )
    }

/**
 * Same straight line with deterministic Gaussian noise. Accuracy rings cycle
 * 5..15 m; per the filter's (accuracy/2)² measurement model the noise std is
 * accuracy/2, so the ring is the ~2σ envelope.
 */
private fun noisyTrack(
    points: Int,
    speedMps: Double = 3.0,
    accuracyMinM: Int = 5,
    accuracyMaxM: Int = 15,
    altitudeNoiseStdM: Double = 0.0,
    seed: Long = 42L,
): List<GpsSample> {
    val rnd = Random(seed)
    return (0 until points).map { i ->
        val acc = accuracyMinM + (i % (accuracyMaxM - accuracyMinM + 1))
        val sigma = acc / 2.0
        val eastM = speedMps * i + rnd.nextGaussian() * sigma
        val northM = rnd.nextGaussian() * sigma
        val alt = 100.0 + 0.01 * i + if (altitudeNoiseStdM > 0.0) rnd.nextGaussian() * altitudeNoiseStdM else 0.0
        GpsSample(
            latitude = START_LAT + northM / METERS_PER_DEG_LAT,
            longitude = START_LON + eastM / METERS_PER_DEG_LON,
            altitudeMeters = alt,
            accuracyMeters = acc.toFloat(),
            speedMetersPerSecond = speedMps.toFloat(),
            timestampMs = T0 + i * 1000L,
        )
    }
}

private fun haversineM(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val dLat = (lat2 - lat1) * PI / 180.0
    val dLon = (lon2 - lon1) * PI / 180.0
    val a = sin(dLat / 2).let { it * it } +
        cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) * sin(dLon / 2).let { it * it }
    return 2 * EARTH_RADIUS_M * asin(sqrt(a))
}

private fun trackDistanceM(pts: List<GpsSample>): Double =
    pts.zipWithNext().sumOf { (a, b) -> haversineM(a.latitude, a.longitude, b.latitude, b.longitude) }

private fun variance(v: List<Double>): Double {
    val mean = v.average()
    return v.sumOf { (it - mean) * (it - mean) } / v.size
}

class LocationFilterTest {

    @Test
    fun `smoothing keeps distance within two percent and beats raw noisy track`() {
        val truth = cleanTrack(1000)
        val noisy = noisyTrack(1000)
        val truthDist = trackDistanceM(truth)
        val rawDist = trackDistanceM(noisy)
        val filter = LocationFilter()
        val filtered = noisy.mapNotNull { filter.filter(it) }
        // noise may very rarely trip a spike gate; only mass rejection would be a bug
        assertTrue("only ${filtered.size}/1000 accepted", filtered.size > 950)
        val filteredDist = trackDistanceM(filtered)
        val filteredErr = abs(filteredDist - truthDist)
        val rawErr = abs(rawDist - truthDist)
        assertTrue("filtered distance $filteredDist vs truth $truthDist", filteredErr / truthDist < 0.02)
        assertTrue("raw error $rawErr should exceed filtered error $filteredErr", rawErr > filteredErr)
    }

    @Test
    fun `injected spikes are rejected`() {
        val filter = LocationFilter()
        cleanTrack(100).forEach { filter.filter(it) }
        val last = cleanTrack(100).last() // t = T0 + 99 s, 297 m east

        // +80 m jump beyond the 30 m displacement gate
        val jump = last.copy(
            longitude = last.longitude + 80.0 / METERS_PER_DEG_LON,
            timestampMs = last.timestampMs + 1000L,
        )
        assertNull(filter.filter(jump))

        // back on the true line 1 s later (dt = 2 s since last accepted) — accepted
        val resume = last.copy(
            longitude = last.longitude + 6.0 / METERS_PER_DEG_LON,
            timestampMs = last.timestampMs + 2000L,
        )
        assertNotNull(filter.filter(resume))

        // +25 m/s implied speed: 25 m sideways in 1 s is inside the 30 m gate but
        // beyond 3× accuracy (15 m) with implied speed > 12 m/s
        val speedSpike = resume.copy(
            latitude = resume.latitude + 25.0 / METERS_PER_DEG_LAT,
            timestampMs = resume.timestampMs + 1000L,
        )
        assertNull(filter.filter(speedSpike))

        val next = resume.copy(
            longitude = resume.longitude + 6.0 / METERS_PER_DEG_LON,
            timestampMs = resume.timestampMs + 2000L,
        )
        val out = filter.filter(next)
        assertNotNull(out)
        // API contract: timestamp, accuracy and speed pass through untouched
        assertEquals(next.timestampMs, out!!.timestampMs)
        assertEquals(next.accuracyMeters, out.accuracyMeters)
        assertEquals(next.speedMetersPerSecond, out.speedMetersPerSecond)
    }

    @Test
    fun `non-monotonic timestamps are rejected`() {
        val filter = LocationFilter()
        val track = cleanTrack(10)
        track.forEach { filter.filter(it) }
        val last = track.last()
        val ahead = last.longitude + 3.0 / METERS_PER_DEG_LON
        assertNull(filter.filter(last.copy(longitude = ahead))) // same timestamp
        assertNull(filter.filter(last.copy(longitude = ahead, timestampMs = last.timestampMs - 5000L)))
        val next = last.copy(longitude = ahead, timestampMs = last.timestampMs + 1000L)
        assertNotNull(filter.filter(next))
    }

    @Test
    fun `accuracy above 100 m is rejected`() {
        val filter = LocationFilter()
        assertNull(filter.filter(cleanTrack(1).first().copy(accuracyMeters = 120f))) // even as first fix
        val track = cleanTrack(10)
        track.dropLast(1).forEach { filter.filter(it) }
        val last = track.last()
        assertNull(
            filter.filter(
                last.copy(
                    longitude = last.longitude + 3.0 / METERS_PER_DEG_LON,
                    timestampMs = last.timestampMs + 1000L,
                    accuracyMeters = 150f,
                ),
            ),
        )
        assertNotNull(
            filter.filter(
                last.copy(
                    longitude = last.longitude + 6.0 / METERS_PER_DEG_LON,
                    timestampMs = last.timestampMs + 2000L,
                ),
            ),
        )
    }

    @Test
    fun `first fix with accuracy above 50 m is rejected until a good fix arrives`() {
        val filter = LocationFilter()
        val first = cleanTrack(2).first()
        assertNull(filter.filter(first.copy(accuracyMeters = 60f)))
        val good = first.copy(timestampMs = first.timestampMs + 1000L) // accuracy 5
        val out = filter.filter(good)
        assertNotNull(out)
        assertEquals(good.latitude, out!!.latitude, 1e-12)
        assertEquals(good.longitude, out.longitude, 1e-12)
    }

    @Test
    fun `altitude noise is smoothed`() {
        val filter = LocationFilter()
        val noisy = noisyTrack(400, altitudeNoiseStdM = 2.0, seed = 99L)
        val out = noisy.mapNotNull { filter.filter(it) }
        assertTrue("only ${out.size}/400 accepted", out.size > 380)
        val rawVar = variance(noisy.map { it.altitudeMeters })
        val filteredVar = variance(out.map { it.altitudeMeters })
        assertTrue("filtered variance $filteredVar vs raw $rawVar", filteredVar < rawVar * 0.5)
    }

    @Test
    fun `single altitude jump above 15 m is ignored`() {
        val filter = LocationFilter()
        val track = noisyTrack(50, altitudeNoiseStdM = 1.0, seed = 7L)
        track.forEach { filter.filter(it) }
        val last = track.last()
        val before = filter.filter(
            last.copy(
                longitude = last.longitude + 3.0 / METERS_PER_DEG_LON,
                timestampMs = last.timestampMs + 1000L,
            ),
        )!!
        val jump = filter.filter(
            last.copy(
                longitude = last.longitude + 6.0 / METERS_PER_DEG_LON,
                altitudeMeters = last.altitudeMeters + 20.0,
                timestampMs = last.timestampMs + 2000L,
            ),
        )
        assertNotNull(jump)
        assertEquals(before.altitudeMeters, jump!!.altitudeMeters, 1e-9)
    }

    @Test
    fun `filter resets after 15 s gap and continues`() {
        val filter = LocationFilter()
        val track = cleanTrack(20)
        track.forEach { filter.filter(it) }
        val last = track.last()
        val gap = last.copy(
            longitude = last.longitude + 60.0 / METERS_PER_DEG_LON, // consistent with 3 m/s
            timestampMs = last.timestampMs + 20_000L,
        )
        val out = filter.filter(gap)
        assertNotNull(out)
        // after reset the sample becomes the new baseline and echoes its position
        assertEquals(gap.latitude, out!!.latitude, 1e-12)
        assertEquals(gap.longitude, out.longitude, 1e-12)
        assertNotNull(
            filter.filter(
                gap.copy(
                    longitude = gap.longitude + 3.0 / METERS_PER_DEG_LON,
                    timestampMs = gap.timestampMs + 1000L,
                ),
            ),
        )
    }

    @Test
    fun `sustained rejections trigger automatic reset`() {
        val filter = LocationFilter()
        val track = cleanTrack(20)
        track.forEach { filter.filter(it) }
        val last = track.last()
        val spikeLon = last.longitude + 80.0 / METERS_PER_DEG_LON
        repeat(6) { i ->
            assertNull(filter.filter(last.copy(longitude = spikeLon, timestampMs = last.timestampMs + (i + 1) * 1000L)))
        }
        // the 6th rejection tripped the auto-reset, so the 7th spike lands as a fresh baseline
        assertNotNull(filter.filter(last.copy(longitude = spikeLon, timestampMs = last.timestampMs + 7_000L)))
    }

    @Test
    fun `identical input yields identical output`() {
        val input = noisyTrack(300, seed = 1234L)
        val a = LocationFilter().let { f -> input.map { f.filter(it) } }
        val b = LocationFilter().let { f -> input.map { f.filter(it) } }
        assertEquals(a, b)
    }

    @Test
    fun `dramatically better fix agreeing with prediction recovers from a bad cluster`() {
        val filter = LocationFilter()
        cleanTrack(10).forEach { filter.filter(it) }
        val last = cleanTrack(10).last() // t = T0 + 9 s, 27 m east, acc 5

        // a poor-accuracy fix offset +50 m gets accepted (jump limit is 3×20=60)
        val poor = last.copy(
            longitude = last.longitude + 50.0 / METERS_PER_DEG_LON,
            accuracyMeters = 20f,
            timestampMs = last.timestampMs + 1000L,
        )
        assertNotNull(filter.filter(poor))

        // the runner's true next fix is 44 m away from the poor fix (beyond the
        // 30 m gate and the speed ceiling) but has acc 5 (< 0.5×20) and agrees
        // with the prediction — the recovery clause must accept it
        val good = last.copy(
            longitude = last.longitude + 6.0 / METERS_PER_DEG_LON,
            accuracyMeters = 5f,
            timestampMs = last.timestampMs + 2000L,
        )
        assertNotNull(filter.filter(good))

        // contrast: an equally good fix that does NOT agree with the prediction
        // (another +50 m sideways) is still rejected
        val off = last.copy(
            longitude = last.longitude + 6.0 / METERS_PER_DEG_LON,
            latitude = last.latitude + 50.0 / METERS_PER_DEG_LAT,
            accuracyMeters = 5f,
            timestampMs = last.timestampMs + 3000L,
        )
        assertNull(filter.filter(off))
    }

    @Test
    fun `persistent altitude offset re-anchors instead of freezing`() {
        val track = cleanTrack(15).mapIndexed { i, s ->
            if (i < 5) s else s.copy(altitudeMeters = 120.0)
        }
        val filter = LocationFilter()
        val out = track.mapNotNull { filter.filter(it) }
        // samples 5..8 are outliers (kept at 100); sample 9 re-anchors to 120
        assertEquals(100.0, out[8].altitudeMeters, 1e-9)
        assertEquals(120.0, out[9].altitudeMeters, 1e-9)
        assertEquals(120.0, out[14].altitudeMeters, 1e-9)
    }

    @Test
    fun `post-reset baseline far from the runner needs a good fix`() {
        val filter = LocationFilter()
        val track = cleanTrack(10)
        track.forEach { filter.filter(it) }
        val last = track.last()
        val farLon = last.longitude + 3000.0 / METERS_PER_DEG_LON

        // six clean-accuracy spikes trip the auto-reset
        repeat(6) { i ->
            assertNull(filter.filter(last.copy(longitude = farLon, timestampMs = last.timestampMs + (i + 1) * 1000L)))
        }
        // far + inaccurate fix must not re-anchor the baseline
        assertNull(filter.filter(last.copy(longitude = farLon, accuracyMeters = 40f, timestampMs = last.timestampMs + 7_000L)))
        assertNull(filter.filter(last.copy(longitude = farLon, accuracyMeters = 40f, timestampMs = last.timestampMs + 8_000L)))
        // a genuinely good fix re-anchors even far away (e.g. tunnel exit)
        assertNotNull(filter.filter(last.copy(longitude = farLon, accuracyMeters = 10f, timestampMs = last.timestampMs + 9_000L)))
    }

    @Test
    fun `inaccurate first fix warm-up still converges onto track`() {
        val samples = cleanTrack(300).mapIndexed { i, s -> if (i == 0) s.copy(accuracyMeters = 12f) else s }
        val filter = LocationFilter()
        val out = samples.mapNotNull { filter.filter(it) }
        assertEquals(300, out.size)
        val truthDist = trackDistanceM(cleanTrack(300))
        val dist = trackDistanceM(out)
        assertTrue("distance $dist vs truth $truthDist", abs(dist - truthDist) / truthDist < 0.05)
    }
}
