package com.runflow2.app.domain.plan

import com.runflow2.app.data.db.WorkoutEntity
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.abs

/**
 * Smart workout scheduler (Task 1.5 / Decision U3):
 * Finds candidate days in the current Mon-Sun week to reschedule a workout,
 * maintaining a >= 48h buffer from other hard workouts, preferring open days
 * and easy/recovery days.
 */
object SmartScheduler {

    val HARD_TYPES = setOf(
        "INTERVALS",
        "REPETITIONS",
        "TEMPO",
        "FARTLEK",
        "LONG_RUN",
        "RACE",
        "RIDE_INTERVALS",
        "LONG_RIDE",
    )

    fun isHardWorkoutType(type: String?): Boolean {
        if (type == null) return false
        val clean = type.trim().uppercase(Locale.ROOT).replace(Regex("[\\s-]+"), "_")
        return clean in HARD_TYPES
    }

    fun isEasyOrRecoveryType(type: String?): Boolean {
        if (type == null) return false
        val clean = type.trim().uppercase(Locale.ROOT).replace(Regex("[\\s-]+"), "_")
        return clean in setOf("EASY", "RECOVERY", "REST", "CROSS_TRAIN")
    }

    private fun epochMillisToLocalDate(epochMs: Long, zoneId: ZoneId = ZoneId.systemDefault()): LocalDate {
        return Instant.ofEpochMilli(epochMs).atZone(zoneId).toLocalDate()
    }

    /**
     * Finds a candidate reschedule day within the same Monday–Sunday week as [today].
     *
     * @param workout The workout to move.
     * @param weekWorkouts All workouts in the week.
     * @param today Reference date (defaults to system date).
     * @param zoneId Timezone used to convert scheduledDate epoch millis to LocalDate.
     * @return The recommended future [LocalDate] in the same week, or null if no valid slot.
     */
    fun findSmartRescheduleDay(
        workout: WorkoutEntity,
        weekWorkouts: List<WorkoutEntity>,
        today: LocalDate = LocalDate.now(),
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): LocalDate? {
        val weekSun = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))

        val isTargetHard = isHardWorkoutType(workout.workoutType) || isHardWorkoutType(workout.webWorkoutType)

        // Group workouts by LocalDate (excluding the workout being moved)
        val workoutsByDate = mutableMapOf<LocalDate, MutableList<WorkoutEntity>>()
        for (w in weekWorkouts) {
            if (w.id == workout.id) continue
            val date = epochMillisToLocalDate(w.scheduledDate, zoneId)
            workoutsByDate.getOrPut(date) { mutableListOf() }.add(w)
        }

        // Identify dates with other hard workouts
        val hardDates = mutableSetOf<LocalDate>()
        for ((date, list) in workoutsByDate) {
            if (list.any { isHardWorkoutType(it.workoutType) || isHardWorkoutType(it.webWorkoutType) }) {
                hardDates.add(date)
            }
        }

        data class Candidate(val date: LocalDate, val score: Int)
        val candidates = mutableListOf<Candidate>()

        var cursor = today.plusDays(1)
        while (!cursor.isAfter(weekSun)) {
            var bufferOk = true
            if (isTargetHard) {
                for (hDate in hardDates) {
                    val dayDiff = abs(cursor.toEpochDay() - hDate.toEpochDay())
                    if (dayDiff < 2) {
                        bufferOk = false
                        break
                    }
                }
            }

            if (bufferOk) {
                val list = workoutsByDate[cursor].orEmpty()
                if (list.isEmpty()) {
                    // Tier 0: Completely open day
                    candidates.add(Candidate(cursor, 0))
                } else if (list.all { isEasyOrRecoveryType(it.workoutType) || isEasyOrRecoveryType(it.webWorkoutType) }) {
                    // Tier 1: Easy or recovery session to swap
                    candidates.add(Candidate(cursor, 1))
                }
            }

            cursor = cursor.plusDays(1)
        }

        return candidates
            .sortedWith(compareBy({ it.score }, { it.date }))
            .firstOrNull()?.date
    }
}
