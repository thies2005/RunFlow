package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.domain.plan.structured.Duration
import com.runflow2.app.domain.plan.structured.RepeatGroup
import com.runflow2.app.domain.plan.structured.StepNode
import com.runflow2.app.domain.plan.structured.StructuredStep
import com.runflow2.app.domain.plan.structured.StructuredWorkoutV2
import com.runflow2.app.domain.plan.structured.Target
import kotlin.math.roundToInt

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

internal data class WebSwimPaceWindow(val min: Int, val max: Int, val label: String)

internal data class WebSwimPaces(
    val easy: WebSwimPaceWindow,
    val steady: WebSwimPaceWindow,
    val threshold: WebSwimPaceWindow,
    val interval: WebSwimPaceWindow,
)

internal fun calculateSwimPaces(swimCssSecPer100m: Int?): WebSwimPaces {
    val css = if (swimCssSecPer100m != null && swimCssSecPer100m > 0) swimCssSecPer100m else 120
    fun window(min: Int, max: Int, label: String) = WebSwimPaceWindow(
        min = maxOf(20, min),
        max = maxOf(maxOf(20, min), max),
        label = label,
    )
    return WebSwimPaces(
        easy = window(css + 8, css + 10, "Swim Easy"),
        steady = window(css + 2, css + 5, "Swim Endurance"),
        threshold = window(css, css + 2, "CSS"),
        interval = window(maxOf(20, css - 6), maxOf(20, css - 4), "Swim Interval"),
    )
}

data class StructuredStepsContext(
    val vdot: Double = 45.0,
    val ftpWatts: Double? = null,
    val swimCssSecPer100m: Int? = null,
    val hrZones: List<Personalization.HrZone>? = null,
)

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

    val bikeFtp = config.ftpWatts?.takeIf { it > 0 }?.toDouble() ?: estimateBikeFtpFromVdot(config.vdot)
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
// Structured steps — index.ts L1788-2048 / Schema v2
// -------------------------------------------------------------------

/**
 * Port of `buildStructuredStepsForWorkout` (index.ts L1970-2277): derives the
 * canonical v2 structured step tree from a workout's type + description.
 */
fun buildStructuredStepsForWorkout(
    workout: WebGeneratedWorkout,
    context: StructuredStepsContext = StructuredStepsContext(),
): StructuredWorkoutV2? {
    if (workout.totalDistance <= 0 && (workout.targetDuration == null || workout.targetDuration <= 0)) return null

    val type = workout.type
    val vdot = if (context.vdot > 0) context.vdot else 45.0
    val bikeFtp = if (context.ftpWatts != null && context.ftpWatts > 0) {
        jr(context.ftpWatts).toDouble()
    } else {
        estimateBikeFtpFromVdot(vdot)
    }
    val swimCss = if (context.swimCssSecPer100m != null && context.swimCssSecPer100m > 0) {
        context.swimCssSecPer100m
    } else {
        estimateSwimPaceFromVdot(vdot).toInt()
    }
    val bikeZones = calculateBikeZones(bikeFtp)
    val swimPaces = calculateSwimPaces(swimCss)
    val paces = Personalization.trainingPaces(vdot)
    val targetPace = workout.targetPace?.takeIf { it > 0 }
    val hrZone = workout.targetHrZone

    // 1. STRENGTH & TRANSITION PRACTICE
    if (type == "STRENGTH" || type == "TRANSITION_PRACTICE") {
        if (type == "TRANSITION_PRACTICE") {
            return StructuredWorkoutV2(
                version = 2,
                source = "engine",
                steps = listOf(
                    StructuredStep(
                        kind = "steady",
                        label = "Transition Practice",
                        duration = Duration.Time((workout.targetDuration?.takeIf { it > 0 } ?: 1800.0).toInt()),
                        target = Target.Rpe(5),
                    ),
                ),
            )
        }

        val totalSec = (workout.targetDuration?.takeIf { it > 0 } ?: 2700.0).toInt()
        val warmupSec = maxOf(240, jr(totalSec * 0.12).toInt())
        val cooldownSec = maxOf(240, jr(totalSec * 0.12).toInt())
        val roundRestSec = 60
        val rounds = 3
        val roundSec = maxOf(
            240,
            jr((totalSec - warmupSec - cooldownSec - roundRestSec * (rounds - 1)).toDouble() / rounds).toInt(),
        )

        return StructuredWorkoutV2(
            version = 2,
            source = "engine",
            steps = listOf(
                StructuredStep(
                    kind = "warmup",
                    label = "Warmup & Mobility",
                    duration = Duration.Time(warmupSec),
                    target = Target.Rpe(4),
                ),
                RepeatGroup(
                    times = rounds,
                    setRest = Duration.Time(roundRestSec),
                    steps = listOf(
                        StructuredStep(
                            kind = "work",
                            label = "Strength Circuit",
                            duration = Duration.Time(roundSec),
                            target = Target.Rpe(7),
                        ),
                    ),
                    label = "Main Circuit",
                ),
                StructuredStep(
                    kind = "cooldown",
                    label = "Mobility & Stretching",
                    duration = Duration.Time(cooldownSec),
                    target = Target.Rpe(3),
                ),
            ),
        )
    }

    // 2. BRICK
    if (type == "BRICK") {
        val match = Regex("(\\d+)\\s*min\\s*Bike\\s*(?:→|->)\\s*(\\d+)\\s*min\\s*Run", RegexOption.IGNORE_CASE)
            .find(workout.description)
        val bikeMinutes = match?.groupValues?.get(1)?.toIntOrNull() ?: 45
        val runMinutes = match?.groupValues?.get(2)?.toIntOrNull() ?: 15
        val bikeSeconds = bikeMinutes * 60
        val runSeconds = runMinutes * 60
        val runBrickPace = targetPace ?: jr((paces.easy.minSecPerKm + paces.easy.maxSecPerKm) / 2.0)
        val midWatts = (bikeZones.endurance.min + bikeZones.endurance.max) / 2.0
        val ftpPercent = if (bikeFtp > 0) jr((midWatts / bikeFtp) * 100).toInt() else null

        return StructuredWorkoutV2(
            version = 2,
            source = "engine",
            steps = listOf(
                StructuredStep(
                    kind = "steady",
                    label = "Bike Leg",
                    duration = Duration.Time(bikeSeconds),
                    target = Target.Power(
                        minWatts = bikeZones.endurance.min,
                        maxWatts = bikeZones.endurance.max,
                        ftpPercent = ftpPercent,
                        zoneLabel = "Z2 Endurance",
                    ),
                    cadenceRpm = 90,
                    hrZone = 2,
                ),
                StructuredStep(
                    kind = "transition",
                    label = "T2 Bike-to-Run Transition",
                    duration = Duration.Time(120),
                    target = Target.Free,
                ),
                StructuredStep(
                    kind = "work",
                    label = "Run Leg",
                    duration = Duration.Time(runSeconds),
                    target = Target.Pace(
                        unit = "sec_per_km",
                        min = jr(runBrickPace * 0.97),
                        max = jr(runBrickPace * 1.03),
                        zoneLabel = "Brick Run",
                    ),
                    hrZone = hrZone ?: 2,
                ),
            ),
        )
    }

    // 3. BIKE RIDES (Steady & Intervals)
    if (type == "RIDE" || type == "LONG_RIDE") {
        val durationSec = (workout.targetDuration?.takeIf { it > 0 } ?: 3600.0).toInt()
        val midWatts = (bikeZones.endurance.min + bikeZones.endurance.max) / 2.0
        val ftpPercent = if (bikeFtp > 0) jr((midWatts / bikeFtp) * 100).toInt() else null

        return StructuredWorkoutV2(
            version = 2,
            source = "engine",
            steps = listOf(
                StructuredStep(
                    kind = "steady",
                    label = if (type == "LONG_RIDE") "Long Ride" else "Easy Ride",
                    duration = Duration.Time(durationSec),
                    target = Target.Power(
                        minWatts = bikeZones.endurance.min,
                        maxWatts = bikeZones.endurance.max,
                        ftpPercent = ftpPercent,
                        zoneLabel = "Z2 Endurance",
                    ),
                    cadenceRpm = 90,
                    hrZone = hrZone ?: 2,
                ),
            ),
        )
    }

    if (type == "RIDE_INTERVALS") {
        val match = Regex("(\\d+)x(\\d+)\\s*min", RegexOption.IGNORE_CASE).find(workout.description)
        val reps = match?.groupValues?.get(1)?.toIntOrNull() ?: 4
        val repMinutes = match?.groupValues?.get(2)?.toIntOrNull() ?: 5

        val warmupSeconds = 600
        val repSeconds = repMinutes * 60
        val recoverySeconds = 180
        val fixedSeconds = warmupSeconds + (reps * repSeconds) + ((reps - 1) * recoverySeconds)
        val cooldownSeconds = maxOf(300, (workout.targetDuration?.toInt() ?: 0) - fixedSeconds)

        val recMidWatts = (bikeZones.recovery.min + bikeZones.recovery.max) / 2.0
        val recFtpPercent = if (bikeFtp > 0) jr((recMidWatts / bikeFtp) * 100).toInt() else null
        val threshMidWatts = (bikeZones.threshold.min + bikeZones.threshold.max) / 2.0
        val threshFtpPercent = if (bikeFtp > 0) jr((threshMidWatts / bikeFtp) * 100).toInt() else null

        return StructuredWorkoutV2(
            version = 2,
            source = "engine",
            steps = listOf(
                StructuredStep(
                    kind = "warmup",
                    label = "Warm up spin",
                    duration = Duration.Time(warmupSeconds),
                    target = Target.Power(
                        minWatts = bikeZones.recovery.min,
                        maxWatts = bikeZones.recovery.max,
                        ftpPercent = recFtpPercent,
                        zoneLabel = "Z1 Recovery",
                    ),
                    cadenceRpm = 85,
                    hrZone = 1,
                ),
                RepeatGroup(
                    times = reps,
                    setRest = Duration.Time(recoverySeconds),
                    steps = listOf(
                        StructuredStep(
                            kind = "work",
                            label = "Interval",
                            duration = Duration.Time(repSeconds),
                            target = Target.Power(
                                minWatts = bikeZones.threshold.min,
                                maxWatts = bikeZones.threshold.max,
                                ftpPercent = threshFtpPercent,
                                zoneLabel = "Z4 Threshold",
                            ),
                            cadenceRpm = 95,
                            hrZone = hrZone ?: 4,
                        ),
                    ),
                    label = "${reps}×${repMinutes}min",
                ),
                StructuredStep(
                    kind = "cooldown",
                    label = "Cool down spin",
                    duration = Duration.Time(cooldownSeconds),
                    target = Target.Power(
                        minWatts = bikeZones.recovery.min,
                        maxWatts = bikeZones.recovery.max,
                        ftpPercent = recFtpPercent,
                        zoneLabel = "Z1 Recovery",
                    ),
                    cadenceRpm = 85,
                    hrZone = 1,
                ),
            ),
        )
    }

    // 4. SWIM SETS
    if (type == "SWIM" || type == "SWIM_DRILL" || type == "OPEN_WATER_SWIM") {
        val totalDist = workout.totalDistance
        val warmup = minOf(200.0, maxOf(50.0, jr(totalDist * 0.15 / 50.0) * 50.0))
        val cooldown = minOf(200.0, maxOf(50.0, jr(totalDist * 0.15 / 50.0) * 50.0))
        val mainSetDist = maxOf(0.0, totalDist - warmup - cooldown)

        val easyWindow = swimPaces.easy
        val warmupPaceTarget: Target = if (targetPace != null) {
            Target.Pace(
                unit = "sec_per_100m",
                min = jr(targetPace * 1.02),
                max = jr(targetPace * 1.08),
                zoneLabel = easyWindow.label,
            )
        } else {
            Target.Pace(
                unit = "sec_per_100m",
                min = easyWindow.min.toDouble(),
                max = easyWindow.max.toDouble(),
                zoneLabel = easyWindow.label,
            )
        }

        val mainWindow = swimPaces.steady
        val mainPaceTarget: Target = if (targetPace != null) {
            Target.Pace(
                unit = "sec_per_100m",
                min = jr(targetPace * 0.97),
                max = jr(targetPace * 1.03),
                zoneLabel = if (type == "SWIM_DRILL") "Swim Drill" else mainWindow.label,
            )
        } else {
            Target.Pace(
                unit = "sec_per_100m",
                min = mainWindow.min.toDouble(),
                max = mainWindow.max.toDouble(),
                zoneLabel = mainWindow.label,
            )
        }

        val repDistance = if (type == "SWIM_DRILL") 50.0 else 100.0
        val steps = mutableListOf<StepNode>()
        steps.add(
            StructuredStep(
                kind = "warmup",
                label = "Warm up swim",
                duration = Duration.Distance(warmup),
                target = warmupPaceTarget,
                hrZone = 1,
            ),
        )
        if (mainSetDist > 0.0) {
            val times = (mainSetDist / repDistance).toInt().coerceIn(1, 100)
            val remainder = mainSetDist - times * repDistance
            steps.add(
                RepeatGroup(
                    times = times,
                    setRest = Duration.Time(20),
                    steps = listOf(
                        StructuredStep(
                            kind = "work",
                            label = if (type == "SWIM_DRILL") "Drill" else "Swim",
                            duration = Duration.Distance(repDistance),
                            target = mainPaceTarget,
                            hrZone = hrZone ?: 2,
                        ),
                    ),
                    label = "Main Set ${times}×${repDistance.toInt()}m",
                ),
            )
            if (remainder >= repDistance / 2.0) {
                steps.add(
                    StructuredStep(
                        kind = "steady",
                        label = "Steady swim",
                        duration = Duration.Distance(remainder),
                        target = mainPaceTarget,
                        hrZone = hrZone ?: 2,
                    ),
                )
            }
        }
        steps.add(
            StructuredStep(
                kind = "cooldown",
                label = "Cool down swim",
                duration = Duration.Distance(cooldown),
                target = warmupPaceTarget,
                hrZone = 1,
            ),
        )

        return StructuredWorkoutV2(version = 2, source = "engine", steps = steps)
    }

    // 5. RUN EASY / RECOVERY / LONG RUN
    if (type == "EASY" || type == "RECOVERY" || type == "LONG_RUN") {
        val step = if (workout.totalDistance > 0) {
            StructuredStep(
                kind = "steady",
                label = when (type) {
                    "RECOVERY" -> "Recovery run"
                    "LONG_RUN" -> "Long run"
                    else -> "Easy run"
                },
                duration = Duration.Distance(workout.totalDistance),
                target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it), max = jr(it)) },
                hrZone = hrZone,
            )
        } else {
            StructuredStep(
                kind = "steady",
                label = when (type) {
                    "RECOVERY" -> "Recovery run"
                    "LONG_RUN" -> "Long run"
                    else -> "Easy run"
                },
                duration = Duration.Time((workout.targetDuration?.takeIf { it > 0 } ?: 3600.0).toInt()),
                target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it), max = jr(it)) },
                hrZone = hrZone,
            )
        }
        return StructuredWorkoutV2(version = 2, source = "engine", steps = listOf(step))
    }

    // 6. RUN QUALITY / INTERVALS
    val repMatch = Regex("(\\d+)x(\\d+(?:\\.\\d+)?)\\s*(km|m)", RegexOption.IGNORE_CASE).find(workout.description)
    if (repMatch != null) {
        val reps = repMatch.groupValues[1].toInt()
        val value = repMatch.groupValues[2].toDouble()
        val unit = repMatch.groupValues[3].lowercase()
        val repDistMeters = if (unit == "km") value * 1000.0 else value

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

        val steps = mutableListOf<StepNode>()
        if (warmupDistance >= 1.0) {
            steps.add(StructuredStep(kind = "warmup", label = "Warm up", duration = Duration.Distance(warmupDistance), hrZone = 1))
        }

        val setRest: Duration = if (recoveryDistance >= 1.0) {
            Duration.Distance(maxOf(1.0, jr(recoveryDistance)))
        } else {
            Duration.Time(120)
        }

        val workStep = StructuredStep(
            kind = "work",
            label = "Rep",
            duration = Duration.Distance(repDistMeters),
            target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it), max = jr(it)) },
            hrZone = hrZone,
        )

        val repLabel = if (repDistMeters >= 1000.0) {
            val km = repDistMeters / 1000.0
            if (km == km.toInt().toDouble()) "${km.toInt()}km" else "${"%.1f".format(java.util.Locale.US, km)}km"
        } else {
            "${repDistMeters.roundToInt()}m"
        }

        steps.add(RepeatGroup(times = reps, setRest = setRest, steps = listOf(workStep), label = "${reps}×${repLabel}"))

        if (cooldownDistance >= 1.0) {
            steps.add(StructuredStep(kind = "cooldown", label = "Cool down", duration = Duration.Distance(cooldownDistance), hrZone = 1))
        }

        return StructuredWorkoutV2(version = 2, source = "engine", steps = steps)
    }

    // 7. RUN FARTLEK
    val fartlekMatch = Regex(
        "(\\d+)\\s*min\\s*(?:hard|@\\s*F).*?(\\d+)\\s*min\\s*(?:easy|@\\s*E)",
        RegexOption.IGNORE_CASE,
    ).find(workout.description)
    if (fartlekMatch != null) {
        val hardMin = fartlekMatch.groupValues[1].toInt()
        val easyMin = fartlekMatch.groupValues[2].toInt()
        val cycleSeconds = (hardMin + easyMin) * 60

        val warmupSeconds = 600
        val cooldownSeconds = 600
        val totalSecs = workout.targetDuration?.toInt()
            ?: jr((workout.totalDistance / 1000.0) * (targetPace ?: 300.0)).toInt()
        val mainSecs = maxOf(cycleSeconds, totalSecs - warmupSeconds - cooldownSeconds)
        val reps = maxOf(1, mainSecs / cycleSeconds)

        val workStep = StructuredStep(
            kind = "work",
            label = "Fartlek Hard",
            duration = Duration.Time(hardMin * 60),
            target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it), max = jr(it)) },
            hrZone = hrZone,
        )
        val easyStep = StructuredStep(
            kind = "recovery",
            label = "Fartlek Easy",
            duration = Duration.Time(easyMin * 60),
            target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it * 1.15), max = jr(it * 1.15)) },
            hrZone = 2,
        )

        return StructuredWorkoutV2(
            version = 2,
            source = "engine",
            steps = listOf(
                StructuredStep(kind = "warmup", label = "Warm up", duration = Duration.Time(warmupSeconds), hrZone = 1),
                RepeatGroup(times = reps, setRest = null, steps = listOf(workStep, easyStep), label = "Fartlek Cycles"),
                StructuredStep(kind = "cooldown", label = "Cool down", duration = Duration.Time(cooldownSeconds), hrZone = 1),
            ),
        )
    }

    // 8. Generic fallback
    val warmupDistance = if (workout.totalDistance >= 5000) 1500.0 else 0.0
    val cooldownDistance = if (workout.totalDistance >= 5000) 1000.0 else 0.0
    val remainingDistance = maxOf(0.0, workout.totalDistance - warmupDistance - cooldownDistance)

    val steps = mutableListOf<StepNode>()
    if (warmupDistance >= 1.0) {
        steps.add(StructuredStep(kind = "warmup", label = "Warm up", duration = Duration.Distance(clampStepMeters(warmupDistance)), hrZone = 1))
    }
    val workStep = StructuredStep(
        kind = "work",
        label = workout.description.split(":").firstOrNull()?.takeIf { it.isNotEmpty() } ?: "Main set",
        duration = Duration.Distance(clampStepMeters(if (remainingDistance > 0) remainingDistance else workout.totalDistance)),
        target = targetPace?.let { Target.Pace(unit = "sec_per_km", min = jr(it), max = jr(it)) },
        hrZone = hrZone,
    )
    steps.add(workStep)
    if (cooldownDistance >= 1.0) {
        steps.add(StructuredStep(kind = "cooldown", label = "Cool down", duration = Duration.Distance(clampStepMeters(cooldownDistance)), hrZone = 1))
    }

    return StructuredWorkoutV2(version = 2, source = "engine", steps = steps)
}

private fun clampStepMeters(meters: Double): Double =
    maxOf(1.0, minOf(100000.0, meters.roundToInt().toDouble()))

private fun clampStepSeconds(seconds: Int): Int = seconds.coerceIn(1, 86400)

