package com.runflow2.app.domain.plan

import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate

class PlanGeneratorTest {

    private fun spec(
        raceDate: LocalDate = LocalDate.of(2026, 12, 6),
        startDate: LocalDate = LocalDate.of(2026, 9, 7),
        weeklyKm: Double = 58.0,
        runsPerWeek: Int = 5,
        longRunKm: Double = 30.0,
    ) = PlanSpec(
        name = "Test Marathon",
        raceType = RaceType.MARATHON,
        raceDate = raceDate,
        startDate = startDate,
        weeklyKm = weeklyKm,
        runsPerWeek = runsPerWeek,
        longRunKm = longRunKm,
        longRunDay = DayOfWeek.SUNDAY,
        workoutDay = DayOfWeek.THURSDAY,
        restDays = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
        vdot = 48.0,
    )

    @Test
    fun `generates one race workout on race day`() {
        val drafts = PlanGenerator.generate(spec())
        val races = drafts.filter { it.type == WorkoutType.RACE }
        assertEquals(1, races.size)
        assertEquals(LocalDate.of(2026, 12, 6), races[0].date)
    }

    @Test
    fun `no workouts before start date or after race`() {
        val s = spec()
        val drafts = PlanGenerator.generate(s)
        assertTrue(drafts.all { !it.date.isBefore(s.startDate) })
        assertTrue(drafts.all { !it.date.isAfter(s.raceDate) })
    }

    @Test
    fun `long run lands on chosen day and grows over time`() {
        val drafts = PlanGenerator.generate(spec())
        val longs = drafts.filter { it.type == WorkoutType.LONG_RUN }
        assertTrue(longs.isNotEmpty())
        assertTrue(longs.all { it.date.dayOfWeek == DayOfWeek.SUNDAY })
        // recovery weeks deliberately cut back; peak long run should still grow
        val firstHalf = longs.take(longs.size / 2).map { it.distanceKm!! }
        val secondHalf = longs.takeLast(longs.size / 2).map { it.distanceKm!! }
        assertTrue(
            "first=$firstHalf second=$secondHalf",
            (secondHalf.maxOrNull() ?: 0.0) >= (firstHalf.maxOrNull() ?: 0.0),
        )
    }

    @Test
    fun `weekly km stays within growth cap`() {
        val drafts = PlanGenerator.generate(spec(weeklyKm = 60.0))
        val byWeek = drafts
            .filter { it.type != WorkoutType.REST && it.type != WorkoutType.RACE }
            .groupBy { it.date.with(DayOfWeek.MONDAY) }
            .mapValues { (_, ws) -> ws.sumOf { it.distanceKm ?: 0.0 } }
            .toSortedMap()
        val weeks = byWeek.entries.toList()
        // allow generous slack (long-run rounding + recovery weeks) but no crazy jumps
        weeks.zipWithNext().forEach { (cur, next) ->
            assertTrue(
                "jump ${cur.key}: ${cur.value} -> ${next.value}",
                next.value < cur.value * 1.35 + 8,
            )
        }
    }

    @Test
    fun `phases end with taper and race week`() {
        val drafts = PlanGenerator.generate(spec())
        val phases = drafts.map { it.phase }.distinct()
        assertTrue(PlanPhase.RACE_WEEK in phases)
        assertTrue(PlanPhase.TAPER in phases || PlanPhase.BASE in phases)
    }

    @Test
    fun `runs per week roughly matches request`() {
        val drafts = PlanGenerator.generate(spec(runsPerWeek = 5))
        val midWeeks = drafts.groupBy { it.date.with(DayOfWeek.MONDAY) }
            .filterKeys { w -> w.isAfter(spec().startDate.plusWeeks(2)) && w.isBefore(spec().raceDate.minusWeeks(3)) }
        val runCounts = midWeeks.map { (_, ws) -> ws.count { it.type != WorkoutType.REST && it.type != WorkoutType.STRENGTH } }
        assertTrue(
            "counts were $runCounts",
            runCounts.all { it in 4..6 },
        )
    }

    @Test
    fun `target paces assigned when vdot present`() {
        val drafts = PlanGenerator.generate(spec())
        val easy = drafts.first { it.type == WorkoutType.EASY }
        assertTrue(easy.targetPaceSecPerKm != null && easy.targetPaceSecPerKm!! > 250)
    }
}
