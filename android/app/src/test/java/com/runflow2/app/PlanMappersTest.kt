package com.runflow2.app

import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.net.PlanGoalDto
import com.runflow2.app.data.net.PlanWorkoutDto
import com.runflow2.app.data.sync.calibrationDistanceFor
import com.runflow2.app.data.sync.composeDescription
import com.runflow2.app.data.sync.dowToServerDay
import com.runflow2.app.data.sync.epochMillisToServerDate
import com.runflow2.app.data.sync.mergeServerWorkouts
import com.runflow2.app.data.sync.parseRaceType
import com.runflow2.app.data.sync.serverDateToEpochMillis
import com.runflow2.app.data.sync.serverDayToDow
import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.data.sync.toEntities
import com.runflow2.app.data.sync.toPatchRequest
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.PlanSpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Pins the plan compatibility bridge: server contract (meters, JS days 0..6,
 * ISO/UTC-midnight dates, restDays arrays) ↔ local Room schema (km, DayOfWeek
 * 1..7, epoch millis, CSV restDays).
 */
class PlanMappersTest {

    private fun workout(id: String, dirty: Boolean, desc: String, date: String = "2026-09-01") =
        WorkoutEntity(
            id = id,
            goalId = "g",
            scheduledDate = LocalDate.parse(date)
                .atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli(),
            workoutType = "TEMPO",
            phase = "BUILD",
            description = desc,
            targetDistanceKm = null,
            targetPaceSecPerKm = null,
            targetDurationSec = null,
            dirty = dirty,
        )

    // ---- day / date conversions ----

    @Test
    fun `server days convert to DayOfWeek`() {
        assertEquals(DayOfWeek.SUNDAY, serverDayToDow(0))
        assertEquals(DayOfWeek.MONDAY, serverDayToDow(1))
        assertEquals(DayOfWeek.SATURDAY, serverDayToDow(6))
        assertNull(serverDayToDow(7))
        assertNull(serverDayToDow(null))
    }

    @Test
    fun `DayOfWeek converts back to server days`() {
        assertEquals(0, dowToServerDay(DayOfWeek.SUNDAY))
        assertEquals(1, dowToServerDay(DayOfWeek.MONDAY))
        assertEquals(6, dowToServerDay(DayOfWeek.SATURDAY))
    }

    @Test
    fun `utc midnight dates anchor to the same local calendar day`() {
        val ms = serverDateToEpochMillis("2026-09-27T00:00:00.000Z")
        assertEquals("2026-09-27", epochMillisToServerDate(ms!!))
    }

    @Test
    fun `non-midnight timestamps parse as plain instants`() {
        val ms = serverDateToEpochMillis("2026-06-01T10:30:00Z")
        assertEquals(Instant.parse("2026-06-01T10:30:00Z").toEpochMilli(), ms)
    }

    @Test
    fun `null and malformed dates return null`() {
        assertNull(serverDateToEpochMillis(null))
        assertNull(serverDateToEpochMillis("not a date"))
    }

    // ---- goal mapping ----

    @Test
    fun `server goal maps into the local schema`() {
        val dto = PlanGoalDto(
            id = "g1", name = "Berlin Marathon", raceType = "MARATHON",
            raceDate = "2026-09-27T00:00:00.000Z", planStartDate = "2026-06-01T00:00:00.000Z",
            createdAt = "2026-05-20T10:00:00.000Z",
            targetTime = 12600, currentVdot = 45.2, weeklyMileageGoal = 58000.0,
            planWeeks = 16, runsPerWeek = 5, strengthPerWeek = 1, taperWeeks = 2,
            longRunDay = 0, workoutDay = 4, restDays = listOf(1, 5),
            isActive = true,
            workouts = listOf(
                PlanWorkoutDto(
                    id = "w1", scheduledDate = "2026-06-01T00:00:00.000Z",
                    workoutType = "TEMPO", phase = "BUILD", description = "Tempo run – 8 km at 4:05/km",
                    order = 0, targetDistance = 12000.0, targetPace = 245.0, targetDuration = 3300,
                ),
            ),
        )
        val (goal, workouts) = dto.toEntities()!!
        assertEquals("g1", goal.id)
        assertEquals("MARATHON", goal.raceType)
        assertEquals(serverDateToEpochMillis("2026-09-27T00:00:00.000Z"), goal.raceDate)
        assertEquals(58.0, goal.weeklyKmGoal, 0.001) // meters → km
        assertEquals(DayOfWeek.SUNDAY.value, goal.longRunDay) // 0 → Sunday(7)
        assertEquals(DayOfWeek.THURSDAY.value, goal.workoutDay)
        assertEquals("1,5", goal.restDays) // [1,5] → Mon,Fri CSV
        assertEquals(12600, goal.targetTimeSec)
        assertEquals(45.2, goal.vdotAtCreation!!, 0.001)
        assertNull(goal.customDistanceKm)
        assertTrue(!goal.isLocalOnly)
        assertTrue(!goal.isDemo)
        assertTrue(!goal.dirty)

        val w = workouts.single()
        assertEquals(12.0, w.targetDistanceKm!!, 0.001)
        assertEquals(245, w.targetPaceSecPerKm)
        assertEquals(3300, w.targetDurationSec)
        assertEquals("BUILD", w.phase)
        assertEquals(0, w.sortIndex)
        assertEquals("g1", w.goalId)
        assertTrue(!w.isDemo)
    }

    @Test
    fun `unknown enum names fall back safely`() {
        val dto = PlanGoalDto(
            id = "g2", name = "Plan", raceType = "TURKEY_TROT_50MILER",
            raceDate = "2026-08-01T00:00:00.000Z",
            workouts = listOf(
                PlanWorkoutDto(
                    id = "w1", scheduledDate = "2026-07-01T00:00:00.000Z",
                    workoutType = "OPEN_WATER_SWIM", phase = "ENDURANCE", description = "Swim",
                ),
            ),
        )
        val (goal, workouts) = dto.toEntities()!!
        assertEquals(RaceType.NONE, parseRaceType(goal.raceType))
        assertEquals(WorkoutType.CROSS_TRAIN, WorkoutType.valueOf(workouts[0].workoutType))
        assertEquals(PlanPhase.BASE, PlanPhase.valueOf(workouts[0].phase))
    }

    @Test
    fun `missing race date falls back to the last workout`() {
        val dto = PlanGoalDto(
            id = "g3", name = "Base", raceType = null, raceDate = null,
            workouts = listOf(
                PlanWorkoutDto(id = "w1", scheduledDate = "2026-07-01T00:00:00.000Z", description = "Easy"),
                PlanWorkoutDto(id = "w2", scheduledDate = "2026-08-15T00:00:00.000Z", description = "Easy"),
            ),
        )
        val (goal, _) = dto.toEntities()!!
        assertEquals(serverDateToEpochMillis("2026-08-15T00:00:00.000Z"), goal.raceDate)
    }

    @Test
    fun `goal without any dates is rejected`() {
        val dto = PlanGoalDto(id = "g4", name = "Empty", workouts = emptyList())
        assertNull(dto.toEntities())
    }

    @Test
    fun `missing weekly mileage falls back to the plan average`() {
        val dto = PlanGoalDto(
            id = "g5", name = "Base", raceDate = "2026-08-01T00:00:00.000Z", planWeeks = 4,
            workouts = listOf(
                PlanWorkoutDto(id = "w1", scheduledDate = "2026-07-01T00:00:00.000Z", description = "a", targetDistance = 20000.0),
                PlanWorkoutDto(id = "w2", scheduledDate = "2026-07-08T00:00:00.000Z", description = "b", targetDistance = 10000.0),
            ),
        )
        val (goal, _) = dto.toEntities()!!
        assertEquals(7.5, goal.weeklyKmGoal, 0.001) // 30 km total / 4 weeks
    }

    // ---- description composition ----

    @Test
    fun `display name and description compose`() {
        assertEquals("Name · Desc", composeDescription("Name", "Desc"))
        assertEquals("Desc", composeDescription(null, "Desc"))
        assertEquals("Name", composeDescription("Name", null))
        assertEquals("Name", composeDescription("Name", "Name"))
        assertEquals("Workout", composeDescription(null, null))
    }

    @Test
    fun `web-style display name folds into its longer description`() {
        // the web derives displayDesc as a prefix of description — showing both duplicates the text
        assertEquals(
            "Intervals: 5x800m @ 3:42/km",
            composeDescription("Intervals: 5x800m", "Intervals: 5x800m @ 3:42/km"),
        )
        assertEquals("Easy Run: 6.0km", composeDescription("Easy Run: 6.0km", "Easy Run: 6.0km"))
    }

    @Test
    fun `poisoned rows from the old exact-equality join heal`() {
        assertEquals(
            "Intervals: 5x800m @ 3:42/km",
            composeDescription("Intervals: 5x800m", "Intervals: 5x800m · Intervals: 5x800m @ 3:42/km"),
        )
    }

    @Test
    fun `unrelated name and description still join`() {
        assertEquals("Long Run · 90 min easy, flat", composeDescription("Long Run", "90 min easy, flat"))
        // a SHORT name inside the text is coincidence, not redundancy
        assertEquals("Run · Trail Run 10k", composeDescription("Run", "Trail Run 10k"))
    }

    @Test
    fun `sub-goal prefixed description keeps its unprefixed name folded in`() {
        // plan-creation prefixes description with "[10K] " but not customName
        assertEquals(
            "[10K] Intervals: 5x800m @ 3:42/km",
            composeDescription("Intervals: 5x800m", "[10K] Intervals: 5x800m @ 3:42/km"),
        )
    }

    // ---- merge semantics ----

    @Test
    fun `dirty local workouts survive the server merge`() {
        val local = listOf(
            workout("w1", dirty = true, desc = "local edit"),
            workout("w2", dirty = false, desc = "clean"),
        )
        val server = listOf(
            workout("w1", dirty = false, desc = "server"),
            workout("w2", dirty = false, desc = "server"),
            workout("w3", dirty = false, desc = "new"),
        )
        val merged = mergeServerWorkouts(local, server)
        assertEquals(3, merged.size)
        assertEquals("local edit", merged.first { it.id == "w1" }.description)
        assertEquals("server", merged.first { it.id == "w2" }.description)
        assertEquals("new", merged.first { it.id == "w3" }.description)
    }

    @Test
    fun `dirty orphans are kept until their push resolves`() {
        val merged = mergeServerWorkouts(listOf(workout("w1", dirty = true, desc = "queued")), emptyList())
        assertEquals(1, merged.size)
        assertTrue(merged.single().dirty)
    }

    // ---- request building ----

    @Test
    fun `spec maps to the web create-plan contract`() {
        val spec = PlanSpec(
            name = "Berlin", raceType = RaceType.MARATHON,
            raceDate = LocalDate.of(2026, 9, 27), startDate = LocalDate.of(2026, 6, 3),
            targetTimeSec = 12600, weeklyKm = 58.0, runsPerWeek = 5, longRunKm = 30.0,
            strengthPerWeek = 1, longRunDay = DayOfWeek.SUNDAY, workoutDay = DayOfWeek.THURSDAY,
            restDays = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY), taperWeeks = 2,
            vdot = 47.5, calibrationTimeSec = 1500, calibrationDistance = "HALF",
        )
        val req = spec.toCreatePlanRequest()
        assertEquals("Berlin", req.name)
        assertEquals("RUN", req.sport)
        assertEquals("MARATHON", req.raceType)
        assertEquals("2026-09-27", req.raceDate)
        assertEquals("2026-06-01", req.planStartDate) // start snapped to Monday
        assertNull(req.durationWeeks)
        assertEquals(58000.0, req.weeklyMileageGoal!!, 0.001) // km → meters
        assertEquals(30.0, req.maxLongRunKm!!, 0.001) // stays km
        assertEquals(0, req.longRunDay) // Sunday → 0
        assertEquals(4, req.workoutDay) // Thursday → 4
        assertEquals(listOf(2, 5), req.restDays) // Tue, Fri
        assertEquals(12600, req.targetTime)
        assertEquals(1500, req.calibrationTime)
        assertEquals("HALF", req.calibrationDistance)
        assertEquals("mobile", req.planSource)
    }

    @Test
    fun `no-race specs request the NO_RACE sport with a duration`() {
        val spec = PlanSpec(
            name = "Base", raceType = RaceType.NONE,
            raceDate = LocalDate.of(2026, 9, 7), startDate = LocalDate.of(2026, 6, 15),
            weeklyKm = 42.0, runsPerWeek = 4, longRunKm = 16.0,
        )
        val req = spec.toCreatePlanRequest()
        assertEquals("NO_RACE", req.sport)
        assertNull(req.raceType)
        assertNull(req.raceDate)
        assertEquals(12, req.durationWeeks)
        assertNull(req.targetTime)
    }

    @Test
    fun `triathlon race types request the triathlon sport`() {
        val spec = PlanSpec(
            name = "Ironman", raceType = RaceType.FULL_IRONMAN,
            raceDate = LocalDate.of(2026, 9, 27), startDate = LocalDate.of(2026, 6, 1),
            weeklyKm = 50.0, runsPerWeek = 5, longRunKm = 26.0,
        )
        assertEquals("TRIATHLON", spec.toCreatePlanRequest().sport)
    }

    @Test
    fun `patch payload converts units to the wire contract`() {
        val w = workout("w1", dirty = false, desc = "Tempo").copy(
            targetDistanceKm = 12.0, targetPaceSecPerKm = 245, targetDurationSec = 3300,
            isCompleted = true,
        )
        val req = w.toPatchRequest()
        assertEquals(12000.0, req.targetDistance!!, 0.001)
        assertEquals(245.0, req.targetPace!!, 0.001)
        assertEquals(3300, req.targetDuration)
        assertEquals(true, req.isCompleted)
        assertEquals("2026-09-01", req.scheduledDate)
    }

    // ---- calibration labels ----

    @Test
    fun `wizard calibration labels map to server enum values`() {
        assertEquals("5K", calibrationDistanceFor("5K"))
        assertEquals("10K", calibrationDistanceFor("10K"))
        assertEquals("HALF", calibrationDistanceFor("Half Marathon"))
        assertEquals("MARATHON", calibrationDistanceFor("Marathon"))
        assertNull(calibrationDistanceFor("Something else"))
    }
}
