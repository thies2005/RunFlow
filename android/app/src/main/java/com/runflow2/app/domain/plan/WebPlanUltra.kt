package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.pow

/**
 * Port of Web/src/lib/plans/generators/run-ultra.ts — ultra/timed/backyard
 * plans (`generateUltraPlan` L63-275, `getUltraPhase` L277-297, ultra taper
 * volumes L299-310, long-run math L312-336, weekly layout L338-564, quality
 * sessions L566-601, race week L603-645, volume scaling L647-670).
 */
internal object WebPlanUltraGenerator {

    private const val MAX_TIME_ON_FEET_SECONDS: Double = 25200.0
    private const val BACK_TO_BACK_RATIO: Double = 0.6
    private const val LONG_RUN_RATIO_ULTRA: Double = 0.50

    private val MIN_PEAK_VOLUME: Map<String, Double> = mapOf(
        "FIFTY_K" to 50000.0, "FIFTY_MILE" to 60000.0, "HUNDRED_K" to 70000.0,
        "HUNDRED_MILE" to 80000.0, "TWELVE_HOUR" to 60000.0,
        "TWENTY_FOUR_HOUR" to 70000.0, "BACKYARD_ULTRA" to 60000.0,
    )

    private val MAX_LONG_RUN_DIST: Map<String, Double> = mapOf(
        "FIFTY_K" to 35000.0, "FIFTY_MILE" to 40000.0, "HUNDRED_K" to 45000.0,
        "HUNDRED_MILE" to 50000.0, "TWELVE_HOUR" to 40000.0,
        "TWENTY_FOUR_HOUR" to 50000.0, "BACKYARD_ULTRA" to 35000.0,
    )

    private val TAPER_FRACTIONS: Map<String, List<Double>> = mapOf(
        "FIFTY_K" to listOf(0.75, 0.55),
        "FIFTY_MILE" to listOf(0.75, 0.55),
        "HUNDRED_K" to listOf(0.75, 0.55),
        "HUNDRED_MILE" to listOf(0.80, 0.65, 0.50),
        "TWELVE_HOUR" to listOf(0.75, 0.55),
        "TWENTY_FOUR_HOUR" to listOf(0.80, 0.65, 0.50),
        "BACKYARD_ULTRA" to listOf(0.75, 0.55),
    )

    private val RACE_DISTANCE_KM: Map<String, String> = mapOf(
        "FIFTY_K" to "50", "FIFTY_MILE" to "80.5", "HUNDRED_K" to "100",
        "HUNDRED_MILE" to "161", "TWELVE_HOUR" to "12h",
        "TWENTY_FOUR_HOUR" to "24h", "BACKYARD_ULTRA" to "Backyard Ultra",
    )

    private val RACE_DISTANCE_M: Map<String, Double> = mapOf(
        "FIFTY_K" to 50000.0, "FIFTY_MILE" to 80467.0,
        "HUNDRED_K" to 100000.0, "HUNDRED_MILE" to 160934.0,
    )

    /** run-ultra.ts `generateUltraPlan` (L63-275). */
    fun generate(config: WebPlanConfig): List<WebGeneratedWorkout> {
        val vdot = config.vdot
        val raceDate = config.raceDate
        val raceType = config.raceType!!
        val requestedStartDate = config.startDate ?: LocalDate.now()
        val startDate = if (requestedStartDate > raceDate) raceDate else requestedStartDate
        val runsPerWeek = maxOf(3, config.runsPerWeek ?: 5)
        val strengthPerWeek = maxOf(0, config.strengthPerWeek ?: 1)
        val longRunDay = config.longRunDay ?: 0

        val isBackyardUltra = raceType == "BACKYARD_ULTRA"
        val isTimedEvent = raceType == "TWELVE_HOUR" || raceType == "TWENTY_FOUR_HOUR"

        var peakVolume = config.weeklyMileageGoal.orWebDefault(60000.0)
        val minPeak = MIN_PEAK_VOLUME[raceType] ?: 60000.0
        if (peakVolume < minPeak) peakVolume = minPeak

        val weekStart = startDate.minusDays(jsDay(startDate).toLong())

        val totalWeeks = minOf(
            WebPlanEngine.PLAN_CONSTANTS.MAX_TOTAL_WEEKS,
            maxOf(
                1,
                (ChronoUnit.DAYS.between(weekStart, raceDate) / 7).toInt() + 1,
            ),
        )

        val minStart = WebPlanEngine.getMinStartVolume(config.raceType)
        val startVolume: Double = if (config.startWeeklyMileage != null && config.startWeeklyMileage > 0) {
            minOf(maxOf(config.startWeeklyMileage!!, minStart), peakVolume)
        } else {
            val sv = peakVolume * WebPlanEngine.PLAN_CONSTANTS.START_VOLUME_RATIO
            if (sv < minStart) minOf(minStart, peakVolume) else sv
        }

        val paces = Personalization.trainingPaces(vdot)
        val ultraEasyPace = computeUltraEventPace(raceType, paces)

        val taperFractions = TAPER_FRACTIONS[raceType]
        val defaultTaperWeeks = taperFractions?.size ?: 2
        val phases = WebPlanEngine.resolvePhaseBudget(
            totalWeeks,
            config.taperWeeks,
            config.peakWeeks,
            config.buildWeeks,
            isUltra = true,
            isBackyardUltra = isBackyardUltra,
            defaultTaper = defaultTaperWeeks,
        )
        val taperWeeks = phases.taperWeeks
        val peakWeeks = phases.peakWeeks
        val buildWeeks = phases.buildWeeks
        val enduranceWeeks = phases.enduranceWeeks
        val mentalPrepWeeks = phases.mentalPrepWeeks

        val growthRatio = peakVolume / startVolume
        val minRampWeeks = if (growthRatio > 1.001) {
            ceil(ln(growthRatio) / ln(WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)).toInt()
        } else 1

        var calendarRampWeeks = minRampWeeks
        while (calendarRampWeeks - calendarRampWeeks / WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE < minRampWeeks) {
            calendarRampWeeks++
        }

        val availableRampWeeks = maxOf(1, totalWeeks - taperWeeks - mentalPrepWeeks)
        var effectivePeakVolume = peakVolume
        if (availableRampWeeks < calendarRampWeeks) {
            val effWeeks = availableRampWeeks - availableRampWeeks / WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE
            effectivePeakVolume = jr(
                startVolume *
                    WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP.pow(maxOf(1, effWeeks).toDouble()),
            )
            calendarRampWeeks = availableRampWeeks
        }

        val effectiveWeeksInRamp = maxOf(
            1,
            calendarRampWeeks - calendarRampWeeks / WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE,
        )
        val weeklyGrowthRate = (effectivePeakVolume / startVolume).pow(1.0 / effectiveWeeksInRamp)

        var lastNonRecoveryVolume = startVolume
        var effectiveWeekIndex = 0
        var baseBuildCounter = 0
        var b2bWeeksCompleted = 0

        val workouts = ArrayList<WebGeneratedWorkout>()

        var currentDate = weekStart
        for (week in 1..totalWeeks) {
            val weeksUntilRace = totalWeeks - week + 1
            val phase = getUltraPhase(
                weeksUntilRace,
                taperWeeks,
                mentalPrepWeeks,
                enduranceWeeks,
                peakWeeks,
                buildWeeks,
                isBackyardUltra,
            )

            if (phase == "RACE_WEEK") {
                val raceWeekWorkouts = generateUltraRaceWeek(
                    raceType = raceType,
                    ultraEasyPace = ultraEasyPace,
                    customDistanceM = config.customDistanceM,
                )
                for (w in raceWeekWorkouts) {
                    var specificDate = raceDate
                    if (w.type != "RACE") {
                        specificDate = raceDate.plusDays(w.dayOffset.toLong())
                    }
                    if (specificDate < startDate) continue
                    workouts.add(
                        WebGeneratedWorkout(
                            date = specificDate,
                            type = w.type,
                            description = w.description,
                            totalDistance = w.totalDistance,
                            targetPace = w.targetPace,
                            targetDuration = w.targetDuration,
                            targetHrZone = w.targetHrZone,
                            phase = "RACE_WEEK",
                        )
                    )
                }
                currentDate = currentDate.plusDays(7)
                continue
            }

            var weekVolumeCap: Double
            val isRecoveryWeek: Boolean

            when (phase) {
                "TAPER" -> {
                    weekVolumeCap = getUltraTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, raceType)
                    weekVolumeCap = maxOf(WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MIN * 2, weekVolumeCap)
                    isRecoveryWeek = false
                }

                "MENTAL_PREP" -> {
                    val mentalPrepWeekIndex = weeksUntilRace - taperWeeks
                    weekVolumeCap = if (mentalPrepWeekIndex == 1) {
                        jr(effectivePeakVolume * 0.70)
                    } else {
                        jr(effectivePeakVolume * 0.80)
                    }
                    isRecoveryWeek = false
                }

                "PEAK" -> {
                    weekVolumeCap = effectivePeakVolume
                    isRecoveryWeek = false
                }

                else -> {
                    // ENDURANCE / BUILD / BASE share the ramp branch (run-ultra.ts L197-219)
                    baseBuildCounter++
                    isRecoveryWeek = baseBuildCounter % WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE == 0
                    weekVolumeCap = if (isRecoveryWeek) {
                        jr(lastNonRecoveryVolume * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
                    } else {
                        effectiveWeekIndex++
                        val targetVol = jr(startVolume * weeklyGrowthRate.pow(effectiveWeekIndex.toDouble()))
                        val maxAllowed = jr(lastNonRecoveryVolume * WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)
                        val cap = minOf(targetVol, maxAllowed, effectivePeakVolume)
                        lastNonRecoveryVolume = cap
                        cap
                    }
                }
            }

            val effectiveFloor = if (isRecoveryWeek) {
                jr(WebPlanEngine.PLAN_CONSTANTS.MIN_VOLUME_START * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
            } else {
                WebPlanEngine.PLAN_CONSTANTS.MIN_VOLUME_START
            }
            weekVolumeCap = maxOf(effectiveFloor, weekVolumeCap)

            val weekSchedule = generateUltraWeek(
                phase = phase,
                raceType = raceType,
                paces = paces,
                ultraEasyPace = ultraEasyPace,
                runsPerWeek = runsPerWeek,
                strengthPerWeek = strengthPerWeek,
                weeklyVolume = weekVolumeCap,
                maxLongRunKm = config.maxLongRunKm,
                preferredLongRunDay = longRunDay,
                restDays = config.restDays,
                isBackyardUltra = isBackyardUltra,
                isTimedEvent = isTimedEvent,
                isRecoveryWeek = isRecoveryWeek,
                b2bWeekIndex = b2bWeeksCompleted,
            )
            if ((phase == "ENDURANCE" || phase == "PEAK" || phase == "MENTAL_PREP") && !isRecoveryWeek) {
                b2bWeeksCompleted++
            }

            val totalRunDistance = weekSchedule.filter { isUltraRun(it.type) }.sumOf { it.totalDistance }

            val finalSchedule = if (totalRunDistance > weekVolumeCap) {
                scaleUltraToVolumeCap(weekSchedule, weekVolumeCap)
            } else {
                weekSchedule
            }

            val scheduledRunMeters = finalSchedule
                .filter { isUltraRun(it.type) }
                .sumOf { it.totalDistance }
            if (!isRecoveryWeek && phase != "TAPER" && phase != "MENTAL_PREP" && scheduledRunMeters > 0.0) {
                lastNonRecoveryVolume = scheduledRunMeters
            }

            for (w in finalSchedule) {
                val specificDate = currentDate.plusDays(w.dayOffset.toLong())
                if (specificDate < startDate) continue
                if (isUltraRun(w.type) && w.totalDistance == 0.0) continue
                workouts.add(
                    WebGeneratedWorkout(
                        date = specificDate,
                        type = w.type,
                        description = w.description,
                        totalDistance = w.totalDistance,
                        targetPace = w.targetPace,
                        targetDuration = w.targetDuration,
                        targetHrZone = w.targetHrZone,
                        phase = phase,
                    )
                )
            }

            currentDate = currentDate.plusDays(7)
        }

        val result = WebPlanScheduleUtils.fixBackToBackSameType(
            workouts,
            raceDate = raceDate,
            restDays = config.restDays,
            protectedTypes = setOf("RACE", "LONG_RUN"),
        )
        WebPlanDescriptions.enrichWorkoutsWithDescriptions(result, ultraEasyPace)
        return result
    }

    /** run-ultra.ts `getUltraPhase` (L277-297). */
    private fun getUltraPhase(
        weeksUntilRace: Int,
        taperWeeks: Int,
        mentalPrepWeeks: Int,
        enduranceWeeks: Int,
        peakWeeks: Int,
        buildWeeks: Int,
        isBackyardUltra: Boolean,
    ): String {
        if (weeksUntilRace == 1) return "RACE_WEEK"
        if (weeksUntilRace <= taperWeeks) return "TAPER"
        if (isBackyardUltra && mentalPrepWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks) return "MENTAL_PREP"
        if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks) return "PEAK"
        if (enduranceWeeks > 0 && weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks + enduranceWeeks) {
            return "ENDURANCE"
        }
        if (buildWeeks > 0 &&
            weeksUntilRace <= taperWeeks + mentalPrepWeeks + peakWeeks + enduranceWeeks + buildWeeks
        ) {
            return "BUILD"
        }
        return "BASE"
    }

    /** run-ultra.ts `getUltraTaperVolume` (L299-310). */
    private fun getUltraTaperVolume(
        weeksUntilRace: Int,
        taperWeeks: Int,
        peakVolume: Double,
        raceType: String,
    ): Double {
        val fractions = TAPER_FRACTIONS[raceType] ?: return jr(peakVolume * 0.65)
        val taperWeekIndex = taperWeeks - weeksUntilRace
        val clampedIndex = taperWeekIndex.coerceIn(0, fractions.size - 1)
        return jr(peakVolume * fractions[clampedIndex])
    }

    /** run-ultra.ts `getUltraLongRunDistance` (L312-336). */
    private fun getUltraLongRunDistance(
        raceType: String,
        weeklyVolume: Double,
        paces: Personalization.PersonTrainingPaces,
        maxLongRunKm: Double?,
    ): Double {
        var dist = weeklyVolume * LONG_RUN_RATIO_ULTRA

        val ultraMax = MAX_LONG_RUN_DIST[raceType] ?: 50000.0
        var dynamicCap = minOf(
            weeklyVolume * WebPlanEngine.PLAN_CONSTANTS.DYNAMIC_LONG_RUN_RATIO,
            ultraMax,
        )
        if (maxLongRunKm != null && maxLongRunKm != 0.0) {
            val userCap = maxLongRunKm * 1000
            if (userCap < dynamicCap) dynamicCap = userCap
        }
        if (dist > dynamicCap) dist = dynamicCap

        val safeEasyMax = maxOf(120.0, paces.easy.maxSecPerKm * 1.1)
        val maxDistForTime = jr(MAX_TIME_ON_FEET_SECONDS / safeEasyMax * 1000)
        if (dist > maxDistForTime) dist = maxDistForTime

        if (dist < WebPlanEngine.PLAN_CONSTANTS.MIN_LONG_RUN) dist = WebPlanEngine.PLAN_CONSTANTS.MIN_LONG_RUN

        return jr(dist / 100) * 100
    }

    /** run-ultra.ts `generateUltraWeek` (L338-564). */
    private fun generateUltraWeek(
        phase: String,
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        ultraEasyPace: Double,
        runsPerWeek: Int,
        strengthPerWeek: Int,
        weeklyVolume: Double,
        maxLongRunKm: Double?,
        preferredLongRunDay: Int,
        restDays: List<Int>?,
        isBackyardUltra: Boolean,
        isTimedEvent: Boolean,
        isRecoveryWeek: Boolean,
        b2bWeekIndex: Int = 0,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()
        val hardSessionDays = ArrayList<Int>()

        if (restDays != null && restDays.isNotEmpty()) {
            for (rd in restDays) usedDays.add(rd)
        }

        val rawLongRunDist = getUltraLongRunDistance(raceType, weeklyVolume, paces, maxLongRunKm)
        val longRunDist = if (isRecoveryWeek) {
            maxOf(WebPlanEngine.PLAN_CONSTANTS.MIN_LONG_RUN, jr(rawLongRunDist * 0.80 / 100) * 100)
        } else rawLongRunDist

        val hasBackToBack = !isRecoveryWeek && (phase == "ENDURANCE" || phase == "PEAK" || phase == "MENTAL_PREP")
        val b2bRatio = if (b2bWeekIndex == 0) 0.40 else if (b2bWeekIndex == 1) 0.50 else BACK_TO_BACK_RATIO
        val backToBackDist = if (hasBackToBack) jr(longRunDist * b2bRatio / 100) * 100 else 0.0

        val hasTimedSteady = isTimedEvent && !isRecoveryWeek && (phase == "ENDURANCE" || phase == "PEAK")
        val hasQuality = runsPerWeek >= 4 && phase != "TAPER" && phase != "MENTAL_PREP" && !isRecoveryWeek && !hasTimedSteady
        val qualitySession = if (hasQuality) getUltraQualitySession(phase, paces, ultraEasyPace) else null

        var timedSteadyDist = 0.0
        var timedSteadyDuration = 0.0
        if (hasTimedSteady) {
            val maxSteadyDist = maxOf(10000.0, minOf(24000.0, jr(weeklyVolume * 0.24 / 100) * 100.0))
            timedSteadyDist = maxSteadyDist
            timedSteadyDuration = jr((timedSteadyDist / 1000.0) * ultraEasyPace).toDouble()
        }

        val qualityDist = if (hasTimedSteady) timedSteadyDist else (qualitySession?.totalDistance ?: 0.0)

        val longRunCount = if (hasBackToBack) 2 else 1
        val qualityRunCount = if (hasQuality || hasTimedSteady) 1 else 0
        val easyRunsCount = maxOf(0, runsPerWeek - longRunCount - qualityRunCount)

        val remainingVol = maxOf(0.0, weeklyVolume - longRunDist - backToBackDist - qualityDist)
        val calculatedEasyDist = if (easyRunsCount > 0) remainingVol / easyRunsCount else 6000.0

        val easyDist = maxOf(
            WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MIN,
            minOf(jr(calculatedEasyDist / 100) * 100, WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MAX),
        )

        val easyPace = jr((paces.easy.minSecPerKm + paces.easy.maxSecPerKm) / 2.0)
        val recoveryPace = paces.easy.maxSecPerKm.toDouble()

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

        if (runsPerWeek >= 1) {
            val day = getAvailableDay(preferredLongRunDay, emptyList())
            usedDays.add(day)
            hardSessionDays.add(day)

            var longRunDesc: String
            var longRunPace = easyPace

            if (phase == "PEAK" && !isBackyardUltra && !isTimedEvent) {
                val raceDist = RACE_DISTANCE_M[raceType] ?: 50000.0
                val mpDist = minOf(jr(longRunDist * 0.2 / 100) * 100, raceDist * 0.3)
                val easyPart = longRunDist - mpDist
                longRunDesc =
                    "Long Run: ${WebPlanEngine.toFixed1(easyPart / 1000)}km Easy + ${WebPlanEngine.toFixed1(mpDist / 1000)}km @ Ultra Pace (with fueling practice)"
            } else if (phase == "ENDURANCE") {
                longRunDesc =
                    "Long Run: ${WebPlanEngine.toFixed1(longRunDist / 1000)}km @ Ultra Easy (fueling + walk/run strategy)"
                longRunPace = ultraEasyPace
            } else {
                longRunDesc = "Long Run: ${WebPlanEngine.toFixed1(longRunDist / 1000)}km @ Easy"
            }

            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day,
                    type = "LONG_RUN",
                    description = longRunDesc,
                    totalDistance = longRunDist,
                    targetPace = longRunPace,
                    targetDuration = jr((longRunDist / 1000.0) * longRunPace),
                )
            )

            if (hasBackToBack && backToBackDist > 0.0) {
                val adjacentCandidates = listOf(
                    if (day < 6) day + 1 else null,
                    if (day > 0) day - 1 else null,
                ).filterNotNull()
                val b2bDay = adjacentCandidates.firstOrNull { !usedDays.contains(it) } ?: -1

                if (b2bDay != -1) {
                    usedDays.add(b2bDay)

                    val b2bDesc = if (phase == "MENTAL_PREP" && isBackyardUltra) {
                        "Back-to-Back: ${WebPlanEngine.toFixed1(backToBackDist / 1000)}km @ Loop Pace (consistency drill)"
                    } else {
                        "Back-to-Back: ${WebPlanEngine.toFixed1(backToBackDist / 1000)}km @ Easy (fatigue legs)"
                    }

                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = b2bDay,
                            type = "LONG_RUN",
                            description = b2bDesc,
                            totalDistance = backToBackDist,
                            targetPace = ultraEasyPace,
                            targetDuration = jr((backToBackDist / 1000.0) * ultraEasyPace),
                        )
                    )
                }
            }
        }

        if (hasTimedSteady && timedSteadyDist > 0.0) {
            val paceRunDay = getAvailableDay(3, hardSessionDays)
            usedDays.add(paceRunDay)
            hardSessionDays.add(paceRunDay)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = paceRunDay,
                    type = "TEMPO",
                    description = "Steady State: ${WebPlanEngine.toFixed1(timedSteadyDist / 1000.0)}km @ Target Race Pace (${formatPace(ultraEasyPace)}/km)",
                    totalDistance = timedSteadyDist,
                    targetPace = ultraEasyPace,
                    targetDuration = timedSteadyDuration,
                    targetHrZone = 2,
                )
            )
        } else if (hasQuality && qualitySession != null) {
            val day = getAvailableDay(3, hardSessionDays)
            usedDays.add(day)
            hardSessionDays.add(day)
            workouts.add(qualitySession.copy(dayOffset = day, targetDuration = 0.0))
        }

        val additionalRunsCount = maxOf(0, easyRunsCount)
        val easyRunDays = getUltraDistributedDays(additionalRunsCount, usedDays)

        for ((idx, d) in easyRunDays.withIndex()) {
            usedDays.add(d)
            val dayAfterHard = hardSessionDays.any { hd ->
                val diff = (d - hd + 7) % 7
                diff == 1
            }

            if (phase == "MENTAL_PREP" && isBackyardUltra && idx == easyRunDays.size - 1) {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d,
                        type = "EASY",
                        description = "Night Run: ${WebPlanEngine.toFixed1(easyDist / 1000)}km (sleep deprivation & headlamp practice)",
                        totalDistance = easyDist,
                        targetPace = ultraEasyPace,
                        targetDuration = jr((easyDist / 1000.0) * ultraEasyPace),
                    )
                )
            } else if (dayAfterHard) {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d,
                        type = "RECOVERY",
                        description = "Recovery: ${WebPlanEngine.toFixed1(easyDist / 1000)}km",
                        totalDistance = easyDist,
                        targetPace = recoveryPace,
                        targetDuration = jr((easyDist / 1000.0) * recoveryPace),
                    )
                )
            } else {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d,
                        type = "EASY",
                        description = "Easy: ${WebPlanEngine.toFixed1(easyDist / 1000)}km",
                        totalDistance = easyDist,
                        targetPace = easyPace,
                        targetDuration = jr((easyDist / 1000.0) * easyPace),
                    )
                )
            }
        }

        var remainingStrength = strengthPerWeek
        val freeDays = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d)) freeDays.add(d)
        }
        if (freeDays.size < remainingStrength) {
            for (w in workouts) {
                if ((w.type == "EASY" || w.type == "RECOVERY") && w.dayOffset != (preferredLongRunDay + 6) % 7) {
                    if (!freeDays.contains(w.dayOffset)) freeDays.add(w.dayOffset)
                }
            }
        }

        for (d in freeDays) {
            if (remainingStrength <= 0) break
            usedDays.add(d)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = d,
                    type = "STRENGTH",
                    description = "Strength: 45min (Trail/Ultra Focus)",
                    totalDistance = 0.0,
                    targetPace = 0.0,
                    targetDuration = 2700.0,
                )
            )
            remainingStrength--
        }

        return workouts
    }

    /** run-ultra.ts `getUltraQualitySession` (L566-601). */
    private fun getUltraQualitySession(
        phase: String,
        paces: Personalization.PersonTrainingPaces,
        ultraEasyPace: Double,
    ): WebScheduledWorkout? = when (phase) {
        "BASE" -> WebScheduledWorkout(
            0, "FARTLEK",
            "Fartlek: 10km (4min hard / 3min easy)",
            10000.0,
            jr((paces.threshold + paces.interval) / 2.0),
        )

        "BUILD" -> WebScheduledWorkout(
            0, "TEMPO",
            "Threshold: 8km @ ${formatPace(paces.threshold.toDouble())}",
            10500.0,
            paces.threshold.toDouble(),
        )

        "ENDURANCE" -> WebScheduledWorkout(
            0, "TEMPO",
            "Steady: 10km @ Ultra Threshold",
            12500.0,
            jr(paces.threshold.toDouble() + 15),
        )

        else -> WebScheduledWorkout(
            0, "TEMPO",
            "Steady: 12km @ Ultra Threshold",
            14500.0,
            jr(paces.threshold.toDouble() + 15),
        )
    }

    /** run-ultra.ts `generateUltraRaceWeek` (L603-645). */
    private fun generateUltraRaceWeek(
        raceType: String,
        ultraEasyPace: Double,
        customDistanceM: Double? = null,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()

        val raceLabel = if (raceType == "CUSTOM_DISTANCE" && customDistanceM != null && customDistanceM > 0) {
            "${WebPlanEngine.toFixed1(customDistanceM / 1000.0)}km"
        } else {
            RACE_DISTANCE_KM[raceType] ?: "Ultra"
        }

        val raceDistanceM: Double
        val raceDurationS: Double
        if (raceType == "TWELVE_HOUR") {
            raceDurationS = 12.0 * 3600.0
            raceDistanceM = jr((raceDurationS / ultraEasyPace) * 1000.0 / 100.0) * 100.0
        } else if (raceType == "TWENTY_FOUR_HOUR") {
            raceDurationS = 24.0 * 3600.0
            raceDistanceM = jr((raceDurationS / ultraEasyPace) * 1000.0 / 100.0) * 100.0
        } else if (raceType == "BACKYARD_ULTRA") {
            val targetLaps = 8.0 // 8 hourly loops (53.6km) default simulation target
            raceDistanceM = targetLaps * 6706.0
            raceDurationS = targetLaps * 3600.0
        } else {
            raceDistanceM = if (customDistanceM != null && customDistanceM > 0) {
                customDistanceM
            } else {
                RACE_DISTANCE_M[raceType] ?: 50000.0
            }
            raceDurationS = jr((raceDistanceM / 1000.0) * ultraEasyPace).toDouble()
        }

        usedDays.add(0)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = 0,
                type = "RACE",
                description = "Race Day: $raceLabel",
                totalDistance = raceDistanceM,
                targetPace = ultraEasyPace,
                targetDuration = raceDurationS,
                targetHrZone = 2,
            )
        )

        val shakeoutOffsets = listOf(-2, -3, -4)
        var shakeoutCount = 0
        for (offset in shakeoutOffsets) {
            if (shakeoutCount >= 2) break
            if (usedDays.contains(offset)) continue
            usedDays.add(offset)
            shakeoutCount++
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = offset,
                    type = "RECOVERY",
                    description = "Shakeout: 3km Easy",
                    totalDistance = 3000.0,
                    targetPace = ultraEasyPace,
                    targetDuration = jr(3.0 * ultraEasyPace).toDouble(),
                )
            )
        }

        return workouts.sortedBy { it.dayOffset }
    }

    /** run-ultra.ts `scaleUltraToVolumeCap` (L647-670). */
    private fun scaleUltraToVolumeCap(
        weekSchedule: List<WebScheduledWorkout>,
        weekVolumeCap: Double,
    ): List<WebScheduledWorkout> {
        val totalDist = weekSchedule.filter { isUltraRun(it.type) }.sumOf { it.totalDistance }
        if (totalDist == 0.0) return weekSchedule

        val scaleFactor = minOf(1.0, weekVolumeCap / totalDist)
        return weekSchedule.map { w ->
            if (!isUltraRun(w.type)) return@map w
            val newDist = floor(w.totalDistance * scaleFactor / 100) * 100
            val newDur = if ((w.targetDuration ?: 0.0) > 0.0 && w.totalDistance > 0.0) {
                jr(w.targetDuration!! * (newDist / w.totalDistance))
            } else if ((w.targetPace ?: 0.0) > 0.0) {
                jr((newDist / 1000.0) * w.targetPace!!)
            } else 0.0
            val distKm = WebPlanEngine.toFixed1(newDist / 1000.0)

            if (w.type == "LONG_RUN") {
                if (w.description.contains("Back-to-Back")) {
                    val suffix = if (w.description.contains("@ Loop Pace")) {
                        "@ Loop Pace (consistency drill)"
                    } else {
                        "@ Easy (fatigue legs)"
                    }
                    return@map w.copy(
                        totalDistance = newDist,
                        targetDuration = newDur,
                        description = "Back-to-Back: ${distKm}km $suffix",
                    )
                }
                if (w.description.contains("fueling") || w.description.contains("walk/run")) {
                    return@map w.copy(
                        totalDistance = newDist,
                        targetDuration = newDur,
                        description = "Long Run: ${distKm}km @ Ultra Easy (fueling + walk/run strategy)",
                    )
                }
                return@map w.copy(
                    totalDistance = newDist,
                    targetDuration = newDur,
                    description = "Long Run: ${distKm}km @ Easy",
                )
            }
            if (w.type == "EASY") {
                val isNight = w.description.contains("Night Run")
                return@map w.copy(
                    totalDistance = newDist,
                    targetDuration = newDur,
                    description = if (isNight) "Night Run: ${distKm}km (sleep deprivation & headlamp practice)" else "Easy: ${distKm}km",
                )
            }
            if (w.type == "RECOVERY") {
                return@map w.copy(
                    totalDistance = newDist,
                    targetDuration = newDur,
                    description = "Recovery: ${distKm}km",
                )
            }
            if (w.type == "TEMPO" && w.description.startsWith("Steady State:")) {
                return@map w.copy(
                    totalDistance = newDist,
                    targetDuration = newDur,
                    description = "Steady State: ${distKm}km @ Target Race Pace",
                )
            }
            w.copy(totalDistance = newDist, targetDuration = newDur)
        }
    }

    /** run-ultra.ts `getDistributedDays` (L672-688). */
    private fun getUltraDistributedDays(count: Int, usedDays: Set<Int>): List<Int> {
        if (count <= 0) return emptyList()
        val available = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d)) available.add(d)
        }

        val toTake = minOf(count, available.size)
        val idealInterval = available.size.toDouble() / toTake
        val selected = ArrayList<Int>()

        for (i in 0 until toTake) {
            val idx = minOf(floor(i * idealInterval).toInt(), available.size - 1)
            selected.add(available[idx])
        }
        return selected
    }

    /** run-ultra.ts `computeUltraEventPace` (L63-75). */
    private fun computeUltraEventPace(raceType: String, paces: Personalization.PersonTrainingPaces): Double {
        if (raceType == "TWENTY_FOUR_HOUR") {
            return maxOf(310.0, jr(paces.easy.maxSecPerKm * 1.32))
        }
        if (raceType == "TWELVE_HOUR") {
            return maxOf(255.0, jr(paces.easy.maxSecPerKm * 1.18))
        }
        if (raceType == "BACKYARD_ULTRA") {
            return maxOf(300.0, jr(paces.easy.maxSecPerKm * 1.25))
        }
        return jr(paces.easy.maxSecPerKm * 1.1)
    }

    /** run-ultra.ts `isUltraRun` (L690-692). */
    private fun isUltraRun(type: String): Boolean =
        type == "EASY" || type == "LONG_RUN" || type == "TEMPO" || type == "INTERVALS" ||
            type == "FARTLEK" || type == "RECOVERY" || type == "RACE" || type == "REPETITIONS"

    private fun formatPace(secondsPerKm: Double): String {
        val mins = floor(secondsPerKm / 60).toInt()
        val secs = jr(secondsPerKm % 60).toInt()
        return "$mins:${secs.toString().padStart(2, '0')}"
    }
}
