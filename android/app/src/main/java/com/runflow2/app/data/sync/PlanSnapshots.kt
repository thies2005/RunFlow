package com.runflow2.app.data.sync

import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.net.Api
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer

/**
 * Local undo for plan edits (web: src/lib/plan/snapshot.ts). A snapshot is a
 * JSON array of the goal's workouts captured before every plan mutation;
 * restore diffs the snapshot against the live rows so only touched rows are
 * rewritten (and, for synced plans, re-pushed through the outbox). Pure
 * Kotlin so the diff is unit-testable on the JVM.
 */

/** Web parity: at most 50 snapshots are kept per goal (oldest pruned). */
const val MAX_PLAN_SNAPSHOTS_PER_GOAL = 50

/**
 * Mirrors every content field of [WorkoutEntity]. Sync metadata (dirty) is
 * deliberately excluded: it is transient outbox state, decided anew by the
 * restore pass, not workout content.
 */
@Serializable
data class WorkoutSnapshotDto(
    val id: String,
    val goalId: String,
    val scheduledDate: Long,
    val workoutType: String,
    val phase: String,
    val description: String,
    val targetDistanceKm: Double? = null,
    val targetPaceSecPerKm: Int? = null,
    val targetDurationSec: Int? = null,
    val isCompleted: Boolean = false,
    val completedAt: Long? = null,
    val activityId: String? = null,
    val sortIndex: Int = 0,
    val isDemo: Boolean = false,
    val structuredStepsJson: String? = null,
    val customName: String? = null,
    val targetHrZone: Int? = null,
    val targetHrMinBpm: Int? = null,
    val targetHrMaxBpm: Int? = null,
    val targetPaceMinSecPerKm: Double? = null,
    val targetPaceMaxSecPerKm: Double? = null,
)

fun WorkoutEntity.toSnapshotDto(): WorkoutSnapshotDto = WorkoutSnapshotDto(
    id = id,
    goalId = goalId,
    scheduledDate = scheduledDate,
    workoutType = workoutType,
    phase = phase,
    description = description,
    targetDistanceKm = targetDistanceKm,
    targetPaceSecPerKm = targetPaceSecPerKm,
    targetDurationSec = targetDurationSec,
    isCompleted = isCompleted,
    completedAt = completedAt,
    activityId = activityId,
    sortIndex = sortIndex,
    isDemo = isDemo,
    structuredStepsJson = structuredStepsJson,
    customName = customName,
    targetHrZone = targetHrZone,
    targetHrMinBpm = targetHrMinBpm,
    targetHrMaxBpm = targetHrMaxBpm,
    targetPaceMinSecPerKm = targetPaceMinSecPerKm,
    targetPaceMaxSecPerKm = targetPaceMaxSecPerKm,
)

fun WorkoutSnapshotDto.toEntity(dirty: Boolean = false): WorkoutEntity = WorkoutEntity(
    id = id,
    goalId = goalId,
    scheduledDate = scheduledDate,
    workoutType = workoutType,
    phase = phase,
    description = description,
    targetDistanceKm = targetDistanceKm,
    targetPaceSecPerKm = targetPaceSecPerKm,
    targetDurationSec = targetDurationSec,
    isCompleted = isCompleted,
    completedAt = completedAt,
    activityId = activityId,
    sortIndex = sortIndex,
    isDemo = isDemo,
    dirty = dirty,
    structuredStepsJson = structuredStepsJson,
    customName = customName,
    targetHrZone = targetHrZone,
    targetHrMinBpm = targetHrMinBpm,
    targetHrMaxBpm = targetHrMaxBpm,
    targetPaceMinSecPerKm = targetPaceMinSecPerKm,
    targetPaceMaxSecPerKm = targetPaceMaxSecPerKm,
)

fun List<WorkoutEntity>.toSnapshotJson(): String =
    Api.json.encodeToString(ListSerializer(WorkoutSnapshotDto.serializer()), map { it.toSnapshotDto() })

/** null when the payload is unreadable (caller must not mass-apply an empty diff). */
fun parseSnapshotJson(json: String): List<WorkoutSnapshotDto>? =
    runCatching {
        Api.json.decodeFromString(ListSerializer(WorkoutSnapshotDto.serializer()), json)
    }.getOrNull()

/** What a restore has to do to roll the goal's workouts back to the snapshot. */
data class RestorePlan(
    /** In snapshot and DB, content drifted → rewrite the row from the snapshot. */
    val updates: List<WorkoutSnapshotDto>,
    /** In snapshot, missing from DB (deleted since) → bring back. */
    val reinstates: List<WorkoutSnapshotDto>,
    /** In DB, not in the snapshot (created since) → delete. */
    val removals: List<WorkoutEntity>,
) {
    val isEmpty: Boolean get() = updates.isEmpty() && reinstates.isEmpty() && removals.isEmpty()
}

/**
 * Diffs live rows against a snapshot by id. Content comparison runs through
 * [toSnapshotDto] so transient sync flags (dirty) never count as a change.
 */
fun restoreDiff(current: List<WorkoutEntity>, snapshot: List<WorkoutSnapshotDto>): RestorePlan {
    val currentById = current.associateBy { it.id }
    val snapshotIds = snapshot.mapTo(HashSet(snapshot.size)) { it.id }
    val updates = ArrayList<WorkoutSnapshotDto>()
    val reinstates = ArrayList<WorkoutSnapshotDto>()
    for (s in snapshot) {
        val c = currentById[s.id]
        when {
            c == null -> reinstates += s
            c.toSnapshotDto() != s -> updates += s
        }
    }
    return RestorePlan(
        updates = updates,
        reinstates = reinstates,
        removals = current.filter { it.id !in snapshotIds },
    )
}
