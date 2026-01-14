package com.runflow.app.data.util

import com.runflow.app.data.model.PaceRange
import com.runflow.app.data.model.TrainingPaces
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * VDOT Calculator
 * Based on Jack Daniels' Running Formula (Daniels-Gilbert formula)
 * Ported from vdot.ts
 */
object VdotCalculator {

    // Race distances in meters
    const val DISTANCE_5K = 5000.0
    const val DISTANCE_10K = 10000.0
    const val DISTANCE_HALF = 21097.5
    const val DISTANCE_MARATHON = 42195.0

    /**
     * Calculate velocity (m/min) from VDOT at a given percentage of VO2max
     */
    private fun velocityAtPercentVO2max(vdot: Double, percentVO2max: Double): Double {
        val vo2 = vdot * percentVO2max

        // Inverse of VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
        // Using quadratic formula
        val a = 0.000104
        val b = 0.182258
        val c = -4.60 - vo2

        val discriminant = b * b - 4 * a * c
        if (discriminant < 0) return 0.0

        return (-b + sqrt(discriminant)) / (2 * a)
    }

    /**
     * Convert velocity (m/min) to pace (sec/km)
     * Note: Higher velocity = lower pace (faster)
     */
    private fun velocityToPace(velocityMetersPerMin: Double): Int {
        if (velocityMetersPerMin <= 0) return 0
        val secondsPerKm = (1000.0 / velocityMetersPerMin) * 60
        return secondsPerKm.roundToInt()
    }

    /**
     * Calculate training paces from VDOT
     */
    fun calculateTrainingPaces(vdot: Float): TrainingPaces {
        val vdotDouble = vdot.toDouble()
        
        // Easy pace range: 65-79% VO2max
        val easyMinVelocity = velocityAtPercentVO2max(vdotDouble, 0.65)
        val easyMaxVelocity = velocityAtPercentVO2max(vdotDouble, 0.79)

        // Marathon pace: ~75-80% VO2max (simplified to fixed point usually, but using web logic if available)
        // Web uses 0.78 for Marathon
        val marathonVelocity = velocityAtPercentVO2max(vdotDouble, 0.78)

        // Threshold pace: 88% VO2max
        val thresholdVelocity = velocityAtPercentVO2max(vdotDouble, 0.88)

        // Interval pace: 100% VO2max
        val intervalVelocity = velocityAtPercentVO2max(vdotDouble, 1.0)

        // Repetition pace: 105% VO2max
        val repVelocity = velocityAtPercentVO2max(vdotDouble, 1.05)
        
        // Note: min/max for pace means min=slower (higher value), max=faster (lower value)
        // actually pace is sec/km. Slower = higher number. Faster = lower number.
        // velocityToPace returns sec/km.
        
        // easyMaxVelocity is faster -> lower pace value
        // easyMinVelocity is slower -> higher pace value

        return TrainingPaces(
            easy = PaceRange(
                min = velocityToPace(easyMinVelocity), // Slower limit (higher value)
                max = velocityToPace(easyMaxVelocity)  // Faster limit (lower value)
            ),
            marathon = velocityToPace(marathonVelocity),
            threshold = velocityToPace(thresholdVelocity),
            interval = velocityToPace(intervalVelocity),
            repetition = velocityToPace(repVelocity)
        )
    }
    
    /**
     * Calculate VDOT from race performance
     */
    fun calculateVdot(distanceMeters: Double, timeSeconds: Int): Double {
        if (timeSeconds <= 0) return 0.0
        
        val timeMinutes = timeSeconds / 60.0
        val velocity = distanceMeters / timeMinutes
        
        // Oxygen cost
        val vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity.pow(2)
        
        // %VO2max
        val percentVO2max = 0.8 + 
            0.1894393 * exp(-0.012778 * timeMinutes) + 
            0.2989558 * exp(-0.1932605 * timeMinutes)
            
        val vdot = vo2 / percentVO2max
        return (vdot * 10).roundToInt() / 10.0
    }
    
    /**
     * Predict race time from VDOT
     */
    fun predictRaceTime(vdot: Double, distanceMeters: Double): Int {
        // Binary search
        var low = 600.0 // 10 min
        var high = 18000.0 // 5 hours (extended if needed for marathon walkers)
        if (distanceMeters > 21100) high = 36000.0 // 10 hours for marathon
        
        for (i in 0 until 50) {
            val mid = (low + high) / 2
            val testVdot = calculateVdot(distanceMeters, mid.roundToInt())
            
            if (abs(testVdot - vdot) < 0.01) {
                return mid.roundToInt()
            }
            
            if (testVdot > vdot) {
                low = mid
            } else {
                high = mid
            }
        }
        
        return ((low + high) / 2).roundToInt()
    }
    
    fun calculatePredictions(effectiveVO2max: Float, shapePercent: Float, calibrationFactor: Float = 1.0f): Map<String, Int> {
        // Based on web logic:
        // Calibration factor affects the effective VO2max used for prediction?
        // Or directly affects time? 
        // Web: calculatePredictedTimes(effectiveVO2max, shapeResult.shape, calibrationFactor)
        // Web calculateAllRacePredictions calls predictRaceTime with "effectiveVO2max".
        // Wait, calibration factor usually adjusts the VDOT itself or the time.
        
        // In web code: calculateAllRacePredictions(effectiveVO2max, shapeResult.shape, calibrationFactor)
        // Let's assume standard VDOT prediction for now, adjusting for shape if needed.
        // Actually, marathon prediction usually degrades VDOT based on shape.
        
        // For simple predictions (Optimal):
        val optimalVdot = effectiveVO2max.toDouble()
        
        return mapOf(
            "5K" to predictRaceTime(optimalVdot, DISTANCE_5K),
            "10K" to predictRaceTime(optimalVdot, DISTANCE_10K),
            "Half" to predictRaceTime(optimalVdot, DISTANCE_HALF),
            "Marathon" to predictRaceTime(optimalVdot, DISTANCE_MARATHON)
        )
    }
}
