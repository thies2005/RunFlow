package com.runflow2.app.core.math

import com.runflow2.app.core.math.MarathonShape.CrossTraining
import com.runflow2.app.core.math.MarathonShape.Run
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

/**
 * Pins the marathon-shape port of Web/src/lib/metrics/runalyze.ts
 * calculateMarathonShape — goldens hand-derived from the TS formula.
 */
class MarathonShapeTest {

    private val today: LocalDate = LocalDate.of(2026, 9, 7)

    private fun run(daysAgo: Long, km: Double) = Run(today.minusDays(daysAgo), km)

    private fun ct(daysAgo: Long, movingMin: Int, zones: List<Int> = emptyList()) =
        CrossTraining(today.minusDays(daysAgo), movingMin * 60, zones)

    @Test
    fun `mileage component drives shape when runs are short`() {
        // 26 weekly 12 km runs, vdot 24 → mileage 12/24×100 = 50, no long runs (<13 km)
        val runs = (0..25).map { run(it * 7L, 12.0) }
        val r = MarathonShape.calculate(runs, emptyList(), 24.0, today)
        assertEquals(50.0, r.mileageScore, 0.001)
        assertEquals(0.0, r.longRunScore, 0.001)
        assertEquals(33, r.shape) // round(50 × 2/3)
    }

    @Test
    fun `decayed long run adds one third weight`() {
        // single 30 km run 7 days ago, vdot 50:
        // mileage = (30/26)/50×100 = 2.3077
        // base = 1.7^1.5×0.5+0.5 = 1.60826; decay 0.98^7 → longRunPoints = 1.39618
        // (the web's details.longRunPoints is the DECAYED sum) → 13.9618 score
        // shape = round(2.3077×2/3 + 13.9618/3) = round(6.19) = 6
        val r = MarathonShape.calculate(listOf(run(7, 30.0)), emptyList(), 50.0, today)
        assertEquals(1.39618, r.longRunPoints, 0.001)
        assertEquals(13.9618, r.longRunScore, 0.01)
        assertEquals(6, r.shape)
    }

    @Test
    fun `cross-training switches to the 50-25-25 formula`() {
        // 26 weekly 10 km runs → mileage 20 @ vdot 50, no long runs
        // 12×2 h rides within 90 days → 1440 min → 112 min/wk → 37.33 score
        // shape = round(20×0.5 + 0 + 37.33×0.5×0.25) = round(14.67) = 15
        val runs = (0..25).map { run(it * 7L, 10.0) }
        val rides = (0..11).map { ct(it * 7L, 120) }
        val r = MarathonShape.calculate(runs, rides, 50.0, today)
        assertEquals(20.0, r.mileageScore, 0.001)
        assertEquals(37.333, r.crossTrainingScore, 0.01)
        assertEquals(15, r.shape)
    }

    @Test
    fun `component and total caps apply`() {
        // 26 weekly 100 km runs, vdot 30 → mileage capped 120, long runs capped 120
        // raw = 120×2/3 + 120/3 = 120 → capped at 100
        val runs = (0..25).map { run(it * 7L, 100.0) }
        val r = MarathonShape.calculate(runs, emptyList(), 30.0, today)
        assertEquals(120.0, r.mileageScore, 0.001)
        assertEquals(120.0, r.longRunScore, 0.001)
        assertEquals(100, r.shape)
    }

    @Test
    fun `ct zone data wins over moving time`() {
        // 30 min of zone time counts as 30 min, not the 120 min moving time
        val runs = (0..25).map { run(it * 7L, 10.0) }
        val rides = listOf(ct(1, 120, zones = listOf(1800)))
        val r = MarathonShape.calculate(runs, rides, 50.0, today)
        assertEquals(30.0, r.crossTrainingMinutes, 0.001)
    }

    @Test
    fun `no runs or non-positive vdot yields zero`() {
        assertEquals(0, MarathonShape.calculate(emptyList(), emptyList(), 50.0, today).shape)
        assertEquals(0, MarathonShape.calculate(listOf(run(1, 10.0)), emptyList(), 0.0, today).shape)
    }
}
