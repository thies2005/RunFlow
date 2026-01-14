package com.runflow.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Workout(
    val id: String,
    val goalId: String,
    val scheduledDate: String,
    val workoutType: WorkoutType,
    val description: String,
    val targetDistance: Float?,
    val targetDuration: Int?,
    val targetPace: Float?,
    val targetHrZone: Int?,
    val isCompleted: Boolean,
    val completedAt: String?,
    val linkedActivityId: String?,
    val phase: PlanPhase = PlanPhase.BASE,
    val order: Int = 0,
    val notes: String? = null
)

@Serializable
enum class WorkoutType {
    @SerialName("EASY")
    EASY,

    @SerialName("LONG_RUN")
    LONG_RUN,

    @SerialName("TEMPO")
    TEMPO,

    @SerialName("INTERVALS")
    INTERVALS,

    @SerialName("REPETITIONS")
    REPETITIONS,

    @SerialName("RECOVERY")
    RECOVERY,

    @SerialName("RACE")
    RACE,

    @SerialName("REST")
    REST,

    @SerialName("CROSS_TRAIN")
    CROSS_TRAIN,

    @SerialName("RIDE")
    RIDE,

    @SerialName("SWIM")
    SWIM,

    @SerialName("STRENGTH")
    STRENGTH,

    @SerialName("OTHER")
    OTHER;

    /**
     * Display name for UI.
     */
    val displayName: String
        get() = when (this) {
            EASY -> "Easy"
            LONG_RUN -> "Long Run"
            TEMPO -> "Tempo"
            INTERVALS -> "Intervals"
            REPETITIONS -> "Repetitions"
            RECOVERY -> "Recovery"
            RACE -> "Race"
            REST -> "Rest"
            CROSS_TRAIN -> "Cross Training"
            RIDE -> "Ride"
            SWIM -> "Swim"
            STRENGTH -> "Strength"
            OTHER -> "Other"
        }
}

@Serializable
enum class PlanPhase {
    @SerialName("BASE")
    BASE,

    @SerialName("BUILD")
    BUILD,

    @SerialName("PEAK")
    PEAK,

    @SerialName("TAPER")
    TAPER,

    @SerialName("RACE_WEEK")
    RACE_WEEK,

    @SerialName("RECOVERY")
    RECOVERY;

    val displayName: String
        get() = when (this) {
            BASE -> "Base"
            BUILD -> "Build"
            PEAK -> "Peak"
            TAPER -> "Taper"
            RACE_WEEK -> "Race Week"
            RECOVERY -> "Recovery"
        }
}

@Serializable
data class CreateWorkoutRequest(
    val goalId: String,
    val scheduledDate: String,
    val workoutType: WorkoutType,
    val description: String,
    val targetDistance: Float?,
    val targetDuration: Int?,
    val targetPace: Float?,
    val targetHrZone: Int?,
    val notes: String?
)

@Serializable
data class UpdateWorkoutRequest(
    val scheduledDate: String? = null,
    val workoutType: WorkoutType? = null,
    val description: String? = null,
    val targetDistance: Float? = null,
    val targetDuration: Int? = null,
    val targetPace: Float? = null,
    val targetHrZone: Int? = null,
    val isCompleted: Boolean? = null,
    val linkedActivityId: String? = null,
    val notes: String? = null
)

@Serializable
data class WorkoutsResponse(
    val workouts: List<Workout>
)

@Serializable
data class CompleteWorkoutRequest(
    val activityId: String
)
