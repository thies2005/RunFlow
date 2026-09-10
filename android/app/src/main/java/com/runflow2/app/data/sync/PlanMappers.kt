package com.runflow2.app.data.sync

import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.CreatePlanRequest
import com.runflow2.app.data.net.CreateWorkoutRequest
import com.runflow2.app.data.net.ImportPlanRequest
import com.runflow2.app.data.net.ImportWorkoutRequest
import com.runflow2.app.data.net.PatchWorkoutRequest
import com.runflow2.app.data.net.PlanGoalDto
import com.runflow2.app.data.net.PlanWorkoutDto
import com.runflow2.app.data.net.WorkoutCreatePayload
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.SyncQueueEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.PlanSpec
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put

/*
 * Bridge between the server plan contract (meters, JS days 0..6, ISO dates,
 * restDays as an array) and the local Room schema (km, DayOfWeek 1..7, epoch
 * millis, restDays as CSV). Pure Kotlin so it is unit-testable on the JVM.
 */

/** Server days are 0=Sunday..6=Saturday (JS getDay); the app uses DayOfWeek 1..7. */
fun serverDayToDow(serverDay: Int?): DayOfWeek? =
    serverDay?.takeIf { it in 0..6 }?.let { DayOfWeek.of(if (it == 0) 7 else it) }

fun dowToServerDay(day: DayOfWeek): Int = day.value % 7

/**
 * Server plan dates are stored as UTC midnights ("2026-09-27T00:00:00.000Z").
 * Converting those through Instant → local zone would drift the calendar day
 * for zones behind UTC, so date-only midnights are re-anchored to local
 * midnight of the same calendar day.
 */
fun serverDateToEpochMillis(raw: String?): Long? {
    if (raw == null) return null
    val dateOnly = Regex("^(\\d{4}-\\d{2}-\\d{2})T00:00:00").find(raw)?.groupValues?.get(1)
    if (dateOnly != null) {
        return runCatching {
            LocalDate.parse(dateOnly).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        }.getOrNull()
    }
    return Api.parseInstant(raw)
}

/** Epoch millis (local midnight) → "yyyy-MM-dd", the server's date-only form. */
fun epochMillisToServerDate(millis: Long): String =
    LocalDate.ofInstant(Instant.ofEpochMilli(millis), ZoneId.systemDefault()).toString()

private fun parseWorkoutType(raw: String?): WorkoutType =
    raw?.let { runCatching { WorkoutType.valueOf(it) }.getOrNull() }
        ?: when (raw) {
            // server-only multi-sport types render as cross-training
            "BRICK", "OPEN_WATER_SWIM" -> WorkoutType.CROSS_TRAIN
            else -> WorkoutType.OTHER
        }

private fun parsePhase(raw: String?): PlanPhase = when (raw) {
    "ENDURANCE" -> PlanPhase.BASE
    "MAINTAIN" -> PlanPhase.BUILD
    "TUNE_UP" -> PlanPhase.PEAK
    "MENTAL_PREP" -> PlanPhase.TAPER
    else -> runCatching { PlanPhase.valueOf(raw ?: "") }.getOrDefault(PlanPhase.BASE)
}

fun parseRaceType(raw: String?): RaceType =
    runCatching { RaceType.valueOf(raw ?: "") }.getOrDefault(RaceType.NONE)

/**
 * displayDesc (the user-facing name) and description compose into one card
 * text. The web derives displayDesc as a prefix of description ("Intervals:
 * 5x800m" vs "Intervals: 5x800m @ 3:42/km"), so a mere "·" join would show
 * the same words twice — redundant names collapse into the fuller text.
 */
internal fun composeDescription(name: String?, desc: String?): String {
    val n = name?.trim()?.takeIf { it.isNotBlank() }
    val d = desc?.trim()?.takeIf { it.isNotBlank() }
    if (n == null) return d ?: "Workout"
    if (d == null) return n
    // Self-heal rows poisoned by the old exact-equality-only join ("n · d").
    val body = d.removePrefix("$n ·").trim()
    return when {
        body.isEmpty() || body == n -> n
        body.startsWith(n) -> body
        // Full-length names are generator-derived; a short one inside the text
        // ("Run" ⊂ "Trail Run 10k") is a coincidence, not redundancy.
        n.length >= 8 && body.contains(n) -> body
        n.contains(d) -> n
        else -> "$n · $d"
    }
}

fun PlanWorkoutDto.toWorkoutEntity(goalId: String, dirty: Boolean = false): WorkoutEntity? {
    val dateMs = serverDateToEpochMillis(scheduledDate) ?: return null
    return WorkoutEntity(
        id = id,
        goalId = goalId,
        scheduledDate = dateMs,
        workoutType = parseWorkoutType(workoutType).name,
        phase = parsePhase(phase).name,
        description = composeDescription(displayDesc ?: customName, description),
        targetDistanceKm = targetDistance?.let { it / 1000.0 },
        targetPaceSecPerKm = targetPace?.toInt(),
        targetDurationSec = targetDuration,
        customName = customName,
        targetHrZone = targetHrZone,
        targetHrMinBpm = targetHrMinBpm,
        targetHrMaxBpm = targetHrMaxBpm,
        targetPaceMinSecPerKm = targetPaceMinSecondsPerKm,
        targetPaceMaxSecPerKm = targetPaceMaxSecondsPerKm,
        structuredStepsJson = structuredSteps?.toString(),
        isCompleted = isCompleted,
        completedAt = serverDateToEpochMillis(completedAt),
        activityId = linkedActivityId,
        sortIndex = order ?: 0,
        isDemo = false,
        dirty = dirty,
    )
}

/**
 * Maps a server goal (+ workouts) into local rows. Returns null when the plan
 * is unusable (no dates at all). A missing raceDate (no-race plans) falls back
 * to the last scheduled workout.
 */
fun PlanGoalDto.toEntities(): Pair<GoalEntity, List<WorkoutEntity>>? {
    val workoutEntities = workouts.mapNotNull { it.toWorkoutEntity(id) }
    val raceDateMs = serverDateToEpochMillis(raceDate)
        ?: workoutEntities.maxOfOrNull { it.scheduledDate }
        ?: return null
    val startMs = serverDateToEpochMillis(planStartDate)
    val weeks = planWeeks ?: 12
    val weeklyKm = weeklyMileageGoal?.let { it / 1000.0 }
        ?: if (workoutEntities.isEmpty()) 0.0
        else workoutEntities.sumOf { it.targetDistanceKm ?: 0.0 } / weeks
    val goal = GoalEntity(
        id = id,
        name = name?.takeIf { it.isNotBlank() } ?: "Training plan",
        raceType = parseRaceType(raceType).name,
        raceDate = raceDateMs,
        targetTimeSec = targetTime,
        weeklyKmGoal = weeklyKm,
        planWeeks = weeks,
        runsPerWeek = runsPerWeek ?: 4,
        strengthPerWeek = strengthPerWeek ?: 0,
        longRunDay = (serverDayToDow(longRunDay) ?: DayOfWeek.SUNDAY).value,
        workoutDay = (serverDayToDow(workoutDay) ?: DayOfWeek.THURSDAY).value,
        restDays = restDays.orEmpty()
            .mapNotNull { serverDayToDow(it) }
            .toSet()
            .joinToString(",") { it.value.toString() },
        taperWeeks = taperWeeks ?: 2,
        vdotAtCreation = currentVdot,
        isActive = isActive,
        createdAt = serverDateToEpochMillis(createdAt) ?: System.currentTimeMillis(),
        completedAt = serverDateToEpochMillis(completedAt),
        customDistanceKm = customDistanceM?.let { it / 1000.0 },
        isDemo = false,
        planStartDate = startMs,
        isLocalOnly = false,
        dirty = false,
        creationMode = creationMode,
        guidanceLevel = guidanceLevel,
    )
    return goal to workoutEntities
}

/**
 * Server-wins merge for a synced plan's workouts. Rows with queued local edits
 * (dirty) survive untouched; everything else takes the server version; dirty
 * rows the server no longer has are kept until their outbox item resolves.
 */
fun mergeServerWorkouts(local: List<WorkoutEntity>, server: List<WorkoutEntity>): List<WorkoutEntity> {
    val localById = local.associateBy { it.id }
    val out = ArrayList<WorkoutEntity>(server.size + local.size)
    val seen = HashSet<String>(server.size)
    for (s in server) {
        seen += s.id
        val l = localById[s.id]
        out += if (l != null && l.dirty) l else s
    }
    local.filterTo(out) { it.id !in seen && it.dirty }
    return out
}

/** Wizard label → server calibration distance enum. */
fun calibrationDistanceFor(label: String): String? = when (label) {
    "5K" -> "5K"
    "10K" -> "10K"
    "Half Marathon" -> "HALF"
    "Marathon" -> "MARATHON"
    else -> null
}

/** Builds the POST /api/plans body (web's PlanCreateInputSchema) from a wizard spec. */
fun PlanSpec.toCreatePlanRequest(): CreatePlanRequest {
    val noRace = raceType == RaceType.NONE
    val startMonday = startDate.with(DayOfWeek.MONDAY)
    return CreatePlanRequest(
        name = name,
        sport = when {
            noRace -> "NO_RACE"
            raceType.tri -> "TRIATHLON"
            else -> "RUN"
        },
        raceType = if (noRace) null else raceType.name,
        raceDate = if (noRace) null else raceDate.toString(),
        planStartDate = startMonday.toString(),
        durationWeeks = if (noRace) {
            ((raceDate.toEpochDay() - startMonday.toEpochDay()) / 7).toInt().coerceIn(4, 52)
        } else null,
        runsPerWeek = runsPerWeek,
        strengthPerWeek = strengthPerWeek,
        weeklyMileageGoal = weeklyKm * 1000.0,
        maxLongRunKm = longRunKm,
        taperWeeks = taperWeeks,
        longRunDay = dowToServerDay(longRunDay),
        workoutDay = dowToServerDay(workoutDay),
        restDays = restDays.map { dowToServerDay(it) }.sorted(),
        targetTime = targetTimeSec,
        calibrationTime = calibrationTimeSec,
        calibrationDistance = calibrationDistance,
        customDistanceM = customDistanceKm?.let { it * 1000.0 },
        planSource = "mobile",
    )
}

/**
 * Full-state PATCH payload for a workout edit (meters, s/km, date-only).
 * structuredSteps is forwarded as raw JSON ONLY when the entity carries it;
 * the server PATCH route whitelists and persists it along with the builder
 * fields below, and the pull merge re-syncs it from the server.
 */
fun WorkoutEntity.toPatchRequest(): PatchWorkoutRequest = PatchWorkoutRequest(
    workoutType = workoutType,
    description = description,
    targetDistance = targetDistanceKm?.let { it * 1000.0 },
    targetPace = targetPaceSecPerKm?.toDouble(),
    targetDuration = targetDurationSec,
    scheduledDate = epochMillisToServerDate(scheduledDate),
    isCompleted = isCompleted,
    customName = customName,
    targetHrZone = targetHrZone,
    targetHrMinBpm = targetHrMinBpm,
    targetHrMaxBpm = targetHrMaxBpm,
    targetPaceMinSecondsPerKm = targetPaceMinSecPerKm,
    targetPaceMaxSecondsPerKm = targetPaceMaxSecPerKm,
    structuredSteps = structuredStepsJson?.let {
        runCatching { Api.json.parseToJsonElement(it) }.getOrNull()
    },
)

/**
 * Outbox payload for workout_create: the POST /api/plan-advanced/{goalId}/
 * workouts body (meters, s/km, date-only) plus the owning goal id. The route
 * demands a non-empty description; the caller guarantees one.
 */
fun WorkoutEntity.toCreateWorkoutPayload(goalId: String): WorkoutCreatePayload = WorkoutCreatePayload(
    goalId = goalId,
    workout = CreateWorkoutRequest(
        scheduledDate = epochMillisToServerDate(scheduledDate),
        workoutType = workoutType,
        description = description,
        phase = phase,
        customName = customName,
        targetDistance = targetDistanceKm?.let { it * 1000.0 },
        targetPace = targetPaceSecPerKm?.toDouble(),
        targetDuration = targetDurationSec,
        structuredSteps = structuredStepsJson?.let {
            runCatching { Api.json.parseToJsonElement(it) }.getOrNull()
        },
    ),
)

/**
 * Applies a freshly created server workout onto its local temp row after the
 * workout_create push resolves: the server row (with its real id) wins, while
 * local-only state the create response cannot know — sort position, manual
 * completion, activity link — carries over. dirty clears; completion is OR-ed
 * so a manual complete that raced the push survives.
 */
fun reconcileCreatedWorkout(local: WorkoutEntity, server: WorkoutEntity): WorkoutEntity = server.copy(
    sortIndex = local.sortIndex,
    isCompleted = local.isCompleted || server.isCompleted,
    completedAt = local.completedAt ?: server.completedAt,
    activityId = local.activityId,
    dirty = false,
)

// ---- plan upload (POST /api/plans/import) ----

/**
 * Serializes one workout for the import endpoint. The RAW web enum columns
 * win when present (the generator's BRICK/TRANSITION_PRACTICE/ENDURANCE/…
 * values that collapse at DB-write time); the collapsed domain values are
 * the fallback for rows without them. Units follow [toCreateWorkoutPayload]:
 * distance meters, pace seconds per km, duration seconds, date-only.
 */
fun WorkoutEntity.toImportWorkoutRequest(order: Int): ImportWorkoutRequest = ImportWorkoutRequest(
    localId = id,
    scheduledDate = epochMillisToServerDate(scheduledDate),
    workoutType = webWorkoutType ?: workoutType,
    phase = webPhase ?: phase,
    description = description,
    customName = customName,
    targetDistance = targetDistanceKm?.let { it * 1000.0 },
    targetDuration = targetDurationSec,
    targetPace = targetPaceSecPerKm?.toDouble(),
    targetHrZone = targetHrZone,
    targetHrMinBpm = targetHrMinBpm,
    targetHrMaxBpm = targetHrMaxBpm,
    targetPaceMinSecondsPerKm = targetPaceMinSecPerKm,
    targetPaceMaxSecondsPerKm = targetPaceMaxSecPerKm,
    structuredSteps = structuredStepsJson?.let {
        runCatching { Api.json.parseToJsonElement(it) }.getOrNull()
    },
    order = order,
)

/**
 * Serializes a device-created goal (+ its serialized workouts) for the import
 * endpoint — the same goal scalars the wizard sends to POST /api/plans, with
 * local Room units converted to the wire contract (km → meters, DayOfWeek
 * 1..7 → JS days 0..6, dates as YYYY-MM-DD).
 */
fun GoalEntity.toImportPlanRequest(workouts: List<ImportWorkoutRequest>): ImportPlanRequest {
    val race = parseRaceType(raceType)
    val noRace = race == RaceType.NONE
    return ImportPlanRequest(
        name = name,
        sport = when {
            noRace -> "RUN"
            race.tri -> "TRIATHLON"
            else -> "RUN"
        },
        raceType = if (noRace) null else race.name,
        raceDate = if (noRace) null else epochMillisToServerDate(raceDate),
        planStartDate = planStartDate?.let { epochMillisToServerDate(it) },
        targetTime = targetTimeSec,
        planWeeks = planWeeks,
        taperWeeks = taperWeeks,
        currentVdot = vdotAtCreation,
        weeklyMileageGoal = (weeklyKmGoal * 1000).roundToInt(),
        runsPerWeek = runsPerWeek,
        strengthPerWeek = strengthPerWeek,
        longRunDay = longRunDay % 7,
        workoutDay = workoutDay % 7,
        restDays = restDays.split(',').mapNotNull { it.toIntOrNull() }.map { it % 7 }.sorted(),
        creationMode = creationMode,
        workouts = workouts,
    )
}

/**
 * Pure id remap after a successful plan upload: local rows move onto the
 * server ids (goal + every workout via the idMap) while local-only state —
 * completion, activity link, sort position, structured steps, raw web enums —
 * carries over untouched. Queued outbox items survive too: workout-scoped
 * items re-point their localId onto the new workout id, goal-scoped ones onto
 * the new goal id, and goal references inside payload JSON (the goal-scoped
 * create/delete bodies) are rewritten. Everything the caller needs for ONE
 * Room transaction comes back in a [PlanRemap].
 */
data class PlanRemap(
    val goal: GoalEntity,
    val workouts: List<WorkoutEntity>,
    /** Outbox items to insert: copies of the re-pointed pending items. */
    val reQueued: List<SyncQueueEntity>,
    /** Row ids of the superseded pending items (mark them completed). */
    val consumedQueueIds: List<Long>,
)

fun remapUploadedPlan(
    goal: GoalEntity,
    workouts: List<WorkoutEntity>,
    serverGoalId: String,
    idMap: Map<String, String>,
    /** Pending outbox items per old workout id (update/create/delete). */
    workoutQueueItems: Map<String, List<SyncQueueEntity>>,
    /** Pending goal_update / goal_delete items (localId = old goal id). */
    goalQueueItems: List<SyncQueueEntity>,
): PlanRemap {
    val remappedWorkouts = workouts.map { w ->
        val serverId = idMap[w.id]
        w.copy(
            // No idMap entry means the workout was created during the upload
            // round-trip (or the server echo was incomplete) — keep the local
            // id and stay dirty so the next pull cannot prune the row; its
            // create is queued below.
            id = serverId ?: w.id,
            goalId = serverGoalId,
            dirty = serverId == null,
        )
    }
    val reQueued = mutableListOf<SyncQueueEntity>()
    val consumed = mutableListOf<Long>()
    // workouts the server has not seen yet must still reach it
    for (w in workouts) {
        if (idMap[w.id] == null) {
            reQueued += SyncQueueEntity(
                entityType = SyncManager.TYPE_WORKOUT_CREATE,
                localId = w.id,
                payloadJson = Api.json.encodeToString(
                    WorkoutCreatePayload.serializer(),
                    w.toCreateWorkoutPayload(serverGoalId),
                ),
            )
        }
    }
    for ((oldWorkoutId, items) in workoutQueueItems) {
        val newId = idMap[oldWorkoutId] ?: oldWorkoutId
        for (item in items) {
            reQueued += item.copy(id = 0, localId = newId, payloadJson = remapPayloadGoal(item.payloadJson, serverGoalId))
            consumed += item.id
        }
    }
    for (item in goalQueueItems) {
        reQueued += item.copy(id = 0, localId = serverGoalId, payloadJson = remapPayloadGoal(item.payloadJson, serverGoalId))
        consumed += item.id
    }
    return PlanRemap(
        goal = goal.copy(id = serverGoalId, isLocalOnly = false, dirty = false),
        workouts = remappedWorkouts,
        reQueued = reQueued,
        consumedQueueIds = consumed,
    )
}

/**
 * Rewrites the goalId inside goal-scoped outbox payloads (WorkoutCreatePayload
 * / WorkoutDeletePayload). Other payloads don't carry a goal id and pass
 * through unchanged; unparseable JSON also passes through — the item keeps
 * its old payload and dead-letters on drain exactly as it would have.
 */
private fun remapPayloadGoal(payloadJson: String, serverGoalId: String): String {
    val obj = runCatching { Api.json.parseToJsonElement(payloadJson).jsonObject }.getOrNull() ?: return payloadJson
    if (obj["goalId"] == null) return payloadJson
    return Api.json.encodeToString(
        kotlinx.serialization.json.JsonElement.serializer(),
        buildJsonObject {
            obj.forEach { (k, v) -> if (k != "goalId") put(k, v) }
            put("goalId", JsonPrimitive(serverGoalId))
        },
    )
}
