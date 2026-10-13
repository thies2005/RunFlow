package com.runflow2.app

import com.runflow2.app.data.net.AnalyticsStatsDto
import com.runflow2.app.data.net.Api
import com.runflow2.app.domain.analytics.ServerMetricSnapshot
import com.runflow2.app.domain.analytics.ServerMetrics
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

/**
 * Freshness + preference of the server's two-metric snapshot: online the
 * server (/api/mobile/v1/analytics/stats, same computation as the web) is the
 * source of truth while fresh; stale or absent, the on-device engine
 * (AnalyticsEngine — the offline port) wins. Also pins the JSON parsing of the
 * payload's new fields.
 */
class ServerMetricsTest {

    private val now = 1_760_000_000_000L

    private val fresh = ServerMetricSnapshot(
        bestEffortVdot = 53.4,
        aerobicVo2max = 51.2,
        computedAtMs = now - ServerMetrics.FRESHNESS_MS / 2,
    )

    // ---- preference: a fresh server value wins, verbatim ----

    @Test
    fun `fresh server vdot is preferred and returned verbatim`() {
        assertEquals(53.4, ServerMetrics.freshBestEffortVdot(fresh, now)!!, 0.0)
    }

    @Test
    fun `fresh aerobic vo2max is preferred and returned verbatim`() {
        assertEquals(51.2, ServerMetrics.freshAerobicVo2max(fresh, now)!!, 0.0)
    }

    @Test
    fun `resolution never blends — the server value is used whole or not at all`() {
        // the resolvers take no local input, so mixing/averaging the sources is
        // structurally impossible: the output is either the server's number or null
        assertEquals(53.4, ServerMetrics.freshBestEffortVdot(fresh, now)!!, 0.0)
        assertEquals(51.2, ServerMetrics.freshAerobicVo2max(fresh, now)!!, 0.0)
    }

    // ---- stale or absent: fall back to the local engine (null server value) ----

    @Test
    fun `stale snapshot falls back to local`() {
        val stale = fresh.copy(computedAtMs = now - ServerMetrics.FRESHNESS_MS - 1)
        assertNull(ServerMetrics.freshBestEffortVdot(stale, now))
        assertNull(ServerMetrics.freshAerobicVo2max(stale, now))
    }

    @Test
    fun `snapshot exactly at the freshness boundary is still fresh`() {
        val edge = fresh.copy(computedAtMs = now - ServerMetrics.FRESHNESS_MS)
        assertEquals(53.4, ServerMetrics.freshBestEffortVdot(edge, now)!!, 0.0)
        assertEquals(51.2, ServerMetrics.freshAerobicVo2max(edge, now)!!, 0.0)
    }

    @Test
    fun `absent snapshot falls back to local`() {
        assertNull(ServerMetrics.freshBestEffortVdot(null, now))
        assertNull(ServerMetrics.freshAerobicVo2max(null, now))
    }

    @Test
    fun `future timestamp counts as absent, not eternally fresh`() {
        val future = fresh.copy(computedAtMs = now + 1)
        assertNull(ServerMetrics.freshBestEffortVdot(future, now))
        assertNull(ServerMetrics.freshAerobicVo2max(future, now))
    }

    @Test
    fun `server reporting no qualifying run (0) falls back to local vdot`() {
        val none = fresh.copy(bestEffortVdot = 0.0)
        assertNull(ServerMetrics.freshBestEffortVdot(none, now))
        // the aerobic value of the same snapshot stays usable
        assertEquals(51.2, ServerMetrics.freshAerobicVo2max(none, now)!!, 0.0)
    }

    @Test
    fun `server reporting no aerobic value falls back to null`() {
        assertNull(ServerMetrics.freshAerobicVo2max(fresh.copy(aerobicVo2max = null), now))
        assertNull(ServerMetrics.freshAerobicVo2max(fresh.copy(aerobicVo2max = 0.0), now))
    }

    // ---- JSON parsing of the new fields ----

    @Test
    fun `stats payload parses the two-metric fields`() {
        val dto = Api.json.decodeFromString(
            AnalyticsStatsDto.serializer(),
            """{"currentWeekMileage":42.5,"effectiveVO2max":51.2,"rawVO2max":50.9,
               "bestEffortVdot":53.4,"aerobicVo2max":51.2,
               "computedAt":"2026-10-13T09:30:00.000Z"}""".trimIndent(),
        )
        assertEquals(53.4, dto.bestEffortVdot!!, 0.0)
        assertEquals(51.2, dto.aerobicVo2max!!, 0.0)
        assertEquals(
            Instant.parse("2026-10-13T09:30:00.000Z").toEpochMilli(),
            Api.parseInstant(dto.computedAt),
        )
    }

    @Test
    fun `explicit null aerobic value parses to null`() {
        val dto = Api.json.decodeFromString(
            AnalyticsStatsDto.serializer(),
            """{"bestEffortVdot":48.0,"aerobicVo2max":null,"computedAt":"2026-10-13T09:30:00.000Z"}""",
        )
        assertEquals(48.0, dto.bestEffortVdot!!, 0.0)
        assertNull(dto.aerobicVo2max)
    }

    @Test
    fun `legacy payload without the new fields parses to nulls (older server)`() {
        val dto = Api.json.decodeFromString(
            AnalyticsStatsDto.serializer(),
            """{"currentWeekMileage":42.5,"effectiveVO2max":44.0,"hrMax":190}""",
        )
        assertNull(dto.bestEffortVdot)
        assertNull(dto.aerobicVo2max)
        assertNull(dto.computedAt)
    }
}
