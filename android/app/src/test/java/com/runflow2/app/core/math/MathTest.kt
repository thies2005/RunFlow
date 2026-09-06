package com.runflow2.app.core.math

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class VdotMathTest {

    @Test
    fun `known performance yields sensible vdot`() {
        // 10K in 40:00 → raw Daniels-Gilbert formula ≈ 51.9 (tables round to 50.4)
        val vdot = VdotMath.vdot(10000.0, 40 * 60.0)
        assertTrue("was $vdot", vdot in 50.5..53.0)
    }

    @Test
    fun `marathon 3h corresponds to vdot around 54`() {
        val vdot = VdotMath.vdot(42195.0, 3 * 3600.0)
        assertTrue("was $vdot", vdot in 53.0..56.0)
    }

    @Test
    fun `prediction round trips`() {
        val vdot = 50.0
        val predicted = VdotMath.predictTimeSec(vdot, 10000.0)
        assertNotNull(predicted)
        val recomputed = VdotMath.vdot(10000.0, predicted!!)
        assertEquals(vdot, recomputed, 0.01)
    }

    @Test
    fun `longer distance means slower pace at same vdot`() {
        val v = 50.0
        val t5k = VdotMath.predictTimeSec(v, 5000.0)!!
        val t10k = VdotMath.predictTimeSec(v, 10000.0)!!
        assertTrue(t10k > t5k * 2) // pace slows as distance grows
    }

    @Test
    fun `easy pace is slower than threshold pace`() {
        val paces = TrainingPaces(50.0)
        assertTrue(paces.paceSecPerKm(WorkoutPaceTarget.EASY) > paces.paceSecPerKm(WorkoutPaceTarget.THRESHOLD))
        assertTrue(paces.paceSecPerKm(WorkoutPaceTarget.THRESHOLD) > paces.paceSecPerKm(WorkoutPaceTarget.INTERVAL))
    }

    @Test
    fun `training paces for vdot 50 near Daniels tables`() {
        val paces = TrainingPaces(50.0)
        val easy = paces.paceSecPerKm(WorkoutPaceTarget.EASY)
        // Fractions mirror the Flutter app (E 0.65–0.79, T 0.88, I 1.0)
        assertTrue("easy was $easy", easy in 290.0..335.0)
        val threshold = paces.paceSecPerKm(WorkoutPaceTarget.THRESHOLD)
        assertTrue("threshold was $threshold", threshold in 240.0..300.0)
    }
}

class TrainingLoadTest {

    @Test
    fun `banister trimp for typical easy run`() {
        // 60 min at HR 130, max 192 rest 52 → ratio 0.556, TRIMP ≈ 62
        val trimp = TrainingLoad.trimpFromHr(60.0, 130.0, 192, 52)
        assertNotNull(trimp)
        assertTrue("was $trimp", trimp!! in 45.0..80.0)
    }

    @Test
    fun `trimp rejects nonsense heart rates`() {
        assertNull(TrainingLoad.trimpFromHr(60.0, 40.0, 192, 52))
    }

    @Test
    fun `higher hr yields higher trimp per minute`() {
        val easy = TrainingLoad.trimpFromHr(60.0, 130.0, 192, 52)!!
        val hard = TrainingLoad.trimpFromHr(60.0, 165.0, 192, 52)!!
        assertTrue(hard > easy)
    }

    @Test
    fun `ctl converges under constant daily load`() {
        // 40 TRIMP every day for 400 days → CTL → 40
        val start = LocalDate.of(2025, 1, 1)
        val end = start.plusDays(399)
        val load = buildMap {
            var d = start
            repeat(400) { put(d, 40.0); d = d.plusDays(1) }
        }
        val series = TrainingLoad.dailySeries(load, end, 400)
        val last = series.last()
        assertEquals(40.0, last.ctl, 0.5)
        assertEquals(40.0, last.atl, 0.5)
    }

    @Test
    fun `tsb negative during load spike`() {
        val load = buildMap {
            var d = LocalDate.of(2025, 6, 1)
            repeat(200) { put(d, 30.0); d = d.plusDays(1) }
            // then spike week
            d = LocalDate.of(2025, 12, 25)
            repeat(10) { put(d, 120.0); d = d.plusDays(1) }
        }
        val series = TrainingLoad.dailySeries(load, LocalDate.of(2026, 1, 3), 200)
        val last = series.last()
        assertTrue("tsb was ${last.tsb}", last.tsb < 0)
    }

    @Test
    fun `pace-based trimp is plausible for easy run`() {
        // 60 min, ~12.1 km/h easy vs threshold 14.4 km/h
        val trimp = TrainingLoad.trimpFromPace(60.0, 3.36, 4.0)
        assertTrue("was $trimp", trimp in 40.0..130.0)
    }

    @Test
    fun `tsb status bands match spec`() {
        assertEquals(com.runflow2.app.domain.model.TsbStatus.PEAKED, TrainingLoad.tsbStatus(30.0))
        assertEquals(com.runflow2.app.domain.model.TsbStatus.FRESH, TrainingLoad.tsbStatus(10.0))
        assertEquals(com.runflow2.app.domain.model.TsbStatus.NEUTRAL, TrainingLoad.tsbStatus(-5.0))
        assertEquals(com.runflow2.app.domain.model.TsbStatus.FATIGUED, TrainingLoad.tsbStatus(-20.0))
        assertEquals(com.runflow2.app.domain.model.TsbStatus.VERY_FATIGUED, TrainingLoad.tsbStatus(-40.0))
    }
}
