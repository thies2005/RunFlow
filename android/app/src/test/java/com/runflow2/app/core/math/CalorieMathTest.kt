package com.runflow2.app.core.math

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CalorieMathTest {

    @Test
    fun `moderate run matches the web engine's MET math`() {
        // 30 min @ ~2.96 m/s (easy run pace) → moderate 9.8 MET
        // → 9.8 × 72 kg × 0.5 h = 353 kcal
        assertEquals(352, CalorieMath.estimate(1_800, 5_300.0, 72.0))
    }

    @Test
    fun `fast runs escalate to vigorous METs`() {
        val easy = CalorieMath.estimate(1_800, 5_300.0, 72.0)!!   // ~2.96 m/s
        val fast = CalorieMath.estimate(1_800, 6_700.0, 72.0)!!   // ~3.72 m/s
        assertTrue(fast > easy)
    }

    @Test
    fun `rides use their own MET table`() {
        // 60 min @ ~6.9 m/s (25 km/h) → moderate 8.0 MET → 8 × 72 = 576
        assertEquals(576, CalorieMath.estimate(3_600, 25_000.0, 72.0, type = "RIDE"))
    }

    @Test
    fun `workouts without distance default to moderate`() {
        val kcal = CalorieMath.estimate(3_000, 0.0, 80.0, type = "STRENGTH")!!
        // 6 MET × 80 kg × (3000/3600) h = 400
        assertEquals(400, kcal)
    }

    @Test
    fun `old inflated formula magnitude is gone`() {
        // The pre-fix device formula produced ~0.945 kcal/min/kg — a 30 min
        // 72 kg run computed >2000 kcal. The MET estimate must stay an order
        // of magnitude below that.
        val kcal = CalorieMath.estimate(1_800, 5_300.0, 72.0)!!
        assertTrue("estimate $kcal is implausibly high", kcal < 600)
    }

    @Test
    fun `unusable inputs return null`() {
        assertNull(CalorieMath.estimate(0, 5_000.0, 72.0))
        assertNull(CalorieMath.estimate(1_800, 5_000.0, 0.0))
        assertNull(CalorieMath.estimate(-5, 5_000.0, 72.0))
    }
}
