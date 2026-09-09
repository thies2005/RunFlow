package com.runflow2.app

import com.runflow2.app.core.util.AppLog
import com.runflow2.app.core.util.Level
import com.runflow2.app.core.util.LogEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AppLogTest {

    @Before
    fun reset() = AppLog.clear()

    @Test
    fun `entries are retained newest-last`() {
        AppLog.i("Sync", "first")
        AppLog.w("Net", "second")

        val recent = AppLog.recent()
        assertEquals(2, recent.size)
        assertEquals("first", recent[0].message)
        assertEquals("second", recent[1].message)
    }

    @Test
    fun `newest-first view reverses and caps the count`() {
        repeat(30) { AppLog.d("Sync", "entry $it") }

        val newest = AppLog.recentNewestFirst(10)
        assertEquals(10, newest.size)
        assertEquals("entry 29", newest.first().message)
        assertEquals("entry 20", newest.last().message)
    }

    @Test
    fun `ring buffer drops the oldest entries beyond the cap`() {
        repeat(AppLog.MAX_ENTRIES + 25) { AppLog.i("Sync", "entry $it") }

        val recent = AppLog.recent()
        assertEquals(AppLog.MAX_ENTRIES, recent.size)
        assertEquals("entry 25", recent.first().message)
        assertEquals("entry ${AppLog.MAX_ENTRIES + 24}", recent.last().message)
    }

    @Test
    fun `error flag follows the level`() {
        AppLog.i("Sync", "fine")
        AppLog.e("Sync", "broken")

        val recent = AppLog.recent()
        assertFalse(recent[0].isError)
        assertTrue(recent[1].isError)
    }

    @Test
    fun `throwables are captured as strings`() {
        AppLog.e("Sync", "failed", IllegalStateException("boom"))

        val entry: LogEntry = AppLog.recent().single()
        assertTrue(entry.error!!.contains("boom"))
    }

    @Test
    fun `clear empties the buffer`() {
        AppLog.i("Sync", "one")
        AppLog.e("Net", "two")

        AppLog.clear()

        assertTrue(AppLog.recent().isEmpty())
    }

    @Test
    fun `level constants mirror android values`() {
        // Log.println receives these ints directly — they must stay in sync.
        assertEquals(3, Level.DEBUG)
        assertEquals(4, Level.INFO)
        assertEquals(5, Level.WARN)
        assertEquals(6, Level.ERROR)
    }
}
