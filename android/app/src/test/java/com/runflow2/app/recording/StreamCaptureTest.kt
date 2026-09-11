package com.runflow2.app.recording

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Stream synthesis from recorded GPS points — feeds the analysis charts. */
class StreamCaptureTest {

    private fun pt(tSec: Long, ele: Double, speed: Double) =
        GeoPt(lat = 50.93, lng = 6.96, ele = ele, t = 1_700_000_000_000 + tSec * 1000, speed = speed)

    @Test
    fun `fewer than two points produce no streams`() {
        assertNull(StreamCapture.build(emptyList()))
        assertNull(StreamCapture.build(listOf(pt(0, 50.0, 3.0))))
    }

    @Test
    fun `time altitude and velocity come straight from the fixes`() {
        val s = StreamCapture.build(
            listOf(pt(0, 50.0, 3.0), pt(1, 50.5, 2.9), pt(2, 51.0, 3.1))
        )!!
        assertEquals(listOf(0.0, 1.0, 2.0), s.time)
        assertEquals(listOf(50.0, 50.5, 51.0), s.altitude)
        assertEquals(listOf(3.0, 2.9, 3.1), s.velocitySmooth)
    }

    @Test
    fun `long recordings are downsampled to the cap`() {
        val points = (0 until 9_000).map { pt(it.toLong(), 50.0, 3.0) }
        val s = StreamCapture.build(points)!!
        assertTrue(s.time.size in 2..StreamCapture.MAX_SAMPLES + 1)
        assertEquals(0.0, s.time.first(), 1e-9)
        // monotonic; ceil(9000/2000) = 5 fixes per sample at ~1 Hz
        assertTrue(s.time.zipWithNext().all { (a, b) -> b > a })
        assertEquals(5.0, s.time[1] - s.time[0], 1e-9)
    }
}
