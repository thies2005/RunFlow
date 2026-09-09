package com.runflow2.app

import com.runflow2.app.core.util.LoginPrompt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginPromptTest {

    private val now = 1_700_000_000_000L

    @Test
    fun `shows when signed out and never snoozed or dismissed`() {
        assertTrue(LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = 0L, now = now))
    }

    @Test
    fun `never shows when signed in`() {
        assertFalse(LoginPrompt.shouldShow(loggedIn = true, dismissed = false, remindAt = 0L, now = now))
    }

    @Test
    fun `never shows after permanent dismissal`() {
        assertFalse(LoginPrompt.shouldShow(loggedIn = false, dismissed = true, remindAt = 0L, now = now))
    }

    @Test
    fun `stays hidden while the snooze is in the future`() {
        val remindAt = LoginPrompt.remindInAWeek(now)
        assertFalse(LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = now))
    }

    @Test
    fun `returns once the snooze elapsed`() {
        val remindAt = LoginPrompt.remindInAWeek(now)
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = remindAt)
        )
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = remindAt + 1)
        )
    }

    @Test
    fun `remind in a week is exactly seven days`() {
        assertEquals(now + 7L * 24 * 60 * 60 * 1000, LoginPrompt.remindInAWeek(now))
    }
}
