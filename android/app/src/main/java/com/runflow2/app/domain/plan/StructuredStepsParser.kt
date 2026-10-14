package com.runflow2.app.domain.plan

import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.domain.model.PaceZone
import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.domain.plan.structured.Duration
import com.runflow2.app.domain.plan.structured.FlattenedPlayerStep
import com.runflow2.app.domain.plan.structured.StructuredWorkoutV2
import com.runflow2.app.domain.plan.structured.Target
import com.runflow2.app.domain.plan.structured.flattenStructuredWorkout
import com.runflow2.app.recording.StepDurationType
import com.runflow2.app.recording.StepRuntime
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import java.util.Locale

/**
 * Parses the server's structuredSteps JSON into the flat [StepRuntime] list
 * the recording engine consumes. Supports canonical v2 as well as legacy shapes:
 *  - Canonical v2: `{"version":2,"source":"engine","steps":[...]}`
 *  - Generator flat shape: `{"version":1,"source":"generated-plan","steps":[...]}`
 *  - Builder nested shape: `{"warmup":{...},"main":[...],"cooldown":{...}}`
 *
 * Pace letters (E/M/T/I/R) are resolved through an injected table so this
 * parser stays pure; callers build the table from the athlete's VDOT via
 * [paceLetterTable]. Malformed input never throws — it yields an empty list
 * and the recorder falls back to the plain target steps.
 */
object StructuredStepsParser {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    fun parse(raw: String?, paceTable: Map<String, Double>): List<StepRuntime> {
        if (raw.isNullOrBlank()) return emptyList()
        val element = runCatching { json.parseToJsonElement(raw) }.getOrNull() ?: return emptyList()
        return parse(element, paceTable)
    }

    fun parse(element: JsonElement?, paceTable: Map<String, Double>): List<StepRuntime> {
        if (element == null) return emptyList()
        // If it's a raw array, treat as steps list
        if (element is JsonArray) {
            val v2 = runCatching {
                json.decodeFromJsonElement(
                    StructuredWorkoutV2.serializer(),
                    JsonObject(mapOf("version" to JsonPrimitive(2), "steps" to element)),
                )
            }.getOrNull()
            if (v2 != null && v2.steps.isNotEmpty()) {
                return flattenStructuredWorkout(v2).map { playerStepToRuntime(it, paceTable) }
            }
            return element.mapNotNull { it.asObjectOrNull()?.let { o -> parseFlatStep(o) } }
        }

        val root = element.asObjectOrNull() ?: return emptyList()

        // 1. Check for canonical v2
        val version = root.int("version")
        if (version == 2) {
            val v2 = runCatching { json.decodeFromJsonElement(StructuredWorkoutV2.serializer(), root) }.getOrNull()
            if (v2 != null && v2.steps.isNotEmpty()) {
                return flattenStructuredWorkout(v2).map { playerStepToRuntime(it, paceTable) }
            }
        }

        // 2. Check for steps array (could be v2 or v1)
        root["steps"]?.let { stepsEl ->
            val arr = stepsEl as? JsonArray ?: return emptyList()
            // Try v2 decoding first if elements have "kind"
            val firstObj = arr.firstOrNull()?.asObjectOrNull()
            if (firstObj != null && (firstObj.containsKey("kind") || firstObj.containsKey("duration"))) {
                val v2 = runCatching { json.decodeFromJsonElement(StructuredWorkoutV2.serializer(), root) }.getOrNull()
                if (v2 != null && v2.steps.isNotEmpty()) {
                    return flattenStructuredWorkout(v2).map { playerStepToRuntime(it, paceTable) }
                }
            }
            return arr.mapNotNull { it.asObjectOrNull()?.let { o -> parseFlatStep(o) } }
        }

        // 3. Builder nested shape
        if (root.containsKey("main")) return parseNested(root, paceTable)
        return emptyList()
    }

    private fun playerStepToRuntime(step: FlattenedPlayerStep, paceTable: Map<String, Double>): StepRuntime {
        val durationType = when (step.duration) {
            is Duration.Time -> StepDurationType.TIME
            is Duration.Distance -> StepDurationType.DISTANCE
            is Duration.LapPress -> StepDurationType.LAP_PRESS
        }
        val durSec = when (step.duration) {
            is Duration.Time -> step.duration.seconds.toDouble()
            else -> 0.0
        }
        val distM = when (step.duration) {
            is Duration.Distance -> step.duration.meters
            else -> 0.0
        }
        var targetPace: Double? = null
        var targetMinPace: Double? = null
        var targetMaxPace: Double? = null
        var targetPower: Int? = null
        var targetMinPower: Int? = null
        var targetMaxPower: Int? = null

        when (val t = step.target) {
            is Target.Pace -> {
                targetMinPace = t.min
                targetMaxPace = t.max
                targetPace = t.min ?: t.max
                if (targetPace == null && t.zoneLabel != null) {
                    targetPace = paceTable[t.zoneLabel]
                }
            }
            is Target.Power -> {
                targetMinPower = t.minWatts
                targetMaxPower = t.maxWatts
                targetPower = t.minWatts ?: t.maxWatts
            }
            else -> {}
        }

        val baseLabel = step.label ?: step.kind.replaceFirstChar { it.uppercase(Locale.ENGLISH) }
        val label = if (step.totalIterations != null && step.totalIterations > 1 && step.repeatIteration != null && !step.isSetRest) {
            "$baseLabel (${step.repeatIteration}/${step.totalIterations})"
        } else {
            baseLabel
        }

        return StepRuntime(
            label = label,
            kind = step.kind,
            durationType = durationType,
            durationSec = durSec,
            distanceM = distM,
            targetPaceSecPerKm = targetPace,
            target = step.target,
            targetPaceMinSecPerKm = targetMinPace,
            targetPaceMaxSecPerKm = targetMaxPace,
            isSwim = (step.target as? Target.Pace)?.unit == "sec_per_100m",
            note = step.note,
            hrZone = step.hrZone ?: (step.target as? Target.Hr)?.zone,
            targetPowerWatts = targetPower,
            targetPowerMinWatts = targetMinPower,
            targetPowerMaxWatts = targetMaxPower,
        )
    }

    // ---- generator flat shape ----

    private fun parseFlatStep(obj: JsonObject): StepRuntime? {
        val kind = when (obj.string("type")) {
            "warmup" -> "warmup"
            "work", "steady" -> "main"
            "recovery" -> "recovery"
            "cooldown" -> "cooldown"
            else -> return null
        }
        val label = obj.string("name")?.takeIf { it.isNotBlank() } ?: kind.replaceFirstChar { it.uppercase(Locale.ENGLISH) }
        val distance = obj.double("distanceMeters")
        val duration = obj.double("durationSeconds")
        val pace = obj.double("paceSecondsPerKm")?.takeIf { it > 0 }
        return when {
            distance != null && distance > 0 ->
                StepRuntime(label, kind, StepDurationType.DISTANCE, 0.0, distance, pace)
            duration != null && duration > 0 ->
                StepRuntime(label, kind, StepDurationType.TIME, duration, 0.0, pace)
            else -> null
        }
    }

    // ---- builder nested shape ----

    private fun parseNested(root: JsonObject, paceTable: Map<String, Double>): List<StepRuntime> {
        val steps = ArrayList<StepRuntime>()
        root["warmup"]?.asObjectOrNull()?.let { warmupCooldownStep(it, "Warm-up", paceTable)?.let { steps += it } }
        (root["main"] as? JsonArray)?.forEach { entryEl ->
            val entry = entryEl.asObjectOrNull() ?: return@forEach
            val reps = (entry.int("reps") ?: 1).coerceIn(1, 100)
            val distance = entry.double("distance")?.takeIf { it > 0 } ?: return@forEach
            val paceLetter = entry.string("pace")
            val rest = entry.double("restSeconds") ?: 0.0
            for (rep in 1..reps) {
                steps += StepRuntime(
                    label = repLabel(distance, paceLetter, rep, reps),
                    kind = "main",
                    durationType = StepDurationType.DISTANCE,
                    durationSec = 0.0,
                    distanceM = distance,
                    targetPaceSecPerKm = paceLetter?.let { paceTable[it] },
                )
                // no trailing recovery after the last rep of an entry
                if (rep < reps && rest > 0) {
                    steps += StepRuntime(
                        label = "${rest.toInt()} s rest",
                        kind = "recovery",
                        durationType = StepDurationType.TIME,
                        durationSec = rest,
                        distanceM = 0.0,
                        targetPaceSecPerKm = null,
                    )
                }
            }
        }
        root["cooldown"]?.asObjectOrNull()?.let { warmupCooldownStep(it, "Cool-down", paceTable)?.let { steps += it } }
        return steps
    }

    private fun warmupCooldownStep(obj: JsonObject, name: String, paceTable: Map<String, Double>): StepRuntime? {
        val distance = obj.double("distance")?.takeIf { it > 0 } ?: return null
        val paceLetter = obj.string("pace")
        val label = formatDistance(distance) + (paceLetter?.let { " $it" } ?: "")
        return StepRuntime(
            label = "$name $label",
            kind = if (name == "Warm-up") "warmup" else "cooldown",
            durationType = StepDurationType.DISTANCE,
            durationSec = 0.0,
            distanceM = distance,
            targetPaceSecPerKm = paceLetter?.let { paceTable[it] },
        )
    }

    // ---- label helpers ----

    private fun repLabel(distanceM: Double, paceLetter: String?, rep: Int, reps: Int): String {
        val base = formatDistance(distanceM) + (paceLetter?.let { " $it" } ?: "")
        return if (reps > 1) "$base ($rep/$reps)" else base
    }

    /** "400 m" / "1.0 km" — meters below a km, one-decimal km above. */
    private fun formatDistance(distanceM: Double): String =
        if (distanceM >= 999.5) String.format(Locale.ENGLISH, "%.1f km", distanceM / 1000.0)
        else "${distanceM.toInt()} m"

    // ---- json accessors ----

    /** Objects pass through; strings get a second parse (defensive double-encoded servers). */
    private fun JsonElement?.asObjectOrNull(): JsonObject? = when (this) {
        is JsonObject -> this
        is JsonPrimitive -> runCatching { json.parseToJsonElement(content) }.getOrNull() as? JsonObject
        else -> null
    }

    private fun JsonObject.string(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

    private fun JsonObject.double(key: String): Double? =
        (this[key] as? JsonPrimitive)?.doubleOrNull

    private fun JsonObject.int(key: String): Int? =
        (this[key] as? JsonPrimitive)?.intOrNull
}

/**
 * E/M/T/I/R letter → sec/km for a VDOT. Single source of truth is the
 * web-parity table in [Personalization], so the paces the structured editor
 * shows and the voice coach enforces mid-run always agree.
 */
fun paceLetterTable(vdot: Double): Map<String, Double> {
    val paces = Personalization.trainingPaces(vdot)
    return mapOf(
        "E" to paces.target(Personalization.PaceLetter.E).toDouble(),
        "M" to paces.target(Personalization.PaceLetter.M).toDouble(),
        "T" to paces.target(Personalization.PaceLetter.T).toDouble(),
        "I" to paces.target(Personalization.PaceLetter.I).toDouble(),
        "R" to paces.target(Personalization.PaceLetter.R).toDouble(),
    )
}

/** Inverts the Daniels threshold band (mid ≈ 87% VO2max) into a VDOT estimate. */
fun vdotFromThresholdPaceSecPerKm(paceSecPerKm: Double): Double? {
    if (paceSecPerKm <= 0.0) return null
    val speed = 60_000.0 / paceSecPerKm // m/min
    val vo2 = VdotMath.vo2ForSpeed(speed)
    if (vo2 <= 0.0) return null
    val thresholdMid = PaceZone.THRESHOLD.vo2FractionRange.let { (it.start + it.endInclusive) / 2.0 }
    return vo2 / thresholdMid
}
