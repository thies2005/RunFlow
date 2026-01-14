package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching analytics stats locally.
 * Uses a single-row table pattern.
 */
@Entity(tableName = "analytics_stats")
data class AnalyticsStatsEntity(
    @PrimaryKey
    val id: String = "analytics_stats", // Single row pattern
    val statsJson: String, // Serialized AnalyticsStats
    val cachedAt: Long = System.currentTimeMillis()
)
