package com.runflow.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DashboardResponse(
    val stats: DashboardStats,
    val recentActivities: List<Activity>,
    val goals: List<Goal>,
    val syncStatus: SyncStatus,
    val user: User
)

@Serializable
data class DashboardStats(
    val currentWeekMileage: Float = 0f,
    val currentWeekCount: Int = 0,
    val effectiveVO2max: Float = 0f,
    val rawVO2max: Float = 0f,
    val currentVdot: Float? = null,
    val vdotCorrectionFactor: Float = 1.0f,
    val marathonShape: MarathonShape? = null,
    val ctl: Float = 0f,
    val atl: Float = 0f,
    val tsb: Float = 0f,
    val workloadRatio: Float = 0f,
    val easyTrimp: Float = 0f,
    val hrMax: Int = 0,
    val weeklyMileageHistory: List<WeeklyMileage> = emptyList(),
    val vo2maxHistory: List<Vo2maxPoint> = emptyList()
)

@Serializable
data class WeeklyMileage(
    val week: String,
    val mileage: Float
)

@Serializable
data class Vo2maxPoint(
    @kotlinx.serialization.SerialName("date") val date: String,
    @kotlinx.serialization.SerialName("vo2max") val vo2max: Float
)

@Serializable
data class SyncStatus(
    val lastSyncAt: String? = null,
    val syncInProgress: Boolean = false,
    val pendingActivities: Int = 0,
    val totalActivities: Int = 0
)

@Serializable
data class TodayWorkout(
    val id: String,
    val goalId: String,
    val goalName: String,
    val type: WorkoutType,
    val description: String,
    val targetDistance: Float?,
    val targetDuration: Int?,
    val targetPace: Float?,
    val isCompleted: Boolean
)

@Serializable
data class QuickSyncResponse(
    val syncStarted: Boolean = false,
    val activitiesSynced: Int = 0,
    val lastSyncAt: String? = null
)
