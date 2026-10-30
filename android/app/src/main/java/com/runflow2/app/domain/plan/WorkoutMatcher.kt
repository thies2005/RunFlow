package com.runflow2.app.domain.plan

import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.WorkoutEntity
import kotlin.math.abs
import kotlin.math.min

/**
 * Adaptation mode for workouts when readiness < 65 or athlete adapts schedule (Decision U3).
 */
enum class AdaptationMode {
    REDUCE,
    RESCHEDULE,
}

/**
 * Auto-link matching engine (Decision U2 / D6).
 *
 * Matches uncompleted non-rest planned workouts against same-day activities of the same sport.
 * If the best candidate has diffRatio <= 0.60 and was not previously dismissed by the athlete,
 * it sets suggestedActivityId for user confirmation (never marks isCompleted = true automatically).
 *
 * In-app recordings started with a workoutId are the sole exception and auto-link/complete immediately.
 */
object WorkoutMatcher {

    /** Maximum allowed difference ratio (distance or duration) for an auto-link suggestion. */
    const val MAX_DIFF_RATIO = 0.60

    /** Normalizes workout sport or activity type to canonical strings: RUN, BIKE, SWIM, STRENGTH. */
    fun normalizeSport(raw: String): String = when (raw.trim().uppercase()) {
        "RUN", "EASY", "LONG_RUN", "TEMPO", "INTERVALS", "FARTLEK", "REPETITIONS", "RECOVERY", "RACE" -> "RUN"
        "BIKE", "RIDE", "VIRTUAL_RIDE", "CYCLING" -> "BIKE"
        "SWIM", "SWIMMING" -> "SWIM"
        "STRENGTH", "WORKOUT", "WEIGHT_TRAINING", "CROSS_FIT" -> "STRENGTH"
        else -> raw.trim().uppercase()
    }

    /** Checks whether a workout and activity belong to the same sport. */
    fun sportsMatch(workoutSport: String, workoutType: String, activityType: String): Boolean {
        val wSport = normalizeSport(if (workoutSport.isNotBlank()) workoutSport else workoutType)
        val aSport = normalizeSport(activityType)
        return wSport == aSport
    }

    /**
     * Computes the difference ratio between a workout's planned target and an activity's actual metric.
     * Evaluates distance and duration differences relative to target; takes the smaller ratio if both exist.
     * Returns 0.0 if no targets are specified on same-day same-sport workout.
     */
    fun computeDiffRatio(workout: WorkoutEntity, activity: ActivityEntity): Double {
        val targetDist = workout.targetDistanceKm
        val targetDur = workout.targetDurationSec
        val actDist = activity.distanceKm
        val actDur = activity.movingTimeSec

        val distDiff = if (targetDist != null && targetDist > 0.0 && actDist > 0.0) {
            abs(actDist - targetDist) / targetDist
        } else null

        val durDiff = if (targetDur != null && targetDur > 0 && actDur > 0) {
            abs(actDur - targetDur).toDouble() / targetDur.toDouble()
        } else null

        return when {
            distDiff != null && durDiff != null -> min(distDiff, durDiff)
            distDiff != null -> distDiff
            durDiff != null -> durDiff
            else -> 0.0
        }
    }

    data class CandidateMatch(
        val activity: ActivityEntity,
        val diffRatio: Double,
    )

    /**
     * Finds the best matching candidate activity for an uncompleted non-rest workout.
     * Only considers same-day activities of the same sport with diffRatio <= 0.60
     * and activity.id != workout.dismissedActivityId, excluding claimedActivityIds.
     */
    fun findBestMatch(
        workout: WorkoutEntity,
        activities: List<ActivityEntity>,
        claimedActivityIds: Set<String> = emptySet(),
    ): ActivityEntity? {
        if (workout.isCompleted || workout.activityId != null) return null
        if (workout.workoutType.equals("REST", ignoreCase = true)) return null

        val workoutDate = Format.localDate(workout.scheduledDate)

        val candidates = activities.mapNotNull { act ->
            if (act.id in claimedActivityIds || (act.serverId != null && act.serverId in claimedActivityIds)) {
                return@mapNotNull null
            }
            if (act.id == workout.dismissedActivityId) return@mapNotNull null
            val actDate = Format.localDate(act.startDate)
            if (workoutDate != actDate) return@mapNotNull null
            if (!sportsMatch(workout.sport, workout.workoutType, act.type)) return@mapNotNull null
            val ratio = computeDiffRatio(workout, act)
            if (ratio <= MAX_DIFF_RATIO) CandidateMatch(act, ratio) else null
        }

        return candidates.minByOrNull { it.diffRatio }?.activity
    }

    /**
     * Evaluates pending workouts against candidate activities, returning modified workouts
     * with suggestedActivityId populated or cleared. Never modifies isCompleted.
     */
    fun matchWorkouts(
        workouts: List<WorkoutEntity>,
        activities: List<ActivityEntity>,
        initialClaimedActivityIds: Set<String> = emptySet(),
    ): List<WorkoutEntity> {
        val updated = mutableListOf<WorkoutEntity>()
        val claimed = initialClaimedActivityIds.toMutableSet()
        for (w in workouts) {
            if (w.isCompleted || w.activityId != null) continue
            if (w.workoutType.equals("REST", ignoreCase = true)) continue

            val best = findBestMatch(w, activities, claimed)
            if (best != null) {
                claimed.add(best.id)
                best.serverId?.let { claimed.add(it) }
                if (best.id != w.suggestedActivityId) {
                    updated.add(w.copy(suggestedActivityId = best.id))
                }
            } else if (w.suggestedActivityId != null) {
                // Clear suggestion if candidate is no longer present or valid or is claimed
                val stillExists = activities.any { it.id == w.suggestedActivityId }
                val isClaimed = w.suggestedActivityId in claimed ||
                    activities.firstOrNull { it.id == w.suggestedActivityId }?.serverId?.let { it in claimed } == true
                if (!stillExists || isClaimed) {
                    updated.add(w.copy(suggestedActivityId = null))
                }
            }
        }
        return updated
    }
}
