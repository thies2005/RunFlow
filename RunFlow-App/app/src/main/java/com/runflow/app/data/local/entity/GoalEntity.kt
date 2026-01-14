package com.runflow.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for caching goals locally.
 * Mirrors the Goal model from the API.
 * Note: Workouts are stored separately in WorkoutEntity and linked by goalId.
 */
@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val name: String,
    val raceType: String, // Stored as string, converted from RaceType enum
    val raceDate: String,
    val targetTime: Int?,
    val currentVdot: Float?,
    val predictedTime: Int?,
    val weeklyMileageGoal: Float?,
    val planWeeks: Int,
    val runsPerWeek: Int,
    val longRunDay: Int,
    val easyDay1: Int,
    val easyDay2: Int,
    val tempoDay: Int,
    val intervalDay: Int,
    val restDay: Int,
    val isActive: Boolean,
    val isCompleted: Boolean,
    val createdAt: String,
    val updatedAt: String,
    val cachedAt: Long = System.currentTimeMillis()
)
