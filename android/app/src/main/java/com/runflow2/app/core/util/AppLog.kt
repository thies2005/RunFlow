package com.runflow2.app.core.util

import android.util.Log

/**
 * Levels mirror android.util.Log's int values so they feed Log.println
 * directly, without the data class ever referencing android classes — the
 * ring buffer then stays unit-testable on the JVM.
 */
object Level {
    const val DEBUG = 3
    const val INFO = 4
    const val WARN = 5
    const val ERROR = 6
}

data class LogEntry(
    val at: Long,
    val level: Int,
    val tag: String,
    val message: String,
    val error: String? = null,
) {
    val isError: Boolean get() = level >= Level.ERROR
}

/**
 * Central logging facade for the app.
 *
 * Every call goes to logcat (tag prefix "RunFlow/") so `adb logcat -s RunFlow`
 * shows the full story, and into a small in-memory ring buffer that the
 * Settings → Diagnostics screen renders — sync and network failures are then
 * visible on the device itself, without a laptop attached.
 *
 * JVM unit tests: android.util.Log is not mocked, so the logcat write is
 * wrapped in runCatching; the ring buffer logic still behaves normally.
 */
object AppLog {
    const val MAX_ENTRIES = 300

    private val buffer = ArrayDeque<LogEntry>(MAX_ENTRIES)

    fun d(tag: String, message: String) = record(Level.DEBUG, tag, message, null)
    fun i(tag: String, message: String) = record(Level.INFO, tag, message, null)
    fun w(tag: String, message: String, error: Throwable? = null) = record(Level.WARN, tag, message, error)
    fun e(tag: String, message: String, error: Throwable? = null) = record(Level.ERROR, tag, message, error)

    private fun record(level: Int, tag: String, message: String, error: Throwable?) {
        val entry = LogEntry(
            at = System.currentTimeMillis(),
            level = level,
            tag = tag,
            message = message,
            error = error?.toString(),
        )
        offer(entry)
        runCatching {
            val line = if (error != null) "$message — $error" else message
            Log.println(level, "RunFlow/$tag", line)
        }
    }

    private fun offer(entry: LogEntry) {
        synchronized(buffer) {
            if (buffer.size >= MAX_ENTRIES) buffer.removeFirst()
            buffer.addLast(entry)
        }
    }

    /** Newest-last snapshot of the retained entries. */
    fun recent(): List<LogEntry> = synchronized(buffer) { buffer.toList() }

    /** Newest entries first, capped at [count]. */
    fun recentNewestFirst(count: Int = 50): List<LogEntry> =
        synchronized(buffer) { buffer.toList().asReversed().take(count) }

    fun clear() = synchronized(buffer) { buffer.clear() }
}
