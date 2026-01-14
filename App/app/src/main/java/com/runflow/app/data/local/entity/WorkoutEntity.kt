package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching workouts locally.
 * Mirrors the Workout model from the API.
 */
@Entity(tableName = "workouts")
data class WorkoutEntity(
    @PrimaryKey
    val id: String,
    val goalId: String,
    val scheduledDate: String,
    val workoutType: String, // Stored as string, converted from WorkoutType enum
    val description: String,
    val targetDistance: Float?,
    val targetDuration: Int?,
    val targetPace: Float?,
    val targetHrZone: Int?,
    val isCompleted: Boolean,
    val completedAt: String?,
    val linkedActivityId: String?,
    val phase: String, // Stored as string, converted from PlanPhase enum
    val order: Int,
    val notes: String?,
    val cachedAt: Long = System.currentTimeMillis()
)
