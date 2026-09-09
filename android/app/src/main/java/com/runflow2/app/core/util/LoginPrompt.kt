package com.runflow2.app.core.util

/**
 * Pure decision logic for the sign-in nudge shown on the dashboard. Kept free
 * of Android/DataStore dependencies so it is unit-testable on the JVM.
 */
object LoginPrompt {
    const val WEEK_MS: Long = 7L * 24 * 60 * 60 * 1000

    /** Snooze target for "Remind in a week". */
    fun remindInAWeek(now: Long): Long = now + WEEK_MS

    /**
     * The nudge is shown only when signed out, not permanently dismissed, and
     * any "remind me later" snooze has elapsed.
     */
    fun shouldShow(
        loggedIn: Boolean,
        dismissed: Boolean,
        remindAt: Long,
        now: Long,
    ): Boolean = !loggedIn && !dismissed && now >= remindAt
}
