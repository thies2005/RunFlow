package com.runflow.app.data.cache

/**
 * Enum defining cache types with their TTL (Time-To-Live) values in milliseconds.
 */
enum class CacheType(val ttlMs: Long) {
    DASHBOARD(5 * 60 * 1000L),        // 5 minutes
    ACTIVITIES(30 * 60 * 1000L),       // 30 minutes
    WORKOUTS(15 * 60 * 1000L),         // 15 minutes
    GOALS(15 * 60 * 1000L),            // 15 minutes
    USER_PROFILE(60 * 60 * 1000L),     // 1 hour
    ANALYTICS_STATS(15 * 60 * 1000L);  // 15 minutes

    companion object {
        fun fromString(value: String): CacheType? {
            return entries.find { it.name.equals(value, ignoreCase = true) }
        }
    }
}
