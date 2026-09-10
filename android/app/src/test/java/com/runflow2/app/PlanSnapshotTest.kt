package com.runflow2.app

import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.sync.parseSnapshotJson
import com.runflow2.app.data.sync.restoreDiff
import com.runflow2.app.data.sync.toEntity
import com.runflow2.app.data.sync.toSnapshotJson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId

/**
 * Pins the local-undo snapshot bridge (web: src/lib/plan/snapshot.ts) —
 * JSON round-trip fidelity and the pure restore diff that drives
 * RunFlowRepository.undoLastEdit.
 */
class PlanSnapshotTest {

    private fun workout(
        id: String,
        desc: String = "Easy run",
        date: String = "2026-09-01",
        dirty: Boolean = false,
        completed: Boolean = false,
    ) = WorkoutEntity(
        id = id,
        goalId = "g1",
        scheduledDate = LocalDate.parse(date)
            .atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli(),
        workoutType = "EASY",
        phase = "BASE",
        description = desc,
        targetDistanceKm = 10.0,
        targetPaceSecPerKm = 300,
        targetDurationSec = null,
        isCompleted = completed,
        dirty = dirty,
    )

    // ---- JSON round-trip ----

    
/** Non-null convenience for valid payloads; corrupt-JSON tests use parseSnapshotJson directly. */
private fun parseOk(json: String) = parseSnapshotJson(json)!!

@Test
    fun `snapshot json round-trips every workout field`() {
        val rows = listOf(
            workout("w1", desc = "Long Run").copy(
                customName = "Sunday Long Run",
                targetHrZone = 2,
                targetHrMinBpm = 140,
                targetHrMaxBpm = 155,
                targetPaceMinSecPerKm = 285.0,
                targetPaceMaxSecPerKm = 300.5,
                structuredStepsJson = """{"main":[{"reps":4,"distance":400,"pace":"I"}]}""",
                isCompleted = true,
                completedAt = 1234L,
                activityId = "act-1",
                sortIndex = 7,
                isDemo = true,
            ),
            workout("w2", desc = "Bare"), // defaults-heavy row
        )
        val parsed = parseOk(rows.toSnapshotJson())
        assertEquals(rows, parsed.map { it.toEntity() })
    }

    @Test
    fun `empty goal snapshots to an empty array`() {
        assertEquals(0, parseOk(emptyList<WorkoutEntity>().toSnapshotJson()).size)
    }

    @Test
    fun `unreadable snapshot json degrades to empty instead of crashing`() {
        assertNull(parseSnapshotJson("not json [{{"))
    }

    // ---- restore diff ----

    @Test
    fun `identical rows produce an empty restore plan`() {
        val rows = listOf(workout("w1"), workout("w2"))
        val snapshot = parseOk(rows.toSnapshotJson())
        val plan = restoreDiff(rows, snapshot)
        assertTrue(plan.isEmpty)
    }

    @Test
    fun `a dirty flag alone is not a change`() {
        // dirty is transient outbox state, not workout content
        val snapshot = listOf(workout("w1")).toSnapshotJson().let(::parseOk)
        val plan = restoreDiff(listOf(workout("w1", dirty = true)), snapshot)
        assertTrue(plan.isEmpty)
    }

    @Test
    fun `changed rows land in updates with the snapshot state`() {
        val snapshot = listOf(
            workout("w1", desc = "original", date = "2026-09-01"),
            workout("w2", desc = "untouched"),
        ).toSnapshotJson().let(::parseOk)
        val current = listOf(
            workout("w1", desc = "edited", date = "2026-09-03", completed = true),
            workout("w2", desc = "untouched"),
        )
        val plan = restoreDiff(current, snapshot)
        assertTrue(plan.reinstates.isEmpty())
        assertTrue(plan.removals.isEmpty())
        assertEquals(listOf("w1"), plan.updates.map { it.id })
        assertEquals("original", plan.updates.single().description)
        assertEquals(
            LocalDate.parse("2026-09-01").atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli(),
            plan.updates.single().scheduledDate,
        )
    }

    @Test
    fun `rows created since the snapshot land in removals`() {
        val snapshot = listOf(workout("w1")).toSnapshotJson().let(::parseOk)
        val current = listOf(workout("w1"), workout("temp-9", desc = "added later"))
        val plan = restoreDiff(current, snapshot)
        assertTrue(plan.updates.isEmpty())
        assertTrue(plan.reinstates.isEmpty())
        assertEquals(listOf("temp-9"), plan.removals.map { it.id })
    }

    @Test
    fun `rows deleted since the snapshot land in reinstates`() {
        val snapshot = listOf(workout("w1"), workout("w2", desc = "gone soon"))
            .toSnapshotJson().let(::parseOk)
        val plan = restoreDiff(listOf(workout("w1")), snapshot)
        assertTrue(plan.updates.isEmpty())
        assertTrue(plan.removals.isEmpty())
        assertEquals(listOf("w2"), plan.reinstates.map { it.id })
        assertEquals("gone soon", plan.reinstates.single().description)
    }

    @Test
    fun `mixed edits split all three ways`() {
        val snapshot = listOf(
            workout("w1", desc = "original"),
            workout("w2", desc = "deleted since"),
            workout("w3", desc = "unchanged"),
        ).toSnapshotJson().let(::parseOk)
        val current = listOf(
            workout("w1", desc = "edited"),
            workout("w3", desc = "unchanged"),
            workout("w4", desc = "created since"),
        )
        val plan = restoreDiff(current, snapshot)
        assertEquals(listOf("w1"), plan.updates.map { it.id })
        assertEquals(listOf("w2"), plan.reinstates.map { it.id })
        assertEquals(listOf("w4"), plan.removals.map { it.id })
    }
}
