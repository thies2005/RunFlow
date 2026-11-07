package com.runflow2.app

import com.runflow2.app.data.health.HealthPage
import com.runflow2.app.data.health.collectHealthPages
import com.runflow2.app.data.health.healthReadStart
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class HealthConnectPaginationTest {
    @Test fun `collects every page and stops on empty token`() = runBlocking {
        val calls = mutableListOf<String?>()
        val values = collectHealthPages<Int> { token ->
            calls += token
            when (token) {
                null -> HealthPage(listOf(1, 2), "next")
                else -> HealthPage(listOf(3), "")
            }
        }
        assertEquals(listOf(1, 2, 3), values)
        assertEquals(listOf(null, "next"), calls)
    }

    @Test fun `repeated token fails rather than looping`() {
        assertThrows(IllegalStateException::class.java) {
            runBlocking { collectHealthPages { HealthPage(listOf(1), "same") } }
        }
    }
    @Test fun `lookback remains anchored to first observed grant`() {
        val day = 86_400_000L
        assertEquals(70 * day, healthReadStart(200 * day, 100 * day, false))
        assertEquals(70 * day, healthReadStart(300 * day, 100 * day, false))
        assertEquals(0L, healthReadStart(300 * day, 100 * day, true))
        assertEquals(0L, healthReadStart(10 * day, 0L, false))
    }
}
