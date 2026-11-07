package com.runflow2.app.data.health

internal data class HealthPage<T>(val records: List<T>, val nextToken: String?)

/** Consume every page, treating both null and blank tokens as end of results. */
internal suspend fun <T> collectHealthPages(read: suspend (String?) -> HealthPage<T>): List<T> {
    val records = mutableListOf<T>()
    val seen = mutableSetOf<String>()
    var token: String? = null
    do {
        val page = read(token)
        records += page.records
        token = page.nextToken?.takeIf { it.isNotBlank() }
        check(token == null || seen.add(token)) { "Health Connect returned a repeated page token" }
    } while (token != null)
    return records
}

/** First observed grant is an upper bound on HC's actual first-grant time. */
internal fun healthReadStart(nowMs: Long, firstGrantObservedAt: Long, history: Boolean): Long {
    if (history) return 0L
    val anchor = firstGrantObservedAt.takeIf { it in 1..nowMs } ?: nowMs
    return (anchor - 30L * 24 * 3600 * 1000).coerceAtLeast(0)
}
