package com.runflow2.app.core.util

import org.junit.Assert.*
import org.junit.Test

class DiagnosticsFormatterTest {
    @Test fun `formats every event in time order with full stack and removes secrets`() {
        val entries = (0 until 300).reversed().map { i ->
            LogEntry(i.toLong() * 1000, Level.ERROR, "Sync", "event $i", if (i == 5) "stack line 1\nAuthorization: Bearer top-secret\nrefresh_token=refresh-secret\npassword=pass-secret\naccessToken: \"access-secret\"\nstack line 2" else null)
        }
        val report = formatDiagnostics(DiagnosticsInfo("2.8.2", "https://example.com", "user-1", "Thies", "failed", 20, 2), entries)
        assertTrue(report.contains("Events (300, oldest first)"))
        assertTrue(report.indexOf("event 0\n") < report.indexOf("event 299\n"))
        assertTrue(report.contains("stack line 1") && report.contains("stack line 2"))
        assertTrue(report.contains("20 pending, 2 failed"))
        listOf("top-secret", "refresh-secret", "pass-secret", "access-secret").forEach { assertFalse(report.contains(it)) }
    }
    @Test fun `large repeated stacks are exported once while every event remains`() {
        val stack = "trace-start\n" + "at example.Frame.method(Frame.kt:123)\n".repeat(400) + "trace-end"
        val entries = (0 until 300).map { LogEntry(it.toLong(), Level.ERROR, "Sync", "event $it", stack) }
        val report = formatDiagnostics(DiagnosticsInfo("2.8.2", "host", null, null, null, 300, 0), entries)
        assertEquals(300, Regex("\\[stack 1]").findAll(report).count())
        assertEquals(1, Regex("trace-start").findAll(report).count())
        assertTrue(report.contains("trace-end"))
        assertTrue(report.length < stack.length * 3)
    }
}
