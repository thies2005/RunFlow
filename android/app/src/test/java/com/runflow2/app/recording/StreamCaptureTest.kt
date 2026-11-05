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
        assertEquals(List(3) { listOf(50.93, 6.96) }, s.latlng)
    }

    @Test
    fun `long recordings are downsampled to the cap`() {
        val points = (0 until 9_000).map { pt(it.toLong(), 50.0, 3.0) }
        val s = StreamCapture.build(points)!!
        assertTrue(s.time.size in 2..StreamCapture.MAX_SAMPLES)
        assertEquals(0.0, s.time.first(), 1e-9)
        // monotonic; ceil(9000/2000) = 5 fixes per sample at ~1 Hz
        assertTrue(s.time.zipWithNext().all { (a, b) -> b > a })
        assertEquals(5.0, s.time[1] - s.time[0], 1e-9)
        assertEquals(8999.0, s.time.last(), 1e-9)
        assertEquals(s.time.size, s.latlng!!.size)
        assertEquals(s.time.size, s.altitude!!.size)
        assertEquals(s.time.size, s.velocitySmooth!!.size)
    }

    @Test
    fun `endpoint stays within sample cap for an exact multiple of the limit`() {
        val s = StreamCapture.build((0 until 4000).map { pt(it.toLong(), 50.0, 3.0) })!!
        assertTrue(s.time.size <= StreamCapture.MAX_SAMPLES)
        assertEquals(3999.0, s.time.last(), 0.0)
        assertEquals(s.time.size, s.latlng!!.size)
    }

    @Test
    fun `downsampled GPS includes the final fix and survives upload serialization`() {
        val points = (0 until 9000).map { pt(it.toLong(), it.toDouble(), 3.0).copy(lat = 45.0 + it / 1e6, lng = 25.0) }
        val streams = StreamCapture.build(points)!!
        val json = com.runflow2.app.data.net.Api.json.encodeToString(com.runflow2.app.data.net.ActivityStreamsDto.serializer(), streams)
        val restored = com.runflow2.app.data.net.Api.json.decodeFromString(com.runflow2.app.data.net.ActivityStreamsDto.serializer(), json)
        assertEquals(listOf(points.first().lat, points.first().lng), restored.latlng!!.first())
        assertEquals(listOf(points.last().lat, points.last().lng), restored.latlng!!.last())
        assertEquals(points.last().ele, restored.altitude!!.last(), 0.0)
    }
}
