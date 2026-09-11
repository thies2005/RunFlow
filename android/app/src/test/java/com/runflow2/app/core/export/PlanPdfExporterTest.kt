package com.runflow2.app.core.export

import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime

class PlanPdfExporterTest {

    private fun workout(date: LocalDate, type: String = "EASY", phase: String = "BASE", desc: String = "Easy run") =
        WorkoutEntity(
            id = "$type-$date",
            goalId = "g1",
            scheduledDate = Format.epochMillis(date),
            workoutType = type,
            phase = phase,
            description = desc,
            targetDistanceKm = 10.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 3000,
        )

    private val goal = GoalEntity(
        id = "g1", name = "Berlin Marathon", raceType = "MARATHON",
        raceDate = Format.epochMillis(LocalDate.of(2026, 10, 11), LocalTime.of(9, 0)),
        targetTimeSec = 13_500, weeklyKmGoal = 58.0, planWeeks = 16, runsPerWeek = 5,
        strengthPerWeek = 1, longRunDay = DayOfWeek.SUNDAY.value, workoutDay = DayOfWeek.THURSDAY.value,
        restDays = "2,5", taperWeeks = 2, vdotAtCreation = 47.5, isActive = true,
        createdAt = 0L,
    )

    @Test
    fun `groups workouts into ISO weeks in order`() {
        val monday = LocalDate.of(2026, 9, 7) // a Monday
        val weeks = PlanPdfExporter(DistanceUnit.METRIC)
            .buildWeeks(
                listOf(
                    workout(monday.plusDays(3), phase = "BUILD"),
                    workout(monday, phase = "BUILD"),
                    workout(monday.plusDays(8), phase = "PEAK"), // next week
                ),
            )
        assertEquals(2, weeks.size)
        assertEquals(2, weeks[0].rows.size)
        assertEquals(1, weeks[1].rows.size)
        assertEquals(1, weeks[0].number)
        assertEquals(2, weeks[1].number)
        assertEquals("Build", weeks[0].phase)
        assertEquals("Peak", weeks[1].phase)
        assertTrue(weeks[0].title.startsWith("Mon, Sep 7"))
        assertEquals("20.0 km", weeks[0].totalDistance)
    }

    @Test
    fun `row strings carry formatted values`() {
        val weeks = PlanPdfExporter(DistanceUnit.METRIC).buildWeeks(listOf(workout(LocalDate.of(2026, 9, 7))))
        val row = weeks.single().rows.single()
        assertEquals("Mon", row.day)
        assertEquals("Easy Run", row.type)
        assertEquals("10.0 km", row.distance)
        assertEquals("50:00", row.time)
        assertEquals("5:00", row.pace)
    }

    @Test
    fun `imperial unit converts distance and pace`() {
        val weeks = PlanPdfExporter(DistanceUnit.IMPERIAL).buildWeeks(listOf(workout(LocalDate.of(2026, 9, 7))))
        val row = weeks.single().rows.single()
        assertEquals("6.2 mi", row.distance)
        assertEquals("8:02", row.pace)
    }

    @Test
    fun `blank fields render as empty strings not null-words`() {
        val w = workout(LocalDate.of(2026, 9, 7)).copy(
            targetDistanceKm = null, targetDurationSec = null, targetPaceSecPerKm = null,
        )
        val row = PlanPdfExporter().buildWeeks(listOf(w)).single().rows.single()
        assertEquals("", row.distance)
        assertEquals("", row.time)
        assertEquals("", row.pace)
    }

    @Test
    fun `filename follows the web export naming`() {
        assertEquals("runflow-marathon-plan.pdf", PlanPdfExporter().fileName(goal))
        val tri = goal.copy(raceType = "HALF_IRONMAN")
        assertEquals("runflow-half_ironman-plan.pdf", PlanPdfExporter().fileName(tri))
    }

    @Test
    fun `customName overrides the description column`() {
        val w = workout(LocalDate.of(2026, 9, 7), type = "TEMPO", desc = "ignored")
            .copy(customName = "Custom titled session")
        val row = PlanPdfExporter().buildWeeks(listOf(w)).single().rows.single()
        assertEquals("Custom titled session", row.description)
    }
}
