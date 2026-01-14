package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "activities")
data class ActivityEntity(
    @PrimaryKey
    val id: String,
    val stravaId: Long,
    val name: String,
    val type: String, // RUN, RIDE, etc.
    val startDate: String, // ISO String
    val distance: Float, // meters
    val movingTime: Int, // seconds
    val averageHr: Float?,
    val vdot: Float?,    // estimatedVdot
    val isSyncing: Boolean = false // Metadata for local state
)
