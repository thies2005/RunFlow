package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization
import java.time.LocalDate
import kotlin.math.ceil
import kotlin.math.ln
import kotlin.math.pow

/**
 * Port of Web/src/lib/plans/generators/no-race.ts — general-fitness plans
 * (`generateNoRacePlan` L11-121, phase resolution L123-130, weekly layout
 * L132-424). No race date: BASE/BUILD/MAINTAIN weeks for `weeksTotal` weeks.
 */
internal object WebPlanNoRaceGenerator {

    /** no-race.ts `generateNoRacePlan` (L11-121). */
    fun generate(config: WebPlanConfig): List<WebGeneratedWorkout> {
        val vdot = config.vdot
        val requestedStartDate = config.startDate ?: LocalDate.now()
        val startDate = requestedStartDate
        val runsPerWeek = maxOf(1, config.runsPerWeek ?: 4)
        val ridesPerWeek = maxOf(0, config.ridesPerWeek ?: 0)
        val strengthPerWeek = maxOf(0, config.strengthPerWeek ?: 0)
        val swimsPerWeek = maxOf(0, config.swimsPerWeek ?: 0)
        val longRunDay = config.longRunDay ?: 0
        val workoutDay = config.workoutDay ?: 3

        val peakVolume = config.weeklyMileageGoal.orWebDefault(40000.0)
        val minStart = WebPlanEngine.getMinStartVolume(config.raceType)
        val startVolume: Double = if (config.startWeeklyMileage != null && config.startWeeklyMileage > 0) {
            minOf(maxOf(config.startWeeklyMileage!!, minStart), peakVolume)
        } else {
            val sv = peakVolume * WebPlanEngine.PLAN_CONSTANTS.START_VOLUME_RATIO
            if (sv < minStart) minOf(minStart, peakVolume) else sv
        }
        val maintainVolume = peakVolume

        val totalWeeks: Int = config.weeksTotal ?: run {
            val rampNeeded = if (peakVolume / startVolume > 0) {
                ceil(ln(peakVolume / startVolume) / ln(WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)).toInt()
            } else 0
            maxOf(8, rampNeeded + 4)
        }

        val paces = Personalization.trainingPaces(vdot)
        val easyPace = jr((paces.easy.minSecPerKm + paces.easy.maxSecPerKm) / 2.0)
        val recoveryPace = paces.easy.maxSecPerKm.toDouble()

        val rampWeeks = maxOf(4, ceil(totalWeeks * 0.4).toInt())
        val buildWeeks = maxOf(2, ceil(totalWeeks * 0.3).toInt())
        val maintainWeeks = maxOf(2, totalWeeks - rampWeeks - buildWeeks)

        val growthRate = (peakVolume / startVolume).pow(1.0 / rampWeeks)

        var lastNonRecoveryVolume = startVolume
        var rampIndex = 0

        val workouts = ArrayList<WebGeneratedWorkout>()
        var currentDate = startDate.minusDays(jsDay(startDate).toLong())

        for (week in 0 until totalWeeks) {
            val phase = getNoRacePhase(week, rampWeeks, buildWeeks, maintainWeeks)
            var weekVolumeCap: Double
            val isRecoveryWeek: Boolean

            if (phase == "MAINTAIN") {
                weekVolumeCap = maintainVolume
                val recoveryCheck = (week - rampWeeks - buildWeeks) %
                    WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE ==
                    WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE - 1
                isRecoveryWeek = recoveryCheck
                if (isRecoveryWeek) {
                    weekVolumeCap = jr(maintainVolume * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
                }
            } else {
                val weekInPhase = if (phase == "BASE") week else week - rampWeeks
                isRecoveryWeek = (weekInPhase + 1) % WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE == 0
                if (isRecoveryWeek) {
                    weekVolumeCap = jr(
                        lastNonRecoveryVolume * growthRate * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR,
                    )
                } else {
                    rampIndex++
                    var cap = jr(startVolume * growthRate.pow(rampIndex.toDouble()))
                    cap = minOf(cap, peakVolume)
                    lastNonRecoveryVolume = cap
                    weekVolumeCap = cap
                }
            }

            weekVolumeCap = maxOf(minStart, weekVolumeCap)

            val weekSchedule = generateNoRaceWeek(
                phase = phase,
                paces = paces,
                runsPerWeek = runsPerWeek,
                ridesPerWeek = ridesPerWeek,
                strengthPerWeek = strengthPerWeek,
                swimsPerWeek = swimsPerWeek,
                weeklyVolume = weekVolumeCap,
                preferredLongRunDay = longRunDay,
                preferredWorkoutDay = workoutDay,
                preferredSwimDay = config.swimDay,
                restDays = config.restDays,
                isRecoveryWeek = isRecoveryWeek,
                weekIndex = week,
                easyPace = easyPace,
                recoveryPace = recoveryPace,
            )

            for (w in weekSchedule) {
                val specificDate = currentDate.plusDays(w.dayOffset.toLong())
                if (specificDate < startDate) continue
                if (isRunType(w.type) && w.totalDistance == 0.0) continue
                workouts.add(
                    WebGeneratedWorkout(
                        date = specificDate,
                        type = w.type,
                        description = w.description,
                        totalDistance = w.totalDistance,
                        targetPace = w.targetPace,
                        targetDuration = w.targetDuration,
                        phase = phase,
                    )
                )
            }

            currentDate = currentDate.plusDays(7)
        }

        val result = WebPlanScheduleUtils.fixBackToBackSameType(
            workouts,
            raceDate = null,
            restDays = config.restDays,
        )
        WebPlanDescriptions.enrichWorkoutsWithDescriptions(result)
        return result
    }

    /** no-race.ts `getNoRacePhase` (L123-130). */
    private fun getNoRacePhase(weekIndex: Int, rampWeeks: Int, buildWeeks: Int, maintainWeeks: Int): String {
        if (weekIndex < rampWeeks) return "BASE"
        if (weekIndex < rampWeeks + buildWeeks) return "BUILD"
        return "MAINTAIN"
    }

    /** no-race.ts `generateNoRaceWeek` (L132-424). */
    private fun generateNoRaceWeek(
        phase: String,
        paces: Personalization.PersonTrainingPaces,
        runsPerWeek: Int,
        ridesPerWeek: Int,
        strengthPerWeek: Int,
        swimsPerWeek: Int,
        weeklyVolume: Double,
        preferredLongRunDay: Int,
        preferredWorkoutDay: Int,
        preferredSwimDay: Int?,
        restDays: List<Int>?,
        isRecoveryWeek: Boolean,
        weekIndex: Int,
        easyPace: Double,
        recoveryPace: Double,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()
        val hardSessionDays = ArrayList<Int>()

        if (restDays != null && restDays.isNotEmpty()) {
            for (rd in restDays) usedDays.add(rd)
        }

        val longRunDist = minOf(
            jr(weeklyVolume * WebPlanEngine.PLAN_CONSTANTS.LONG_RUN_RATIO),
            22000.0,
        )

        val hasQuality = runsPerWeek >= 3 && !isRecoveryWeek && (phase != "MAINTAIN" || weekIndex % 2 == 0)

        fun getAvailableDay(preferred: Int, gapFrom: List<Int>): Int {
            val candidates = ArrayList<Int>()
            for (d in 0 until 7) {
                if (usedDays.contains(d)) continue
                val tooClose = gapFrom.any { hd ->
                    val diff = kotlin.math.abs(d - hd)
                    minOf(diff, 7 - diff) < WebPlanEngine.PLAN_CONSTANTS.MIN_GAP_DAYS
                }
                if (!tooClose) candidates.add(d)
            }
            if (candidates.contains(preferred)) return preferred
            if (candidates.isNotEmpty()) {
                return candidates.sortedBy { kotlin.math.abs(it - preferred) }[0]
            }
            if (!usedDays.contains(preferred)) return preferred
            for (offset in 1..6) {
                val after = (preferred + offset) % 7
                if (!usedDays.contains(after)) return after
                val before = (preferred - offset + 7) % 7
                if (!usedDays.contains(before)) return before
            }
            return preferred
        }

        val longRunDayResolved = getAvailableDay(preferredLongRunDay, emptyList())
        usedDays.add(longRunDayResolved)
        hardSessionDays.add(longRunDayResolved)

        workouts.add(
            WebScheduledWorkout(
                dayOffset = longRunDayResolved,
                type = "LONG_RUN",
                description = "Long Run: ${WebPlanEngine.toFixed1(longRunDist / 1000)}km @ Easy",
                totalDistance = longRunDist,
                targetPace = easyPace,
                targetDuration = 0.0,
            )
        )

        if (hasQuality) {
            val qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays)
            usedDays.add(qualityDay)
            hardSessionDays.add(qualityDay)

            val cycle = weekIndex % 4

            if (phase == "MAINTAIN") {
                if (cycle == 0 || cycle == 1) {
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "EASY",
                            description = "Steady Run: 8km with 6x100m Strides",
                            totalDistance = 8000.0, targetPace = easyPace, targetDuration = 0.0,
                        )
                    )
                } else {
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "TEMPO",
                            description = "Tempo: 5km @ Marathon Pace",
                            totalDistance = 8000.0, targetPace = paces.marathon.toDouble(), targetDuration = 0.0,
                        )
                    )
                }
            } else if (phase == "BASE") {
                when (cycle) {
                    0 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "FARTLEK",
                            description = "Fartlek: 8km (3min hard / 2min easy)",
                            totalDistance = 8000.0,
                            targetPace = jr((paces.threshold + paces.interval) / 2.0),
                            targetDuration = 0.0,
                        )
                    )

                    1 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "EASY",
                            description = "Hill Repeats: 6x200m hills (easy jog down)",
                            totalDistance = 8000.0, targetPace = easyPace, targetDuration = 0.0,
                        )
                    )

                    2 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "INTERVALS",
                            description = "Cruise Intervals: 3x1.5km @ Threshold",
                            totalDistance = 8500.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                        )
                    )

                    else -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "TEMPO",
                            description = "Progression: 8km (start Easy, end at Tempo)",
                            totalDistance = 8000.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                        )
                    )
                }
            } else {
                when (cycle) {
                    0 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "FARTLEK",
                            description = "Fartlek: 10km (4min hard / 2min easy)",
                            totalDistance = 10000.0,
                            targetPace = jr((paces.threshold + paces.interval) / 2.0),
                            targetDuration = 0.0,
                        )
                    )

                    1 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "EASY",
                            description = "Hill Repeats: 8x200m hills (easy jog down)",
                            totalDistance = 9000.0, targetPace = easyPace, targetDuration = 0.0,
                        )
                    )

                    2 -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "INTERVALS",
                            description = "Cruise Intervals: 4x1.5km @ Threshold",
                            totalDistance = 10000.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                        )
                    )

                    else -> workouts.add(
                        WebScheduledWorkout(
                            dayOffset = qualityDay, type = "TEMPO",
                            description = "Progression: 10km (start Easy, end at Tempo)",
                            totalDistance = 10000.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                        )
                    )
                }
            }
        }

        val qualityDistance = workouts
            .filter { w -> w.type != "LONG_RUN" && isRunType(w.type) }
            .sumOf { it.totalDistance }
        val keyRunCount = if (hasQuality) 2 else 1
        val easyRunsCount = maxOf(0, runsPerWeek - keyRunCount)
        val remainingVol = maxOf(0.0, weeklyVolume - longRunDist - qualityDistance)
        val easyDist = if (easyRunsCount > 0) {
            maxOf(
                WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MIN,
                minOf(
                    WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MAX,
                    jr(remainingVol / easyRunsCount / 100) * 100,
                ),
            )
        } else 0.0

        for (i in 0 until easyRunsCount) {
            val day = getAvailableDay((preferredLongRunDay + 2 + i * 2) % 7, hardSessionDays)
            if (usedDays.contains(day)) break
            usedDays.add(day)

            val dayAfterHard = hardSessionDays.any { hd ->
                val diff = (day - hd + 7) % 7
                diff == 1
            }

            if (dayAfterHard) {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = day, type = "RECOVERY",
                        description = "Recovery: ${WebPlanEngine.toFixed1(easyDist / 1000)}km",
                        totalDistance = easyDist, targetPace = recoveryPace, targetDuration = 0.0,
                    )
                )
            } else {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = day, type = "EASY",
                        description = "Easy: ${WebPlanEngine.toFixed1(easyDist / 1000)}km",
                        totalDistance = easyDist, targetPace = easyPace, targetDuration = 0.0,
                    )
                )
            }
        }

        var remainingRides = ridesPerWeek
        var remainingSwims = swimsPerWeek

        if (preferredSwimDay != null && remainingSwims > 0 && !usedDays.contains(preferredSwimDay)) {
            usedDays.add(preferredSwimDay)
            remainingSwims--
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = preferredSwimDay, type = "SWIM",
                    description = "Swim: 1500m @ Easy",
                    totalDistance = 1500.0, targetPace = 120.0, targetDuration = 2700.0,
                )
            )
        }

        val freeDaysForCT = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d)) freeDaysForCT.add(d)
        }

        for (d in freeDaysForCT) {
            if (remainingRides <= 0 && remainingSwims <= 0) break
            usedDays.add(d)
            if (remainingRides > 0) {
                remainingRides--
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d, type = "RIDE",
                        description = "Bike: 60min (Zone 1-2)",
                        totalDistance = 0.0, targetPace = 0.0, targetDuration = 3600.0,
                    )
                )
            } else if (remainingSwims > 0) {
                remainingSwims--
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d, type = "SWIM",
                        description = "Swim: 1500m @ Easy",
                        totalDistance = 1500.0, targetPace = 120.0, targetDuration = 2700.0,
                    )
                )
            }
        }

        var remainingStrength = strengthPerWeek
        val strengthFreeDays = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d)) strengthFreeDays.add(d)
        }
        for (d in strengthFreeDays) {
            if (remainingStrength <= 0) break
            usedDays.add(d)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = d, type = "STRENGTH",
                    description = "Strength: 45min",
                    totalDistance = 0.0, targetPace = 0.0, targetDuration = 2700.0,
                )
            )
            remainingStrength--
        }

        return workouts
    }

    /** no-race.ts `isRunType` (L426-428). */
    private fun isRunType(type: String): Boolean =
        type == "EASY" || type == "LONG_RUN" || type == "TEMPO" || type == "INTERVALS" ||
            type == "FARTLEK" || type == "RECOVERY" || type == "RACE" || type == "REPETITIONS"
}
