package com.runflow2.app

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.sync.cachedComponentScores
import com.runflow2.app.domain.readiness.ReadinessComposer
import com.runflow2.app.domain.readiness.ReadinessInputs
import com.runflow2.app.domain.readiness.ReadinessJson
import com.runflow2.app.domain.readiness.ReadinessScoring
import com.runflow2.app.domain.readiness.ReadinessState
import java.time.Instant
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pure-logic tests for the readiness input assembly and baseline windows —
 * the semantics ported from the deleted Flutter ReadinessOrchestrator
 * (commit a4616887): median baselines, the ±1 bpm trend thresholds, the
 * stage/total sleep percents and the atl/ctl workload ratio.
 */
class ReadinessComposerTest {

    private val day: LocalDate = LocalDate.of(2026, 10, 8)

    private fun entry(
        date: String,
        restingHr: Int? = null,
        hrvMs: Double? = null,
        sleepMinutes: Int? = null,
        deepMinutes: Int? = null,
        remMinutes: Int? = null,
        lightMinutes: Int? = null,
        exhaustionLevel: Int? = null,
        muscleSoreness: Int? = null,
        stressLevel: Int? = null,
        note: String? = null,
        updatedAt: Long = 1_000L,
        dirty: Boolean = false,
        manuallyEdited: Boolean = false,
        score: Double? = null,
    ) = DailyEntryEntity(
        date = date,
        restingHr = restingHr,
        hrvMs = hrvMs,
        sleepMinutes = sleepMinutes,
        deepMinutes = deepMinutes,
        remMinutes = remMinutes,
        lightMinutes = lightMinutes,
        exhaustionLevel = exhaustionLevel,
        muscleSoreness = muscleSoreness,
        stressLevel = stressLevel,
        note = note,
        sourceRhr = if (restingHr != null) "hc" else null,
        sourceHrv = if (hrvMs != null) "hc" else null,
        sourceSleep = if (sleepMinutes != null) "hc" else null,
        manuallyEdited = manuallyEdited,
        updatedAt = updatedAt,
        dirty = dirty,
        score = score,
        state = null,
        confidence = null,
        componentScoresJson = null,
    )

    // ---- input assembly ----

    @Test
    fun `buildInputs maps rhr sleep subjective and profile fields from the entry`() {
        val e = entry(
            date = day.toString(),
            restingHr = 55,
            sleepMinutes = 420,
            deepMinutes = 60,
            remMinutes = 90,
            lightMinutes = 180,
            exhaustionLevel = 3,
            muscleSoreness = 2,
            stressLevel = 1,
            note = "felt good",
            updatedAt = 1_723_000_000_000,
        )
        val inputs = ReadinessComposer.buildInputs(
            date = day, entry = e,
            rhrBaseline = 52.0, hrvBaseline = 60.0, load = null,
            profileMaxHr = 190, profileRestingHr = 52,
        )

        assertEquals(day, inputs.date)
        assertEquals(190, inputs.maxHr)
        assertEquals(52, inputs.restingHr)

        val rhr = inputs.rhr!!
        assertEquals(55.0, rhr.todayRhr!!, 0.0)
        assertEquals(52.0, rhr.baselineRhr!!, 0.0)
        assertEquals(3.0, rhr.rhrDelta!!, 0.0)
        assertEquals(1, rhr.trendDirection)

        val sleep = inputs.sleep!!
        assertEquals(420.0, sleep.totalDurationMinutes!!, 0.0)
        assertEquals(60.0, sleep.deepMinutes!!, 0.0)
        assertEquals(90.0, sleep.remMinutes!!, 0.0)
        assertEquals(180.0, sleep.lightMinutes!!, 0.0)
        // percents = stage / total * 100
        assertEquals(60.0 / 420.0 * 100.0, sleep.deepPercent!!, 0.001)
        assertEquals(90.0 / 420.0 * 100.0, sleep.remPercent!!, 0.001)
        // Dart hardcoded a 0.85 placeholder; deliberately not ported
        assertNull(sleep.sleepEfficiency)

        val subjective = inputs.subjective!!
        assertEquals(3, subjective.exhaustionLevel)
        assertEquals(2, subjective.muscleSoreness)
        assertEquals(1, subjective.stressLevel)
        assertEquals("felt good", subjective.note)
        assertEquals(Instant.ofEpochMilli(1_723_000_000_000), subjective.enteredAt)
    }

    @Test
    fun `trend direction follows the dart one-bpm thresholds`() {
        fun trend(restingHr: Int, baseline: Double?): Int? =
            ReadinessComposer.buildInputs(
                date = day, entry = entry(day.toString(), restingHr = restingHr),
                rhrBaseline = baseline, hrvBaseline = null, load = null,
                profileMaxHr = null, profileRestingHr = null,
            ).rhr!!.trendDirection

        assertEquals(-1, trend(55, 56.5)) // delta -1.5
        assertEquals(0, trend(55, 56.0)) // delta -1.0 → boundary stays 0
        assertEquals(0, trend(55, 54.5)) // delta +0.5
        assertEquals(1, trend(55, 53.5)) // delta +1.5
        // no baseline: delta null, trend 0 (Dart leaves the counter at 0)
        assertEquals(0, trend(55, null))
    }

    @Test
    fun `rhr component omitted without a resting heart rate`() {
        val inputs = ReadinessComposer.buildInputs(
            date = day, entry = entry(day.toString(), sleepMinutes = 420),
            rhrBaseline = 52.0, hrvBaseline = null, load = null,
            profileMaxHr = null, profileRestingHr = null,
        )
        assertNull(inputs.rhr)
    }

    @Test
    fun `sleep percents omitted without stage or positive total`() {
        val noStages = ReadinessComposer.sleepMetrics(entry(day.toString(), sleepMinutes = 420))!!
        assertNull(noStages.deepPercent)
        assertNull(noStages.remPercent)
        assertEquals(420.0, noStages.totalDurationMinutes!!, 0.0)

        // zero/absent total: no sleep component at all (an empty night must
        // not score as a bad night)
        assertNull(ReadinessComposer.sleepMetrics(entry(day.toString(), sleepMinutes = 0, deepMinutes = 60)))
        assertNull(ReadinessComposer.sleepMetrics(entry(day.toString(), deepMinutes = 60)))
    }

    @Test
    fun `subjective omitted when no level was answered`() {
        assertNull(ReadinessComposer.subjectiveInput(entry(day.toString(), note = "note only")))
        assertNull(ReadinessComposer.subjectiveInput(null))
        assertNotNull(ReadinessComposer.subjectiveInput(entry(day.toString(), stressLevel = 4)))
    }

    @Test
    fun `hrv metrics carry the delta and a display trend`() {
        val hrv = ReadinessComposer.hrvMetrics(entry(day.toString(), hrvMs = 62.0), 58.0)!!
        assertEquals(62.0, hrv.todayHrv!!, 0.0)
        assertEquals(58.0, hrv.baselineHrv!!, 0.0)
        assertEquals(4.0, hrv.hrvDelta!!, 0.0)
        assertEquals("up", hrv.trendDirection)
        assertEquals("down", ReadinessComposer.hrvMetrics(entry(day.toString(), hrvMs = 56.0), 58.0)!!.trendDirection)
        assertEquals("stable", ReadinessComposer.hrvMetrics(entry(day.toString(), hrvMs = 58.0), 58.0)!!.trendDirection)
        // no baseline: delta null, trend null
        val without = ReadinessComposer.hrvMetrics(entry(day.toString(), hrvMs = 62.0), null)!!
        assertNull(without.hrvDelta)
        assertNull(without.trendDirection)
        assertNull(ReadinessComposer.hrvMetrics(entry(day.toString()), 58.0))
    }

    // ---- baselines ----

    private fun daysWithRhr(values: Map<String, Int>): List<DailyEntryEntity> =
        values.map { (d, rhr) -> entry(d, restingHr = rhr) }

    @Test
    fun `rhr baseline is the dart median of the previous 30 days`() {
        val entries = daysWithRhr(
            mapOf(
                "2026-10-01" to 50, "2026-10-02" to 52, "2026-10-03" to 54,
                "2026-10-04" to 56, "2026-10-05" to 58, "2026-10-06" to 60,
                "2026-10-07" to 62,
            ),
        )
        assertEquals(56.0, ReadinessComposer.rhrBaselineOf(entries, day)!!, 0.0)

        // the scored day itself never enters its own baseline
        val withScoredDay = entries + entry(day.toString(), restingHr = 100)
        assertEquals(56.0, ReadinessComposer.rhrBaselineOf(withScoredDay, day)!!, 0.0)
    }

    @Test
    fun `rhr baseline caps the window at 30 days and even counts pick the upper middle`() {
        // 2026-09-08 is exactly 30 days back (inside), 2026-09-07 falls outside
        val entries = daysWithRhr(
            mapOf(
                "2026-09-07" to 10, "2026-09-08" to 40, "2026-10-02" to 50,
                "2026-10-03" to 52, "2026-10-04" to 54, "2026-10-05" to 56,
                "2026-10-06" to 58, "2026-10-07" to 60,
            ),
        )
        // sorted values = [40,50,52,54,56,58,60] (10 excluded) → index 4
        assertEquals(54.0, ReadinessComposer.rhrBaselineOf(entries, day)!!, 0.0)

        // even count (8 ≥ 7 values): Dart's list[length ~/ 2] pick, not the
        // interpolated median — sorted [50,52,54,56,58,60,90,92] → index 4
        val even = daysWithRhr(
            mapOf(
                "2026-10-01" to 50, "2026-10-02" to 52, "2026-10-03" to 54, "2026-10-04" to 56,
            ),
        )
        assertNull(ReadinessComposer.rhrBaselineOf(even, day)) // 4 < 7 values
        val even8 = daysWithRhr(
            mapOf(
                "2026-09-30" to 60, "2026-10-01" to 50, "2026-10-02" to 52,
                "2026-10-03" to 54, "2026-10-04" to 56, "2026-10-05" to 58,
                "2026-10-06" to 90, "2026-10-07" to 92,
            ),
        )
        assertEquals(58.0, ReadinessComposer.rhrBaselineOf(even8, day)!!, 0.0)
    }

    @Test
    fun `rhr baseline null under 7 values`() {
        val six = daysWithRhr(
            (1..6).associate { i ->
                "%04d-%02d-%02d".format(2026, 10, i) to (50 + i)
            },
        )
        assertNull(ReadinessComposer.rhrBaselineOf(six, LocalDate.of(2026, 10, 8)))
    }

    @Test
    fun `hrv baseline is the previous-7-days median with a 4-value minimum`() {
        fun hrvDays(values: Map<String, Double>) =
            values.map { (d, hrv) -> entry(d, hrvMs = hrv) }

        val seven = hrvDays(
            mapOf(
                "2026-10-01" to 60.0, "2026-10-02" to 62.0, "2026-10-03" to 64.0,
                "2026-10-04" to 66.0, "2026-10-05" to 68.0, "2026-10-06" to 70.0,
                "2026-10-07" to 72.0,
            ),
        )
        assertEquals(66.0, ReadinessComposer.hrvBaselineOf(seven, day)!!, 0.0)

        // 8 days back is outside the window; 4 values → upper-middle pick
        val windowed = hrvDays(
            mapOf(
                "2026-09-30" to 10.0, "2026-10-02" to 60.0, "2026-10-03" to 62.0,
                "2026-10-04" to 64.0, "2026-10-05" to 66.0,
            ),
        )
        assertEquals(64.0, ReadinessComposer.hrvBaselineOf(windowed, day)!!, 0.0)

        assertNull(ReadinessComposer.hrvBaselineOf(hrvDays(mapOf("2026-10-06" to 60.0, "2026-10-07" to 62.0)), day))
    }

    @Test
    fun `sleep average is the mean of the previous 28 days with a 7-value minimum`() {
        fun sleepDays(values: Map<String, Int>) =
            values.map { (d, mins) -> entry(d, sleepMinutes = mins) }

        val seven = sleepDays(
            mapOf(
                "2026-10-01" to 400, "2026-10-02" to 400, "2026-10-03" to 400,
                "2026-10-04" to 500, "2026-10-05" to 500, "2026-10-06" to 500,
                "2026-10-07" to 500,
            ),
        )
        assertEquals(3200.0 / 7.0, ReadinessComposer.sleepAverageOf(seven, day)!!, 0.001)

        // days older than 28 are ignored
        val withOld = seven + entry("2026-09-09", sleepMinutes = 900)
        assertEquals(3200.0 / 7.0, ReadinessComposer.sleepAverageOf(withOld, day)!!, 0.001)

        assertNull(ReadinessComposer.sleepAverageOf(seven.take(6), day))
    }

    // ---- load mapping ----

    private fun series(days: List<Triple<String, Double, Pair<Double, Double>>>): List<TrainingLoad.DailyLoad> =
        days.map { (d, trimp, ctlAtl) ->
            TrainingLoad.DailyLoad(date = LocalDate.parse(d), trimp = trimp, ctl = ctlAtl.first, atl = ctlAtl.second)
        }

    @Test
    fun `load metrics map the daily series for the day`() {
        val loads = series(
            (1..8).map { i ->
                val d = LocalDate.of(2026, 10, i)
                val trimp = if (i == 8) 80.0 else 50.0
                Triple(d.toString(), trimp, 60.0 to if (i == 8) 75.0 else 70.0)
            },
        )
        val load = ReadinessComposer.loadMetrics(loads, day)!!
        assertEquals(80.0, load.todayTrimp!!, 0.0)
        assertEquals(75.0, load.atl!!, 0.0)
        assertEquals(60.0, load.ctl!!, 0.0)
        assertEquals(-15.0, load.tsb!!, 0.0)
        // workloadRatio = atl / ctl (server semantics, dashboard route)
        assertEquals(1.25, load.workloadRatio!!, 0.0001)
        // last 7 days including today: 6 × 50 + 80
        assertEquals(380.0, load.sevenDayTrimpTotal!!, 0.0)
    }

    @Test
    fun `workload ratio null when ctl is zero and rest day carries no trimp`() {
        val loads = series(listOf(Triple(day.toString(), 0.0, 0.0 to 0.0)))
        val load = ReadinessComposer.loadMetrics(loads, day)!!
        assertNull(load.todayTrimp)
        assertNull(load.workloadRatio)
        assertEquals(0.0, load.sevenDayTrimpTotal!!, 0.0)

        // a rest day inside an active block still scores by its ratio
        val mixed = series(
            listOf(
                Triple("2026-10-07", 100.0, 50.0 to 60.0),
                Triple(day.toString(), 0.0, 50.0 to 55.0),
            ),
        )
        val rest = ReadinessComposer.loadMetrics(mixed, day)!!
        assertNull(rest.todayTrimp)
        assertEquals(1.1, rest.workloadRatio!!, 0.0001)
    }

    @Test
    fun `load metrics null when the date is outside the series`() {
        val loads = series(listOf(Triple("2026-10-07", 50.0, 50.0 to 55.0)))
        assertNull(ReadinessComposer.loadMetrics(loads, LocalDate.of(2026, 10, 1)))
    }

    // ---- cache write-back ----

    @Test
    fun `computed cache writes the score columns for a scorable day`() {
        val e = entry(
            date = day.toString(),
            restingHr = 55,
            sleepMinutes = 480,
            deepMinutes = 100,
            remMinutes = 100,
            dirty = true,
        )
        val updated = ReadinessComposer.computedCache(
            entry = e, rhrBaseline = null, hrvBaseline = null, load = null,
            profileMaxHr = 190, profileRestingHr = 52,
        )

        // two available components (hrr + sleep) → estimated confidence
        assertEquals("estimated", updated.confidence)
        assertNotNull(updated.score)
        assertTrue(updated.score!! > 0.0 && updated.score!! <= 100.0)
        assertNotNull(updated.state)
        assertNotNull(ReadinessJson.readinessStateFromWire(updated.state))

        val components = updated.cachedComponentScores()
        assertEquals(setOf("hrr", "sleep", "load", "subjective"), components.keys)
        assertTrue(components.getValue("hrr").isAvailable)
        assertTrue(components.getValue("sleep").isAvailable)
        assertFalse(components.getValue("load").isAvailable)

        // the cache write never touches sync state — the caller owns dirty
        assertTrue(updated.dirty)
        assertEquals(1_000L, updated.updatedAt)
        assertEquals(55, updated.restingHr)
    }

    @Test
    fun `computed cache keeps null columns when the day is unscorable`() {
        // only HRV: no component is available
        val e = entry(date = day.toString(), hrvMs = 62.0, score = 71.5)
            .copy(state = "good", confidence = "partial", componentScoresJson = "{}")
        val updated = ReadinessComposer.computedCache(
            entry = e, rhrBaseline = null, hrvBaseline = null, load = null,
            profileMaxHr = null, profileRestingHr = null,
        )
        assertNull(updated.score)
        assertNull(updated.state)
        assertNull(updated.confidence)
        assertNull(updated.componentScoresJson)
    }

    @Test
    fun `unscorable day clears a previously cached score`() {
        val e = entry(date = day.toString(), hrvMs = 62.0)
            .copy(score = 71.5, state = "good", confidence = "partial", componentScoresJson = "{}")
        val unavailable = ReadinessScoring.score(ReadinessInputs(date = day))
        assertEquals(ReadinessState.UNAVAILABLE, unavailable.state)
        val cleared = ReadinessComposer.withCache(e, unavailable)
        assertNull(cleared.score)
        assertNull(cleared.state)
        assertNull(cleared.confidence)
        assertNull(cleared.componentScoresJson)
    }

    // ---- push payload ----

    @Test
    fun `push payload carries the scored result and truthful inputs`() {
        val e = entry(
            date = day.toString(),
            restingHr = 54,
            sleepMinutes = 480,
            hrvMs = 62.0,
            exhaustionLevel = 2,
        )
        val inputs = ReadinessComposer.buildInputs(
            date = day, entry = e,
            rhrBaseline = 55.0, hrvBaseline = 60.0, load = null,
            profileMaxHr = 190, profileRestingHr = 52,
        )
        val payload = ReadinessComposer.payloadFor(
            inputs = inputs,
            hrv = ReadinessComposer.hrvMetrics(e, 60.0),
            computedAt = Instant.ofEpochMilli(1_723_000_000_000),
        )

        assertEquals(day.toString(), payload.date)
        assertEquals(inputs.maxHr, payload.maxHr)
        assertEquals(inputs.restingHr, payload.restingHr)
        assertEquals(54.0, payload.rhrJson?.todayRhr!!, 0.0)
        assertEquals(-1.0, payload.rhrJson?.rhrDelta!!, 0.0)
        assertEquals(62.0, payload.hrvJson?.todayHrv!!, 0.0)
        assertEquals("up", payload.hrvJson?.trendDirection)
        assertNotNull(payload.computedAt)
        // score is computed fresh from the inputs, not from the cache columns
        assertEquals(ReadinessScoring.score(inputs).compositeScore, payload.compositeScore, 0.0)
        assertEquals(ReadinessScoring.score(inputs).state.wireName, payload.state)
    }
}
