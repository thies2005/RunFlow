package com.runflow.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Activity(
    val id: String,
    val stravaId: String? = null,
    val type: ActivityType,
    val name: String,
    val startDate: String,
    val distance: Float = 0f,
    val movingTime: Int = 0,
    val elapsedTime: Int? = null,
    val averageSpeed: Float? = null,
    val maxSpeed: Float? = null,
    val averageHr: Float? = null,
    val maxHr: Int? = null,
    val hasHeartrate: Boolean = false,
    val totalElevation: Float? = null,
    val elevationGain: Float? = null,
    val elevationLoss: Float? = null,
    val trimp: Float? = null,
    val runningTss: Float? = null,
    val estimatedVdot: Float? = null,
    val trainingType: WorkoutType? = null,
    val sportType: String? = null,
    val averageCadence: Float? = null,
    val streams: Map<String, List<Double>>? = null,
    val isRaceEligible: Boolean = false,
    val gearId: String? = null,
    val locationCity: String? = null,
    val locationState: String? = null,
    val locationCountry: String? = null,
    val hrZone1Time: Int? = null,
    val hrZone2Time: Int? = null,
    val hrZone3Time: Int? = null,
    val hrZone4Time: Int? = null,
    val hrZone5Time: Int? = null,
    val hrZone6Time: Int? = null,
    val hrZone7Time: Int? = null
)

/**
 * Activity types matching the Web API.
 * Limited to the 8 types defined in the Prisma schema.
 */
@Serializable
enum class ActivityType {
    @SerialName("RUN")
    RUN,

    @SerialName("VIRTUAL_RIDE")
    VIRTUAL_RIDE,

    @SerialName("RIDE")
    RIDE,

    @SerialName("WALK")
    WALK,

    @SerialName("HIKE")
    HIKE,

    @SerialName("SWIM")
    SWIM,

    @SerialName("WORKOUT")
    WORKOUT,

    @SerialName("OTHER")
    OTHER;

    val displayName: String
        get() = when (this) {
            RUN -> "Run"
            VIRTUAL_RIDE -> "Virtual Ride"
            RIDE -> "Ride"
            WALK -> "Walk"
            HIKE -> "Hike"
            SWIM -> "Swim"
            WORKOUT -> "Workout"
            OTHER -> "Other"
        }

    companion object {
        /**
         * Parse from string with fallback to OTHER for unknown types.
         */
        fun fromValue(value: String?): ActivityType = when (value?.uppercase()) {
            "RUN", "TRAIL_RUN", "VIRTUAL_RUN" -> RUN
            "VIRTUAL_RIDE", "EBIKERIDE" -> VIRTUAL_RIDE
            "RIDE" -> RIDE
            "WALK", "WALKING" -> WALK
            "HIKE" -> HIKE
            "SWIM", "SWIMMING" -> SWIM
            "WORKOUT", "CROSSFIT", "WEIGHT_TRAINING", "YOGA", "ELLIPTICAL" -> WORKOUT
            else -> OTHER
        }
    }
}

@Serializable
data class ManualActivityRequest(
    val name: String,
    val type: ActivityType,
    val startDate: String,
    val distance: Float,
    val movingTime: Int,
    val averageHr: Float?,
    val maxHr: Int?,
    val totalElevation: Float?,
    val description: String?
)

/**
 * Response wrapper for activities list.
 * Includes pagination metadata.
 */
@Serializable
data class ActivitiesResponse(
    val activities: List<Activity>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    /**
     * Whether more activities are available on the next page.
     * Computed from: (offset + limit) < total
     */
    val hasMore: Boolean = false
)

/**
 * Response wrapper for single activity detail.
 */
@Serializable
data class ActivityDetailResponse(
    val activity: Activity
)
