package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization

/**
 * Port of Web/src/lib/plans/descriptions.ts — athlete-facing display text:
 *  - `getRacePace` (L54-62)
 *  - `inferSport` (L46-52), `formatPace` (L29-33), `formatDuration` (L35-37),
 *    `formatDistance` (L39-44)
 *  - `generateDisplayDescription` (L87-210) incl. goal-pace detection
 *    `isGoalPace` (L64-70) and rep/fartlek extraction (L72-85)
 *  - `inferIntensityZone` (L212-247)
 *  - `enrichWorkoutsWithDescriptions` (L261-274)
 */
object WebPlanDescriptions {

    private val RUN_TYPES = setOf(
        "EASY", "LONG_RUN", "TEMPO", "INTERVALS", "FARTLEK", "REPETITIONS", "RECOVERY", "RACE",
    )
    private val RIDE_TYPES = setOf("RIDE", "LONG_RIDE", "RIDE_INTERVALS")
    private val SWIM_TYPES = setOf("SWIM", "SWIM_DRILL", "OPEN_WATER_SWIM")

    /** descriptions.ts `formatPace` (L29-33) — note the trailing `/km`. */
    private fun formatPace(secPerKm: Double): String {
        val mins = kotlin.math.floor(secPerKm / 60).toInt()
        val secs = jr(secPerKm % 60).toInt()
        return "$mins:${secs.toString().padStart(2, '0')}/km"
    }

    /** descriptions.ts `formatDuration` (L35-37). */
    private fun formatDuration(seconds: Double): String = "${jr(seconds / 60).toInt()}min"

    /** descriptions.ts `formatDistance` (L39-44). */
    private fun formatDistance(meters: Double, sport: String): String =
        if (sport == "SWIM") "${jr(meters).toInt()}m" else "${WebPlanEngine.toFixed1(meters / 1000)}km"

    /** descriptions.ts `inferSport` (L46-52). */
    fun inferSport(workoutType: String): String = when {
        RUN_TYPES.contains(workoutType) -> "RUN"
        RIDE_TYPES.contains(workoutType) -> "RIDE"
        SWIM_TYPES.contains(workoutType) -> "SWIM"
        workoutType == "STRENGTH" -> "STRENGTH"
        else -> "OTHER"
    }

    /** descriptions.ts `getRacePace` (L54-62). */
    fun getRacePace(raceType: String, paces: Personalization.PersonTrainingPaces): Double = when (raceType) {
        "MARATHON" -> paces.marathon.toDouble()
        "HALF_MARATHON" -> jr((paces.marathon + paces.threshold) / 2.0)
        "TEN_K" -> paces.threshold.toDouble()
        "FIVE_K" -> paces.interval.toDouble()
        else -> paces.marathon.toDouble()
    }

    /** descriptions.ts `isGoalPace` (L64-70). */
    private fun isGoalPace(
        type: String,
        phase: String?,
        targetPace: Double?,
        isGoalPaceWorkout: Boolean,
        racePace: Double?,
    ): Boolean {
        if (isGoalPaceWorkout) return true
        if (racePace == null || targetPace == null || targetPace == 0.0) return false
        if (phase != "PEAK") return false
        if (type != "TEMPO" && type != "INTERVALS") return false
        return kotlin.math.abs(targetPace - racePace) / racePace <= 0.03
    }

    /** descriptions.ts `extractRepDetail` (L72-79). */
    private fun extractRepDetail(description: String?): String {
        if (description == null) return ""
        val repMatch = Regex("(\\d+x\\d+(?:\\.\\d+)?(?:km|m))(?:\\s*@\\s*)?").find(description)
        if (repMatch != null) return repMatch.groupValues[1].trim()
        val distAtMatch = Regex("(\\d+(?:\\.\\d+)?km)\\s*@").find(description)
        if (distAtMatch != null) return distAtMatch.groupValues[1]
        return ""
    }

    /** descriptions.ts `extractFartlekStructure` (L81-85). */
    private fun extractFartlekStructure(description: String?): String {
        if (description == null) return ""
        val match = Regex("Fartlek:\\s*\\d+(?:\\.\\d+)?km\\s*\\((.+)\\)").find(description)
        return match?.groupValues?.get(1) ?: ""
    }

    /** descriptions.ts `generateDisplayDescription` (L87-94). */
    fun generateDisplayDescription(
        type: String,
        distance: Double,
        targetPace: Double?,
        duration: Double?,
        phase: String?,
        description: String?,
        racePace: Double?,
    ): String {
        val sport = inferSport(type)
        return when (sport) {
            "RUN" -> generateRunDescription(type, distance, targetPace, phase, description, racePace)
            "RIDE" -> generateRideDescription(type, duration)
            "SWIM" -> generateSwimDescription(type, distance)
            else -> generateOtherDescription(type, duration)
        }
    }

    /** descriptions.ts `generateRunDescription` (L96-158). */
    private fun generateRunDescription(
        type: String,
        distance: Double,
        targetPace: Double?,
        phase: String?,
        description: String?,
        racePace: Double?,
    ): String {
        val dist = formatDistance(distance, "RUN")

        if (type == "RACE") return "Race Day"

        if (isGoalPace(type, phase, targetPace, isGoalPaceWorkout = false, racePace = racePace) && targetPace != null) {
            val detail = extractRepDetail(description).ifEmpty { dist }
            return "Goal Pace: $detail @ ${formatPace(targetPace)}"
        }

        return when (type) {
            "EASY" -> "Easy Run: $dist"
            "LONG_RUN" -> {
                val mpMatch = description?.let {
                    Regex("([\\d.]+)km\\s*Easy\\s*\\+\\s*([\\d.]+)km\\s*@\\s*(?:MP|Race Pace|Ultra Pace|Goal Pace)")
                        .find(it)
                }
                if (mpMatch != null) {
                    return "Long Run: $dist (${mpMatch.groupValues[1]}km Easy + ${mpMatch.groupValues[2]}km @ Goal Pace)"
                }
                val progMatch = description?.let { Regex("\\(last \\d+km progressive\\)").find(it) }
                if (progMatch != null) {
                    return "Long Run: $dist ${progMatch.value}"
                }
                "Long Run: $dist"
            }
            "RECOVERY" -> "Recovery Run: $dist"
            "TEMPO" -> {
                val hmSegMatch = description?.let { Regex("HM Pace Segments:\\s*(.+)").find(it) }
                if (hmSegMatch != null) {
                    return "HM Pace Segments: ${hmSegMatch.groupValues[1]}"
                }
                val mpSegMatch = description?.let { Regex("MP Segments:\\s*(.+)").find(it) }
                if (mpSegMatch != null) {
                    return "MP Segments: ${mpSegMatch.groupValues[1]}"
                }
                val steadyMatch = description?.let { Regex("^Steady(?:\\s+State)?:\\s*(.+)").find(it) }
                if (steadyMatch != null) {
                    return "Steady Run: ${steadyMatch.groupValues[1]}"
                }
                val thresholdRep = extractRepDetail(description)
                if (thresholdRep.isNotEmpty()) {
                    return "Threshold: $thresholdRep"
                }
                "Threshold: $dist"
            }
            "INTERVALS" -> {
                val rep = extractRepDetail(description)
                if (rep.isNotEmpty()) "Intervals: $rep" else "Intervals: $dist"
            }
            "REPETITIONS" -> {
                val rep = extractRepDetail(description)
                if (rep.isNotEmpty()) "Reps: $rep" else "Reps: $dist"
            }
            "FARTLEK" -> {
                val structure = extractFartlekStructure(description)
                if (structure.isNotEmpty()) "Fartlek: $structure" else "Fartlek: $dist"
            }
            else -> "Run: $dist"
        }
    }

    /** descriptions.ts `generateRideDescription` (L160-173). */
    private fun generateRideDescription(type: String, duration: Double?): String {
        val dur = if (duration != null && duration > 0) formatDuration(duration) else "60min"
        return when (type) {
            "RIDE" -> "Zone 2 Ride: $dur"
            "LONG_RIDE" -> "Long Ride: $dur"
            "RIDE_INTERVALS" -> "Bike Intervals: $dur @ Threshold"
            else -> "Ride: $dur"
        }
    }

    /** descriptions.ts `generateSwimDescription` (L175-188). */
    private fun generateSwimDescription(type: String, distance: Double): String {
        val dist = formatDistance(distance, "SWIM")
        return when (type) {
            "SWIM" -> "Endurance Swim: $dist"
            "SWIM_DRILL" -> "Swim Drill: $dist"
            "OPEN_WATER_SWIM" -> "Open Water: $dist"
            else -> "Swim: $dist"
        }
    }

    /** descriptions.ts `generateOtherDescription` (L190-210). */
    private fun generateOtherDescription(type: String, duration: Double?): String {
        val dur = if (duration != null && duration > 0) formatDuration(duration) else ""
        return when (type) {
            "STRENGTH" -> "Strength: ${dur.ifEmpty { "45min" }}"
            "BRICK" -> "Brick Session"
            "REST" -> "Rest Day"
            "TRANSITION_PRACTICE" -> "Transition Practice"
            "CROSS_TRAIN" -> "Cross Training: ${dur.ifEmpty { "45min" }}"
            "DOUBLE_DAY" -> "Double Day"
            else -> "Training"
        }
    }

    /** descriptions.ts `inferIntensityZone` (L212-247). */
    fun inferIntensityZone(workoutType: String, description: String?): String? {
        if (description != null) {
            if (workoutType == "TEMPO") {
                if (description.contains("MP Segments") || description.contains("HM Pace Segments")) return "MP/Race Pace"
                if (Regex("^Steady(?:\\s+State)?:").containsMatchIn(description)) return "Steady"
                if (description.contains("Ultra Threshold")) return "Steady"
                if (description.contains("Target Race Pace")) return "Race Pace"
            }
            if (workoutType == "LONG_RUN" &&
                Regex("@\\s*(?:MP|Race Pace|Ultra Pace|Goal Pace)").containsMatchIn(description)
            ) {
                return "E + MP"
            }
        }
        return when (workoutType) {
            "EASY" -> "E Zone"
            "LONG_RUN" -> "E Zone"
            "RECOVERY" -> "E Zone"
            "TEMPO" -> "T Zone"
            "INTERVALS" -> "I Zone"
            "REPETITIONS" -> "R Zone"
            "FARTLEK" -> "F Zone"
            "RACE" -> "Race"
            "RIDE" -> "Zone 2"
            "LONG_RIDE" -> "Zone 2"
            "RIDE_INTERVALS" -> "Threshold"
            "SWIM" -> "Endurance"
            "SWIM_DRILL" -> "Drill"
            "OPEN_WATER_SWIM" -> "Open Water"
            "STRENGTH" -> "Strength"
            "BRICK" -> "Mixed"
            else -> null
        }
    }

    /**
     * descriptions.ts `enrichWorkoutsWithDescriptions` (L261-274) — fills
     * sport/displayDescription/intensityZone in place.
     */
    fun enrichWorkoutsWithDescriptions(workouts: MutableList<WebGeneratedWorkout>, racePace: Double? = null) {
        for (i in workouts.indices) {
            val w = workouts[i]
            workouts[i] = w.copy(
                sport = inferSport(w.type),
                displayDescription = generateDisplayDescription(
                    type = w.type,
                    distance = w.totalDistance,
                    targetPace = w.targetPace,
                    duration = w.targetDuration,
                    phase = w.phase,
                    description = w.description,
                    racePace = racePace,
                ),
                intensityZone = inferIntensityZone(w.type, w.description),
            )
        }
    }
}
