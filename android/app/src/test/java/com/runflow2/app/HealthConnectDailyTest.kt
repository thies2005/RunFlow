package com.runflow2.app

import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.health.HcHrvSample
import com.runflow2.app.data.health.HcRhrSample
import com.runflow2.app.data.health.HcSleepAggregate
import com.runflow2.app.data.health.HcSleepStage
import com.runflow2.app.data.health.HcSleepStageKind
import com.runflow2.app.data.health.HealthConnectMapping
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * Pure-logic tests for the Health Connect daily-metrics import: per-day
 * aggregation of resting HR / HRV / sleep and the merge rules that decide
 * what the import may write into a daily entry. No SDK / Android types.
 */
class HealthConnectDailyTest {

    // Fixed zone for every assertion: tests never depend on the device TZ.
    private val utc: ZoneId = ZoneOffset.UTC

    private fun ms(date: String, hour: Int, minute: Int = 0): Long =
        LocalDateTime.of(LocalDate.parse(date), java.time.LocalTime.of(hour, minute))
            .toInstant(ZoneOffset.UTC)
            .toEpochMilli()

    private fun entry(
        date: String = "2026-10-07",
        restingHr: Int? = null,
        hrvMs: Double? = null,
        sleepMinutes: Int? = null,
        deepMinutes: Int? = null,
        remMinutes: Int? = null,
        lightMinutes: Int? = null,
        sourceRhr: String? = null,
        sourceHrv: String? = null,
        sourceSleep: String? = null,
        manuallyEdited: Boolean = false,
        updatedAt: Long = 1_000,
        dirty: Boolean = false,
        exhaustionLevel: Int? = 6,
        note: String? = "felt good",
        score: Double? = 71.5,
    ) = DailyEntryEntity(
        date = date,
        restingHr = restingHr,
        hrvMs = hrvMs,
        sleepMinutes = sleepMinutes,
        deepMinutes = deepMinutes,
        remMinutes = remMinutes,
        lightMinutes = lightMinutes,
        exhaustionLevel = exhaustionLevel,
        muscleSoreness = 4,
        stressLevel = 3,
        note = note,
        sourceRhr = sourceRhr,
        sourceHrv = sourceHrv,
        sourceSleep = sourceSleep,
        manuallyEdited = manuallyEdited,
        updatedAt = updatedAt,
        dirty = dirty,
        score = score,
        state = "fair",
        confidence = "medium",
        componentScoresJson = "{\"sleep\":60}",
    )

    // ---- resting HR: min of the day ----

    @Test
    fun `resting HR aggregates to the minimum reading per day`() {
        val day = LocalDate.parse("2026-10-07")
        val agg = HealthConnectMapping.aggregateRestingHr(
            listOf(
                HcRhrSample(day, bpm = 54.0, epochMs = ms("2026-10-07", 7)),
                HcRhrSample(day, bpm = 51.0, epochMs = ms("2026-10-07", 8)),
                HcRhrSample(day, bpm = 53.0, epochMs = ms("2026-10-07", 9)),
            )
        )
        assertEquals(51.0, agg[day]!!, 1e-9)
    }

    @Test
    fun `resting HR days are aggregated independently`() {
        val d1 = LocalDate.parse("2026-10-07")
        val d2 = LocalDate.parse("2026-10-08")
        val agg = HealthConnectMapping.aggregateRestingHr(
            listOf(
                HcRhrSample(d1, bpm = 55.0, epochMs = ms("2026-10-07", 7)),
                HcRhrSample(d2, bpm = 50.0, epochMs = ms("2026-10-08", 7)),
                HcRhrSample(d2, bpm = 52.0, epochMs = ms("2026-10-08", 8)),
            )
        )
        assertEquals(2, agg.size)
        assertEquals(55.0, agg[d1]!!, 1e-9)
        assertEquals(50.0, agg[d2]!!, 1e-9)
    }

    // ---- HRV: last sample of the day ----

    @Test
    fun `HRV keeps the last sample of the day regardless of list order`() {
        val day = LocalDate.parse("2026-10-07")
        val agg = HealthConnectMapping.aggregateHrv(
            listOf(
                HcHrvSample(day, rmssdMs = 48.0, epochMs = ms("2026-10-07", 23, 30)),
                HcHrvSample(day, rmssdMs = 61.0, epochMs = ms("2026-10-07", 7)),
                HcHrvSample(day, rmssdMs = 55.0, epochMs = ms("2026-10-07", 12)),
            )
        )
        // wearables refine the nightly reading towards the morning — the
        // latest sample (23:30) is the considered one
        assertEquals(48.0, agg[day]!!, 1e-9)
    }

    @Test
    fun `HRV days are aggregated independently`() {
        val d1 = LocalDate.parse("2026-10-07")
        val d2 = LocalDate.parse("2026-10-08")
        val agg = HealthConnectMapping.aggregateHrv(
            listOf(
                HcHrvSample(d1, rmssdMs = 40.0, epochMs = ms("2026-10-07", 23)),
                HcHrvSample(d2, rmssdMs = 60.0, epochMs = ms("2026-10-08", 23)),
                HcHrvSample(d2, rmssdMs = 58.0, epochMs = ms("2026-10-08", 10)),
            )
        )
        assertEquals(2, agg.size)
        assertEquals(40.0, agg[d1]!!, 1e-9)
        assertEquals(60.0, agg[d2]!!, 1e-9)
    }

    // ---- sleep: stage summation ----

    @Test
    fun `stage minutes are summed per kind and untracked stages are ignored`() {
        val s = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-06", 23),
            endEpochMs = ms("2026-10-07", 7),
            stages = listOf(
                HcSleepStage(ms("2026-10-06", 23), ms("2026-10-07", 0), HcSleepStageKind.LIGHT),
                HcSleepStage(ms("2026-10-07", 0), ms("2026-10-07", 1), HcSleepStageKind.DEEP),
                HcSleepStage(ms("2026-10-07", 1), ms("2026-10-07", 2), HcSleepStageKind.OTHER), // awake — ignored
                HcSleepStage(ms("2026-10-07", 2), ms("2026-10-07", 3, 30), HcSleepStageKind.REM),
                HcSleepStage(ms("2026-10-07", 3, 30), ms("2026-10-07", 5, 30), HcSleepStageKind.LIGHT),
                HcSleepStage(ms("2026-10-07", 5, 30), ms("2026-10-07", 5, 30), HcSleepStageKind.DEEP), // zero-length — guarded
            ),
        )
        assertEquals(180, s.lightMinutes) // 23:00–00:00 + 03:30–05:30
        assertEquals(60, s.deepMinutes)
        assertEquals(90, s.remMinutes)
        assertEquals(8 * 60, s.totalMinutes) // wall-clock session length
    }

    @Test
    fun `a session with no usable stages yields zero minutes without crashing`() {
        val s = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-06", 23),
            endEpochMs = ms("2026-10-07", 6),
            stages = listOf(
                HcSleepStage(ms("2026-10-06", 23), ms("2026-10-07", 6), HcSleepStageKind.OTHER),
            ),
        )
        assertEquals(0, s.deepMinutes)
        assertEquals(0, s.remMinutes)
        assertEquals(0, s.lightMinutes)
        assertEquals(7 * 60, s.totalMinutes)
    }

    // ---- sleep: nap filter ----

    @Test
    fun `sessions under three hours are dropped as naps`() {
        val day = LocalDate.parse("2026-10-07")
        val nap = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-07", 14),
            endEpochMs = ms("2026-10-07", 15, 30),
            stages = listOf(HcSleepStage(ms("2026-10-07", 14), ms("2026-10-07", 15, 30), HcSleepStageKind.LIGHT)),
        )
        val nights = HealthConnectMapping.aggregateSleep(listOf(nap), utc)
        assertTrue(nights.isEmpty())
    }

    @Test
    fun `the nap boundary is inclusive at three hours`() {
        val kept = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-07", 13),
            endEpochMs = ms("2026-10-07", 16),
            stages = emptyList(),
        )
        assertEquals(1, HealthConnectMapping.aggregateSleep(listOf(kept), utc).size)
        // built fresh: totalMinutes is a stored field, so copy() would not
        // recompute it — exactly why the filter must run on freshly built
        // sessions (what the SDK mapper does)
        val dropped = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-07", 13),
            endEpochMs = ms("2026-10-07", 15, 59), // 2 h 59 min
            stages = emptyList(),
        )
        assertTrue(HealthConnectMapping.aggregateSleep(listOf(dropped), utc).isEmpty())
    }

    // ---- sleep: day attribution ----

    @Test
    fun `a session crossing midnight belongs entirely to the wake date`() {
        val wake = LocalDate.parse("2026-10-07")
        val night = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-06", 23), // started the evening before
            endEpochMs = ms("2026-10-07", 7),    // woke on the 7th
            stages = listOf(
                HcSleepStage(ms("2026-10-06", 23), ms("2026-10-07", 3), HcSleepStageKind.DEEP),
                HcSleepStage(ms("2026-10-07", 3), ms("2026-10-07", 7), HcSleepStageKind.REM),
            ),
        )
        val agg = HealthConnectMapping.aggregateSleep(listOf(night), utc)
        assertEquals(setOf(wake), agg.keys) // nothing attributed to the 6th
        assertEquals(8 * 60, agg[wake]!!.sleepMinutes)
        assertEquals(4 * 60, agg[wake]!!.deepMinutes)
        assertEquals(4 * 60, agg[wake]!!.remMinutes)
        assertEquals(0, agg[wake]!!.lightMinutes)
    }

    @Test
    fun `multiple sessions on one wake date sum up`() {
        val wake = LocalDate.parse("2026-10-07")
        val main = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-06", 23),
            endEpochMs = ms("2026-10-07", 7),
            stages = listOf(
                HcSleepStage(ms("2026-10-06", 23), ms("2026-10-07", 5), HcSleepStageKind.LIGHT),
                HcSleepStage(ms("2026-10-07", 5), ms("2026-10-07", 7), HcSleepStageKind.REM),
            ),
        )
        val longNap = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-07", 13),
            endEpochMs = ms("2026-10-07", 16, 30), // 3.5 h — passes the nap filter
            stages = listOf(
                HcSleepStage(ms("2026-10-07", 13), ms("2026-10-07", 15), HcSleepStageKind.DEEP),
            ),
        )
        val droppedNap = HealthConnectMapping.toSleepSession(
            startEpochMs = ms("2026-10-07", 18),
            endEpochMs = ms("2026-10-07", 18, 45),
            stages = emptyList(),
        )
        val agg = HealthConnectMapping.aggregateSleep(listOf(main, longNap, droppedNap), utc)
        assertEquals(setOf(wake), agg.keys)
        assertEquals(8 * 60 + 210, agg[wake]!!.sleepMinutes)
        assertEquals(120, agg[wake]!!.deepMinutes) // longNap 13:00–15:00
        assertEquals(120, agg[wake]!!.remMinutes)
        assertEquals(6 * 60, agg[wake]!!.lightMinutes)
    }

    // ---- mergeIntoEntry ----

    private val day = LocalDate.parse("2026-10-07")
    private val nowMs = 5_000L

    @Test
    fun `merge into a missing row creates a new entry with hc sources`() {
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = null,
            day = day,
            rhr = 51.4,
            hrv = 62.0,
            sleep = HcSleepAggregate(sleepMinutes = 460, deepMinutes = 90, remMinutes = 110, lightMinutes = 260),
            nowMs = nowMs,
        )
        assertEquals("2026-10-07", merged.date)
        assertEquals(51, merged.restingHr) // rounded
        assertEquals(62.0, merged.hrvMs!!, 1e-9)
        assertEquals(460, merged.sleepMinutes)
        assertEquals(90, merged.deepMinutes)
        assertEquals(110, merged.remMinutes)
        assertEquals(260, merged.lightMinutes)
        assertEquals("hc", merged.sourceRhr)
        assertEquals("hc", merged.sourceHrv)
        assertEquals("hc", merged.sourceSleep)
        assertFalse(merged.manuallyEdited)
        assertEquals(nowMs, merged.updatedAt)
        assertTrue(merged.dirty)
        assertNull(merged.exhaustionLevel)
        assertNull(merged.note)
        assertNull(merged.score)
    }

    @Test
    fun `merge with only one metric type fills just that type`() {
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = null,
            day = day,
            rhr = 52.0,
            hrv = null,
            sleep = null,
            nowMs = nowMs,
        )
        assertEquals(52, merged.restingHr)
        assertNull(merged.hrvMs)
        assertNull(merged.sleepMinutes)
        assertNull(merged.sourceHrv)
        assertNull(merged.sourceSleep)
        assertEquals("hc", merged.sourceRhr)
        assertTrue(merged.dirty)
    }

    @Test
    fun `merge fills only null fields of an untouched row`() {
        val existing = entry() // all metric fields null, subjective fields set
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 50.0,
            hrv = 65.0,
            sleep = HcSleepAggregate(sleepMinutes = 450, deepMinutes = 80, remMinutes = 100, lightMinutes = 270),
            nowMs = nowMs,
        )
        assertEquals(50, merged.restingHr)
        assertEquals(65.0, merged.hrvMs!!, 1e-9)
        assertEquals(450, merged.sleepMinutes)
        assertEquals("hc", merged.sourceRhr)
        assertEquals("hc", merged.sourceHrv)
        assertEquals("hc", merged.sourceSleep)
        // subjective + score cache carried over untouched
        assertEquals(6, merged.exhaustionLevel)
        assertEquals(4, merged.muscleSoreness)
        assertEquals(3, merged.stressLevel)
        assertEquals("felt good", merged.note)
        assertEquals(71.5, merged.score!!, 1e-9)
        assertEquals("fair", merged.state)
        assertEquals("{\"sleep\":60}", merged.componentScoresJson)
        assertTrue(merged.dirty)
        assertEquals(nowMs, merged.updatedAt)
    }

    @Test
    fun `a manually edited row is never touched`() {
        val existing = entry(
            restingHr = 58,
            sourceRhr = "manual",
            manuallyEdited = true,
            updatedAt = 1_234,
            dirty = false,
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 50.0,
            hrv = 65.0,
            sleep = HcSleepAggregate(sleepMinutes = 450, deepMinutes = 80, remMinutes = 100, lightMinutes = 270),
            nowMs = nowMs,
        )
        // byte-for-byte the same row — HC import is a no-op on manual rows
        assertEquals(existing, merged)
        assertEquals(1_234, merged.updatedAt)
        assertFalse(merged.dirty)
    }

    @Test
    fun `stale HC values are refreshed on re-import`() {
        val existing = entry(
            restingHr = 52,
            hrvMs = 60.0,
            sleepMinutes = 420,
            deepMinutes = 70,
            remMinutes = 90,
            lightMinutes = 260,
            sourceRhr = "hc",
            sourceHrv = "hc",
            sourceSleep = "hc",
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 49.0,
            hrv = 64.0,
            sleep = HcSleepAggregate(sleepMinutes = 470, deepMinutes = 95, remMinutes = 120, lightMinutes = 255),
            nowMs = nowMs,
        )
        assertEquals(49, merged.restingHr)
        assertEquals(64.0, merged.hrvMs!!, 1e-9)
        assertEquals(470, merged.sleepMinutes)
        assertEquals(95, merged.deepMinutes)
        assertEquals(120, merged.remMinutes)
        assertEquals(255, merged.lightMinutes)
        assertTrue(merged.dirty)
        assertEquals(nowMs, merged.updatedAt)
    }

    @Test
    fun `identical HC values leave the row unchanged and clean`() {
        val existing = entry(
            restingHr = 52,
            hrvMs = 60.0,
            sleepMinutes = 420,
            deepMinutes = 70,
            remMinutes = 90,
            lightMinutes = 260,
            sourceRhr = "hc",
            sourceHrv = "hc",
            sourceSleep = "hc",
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 52.0,
            hrv = 60.0,
            sleep = HcSleepAggregate(sleepMinutes = 420, deepMinutes = 70, remMinutes = 90, lightMinutes = 260),
            nowMs = nowMs,
        )
        assertEquals(existing, merged)
        assertEquals(1_000, merged.updatedAt) // untouched timestamp
        assertFalse(merged.dirty)
    }

    @Test
    fun `a manual field source blocks the overwrite even on a non-manual row`() {
        val existing = entry(
            restingHr = 58,
            sourceRhr = "manual",
            manuallyEdited = false, // defensive: shouldn't co-occur, but must hold
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 50.0,
            hrv = 65.0,
            sleep = null,
            nowMs = nowMs,
        )
        assertEquals(58, merged.restingHr) // manual wins
        assertEquals("manual", merged.sourceRhr) // source stays manual
        assertEquals(65.0, merged.hrvMs!!, 1e-9) // null field still filled
    }

    @Test
    fun `absent metric types leave their fields untouched`() {
        val existing = entry(
            hrvMs = 55.0,
            sourceHrv = "hc",
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 51.0,
            hrv = null, // no HRV data this window
            sleep = null,
            nowMs = nowMs,
        )
        assertEquals(51, merged.restingHr)
        assertEquals(55.0, merged.hrvMs!!, 1e-9)
        assertNull(merged.sleepMinutes)
        assertTrue(merged.dirty) // something DID change (the resting HR)
    }

    @Test
    fun `a partial sleep aggregate rewrites the whole sleep group`() {
        val existing = entry(
            sleepMinutes = 480,
            deepMinutes = null, // partially recorded row
            remMinutes = null,
            lightMinutes = 300,
            sourceSleep = "hc",
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = null,
            hrv = null,
            sleep = HcSleepAggregate(sleepMinutes = 470, deepMinutes = 95, remMinutes = 120, lightMinutes = 255),
            nowMs = nowMs,
        )
        assertEquals(470, merged.sleepMinutes)
        assertEquals(95, merged.deepMinutes)
        assertEquals(120, merged.remMinutes)
        assertEquals(255, merged.lightMinutes)
        assertEquals("hc", merged.sourceSleep)
        assertTrue(merged.dirty)
    }

    @Test
    fun `a previously dirty row stays dirty through a no-op merge`() {
        val existing = entry(
            restingHr = 52,
            sourceRhr = "hc",
            dirty = true,
            updatedAt = 1_234,
        )
        val merged = HealthConnectMapping.mergeIntoEntry(
            existing = existing,
            day = day,
            rhr = 52.0,
            hrv = null,
            sleep = null,
            nowMs = nowMs,
        )
        assertEquals(existing, merged)
        assertTrue(merged.dirty)
        assertEquals(1_234, merged.updatedAt)
    }
}
