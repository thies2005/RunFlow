package com.runflow2.app.core.math

/**
 * MET-based energy estimate for activities without a measured calorie value:
 * device recordings and Health Connect imports whose source app wrote no
 * TotalCaloriesBurned records. kcal = MET × weight(kg) × hours, with the
 * Compendium MET table and speed thresholds the web engine uses
 * (Web/src/lib/metrics/calories.ts) so device and server estimates agree.
 */
object CalorieMath {

    private fun mets(type: String, vigorous: Boolean, moderate: Boolean): Double =
        when (type.uppercase()) {
            "RUN" -> if (vigorous) 12.8 else if (moderate) 9.8 else 7.0
            "RIDE", "VIRTUAL_RIDE" -> if (vigorous) 12.0 else if (moderate) 8.0 else 4.0
            "SWIM" -> if (vigorous) 10.0 else if (moderate) 8.0 else 6.0
            "WALK" -> if (vigorous) 5.0 else if (moderate) 3.5 else 2.5
            "HIKE" -> if (vigorous) 8.0 else if (moderate) 6.0 else 5.0
            "STRENGTH", "WORKOUT" -> if (vigorous) 8.0 else if (moderate) 6.0 else 4.0
            else -> if (vigorous) 7.0 else if (moderate) 5.0 else 3.0
        }

    /** (moderate, vigorous) average-speed thresholds in m/s, per type. */
    private fun thresholds(type: String): Pair<Double, Double> = when (type.uppercase()) {
        "RUN" -> 2.5 to 3.5
        "RIDE", "VIRTUAL_RIDE" -> 5.5 to 8.5
        "SWIM" -> 0.5 to 1.0
        "WALK" -> 1.3 to 1.8
        "HIKE" -> 1.0 to 1.5
        else -> 0.0 to 0.0 // no speed-based intensity: moderate
    }

    /**
     * Estimated kcal, or null when the inputs can't produce a sane number
     * (no duration or no weight). Types without speed thresholds (strength,
     * other) always land on moderate intensity, like the web engine.
     */
    fun estimate(movingTimeSec: Int, distanceMeters: Double, weightKg: Double, type: String = "RUN"): Int? {
        if (movingTimeSec <= 0 || weightKg <= 0) return null
        val (moderateAt, vigorousAt) = thresholds(type)
        val speed = if (distanceMeters > 0) distanceMeters / movingTimeSec else 0.0
        val vigorous = vigorousAt > 0 && speed >= vigorousAt
        val moderate = moderateAt <= 0 || speed >= moderateAt
        val kcal = mets(type, vigorous, moderate) * weightKg * (movingTimeSec / 3600.0)
        return kcal.toInt().takeIf { it > 0 }
    }
}
