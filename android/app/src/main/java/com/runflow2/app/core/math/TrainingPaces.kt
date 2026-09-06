package com.runflow2.app.core.math

import com.runflow2.app.domain.model.PaceZone

/** Daniels training-pace table derived from a VDOT. */
data class TrainingPaces(val vdot: Double) {

    private fun band(zone: PaceZone): Pair<Double, Double> = Pair(
        VdotMath.paceSecPerKmForFraction(vdot, zone.vo2FractionRange.start),
        VdotMath.paceSecPerKmForFraction(vdot, zone.vo2FractionRange.endInclusive),
    )

    fun range(zone: PaceZone) = band(zone)

    fun mid(zone: PaceZone): Double {
        val (fast, slow) = band(zone)
        return (fast + slow) / 2.0
    }

    fun paceSecPerKm(typeWorkoutPace: WorkoutPaceTarget): Double = when (typeWorkoutPace) {
        WorkoutPaceTarget.EASY -> mid(PaceZone.EASY)
        WorkoutPaceTarget.LONG -> band(PaceZone.EASY).second.coerceAtMost(mid(PaceZone.EASY) * 1.06)
        WorkoutPaceTarget.RECOVERY -> band(PaceZone.EASY).second * 1.08
        WorkoutPaceTarget.MARATHON -> mid(PaceZone.MARATHON)
        WorkoutPaceTarget.THRESHOLD -> mid(PaceZone.THRESHOLD)
        WorkoutPaceTarget.INTERVAL -> mid(PaceZone.INTERVAL)
        WorkoutPaceTarget.REPETITION -> mid(PaceZone.REPETITION)
    }

    companion object {
        fun bandLabel(zone: PaceZone): String {
            val vdot = 50.0 // placeholder for label use only
            return zone.label
        }
    }
}

enum class WorkoutPaceTarget { EASY, LONG, RECOVERY, MARATHON, THRESHOLD, INTERVAL, REPETITION }
