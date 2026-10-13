package com.runflow2.app.domain.analytics

/**
 * The server's two-metric computation (GET /api/mobile/v1/analytics/stats —
 * the same shared helper behind the web's /api/analytics/stats):
 *  - [bestEffortVdot]: performance VDOT with the correction factor applied —
 *    THE planning metric (training paces, plan creation, projections). 0 means
 *    the server found no qualifying run (>= 5 km within 90 days).
 *  - [aerobicVo2max]: HR-based fitness trend, display only; null when the
 *    server has no value.
 *  - [computedAtMs]: epoch millis of the server's computation — the freshness
 *    anchor for the on-device cache.
 */
data class ServerMetricSnapshot(
    val bestEffortVdot: Double,
    val aerobicVo2max: Double?,
    val computedAtMs: Long,
)

/** Which source a displayed metric value came from (UI must never mix them). */
enum class MetricSource { SERVER, LOCAL }

object ServerMetrics {

    /**
     * How long a server snapshot stays authoritative. The server recomputes
     * whenever its data changes and its own cache lives 24 h, so a snapshot
     * older than 24 h means the device has been offline for at least that
     * long — long enough for offline-recorded activities to move the metrics
     * the local engine sees.
     */
    const val FRESHNESS_MS = 24L * 60 * 60 * 1000

    /**
     * The server's planning VDOT while [snapshot] is fresh, else null — the
     * caller then falls back to the on-device engine (AnalyticsEngine's best
     * effort, the offline port). The value is returned VERBATIM: the two
     * sources are never blended or averaged. A snapshot of 0 (server found no
     * qualifying run) yields null too, giving the local engine its say.
     */
    fun freshBestEffortVdot(snapshot: ServerMetricSnapshot?, nowMs: Long): Double? =
        snapshot
            ?.takeIf { nowMs - it.computedAtMs in 0..FRESHNESS_MS }
            ?.bestEffortVdot
            ?.takeIf { it > 0.0 }

    /**
     * The server's aerobic-fitness trend value while fresh (> 0), else null —
     * there is no local counterpart to fall back to (the on-device engine has
     * no HR-based calculation), so absent means absent.
     */
    fun freshAerobicVo2max(snapshot: ServerMetricSnapshot?, nowMs: Long): Double? =
        snapshot
            ?.takeIf { nowMs - it.computedAtMs in 0..FRESHNESS_MS }
            ?.aerobicVo2max
            ?.takeIf { it > 0.0 }
}
