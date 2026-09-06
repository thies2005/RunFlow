package com.runflow2.app.domain.model

/** Type of a recorded activity. */
enum class ActivityType(val label: String) {
    RUN("Run"),
    RIDE("Ride"),
    WALK("Walk"),
    HIKE("Hike"),
    SWIM("Swim"),
    WORKOUT("Workout"),
    STRENGTH("Strength"),
    OTHER("Other"),
}

/**
 * Race types supported by the planner. [distanceKm] is null for timed / custom events.
 * [tri] marks multi-sport events (planned as run-focused with cross-training).
 */
enum class RaceType(val label: String, val distanceKm: Double?, val tri: Boolean = false) {
    FIVE_K("5K", 5.0),
    TEN_K("10K", 10.0),
    HALF_MARATHON("Half Marathon", 21.0975),
    MARATHON("Marathon", 42.195),
    FIFTY_K("50K", 50.0),
    FIFTY_MILE("50 Mile", 80.467),
    HUNDRED_K("100K", 100.0),
    HUNDRED_MILE("100 Mile", 160.934),
    TWELVE_HOUR("12 Hour", null),
    TWENTY_FOUR_HOUR("24 Hour", null),
    BACKYARD_ULTRA("Backyard Ultra", null),
    CUSTOM_DISTANCE("Custom Distance", null),
    SPRINT_TRI("Sprint Triathlon", 5.0, tri = true),
    OLYMPIC_TRI("Olympic Triathlon", 10.0, tri = true),
    HALF_IRONMAN("Half Ironman", 21.0975, tri = true),
    FULL_IRONMAN("Ironman", 42.195, tri = true),
    NONE("No race / general fitness", null),
}

/** Workout types shown on plan cards. */
enum class WorkoutType(val label: String) {
    EASY("Easy Run"),
    LONG_RUN("Long Run"),
    TEMPO("Tempo Run"),
    INTERVALS("Intervals"),
    FARTLEK("Fartlek"),
    REPETITIONS("Repetitions"),
    RECOVERY("Recovery Run"),
    RACE("Race"),
    REST("Rest"),
    CROSS_TRAIN("Cross Training"),
    RIDE("Ride"),
    SWIM("Swim"),
    STRENGTH("Strength"),
    OTHER("Workout"),
}

/** Training phase of a plan week. */
enum class PlanPhase(val label: String) {
    BASE("Base"),
    BUILD("Build"),
    PEAK("Peak"),
    TAPER("Taper"),
    RACE_WEEK("Race Week"),
    RECOVERY("Recovery"),
}

enum class Experience { BEGINNER, INTERMEDIATE, ADVANCED }

/** TSB (form) status bands, identical thresholds to the Flutter app. */
enum class TsbStatus(val label: String) {
    PEAKED("Peaked"),
    FRESH("Fresh"),
    NEUTRAL("Neutral"),
    FATIGUED("Fatigued"),
    VERY_FATIGUED("Very Fatigued");

    companion object {
        fun from(tsb: Double): TsbStatus = when {
            tsb >= 25.0 -> PEAKED
            tsb >= 5.0 -> FRESH
            tsb >= -10.0 -> NEUTRAL
            tsb >= -30.0 -> FATIGUED
            else -> VERY_FATIGUED
        }
    }
}

/** Live pace-zone evaluation during recording (±10% of target). */
enum class PaceZoneStatus { NO_TARGET, TOO_FAST, IN_ZONE, TOO_SLOW }

/** Daniels training zones. */
enum class PaceZone(val label: String, val short: String, val vo2FractionRange: ClosedRange<Double>, val hrBand: String) {
    EASY("Easy", "E", 0.65..0.78, "65–78%"),
    MARATHON("Marathon", "M", 0.75..0.84, "78–88%"),
    THRESHOLD("Threshold", "T", 0.83..0.91, "88–92%"),
    INTERVAL("Interval", "I", 0.95..1.00, "98–100%"),
    REPETITION("Repetition", "R", 1.05..1.10, "100%+"),
}

object PaceZoneEvaluator {
    private const val TOLERANCE = 0.10

    fun evaluate(currentPaceSecPerKm: Double?, targetPaceSecPerKm: Double?): PaceZoneStatus {
        if (targetPaceSecPerKm == null || targetPaceSecPerKm <= 0.0 || currentPaceSecPerKm == null) {
            return PaceZoneStatus.NO_TARGET
        }
        return if (currentPaceSecPerKm < targetPaceSecPerKm * (1 - TOLERANCE)) PaceZoneStatus.TOO_FAST
        else if (currentPaceSecPerKm > targetPaceSecPerKm * (1 + TOLERANCE)) PaceZoneStatus.TOO_SLOW
        else PaceZoneStatus.IN_ZONE
    }
}
