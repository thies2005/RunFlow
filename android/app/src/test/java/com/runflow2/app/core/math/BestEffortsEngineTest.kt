package com.runflow2.app.core.math

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BestEffortsEngineTest {

    @Test
    fun `findBestEfforts finds 400m and 1k efforts with sliding window`() {
        // 2000m total run:
        // First 1000m at 4:00/km (4.167 m/s, 240s total)
        // Second 1000m at 3:20/km (5.0 m/s, 200s total) -> fastest 1k is 200s!
        val distList = mutableListOf<Double>()
        val timeList = mutableListOf<Int>()

        // 0 to 1000m: 1 point every 10 seconds (100 points, 240 seconds total)
        var currentDist = 0.0
        var currentTime = 0
        distList.add(0.0)
        timeList.add(0)

        // First 1000m in 240s (speed = 1000/240 = 4.1667 m/s)
        for (i in 1..240) {
            currentTime++
            currentDist += (1000.0 / 240.0)
            distList.add(currentDist)
            timeList.add(currentTime)
        }

        // Second 1000m in 200s (speed = 1000/200 = 5.0 m/s)
        for (i in 1..200) {
            currentTime++
            currentDist += 5.0
            distList.add(currentDist)
            timeList.add(currentTime)
        }

        val efforts = BestEffortsEngine.findBestEfforts(
            distanceStream = distList,
            timeStream = timeList,
        )

        val effort1k = efforts.find { it.label == "1k" }
        assertNotNull(effort1k)
        assertEquals(1000.0, effort1k!!.distanceMeters, 0.01)
        assertEquals(200, effort1k.timeSec) // Fastest 1k was the second half (200s)

        val effort400m = efforts.find { it.label == "400m" }
        assertNotNull(effort400m)
        assertEquals(400.0, effort400m!!.distanceMeters, 0.01)
        assertEquals(80, effort400m.timeSec) // 400m at 5 m/s = 80s
    }

    @Test
    fun `findMeanMaximalPower extracts peak watts for standard durations`() {
        // Stream of 600 seconds (10 minutes)
        // Baseline 200W, but with a 60s sprint of 400W from t=100 to t=160
        val watts = DoubleArray(600) { 200.0 }
        for (t in 100 until 160) {
            watts[t] = 400.0
        }

        val mmp = BestEffortsEngine.findMeanMaximalPower(watts.toList())

        val p5s = mmp.find { it.durationSec == 5 }
        assertNotNull(p5s)
        assertEquals(400.0, p5s!!.maxWatts, 0.01)

        val p60s = mmp.find { it.durationSec == 60 }
        assertNotNull(p60s)
        assertEquals(400.0, p60s!!.maxWatts, 0.01)

        val p300s = mmp.find { it.durationSec == 300 }
        assertNotNull(p300s)
        // 300s window containing the 60s 400W sprint and 240s of 200W:
        // (60*400 + 240*200) / 300 = (24000 + 48000) / 300 = 72000 / 300 = 240W
        assertEquals(240.0, p300s!!.maxWatts, 0.1)
    }

    @Test
    fun `findMeanMaximalPowerWithTime resamples non-uniform time stream`() {
        // Samples every 2 seconds: t=0, 2, 4, 6, 8, 10
        val times = listOf(0, 2, 4, 6, 8, 10)
        val watts = listOf(300.0, 300.0, 300.0, 300.0, 300.0, 300.0)

        val mmp = BestEffortsEngine.findMeanMaximalPowerWithTime(watts, times, listOf(5, 10))
        val p5s = mmp.find { it.durationSec == 5 }
        assertNotNull(p5s)
        assertEquals(300.0, p5s!!.maxWatts, 0.01)
    }
}
