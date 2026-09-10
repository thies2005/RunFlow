package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.domain.person.Personalization.PaceLetter
import com.runflow2.app.domain.person.Personalization.StructuredEditorDefaults
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.put
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Warm-up / cool-down block of the structured editor: meters + pace letter
 * (web `WarmupCooldown`, StructuredWorkoutEditor.tsx L15-18). A distance of
 * 0 means "no section" — the recorder's parser skips such steps.
 */
data class BuilderSection(val distanceM: Int, val pace: PaceLetter)

/**
 * One main-set entry "reps × distance m @ pace, rest s rest"
 * (web `MainSetStep`, StructuredWorkoutEditor.tsx L20-24).
 */
data class BuilderMainStep(
    val reps: Int,
    val distanceM: Int,
    val pace: PaceLetter,
    val restSeconds: Int,
)

/**
 * The editable structured workout — web `StructuredSteps`
 * (StructuredWorkoutEditor.tsx L27-31).
 */
data class StructuredWorkoutDraft(
    val warmup: BuilderSection,
    val main: List<BuilderMainStep>,
    val cooldown: BuilderSection,
) {
    /** Web totalDistance (L81-87): warmup + cooldown + Σ reps × distance. */
    val totalDistanceM: Int
        get() = warmup.distanceM + cooldown.distanceM + main.sumOf { it.reps * it.distanceM }
}

/** Web-style total label (L177): "4.2 km" above 1 km, plain meters below. */
fun formatTotalDistance(meters: Int): String =
    if (meters >= 1000) String.format(java.util.Locale.ENGLISH, "%.1f km", meters / 1000.0)
    else "$meters m"

/**
 * Pure decode/encode bridge for the structured interval editor:
 *  (a) decodes a workout's existing structuredStepsJson into an editable
 *      [StructuredWorkoutDraft] — the nested builder shape directly, the
 *      generator flat shape via lossless conversion (see [decode]);
 *  (b) builds the nested builder JSON for saving;
 *  (c) totals distance via [StructuredWorkoutDraft.totalDistanceM].
 *
 * Mirrors Web's StructuredWorkoutEditor.tsx; unit-testable, no Android deps.
 */
object StructuredWorkoutBuilder {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    val PACE_LETTERS: List<PaceLetter> = listOf(
        PaceLetter.E, PaceLetter.M, PaceLetter.T, PaceLetter.I, PaceLetter.R,
    )

    /** Neutral letter→sec/km table (VDOT 50) when no athlete table is supplied. */
    fun defaultPaceTableSecPerKm(): Map<PaceLetter, Int> {
        val paces = Personalization.trainingPaces(50.0)
        return PACE_LETTERS.associateWith { paces.target(it) }
    }

    // ------------------------------------------------------------------
    // (a) decode
    // ------------------------------------------------------------------

    /**
     * Decodes structuredStepsJson into an editable draft, or returns null when
     * the payload is missing/malformed/ambiguous — the caller then prefills
     * [Personalization.structuredEditorDefaults]. The nested builder shape
     * ({"warmup":…,"main":[…],"cooldown":…}) is decoded directly; the
     * generator flat shape ({"version":1,"steps":[…]}) is converted by
     * [flatToNested].
     */
    fun decode(
        raw: String?,
        paceTableSecPerKm: Map<PaceLetter, Int> = defaultPaceTableSecPerKm(),
    ): StructuredWorkoutDraft? {
        if (raw.isNullOrBlank()) return null
        val root = runCatching { json.parseToJsonElement(raw) }.getOrNull() as? JsonObject
            ?: return null
        if (root.containsKey("main")) return decodeNested(root)
        (root["steps"] as? JsonArray)?.let { return flatToNested(it, paceTableSecPerKm) }
        return null
    }

    private fun decodeNested(root: JsonObject): StructuredWorkoutDraft? {
        val mainArr = root["main"] as? JsonArray ?: return null
        val main = mainArr.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            val reps = (o.int("reps") ?: 1).coerceIn(1, 100)
            val distance = o.double("distance")?.takeIf { it >= 0 } ?: return@mapNotNull null
            val pace = o.string("pace").toPaceLetter() ?: return@mapNotNull null
            val rest = (o.double("restSeconds") ?: 0.0).takeIf { it >= 0 } ?: 0.0
            BuilderMainStep(reps, distance.roundToInt(), pace, rest.roundToInt())
        }
        if (main.isEmpty()) return null
        return StructuredWorkoutDraft(
            warmup = decodeSection(root["warmup"]) ?: BuilderSection(0, PaceLetter.E),
            main = main,
            cooldown = decodeSection(root["cooldown"]) ?: BuilderSection(0, PaceLetter.E),
        )
    }

    private fun decodeSection(el: JsonElement?): BuilderSection? {
        val o = el as? JsonObject ?: return null
        val distance = o.double("distance")?.takeIf { it >= 0 } ?: return null
        return BuilderSection(distance.roundToInt(), o.string("pace").toPaceLetter() ?: PaceLetter.E)
    }

    /**
     * Generator flat shape → editable nested draft. Lossless wherever the
     * nested shape can re-express the flat steps through
     * [StructuredStepsParser.parseNested]; anything else returns null so the
     * caller falls back to defaults:
     *  - "warmup"/"cooldown" steps must be distance-based; their meters sum
     *    into the section and the letter is the nearest table letter to the
     *    LAST step's paceSecondsPerKm (E when absent — generator warmups are
     *    hrZone 1);
     *  - "work"/"steady" steps must be distance-based (fartlek's time-based
     *    works are NOT expressible → null); a following time-based
     *    "recovery" becomes the rep's restSeconds;
     *  - consecutive works with identical (distance, letter, rest) collapse
     *    into one entry with reps = N;
     *  - ambiguous → null: distance-based recovery jogs (nested rest is
     *    seconds-only), rest before the first work, trailing rest after the
     *    last work, rest between works that land in different entries, or no
     *    usable work at all.
     */
    private fun flatToNested(
        steps: JsonArray,
        table: Map<PaceLetter, Int>,
    ): StructuredWorkoutDraft? {
        var warmupM = 0
        var warmupPace: PaceLetter? = null
        var cooldownM = 0
        var cooldownPace: PaceLetter? = null
        val works = ArrayList<Pair<Int, PaceLetter>>() // distance, letter
        val restAfter = ArrayList<Int>() // rest seconds following each work

        for (el in steps) {
            val o = el as? JsonObject ?: continue
            val dist = o.double("distanceMeters")?.takeIf { it > 0 }
            val dur = o.double("durationSeconds")?.takeIf { it > 0 }
            when (o.string("type")) {
                "warmup", "cooldown" -> {
                    val d = dist ?: return null // time-based section: not expressible
                    val letter = o.double("paceSecondsPerKm")
                        ?.takeIf { it > 0 }
                        ?.nearestLetter(table)
                    if (o.string("type") == "warmup") {
                        warmupM += d.roundToInt()
                        warmupPace = letter ?: warmupPace
                    } else {
                        cooldownM += d.roundToInt()
                        cooldownPace = letter ?: cooldownPace
                    }
                }
                "work", "steady" -> {
                    val d = dist ?: return null // fartlek-style timed work: not expressible
                    val letter = o.double("paceSecondsPerKm")
                        ?.takeIf { it > 0 }
                        ?.nearestLetter(table)
                        ?: PaceLetter.I // nested entries need a letter; quality default
                    works += d.roundToInt() to letter
                    restAfter += 0
                }
                "recovery" -> {
                    if (works.isEmpty()) return null // rest before the first rep
                    when {
                        dur != null -> restAfter[works.lastIndex] = dur.roundToInt()
                        dist != null -> return null // recovery jog: nested rest is seconds-only
                        else -> restAfter[works.lastIndex] = 0
                    }
                }
                else -> return null // unknown step type: refuse rather than drop it
            }
        }
        if (works.isEmpty()) return null
        if (restAfter.last() > 0) return null // trailing rest is dropped by the parser

        // restAfter[i] is the rest between work i and i+1 (or trailing, which
        // was already rejected). An entry's uniform restSeconds covers the
        // boundaries INSIDE it, so work i joins the entry iff it matches the
        // entry's work and the boundary before it equals the entry's rest.
        val main = ArrayList<BuilderMainStep>()
        for (i in works.indices) {
            val (d, letter) = works[i]
            val rest = restAfter[i]
            val restBefore = if (i == 0) 0 else restAfter[i - 1]
            val last = main.lastOrNull()
            if (last != null && last.distanceM == d && last.pace == letter && restBefore == last.restSeconds) {
                main[main.lastIndex] = last.copy(reps = last.reps + 1)
            } else {
                // rest sitting between two different entries is inexpressible
                if (i > 0 && restBefore > 0) return null
                main += BuilderMainStep(1, d, letter, rest)
            }
        }
        return StructuredWorkoutDraft(
            warmup = BuilderSection(warmupM, warmupPace ?: PaceLetter.E),
            main = main,
            cooldown = BuilderSection(cooldownM, cooldownPace ?: PaceLetter.E),
        )
    }

    /** Closest table letter to a sec/km pace; ties resolve in E,M,T,I,R order. */
    private fun Double.nearestLetter(table: Map<PaceLetter, Int>): PaceLetter =
        PACE_LETTERS.minByOrNull { abs((table[it] ?: 0) - this) } ?: PaceLetter.E

    private fun String?.toPaceLetter(): PaceLetter? =
        this?.let { raw -> PACE_LETTERS.firstOrNull { it.name == raw } }

    // ------------------------------------------------------------------
    // (b) encode
    // ------------------------------------------------------------------

    /**
     * Nested builder JSON — the exact shape StructuredStepsParser's nested
     * branch reads and the web builder saves:
     * {"warmup":{"distance":1000,"pace":"E"},
     *  "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
     *  "cooldown":{"distance":1000,"pace":"E"}}
     */
    fun encode(draft: StructuredWorkoutDraft): JsonObject = buildJsonObject {
        put("warmup", sectionJson(draft.warmup))
        put(
            "main",
            JsonArray(draft.main.map { step ->
                buildJsonObject {
                    put("reps", step.reps)
                    put("distance", step.distanceM)
                    put("pace", step.pace.name)
                    put("restSeconds", step.restSeconds)
                }
            }),
        )
        put("cooldown", sectionJson(draft.cooldown))
    }

    private fun sectionJson(section: BuilderSection): JsonObject = buildJsonObject {
        put("distance", section.distanceM)
        put("pace", section.pace.name)
    }

    fun encodeToString(draft: StructuredWorkoutDraft): String = encode(draft).toString()

    // ---- json accessors (mirrors StructuredStepsParser's private set) ----

    private fun JsonObject.string(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

    private fun JsonObject.double(key: String): Double? =
        (this[key] as? JsonPrimitive)?.doubleOrNull

    private fun JsonObject.int(key: String): Int? =
        (this[key] as? JsonPrimitive)?.intOrNull
}

/** Editor prefill: [StructuredEditorDefaults] as an editable draft. */
fun StructuredEditorDefaults.toDraft(): StructuredWorkoutDraft = StructuredWorkoutDraft(
    warmup = BuilderSection(warmupDistanceM, warmupPace),
    main = listOf(BuilderMainStep(mainReps, mainDistanceM, mainPace, restSeconds)),
    cooldown = BuilderSection(cooldownDistanceM, cooldownPace),
)
