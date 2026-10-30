package com.runflow2.app.domain.plan

import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

class SmartSchedulerTest {

    private val zone = ZoneId.of("UTC")

    private fun dateToMillis(dateStr: String): Long {
        return LocalDate.parse(dateStr).atStartOfDay(zone).toInstant().toEpochMilli()
    }

    private fun makeWorkout(id: String, type: String, dateStr: String): WorkoutEntity {
        return WorkoutEntity(
            id = id,
            goalId = "g1",
            scheduledDate = dateToMillis(dateStr),
            workoutType = type,
            phase = "BUILD",
            description = "$type session",
            targetDistanceKm = 10.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 3600,
        )
    }

    @Test
    fun `isHardWorkoutType identifies key hard workouts correctly`() {
        assertTrue(SmartScheduler.isHardWorkoutType("INTERVALS"))
        assertTrue(SmartScheduler.isHardWorkoutType("TEMPO"))
        assertTrue(SmartScheduler.isHardWorkoutType("LONG_RUN"))
        assertTrue(SmartScheduler.isHardWorkoutType("LONG_RIDE"))
        assertTrue(SmartScheduler.isHardWorkoutType("RIDE_INTERVALS"))
        assertTrue(SmartScheduler.isHardWorkoutType("REPETITIONS"))
        assertTrue(SmartScheduler.isHardWorkoutType("FARTLEK"))
        assertTrue(SmartScheduler.isHardWorkoutType("RACE"))

        assertFalse(SmartScheduler.isHardWorkoutType("EASY"))
        assertFalse(SmartScheduler.isHardWorkoutType("RECOVERY"))
        assertFalse(SmartScheduler.isHardWorkoutType("REST"))
        assertFalse(SmartScheduler.isHardWorkoutType("CROSS_TRAIN"))
    }

    @Test
    fun `reschedule hard workout maintains 48h buffer from other hard workouts in week`() {
        // Week: Mon 2026-11-02 to Sun 2026-11-08
        // Today is Tuesday 2026-11-03
        // Tuesday workout: INTERVALS (needs rescheduling)
        // Wednesday 2026-11-04: RECOVERY
        // Friday 2026-11-06: TEMPO (hard)
        // Candidate days:
        // Wed 11-04: Recovery
        // Thu 11-05: 24h before Friday TEMPO (violates 48h buffer!)
        // Fri 11-06: Already has TEMPO
        // Sat 11-07: 24h after Friday TEMPO (violates 48h buffer!)
        // Sun 11-08: 48h after Friday TEMPO (valid open day!)
        val movingWorkout = makeWorkout("w-tue", "INTERVALS", "2026-11-03")
        val weekWorkouts = listOf(
            movingWorkout,
            makeWorkout("w-wed", "RECOVERY", "2026-11-04"),
            makeWorkout("w-fri", "TEMPO", "2026-11-06"),
        )

        val target = SmartScheduler.findSmartRescheduleDay(
            workout = movingWorkout,
            weekWorkouts = weekWorkouts,
            today = LocalDate.parse("2026-11-03"),
            zoneId = zone,
        )

        assertEquals(LocalDate.parse("2026-11-08"), target)
    }

    @Test
    fun `reschedule prefers open days before easy swap days`() {
        // Today is Tuesday 2026-11-03
        // Moving an EASY workout
        // Thursday 2026-11-05 is EASY
        // Wednesday 2026-11-04 is completely OPEN
        val movingWorkout = makeWorkout("w-tue", "EASY", "2026-11-03")
        val weekWorkouts = listOf(
            movingWorkout,
            makeWorkout("w-thu", "EASY", "2026-11-05"),
        )

        val target = SmartScheduler.findSmartRescheduleDay(
            workout = movingWorkout,
            weekWorkouts = weekWorkouts,
            today = LocalDate.parse("2026-11-03"),
            zoneId = zone,
        )

        assertEquals(LocalDate.parse("2026-11-04"), target)
    }

    @Test
    fun `reschedule returns null if no remaining days in current week`() {
        // Today is Sunday 2026-11-08 (end of week)
        val movingWorkout = makeWorkout("w-sun", "LONG_RUN", "2026-11-08")
        val target = SmartScheduler.findSmartRescheduleDay(
            workout = movingWorkout,
            weekWorkouts = listOf(movingWorkout),
            today = LocalDate.parse("2026-11-08"),
            zoneId = zone,
        )

        assertNull(target)
    }
}
