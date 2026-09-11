package com.runflow2.app.core.math

import com.runflow2.app.data.net.ActivityStreamsDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the pace/GAP derivations to the web's InteractiveStreamsChart math so
 * both clients draw identical curves for the same activity.
 */
class StreamMathTest {

    // ---- pace conversion ----

    @Test
    fun `velocity to min per km`() {
        // 3 m/s = 5:33.3/km
        assertEquals((1000.0 / 3.0) / 60.0, StreamMath.minPerKm(3.0)!!, 1e-9)
        // 0.9 m/s = 18.5 min/km — still chartable
        assertEquals(18.518, StreamMath.minPerKm(0.9)!!, 0.01)
    }

    @Test
    fun `standing and outlier samples are null`() {
        assertNull(StreamMath.minPerKm(0.05))                  // below the 0.1 m/s floor
        assertNull(StreamMath.minPerKm(0.5))                   // 33 min/km — above the 20 min/km cap
    }

    // ---- GAP cost ratio (web's simplified Minetti) ----

    @Test
    fun `flat ground costs exactly baseline`() {
        assertEquals(1.0, StreamMath.gapCostRatio(0.0), 1e-9)
    }

    @Test
    fun `uphill cost rises 3 percent per grade percent`() {
        assertEquals(1.15, StreamMath.gapCostRatio(5.0), 1e-9)
        assertEquals(1.30, StreamMath.gapCostRatio(10.0), 1e-9)
    }

    @Test
    fun `gentle downhill is beneficial, steep downhill is not`() {
        assertEquals(0.925, StreamMath.gapCostRatio(-5.0), 1e-9)
        // continuous at the -10 % switch point, then rising again
        assertEquals(0.85, StreamMath.gapCostRatio(-10.0), 1e-9)
        assertEquals(0.85, StreamMath.gapCostRatio(-10.0 - 1e-9), 1e-6)
        assertEquals(0.95, StreamMath.gapCostRatio(-15.0), 1e-9)
    }

    @Test
    fun `gap is faster uphill and slower downhill than actual pace`() {
        val pace = 5.0
        assertTrue(StreamMath.gapMinPerKm(pace, 8.0)!! < pace)
        assertTrue(StreamMath.gapMinPerKm(pace, -5.0)!! > pace)
    }

    @Test
    fun `gap outliers beyond the 2 to 20 window are null`() {
        assertNull(StreamMath.gapMinPerKm(1.5, 0.0))  // faster than 2:00/km
        assertNull(StreamMath.gapMinPerKm(25.0, 0.0)) // slower than 20:00/km
    }

    // ---- series building ----

    @Test
    fun `flat terrain makes gap equal pace`() {
        val s = StreamMath.build(
            ActivityStreamsDto(
                time = listOf(0.0, 10.0, 20.0, 30.0),
                velocitySmooth = listOf(3.0, 3.0, 3.0, 3.0),
                altitude = listOf(50.0, 50.0, 50.0, 50.0),
            )
        )
        assertFalse(s.isEmpty)
        assertNull(s.gap[0]) // no previous sample at i = 0
        for (i in 1..3) {
            assertEquals(s.pace[i]!!, s.gap[i]!!, 1e-9)
        }
    }

    @Test
    fun `climbing samples get a faster gap`() {
        val s = StreamMath.build(
            ActivityStreamsDto(
                time = listOf(0.0, 10.0, 20.0),
                velocitySmooth = listOf(3.0, 3.0, 3.0),
                altitude = listOf(100.0, 103.0, 106.0), // 3 m per 30 m → 10 % grade
            )
        )
        val pace = s.pace[1]!!
        val gap = s.gap[1]!!
        assertEquals(pace / 1.30, gap, 1e-9)
        assertTrue(gap < pace)
    }

    @Test
    fun `long streams downsample to the rendering cap`() {
        val n = 5_000
        val s = StreamMath.build(
            ActivityStreamsDto(
                time = List(n) { it * 5.0 },
                velocitySmooth = List(n) { 3.0 },
                altitude = List(n) { 50.0 + it * 0.1 },
            )
        )
        assertTrue(s.time.size in 2..StreamMath.MAX_POINTS + 1)
        assertEquals(0.0, s.time.first(), 1e-9)
        // step of 3 keeps every third sample (ceil(5000/2000)): 3 × 5 s spacing
        assertEquals((n + 2) / 3, s.time.size)
        assertEquals(15.0, s.time[2] - s.time[1], 1e-9)
    }

    @Test
    fun `cadence is doubled to spm and standing pace is dropped`() {
        val s = StreamMath.build(
            ActivityStreamsDto(
                time = listOf(0.0, 5.0, 10.0),
                velocitySmooth = listOf(3.0, 0.0, 3.0),
                cadence = listOf(88.0, 90.0, 91.0),
            )
        )
        assertEquals(listOf(176.0, 180.0, 182.0), s.cadence!!)
        assertNull(s.pace[1]) // 0 m/s → standing
        assertEquals((1000.0 / 3.0) / 60.0, s.pace[2]!!, 1e-9)
    }

    @Test
    fun `short series are empty`() {
        val s = StreamMath.build(ActivityStreamsDto(time = listOf(0.0)))
        assertTrue(s.isEmpty)
    }
}
