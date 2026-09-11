package com.runflow2.app.core.export

import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.WorkoutEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class PlanCsvExporterTest {

    private fun workout(date: LocalDate, type: String = "EASY", phase: String = "BASE") =
        WorkoutEntity(
            id = "$type-$date",
            goalId = "g1",
            scheduledDate = Format.epochMillis(date),
            workoutType = type,
            phase = phase,
            description = "Easy run",
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 300,
            targetDurationSec = 2700,
        )

    @Test
    fun `header and rows match the web export columns`() {
        val csv = PlanCsvExporter().build(listOf(workout(LocalDate.of(2026, 9, 7))))
        val lines = csv.split("\n")
        assertEquals("Date,Day,Type,Description,Distance (km),Duration,Pace,Phase,Intensity Zone", lines[0])
        assertEquals("2026-09-07,Mon,EASY,\"Easy run\",8.0,45:00,5:00,BASE,", lines[1])
    }

    @Test
    fun `rows are sorted by date`() {
        val csv = PlanCsvExporter().build(
            listOf(
                workout(LocalDate.of(2026, 9, 9)),
                workout(LocalDate.of(2026, 9, 7)),
            ),
        )
        val dates = csv.lines().drop(1).map { it.substringBefore(',') }
        assertEquals(listOf("2026-09-07", "2026-09-09"), dates)
    }

    @Test
    fun `quotes in descriptions are escaped`() {
        val csv = PlanCsvExporter().build(
            listOf(workout(LocalDate.of(2026, 9, 7)).copy(description = "Easy \"progression\" run")),
        )
        assertTrue(csv.contains("\"Easy \"\"progression\"\" run\""))
    }

    @Test
    fun `customName wins over description`() {
        val csv = PlanCsvExporter().build(
            listOf(workout(LocalDate.of(2026, 9, 7)).copy(customName = "Track 8x400")),
        )
        assertTrue(csv.contains("\"Track 8x400\""))
    }

    @Test
    fun `blank and web-enum values render like the web`() {
        val w = workout(LocalDate.of(2026, 9, 7), type = "RIDE").copy(
            webWorkoutType = "LONG_RIDE",
            targetDistanceKm = null, targetDurationSec = null, targetPaceSecPerKm = null,
            phase = "RACE_WEEK",
        )
        val line = PlanCsvExporter().build(listOf(w)).lines()[1]
        assertEquals("2026-09-07,Mon,LONG RIDE,\"Easy run\",-,-,-,RACE WEEK,", line)
    }
}
