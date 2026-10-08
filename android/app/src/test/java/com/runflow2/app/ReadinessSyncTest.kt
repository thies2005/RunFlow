package com.runflow2.app

import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.net.Api
import com.runflow2.app.data.net.ServerReadinessDto
import com.runflow2.app.data.sync.cachedComponentScores
import com.runflow2.app.data.sync.toDailyEntry
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Server-record → DailyEntryEntity merge rules for the readiness history
 * pull: dirty local rows win, a strictly newer server record replaces a
 * clean local row, and the mapped fields match the shape
 * Web/src/lib/readiness/serialization.ts serializeDailyRecord emits.
 */
class ReadinessSyncTest {

    /** serializeDailyRecord output of a pushed day with metrics + cache. */
    private val serverRecordJson = """
        {
          "id": "rec-1",
          "date": "2026-10-07",
          "compositeScore": 71.5,
          "state": "good",
          "confidence": "partial",
          "componentScores": {
            "hrr": {"score": 80.0, "isAvailable": true, "reason": "rhr ok"},
            "sleep": {"score": 70.0, "isAvailable": true}
          },
          "reasons": ["Resting heart rate stable", "Sleep: 7.0h"],
          "rhrJson": {"todayRhr": 54.0, "baselineRhr": 55.0, "rhrDelta": -1.0, "trendDirection": 0},
          "sleepJson": {"totalDurationMinutes": 420.0, "deepMinutes": 60.0, "remMinutes": 90.0,
                         "lightMinutes": 270.0, "deepPercent": 14.28, "remPercent": 21.43},
          "loadJson": {"todayTrimp": 82.4, "atl": 61.1, "ctl": 55.7, "tsb": -5.4,
                        "workloadRatio": 1.1, "trimpStrategy": "unavailable", "sevenDayTrimpTotal": 380.0},
          "subjectiveJson": {"exhaustionLevel": 3, "muscleSoreness": 2, "stressLevel": 1,
                              "note": "felt fine", "enteredAt": "2026-10-07T07:30:00.000Z"},
          "hrvJson": {"todayHrv": 62.0, "baselineHrv": 60.0, "hrvDelta": 2.0, "trendDirection": "up"},
          "overrideJson": null,
          "computedAt": "2026-10-07T06:00:00.000Z",
          "syncedAt": "2026-10-07T06:00:05.000Z",
          "maxHr": 190,
          "restingHr": 52,
          "createdAt": "2026-10-07T06:00:00.000Z",
          "updatedAt": "2026-10-07T09:00:00.000Z"
        }
    """.trimIndent()

    private fun decode(json: String = serverRecordJson): ServerReadinessDto =
        Api.json.decodeFromString(ServerReadinessDto.serializer(), json)

    private fun local(
        updatedAt: Long,
        dirty: Boolean = false,
        restingHr: Int? = 50,
    ) = DailyEntryEntity(
        date = "2026-10-07",
        restingHr = restingHr,
        hrvMs = 55.0,
        sleepMinutes = 400,
        deepMinutes = 50,
        remMinutes = 80,
        lightMinutes = 270,
        exhaustionLevel = null,
        muscleSoreness = null,
        stressLevel = null,
        note = null,
        sourceRhr = "hc",
        sourceHrv = "hc",
        sourceSleep = "hc",
        manuallyEdited = false,
        updatedAt = updatedAt,
        dirty = dirty,
        score = 65.0,
        state = "moderate",
        confidence = "estimated",
        componentScoresJson = """{"hrr":{"score":60.0,"isAvailable":true}}""",
    )

    @Test
    fun `server record parses the serialized daily shape`() {
        val dto = decode()
        assertEquals("2026-10-07", dto.date)
        assertEquals(71.5, dto.compositeScore, 0.0)
        assertEquals("good", dto.state)
        assertEquals("partial", dto.confidence)
        // raw JsonElements: both component keys must survive decoding
        val scores = dto.componentScores.toString()
        assertTrue("hrr" in scores)
        assertTrue("sleep" in scores)
        assertEquals(190, dto.maxHr)
        assertEquals("2026-10-07T09:00:00.000Z", dto.updatedAt)
    }

    @Test
    fun `server record creates a local row when none exists`() {
        val merged = decode().toDailyEntry(existing = null)!!
        assertEquals("2026-10-07", merged.date)
        // metrics come from the *Json columns, not the profile-level fields
        assertEquals(54, merged.restingHr)
        assertEquals(62.0, merged.hrvMs!!, 0.0)
        assertEquals(420, merged.sleepMinutes)
        assertEquals(60, merged.deepMinutes)
        assertEquals(90, merged.remMinutes)
        assertEquals(270, merged.lightMinutes)
        assertEquals(3, merged.exhaustionLevel)
        assertEquals(2, merged.muscleSoreness)
        assertEquals(1, merged.stressLevel)
        assertEquals("felt fine", merged.note)
        // pulled rows: sync-sourced, never dirty, never user-owned
        assertEquals("sync", merged.sourceRhr)
        assertEquals("sync", merged.sourceHrv)
        assertEquals("sync", merged.sourceSleep)
        assertFalse(merged.manuallyEdited)
        assertFalse(merged.dirty)
        // cache columns from the record (the day's RHR, not the profile's 52)
        assertEquals(71.5, merged.score!!, 0.0)
        assertEquals("good", merged.state)
        assertEquals("partial", merged.confidence)
        val components = merged.cachedComponentScores()
        assertEquals(80.0, components.getValue("hrr").score, 0.0)
        // updatedAt = the server record's updatedAt
        assertEquals(Instant.parse("2026-10-07T09:00:00.000Z").toEpochMilli(), merged.updatedAt)
    }

    @Test
    fun `dirty local row wins over the server record`() {
        val existing = local(updatedAt = 1_000L, dirty = true)
        assertNull(decode().toDailyEntry(existing))
    }

    @Test
    fun `strictly newer server record replaces a clean local row`() {
        val existing = local(updatedAt = Instant.parse("2026-10-01T00:00:00Z").toEpochMilli())
        val merged = decode().toDailyEntry(existing)!!
        assertEquals(54, merged.restingHr)
        assertEquals(71.5, merged.score!!, 0.0)
        assertFalse(merged.dirty)
    }

    @Test
    fun `server record not newer keeps the local row`() {
        val serverAt = Instant.parse("2026-10-07T09:00:00.000Z").toEpochMilli()
        assertNull(decode().toDailyEntry(local(updatedAt = serverAt)))
        assertNull(decode().toDailyEntry(local(updatedAt = serverAt + 1)))
    }

    @Test
    fun `unavailable server state maps to null cache columns`() {
        val json = """
            {"id":"rec-2","date":"2026-10-06","compositeScore":0,"state":"unavailable",
             "confidence":"unavailable","componentScores":{},"reasons":[],
             "rhrJson":{"todayRhr":58.0},"sleepJson":null,"loadJson":null,
             "subjectiveJson":null,"hrvJson":null,"overrideJson":null,
             "computedAt":null,"syncedAt":"2026-10-06T06:00:00.000Z",
             "maxHr":null,"restingHr":null,
             "createdAt":"2026-10-06T06:00:00.000Z","updatedAt":"2026-10-06T06:00:00.000Z"}
        """.trimIndent()
        val merged = decode(json).toDailyEntry(existing = null)!!
        assertEquals(58, merged.restingHr)
        assertNull(merged.sleepMinutes)
        assertNull(merged.sourceSleep)
        assertNull(merged.score)
        assertNull(merged.state)
        assertNull(merged.confidence)
        assertNull(merged.componentScoresJson)
    }

    @Test
    fun `malformed dates are skipped`() {
        val json = serverRecordJson.replace("\"date\": \"2026-10-07\"", "\"date\": \"07/10/2026\"")
        assertNull(decode(json).toDailyEntry(existing = null))
    }
}
