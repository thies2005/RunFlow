package com.runflow2.app.data.sync

import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.CreatePlanRequest
import com.runflow2.app.data.net.PatchWorkoutRequest
import com.runflow2.app.data.net.PlanGoalDto
import com.runflow2.app.data.net.PlanWorkoutDto
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.plan.PlanSpec
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

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

/** Full-state PATCH payload for a workout edit (meters, s/km, date-only). */
fun WorkoutEntity.toPatchRequest(): PatchWorkoutRequest = PatchWorkoutRequest(
    workoutType = workoutType,
    description = description,
    targetDistance = targetDistanceKm?.let { it * 1000.0 },
    targetPace = targetPaceSecPerKm?.toDouble(),
    targetDuration = targetDurationSec,
    scheduledDate = epochMillisToServerDate(scheduledDate),
    isCompleted = isCompleted,
)
