package com.runflow2.app

import com.runflow2.app.data.db.AppDatabase
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.sync.remapUploadedPlan
import com.runflow2.app.data.sync.toImportPlanRequest
import com.runflow2.app.data.sync.toImportWorkoutRequest
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

/**
 * Pins the device-plan upload path (POST /api/plans/import): payload mapping
 * with raw web enum fidelity, unit conversion to the wire contract, and the
 * pure id remap that re-points goal, workouts and queued outbox items onto
 * the server ids after a successful import.
 */
class PlanUploadTest {

    private fun localDate(date: String): Long =
        LocalDate.parse(date).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()

    private fun goal(id: String = "local-goal") = GoalEntity(
        id = id,
        name = "Berlin Marathon",
        raceType = "MARATHON",
        raceDate = localDate("2026-09-27") + 9 * 3_600_000L, // stored at 09:00 local
        targetTimeSec = 12600,
        weeklyKmGoal = 58.0,
        planWeeks = 16,
        runsPerWeek = 5,
        strengthPerWeek = 1,
        longRunDay = 7, // DayOfWeek.SUNDAY
        workoutDay = 4, // DayOfWeek.THURSDAY
        restDays = "2,5", // Tue, Fri (DayOfWeek values)
        taperWeeks = 2,
        vdotAtCreation = 47.5,
        isActive = true,
        createdAt = 1_750_000_000_000,
        planStartDate = localDate("2026-06-01"),
        isLocalOnly = true,
    )

    private fun workout(id: String, goalId: String = "local-goal") = WorkoutEntity(
        id = id,
        goalId = goalId,
        scheduledDate = localDate("2026-06-01"),
        // collapsed domain values (BRICK -> CROSS_TRAIN at DB-write time)
        workoutType = "CROSS_TRAIN",
        phase = "BUILD",
        description = "Bike 40k + run 10k",
        targetDistanceKm = null,
        targetPaceSecPerKm = null,
        targetDurationSec = null,
    )

    // ---- payload mapping: enum fidelity ----

    @Test
    fun `raw web enums are used when the columns are present`() {
        val w = workout("w1").copy(
            webWorkoutType = "BRICK",
            webPhase = "MENTAL_PREP",
        )
        val req = w.toImportWorkoutRequest(order = 3)
        assertEquals("BRICK", req.workoutType)
        assertEquals("MENTAL_PREP", req.phase)
        assertEquals("w1", req.localId)
        assertEquals(3, req.order)
    }

    @Test
    fun `collapsed values are the fallback without web columns`() {
        // server-pulled rows (already server-truth) carry no web columns
        val req = workout("w2").toImportWorkoutRequest(order = 0)
        assertEquals("CROSS_TRAIN", req.workoutType)
        assertEquals("BUILD", req.phase)
    }

    @Test
    fun `collapsed phase falls back per column`() {
        // webPhase null but webWorkoutType present: each column decides alone
        val req = workout("w3").copy(webWorkoutType = "TRANSITION_PRACTICE").toImportWorkoutRequest(0)
        assertEquals("TRANSITION_PRACTICE", req.workoutType)
        assertEquals("BUILD", req.phase)
    }

    // ---- payload mapping: units + wire contract ----

    @Test
    fun `workout payload converts units to the wire contract`() {
        val w = workout("w1").copy(
            webWorkoutType = "BRICK",
            targetDistanceKm = 50.0,
            targetPaceSecPerKm = 245,
            targetDurationSec = 6800,
            targetHrZone = 3,
            targetHrMinBpm = 140,
            targetHrMaxBpm = 155,
            targetPaceMinSecPerKm = 285.0,
            targetPaceMaxSecPerKm = 300.5,
            structuredStepsJson = """{"version":1,"steps":[{"type":"work","name":"3x1K"}]}""",
        )
        val req = w.toImportWorkoutRequest(order = 7)
        assertEquals("2026-06-01", req.scheduledDate) // date-only
        assertEquals(50000.0, req.targetDistance!!, 0.001) // km -> meters
        assertEquals(245.0, req.targetPace!!, 0.001) // s/km
        assertEquals(6800, req.targetDuration) // seconds
        assertEquals(3, req.targetHrZone)
        assertEquals(140, req.targetHrMinBpm)
        assertEquals(155, req.targetHrMaxBpm)
        assertEquals(285.0, req.targetPaceMinSecondsPerKm!!, 0.001)
        assertEquals(300.5, req.targetPaceMaxSecondsPerKm!!, 0.001)
        val steps = req.structuredSteps!!.jsonObject["steps"]!!.jsonArray
        assertEquals("3x1K", steps[0].jsonObject["name"]!!.jsonPrimitive.content)
    }

    @Test
    fun `workout payload omits unset optional fields`() {
        val encoded = Api.json.encodeToString(
            com.runflow2.app.data.net.ImportWorkoutRequest.serializer(),
            workout("w1").toImportWorkoutRequest(0),
        )
        assertTrue(!encoded.contains("targetDistance"))
        assertTrue(!encoded.contains("structuredSteps"))
        assertTrue(!encoded.contains("customName"))
        assertTrue(encoded.contains("\"localId\":\"w1\""))
        assertTrue(encoded.contains("\"order\":0"))
    }

    @Test
    fun `goal payload converts units and days to the wire contract`() {
        val req = goal().toImportPlanRequest(emptyList())
        assertEquals("Berlin Marathon", req.name)
        assertEquals("RUN", req.sport)
        assertEquals("MARATHON", req.raceType)
        assertEquals("2026-09-27", req.raceDate) // epoch millis -> date-only
        assertEquals("2026-06-01", req.planStartDate)
        assertEquals(12600, req.targetTime)
        assertEquals(58000, req.weeklyMileageGoal) // km -> meters
        assertEquals(16, req.planWeeks)
        assertEquals(47.5, req.currentVdot!!, 0.001)
        assertEquals(0, req.longRunDay) // Sunday(7) -> 0
        assertEquals(4, req.workoutDay) // Thursday(4) -> 4
        assertEquals(listOf(2, 5), req.restDays) // already server days
    }

    @Test
    fun `triathlon goal requests the triathlon sport`() {
        val req = goal().copy(raceType = "FULL_IRONMAN").toImportPlanRequest(emptyList())
        assertEquals("TRIATHLON", req.sport)
        assertEquals("FULL_IRONMAN", req.raceType)
    }

    @Test
    fun `no-race goal omits race type and date`() {
        val req = goal().copy(raceType = "NONE").toImportPlanRequest(emptyList())
        assertEquals("RUN", req.sport)
        assertNull(req.raceType)
        assertNull(req.raceDate)
    }

    @Test
    fun `goal creation mode is forwarded when present`() {
        assertNull(goal().toImportPlanRequest(emptyList()).creationMode) // server defaults to EXPERT_MANUAL
        assertEquals(
            "STANDARD_BUILDER",
            goal().copy(creationMode = "STANDARD_BUILDER").toImportPlanRequest(emptyList()).creationMode,
        )
    }

    // ---- id remap ----

    private fun queueItem(type: String, localId: String, payload: String) = SyncQueueEntity(
        entityType = type,
        localId = localId,
        payloadJson = payload,
    )

    @Test
    fun `remap moves goal and workouts onto the server ids`() {
        val workouts = listOf(
            workout("w1").copy(
                sortIndex = 4,
                isCompleted = true,
                completedAt = 999L,
                activityId = "act-1",
                structuredStepsJson = """{"steps":[]}""",
                webWorkoutType = "BRICK",
                webPhase = "MENTAL_PREP",
            ),
            workout("w2"),
        )
        val remap = remapUploadedPlan(
            goal = goal(),
            workouts = workouts,
            serverGoalId = "server-goal",
            idMap = mapOf("w1" to "sw1", "w2" to "sw2"),
            workoutQueueItems = emptyMap(),
            goalQueueItems = emptyList(),
        )
        assertEquals("server-goal", remap.goal.id)
        assertFalse(remap.goal.isLocalOnly)
        assertFalse(remap.goal.dirty)

        val w1 = remap.workouts.first { it.id == "sw1" }
        assertEquals("server-goal", w1.goalId)
        assertFalse(w1.dirty)
        // local-only state the import response cannot know carries over
        assertEquals(4, w1.sortIndex)
        assertTrue(w1.isCompleted)
        assertEquals(999L, w1.completedAt)
        assertEquals("act-1", w1.activityId)
        assertEquals("""{"steps":[]}""", w1.structuredStepsJson)
        // raw web enums survive (they are needed for a future re-upload)
        assertEquals("BRICK", w1.webWorkoutType)
        assertEquals("MENTAL_PREP", w1.webPhase)
        assertEquals("server-goal", remap.workouts.first { it.id == "sw2" }.goalId)
    }

    @Test
    fun `workout missing from the idMap keeps its local id`() {
        val remap = remapUploadedPlan(
            goal = goal(),
            workouts = listOf(workout("w1"), workout("w2")),
            serverGoalId = "server-goal",
            idMap = mapOf("w1" to "sw1"), // server echo incomplete for w2
            workoutQueueItems = emptyMap(),
            goalQueueItems = emptyList(),
        )
        assertEquals(listOf("sw1", "w2"), remap.workouts.map { it.id })
        assertTrue(remap.workouts.all { it.goalId == "server-goal" })
    }

    @Test
    fun `workout-scoped queue items re-point onto the server workout id`() {
        val items = mapOf(
            "w1" to listOf(
                queueItem("workout_update", "w1", """{"workoutType":"TEMPO","description":"edit"}"""),
                queueItem("workout_create", "w1", """{"goalId":"local-goal","workout":{"scheduledDate":"2026-06-02","workoutType":"BRICK","description":"x"}}"""),
                queueItem("workout_delete", "w1", """{"goalId":"local-goal"}"""),
            ),
        )
        val remap = remapUploadedPlan(
            goal = goal(),
            workouts = listOf(workout("w1")),
            serverGoalId = "server-goal",
            idMap = mapOf("w1" to "sw1"),
            workoutQueueItems = items,
            goalQueueItems = emptyList(),
        )
        assertEquals(3, remap.consumedQueueIds.size)
        assertEquals(listOf("sw1", "sw1", "sw1"), remap.reQueued.map { it.localId })
        // re-pointed items are fresh rows (id = 0 autogenerates)
        assertTrue(remap.reQueued.all { it.id == 0L })

        // goal references inside goal-scoped payloads are rewritten
        val create = remap.reQueued.first { it.entityType == "workout_create" }
        val createPayload = Api.json.parseToJsonElement(create.payloadJson).jsonObject
        assertEquals("server-goal", createPayload["goalId"]!!.jsonPrimitive.content)
        assertEquals("BRICK", createPayload["workout"]!!.jsonObject["workoutType"]!!.jsonPrimitive.content)
        val delete = remap.reQueued.first { it.entityType == "workout_delete" }
        assertEquals(
            "server-goal",
            Api.json.parseToJsonElement(delete.payloadJson).jsonObject["goalId"]!!.jsonPrimitive.content,
        )
        // the PATCH payload has no goal id and passes through untouched
        val patch = remap.reQueued.first { it.entityType == "workout_update" }
        assertEquals("""{"workoutType":"TEMPO","description":"edit"}""", patch.payloadJson)
    }

    @Test
    fun `goal-scoped queue items re-point onto the server goal id`() {
        val remap = remapUploadedPlan(
            goal = goal(),
            workouts = emptyList(),
            serverGoalId = "server-goal",
            idMap = emptyMap(),
            workoutQueueItems = emptyMap(),
            goalQueueItems = listOf(
                queueItem("goal_update", "local-goal", """{"isActive":false}"""),
                queueItem("goal_delete", "local-goal", "{}"),
            ),
        )
        assertEquals(listOf("server-goal", "server-goal"), remap.reQueued.map { it.localId })
        // goal_update payload has no goalId field and stays verbatim
        assertEquals("""{"isActive":false}""", remap.reQueued[0].payloadJson)
        assertEquals(2, remap.consumedQueueIds.size)
    }

    @Test
    fun `unparseable queue payload passes through unchanged`() {
        val remap = remapUploadedPlan(
            goal = goal(),
            workouts = emptyList(),
            serverGoalId = "server-goal",
            idMap = emptyMap(),
            workoutQueueItems = emptyMap(),
            goalQueueItems = listOf(queueItem("goal_update", "local-goal", "not json")),
        )
        assertEquals("not json", remap.reQueued.single().payloadJson)
    }

    // ---- migration sanity ----

    @Test
    fun `v6 to v7 migration adds the raw web enum columns`() {
        assertEquals(6, AppDatabase.MIGRATION_6_7.startVersion)
        assertEquals(7, AppDatabase.MIGRATION_6_7.endVersion)
    }
}
