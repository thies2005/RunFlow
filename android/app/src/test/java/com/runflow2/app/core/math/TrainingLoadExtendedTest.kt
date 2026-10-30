package com.runflow2.app.core.math

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class TrainingLoadExtendedTest {

    @Test
    fun `resolveEffectiveTss strictly follows Decision U1 across all sport modes`() {
        // Rides: bikeTss > 0 ? bikeTss : round(trimp * 0.85)
        assertEquals(75.0, TrainingLoad.resolveEffectiveTss("RIDE", 3600, bikeTss = 75.0, trimp = 80.0), 0.01)
        assertEquals(68.0, TrainingLoad.resolveEffectiveTss("RIDE", 3600, bikeTss = 0.0, trimp = 80.0), 0.01) // 80 * 0.85 = 68
        assertEquals(68.0, TrainingLoad.resolveEffectiveTss("VIRTUAL_RIDE", 3600, bikeTss = 0.0, trimp = 80.0), 0.01)

        // Runs: runningTss > 0 ? runningTss : round(trimp * 0.85)
        assertEquals(60.0, TrainingLoad.resolveEffectiveTss("RUN", 3000, runningTss = 60.0, trimp = 50.0), 0.01)
        assertEquals(43.0, TrainingLoad.resolveEffectiveTss("RUN", 3000, runningTss = 0.0, trimp = 50.0), 0.01) // 50 * 0.85 = 42.5 -> 43

        // Strength (WORKOUT / STRENGTH): max(round(trimp), round(h * 36))
        // 50-minute strength session with 7 TRIMP should be max(7, round(50/60 * 36)) = max(7, 30) = 30
        val fiftyMinSec = 50 * 60
        assertEquals(30.0, TrainingLoad.resolveEffectiveTss("STRENGTH", fiftyMinSec, trimp = 7.0), 0.01)
        assertEquals(30.0, TrainingLoad.resolveEffectiveTss("WORKOUT", fiftyMinSec, trimp = 7.0), 0.01)
        assertEquals(36.0, TrainingLoad.resolveEffectiveTss("STRENGTH", 3600, trimp = 20.0), 0.01)

        // Other Cardio (SWIM, HIKE, WALK, OTHER): trimp > 0 ? round(trimp * 0.85) : round(h * 40)
        assertEquals(51.0, TrainingLoad.resolveEffectiveTss("SWIM", 2400, trimp = 60.0), 0.01) // 60 * 0.85 = 51
        assertEquals(40.0, TrainingLoad.resolveEffectiveTss("SWIM", 3600, trimp = 0.0), 0.01) // 1.0 * 40 = 40
        assertEquals(40.0, TrainingLoad.resolveEffectiveTss("OTHER", 3600, trimp = 0.0), 0.01)
    }

    @Test
    fun `projectFutureSeries evolves CTL and ATL day by day`() {
        val today = LocalDate.parse("2026-11-01")
        val planned = mapOf(
            today.plusDays(1) to 50.0,
            today.plusDays(2) to 60.0,
            today.plusDays(3) to 70.0,
        )

        val series = TrainingLoad.projectFutureSeries(
            lastCtl = 40.0,
            lastAtl = 45.0,
            plannedTssByDate = planned,
            from = today.plusDays(1),
            to = today.plusDays(3),
        )

        assertEquals(3, series.size)
        assertEquals(today.plusDays(1), series[0].date)
        assertEquals(today.plusDays(3), series[2].date)
        assertTrue(series[0].ctl > 40.0) // CTL climbs with 50 TSS
        assertTrue(series[0].atl > 45.0) // ATL climbs with 50 TSS
    }

    @Test
    fun `ctlRampRate7d measures 7-day change in fitness`() {
        val today = LocalDate.parse("2026-11-01")
        val series = (0..7).map { i ->
            TrainingLoad.DailyLoad(
                date = today.plusDays(i.toLong()),
                trimp = 50.0,
                ctl = 40.0 + i * 1.5, // Climbs by 1.5 per day, so 7 days = +10.5
                atl = 50.0,
            )
        }

        val rampRate = TrainingLoad.ctlRampRate7d(series)
        assertEquals(10.5, rampRate, 0.01)
    }

    @Test
    fun `fosterMonotonyStrain calculates Foster metrics accurately`() {
        // Uniform load -> low variance -> high monotony
        val uniformLoads = listOf(50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0)
        val metrics1 = TrainingLoad.fosterMonotonyStrain(uniformLoads)
        assertEquals(50.0, metrics1.mean, 0.01)
        assertEquals(0.0, metrics1.stdDev, 0.01)
        assertEquals(10.0, metrics1.monotony, 0.01) // clamped high

        // Varied load -> normal monotony
        val variedLoads = listOf(10.0, 60.0, 0.0, 80.0, 20.0, 70.0, 0.0)
        val metrics2 = TrainingLoad.fosterMonotonyStrain(variedLoads)
        assertEquals(34.28, metrics2.mean, 0.1)
        assertTrue(metrics2.stdDev > 10.0)
        assertTrue(metrics2.monotony in 0.5..2.5)
        assertTrue(metrics2.strain > 0.0)
    }

    @Test
    fun `acwr calculates workload ratio`() {
        assertEquals(1.25, TrainingLoad.acwr(atl = 50.0, ctl = 40.0), 0.01)
        assertEquals(0.0, TrainingLoad.acwr(atl = 50.0, ctl = 0.0), 0.01)
    }
}
