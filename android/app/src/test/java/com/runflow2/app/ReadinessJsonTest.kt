package com.runflow2.app

import com.runflow2.app.domain.readiness.AdaptationType
import com.runflow2.app.domain.readiness.ComponentScoreJson
import com.runflow2.app.domain.readiness.DataConfidence
import com.runflow2.app.domain.readiness.HrvJson
import com.runflow2.app.domain.readiness.HrvMetrics
import com.runflow2.app.domain.readiness.LoadJson
import com.runflow2.app.domain.readiness.LoadMetrics
import com.runflow2.app.domain.readiness.ReadinessInputs
import com.runflow2.app.domain.readiness.ReadinessJson
import com.runflow2.app.domain.readiness.ReadinessPayload
import com.runflow2.app.domain.readiness.ReadinessScoring
import com.runflow2.app.domain.readiness.ReadinessState
import com.runflow2.app.domain.readiness.RhrJson
import com.runflow2.app.domain.readiness.RhrMetrics
import com.runflow2.app.domain.readiness.SleepJson
import com.runflow2.app.domain.readiness.SleepMetrics
import com.runflow2.app.domain.readiness.SubjectiveInput
import com.runflow2.app.domain.readiness.SubjectiveJson
import com.runflow2.app.domain.readiness.TrimpStrategy
import com.runflow2.app.domain.readiness.toDomain
import com.runflow2.app.domain.readiness.toJsonDto
import java.time.Instant
import java.time.LocalDate
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mirrors the JSON parts of flutter/test/unit/readiness_models_test.dart
 * (commit a4616887) — round-trips, null handling and the tolerant decodes —
 * plus checks for the new componentScores map shape the web card reads.
 */
class ReadinessJsonTest {

    private val json = ReadinessJson.json

    private inline fun <reified T> roundTrip(value: T, serializer: kotlinx.serialization.KSerializer<T>): T =
        json.decodeFromString(serializer, json.encodeToString(serializer, value))

    // ---- Metrics DTO round-trips (keys from readiness_models.g.dart) ----

    @Test
    fun `rhr metrics round-trip through json`() {
        val restored = roundTrip(
            RhrMetrics(todayRhr = 52.0, baselineRhr = 55.0, rhrDelta = -3.0, trendDirection = -1).toJsonDto(),
            RhrJson.serializer(),
        ).let { RhrJson(it.todayRhr, it.baselineRhr, it.rhrDelta, it.trendDirection) }

        assertEquals(52.0, restored.todayRhr!!, 0.0)
        assertEquals(55.0, restored.baselineRhr!!, 0.0)
        assertEquals(-3.0, restored.rhrDelta!!, 0.0)
        assertEquals(-1, restored.trendDirection)
    }

    @Test
    fun `rhr json omits null optional fields`() {
        val encoded = json.encodeToString(RhrJson.serializer(), RhrJson())
        assertEquals("{}", encoded)
    }

    @Test
    fun `sleep metrics round-trip through json`() {
        val restored = roundTrip(
            SleepMetrics(
                totalDurationMinutes = 420.0,
                deepMinutes = 60.0,
                remMinutes = 90.0,
                lightMinutes = 180.0,
                deepPercent = 14.3,
                remPercent = 21.4,
                sleepEfficiency = 92.0,
            ).toJsonDto(),
            SleepJson.serializer(),
        )
        assertEquals(420.0, restored.totalDurationMinutes!!, 0.0)
        assertEquals(60.0, restored.deepMinutes!!, 0.0)
        assertEquals(90.0, restored.remMinutes!!, 0.0)
        assertEquals(180.0, restored.lightMinutes!!, 0.0)
        assertEquals(14.3, restored.deepPercent!!, 0.001)
        assertEquals(21.4, restored.remPercent!!, 0.001)
        assertEquals(92.0, restored.sleepEfficiency!!, 0.0)
    }

    @Test
    fun `load metrics round-trip carries trimp strategy wire name`() {
        val dto = LoadMetrics(
            todayTrimp = 85.0,
            atl = 45.0,
            ctl = 55.0,
            tsb = 10.0,
            workloadRatio = 1.2,
            trimpStrategy = TrimpStrategy.HEART_RATE_RESERVE,
            sevenDayTrimpTotal = 320.0,
        ).toJsonDto()
        val encoded = json.encodeToString(LoadJson.serializer(), dto)
        assertTrue(encoded.contains("\"trimpStrategy\":\"heartRateReserve\""))

        val domain = json.decodeFromString(LoadJson.serializer(), encoded).toDomain()
        assertEquals(85.0, domain.todayTrimp!!, 0.0)
        assertEquals(1.2, domain.workloadRatio!!, 0.0)
        assertEquals(320.0, domain.sevenDayTrimpTotal!!, 0.0)
        assertEquals(TrimpStrategy.HEART_RATE_RESERVE, domain.trimpStrategy)
    }

    @Test
    fun `subjective round-trip with ISO enteredAt`() {
        val restored = roundTrip(
            SubjectiveJson(
                exhaustionLevel = 3,
                muscleSoreness = 2,
                stressLevel = 1,
                note = "Feeling okay",
                enteredAt = "2024-06-15T08:30:00Z",
            ),
            SubjectiveJson.serializer(),
        )
        assertEquals(3, restored.exhaustionLevel)
        assertEquals(2, restored.muscleSoreness)
        assertEquals(1, restored.stressLevel)
        assertEquals("Feeling okay", restored.note)
        assertEquals("2024-06-15T08:30:00Z", restored.enteredAt)
    }

    @Test
    fun `subjective domain enteredAt instant survives round-trip`() {
        val enteredAt = Instant.parse("2024-06-15T08:30:00Z")
        val domain = roundTrip(SubjectiveInput(exhaustionLevel = 3, enteredAt = enteredAt).toJsonDto(), SubjectiveJson.serializer())
            .toDomain()
        assertEquals(enteredAt, domain.enteredAt)
    }

    @Test
    fun `hrv metrics round-trip through json`() {
        val dto = HrvMetrics(todayHrv = 62.0, baselineHrv = 58.0, hrvDelta = 4.0, trendDirection = "up").toJsonDto()
        val restored = roundTrip(dto, HrvJson.serializer())
        assertEquals(62.0, restored.todayHrv!!, 0.0)
        assertEquals(58.0, restored.baselineHrv!!, 0.0)
        assertEquals(4.0, restored.hrvDelta!!, 0.0)
        assertEquals("up", restored.trendDirection)
    }

    // ---- Payload encoding ----

    @Test
    fun `payload round-trip with nested objects`() {
        val payload = ReadinessPayload(
            date = "2024-06-15",
            compositeScore = 77.5,
            state = "good",
            confidence = "full",
            componentScores = mapOf(
                "hrr" to ComponentScoreJson(score = 85.0, isAvailable = true),
                "sleep" to ComponentScoreJson(score = 70.0, isAvailable = true),
            ),
            reasons = listOf("RHR below baseline", "Good sleep"),
            rhrJson = RhrJson(todayRhr = 52.0, baselineRhr = 55.0),
            sleepJson = SleepJson(totalDurationMinutes = 420.0),
            loadJson = LoadJson(atl = 45.0),
            subjectiveJson = SubjectiveJson(exhaustionLevel = 3),
            hrvJson = HrvJson(todayHrv = 62.0),
            computedAt = "2024-06-15T08:00:00Z",
            maxHr = 190,
            restingHr = 55,
        )
        val restored = requireNotNull(ReadinessPayload.fromJson(payload.toJson()))
        assertEquals(payload, restored)
    }

    @Test
    fun `payload omits null optional fields on encode`() {
        val payload = ReadinessPayload(date = "2024-06-15", compositeScore = 0.0)
        val encoded = payload.toJson()
        assertTrue(encoded.contains("\"date\":\"2024-06-15\""))
        assertFalse(encoded.contains("rhrJson"))
        assertFalse(encoded.contains("sleepJson"))
        assertFalse(encoded.contains("loadJson"))
        assertFalse(encoded.contains("subjectiveJson"))
        assertFalse(encoded.contains("hrvJson"))
        assertFalse(encoded.contains("computedAt"))
        assertFalse(encoded.contains("maxHr"))
        assertFalse(encoded.contains("restingHr"))
    }

    @Test
    fun `payload always emits the contract fields`() {
        // Like the Flutter toJson, compositeScore/state/confidence/
        // componentScores/reasons are sent even at their defaults.
        val encoded = ReadinessPayload().toJson()
        assertTrue(encoded.contains("\"compositeScore\""))
        assertTrue(encoded.contains("\"state\":\"unavailable\""))
        assertTrue(encoded.contains("\"confidence\":\"unavailable\""))
        assertTrue(encoded.contains("\"componentScores\":{}"))
        assertTrue(encoded.contains("\"reasons\":[]"))
    }

    @Test
    fun `componentScores serialize as a map keyed by component wire names`() {
        val inputs = ReadinessInputs(
            date = LocalDate.of(2025, 1, 1),
            rhr = RhrMetrics(todayRhr = 55.0, baselineRhr = 55.0, rhrDelta = 0.0),
            hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 60.0, hrvDelta = 2.0),
            sleep = SleepMetrics(totalDurationMinutes = 480.0),
            load = LoadMetrics(workloadRatio = 1.0),
            subjective = SubjectiveInput(exhaustionLevel = 3),
        )
        val payload = ReadinessJson.buildPayload(inputs, ReadinessScoring.score(inputs))
        val obj = json.parseToJsonElement(payload.toJson()).jsonObject
        val scores = obj["componentScores"] as JsonObject

        assertEquals(setOf("hrr", "hrv", "sleep", "load", "subjective"), scores.keys)
        val hrr = scores["hrr"]!!.jsonObject
        assertEquals(75.0, hrr["score"]!!.jsonPrimitive.double, 0.0)
        assertTrue(hrr["isAvailable"]!!.jsonPrimitive.boolean)
        assertTrue(hrr.containsKey("reason"))
    }

    @Test
    fun `payload componentScores carries the scored hrv component`() {
        val hrv = HrvMetrics(todayHrv = 66.0, baselineHrv = 60.0, hrvDelta = 6.0)
        val inputs = ReadinessInputs(
            date = LocalDate.of(2025, 1, 1),
            hrv = hrv,
            sleep = SleepMetrics(totalDurationMinutes = 480.0),
            load = LoadMetrics(workloadRatio = 1.0),
        )
        val payload = ReadinessJson.buildPayload(inputs, ReadinessScoring.score(inputs))

        // +10% vs baseline → 75 + 10 * 1.5 = 90
        val hrvEntry = payload.componentScores.getValue("hrv")
        assertEquals(90.0, hrvEntry.score, 0.0)
        assertTrue(hrvEntry.isAvailable)
        assertEquals("HRV up 10.0% vs baseline", hrvEntry.reason)
        // hrvJson pass-through still carries the metrics for display
        assertEquals(66.0, payload.hrvJson?.todayHrv!!, 0.0)

        // round-trip: a payload with the "hrv" key decodes it back
        val restored = requireNotNull(ReadinessPayload.fromJson(payload.toJson()))
        assertEquals(90.0, restored.componentScores.getValue("hrv").score, 0.0)
        assertTrue(restored.componentScores.getValue("hrv").isAvailable)
    }

    @Test
    fun `decode accepts legacy payloads without an hrv component`() {
        val text = """
            {"date":"2024-06-15","compositeScore":77.5,"state":"good","confidence":"partial",
             "componentScores":{"hrr":{"score":85.0,"isAvailable":true},
                                "sleep":{"score":70.0,"isAvailable":true}}}
        """.trimIndent()
        val payload = requireNotNull(ReadinessPayload.fromJson(text))
        assertEquals(setOf("hrr", "sleep"), payload.componentScores.keys)
        assertFalse(payload.componentScores.containsKey("hrv"))
        assertEquals(85.0, payload.componentScores.getValue("hrr").score, 0.0)
        assertTrue(payload.componentScores.getValue("sleep").isAvailable)
    }

    @Test
    fun `buildPayload carries date scoring outputs and athlete hr fields`() {
        val hrv = HrvMetrics(todayHrv = 62.0, baselineHrv = 58.0, hrvDelta = 4.0, trendDirection = "up")
        val inputs = ReadinessInputs(
            date = LocalDate.of(2025, 1, 1),
            rhr = RhrMetrics(todayRhr = 50.0, baselineRhr = 55.0, rhrDelta = -5.0),
            hrv = hrv,
            sleep = SleepMetrics(totalDurationMinutes = 510.0, deepPercent = 22.0, remPercent = 22.0),
            load = LoadMetrics(workloadRatio = 1.0),
            subjective = SubjectiveInput(exhaustionLevel = 1, muscleSoreness = 1, stressLevel = 1),
            maxHr = 190,
            restingHr = 55,
        )
        val result = ReadinessScoring.score(inputs)
        val payload = ReadinessJson.buildPayload(
            inputs,
            result,
            hrv = hrv,
            computedAt = Instant.parse("2026-10-08T06:30:00Z"),
        )
        assertEquals("2025-01-01", payload.date)
        assertEquals(result.compositeScore, payload.compositeScore, 0.0)
        assertEquals("excellent", payload.state)
        assertEquals("full", payload.confidence)
        assertEquals(result.reasons, payload.reasons)
        assertEquals(190, payload.maxHr)
        assertEquals(55, payload.restingHr)
        assertEquals(62.0, payload.hrvJson?.todayHrv!!, 0.0)
        assertEquals("2026-10-08T06:30:00Z", payload.computedAt)
    }

    // ---- Tolerant decoding ----

    @Test
    fun `decode accepts legacy flutter componentScores list shape`() {
        val text = """
            {"date":"2024-06-15","compositeScore":77.5,"state":"good","confidence":"full",
             "componentScores":[
               {"component":"hrr","score":85.0,"isAvailable":true,"reason":"ok"},
               {"component":"SUBJECTIVE","score":40.0,"isAvailable":false}
             ]}
        """.trimIndent()
        val payload = requireNotNull(ReadinessPayload.fromJson(text))
        assertEquals(setOf("hrr", "subjective"), payload.componentScores.keys)
        assertEquals(85.0, payload.componentScores.getValue("hrr").score, 0.0)
        assertTrue(payload.componentScores.getValue("hrr").isAvailable)
        assertFalse(payload.componentScores.getValue("subjective").isAvailable)
    }

    @Test
    fun `decode accepts flat numeric componentScores map shape`() {
        val text = """{"date":"2024-06-15","componentScores":{"hrr":75.5,"LOAD":90}}"""
        val payload = requireNotNull(ReadinessPayload.fromJson(text))
        assertEquals(setOf("hrr", "load"), payload.componentScores.keys)
        assertEquals(75.5, payload.componentScores.getValue("hrr").score, 0.0)
        assertTrue(payload.componentScores.getValue("hrr").isAvailable)
    }

    @Test
    fun `decode accepts string-encoded nested json`() {
        val text = """
            {"date":"2024-06-15",
             "rhrJson":"{\"todayRhr\":52.0,\"baselineRhr\":55.0}",
             "componentScores":"[{\"component\":\"hrr\",\"score\":85.0,\"isAvailable\":true}]",
             "reasons":"[\"RHR below baseline\"]",
             "compositeScore":77.5,"state":"good","confidence":"full"}
        """.trimIndent()
        val payload = requireNotNull(ReadinessPayload.fromJson(text))
        assertEquals(52.0, payload.rhrJson?.todayRhr!!, 0.0)
        assertEquals(1, payload.componentScores.size)
        assertEquals(85.0, payload.componentScores.getValue("hrr").score, 0.0)
        assertEquals(listOf("RHR below baseline"), payload.reasons)
    }

    @Test
    fun `decode falls back to legacy rhr sleep load subjective keys`() {
        val text = """
            {"date":"2024-06-15","rhr":{"todayRhr":52.0},"sleep":{"totalDurationMinutes":420.0},
             "load":{"atl":45.0},"subjective":{"exhaustionLevel":3}}
        """.trimIndent()
        val payload = requireNotNull(ReadinessPayload.fromJson(text))
        assertEquals(52.0, payload.rhrJson?.todayRhr!!, 0.0)
        assertEquals(420.0, payload.sleepJson?.totalDurationMinutes!!, 0.0)
        assertEquals(45.0, payload.loadJson?.atl!!, 0.0)
        assertEquals(3, payload.subjectiveJson?.exhaustionLevel)
    }

    @Test
    fun `decode handles missing optional fields`() {
        val payload = requireNotNull(ReadinessPayload.fromJson("""{"date":"2024-06-15"}"""))
        assertEquals("2024-06-15", payload.date)
        assertEquals(0.0, payload.compositeScore, 0.0)
        assertEquals("unavailable", payload.state)
        assertEquals("unavailable", payload.confidence)
        assertTrue(payload.componentScores.isEmpty())
        assertTrue(payload.reasons.isEmpty())
        assertNull(payload.rhrJson)
        assertNull(payload.computedAt)
    }

    @Test
    fun `decode returns null for non-object json`() {
        assertNull(ReadinessPayload.fromJson("not json at all"))
        assertNull(ReadinessPayload.fromJson("[1,2,3]"))
    }

    // ---- Wire-name mappers ----

    @Test
    fun `state and confidence wire names map both ways`() {
        assertEquals(ReadinessState.GOOD, ReadinessJson.readinessStateFromWire("good"))
        assertEquals(ReadinessState.GOOD, ReadinessJson.readinessStateFromWire("GOOD"))
        assertEquals(ReadinessState.REST, ReadinessJson.readinessStateFromWire("rest"))
        assertEquals(ReadinessState.UNAVAILABLE, ReadinessJson.readinessStateFromWire(null))
        assertEquals(ReadinessState.UNAVAILABLE, ReadinessJson.readinessStateFromWire("bogus"))
        assertEquals(DataConfidence.FULL, ReadinessJson.dataConfidenceFromWire("Full"))
        assertEquals(DataConfidence.ESTIMATED, ReadinessJson.dataConfidenceFromWire("estimated"))
        assertEquals(DataConfidence.UNAVAILABLE, ReadinessJson.dataConfidenceFromWire("nope"))
    }

    @Test
    fun `adaptation and trimp strategy wire names map both ways`() {
        assertEquals(AdaptationType.VOLUME_REDUCTION, ReadinessJson.adaptationTypeFromWire("volumeReduction"))
        assertEquals(AdaptationType.REST_OR_RESCHEDULE, ReadinessJson.adaptationTypeFromWire("rest_or_reschedule"))
        assertEquals(AdaptationType.NONE, ReadinessJson.adaptationTypeFromWire("unknown"))
        assertEquals(TrimpStrategy.HEART_RATE_RESERVE, ReadinessJson.trimpStrategyFromWire("heartRateReserve"))
        assertEquals(TrimpStrategy.SESSION_TYPE_FALLBACK, ReadinessJson.trimpStrategyFromWire("SESSION_TYPE_FALLBACK"))
        assertEquals(TrimpStrategy.UNAVAILABLE, ReadinessJson.trimpStrategyFromWire(null))
    }
}
