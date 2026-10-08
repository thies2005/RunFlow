package com.runflow2.app

import com.runflow2.app.domain.readiness.AdaptationType
import com.runflow2.app.domain.readiness.DataConfidence
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
 * behaviors the Flutter suite did not cover.
 */
class ReadinessScoringTest {

    private val date: LocalDate = LocalDate.of(2025, 1, 1)

    private fun findComponent(
        scores: List<com.runflow2.app.domain.readiness.ComponentScore>,
        component: ReadinessComponent,
    ) = scores.first { it.component == component }

    // ---- HRR component scoring ----

    @Test
    fun `improving RHR negative delta scores 85 plus bonus`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 50.0, baselineRhr = 55.0, rhrDelta = -3.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertTrue(hrr.isAvailable)
        assertEquals((85 + 3 * 2).toDouble(), hrr.score, 0.01)
    }

    @Test
    fun `improving RHR bonus capped at 15`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 40.0, baselineRhr = 60.0, rhrDelta = -20.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(100.0, hrr.score, 0.01)
    }

    @Test
    fun `stable RHR delta near zero scores 75`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.5)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(75.0, hrr.score, 0.01)
    }

    @Test
    fun `declining RHR positive delta scores 75 minus penalty`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 60.0, baselineRhr = 55.0, rhrDelta = 3.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals((75 - 3 * 3).toDouble(), hrr.score, 0.01)
    }

    @Test
    fun `declining RHR penalty capped at 40`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, rhr = RhrMetrics(todayRhr = 80.0, baselineRhr = 55.0, rhrDelta = 20.0)),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(35.0, hrr.score, 0.01)
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

    // ---- Sleep component scoring ----

    @Test
    fun `8 plus hours sleep base score 85`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 500.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)
        assertTrue(sleep.isAvailable)
        assertEquals(85.0, sleep.score, 0.01)
    }

    @Test
    fun `7 to 8 hours sleep base score 75`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 450.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(75.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `6 to 7 hours sleep base score 60`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 390.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(60.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `5 to 6 hours sleep base score 45`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 330.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(45.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `under 5 hours sleep base score 30`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 270.0, deepPercent = 10.0, remPercent = 10.0)),
        )
        assertEquals(30.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `deep sleep at least 20 percent adds 5`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 22.0, remPercent = 15.0)),
        )
        assertEquals(90.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `deep sleep at least 15 percent adds 2`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 16.0, remPercent = 15.0)),
        )
        assertEquals(87.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `deep sleep below 10 percent subtracts 5`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 8.0, remPercent = 15.0)),
        )
        assertEquals(80.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `REM at least 20 percent adds 3`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 12.0, remPercent = 22.0)),
        )
        assertEquals(88.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `REM below 10 percent subtracts 3`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 12.0, remPercent = 8.0)),
        )
        assertEquals(82.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
    }

    @Test
    fun `sleep score clamped to 0-100`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(date, sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 25.0, remPercent = 25.0)),
        )
        assertEquals(93.0, findComponent(result.componentScores, ReadinessComponent.SLEEP).score, 0.01)
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
    fun `workload ratio below 0_8 scores 70 undertrained`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 0.6)))
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)
        assertTrue(load.isAvailable)
        assertEquals(70.0, load.score, 0.0)
    }

    @Test
    fun `workload ratio 0_8 to 1_3 scores 90 optimal`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.0)))
        assertEquals(90.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0)
    }

    @Test
    fun `workload ratio 1_3 to 1_5 scores 65 high`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.4)))
        assertEquals(65.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0)
    }

    @Test
    fun `workload ratio 1_5 to 2_0 scores 45 very high`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 1.7)))
        assertEquals(45.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0)
    }

    @Test
    fun `workload ratio above 2_0 scores 25 overreaching`() {
        val result = ReadinessScoring.score(ReadinessInputs(date, load = LoadMetrics(workloadRatio = 2.5)))
        assertEquals(25.0, findComponent(result.componentScores, ReadinessComponent.LOAD).score, 0.0)
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
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
            ),
        )
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)

        val defaultCfg = ReadinessScoringConfig()
        val totalWeight = defaultCfg.hrrWeight + defaultCfg.sleepWeight
        val normalizedHrr = defaultCfg.hrrWeight / totalWeight
        val normalizedSleep = defaultCfg.sleepWeight / totalWeight
        val expected = hrr.score * normalizedHrr + sleep.score * normalizedSleep

        assertEquals(expected, result.compositeScore, 0.01)
    }

    @Test
    fun `all four components available uses full weights`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3, muscleSoreness = 3, stressLevel = 3),
            ),
        )
        assertEquals(DataConfidence.FULL, result.confidence)

        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        val sleep = findComponent(result.componentScores, ReadinessComponent.SLEEP)
        val load = findComponent(result.componentScores, ReadinessComponent.LOAD)
        val sub = findComponent(result.componentScores, ReadinessComponent.SUBJECTIVE)

        assertTrue(hrr.isAvailable)
        assertTrue(sleep.isAvailable)
        assertTrue(load.isAvailable)
        assertTrue(sub.isAvailable)

        val cfg = ReadinessScoringConfig()
        val totalW = cfg.hrrWeight + cfg.sleepWeight + cfg.loadWeight + cfg.subjectiveWeight
        val expected = (hrr.score * cfg.hrrWeight +
            sleep.score * cfg.sleepWeight +
            load.score * cfg.loadWeight +
            sub.score * cfg.subjectiveWeight) / totalW
        assertEquals(expected, result.compositeScore, 0.01)
    }

    @Test
    fun `custom config weights are respected`() {
        val inputs = ReadinessInputs(
            date,
            rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
            sleep = SleepMetrics(totalDurationMinutes = 480.0, deepPercent = 10.0, remPercent = 10.0),
        )
        val result = ReadinessScoring.score(inputs, ReadinessScoringConfig(hrrWeight = 1.0, sleepWeight = 0.0))
        val hrr = findComponent(result.componentScores, ReadinessComponent.HRR)
        assertEquals(hrr.score, result.compositeScore, 0.01)
    }

    // ---- Confidence levels ----

    @Test
    fun `4 available components means full confidence`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
                subjective = SubjectiveInput(exhaustionLevel = 3),
            ),
        )
        assertEquals(DataConfidence.FULL, result.confidence)
    }

    @Test
    fun `3 available components means partial confidence`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
                load = LoadMetrics(workloadRatio = 1.0),
            ),
        )
        assertEquals(DataConfidence.PARTIAL, result.confidence)
    }

    @Test
    fun `2 available components means estimated confidence`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
            ),
        )
        assertEquals(DataConfidence.ESTIMATED, result.confidence)
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
        )
        val defaultResult = ReadinessScoring.score(inputs)
        val customResult = ReadinessScoring.score(inputs, ReadinessScoringConfig(excellentThreshold = 60.0))
        assertEquals(ReadinessState.GOOD, defaultResult.state) // composite is 75
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
                rhr = RhrMetrics(todayRhr = 65.0, baselineRhr = 55.0, rhrDelta = 10.0),
                sleep = SleepMetrics(totalDurationMinutes = 270.0),
                load = LoadMetrics(workloadRatio = 1.7),
                subjective = SubjectiveInput(exhaustionLevel = 8, muscleSoreness = 8, stressLevel = 8),
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
        assertEquals(DataConfidence.PARTIAL, result.confidence)
        assertTrue(result.compositeScore > 0)
    }

    @Test
    fun `subjective unavailable does not cause unavailable result`() {
        val result = ReadinessScoring.score(
            ReadinessInputs(
                date,
                rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
                sleep = SleepMetrics(totalDurationMinutes = 480.0),
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
                "Resting heart rate elevated by 3.0 bpm",
                "Sleep: 7.5h",
                "Training load optimal (ratio: 1.25)",
            ),
            result.reasons,
        )
    }
}
