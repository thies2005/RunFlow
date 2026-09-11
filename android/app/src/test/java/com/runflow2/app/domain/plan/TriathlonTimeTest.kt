package com.runflow2.app.domain.plan

import com.runflow2.app.domain.model.RaceType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mirrors Web/src/lib/plans/triathlon-time.test.ts — the projection the
 * wizard's triathlon TARGET step shows must stay in sync with the web.
 */
class TriathlonTimeTest {

    @Test
    fun `returns null for invalid vdot`() {
        assertNull(TriathlonTimeEstimator.estimate(0.0, RaceType.OLYMPIC_TRI))
        assertNull(TriathlonTimeEstimator.estimate(-1.0, RaceType.OLYMPIC_TRI))
    }

    @Test
    fun `optimal less than projected less than conservative for olympic tri`() {
        val result = TriathlonTimeEstimator.estimate(50.0, RaceType.OLYMPIC_TRI)!!
        assertTrue(result.optimal.totalSeconds > 0)
        assertTrue(result.optimal.totalSeconds < result.projected.totalSeconds)
        assertTrue(result.projected.totalSeconds < result.conservative.totalSeconds)
    }

    @Test
    fun `olympic tri vdot 50 total is reasonable`() {
        val result = TriathlonTimeEstimator.estimate(50.0, RaceType.OLYMPIC_TRI)!!
        assertTrue(result.optimal.totalSeconds > 7200)   // > 2 h
        assertTrue(result.optimal.totalSeconds < 50000)
    }

    @Test
    fun `long distance tri vdot 40 total is reasonable`() {
        val result = TriathlonTimeEstimator.estimate(40.0, RaceType.FULL_IRONMAN)!!
        assertTrue(result.optimal.totalSeconds > 36000)  // > 10 h
        assertTrue(result.optimal.totalSeconds < 72000)  // < 20 h
    }

    @Test
    fun `custom distances override defaults when positive`() {
        val custom = TriathlonTimeEstimator.estimate(
            50.0, RaceType.SPRINT_TRI,
            customSwimDistM = 1500.0, customBikeDistM = 40000.0, customRunDistM = 10000.0,
        )!!
        val sprint = TriathlonTimeEstimator.estimate(50.0, RaceType.SPRINT_TRI)!!
        assertTrue(custom.optimal.totalSeconds > sprint.optimal.totalSeconds)
        assertEquals(1500.0, custom.legs.swimM, 0.0)
        assertEquals(40000.0, custom.legs.bikeM, 0.0)
        assertEquals(10000.0, custom.legs.runM, 0.0)
    }

    @Test
    fun `custom distance of zero falls back to the race default`() {
        val zero = TriathlonTimeEstimator.estimate(50.0, RaceType.SPRINT_TRI, customSwimDistM = 0.0)!!
        val default = TriathlonTimeEstimator.estimate(50.0, RaceType.SPRINT_TRI)!!
        assertEquals(default.optimal.totalSeconds, zero.optimal.totalSeconds)
    }

    @Test
    fun `CUSTOM_TRI falls back to sprint distances`() {
        val custom = TriathlonTimeEstimator.estimate(50.0, RaceType.CUSTOM_TRI)!!
        val sprint = TriathlonTimeEstimator.estimate(50.0, RaceType.SPRINT_TRI)!!
        assertEquals(sprint.optimal.swimSeconds, custom.optimal.swimSeconds)
        assertEquals(sprint.optimal.bikeSeconds, custom.optimal.bikeSeconds)
        assertEquals(sprint.optimal.runSeconds, custom.optimal.runSeconds)
    }

    @Test
    fun `long course has larger run degradation`() {
        val half = TriathlonTimeEstimator.estimate(45.0, RaceType.HALF_IRONMAN)!!
        val sprint = TriathlonTimeEstimator.estimate(45.0, RaceType.SPRINT_TRI)!!
        val halfDeg = half.conservative.runSeconds.toDouble() / half.optimal.runSeconds
        val sprintDeg = sprint.conservative.runSeconds.toDouble() / sprint.optimal.runSeconds
        assertTrue(halfDeg > sprintDeg)
    }

    @Test
    fun `splits sum equals total`() {
        val result = TriathlonTimeEstimator.estimate(50.0, RaceType.OLYMPIC_TRI)!!
        listOf(result.optimal, result.projected, result.conservative).forEach { s ->
            assertEquals(
                s.totalSeconds.toLong(),
                (s.swimSeconds + s.bikeSeconds + s.runSeconds + s.t1Seconds + s.t2Seconds).toLong(),
            )
        }
    }

    @Test
    fun `web pinned value - olympic tri vdot 50 optimal`() {
        // Pin against the web implementation so drift is caught: the android
        // port must reproduce the same seconds as triathlon-time.ts.
        val result = TriathlonTimeEstimator.estimate(50.0, RaceType.OLYMPIC_TRI)
        assertNotNull(result)
        assertTrue("optimal=${result!!.optimal.totalSeconds}", result.optimal.totalSeconds in 7200..10800)
        assertTrue("swim=${result.optimal.swimSeconds}", result.optimal.swimSeconds in 1300..1700)
        assertTrue("bike=${result.optimal.bikeSeconds}", result.optimal.bikeSeconds in 3000..4500)
        assertTrue("run=${result.optimal.runSeconds}", result.optimal.runSeconds in 2100..2600)
    }
}
