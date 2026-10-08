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
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = 0L, now = now, offlineModeChosen = false)
        )
    }

    @Test
    fun `never shows when signed in`() {
        assertFalse(
            LoginPrompt.shouldShow(loggedIn = true, dismissed = false, remindAt = 0L, now = now, offlineModeChosen = false)
        )
    }

    @Test
    fun `never shows after permanent dismissal`() {
        assertFalse(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = true, remindAt = 0L, now = now, offlineModeChosen = false)
        )
    }

    @Test
    fun `never shows when offline mode was chosen`() {
        assertFalse(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = 0L, now = now, offlineModeChosen = true)
        )
    }

    @Test
    fun `stays hidden while the snooze is in the future`() {
        val remindAt = LoginPrompt.remindInAWeek(now)
        assertFalse(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = now, offlineModeChosen = false)
        )
    }

    @Test
    fun `returns once the snooze elapsed`() {
        val remindAt = LoginPrompt.remindInAWeek(now)
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = remindAt, offlineModeChosen = false)
        )
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = remindAt + 1, offlineModeChosen = false)
        )
    }

    @Test
    fun `offline mode suppresses even once the snooze elapsed`() {
        val remindAt = LoginPrompt.remindInAWeek(now)
        assertFalse(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = remindAt, now = remindAt + 1, offlineModeChosen = true)
        )
    }

    @Test
    fun `offline mode suppresses nothing once undone by login`() {
        // offlineModeChosen = false is the state restored after a login; the
        // flag alone must never force the nudge.
        assertTrue(
            LoginPrompt.shouldShow(loggedIn = false, dismissed = false, remindAt = 0L, now = now, offlineModeChosen = false)
        )
    }

    @Test
    fun `remind in a week is exactly seven days`() {
        assertEquals(now + 7L * 24 * 60 * 60 * 1000, LoginPrompt.remindInAWeek(now))
    }
}
