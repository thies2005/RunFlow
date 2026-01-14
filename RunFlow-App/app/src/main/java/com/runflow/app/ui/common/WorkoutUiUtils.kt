package com.runflow.app.ui.common

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.runflow.app.data.model.WorkoutType
import com.runflow.app.data.model.ActivityType
import com.runflow.app.data.model.RaceType
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Display name for WorkoutType - uses the built-in displayName property from the enum,
 * but provides custom overrides for better UI text.
 */
val WorkoutType.displayNameUi: String
    get() = when (this) {
        WorkoutType.EASY -> "Easy Run"
        WorkoutType.LONG_RUN -> "Long Run"
        WorkoutType.TEMPO -> "Tempo"
        WorkoutType.INTERVALS -> "Intervals"
        WorkoutType.REPETITIONS -> "Repetitions"
        WorkoutType.RECOVERY -> "Recovery"
        WorkoutType.RACE -> "Race"
        WorkoutType.REST -> "Rest"
        WorkoutType.CROSS_TRAIN -> "Cross Training"
        WorkoutType.RIDE -> "Ride"
        WorkoutType.SWIM -> "Swim"
        WorkoutType.STRENGTH -> "Strength"
        WorkoutType.OTHER -> "Workout"
    }

val WorkoutType.icon: ImageVector
    get() = when (this) {
        WorkoutType.EASY -> Icons.AutoMirrored.Filled.DirectionsRun
        WorkoutType.LONG_RUN -> Icons.Default.Route
        WorkoutType.TEMPO -> Icons.Default.Speed
        WorkoutType.INTERVALS -> Icons.Default.Timer
        WorkoutType.REPETITIONS -> Icons.Default.Repeat
        WorkoutType.RECOVERY -> Icons.Default.SelfImprovement
        WorkoutType.RACE -> Icons.Default.EmojiEvents
        WorkoutType.REST -> Icons.Default.Coffee
        WorkoutType.CROSS_TRAIN -> Icons.Default.TwoWheeler
        WorkoutType.RIDE -> Icons.AutoMirrored.Filled.DirectionsBike
        WorkoutType.SWIM -> Icons.Default.Pool
        WorkoutType.STRENGTH -> Icons.Default.FitnessCenter
        WorkoutType.OTHER -> Icons.AutoMirrored.Filled.DirectionsRun
    }

val WorkoutType.color: Color
    get() = when (this) {
        WorkoutType.EASY -> Color(0xFF4CAF50)
        WorkoutType.LONG_RUN -> Color(0xFF2196F3)
        WorkoutType.TEMPO -> Color(0xFFFF9800)
        WorkoutType.INTERVALS -> Color(0xFFF44336)
        WorkoutType.REPETITIONS -> Color(0xFFE91E63)
        WorkoutType.RECOVERY -> Color(0xFF81C784)
        WorkoutType.RACE -> Color(0xFFFFD700)
        WorkoutType.REST -> Color(0xFF9E9E9E)
        WorkoutType.CROSS_TRAIN -> Color(0xFF00BCD4)
        WorkoutType.RIDE -> Color(0xFF00BCD4)
        WorkoutType.SWIM -> Color(0xFF03A9F4)
        WorkoutType.STRENGTH -> Color(0xFF607D8B)
        WorkoutType.OTHER -> Color(0xFF9E9E9E)
    }

/**
 * Extension function for WorkoutType icon - alternative to the property.
 */
fun WorkoutType.toIcon(): ImageVector = this.icon

/**
 * Extension function for WorkoutType color - alternative to the property.
 */
fun WorkoutType.toColor(): Color = this.color

// RaceType.displayName is already defined in the RaceType enum class


fun ActivityType.toIcon(): ImageVector = when (this) {
    ActivityType.RUN -> Icons.AutoMirrored.Filled.DirectionsRun
    ActivityType.RIDE -> Icons.AutoMirrored.Filled.DirectionsBike
    ActivityType.SWIM -> Icons.Default.Pool
    ActivityType.WALK -> Icons.AutoMirrored.Filled.DirectionsWalk
    ActivityType.HIKE -> Icons.Default.Terrain
    ActivityType.WORKOUT -> Icons.Default.FitnessCenter
    else -> Icons.AutoMirrored.Filled.DirectionsRun
}

fun formatDate(isoString: String): String {
    try {
        val date = java.time.LocalDate.parse(isoString.substring(0, 10))
        return date.format(java.time.format.DateTimeFormatter.ofPattern("MMM d"))
    } catch (e: Exception) {
        return isoString
    }
}

fun formatDistance(meters: Float): String {
    val km = meters / 1000
    return "${String.format("%.1f", km)} km"
}

fun formatDuration(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return if (hours > 0) {
        "${hours}h ${minutes}m"
    } else {
        "${minutes}m"
    }
}

fun formatSpeed(metersPerSecond: Float): String {
    val kmh = metersPerSecond * 3.6
    return "${String.format("%.1f", kmh)} km/h"
}

fun formatElevation(meters: Float): String {
    return "${String.format("%.0f", meters)} m"
}

fun formatTime(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, secs)
    } else {
        String.format("%d:%02d", minutes, secs)
    }
}

