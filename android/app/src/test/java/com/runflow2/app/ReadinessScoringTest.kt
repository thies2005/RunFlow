package com.runflow2.app

import com.runflow2.app.domain.readiness.AdaptationType
import com.runflow2.app.domain.readiness.DataConfidence
import com.runflow2.app.domain.readiness.HrvMetrics
import com.runflow2.app.domain.readiness.LoadMetrics
import com.runflow2.app.domain.readiness.ReadinessComponent
import com.runflow2.app.domain.readiness.ReadinessInputs
import com.runflow2.app.domain.readiness.ReadinessScoring
import com.runflow2.app.domain.readiness.ReadinessScoringConfig
import com.runflow2.app.domain.readiness.ReadinessState
import com.runflow2.app.domain.readiness.RhrMetrics
import com.runflow2.app.domain.readiness.SleepMetrics
import com.runflow2.app.domain.readiness.SubjectiveInput
import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mirrors flutter/test/unit/readiness_scoring_service_test.dart (commit
 * a4616887) case by case, plus a few extra cases locking down verbatim Dart
 * behaviors the Flutter suite did not cover. Since the HRV component was
 * added (weight .15, five-component confidence ladder) the weights and the
 * availability gate diverge from the Dart source — the component-level
 * thresholds still mirror it.
 */
class ReadinessScoringTest {

    private val date: LocalDate = LocalDate.of(2025, 1, 1)

    private fun findComponent(
        scores: List<com.runflow2.app.domain.readiness.ComponentScore>,
        component: ReadinessComponent,
    ) = scores.first { it.component == component }

    // ---- HRR component scoring ----

    @Test
    fun `improving RHR negative delta adds 7 per bpm`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 50.0, baselineRhr = 55.0, rhrDelta = -3.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertTrue(hrr.isAvailable)
        assertEquals(96.0, hrr.score, 0.01) // 75 + 3 bpm * 7
    }

    @Test
    fun `improving RHR credit capped at 3 bpm`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 40.0, baselineRhr = 60.0, rhrDelta = -20.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(96.0, hrr.score, 0.01) // delta clamped to -3 bpm
    }

    @Test
    fun `stable RHR delta near zero scores 71_5`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(71.5, hrr.score, 0.01) // 75 - 0.5 bpm * 7
    }

    @Test
    fun `declining RHR positive delta loses 7 per bpm`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 60.0, baselineRhr = 55.0, rhrDelta = 3.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(54.0, hrr.score, 0.01) // 75 - 3 bpm * 7
    }

    @Test
    fun `declining RHR penalty capped at 7 bpm`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 80.0, baselineRhr = 55.0, rhrDelta = 20.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(26.0, hrr.score, 0.01) // delta clamped to +7 bpm
    }

    @Test
    fun `RHR without baseline scores 65`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 55.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(65.0, hrr.score, 0.0)
    }

    @Test
    fun `null RHR is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = null,
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertFalse(hrr.isAvailable)
    }

    // ---- HRV component scoring ----

    @Test
    fun `improved HRV ten percent above baseline scores 90`() {
        // +6 ms on a 60 ms baseline = +10% → 75 + 10 * 1.5 = 90
        val result = ReadinessScoring.score(
            ReadinessInputs(date, hrv = HrvMetrics(todayHrv = 66.0, baselineHrv = 60.0, hrvDelta = 6.0)),
        )
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        assertTrue(hrv.isAvailable)
        assertEquals(90.0, hrv.score, 0.01)
    }

    @Test
    fun `HRV without baseline scores 65`() {
        // Mirrors the HRR no-baseline behavior: available at the fixed 65.
        val result = ReadinessScoring.score(
            ReadinessInputs(date, hrv = HrvMetrics(todayHrv = 55.0)),
        )
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        assertTrue(hrv.isAvailable)
        assertEquals(65.0, hrv.score, 0.0)
    }

    @Test
    fun `slightly down HRV scores continuously`() {
        // -2 ms on a 60 ms baseline = -3.3% → 75 - 3.33 * 1.5 = 70
        val result = ReadinessScoring.score(
            ReadinessInputs(date, hrv = HrvMetrics(todayHrv = 58.0, baselineHrv = 60.0, hrvDelta = -2.0)),
        )
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        assertTrue(hrv.isAvailable)
        assertEquals(70.0, hrv.score, 0.01)
    }

    @Test
    fun `suppressed HRV ten percent below baseline scores 60`() {
        // -6 ms on a 60 ms baseline = -10% → 75 - 10 * 1.5 = 60 (same value
        // under the continuous curve — coincidence, not a band)
        val result = ReadinessScoring.score(
            ReadinessInputs(date, hrv = HrvMetrics(todayHrv = 54.0, baselineHrv = 60.0, hrvDelta = -6.0)),
        )
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        assertTrue(hrv.isAvailable)
        assertEquals(60.0, hrv.score, 0.01)
    }

    @Test
    fun `HRV without a today value is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                hrv = HrvMetrics(todayHrv = null, baselineHrv = 60.0, hrvDelta = null),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        assertFalse(hrv.isAvailable)
    }

    // ---- Sleep component scoring ----

    @Test
    fun `8_3 hours sleep with weak stages scores 82_27`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 500.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)
        assertTrue(sleep.isAvailable)
        assertEquals(83.67, sleep.score, 0.01) // 91.67 duration - 3 deep - 5 REM
    }

    @Test
    fun `7_5 hours sleep with weak stages scores 65_6`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(67.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 75 - 3 - 5
    }

    @Test
    fun `6_5 hours sleep with weak stages scores 45_6`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 390.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(47.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 55 - 3 - 5
    }

    @Test
    fun `5_5 hours sleep with weak stages scores 25_6`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 330.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(31.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 39 duration - 3 - 5
    }

    @Test
    fun `4_5 hours sleep with weak stages floors near 17_6`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 270.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(19.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 27 - 3 - 5
    }

    @Test
    fun `deep sleep 22 percent adds the full 6`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 22.0, remPercent = 15.0)),
        )
        assertEquals(88.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 + 6 deep - 3 REM
    }

    @Test
    fun `deep sleep 16 percent adds 3`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 16.0, remPercent = 15.0)),
        )
        assertEquals(85.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 + 3 deep - 3 REM
    }

    @Test
    fun `deep sleep below 10 percent subtracts 5`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 8.0, remPercent = 15.0)),
        )
        assertEquals(77.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 - 5 deep - 3 REM
    }

    @Test
    fun `REM 22 percent adds 3_2`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 12.0, remPercent = 22.0)),
        )
        assertEquals(88.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 - 1 deep + 4 REM
    }

    @Test
    fun `REM 8 percent subtracts the full 5`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 12.0, remPercent = 8.0)),
        )
        assertEquals(79.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 - 1 deep - 5 REM
    }

    @Test
    fun `sleep stage bonuses cap at 96`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 25.0, remPercent = 25.0)),
        )
        assertEquals(96.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01) // 85 + 6 deep + 5 REM
    }

    @Test
    fun `null sleep is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertFalse(findComponent(result.componentScores, ReadinessComponent.SLEEP).isAvailable)
    }

    // ---- Load component scoring ----

    @Test
    fun `workload ratio 0_6 scores 74 detrained`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 0.6)))
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)
        assertTrue(load.isAvailable)
        assertEquals(74.0, load.score, 0.0) // 90 - 0.4 * 40
    }

    @Test
    fun `workload ratio 0_8 to 1_3 scores 90 optimal`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.0)))
        assertEquals(90.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0)
    }

    @Test
    fun `workload ratio 1_4 scores 62 elevated`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.4)))
        assertEquals(62.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.01) // 90 - 0.4 * 70
    }

    @Test
    fun `workload ratio 1_7 scores 41 elevated`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.7)))
        assertEquals(41.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0) // 90 - 0.7 * 70
    }

    @Test
    fun `workload ratio 2_5 floors at 15`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 2.5)))
        assertEquals(15.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0) // clamped low
    }

    @Test
    fun `no workload ratio but todayTrimp available scores 60`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(todayTrimp = 50.0)))
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)
        assertTrue(load.isAvailable)
        assertEquals(60.0, load.score, 0.0)
    }

    @Test
    fun `null load metrics is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
            ),
        )
        assertFalse(findComponent(result.componentScores, ReadinessComponent.LOAD).isAvailable)
    }

    @Test
    fun `load metrics with neither ratio nor trimp is unavailable`() {
        // Verbatim Dart: a non-null LoadMetrics without ratio or todayTrimp
        // (e.g. the orchestrator's default TrimpStrategy.unavailable stub) is
        // NOT an available component.
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics()))
        assertFalse(findComponent(result.componentScores, ReadinessComponent.LOAD).isAvailable)
    }

    // ---- Subjective component scoring ----

    @Test
    fun `all three fields available averages and maps to 0-100`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(exhaustionLevel = 2, muscleSoreness = 3, stressLevel = 1)),
        )
        val sub = findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE)
        assertTrue(sub.isAvailable)
        val avg = ((10 - 2) + (10 - 3) + (10 - 1)) / 3.0
        assertEquals(avg * 10, sub.score, 0.01)
    }

    @Test
    fun `only exhaustionLevel uses it alone`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(exhaustionLevel = 5)),
        )
        assertEquals(50.0, findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).score, 0.01)
    }

    @Test
    fun `exhaustion present without stress decides the score alone`() {
        // Verbatim Dart quirk: hasExhaustion branch fires before the generic
        // mean, so muscleSoreness is ignored when stress is missing.
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(exhaustionLevel = 2, muscleSoreness = 9)),
        )
        assertEquals(80.0, findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).score, 0.01)
    }

    @Test
    fun `soreness and stress without exhaustion average`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(muscleSoreness = 3, stressLevel = 7)),
        )
        assertEquals((((10 - 3) + (10 - 7)) / 2.0) * 10, findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).score, 0.01)
    }

    @Test
    fun `all zeros produces max subjective score`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(exhaustionLevel = 0, muscleSoreness = 0, stressLevel = 0)),
        )
        assertEquals(100.0, findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).score, 0.01)
    }

    @Test
    fun `all max 10 produces zero subjective score`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(exhaustionLevel = 10, muscleSoreness = 10, stressLevel = 10)),
        )
        assertEquals(0.0, findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).score, 0.01)
    }

    @Test
    fun `null subjective is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
            ),
        )
        assertFalse(findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).isAvailable)
    }

    @Test
    fun `subjective with only note is unavailable`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, subjective = SubjectiveInput(note = "feeling ok")),
        )
        assertFalse(findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE).isAvailable)
    }

    // ---- Composite score and weight normalization ----

    @Test
    fun `weights are normalized for available components only`() {
        // The confidence ladder needs 3+ available components for a composite,
        // so this normalization case carries rhr + sleep + load.
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)

        val defaultCfg = ReadinessScoringConfig()
        val totalWeight = defaultCfg.hrrWeight + defaultCfg.sleepWeight + defaultCfg.loadWeight
        val normalizedHrr = defaultCfg.hrrWeight / totalWeight
        val normalizedSleep = defaultCfg.sleepWeight / totalWeight
        val normalizedLoad = defaultCfg.loadWeight / totalWeight
        val expected = hrr.score * normalizedHrr +
            sleep.score * normalizedSleep +
            load.score * normalizedLoad

        assertEquals(expected, result.compositeScore, 0.01)
    }

    @Test
    fun `all five components available uses full weights`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 60.0, hrvDelta = 2.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3, muscleSoreness = 3, stressLevel = 3),
            ),
        )
        assertEquals(DataConfidence.FULL, result.confidence)

        // component order: HRR, HRV, SLEEP, LOAD, SUBJECTIVE
        assertEquals(ReadinessComponent.HRR, result.componentScores[0].component)
        assertEquals(ReadinessComponent.HRV, result.componentScores[1].component)
        assertEquals(ReadinessComponent.SLEEP, result.componentScores[2].component)
        assertEquals(ReadinessComponent.LOAD, result.componentScores[3].component)
        assertEquals(ReadinessComponent.SUBJECTIVE, result.componentScores[4].component)

        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        val hrv = findComponent(result.componentScores, ReadinessComponent.HRV)
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)
        val sub = findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE)

        assertTrue(hrr.isAvailable)
        assertTrue(hrv.isAvailable)
        assertTrue(sleep.isAvailable)
        assertTrue(load.isAvailable)
        assertTrue(sub.isAvailable)

        // weights incl. HRV .15 — they sum to 1.0, so the composite is a
        // straight weighted mean when all five are available
        val cfg = ReadinessScoringConfig()
        val totalW = cfg.hrrWeight + cfg.hrvWeight + cfg.sleepWeight + cfg.loadWeight + cfg.subjectiveWeight
        val expected = (hrr.score * cfg.hrrWeight +
            hrv.score * cfg.hrvWeight +
            sleep.score * cfg.sleepWeight +
            load.score * cfg.loadWeight +
            sub.score * cfg.subjectiveWeight) / totalW
        assertEquals(expected, result.compositeScore, 0.01)
    }

    @Test
    fun `custom config weights are respected`() {
        // Three available components clear the availability gate; zeroing
        // every weight but HRR collapses the composite onto the HRR score.
        val inputs = ReadinessInputs(
            date,
            rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
            sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
            load = LoadMetrics(workloadRatio = 1.0),
        )
        val result = ReadinessScoring.score(
            inputs,
            ReadinessScoringConfig(
                hrrWeight = 1.0,
                hrvWeight = 0.0,
                sleepWeight = 0.0,
                loadWeight = 0.0,
                subjectiveWeight = 0.0,
            ),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(hrr.score, result.compositeScore, 0.01)
    }

    // ---- Confidence levels ----

    @Test
    fun `5 available components means full confidence`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 60.0, hrvDelta = 2.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3),
            ),
        )
        assertEquals(DataConfidence.FULL, result.confidence)
    }

    @Test
    fun `4 available components means partial confidence`() {
        // rhr + hrv + sleep + load = four available of five
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 60.0, hrvDelta = 2.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertEquals(DataConfidence.PARTIAL, result.confidence)
    }

    @Test
    fun `3 available components means estimated confidence`() {
        // hrv + sleep + load: exactly three available → still a composite,
        // but only estimated confidence.
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 60.0, hrvDelta = 2.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertEquals(DataConfidence.ESTIMATED, result.confidence)
        assertTrue(result.compositeScore > 0)
        assertTrue(result.state != ReadinessState.UNAVAILABLE)
    }

    @Test
    fun `2 available components means unavailable result`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
            ),
        )
        assertEquals(DataConfidence.UNAVAILABLE, result.confidence)
        assertEquals(0.0, result.compositeScore, 0.0)
        assertEquals(ReadinessState.UNAVAILABLE, result.state)
    }

    @Test
    fun `1 available component means unavailable confidence`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0)),
        )
        assertEquals(DataConfidence.UNAVAILABLE, result.confidence)
        assertEquals(0.0, result.compositeScore, 0.0)
        assertEquals(ReadinessState.UNAVAILABLE, result.state)
    }

    @Test
    fun `0 available components means unavailable confidence`() {
        val result = ReadinessScoring.score(ReadinessInputs(date))
        assertEquals(DataConfidence.UNAVAILABLE, result.confidence)
        assertEquals(0.0, result.compositeScore, 0.0)
    }

    // ---- State thresholds ----

    @Test
    fun `score at least 80 means excellent`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 50.0, baselineRhr = 55.0, rhrDelta = -5.0),
                sleep = SleepMetrics(totalDurationMinutes = 510.0, deepPercent = 22.0, remPercent = 22.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 1, muscleSoreness = 1, stressLevel = 1),
            ),
        )
        assertEquals(ReadinessState.EXCELLENT, result.state)
    }

    @Test
    fun `score 65 to 79 means good`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5),
                sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 12.0, remPercent = 15.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3, muscleSoreness = 3, stressLevel = 3),
            ),
        )
        assertEquals(ReadinessState.GOOD, result.state)
    }

    @Test
    fun `custom config thresholds override defaults`() {
        val inputs = ReadinessInputs(
            date,
            rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5),
            sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 12.0, remPercent = 15.0),
            load = LoadMetrics(workloadRatio = 1.0),
        )
        val defaultResult = ReadinessScoring.score(inputs)
        val customResult = ReadinessScoring.score(inputs, ReadinessScoringConfig(excellentThreshold = 60.0))
        // composite is 79.0 — (75·.30 + 75·.25 + 90·.20) / .75, weights incl. HRV .15
        assertEquals(ReadinessState.GOOD, defaultResult.state)
        assertEquals(ReadinessState.EXCELLENT, customResult.state)
    }

    // ---- Adaptation type selection ----

    @Test
    fun `excellent state means no adaptation`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 50.0, baselineRhr = 55.0, rhrDelta = -5.0),
                sleep = SleepMetrics(totalDurationMinutes = 510.0, deepPercent = 22.0, remPercent = 22.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 1, muscleSoreness = 1, stressLevel = 1),
            ),
        )
        assertEquals(AdaptationType.NONE, result.adaptationType)
    }

    @Test
    fun `good state means no adaptation`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5),
                sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 12.0, remPercent = 15.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3, muscleSoreness = 3, stressLevel = 3),
            ),
        )
        assertEquals(AdaptationType.NONE, result.adaptationType)
    }

    @Test
    fun `moderate state with high load means volume reduction`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 58.0, baselineRhr = 55.0, rhrDelta = 2.0),
                sleep = SleepMetrics(totalDurationMinutes = 390.0, deepPercent = 8.0, remPercent = 8.0),
                load = LoadMetrics(workloadRatio = 1.7),
                subjective = SubjectiveInput(exhaustionLevel = 5, muscleSoreness = 5, stressLevel = 5),
            ),
        )
        assertEquals(ReadinessState.MODERATE, result.state)
        assertEquals(AdaptationType.VOLUME_REDUCTION, result.adaptationType)
    }

    @Test
    fun `moderate state with normal load means intensity reduction`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 60.0, baselineRhr = 55.0, rhrDelta = 5.0),
                sleep = SleepMetrics(totalDurationMinutes = 390.0, deepPercent = 8.0, remPercent = 8.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 7, muscleSoreness = 7, stressLevel = 7),
            ),
        )
        assertEquals(ReadinessState.MODERATE, result.state)
        assertEquals(AdaptationType.INTENSITY_REDUCTION, result.adaptationType)
    }

    @Test
    fun `reduced state means swap to easy`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 60.0, baselineRhr = 55.0, rhrDelta = 5.0),
                sleep = SleepMetrics(totalDurationMinutes = 330.0),
                load = LoadMetrics(workloadRatio = 1.5),
                subjective = SubjectiveInput(exhaustionLevel = 6, muscleSoreness = 6, stressLevel = 6),
            ),
        )
        assertEquals(ReadinessState.REDUCED, result.state)
        assertEquals(AdaptationType.SWAP_TO_EASY, result.adaptationType)
    }

    @Test
    fun `rest state means rest or reschedule`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 70.0, baselineRhr = 55.0, rhrDelta = 15.0),
                sleep = SleepMetrics(totalDurationMinutes = 200.0),
                load = LoadMetrics(workloadRatio = 2.5),
                subjective = SubjectiveInput(exhaustionLevel = 10, muscleSoreness = 10, stressLevel = 10),
            ),
        )
        assertEquals(ReadinessState.REST, result.state)
        assertEquals(AdaptationType.REST_OR_RESCHEDULE, result.adaptationType)
    }

    @Test
    fun `unavailable result means no adaptation`() {
        val result = ReadinessScoring.score(ReadinessInputs(date))
        assertEquals(AdaptationType.NONE, result.adaptationType)
    }

    // ---- Missing subjective never blocks scoring ----

    @Test
    fun `3 objective components score normally without subjective`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertTrue(result.state != ReadinessState.UNAVAILABLE)
        assertEquals(DataConfidence.ESTIMATED, result.confidence) // 3 of 5 components
        assertTrue(result.compositeScore > 0)
    }

    @Test
    fun `subjective unavailable does not cause unavailable result`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertTrue(result.state != ReadinessState.UNAVAILABLE)
    }

    // ---- Reasons ----

    @Test
    fun `available components include reasons`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3, muscleSoreness = 3, stressLevel = 3),
            ),
        )
        assertTrue(result.reasons.isNotEmpty())
    }

    @Test
    fun `unavailable result includes insufficient data reason`() {
        val result = ReadinessScoring.score(ReadinessInputs(date))
        assertTrue(result.reasons.contains("Insufficient data for readiness assessment"))
    }

    @Test
    fun `reason strings format deltas with one decimal`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 58.0, baselineRhr = 55.0, rhrDelta = 3.0),
                sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 10.0, remPercent = 10.0),
                load = LoadMetrics(workloadRatio = 1.25),
            ),
        )
        assertEquals(
            listOf(
                "Resting HR 3.0 bpm above baseline",
                "Sleep: 7.5h",
                "Training load elevated (ratio: 1.25)",
            ),
            result.reasons,
        )
    }
}
