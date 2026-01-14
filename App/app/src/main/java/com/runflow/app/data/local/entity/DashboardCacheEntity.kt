package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching dashboard data as a JSON blob.
 * Uses a single-row table pattern with a constant key.
 */
@Entity(tableName = "dashboard_cache")
data class DashboardCacheEntity(
    @PrimaryKey
    val id: String = "dashboard", // Single row pattern
    val statsJson: String, // Serialized DashboardStats
    val recentActivitiesJson: String, // Serialized List<Activity>
    val goalsJson: String, // Serialized List<Goal>
    val syncStatusJson: String, // Serialized SyncStatus
    val userJson: String, // Serialized User
    val cachedAt: Long = System.currentTimeMillis()
)
