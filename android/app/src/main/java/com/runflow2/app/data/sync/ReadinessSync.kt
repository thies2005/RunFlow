package com.runflow2.app.data.sync

import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.ServerReadinessDto
import com.runflow2.app.domain.readiness.ComponentScoreJson
import com.runflow2.app.domain.readiness.HrvJson
import com.runflow2.app.domain.readiness.ReadinessJson
import com.runflow2.app.domain.readiness.ReadinessState
import com.runflow2.app.domain.readiness.RhrJson
import com.runflow2.app.domain.readiness.SleepJson
import com.runflow2.app.domain.readiness.SubjectiveJson
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement
import kotlin.math.roundToInt

/*
 * Server-record → DailyEntryEntity mapping for the readiness history pull.
 * Merge rules (mirroring the activity/plan pulls):
 *  - a dirty local row is an unpushed local edit — local wins, nothing written;
 *  - otherwise the server record replaces the local row only when it is
 *    strictly newer (updatedAt);
 *  - pulled rows are stamped source* = "sync" on the metrics they carry
 *    ("manual" stays reserved for user edits, "hc" for Health Connect
 *    writes), dirty = false, manuallyEdited = false;
 *  - an "unavailable" server state maps to null cache columns, matching the
 *    local convention that an unscorable day never renders as a 0 score.
 */

/** Returns the entity row to upsert, or null when [existing] wins / nothing applies. */
fun ServerReadinessDto.toDailyEntry(existing: DailyEntryEntity?): DailyEntryEntity? {
    if (date.length != 10 || runCatching { java.time.LocalDate.parse(date) }.isFailure) return null
    if (existing?.dirty == true) return null

    val serverAt = Api.parseInstant(updatedAt) ?: 0L
    if (existing != null && serverAt <= existing.updatedAt) return null

    val rhr = decodeElement(rhrJson, RhrJson.serializer())
    val sleep = decodeElement(sleepJson, SleepJson.serializer())
    val subjective = decodeElement(subjectiveJson, SubjectiveJson.serializer())
    val hrv = decodeElement(hrvJson, HrvJson.serializer())

    val restingHr = rhr?.todayRhr?.roundToInt()
    val hrvMs = hrv?.todayHrv
    val sleepMinutes = sleep?.totalDurationMinutes?.roundToInt()
    val state = ReadinessJson.readinessStateFromWire(state)
    val available = state != ReadinessState.UNAVAILABLE

    return DailyEntryEntity(
        date = date,
        restingHr = restingHr,
        hrvMs = hrvMs,
        sleepMinutes = sleepMinutes,
        deepMinutes = sleep?.deepMinutes?.roundToInt(),
        remMinutes = sleep?.remMinutes?.roundToInt(),
        lightMinutes = sleep?.lightMinutes?.roundToInt(),
        exhaustionLevel = subjective?.exhaustionLevel,
        muscleSoreness = subjective?.muscleSoreness,
        stressLevel = subjective?.stressLevel,
        note = subjective?.note,
        sourceRhr = if (restingHr != null) "sync" else null,
        sourceHrv = if (hrvMs != null) "sync" else null,
        sourceSleep = if (sleepMinutes != null) "sync" else null,
        manuallyEdited = false,
        updatedAt = if (serverAt > 0) serverAt else System.currentTimeMillis(),
        dirty = false,
        score = if (available) compositeScore else null,
        state = if (available) state.wireName else null,
        confidence = if (available) ReadinessJson.dataConfidenceFromWire(confidence).wireName else null,
        componentScoresJson = if (available) componentScores?.toString() else null,
    )
}

/**
 * Decodes a server *Json column into its DTO. The column is arbitrary JSON:
 * a proper object on modern rows, a string-encoded object or null
 * otherwise — the same tolerance ReadinessJson.decodePayload applies.
 */
private fun <T> decodeElement(element: JsonElement?, serializer: KSerializer<T>): T? = when (element) {
    null, is JsonNull -> null
    is JsonObject -> runCatching { ReadinessJson.json.decodeFromJsonElement(serializer, element) }.getOrNull()
    is JsonArray -> null
    is JsonPrimitive ->
        if (element.isString && element !is JsonNull) {
            runCatching {
                val parsed = ReadinessJson.json.parseToJsonElement(element.content)
                ReadinessJson.json.decodeFromJsonElement(serializer, parsed)
            }.getOrNull()
        } else {
            null
        }
}

/** Cache-column sanity for tests: decodes the stored componentScores JSON. */
fun DailyEntryEntity.cachedComponentScores(): Map<String, ComponentScoreJson> =
    componentScoresJson?.let { ReadinessJson.decodePayload("""{"componentScores":$it}""") }?.componentScores
        ?: emptyMap()
