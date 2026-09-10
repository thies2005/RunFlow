package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization

/**
 * Enrichment pipeline port — Web/src/lib/plans/index.ts:
 *  - `assignWorkoutTargets` (L2067-2086)
 *  - `fillDurations` (L1759-1786) + duration helpers (L1708-1728)
 *  - `enrichWorkoutsWithTargets` (L2088-2143) + `getPaceTarget` (L2145-2187)
 *  - `buildStructuredStepsForWorkout` (L1788-2048)
 *
 * Bike zones come from Web/src/lib/plans/bike-zones.ts
 * (`estimateBikeFtpFromVdot` L42-47, `calculateBikeZones` L11-21); swim pace
 * from swim-pace.ts `estimateSwimPaceFromVdot` (L71-76). HR zones reuse the
 * [Personalization] port of hr-zones.ts.
 */

// -------------------------------------------------------------------
// HR zone targets — index.ts L2093-2103 + hr-zones.ts getZoneTarget (L168-179)
// -------------------------------------------------------------------

internal data class WebZoneTarget(val label: String, val min: Int?, val max: Int?)

/** hr-zones.ts `getZoneTarget` (L168-179). */
internal fun getZoneTarget(zone: Int?, zones: List<Personalization.HrZone>?): WebZoneTarget? {
    if (zone == null || zone <= 0) return null
    val labelFor = { z: Int -> Personalization.HR_ZONE_LABELS[z] ?: "Z$z" }
    if (zones == null) return WebZoneTarget(labelFor(zone), null, null)
    val match = zones.firstOrNull { it.zone == zone }
        ?: return WebZoneTarget(labelFor(zone), null, null)
    return WebZoneTarget(match.label, match.minBpm, match.maxBpm)
}

/** index.ts L2067-2086 (`assignWorkoutTargets`). */
internal fun assignWorkoutTargets(workouts: MutableList<WebGeneratedWorkout>) {
    for (i in workouts.indices) {
        val workout = workouts[i]
        if (workout.targetHrZone != null) continue
        val type = workout.type
        val zone: Int? = when {
            type == "RIDE" || type == "LONG_RIDE" || type == "BRICK" -> 2
            type == "RIDE_INTERVALS" -> 4
            type == "SWIM" || type == "SWIM_DRILL" || type == "OPEN_WATER_SWIM" -> 2
            type == "TEMPO" && (workout.description.contains("Threshold")) -> 4
            else -> WebPlanEngine.workoutTypeToHrZone(type)
        }
        workouts[i] = workout.copy(targetHrZone = zone)
    }
}

/** index.ts L1759-1786 (`fillDurations`). */
internal fun fillDurations(
    workouts: MutableList<WebGeneratedWorkout>,
    paces: Personalization.PersonTrainingPaces,
) {
    val easyPace = paces.easy.maxSecPerKm.toDouble()

    for (i in workouts.indices) {
        val w = workouts[i]
        if (w.targetDuration != null && w.targetDuration > 0) continue
        if (w.totalDistance <= 0) continue
        if (w.targetPace == null || w.targetPace <= 0) continue

        val type = w.type
        val duration: Double = when {
            type == "TEMPO" || type == "INTERVALS" || type == "FARTLEK" || type == "REPETITIONS" ->
                WebPlanEngine.computeQualityDuration(
                    w.totalDistance, w.targetPace!!, easyPace, WebPlanEngine.getQualityFraction(type),
                )

            type == "SWIM" || type == "SWIM_DRILL" || type == "OPEN_WATER_SWIM" ->
                WebPlanEngine.computeSwimDuration(w.totalDistance, w.targetPace!!)

            else -> WebPlanEngine.computeDuration(w.totalDistance, w.targetPace!!)
        }
        workouts[i] = w.copy(targetDuration = duration)
    }
}

// -------------------------------------------------------------------
// Bike zones — bike-zones.ts
// -------------------------------------------------------------------

internal data class WebBikeZoneRange(val min: Int, val max: Int)

internal data class WebBikeZones(
    val recovery: WebBikeZoneRange,
    val endurance: WebBikeZoneRange,
    val tempo: WebBikeZoneRange,
    val threshold: WebBikeZoneRange,
    val vo2max: WebBikeZoneRange,
)

/** bike-zones.ts `calculateBikeZones` (L11-21). */
internal fun calculateBikeZones(ftpWatts: Double): WebBikeZones {
    val ftp = maxOf(0.0, ftpWatts)
    return WebBikeZones(
        recovery = WebBikeZoneRange(0, jr(ftp * 0.55).toInt()),
        endurance = WebBikeZoneRange(jr(ftp * 0.56).toInt(), jr(ftp * 0.75).toInt()),
        tempo = WebBikeZoneRange(jr(ftp * 0.76).toInt(), jr(ftp * 0.90).toInt()),
        threshold = WebBikeZoneRange(jr(ftp * 0.91).toInt(), jr(ftp * 1.05).toInt()),
        vo2max = WebBikeZoneRange(jr(ftp * 1.06).toInt(), jr(ftp * 1.20).toInt()),
    )
}

/** bike-zones.ts `estimateBikeFtpFromVdot` (L42-47). */
internal fun estimateBikeFtpFromVdot(vdot: Double): Double {
    if (vdot <= 0) return 100.0
    val baseFTP = (vdot - 10) * 6 + 120
    return jr(baseFTP).coerceIn(100.0, 400.0)
}

/** swim-pace.ts `estimateSwimPaceFromVdot` (L71-76). */
internal fun estimateSwimPaceFromVdot(vdot: Double): Double {
    if (vdot <= 0) return 120.0
    val css = jr(180 - vdot * 1.5)
    return css.coerceIn(80.0, 180.0)
}

// -------------------------------------------------------------------
// Pace/HR target labels — index.ts L2088-2195
// -------------------------------------------------------------------

/** index.ts L2145-2187 (`getPaceTarget`). */
private fun getPaceTarget(
    workout: WebGeneratedWorkout,
    paces: Personalization.PersonTrainingPaces,
): WebZoneTarget? {
    val targetPace = workout.targetPace
    if (targetPace == null || targetPace <= 0) return null

    return when (workout.type) {
        "SWIM", "SWIM_DRILL", "OPEN_WATER_SWIM" -> WebZoneTarget(
            label = when (workout.type) {
                "SWIM_DRILL" -> "Swim Drill"
                "OPEN_WATER_SWIM" -> "OW Swim"
                else -> "Swim Pace"
            },
            min = jr(targetPace * 0.95).toInt(),
            max = jr(targetPace * 1.05).toInt(),
        )

        "EASY", "LONG_RUN", "RECOVERY" -> WebZoneTarget(
            "Easy", paces.easy.minSecPerKm, paces.easy.maxSecPerKm,
        )

        "TEMPO" -> when {
            workout.description.contains("HM Pace Segments") ->
                paceWindow("HM Race Pace", targetPace, 0.03)

            workout.description.contains("MP Segments") || workout.description.contains("MP") ->
                paceWindow("Marathon Pace", targetPace, 0.03)

            else -> paceWindow("Threshold", paces.threshold.toDouble(), 0.03)
        }

        "INTERVALS" -> paceWindow("Interval", paces.interval.toDouble(), 0.02)
        "REPETITIONS" -> paceWindow("Repetition", paces.repetition.toDouble(), 0.02)

        "FARTLEK" -> WebZoneTarget(
            "Fartlek",
            minOf(paces.interval, paces.threshold),
            maxOf(paces.interval, paces.threshold),
        )

        "RACE" -> paceWindow("Race Pace", targetPace, 0.03)
        else -> paceWindow("Target Pace", targetPace, 0.03)
    }
}

/** index.ts L2189-2195 (`paceWindow`). */
private fun paceWindow(label: String, paceSecondsPerKm: Double, fraction: Double): WebZoneTarget =
    WebZoneTarget(
        label,
        jr(paceSecondsPerKm * (1 - fraction)).toInt(),
        jr(paceSecondsPerKm * (1 + fraction)).toInt(),
    )

/** index.ts `enrichWorkoutsWithTargets` (L2088-2143). */
internal fun enrichWorkoutsWithTargets(
    workouts: MutableList<WebGeneratedWorkout>,
    paces: Personalization.PersonTrainingPaces,
    config: WebPlanConfig,
    usePhaseVdot: Boolean,
) {
    val hrZones = Personalization.resolveHrZones(
        Personalization.HrZoneInput(
            hrZone1Max = config.hrZone1Max,
            hrZone2Max = config.hrZone2Max,
            hrZone3Max = config.hrZone3Max,
            hrZone4Max = config.hrZone4Max,
            hrZone5Max = config.hrZone5Max,
            hrZone6Max = config.hrZone6Max,
            thresholdHeartRate = config.thresholdHeartRate,
            hrMax = config.hrMax,
            hrRest = config.hrRest,
        ),
    ).zones

    val bikeFtp = estimateBikeFtpFromVdot(config.vdot)
    val bikeZones = calculateBikeZones(bikeFtp)
    val phasePacesByVdot = HashMap<Double, Personalization.PersonTrainingPaces>()

    fun getPhasePaces(phase: String?): Personalization.PersonTrainingPaces {
        if (!usePhaseVdot || phase == null || phase == "RACE_WEEK") return paces
        if (phase != "BASE" && phase != "BUILD" && phase != "PEAK" && phase != "TAPER") return paces
        val phaseVdot = WebPlanEngine.resolvePhaseVdot(config.vdot, config.targetVdot, phase)
        if (phaseVdot == config.vdot) return paces
        phasePacesByVdot[phaseVdot]?.let { return it }
        val nextPaces = Personalization.trainingPaces(phaseVdot)
        phasePacesByVdot[phaseVdot] = nextPaces
        return nextPaces
    }

    for (i in workouts.indices) {
        val workout = workouts[i]
        val paceTarget = getPaceTarget(workout, getPhasePaces(workout.phase))
        var w = workout.copy(
            targetPaceZoneLabel = paceTarget?.label,
            targetPaceMinSecondsPerKm = paceTarget?.min?.toDouble(),
            targetPaceMaxSecondsPerKm = paceTarget?.max?.toDouble(),
        )

        val hrTarget = getZoneTarget(w.targetHrZone, hrZones)
        w = w.copy(
            targetHrZoneLabel = hrTarget?.label,
            targetHrMinBpm = hrTarget?.min?.toDouble(),
            targetHrMaxBpm = hrTarget?.max?.toDouble(),
        )

        if (w.type == "RIDE" || w.type == "LONG_RIDE" || w.type == "RIDE_INTERVALS" || w.type == "BRICK") {
            w = w.copy(
                targetPaceZoneLabel = when (w.type) {
                    "RIDE_INTERVALS" -> "Power Z4: ${bikeZones.threshold.min}-${bikeZones.threshold.max}W"
                    "LONG_RIDE" -> "Power Z2: ${bikeZones.endurance.min}-${bikeZones.endurance.max}W"
                    else -> "Power Z2: ${bikeZones.endurance.min}-${bikeZones.endurance.max}W"
                },
            )
        }
        workouts[i] = w
    }
}

// -------------------------------------------------------------------
// Structured steps — index.ts L1788-2048
// -------------------------------------------------------------------

/**
 * Port of `buildStructuredStepsForWorkout` (index.ts L1788-2048): derives the
 * warmup/work/recovery/cooldown step list from a workout's type + description
 * so the recorder can pace-guided-track it. Regexes replicate the web's
 * description mining exactly (rep counts, brick legs, fartlek cycles).
 */
fun buildStructuredStepsForWorkout(workout: WebGeneratedWorkout): WebStructuredPlan? {
    if (workout.totalDistance <= 0 && (workout.targetDuration == null || workout.targetDuration <= 0)) return null

    val type = workout.type
    val targetPace = workout.targetPace?.takeIf { it > 0 }
    val hrZone = workout.targetHrZone

    // 1. STRENGTH & TRANSITION
    if (type == "STRENGTH" || type == "TRANSITION_PRACTICE") {
        return WebStructuredPlan(
            steps = listOf(
                WebStructuredStep(
                    type = "steady",
                    name = if (type == "STRENGTH") "Strength Session" else "Transition Practice",
                    durationSeconds = (workout.targetDuration?.takeIf { it > 0 } ?: 2700.0),
                ),
            ),
        )
    }

    // 2. BRICK (Grouped Bike + Transition + Run)
    if (type == "BRICK") {
        val match = Regex("(\\d+)\\s*min\\s*Bike\\s*(?:→|->)\\s*(\\d+)\\s*min\\s*Run", RegexOption.IGNORE_CASE)
            .find(workout.description)
        val bikeMinutes = match?.groupValues?.get(1)?.toIntOrNull() ?: 45
        val runMinutes = match?.groupValues?.get(2)?.toIntOrNull() ?: 15
        val bikeSeconds = bikeMinutes * 60.0
        val runSeconds = runMinutes * 60.0
        val plannedSeconds = workout.targetDuration?.takeIf { it > 0 }
            ?: (bikeSeconds + runSeconds + 300)
        val transitionSeconds = maxOf(0.0, plannedSeconds - bikeSeconds - runSeconds)

        val steps = ArrayList<WebStructuredStep>()
        steps.add(
            WebStructuredStep(type = "work", name = "Bike Leg", durationSeconds = bikeSeconds, hrZone = 2),
        )
        if (transitionSeconds > 0) {
            steps.add(
                WebStructuredStep(type = "recovery", name = "Transition Practice (T2)", durationSeconds = transitionSeconds),
            )
        }
        steps.add(
            WebStructuredStep(type = "work", name = "Run Leg", durationSeconds = runSeconds, hrZone = 2),
        )
        return WebStructuredPlan(steps = steps)
    }

    // 3. BIKE RIDES (Steady & Intervals)
    if (type == "RIDE" || type == "LONG_RIDE") {
        return WebStructuredPlan(
            steps = listOf(
                WebStructuredStep(
                    type = "steady",
                    name = if (type == "LONG_RIDE") "Long Ride" else "Easy Ride",
                    durationSeconds = workout.targetDuration?.takeIf { it > 0 },
                    hrZone = hrZone ?: 2,
                ),
            ),
        )
    }

    if (type == "RIDE_INTERVALS") {
        val match = Regex("(\\d+)x(\\d+)\\s*min", RegexOption.IGNORE_CASE).find(workout.description)
        val reps = match?.groupValues?.get(1)?.toIntOrNull() ?: 4
        val repMinutes = match?.groupValues?.get(2)?.toIntOrNull() ?: 5

        val warmupSeconds = 600.0
        val repSeconds = repMinutes * 60.0
        val recoverySeconds = 180.0
        val fixedSeconds = warmupSeconds + (reps * repSeconds) + ((reps - 1) * recoverySeconds)
        val cooldownSeconds = maxOf(300.0, (workout.targetDuration ?: 0.0) - fixedSeconds)

        val steps = ArrayList<WebStructuredStep>()
        steps.add(WebStructuredStep("warmup", "Warm up spin", durationSeconds = warmupSeconds, hrZone = 1))
        for (i in 0 until reps) {
            steps.add(
                WebStructuredStep("work", "Interval Rep ${i + 1}", durationSeconds = repSeconds, hrZone = 4),
            )
            if (i < reps - 1) {
                steps.add(
                    WebStructuredStep("recovery", "Recovery spin", durationSeconds = recoverySeconds, hrZone = 1),
                )
            }
        }
        steps.add(WebStructuredStep("cooldown", "Cool down spin", durationSeconds = cooldownSeconds, hrZone = 1))
        return WebStructuredPlan(steps = steps)
    }

    // 4. SWIM SETS
    if (type == "SWIM" || type == "SWIM_DRILL" || type == "OPEN_WATER_SWIM") {
        val totalDist = workout.totalDistance
        val warmup = minOf(200.0, maxOf(50.0, jr(totalDist * 0.15 / 50) * 50))
        val cooldown = minOf(200.0, maxOf(50.0, jr(totalDist * 0.15 / 50) * 50))
        val mainSetDist = totalDist - warmup - cooldown

        return WebStructuredPlan(
            steps = listOf(
                WebStructuredStep("warmup", "Warm up swim", distanceMeters = warmup, paceSecondsPerKm = targetPace),
                WebStructuredStep("work", "Main Set", distanceMeters = mainSetDist, paceSecondsPerKm = targetPace),
                WebStructuredStep("cooldown", "Cool down swim", distanceMeters = cooldown, paceSecondsPerKm = targetPace),
            ),
        )
    }

    // 5. RUN EASY / RECOVERY / LONG RUN
    if (type == "EASY" || type == "RECOVERY" || type == "LONG_RUN") {
        return WebStructuredPlan(
            steps = listOf(
                WebStructuredStep(
                    type = "steady",
                    name = when (type) {
                        "RECOVERY" -> "Recovery run"
                        "LONG_RUN" -> "Long run"
                        else -> "Easy run"
                    },
                    distanceMeters = workout.totalDistance.takeIf { it > 0 },
                    durationSeconds = workout.targetDuration?.takeIf { it > 0 },
                    paceSecondsPerKm = targetPace,
                    hrZone = hrZone,
                ),
            ),
        )
    }

    // 6. RUN QUALITY / INTERVALS
    val repMatch = Regex("(\\d+)x(\\d+(?:\\.\\d+)?)\\s*(km|m)", RegexOption.IGNORE_CASE).find(workout.description)
    if (repMatch != null) {
        val reps = repMatch.groupValues[1].toInt()
        val value = repMatch.groupValues[2].toDouble()
        val unit = repMatch.groupValues[3].lowercase()
        val repDistMeters = if (unit == "km") value * 1000 else value

        var warmupDistance = if (workout.totalDistance >= 5000) 1500.0 else 0.0
        var cooldownDistance = if (workout.totalDistance >= 5000) 1000.0 else 0.0
        val workDistance = reps * repDistMeters
        val supportDistance = maxOf(0.0, workout.totalDistance - workDistance)
        if (warmupDistance + cooldownDistance > supportDistance) {
            warmupDistance = jr(supportDistance * 0.6)
            cooldownDistance = supportDistance - warmupDistance
        }
        val recoveryDistance = if (reps > 1) {
            maxOf(0.0, (supportDistance - warmupDistance - cooldownDistance) / (reps - 1))
        } else 0.0

        val steps = ArrayList<WebStructuredStep>()
        if (warmupDistance > 0) {
            steps.add(WebStructuredStep("warmup", "Warm up", distanceMeters = warmupDistance, hrZone = 1))
        }

        var recoveryName = "Recovery jog"
        if (type == "REPETITIONS") {
            recoveryName = "Rest"
        } else if (workout.description.contains("Threshold") || workout.description.contains("MP")) {
            recoveryName = "Tempo rest"
        }

        for (i in 0 until reps) {
            steps.add(
                WebStructuredStep(
                    "work", "Rep ${i + 1}",
                    distanceMeters = repDistMeters, paceSecondsPerKm = targetPace, hrZone = hrZone,
                ),
            )
            if (i < reps - 1) {
                steps.add(
                    WebStructuredStep(
                        type = "recovery",
                        name = recoveryName,
                        distanceMeters = recoveryDistance.takeIf { it > 0 },
                        durationSeconds = if (recoveryDistance > 0) null else 120.0,
                        hrZone = 1,
                    ),
                )
            }
        }

        if (cooldownDistance > 0) {
            steps.add(WebStructuredStep("cooldown", "Cool down", distanceMeters = cooldownDistance, hrZone = 1))
        }

        return WebStructuredPlan(steps = steps)
    }

    // 7. RUN FARTLEK
    val fartlekMatch = Regex(
        "(\\d+)\\s*min\\s*(?:hard|@\\s*F).*?(\\d+)\\s*min\\s*(?:easy|@\\s*E)",
        RegexOption.IGNORE_CASE,
    ).find(workout.description)
    if (fartlekMatch != null) {
        val hardMin = fartlekMatch.groupValues[1].toInt()
        val easyMin = fartlekMatch.groupValues[2].toInt()
        val cycleSeconds = (hardMin + easyMin) * 60.0

        val warmupSeconds = 600.0
        val cooldownSeconds = 600.0
        val totalSecs = workout.targetDuration
            ?: jr(workout.totalDistance / 1000 * (targetPace ?: 300.0))
        val mainSecs = maxOf(cycleSeconds, totalSecs - warmupSeconds - cooldownSeconds)
        val reps = maxOf(1L, (mainSecs / cycleSeconds).toInt().toLong()).toInt()

        val steps = ArrayList<WebStructuredStep>()
        steps.add(WebStructuredStep("warmup", "Warm up", durationSeconds = warmupSeconds, hrZone = 1))
        for (i in 0 until reps) {
            steps.add(
                WebStructuredStep(
                    "work", "Fartlek Hard ${i + 1}",
                    durationSeconds = hardMin * 60.0, paceSecondsPerKm = targetPace, hrZone = hrZone,
                ),
            )
            steps.add(
                WebStructuredStep(
                    "recovery", "Fartlek Easy ${i + 1}",
                    durationSeconds = easyMin * 60.0,
                    paceSecondsPerKm = targetPace?.let { jr(it * 1.15) },
                    hrZone = 2,
                ),
            )
        }
        steps.add(WebStructuredStep("cooldown", "Cool down", durationSeconds = cooldownSeconds, hrZone = 1))
        return WebStructuredPlan(steps = steps)
    }

    val warmupDistance = if (workout.totalDistance >= 5000) 1500.0 else 0.0
    val cooldownDistance = if (workout.totalDistance >= 5000) 1000.0 else 0.0
    val remainingDistance = maxOf(0.0, workout.totalDistance - warmupDistance - cooldownDistance)

    val steps = ArrayList<WebStructuredStep>()
    if (warmupDistance > 0) {
        steps.add(WebStructuredStep("warmup", "Warm up", distanceMeters = warmupDistance, hrZone = 1))
    }
    steps.add(
        WebStructuredStep(
            type = "work",
            name = workout.description.split(":").firstOrNull()?.takeIf { it.isNotEmpty() } ?: "Main set",
            distanceMeters = (remainingDistance.takeIf { it > 0 } ?: workout.totalDistance.takeIf { it > 0 }),
            paceSecondsPerKm = targetPace,
            hrZone = hrZone,
        ),
    )
    if (cooldownDistance > 0) {
        steps.add(WebStructuredStep("cooldown", "Cool down", distanceMeters = cooldownDistance, hrZone = 1))
    }

    return WebStructuredPlan(steps = steps)
}
