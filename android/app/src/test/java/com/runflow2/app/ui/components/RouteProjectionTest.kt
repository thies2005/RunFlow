package com.runflow2.app.ui.components

import org.junit.Assert.*
import org.junit.Test

class RouteProjectionTest {
    @Test fun `invalid fixes retain original stream progress for colors and scrubber`() {
        val samples = routeSamples(listOf(0.0 to 0.0, Double.NaN to 0.0, 0.0 to 2.0, 0.0 to 3.0))
        assertEquals(listOf(0f, 2f / 3f, 1f), samples.map { it.fraction })
        assertEquals(listOf(0.0 to 0.0, 0.0 to 2.0, 0.0 to 3.0), samples.map { it.point })
    }
    @Test fun `invalid fixes are rejected and zero coordinates are retained`() {
        assertEquals(listOf(0.0 to 0.0), validRoute(listOf(0.0 to 0.0, 91.0 to 0.0, 0.0 to 181.0, Double.NaN to 0.0)))
        assertTrue(projectRoute(emptyList(), 400.0, 220.0).isEmpty())
        assertTrue(projectRoute(listOf(0.0 to 0.0), 400.0, 220.0).isEmpty())
    }
    @Test fun `degenerate and straight routes are centered and finite`() {
        assertEquals(listOf(200.0 to 110.0, 200.0 to 110.0), projectRoute(listOf(2.0 to 3.0, 2.0 to 3.0), 400.0, 220.0))
        val p = projectRoute(listOf(0.0 to 0.0, 0.0 to 1.0), 400.0, 220.0)
        assertEquals(28.0, p.first().first, 1e-8)
        assertEquals(110.0, p.first().second, 1e-8)
        assertEquals(372.0, p.last().first, 1e-8)
    }
    @Test fun `loops remain closed and north is up`() {
        val p = projectRoute(listOf(45.0 to 25.0, 45.01 to 25.01, 45.0 to 25.02, 45.0 to 25.0), 400.0, 220.0)
        assertEquals(p.first(), p.last())
        assertTrue(p[1].second < p[0].second)
    }
    @Test fun `high latitude routes preserve local aspect ratio`() {
        val p = projectRoute(listOf(59.99 to 10.0, 60.01 to 10.04), 400.0, 220.0)
        assertEquals(1.0, (p[1].first - p[0].first) / (p[0].second - p[1].second), 1e-6)
    }
    @Test fun `date line crossing follows the short path`() {
        val p = projectRoute(listOf(0.0 to 179.99, .01 to -180.0, 0.0 to -179.99), 400.0, 220.0)
        assertTrue(p[0].first < p[1].first && p[1].first < p[2].first)
        assertEquals((p[2].first - p[0].first) / 2, p[0].second - p[1].second, .001)
    }
}
