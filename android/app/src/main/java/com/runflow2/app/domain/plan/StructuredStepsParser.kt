package com.runflow2.app.domain.plan

import com.runflow2.app.core.math.TrainingPaces
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.math.WorkoutPaceTarget
import com.runflow2.app.domain.model.PaceZone
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
 * the recording engine consumes. Two server shapes are supported:
 *
 *  - Generator flat shape: `{"version":1,"source":"generated-plan","steps":[
 *      {"type":"warmup"|"work"|"recovery"|"cooldown"|"steady","name":"…",
 *       "distanceMeters":2000,"durationSeconds":600,"paceSecondsPerKm":300}]}`
 *  - Builder nested shape: `{"warmup":{"distance":1000,"pace":"E"},
 *      "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
 *      "cooldown":{"distance":1000,"pace":"E"}}`
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
        val root = element.asObjectOrNull() ?: return emptyList()
        root["steps"]?.let { stepsEl ->
            val arr = stepsEl as? JsonArray ?: return emptyList()
            return arr.mapNotNull { it.asObjectOrNull()?.let { o -> parseFlatStep(o) } }
        }
        if (root.containsKey("main")) return parseNested(root, paceTable)
        return emptyList()
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

/** E/M/T/I/R letter → sec/km for a VDOT, from the Daniels training-pace table. */
fun paceLetterTable(vdot: Double): Map<String, Double> {
    val paces = TrainingPaces(vdot)
    return mapOf(
        "E" to paces.paceSecPerKm(WorkoutPaceTarget.EASY),
        "M" to paces.paceSecPerKm(WorkoutPaceTarget.MARATHON),
        "T" to paces.paceSecPerKm(WorkoutPaceTarget.THRESHOLD),
        "I" to paces.paceSecPerKm(WorkoutPaceTarget.INTERVAL),
        "R" to paces.paceSecPerKm(WorkoutPaceTarget.REPETITION),
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
