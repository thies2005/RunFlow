package com.runflow2.app

import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.PlanGoalDto
import com.runflow2.app.data.net.PlanWorkoutDto
import com.runflow2.app.data.sync.calibrationDistanceFor
import com.runflow2.app.data.sync.composeDescription
import com.runflow2.app.data.sync.dowToServerDay
import com.runflow2.app.data.sync.epochMillisToServerDate
import com.runflow2.app.data.sync.mergeServerWorkouts
import com.runflow2.app.data.sync.parseRaceType
import com.runflow2.app.data.sync.reconcileCreatedWorkout
import com.runflow2.app.data.sync.serverDateToEpochMillis
import com.runflow2.app.data.sync.serverDayToDow
import com.runflow2.app.data.sync.toCreatePlanRequest
import com.runflow2.app.data.sync.toCreateWorkoutPayload
import com.runflow2.app.data.sync.toEntities
import com.runflow2.app.data.sync.toPatchRequest
import com.runflow2.app.data.sync.toWorkoutEntity
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.PlanSpec
import com.runflow2.app.domain.plan.StructuredStepsParser
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
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

    // ---- structured steps persistence ----

    @Test
    fun `builder target fields round-trip from DTO into the entity`() {
        val body = """
            {"id":"w20","goalId":"g1","scheduledDate":"2026-09-03T00:00:00.000Z","workoutType":"TEMPO",
             "description":"Zone 3 steady","phase":"BUILD","customName":"Thursday Steady",
             "targetHrZone":3,"targetHrZoneLabel":"Z3 Aerobic","targetHrMinBpm":140,"targetHrMaxBpm":155,
             "targetPaceZoneLabel":"Steady","targetPaceMinSecondsPerKm":285.0,"targetPaceMaxSecondsPerKm":300.5,
             "plannedTss":62.5,"color":"#ff0000"}
        """.trimIndent()
        val dto = Api.json.decodeFromString(PlanWorkoutDto.serializer(), body)
        val entity = dto.toWorkoutEntity("g1")!!
        assertEquals("Thursday Steady", entity.customName)
        assertEquals(3, entity.targetHrZone)
        assertEquals(140, entity.targetHrMinBpm)
        assertEquals(155, entity.targetHrMaxBpm)
        assertEquals(285.0, entity.targetPaceMinSecPerKm!!, 0.001)
        assertEquals(300.5, entity.targetPaceMaxSecPerKm!!, 0.001)
    }

    @Test
    fun `generator workouts keep null builder fields`() {
        val dto = PlanWorkoutDto(id = "w21", scheduledDate = "2026-09-03T00:00:00.000Z", description = "Easy")
        val entity = dto.toWorkoutEntity("g1")!!
        assertNull(entity.customName)
        assertNull(entity.targetHrZone)
        assertNull(entity.targetHrMinBpm)
        assertNull(entity.targetHrMaxBpm)
        assertNull(entity.targetPaceMinSecPerKm)
        assertNull(entity.targetPaceMaxSecPerKm)
    }

    @Test
    fun `goal creation mode and guidance level persist`() {
        val dto = PlanGoalDto(
            id = "g6", name = "Builder plan", raceDate = "2026-08-01T00:00:00.000Z",
            creationMode = "STANDARD_BUILDER", guidanceLevel = "full",
            workouts = emptyList(),
        )
        val (goal, _) = dto.toEntities()!!
        assertEquals("STANDARD_BUILDER", goal.creationMode)
        assertEquals("full", goal.guidanceLevel)
    }

    @Test
    fun `builder fields survive the merge on same-id dirty rows`() {
        val local = workout("w20", dirty = true, desc = "local edit").copy(
            customName = "Thursday Steady",
            targetHrZone = 3,
            targetHrMinBpm = 140,
            targetHrMaxBpm = 155,
            targetPaceMinSecPerKm = 285.0,
            targetPaceMaxSecPerKm = 300.5,
        )
        val server = workout("w20", dirty = false, desc = "server version")
        val merged = mergeServerWorkouts(listOf(local), listOf(server))
        assertEquals(1, merged.size)
        val kept = merged.single()
        assertEquals("local edit", kept.description)
        assertEquals("Thursday Steady", kept.customName)
        assertEquals(3, kept.targetHrZone)
        assertEquals(140, kept.targetHrMinBpm)
        assertEquals(155, kept.targetHrMaxBpm)
        assertEquals(285.0, kept.targetPaceMinSecPerKm!!, 0.001)
        assertEquals(300.5, kept.targetPaceMaxSecPerKm!!, 0.001)
    }

    @Test
    fun `patch payload carries the builder fields`() {
        val w = workout("w20", dirty = false, desc = "Steady").copy(
            customName = "Thursday Steady",
            targetHrZone = 3,
            targetHrMinBpm = 140,
            targetHrMaxBpm = 155,
            targetPaceMinSecPerKm = 285.0,
            targetPaceMaxSecPerKm = 300.5,
        )
        val req = w.toPatchRequest()
        assertEquals("Thursday Steady", req.customName)
        assertEquals(3, req.targetHrZone)
        assertEquals(140, req.targetHrMinBpm)
        assertEquals(155, req.targetHrMaxBpm)
        assertEquals(285.0, req.targetPaceMinSecondsPerKm!!, 0.001)
        assertEquals(300.5, req.targetPaceMaxSecondsPerKm!!, 0.001)
    }

    @Test
    fun `patch payload omits null builder fields`() {
        // encodeDefaults=false + explicitNulls=false: unset fields stay off the wire
        val req = workout("w21", dirty = false, desc = "Easy").toPatchRequest()
        assertNull(req.customName)
        assertNull(req.targetHrZone)
        assertNull(req.targetPaceMinSecondsPerKm)
        val encoded = Api.json.encodeToString(
            com.runflow2.app.data.net.PatchWorkoutRequest.serializer(), req,
        )
        assertTrue(!encoded.contains("customName"))
        assertTrue(!encoded.contains("targetHrZone"))
    }

    @Test
    fun `patch payload carries structuredSteps when the entity has them`() {
        // the current server route ignores the field; sent for forward compatibility
        val w = workout("w30", dirty = false, desc = "400s").copy(
            structuredStepsJson = """{"warmup":{"distance":1000,"pace":"E"},"main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],"cooldown":{"distance":1000,"pace":"E"}}""",
        )
        val req = w.toPatchRequest()
        val entry = req.structuredSteps!!.jsonObject["main"]!!.jsonArray[0].jsonObject
        assertEquals("I", entry["pace"]!!.jsonPrimitive.content)
        assertEquals(4, entry["reps"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun `patch payload omits structuredSteps without stored steps`() {
        val req = workout("w31", dirty = false, desc = "Easy").toPatchRequest()
        assertNull(req.structuredSteps)
        val encoded = Api.json.encodeToString(
            com.runflow2.app.data.net.PatchWorkoutRequest.serializer(), req,
        )
        assertTrue(!encoded.contains("structuredSteps"))
    }

    @Test
    fun `generator flat structuredSteps persist into the workout entity`() {
        val body = """
            {"id":"w9","goalId":"g1","scheduledDate":"2026-09-01T00:00:00.000Z","workoutType":"INTERVALS",
             "description":"Intervals","phase":"BUILD",
             "structuredSteps":{"version":1,"source":"generated-plan","steps":[
               {"type":"warmup","name":"Warm-up","distanceMeters":1500,"paceSecondsPerKm":330},
               {"type":"work","name":"3x1K","distanceMeters":1000,"paceSecondsPerKm":240}]},
             "targetHrMinBpm":140,"_count":{"x":1}}
        """.trimIndent()
        val dto = Api.json.decodeFromString(PlanWorkoutDto.serializer(), body)
        val entity = dto.toWorkoutEntity("g1")!!
        val persisted = Api.json.parseToJsonElement(entity.structuredStepsJson!!).jsonObject
        val steps = persisted["steps"]!!.jsonArray
        assertEquals(2, steps.size)
        assertEquals("warmup", steps[0].jsonObject["type"]!!.jsonPrimitive.content)
        assertEquals(1500.0, steps[0].jsonObject["distanceMeters"]!!.jsonPrimitive.double, 0.01)
        // the stored JSON round-trips through the parser
        val parsed = StructuredStepsParser.parse(entity.structuredStepsJson, emptyMap())
        assertEquals(listOf("Warm-up", "3x1K"), parsed.map { it.label })
        assertEquals(listOf("warmup", "main"), parsed.map { it.kind })
    }

    @Test
    fun `builder nested structuredSteps persist and round-trip through the parser`() {
        val body = """
            {"id":"w10","scheduledDate":"2026-09-02T00:00:00.000Z","workoutType":"INTERVALS","description":"400s",
             "structuredSteps":{"warmup":{"distance":1000,"pace":"E"},
               "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
               "cooldown":{"distance":1000,"pace":"E"}}}
        """.trimIndent()
        val dto = Api.json.decodeFromString(PlanWorkoutDto.serializer(), body)
        val entity = dto.toWorkoutEntity("g1")!!
        val paceTable = mapOf("E" to 300.0, "I" to 220.0)
        val parsed = StructuredStepsParser.parse(entity.structuredStepsJson, paceTable)
        assertEquals(9, parsed.size) // warmup + 4 reps + 3 rests + cooldown
        assertEquals("Warm-up 1.0 km E", parsed.first().label)
        assertEquals("400 m I (1/4)", parsed[1].label)
        assertEquals("90 s rest", parsed[2].label)
        assertEquals("Cool-down 1.0 km E", parsed.last().label)
        assertEquals(220.0, parsed[1].targetPaceSecPerKm!!, 0.01)
    }

    @Test
    fun `workouts without structuredSteps keep a null column`() {
        val dto = PlanWorkoutDto(id = "w11", scheduledDate = "2026-09-01T00:00:00.000Z", description = "Easy")
        assertNull(dto.toWorkoutEntity("g1")!!.structuredStepsJson)
    }

    @Test
    fun `merge keeps structuredSteps on both server and dirty local rows`() {
        val local = workout("w1", dirty = true, desc = "local edit")
            .copy(structuredStepsJson = """{"main":[{"reps":1,"distance":400,"pace":"I"}]}""")
        val server = workout("w2", dirty = false, desc = "server")
            .copy(structuredStepsJson = """{"steps":[{"type":"work","name":"A","durationSeconds":600}]}""")
        val merged = mergeServerWorkouts(listOf(local), listOf(server))
        assertTrue(merged.first { it.id == "w1" }.structuredStepsJson!!.contains("\"main\""))
        assertTrue(merged.first { it.id == "w2" }.structuredStepsJson!!.contains("\"steps\""))
    }

    @Test
    fun `same-id conflict keeps the dirty local row until the outbox resolves it`() {
        val local = workout("w9", dirty = true, desc = "local edit")
            .copy(structuredStepsJson = """{"main":[{"reps":1,"distance":400,"pace":"I"}]}""")
        val server = workout("w9", dirty = false, desc = "server version")
            .copy(structuredStepsJson = """{"steps":[{"type":"work","name":"A","durationSeconds":600}]}""")
        val merged = mergeServerWorkouts(listOf(local), listOf(server))
        assertEquals(1, merged.size)
        assertEquals("local edit", merged.first().description)
        assertTrue(merged.first().structuredStepsJson!!.contains("\"main\""))
    }

    // ---- workout create outbox ----

    @Test
    fun `create payload converts units and carries goal id`() {
        val w = workout("temp-1", dirty = true, desc = "Thursday 400s").copy(
            workoutType = "INTERVALS",
            phase = "BUILD",
            customName = "Thursday 400s",
            targetDistanceKm = 8.0,
            targetPaceSecPerKm = 240,
            targetDurationSec = 2400,
        )
        val payload = w.toCreateWorkoutPayload("g1")
        assertEquals("g1", payload.goalId)
        val req = payload.workout
        assertEquals("2026-09-01", req.scheduledDate)
        assertEquals("INTERVALS", req.workoutType)
        assertEquals("Thursday 400s", req.description)
        assertEquals("BUILD", req.phase)
        assertEquals("Thursday 400s", req.customName)
        assertEquals(8000.0, req.targetDistance!!, 0.001)
        assertEquals(240.0, req.targetPace!!, 0.001)
        assertEquals(2400, req.targetDuration)
        assertNull(req.structuredSteps)
        // null optional fields stay off the wire
        val encoded = Api.json.encodeToString(
            com.runflow2.app.data.net.WorkoutCreatePayload.serializer(), payload,
        )
        assertTrue(!encoded.contains("structuredSteps"))
    }

    @Test
    fun `create payload forwards structuredSteps as raw JSON`() {
        val w = workout("temp-2", dirty = true, desc = "400s").copy(
            structuredStepsJson = """{"warmup":{"distance":1000,"pace":"E"},"main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],"cooldown":{"distance":1000,"pace":"E"}}""",
        )
        val req = w.toCreateWorkoutPayload("g1").workout
        val entry = req.structuredSteps!!.jsonObject["main"]!!.jsonArray[0].jsonObject
        assertEquals("I", entry["pace"]!!.jsonPrimitive.content)
        assertEquals(90, entry["restSeconds"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun `created server workout reconciles onto the temp row`() {
        val temp = workout("temp-1", dirty = true, desc = "local edit").copy(
            sortIndex = 7,
            isCompleted = true,
            completedAt = 1000L,
            activityId = "act-1",
        )
        val server = workout("server-1", dirty = false, desc = "server echo").copy(sortIndex = 0)
        val merged = reconcileCreatedWorkout(temp, server)
        // server identity wins, dirty clears
        assertEquals("server-1", merged.id)
        assertTrue(!merged.dirty)
        assertEquals("server echo", merged.description)
        // local-only state the create response cannot know carries over
        assertEquals(7, merged.sortIndex)
        assertEquals(true, merged.isCompleted)
        assertEquals(1000L, merged.completedAt)
        assertEquals("act-1", merged.activityId)
    }

    @Test
    fun `reconciliation keeps a server-side completion that raced ahead`() {
        val temp = workout("temp-1", dirty = true, desc = "local").copy(isCompleted = false, completedAt = null)
        val server = workout("server-1", dirty = false, desc = "server").copy(isCompleted = true, completedAt = 2000L)
        val merged = reconcileCreatedWorkout(temp, server)
        assertEquals(true, merged.isCompleted)
        assertEquals(2000L, merged.completedAt)
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
