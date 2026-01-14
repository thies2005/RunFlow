package com.runflow.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AnalyticsStats(
    // Current scalar values from API
    val ctl: Float = 0f,
    val atl: Float = 0f,
    val tsb: Float = 0f,
    val effectiveVO2max: Float = 0f,
    val rawVO2max: Float = 0f,
    val currentVdot: Float? = null,
    val currentWeekMileage: Float = 0f,
    val workloadRatio: Float = 1f,
    val easyTrimp: Float = 0f,
    val hrMax: Int = 185,
    val marathonShape: MarathonShape? = null,
    val vdotCorrectionFactor: Float = 1f,
    // History arrays (for charts - populated from separate endpoint)
    val vo2maxHistory: List<Vo2maxPoint> = emptyList(),
    val ctlHistory: List<FatiguePoint> = emptyList(),
    val atlHistory: List<FatiguePoint> = emptyList(),
    val tsbHistory: List<FatiguePoint> = emptyList(),
    val weeklyMileageHistory: List<WeeklyMileage> = emptyList(),
    val totalTimeHistory: List<WeeklyTime> = emptyList(),
    val racePredictions: Map<String, Int> = emptyMap(),
    // Calculated locally based on effectiveVO2max
    val trainingPaces: TrainingPaces? = null,
    val optimalTime: Int = 0, // Marathon optimal
    val predictedTime: Int = 0 // Marathon predicted
)

@Serializable
data class TrainingPaces(
    val easy: PaceRange,
    val marathon: Int,
    val threshold: Int,
    val interval: Int,
    val repetition: Int
)

@Serializable
data class PaceRange(
    val min: Int, // sec/km (slower)
    val max: Int  // sec/km (faster)
)

@Serializable
data class FatiguePoint(
    val date: String,
    val value: Float
)

@Serializable
data class WeeklyTime(
    val week: String,
    val seconds: Int
)

@Serializable
data class AnalyticsHistoryRequest(
    val startDate: String?,
    val endDate: String?,
    val metrics: List<String>
)

@Serializable
data class AnalyticsHistoryResponse(
    val vo2max: List<Vo2maxPoint> = emptyList(),
    val ctl: List<FatiguePoint> = emptyList(),
    val atl: List<FatiguePoint> = emptyList(),
    val tsb: List<FatiguePoint> = emptyList(),
    val weeklyMileage: List<WeeklyMileage> = emptyList(),
    val totalTime: List<WeeklyTime> = emptyList()
)

enum class TimeRange(val displayName: String, val days: Int?) {
    WEEK("This Week", 7),
    MONTH("This Month", 30),
    THREE_MONTHS("3 Months", 90),
    SIX_MONTHS("6 Months", 180),
    YEAR("This Year", 365),
    ALL("All Time", null)
}

