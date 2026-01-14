package com.runflow.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Goal(
    val id: String,
    val userId: String,
    val name: String,
    val raceType: RaceType,
    val raceDate: String,
    val targetTime: Int?,
    val currentVdot: Float?,
    val predictedTime: Int?,
    val weeklyMileageGoal: Float?,
    val planWeeks: Int,
    val runsPerWeek: Int,
    val longRunDay: Int = 0,
    val easyDay1: Int = 1,
    val easyDay2: Int = 3,
    val tempoDay: Int = 2,
    val intervalDay: Int = 4,
    val restDay: Int = 6,
    val isActive: Boolean,
    val isCompleted: Boolean = false,
    val workouts: List<Workout>,
    val createdAt: String,
    val updatedAt: String
)

/**
 * Race distance types.
 * Matches the backend RaceType enum from Prisma schema.
 */
@Serializable
enum class RaceType {
    @SerialName("FIVE_K")
    FIVE_K,

    @SerialName("TEN_K")
    TEN_K,

    @SerialName("HALF_MARATHON")
    HALF_MARATHON,

    @SerialName("MARATHON")
    MARATHON;

    /**
     * Display name for UI.
     */
    val displayName: String
        get() = when (this) {
            FIVE_K -> "5K"
            TEN_K -> "10K"
            HALF_MARATHON -> "Half Marathon"
            MARATHON -> "Marathon"
        }

    /**
     * Race distance in meters.
     */
    val distanceMeters: Float
        get() = when (this) {
            FIVE_K -> 5000f
            TEN_K -> 10000f
            HALF_MARATHON -> 21097.5f
            MARATHON -> 42195f
        }

    companion object {
        /**
         * Parse from string value with backward compatibility support.
         * Handles legacy K5/K10 values from older API versions.
         */
        fun fromValue(value: String?): RaceType? = when (value?.uppercase()) {
            "FIVE_K", "5K", "K5" -> FIVE_K
            "TEN_K", "10K", "K10" -> TEN_K
            "HALF_MARATHON" -> HALF_MARATHON
            "MARATHON" -> MARATHON
            else -> null
        }
    }
}

@Serializable
data class CreateGoalRequest(
    val name: String,
    val raceType: RaceType,
    val raceDate: String,
    val targetTime: Int?,
    val weeklyMileageGoal: Float?,
    val planWeeks: Int,
    val runsPerWeek: Int
)

@Serializable
data class UpdateGoalRequest(
    val name: String? = null,
    val raceDate: String? = null,
    val targetTime: Int? = null,
    val weeklyMileageGoal: Float? = null
)

@Serializable
data class GoalsResponse(
    val goals: List<Goal>
)

@Serializable
data class MarathonShape(
    val shape: Float = 0f,
    val mileageScore: Float = 0f,
    val longRunScore: Float = 0f,
    val crossTrainingScore: Float = 0f,
    val score: Float? = null,
    val prediction: Int? = null,
    val confidence: Float? = null,
    val details: ShapeDetails? = null
)

@Serializable
data class ShapeDetails(
    val avgWeeklyKm: Float = 0f,
    val targetWeeklyKm: Float = 0f,
    val longRunPoints: Float = 0f,
    val targetPoints: Float = 0f,
    val crossTrainingMinutes: Float? = 0f
)
