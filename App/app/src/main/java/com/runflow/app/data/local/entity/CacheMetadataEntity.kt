package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for tracking cache metadata.
 * Stores last update timestamps for each cache type to determine staleness.
 */
@Entity(tableName = "cache_metadata")
data class CacheMetadataEntity(
    @PrimaryKey
    val cacheType: String, // e.g., "dashboard", "activities", "workouts", "goals", "user_profile"
    val lastUpdatedAt: Long = System.currentTimeMillis(),
    val isStale: Boolean = false
)
