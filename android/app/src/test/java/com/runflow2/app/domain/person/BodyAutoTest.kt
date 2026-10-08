package com.runflow2.app.domain.person

import com.runflow2.app.domain.person.BodyAuto.HrEffort
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Hand-computed expectations for the body auto-refresh decision logic
 * ([BodyAuto]) and its Karvonen boundary helper. The conventions pinned here:
 *  - median pick is Dart's `sorted[length ~/ 2]` (upper middle for even
 *    counts, NOT an interpolated median — same as ReadinessComposer);
 *  - hrMax only ever rises and never above 210;
 *  - Karvonen Z6 ends exactly AT max HR (hrr x 1.0 + rest = hrMax), so the
 *    auto model has no separate Z7 band.
 */
class BodyAutoTest {

    // ---- rhrMedian ----

    @Test
    fun `median of odd count picks the middle element`() {
        assertEquals(52.0, BodyAuto.rhrMedian(listOf(50.0, 52.0, 54.0))!!, 0.0)
    }

    @Test
    fun `median of even count picks the upper middle (Dart parity)`() {
        // sorted = [50, 52, 54, 56]; sorted[4/2] = 54 — not the interpolated 53.
        assertEquals(54.0, BodyAuto.rhrMedian(listOf(52.0, 56.0, 50.0, 54.0))!!, 0.0)
    }

    @Test
    fun `median sorts before picking`() {
        val values = listOf(60.0, 40.0, 50.0, 45.0, 55.0, 65.0, 35.0)
        // sorted = [35, 40, 45, 50, 55, 60, 65] -> middle 50
        assertEquals(50.0, BodyAuto.rhrMedian(values)!!, 0.0)
    }

    @Test
    fun `median is pure - sample gating lives in compute`() {
        assertNull(BodyAuto.rhrMedian(emptyList()))
        // the MIN_RHR_SAMPLES gate is compute()'s rule (see below), not the median's
        assertEquals(54.0, BodyAuto.rhrMedian((1..BodyAuto.MIN_RHR_SAMPLES).map { 50.0 + it })!!, 0.0)
    }

    // ---- observedHrMax ----

    @Test
    fun `observed max HR ignores non-efforts and picks the highest`() {
        val efforts = listOf(
            HrEffort(maxHr = 185, averageHr = 150.0),
            HrEffort(maxHr = 150, averageHr = 80.0), // easy jog: no max-HR signal
            HrEffort(maxHr = 205, averageHr = 140.0),
        )
        assertEquals(205, BodyAuto.observedHrMax(efforts))
    }

    @Test
    fun `observed max HR requires average HR strictly above the effort floor`() {
        assertNull(BodyAuto.observedHrMax(listOf(HrEffort(maxHr = 190, averageHr = BodyAuto.HR_EFFORT_MIN_AVG_HR))))
        assertNull(BodyAuto.observedHrMax(listOf(HrEffort(maxHr = 190, averageHr = 99.9))))
    }

    @Test
    fun `observed max HR respects the absolute ceiling`() {
        assertNull(BodyAuto.observedHrMax(listOf(HrEffort(maxHr = 220, averageHr = 150.0))))
        // a strap glitch above the ceiling must not mask a believable value
        assertEquals(190, BodyAuto.observedHrMax(listOf(HrEffort(maxHr = 190, averageHr = 140.0), HrEffort(maxHr = 250, averageHr = 150.0))))
    }

    @Test
    fun `observed max HR is null without any usable observation`() {
        assertNull(BodyAuto.observedHrMax(emptyList()))
        assertNull(BodyAuto.observedHrMax(listOf(HrEffort(maxHr = null, averageHr = 150.0))))
    }

    // ---- compute: hrRest ----

    @Test
    fun `no change under the minimum sample count even with a large shift`() {
        val six = (1..BodyAuto.MIN_RHR_SAMPLES - 1).map { 60.0 + it }
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 192, rhrValues = six, observedMaxCandidates = emptyList())
        assertNull(updates.hrRest)
        assertNull(updates.hrMax)
    }

    @Test
    fun `no change when the median shift is below the threshold`() {
        // sorted middle = 53 -> |53 - 52| = 1 < 2
        val values = listOf(51.0, 51.0, 52.0, 53.0, 54.0, 55.0, 56.0)
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 192, rhrValues = values, observedMaxCandidates = emptyList())
        assertNull(updates.hrRest)
    }

    @Test
    fun `hrRest moves to the rounded median at or beyond the threshold`() {
        // sorted middle = 56 -> |56 - 52| = 4 >= 2 -> 56
        val values = listOf(50.0, 52.0, 54.0, 56.0, 58.0, 60.0, 62.0)
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 192, rhrValues = values, observedMaxCandidates = emptyList())
        assertEquals(56, updates.hrRest)
    }

    @Test
    fun `hrRest never inverts the Karvonen pair (stays below hrMax)`() {
        // median 57 with hrMax 55: 57 is not < 55 -> keep
        val values = listOf(55.0, 56.0, 57.0, 57.0, 58.0, 59.0, 60.0)
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 55, rhrValues = values, observedMaxCandidates = emptyList())
        assertNull(updates.hrRest)
    }

    // ---- compute: hrMax ----

    @Test
    fun `hrMax rises to the highest believable observation`() {
        val efforts = listOf(HrEffort(maxHr = 198, averageHr = 140.0), HrEffort(maxHr = 185, averageHr = 150.0))
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 192, rhrValues = emptyList(), observedMaxCandidates = efforts)
        assertEquals(198, updates.hrMax)
    }

    @Test
    fun `hrMax never lowers on a lower or equal observation`() {
        val lower = listOf(HrEffort(maxHr = 190, averageHr = 150.0))
        assertNull(BodyAuto.compute(52, 192, emptyList(), lower).hrMax)
        val equal = listOf(HrEffort(maxHr = 192, averageHr = 150.0))
        assertNull(BodyAuto.compute(52, 192, emptyList(), equal).hrMax)
    }

    @Test
    fun `hrMax never exceeds the absolute ceiling`() {
        val efforts = listOf(HrEffort(maxHr = 215, averageHr = 140.0))
        assertNull(BodyAuto.compute(52, 192, emptyList(), efforts).hrMax)
    }

    @Test
    fun `hrRest and hrMax update together in one pass`() {
        val values = listOf(50.0, 52.0, 54.0, 56.0, 58.0, 60.0, 62.0)
        val efforts = listOf(HrEffort(maxHr = 196, averageHr = 145.0))
        val updates = BodyAuto.compute(currentHrRest = 52, currentHrMax = 192, rhrValues = values, observedMaxCandidates = efforts)
        assertEquals(56, updates.hrRest)
        assertEquals(196, updates.hrMax)
        assertNull(updates.zoneMaxes) // zones are the caller's job (Karvonen)
    }

    // ---- Personalization.karvonenZoneMaxes ----

    @Test
    fun `karvonen zone maxes match the model boundaries`() {
        // hrr = 190 - 50 = 140; Z1 = round(0.6x140+50)=134 ... Z6 = round(1.0x140+50)=190
        val maxes = Personalization.karvonenZoneMaxes(hrMax = 190, hrRest = 50)!!
        assertEquals(listOf(134, 148, 162, 176, 183, 190), maxes)
    }

    @Test
    fun `karvonen zone maxes are strictly increasing and stay at or below hrMax`() {
        val maxes = Personalization.karvonenZoneMaxes(hrMax = 192, hrRest = 48)!!
        assertTrue(maxes.zipWithNext().all { (a, b) -> b > a })
        assertTrue(maxes.first() > 0)
        // Karvonen Z6 = hrMax exactly (hrr x 1.0 + rest rounds back to hrMax)
        assertEquals(192, maxes.last())
        assertTrue(maxes.all { it <= 192 })
    }

    @Test
    fun `karvonen zone maxes are null for unusable inputs`() {
        assertNull(Personalization.karvonenZoneMaxes(hrMax = 190, hrRest = 190))
        assertNull(Personalization.karvonenZoneMaxes(hrMax = 190, hrRest = 195))
        assertNull(Personalization.karvonenZoneMaxes(hrMax = 0, hrRest = 50))
    }
}
