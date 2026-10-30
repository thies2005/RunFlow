package com.runflow2.app.domain.readiness

import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class ReadinessAdaptationTest {

    private val zone = ZoneId.of("UTC")

    private fun dummyResult(score: Double) = ReadinessResult(
        compositeScore = score,
        state = ReadinessState.MODERATE,
        confidence = DataConfidence.FULL,
        componentScores = emptyList(),
        reasons = emptyList(),
        adaptationType = AdaptationType.NONE,
    )

    private fun dummyWorkout() = WorkoutEntity(
        id = "w-today",
        goalId = "g1",
        scheduledDate = LocalDate.parse("2026-11-03").atStartOfDay(zone).toInstant().toEpochMilli(),
        workoutType = "TEMPO",
        phase = "BUILD",
        description = "40m Tempo Run",
        targetDistanceKm = 10.0,
        targetPaceSecPerKm = 270,
        targetDurationSec = 3600,
        plannedTss = 60.0,
    )

    @Test
    fun `buildReduceAdaptation returns null when readiness is 65 or higher`() {
        val workout = dummyWorkout()
        val result = dummyResult(75.0)

        val adaptation = ReadinessScoring.buildReduceAdaptation(workout, result)
        assertNull(adaptation)
    }

    @Test
    fun `buildReduceAdaptation reduces volume by 25 percent when score is 50 to 64`() {
        val workout = dummyWorkout()
        val result = dummyResult(58.0)

        val adaptation = ReadinessScoring.buildReduceAdaptation(workout, result)
        assertNotNull(adaptation)
        assertEquals(AdaptationType.VOLUME_REDUCTION, adaptation!!.type)
        assertEquals(7.5, adaptation.adaptedDistanceKm!!, 0.01) // 10.0 * 0.75
        assertEquals(2700, adaptation.adaptedDurationSec) // 3600 * 0.75
        assertEquals(45.0, adaptation.adaptedPlannedTss!!, 0.01) // 60.0 * 0.75
        assertEquals("TEMPO", adaptation.adaptedWorkoutType)
    }

    @Test
    fun `buildReduceAdaptation swaps to easy recovery when score is below 50`() {
        val workout = dummyWorkout()
        val result = dummyResult(42.0)

        val adaptation = ReadinessScoring.buildReduceAdaptation(workout, result)
        assertNotNull(adaptation)
        assertEquals(AdaptationType.SWAP_TO_EASY, adaptation!!.type)
        assertEquals("RECOVERY", adaptation.adaptedWorkoutType)
        assertEquals(2160, adaptation.adaptedDurationSec) // 3600 * 0.60
        assertNull(adaptation.adaptedDistanceKm)
    }

    @Test
    fun `buildRescheduleAdaptation recommends valid future day when readiness below 65`() {
        val workout = dummyWorkout() // Tuesday 2026-11-03: TEMPO
        val result = dummyResult(55.0)

        // Wednesday is open, so it's the earliest valid day
        val adaptation = ReadinessScoring.buildRescheduleAdaptation(
            workout = workout,
            weekWorkouts = listOf(workout),
            readinessResult = result,
            today = LocalDate.parse("2026-11-03"),
            zoneId = zone,
        )

        assertNotNull(adaptation)
        assertEquals(LocalDate.parse("2026-11-04"), adaptation!!.recommendedDate)
        assertEquals("Move to Wednesday", adaptation.title)
    }
}
