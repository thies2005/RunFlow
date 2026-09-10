package com.runflow2.app

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.domain.analytics.ActivityInput
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.domain.model.ActivityType
import com.runflow2.app.domain.model.TsbStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Pins the analytics engine's sport scoping: CTL/ATL/TSB and HR zones cover
 * ALL activities (web parity), while VO₂ max and distance metrics stay
 * run-only. Also pins the % of max denominators (all-time CTL/ATL peaks).
 */
class AnalyticsEngineTest {

    private val today: LocalDate = LocalDate.of(2026, 9, 7) // a Monday

    private fun run(
        date: LocalDate,
        km: Double = 10.0,
        trimp: Double = 100.0,
        vdot: Double? = null,
        zones: List<Int> = emptyList(),
    ) = ActivityInput(
        id = "r-${date}-${km}-${trimp}",
        type = ActivityType.RUN,
        date = date,
        distanceKm = km,
        movingTimeSec = (km * 60).toInt(),
        averageHr = 150.0,
        trimp = trimp,
        estimatedVdot = vdot,
        zoneSeconds = zones,
    )

    private fun ride(
        date: LocalDate,
        trimp: Double = 80.0,
        zones: List<Int> = emptyList(),
        movingTimeSec: Int = 3600,
    ) = ActivityInput(
        id = "b-${date}-${trimp}",
        type = ActivityType.RIDE,
        date = date,
        distanceKm = 30.0,
        movingTimeSec = movingTimeSec,
        averageHr = 140.0,
        trimp = trimp,
        estimatedVdot = null,
        zoneSeconds = zones,
    )

    // ---- sport scoping ----

    @Test
    fun `ride load counts toward CTL and ATL`() {
        val day = today.minusDays(1)
        val onlyRun = AnalyticsEngine.compute(listOf(run(day, trimp = 100.0)), today, 1.0)
        val runPlusRide = AnalyticsEngine.compute(listOf(run(day, trimp = 100.0), ride(day, trimp = 80.0)), today, 1.0)
        assertTrue(runPlusRide.ctl > onlyRun.ctl)
        assertTrue(runPlusRide.atl > onlyRun.atl)
    }

    @Test
    fun `ride does not feed weekly km volume or vdot`() {
        val dayInWeek = today // today is a Monday — the current week's only day
        val b = AnalyticsEngine.compute(
            listOf(run(dayInWeek, km = 10.0), ride(dayInWeek)),
            today,
            1.0,
        )
        assertEquals(10.0, b.currentWeekKm, 0.001) // ride's 30 km excluded
        assertEquals(1, b.weeklyVolume.last().runs)
        assertNull(b.effectiveVdot) // no valid run vdot in the window
    }

    @Test
    fun `zone totals include all sports`() {
        val day = today.minusDays(1)
        val zones = listOf(600, 300, 0, 0, 0, 0, 0)
        val b = AnalyticsEngine.compute(listOf(ride(day, zones = zones)), today, 1.0)
        assertEquals(600, b.zoneSeconds[0])
        assertEquals(300, b.zoneSeconds[1])
    }

    @Test
    fun `zone totals exclude activities outside the range window`() {
        val recent = today.minusDays(1)
        val ancient = today.minusDays(400) // beyond the 365-day default range
        val b = AnalyticsEngine.compute(
            listOf(run(recent, zones = listOf(60, 0, 0, 0, 0, 0, 0)), run(ancient, zones = listOf(999, 0, 0, 0, 0, 0, 0))),
            today,
            1.0,
        )
        assertEquals(60, b.zoneSeconds[0])
    }

    // ---- % of max ----

    @Test
    fun `maxCtl maxAtl peak over the full history not just the window`() {
        // a big block 400 days ago (outside the 365-day display window) sets the all-time peak
        val block = (0 until 30).map { run(today.minusDays(400L - it), trimp = 300.0) }
        val recent = listOf(run(today.minusDays(1), trimp = 60.0))
        val b = AnalyticsEngine.compute(block + recent, today, 1.0, rangeDays = 365)
        assertTrue("maxCtl should exceed the in-window CTL", b.maxCtl > b.ctl)
        assertTrue(b.maxAtl >= b.atl)
        val pct = (b.ctl / b.maxCtl * 100)
        assertTrue("current CTL is a fraction of the old peak, got $pct", pct < 60.0)
    }

    @Test
    fun `max bounds the current values at or above one hundred percent`() {
        val b = AnalyticsEngine.compute(listOf(run(today.minusDays(1), trimp = 500.0)), today, 1.0)
        assertTrue(b.maxCtl >= b.ctl)
        assertTrue(b.maxAtl >= b.atl)
        assertTrue((b.ctl / b.maxCtl * 100) <= 100.0)
    }

    // ---- fallback TRIMP (web parity) ----

    @Test
    fun `activities without trimp or zones fall back to flat load for non-runs`() {
        val day = today.minusDays(1)
        val hrLessRide = ride(day, trimp = 0.0, movingTimeSec = 7200) // 2 h
        val b = AnalyticsEngine.compute(listOf(hrLessRide), today, 1.0)
        // 120 min × 2.5 = 300 TRIMP on the day → ATL strictly positive
        assertTrue(b.atl > 0.0)
    }

    @Test
    fun `zero-trimp run without hr falls back to the pace curve`() {
        val day = today.minusDays(1)
        val b = AnalyticsEngine.compute(listOf(run(day, trimp = 0.0)), today, 1.0)
        assertTrue(b.atl > 0.0)
    }

    // ---- VDOT scoping ----

    @Test
    fun `effective vdot uses recent best run and correction`() {
        val b = AnalyticsEngine.compute(
            listOf(
                run(today.minusDays(10), km = 10.0, vdot = 50.0),
                run(today.minusDays(5), km = 10.0, vdot = 55.0),
                ride(today.minusDays(5)),
            ),
            today,
            1.0,
        )
        assertEquals(55.0, b.rawVdot!!, 0.001)
        assertEquals(55.0, b.effectiveVdot!!, 0.001)
        assertNotNull(b.marathonShape)
    }

    @Test
    fun `old or short vdot runs are ignored`() {
        val b = AnalyticsEngine.compute(
            listOf(
                run(today.minusDays(120), km = 10.0, vdot = 70.0), // > 90 days
                run(today.minusDays(10), km = 2.0, vdot = 70.0), // < 5 km
            ),
            today,
            1.0,
        )
        assertNull(b.effectiveVdot)
        assertNull(b.marathonShape)
    }

    @Test
    fun `marathon shape is the web composite, never a ctl ratio`() {
        // 120 days of solid training → CTL far above 65: the old invented
        // formula (ctl/65×100) would have shown >100%; the web composite cannot
        val acts = (0 until 120).map { run(today.minusDays(120L - it), km = 12.0, trimp = 150.0, vdot = 55.0) }
        val b = AnalyticsEngine.compute(acts, today, 1.0)
        assertTrue("ctl ${b.ctl} should exceed the old 65 target", b.ctl > 65.0)
        assertNotNull(b.marathonShape)
        assertTrue("shape ${b.marathonShape} must be capped at 100", b.marathonShape!! <= 100.0)
        // web mileage divides the 6-month total by a flat 26 weeks: 1440 km/26
        // = 55.4 km/wk vs vdot 55 → mileage 100.7, no long runs (<13 km), no
        // CT → shape = round(100.7 × 2/3) = 67
        assertEquals(67.0, b.marathonShape!!, 0.0)
    }

    // ---- status ----

    @Test
    fun `tsb status follows the band table`() {
        val b = AnalyticsEngine.compute(emptyList(), today, 1.0)
        assertEquals(TsbStatus.NEUTRAL, b.tsbStatus) // ctl == atl == 0
    }

    // ---- fallback TRIMP curve ----

    @Test
    fun `trimpFallback uses the pace curve for runs and the flat rate otherwise`() {
        val paceRun = TrainingLoad.trimpFallback(60.0, avgSpeedMS = 3.0, thresholdSpeedMS = 3.0, isRun = true)
        val flatRide = TrainingLoad.trimpFallback(60.0, avgSpeedMS = 8.0, thresholdSpeedMS = 3.0, isRun = false)
        // a ride at run-threshold speed must NOT be scored as a max-effort run
        assertTrue(flatRide < paceRun)
        assertEquals(60.0 * TrainingLoad.FLAT_TRIMP_PER_MIN, flatRide, 0.001)
    }
}
