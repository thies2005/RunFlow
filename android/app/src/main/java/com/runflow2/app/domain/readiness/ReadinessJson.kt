package com.runflow2.app.domain.readiness

import java.time.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull

/*
 * kotlinx-serialization of the daily-readiness record the server expects on
 * POST /api/mobile/v1/readiness/daily. Keys mirror the generated Flutter
 * models (flutter/lib/data/models/readiness/readiness_models.g.dart at
 * commit a4616887): rhrJson/sleepJson/loadJson/subjectiveJson keep their
 * camelCase fields verbatim, while componentScores is emitted as a map keyed
 * "hrr"|"hrv"|"sleep"|"load"|"subjective" (HRV was added as a scored
 * component after the Flutter port) — the shape the web ReadinessCard reads.
 * Decoding is deliberately tolerant (string-encoded JSON, the legacy Flutter
 * list shape and case-insensitive enum names all parse), mirroring the
 * hand-written Flutter fromJson; payloads from before the HRV component
 * simply lack the "hrv" key and decode unchanged.
 */

// ---- Wire DTOs (all defaults so unknown/missing fields never fail a decode) ----

@Serializable
data class RhrJson(
    val todayRhr: Double? = null,
    val baselineRhr: Double? = null,
    val rhrDelta: Double? = null,
    val trendDirection: Int? = null,
)

@Serializable
data class SleepJson(
    val totalDurationMinutes: Double? = null,
    val deepMinutes: Double? = null,
    val remMinutes: Double? = null,
    val lightMinutes: Double? = null,
    val deepPercent: Double? = null,
    val remPercent: Double? = null,
    val sleepEfficiency: Double? = null,
)

@Serializable
data class LoadJson(
    val todayTrimp: Double? = null,
    val atl: Double? = null,
    val ctl: Double? = null,
    val tsb: Double? = null,
    val workloadRatio: Double? = null,
    val trimpStrategy: String? = null,
    val sevenDayTrimpTotal: Double? = null,
)

@Serializable
data class SubjectiveJson(
    val exhaustionLevel: Int? = null,
    val muscleSoreness: Int? = null,
    val stressLevel: Int? = null,
    val note: String? = null,
    val enteredAt: String? = null, // ISO-8601 timestamp
)

/** HRV metrics: scored as a component AND synced in this pass-through slot. */
@Serializable
data class HrvJson(
    val todayHrv: Double? = null,
    val baselineHrv: Double? = null,
    val hrvDelta: Double? = null,
    val trendDirection: String? = null,
)

/** Map value for a component score entry. */
@Serializable
data class ComponentScoreJson(
    val score: Double = 0.0,
    val isAvailable: Boolean = true,
    val reason: String? = null,
)

/** Body of POST /api/mobile/v1/readiness/daily. Nulls are omitted on encode. */
@Serializable
data class ReadinessPayload(
    val date: String = "", // yyyy-MM-dd
    val compositeScore: Double = 0.0,
    val state: String = "unavailable",
    val confidence: String = "unavailable",
    val componentScores: Map<String, ComponentScoreJson> = emptyMap(),
    val reasons: List<String> = emptyList(),
    val rhrJson: RhrJson? = null,
    val sleepJson: SleepJson? = null,
    val loadJson: LoadJson? = null,
    val subjectiveJson: SubjectiveJson? = null,
    val hrvJson: HrvJson? = null,
    val computedAt: String? = null, // ISO-8601 timestamp
    val maxHr: Int? = null,
    val restingHr: Int? = null,
) {
    fun toJson(): String = ReadinessJson.json.encodeToString(ReadinessPayload.serializer(), this)

    companion object {
        /** Tolerant decode; null when [text] is not a JSON object. */
        fun fromJson(text: String): ReadinessPayload? = ReadinessJson.decodePayload(text)
    }
}

// ---- Domain <-> DTO converters ----

fun RhrMetrics.toJsonDto(): RhrJson = RhrJson(todayRhr, baselineRhr, rhrDelta, trendDirection)

fun RhrJson.toDomain(): RhrMetrics = RhrMetrics(todayRhr, baselineRhr, rhrDelta, trendDirection)

fun SleepMetrics.toJsonDto(): SleepJson =
    SleepJson(totalDurationMinutes, deepMinutes, remMinutes, lightMinutes, deepPercent, remPercent, sleepEfficiency)

fun SleepJson.toDomain(): SleepMetrics =
    SleepMetrics(totalDurationMinutes, deepMinutes, remMinutes, lightMinutes, deepPercent, remPercent, sleepEfficiency)

fun LoadMetrics.toJsonDto(): LoadJson =
    LoadJson(todayTrimp, atl, ctl, tsb, workloadRatio, trimpStrategy.wireName, sevenDayTrimpTotal)

fun LoadJson.toDomain(): LoadMetrics =
    LoadMetrics(
        todayTrimp = todayTrimp,
        atl = atl,
        ctl = ctl,
        tsb = tsb,
        workloadRatio = workloadRatio,
        trimpStrategy = ReadinessJson.trimpStrategyFromWire(trimpStrategy),
        sevenDayTrimpTotal = sevenDayTrimpTotal,
    )

fun SubjectiveInput.toJsonDto(): SubjectiveJson =
    SubjectiveJson(exhaustionLevel, muscleSoreness, stressLevel, note, enteredAt?.toString())

fun SubjectiveJson.toDomain(): SubjectiveInput = SubjectiveInput(
    exhaustionLevel = exhaustionLevel,
    muscleSoreness = muscleSoreness,
    stressLevel = stressLevel,
    note = note,
    enteredAt = enteredAt?.let { runCatching { Instant.parse(it) }.getOrNull() },
)

fun HrvMetrics.toJsonDto(): HrvJson = HrvJson(todayHrv, baselineHrv, hrvDelta, trendDirection)

fun HrvJson.toDomain(): HrvMetrics = HrvMetrics(todayHrv, baselineHrv, hrvDelta, trendDirection)

// ---- Codec, wire-name mapping and payload assembly ----

object ReadinessJson {

    /**
     * explicitNulls = false omits null optional fields on encode; the
     * remaining contract fields (compositeScore, state, confidence,
     * componentScores, reasons) always have values so they are always sent,
     * matching the Flutter toJson which emitted them unconditionally.
     */
    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
        coerceInputValues = true
    }

    fun encode(payload: ReadinessPayload): String = payload.toJson()

    /** Tolerant decode of a server response or persisted record. */
    fun decodePayload(text: String): ReadinessPayload? {
        val element = runCatching { json.parseToJsonElement(text) }.getOrNull() ?: return null
        return decodePayload(element as? JsonObject ?: return null)
    }

    fun decodePayload(obj: JsonObject): ReadinessPayload = ReadinessPayload(
        date = obj.optString("date") ?: "",
        compositeScore = obj.optDouble("compositeScore") ?: 0.0,
        state = obj.optString("state") ?: "unavailable",
        confidence = obj.optString("confidence") ?: "unavailable",
        componentScores = decodeComponentScores(obj["componentScores"]),
        reasons = decodeStringList(obj["reasons"]),
        rhrJson = obj.optObject("rhrJson")?.let(::decodeRhr)
            ?: obj.optObject("rhr")?.let(::decodeRhr),
        sleepJson = obj.optObject("sleepJson")?.let(::decodeSleep)
            ?: obj.optObject("sleep")?.let(::decodeSleep),
        loadJson = obj.optObject("loadJson")?.let(::decodeLoad)
            ?: obj.optObject("load")?.let(::decodeLoad),
        subjectiveJson = obj.optObject("subjectiveJson")?.let(::decodeSubjective)
            ?: obj.optObject("subjective")?.let(::decodeSubjective),
        hrvJson = obj.optObject("hrvJson")?.let(::decodeHrv),
        computedAt = obj.optString("computedAt"),
        maxHr = obj.optInt("maxHr"),
        restingHr = obj.optInt("restingHr"),
    )

    /** Assembles the POST body from a scoring result plus the inputs it came from. */
    fun buildPayload(
        inputs: ReadinessInputs,
        result: ReadinessResult,
        hrv: HrvMetrics? = null,
        computedAt: Instant? = null,
    ): ReadinessPayload = ReadinessPayload(
        date = inputs.date.toString(), // LocalDate.toString() is yyyy-MM-dd
        compositeScore = result.compositeScore,
        state = result.state.wireName,
        confidence = result.confidence.wireName,
        componentScores = result.componentScores.associate { cs ->
            cs.component.wireName to ComponentScoreJson(cs.score, cs.isAvailable, cs.reason)
        },
        reasons = result.reasons,
        rhrJson = inputs.rhr?.toJsonDto(),
        sleepJson = inputs.sleep?.toJsonDto(),
        loadJson = inputs.load?.toJsonDto(),
        subjectiveJson = inputs.subjective?.toJsonDto(),
        // The explicit [hrv] argument wins; inputs.hrv is the scored thread
        // (ReadinessScoring sees the same HrvMetrics) used as the fallback.
        hrvJson = (hrv ?: inputs.hrv)?.toJsonDto(),
        computedAt = computedAt?.toString(),
        maxHr = inputs.maxHr,
        restingHr = inputs.restingHr,
    )

    // -- Wire-name mappers (accept the Dart camelCase names and SCREAMING_SNAKE) --

    fun readinessStateFromWire(wire: String?): ReadinessState =
        ReadinessState.entries.firstOrNull { it.matchesWire(wire) } ?: ReadinessState.UNAVAILABLE

    fun dataConfidenceFromWire(wire: String?): DataConfidence =
        DataConfidence.entries.firstOrNull { it.matchesWire(wire) } ?: DataConfidence.UNAVAILABLE

    fun adaptationTypeFromWire(wire: String?): AdaptationType =
        AdaptationType.entries.firstOrNull { it.matchesWire(wire) } ?: AdaptationType.NONE

    fun trimpStrategyFromWire(wire: String?): TrimpStrategy =
        TrimpStrategy.entries.firstOrNull { it.matchesWire(wire) } ?: TrimpStrategy.UNAVAILABLE

    /** Accepts "volumeReduction", "VOLUME_REDUCTION" and friends. */
    private fun WireNamed.matchesWire(wire: String?): Boolean =
        wire != null && wireName.lowercase() == wire.lowercase().replace("_", "")

    // -- Tolerant field readers --

    private fun JsonObject.optString(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content

    private fun JsonObject.optDouble(key: String): Double? =
        (this[key] as? JsonPrimitive)?.doubleOrNull

    private fun JsonObject.optInt(key: String): Int? =
        (this[key] as? JsonPrimitive)?.intOrNull

    private fun JsonObject.optBoolean(key: String): Boolean? =
        (this[key] as? JsonPrimitive)?.booleanOrNull

    /**
     * Returns the field as a JsonObject; like the Flutter models, a string
     * value holding JSON is unwrapped (the server round-trips Json columns
     * that some old rows stored as strings).
     */
    private fun JsonObject.optObject(key: String): JsonObject? = when (val v = this[key]) {
        null, is JsonNull -> null
        is JsonObject -> v
        is JsonArray -> null
        is JsonPrimitive -> unwrap(v)
    }

    private fun unwrap(primitive: JsonPrimitive): JsonObject? {
        if (primitive !is JsonNull && primitive.isString) {
            return runCatching { json.parseToJsonElement(primitive.content) }.getOrNull() as? JsonObject
        }
        return null
    }

    /** componentScores as map, legacy Flutter list, or string-encoded JSON. */
    private fun decodeComponentScores(element: JsonElement?): Map<String, ComponentScoreJson> {
        val value = when (element) {
            null, is JsonNull -> return emptyMap()
            is JsonObject -> element
            is JsonArray -> element
            is JsonPrimitive -> runCatching { json.parseToJsonElement(element.content) }.getOrNull() ?: return emptyMap()
        }
        return when (value) {
            is JsonObject -> buildMap {
                for ((key, entry) in value) {
                    val score = when (entry) {
                        is JsonObject -> ComponentScoreJson(
                            score = entry.optDouble("score") ?: 0.0,
                            isAvailable = entry.optBoolean("isAvailable") ?: true,
                            reason = entry.optString("reason"),
                        )
                        // Web ReadinessCard legacy shape: flat name -> number.
                        is JsonPrimitive -> entry.doubleOrNull
                            ?.let { ComponentScoreJson(score = it, isAvailable = true) }
                        else -> null
                    }
                    if (score != null) put(normalizeComponentKey(key), score)
                }
            }
            is JsonArray -> buildMap {
                for (item in value) {
                    val obj = item as? JsonObject ?: continue
                    val key = obj.optString("component") ?: continue
                    put(
                        normalizeComponentKey(key),
                        ComponentScoreJson(
                            score = obj.optDouble("score") ?: 0.0,
                            isAvailable = obj.optBoolean("isAvailable") ?: true,
                            reason = obj.optString("reason"),
                        ),
                    )
                }
            }
            else -> emptyMap()
        }
    }

    private fun normalizeComponentKey(key: String): String =
        ReadinessComponent.entries.firstOrNull { it.matchesWire(key) }?.wireName ?: key

    /** reasons as list or string-encoded JSON list. */
    private fun decodeStringList(element: JsonElement?): List<String> {
        val value = when (element) {
            null, is JsonNull -> return emptyList()
            is JsonArray -> element
            is JsonPrimitive ->
                runCatching { json.parseToJsonElement(element.content) }.getOrNull() as? JsonArray ?: return emptyList()
            is JsonObject -> return emptyList()
        }
        return value.mapNotNull { (it as? JsonPrimitive)?.takeIf { p -> p !is JsonNull }?.content }
    }

    private fun decodeRhr(obj: JsonObject): RhrJson = RhrJson(
        todayRhr = obj.optDouble("todayRhr"),
        baselineRhr = obj.optDouble("baselineRhr"),
        rhrDelta = obj.optDouble("rhrDelta"),
        trendDirection = obj.optInt("trendDirection"),
    )

    private fun decodeSleep(obj: JsonObject): SleepJson = SleepJson(
        totalDurationMinutes = obj.optDouble("totalDurationMinutes"),
        deepMinutes = obj.optDouble("deepMinutes"),
        remMinutes = obj.optDouble("remMinutes"),
        lightMinutes = obj.optDouble("lightMinutes"),
        deepPercent = obj.optDouble("deepPercent"),
        remPercent = obj.optDouble("remPercent"),
        sleepEfficiency = obj.optDouble("sleepEfficiency"),
    )

    private fun decodeLoad(obj: JsonObject): LoadJson = LoadJson(
        todayTrimp = obj.optDouble("todayTrimp"),
        atl = obj.optDouble("atl"),
        ctl = obj.optDouble("ctl"),
        tsb = obj.optDouble("tsb"),
        workloadRatio = obj.optDouble("workloadRatio"),
        trimpStrategy = obj.optString("trimpStrategy"),
        sevenDayTrimpTotal = obj.optDouble("sevenDayTrimpTotal"),
    )

    private fun decodeSubjective(obj: JsonObject): SubjectiveJson = SubjectiveJson(
        exhaustionLevel = obj.optInt("exhaustionLevel"),
        muscleSoreness = obj.optInt("muscleSoreness"),
        stressLevel = obj.optInt("stressLevel"),
        note = obj.optString("note"),
        enteredAt = obj.optString("enteredAt"),
    )

    private fun decodeHrv(obj: JsonObject): HrvJson = HrvJson(
        todayHrv = obj.optDouble("todayHrv"),
        baselineHrv = obj.optDouble("baselineHrv"),
        hrvDelta = obj.optDouble("hrvDelta"),
        trendDirection = obj.optString("trendDirection"),
    )
}
