package com.runflow2.app.data.sync

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class RetryAfterTest {
    @Test fun `retry after accepts seconds and http date with safe fallback`() {
        val now = Instant.parse("2026-11-05T12:00:00Z").toEpochMilli()
        assertEquals(now + 120_000, retryAfterUntil("120", now))
        assertEquals(now + 180_000, retryAfterUntil("Thu, 5 Nov 2026 12:03:00 GMT", now))
        assertEquals(now + 60_000, retryAfterUntil("broken", now))
        assertEquals(now + 60_000, retryAfterUntil(null, now))
        assertEquals(now + 120_000, retryAfterUntil(null, now, """{"details":{"retryAfter":120}}"""))
        assertEquals(now + 180_000, retryAfterUntil("180", now, """{"details":{"retryAfter":120}}"""))
        assertEquals(now + 60_000, retryAfterUntil(null, now, """{"details":{"retryAfter":-1}}"""))
        assertEquals(now + 60_000, retryAfterUntil(null, now, "bad JSON"))
    }
}
