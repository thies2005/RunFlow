package com.runflow2.app.domain.plan

import com.runflow2.app.domain.person.Personalization
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.pow

/**
 * Port of Web/src/lib/plans/generators/triathlon.ts — swim/bike/run plans
 * (`generateTriathlonPlan` L88-319, weekly layout L333-672, run-volume scaling
 * L674-753, long-ride durations L768-801, race week L803-864).
 */
internal object WebPlanTriathlonGenerator {

    private data class SportDistribution(val bike: Double, val run: Double, val swim: Double, val strength: Double)

    private val TRI_DISTRIBUTION: Map<String, SportDistribution> = mapOf(
        "SPRINT_TRI" to SportDistribution(0.45, 0.30, 0.15, 0.10),
        "OLYMPIC_TRI" to SportDistribution(0.48, 0.28, 0.14, 0.10),
        "HALF_IRONMAN" to SportDistribution(0.52, 0.28, 0.10, 0.10),
        "FULL_IRONMAN" to SportDistribution(0.55, 0.25, 0.08, 0.12),
    )

    private val TRI_TAPER_FRACTIONS: Map<String, List<Double>> = mapOf(
        "SPRINT_TRI" to listOf(0.75),
        "OLYMPIC_TRI" to listOf(0.80, 0.60),
        "HALF_IRONMAN" to listOf(0.80, 0.65, 0.50),
        "FULL_IRONMAN" to listOf(0.80, 0.65, 0.50, 0.40),
    )

    private val TRI_RACE_LABELS: Map<String, String> = mapOf(
        "SPRINT_TRI" to "Sprint Triathlon (750m/20km/5km)",
        "OLYMPIC_TRI" to "Olympic Triathlon (1.5km/40km/10km)",
        "HALF_IRONMAN" to "Middle Distance Triathlon (1.9km/90km/21.1km)",
        "FULL_IRONMAN" to "Long Distance Triathlon (3.8km/180km/42.2km)",
    )

    private val TRI_RACE_RUN_DIST: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 5000.0, "OLYMPIC_TRI" to 10000.0,
        "HALF_IRONMAN" to 21097.0, "FULL_IRONMAN" to 42195.0,
    )

    private val TRI_MIN_PEAK_VOLUME: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 30000.0, "OLYMPIC_TRI" to 40000.0,
        "HALF_IRONMAN" to 55000.0, "FULL_IRONMAN" to 70000.0,
    )

    private val TRI_MAX_LONG_RUN: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 15000.0, "OLYMPIC_TRI" to 18000.0,
        "HALF_IRONMAN" to 22000.0, "FULL_IRONMAN" to 30000.0,
    )

    private val TRI_RACE_SWIM_DIST: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 750.0, "OLYMPIC_TRI" to 1500.0,
        "HALF_IRONMAN" to 1900.0, "FULL_IRONMAN" to 3800.0,
    )

    private data class TriPeakBudget(val bikeSecs: Double, val runMeters: Double, val swimMeters: Double)

    private val TRI_PEAK_BUDGET: Map<String, TriPeakBudget> = mapOf(
        "SPRINT_TRI" to TriPeakBudget(7200.0, 18000.0, 3000.0),
        "OLYMPIC_TRI" to TriPeakBudget(12600.0, 28000.0, 4500.0),
        "HALF_IRONMAN" to TriPeakBudget(21600.0, 38000.0, 6500.0),
        "FULL_IRONMAN" to TriPeakBudget(36000.0, 50000.0, 9000.0),
    )

    /** triathlon.ts `classifyCustomTri` (L76-86). */
    private fun classifyCustomTri(swimDistM: Double, bikeDistM: Double, runDistM: Double): String {
        val swimMins = swimDistM / 50
        val bikeMins = bikeDistM / 400
        val runMins = runDistM / 200
        val totalEstMins = swimMins + bikeMins + runMins

        return when {
            totalEstMins <= 110 -> "SPRINT_TRI"
            totalEstMins <= 240 -> "OLYMPIC_TRI"
            totalEstMins <= 500 -> "HALF_IRONMAN"
            else -> "FULL_IRONMAN"
        }
    }

    /** triathlon.ts `generateTriathlonPlan` (L88-319). */
    fun generate(config: WebPlanConfig): List<WebGeneratedWorkout> {
        val vdot = config.vdot
        val raceDate = config.raceDate
        val raceType = config.raceType!!
        val requestedStartDate = config.startDate ?: LocalDate.now()

        var effectiveRaceType = raceType
        var customSwimDist: Double? = null
        var customBikeDist: Double? = null
        var customRunDist: Double? = null

        if (raceType == "CUSTOM_TRI") {
            customSwimDist = config.customSwimDistM?.takeIf { it > 0 }
            customBikeDist = config.customBikeDistM?.takeIf { it > 0 }
            customRunDist = config.customRunDistM?.takeIf { it > 0 }

            effectiveRaceType = classifyCustomTri(
                customSwimDist ?: 750.0,
                customBikeDist ?: 20000.0,
                customRunDist ?: 5000.0,
            )
        }

        val startDate = if (requestedStartDate > raceDate) raceDate else requestedStartDate

        val runsPerWeek = maxOf(2, config.runsPerWeek ?: 3)
        val ridesPerWeek = maxOf(2, config.ridesPerWeek ?: 3)
        val swimsPerWeek = maxOf(2, config.swimsPerWeek ?: 3)
        val strengthPerWeek = maxOf(0, config.strengthPerWeek ?: 1)
        val longRunDay = config.longRunDay ?: 0
        val swimDay = config.swimDay ?: 1
        val workoutDay = config.workoutDay ?: 3

        val distribution = TRI_DISTRIBUTION[effectiveRaceType] ?: TRI_DISTRIBUTION.getValue("OLYMPIC_TRI")

        var peakVolume = config.weeklyMileageGoal
            ?: (TRI_MIN_PEAK_VOLUME[effectiveRaceType] ?: 40000.0)
        val minPeak = TRI_MIN_PEAK_VOLUME[effectiveRaceType] ?: 40000.0
        if (peakVolume < minPeak) peakVolume = minPeak

        val weekStart = startDate.minusDays(jsDay(startDate).toLong())

        val totalWeeks = maxOf(1, ceil(ChronoUnit.DAYS.between(weekStart, raceDate) / 7.0).toInt())

        val minStart = WebPlanEngine.getMinStartVolume(config.raceType)
        val startVolume: Double = if (config.startWeeklyMileage != null && config.startWeeklyMileage > 0) {
            minOf(maxOf(config.startWeeklyMileage!!, minStart), peakVolume)
        } else {
            val sv = peakVolume * WebPlanEngine.PLAN_CONSTANTS.START_VOLUME_RATIO
            if (sv < minStart) minOf(minStart, peakVolume) else sv
        }

        val paces = Personalization.trainingPaces(vdot)
        val css = estimateSwimPaceFromVdot(vdot)
        val bikeFtp = estimateBikeFtpFromVdot(vdot)
        val bikeZones = calculateBikeZones(bikeFtp)

        val taperFractions = TRI_TAPER_FRACTIONS[effectiveRaceType] ?: listOf(0.80, 0.60)
        val defaultTaperWeeks = taperFractions.size
        val phases = WebPlanEngine.resolvePhaseBudget(
            totalWeeks,
            config.taperWeeks,
            config.peakWeeks,
            config.buildWeeks,
            isTriathlon = true,
            defaultTaper = defaultTaperWeeks,
        )
        val taperWeeks = phases.taperWeeks
        val peakWeeks = phases.peakWeeks
        val buildWeeks = phases.buildWeeks

        val growthRatio = peakVolume / startVolume
        val minRampWeeks = if (growthRatio > 1.001) {
            ceil(ln(growthRatio) / ln(WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)).toInt()
        } else 1

        var calendarRampWeeks = minRampWeeks
        while (calendarRampWeeks - calendarRampWeeks / WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE < minRampWeeks) {
            calendarRampWeeks++
        }

        val availableRampWeeks = maxOf(1, totalWeeks - taperWeeks)
        var effectivePeakVolume = peakVolume
        if (availableRampWeeks < calendarRampWeeks) {
            val effWeeks = availableRampWeeks - availableRampWeeks / WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE
            effectivePeakVolume = jr(
                startVolume * WebPlanEngine.PLAN_CONSTANTS.WEEKLY_GROWTH_CAP.pow(maxOf(1, effWeeks).toDouble()),
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

        val workouts = ArrayList<WebGeneratedWorkout>()

        var currentDate = weekStart
        for (week in 1..totalWeeks) {
            val weeksUntilRace = totalWeeks - week + 1
            val phase = getTriPhase(weeksUntilRace, taperWeeks, peakWeeks, buildWeeks)

            var weekVolumeCap: Double
            val isRecoveryWeek: Boolean

            if (phase == "RACE_WEEK") {
                val raceWeekWorkouts = generateTriRaceWeek(
                    raceType = effectiveRaceType,
                    paces = paces,
                    css = css,
                    customSwimDist = customSwimDist,
                    customBikeDist = customBikeDist,
                    customRunDist = customRunDist,
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
                            phase = "RACE_WEEK",
                        )
                    )
                }
                currentDate = currentDate.plusDays(7)
                continue
            }

            if (phase == "TAPER") {
                val taperIdx = taperWeeks - weeksUntilRace
                val fraction = taperFractions[taperIdx.coerceIn(0, taperFractions.size - 1)]
                weekVolumeCap = jr(effectivePeakVolume * fraction)
                weekVolumeCap = maxOf(WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MIN * 2, weekVolumeCap)
                isRecoveryWeek = false
            } else if (phase == "PEAK") {
                weekVolumeCap = effectivePeakVolume
                isRecoveryWeek = false
            } else {
                baseBuildCounter++
                isRecoveryWeek = baseBuildCounter % WebPlanEngine.PLAN_CONSTANTS.STEP_LOADING_CYCLE == 0
                weekVolumeCap = if (isRecoveryWeek) {
                    jr(lastNonRecoveryVolume * weeklyGrowthRate * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
                } else {
                    effectiveWeekIndex++
                    var cap = jr(startVolume * weeklyGrowthRate.pow(effectiveWeekIndex.toDouble()))
                    cap = minOf(cap, effectivePeakVolume)
                    lastNonRecoveryVolume = cap
                    cap
                }
            }

            val effectiveFloor = if (isRecoveryWeek) {
                jr(WebPlanEngine.PLAN_CONSTANTS.MIN_VOLUME_START * WebPlanEngine.PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
            } else {
                WebPlanEngine.PLAN_CONSTANTS.MIN_VOLUME_START
            }
            weekVolumeCap = maxOf(effectiveFloor, weekVolumeCap)

            val defaultPeakVolume = TRI_MIN_PEAK_VOLUME[effectiveRaceType] ?: 40000.0
            val totalPeakMetersScale = effectivePeakVolume / defaultPeakVolume

            val peakBikeSecs = TRI_PEAK_BUDGET.getValue(effectiveRaceType).bikeSecs * totalPeakMetersScale
            val peakRunMeters = TRI_PEAK_BUDGET.getValue(effectiveRaceType).runMeters * totalPeakMetersScale
            val peakSwimMeters = TRI_PEAK_BUDGET.getValue(effectiveRaceType).swimMeters * totalPeakMetersScale

            val currentWeekScale = weekVolumeCap / effectivePeakVolume

            val weeklyBikeDurationS = jr(peakBikeSecs * currentWeekScale)
            val weeklyRunDistanceM = jr(peakRunMeters * currentWeekScale)
            val weeklySwimDistanceM = jr(peakSwimMeters * currentWeekScale)

            val weekSchedule = generateTriWeek(
                phase = phase,
                raceType = effectiveRaceType,
                paces = paces,
                css = css,
                bikeZones = bikeZones,
                distribution = distribution,
                runsPerWeek = runsPerWeek,
                ridesPerWeek = ridesPerWeek,
                swimsPerWeek = swimsPerWeek,
                strengthPerWeek = strengthPerWeek,
                weeklyVolume = weekVolumeCap,
                weeklyRunDistanceM = weeklyRunDistanceM,
                weeklyBikeDurationS = weeklyBikeDurationS,
                weeklySwimDistanceM = weeklySwimDistanceM,
                maxLongRunKm = config.maxLongRunKm,
                preferredLongRunDay = longRunDay,
                preferredWorkoutDay = workoutDay,
                preferredSwimDay = swimDay,
                restDays = config.restDays,
                isRecoveryWeek = isRecoveryWeek,
                taperWeeks = taperWeeks,
                weeksUntilRace = weeksUntilRace,
                customSwimDist = customSwimDist,
                customRunDist = customRunDist,
                customBikeDist = customBikeDist,
            )

            for (w in weekSchedule) {
                val specificDate = currentDate.plusDays(w.dayOffset.toLong())
                if (specificDate < startDate) continue
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
            raceDate = raceDate,
            restDays = config.restDays,
        )
        val racePace = WebPlanDescriptions.getRacePace(effectiveRaceType, paces)
        WebPlanDescriptions.enrichWorkoutsWithDescriptions(result, racePace)
        return result
    }

    /** triathlon.ts `getTriPhase` (L321-331). */
    private fun getTriPhase(weeksUntilRace: Int, taperWeeks: Int, peakWeeks: Int, buildWeeks: Int): String {
        if (weeksUntilRace == 1) return "RACE_WEEK"
        if (weeksUntilRace <= taperWeeks) return "TAPER"
        if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return "PEAK"
        if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return "BUILD"
        return "BASE"
    }

    /** triathlon.ts `generateTriWeek` (L333-672). */
    private fun generateTriWeek(
        phase: String,
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        css: Double,
        bikeZones: WebBikeZones,
        distribution: SportDistribution,
        runsPerWeek: Int,
        ridesPerWeek: Int,
        swimsPerWeek: Int,
        strengthPerWeek: Int,
        weeklyVolume: Double,
        weeklyRunDistanceM: Double,
        weeklyBikeDurationS: Double,
        weeklySwimDistanceM: Double,
        maxLongRunKm: Double?,
        preferredLongRunDay: Int,
        preferredWorkoutDay: Int,
        preferredSwimDay: Int,
        restDays: List<Int>?,
        isRecoveryWeek: Boolean,
        taperWeeks: Int,
        weeksUntilRace: Int,
        customSwimDist: Double?,
        customRunDist: Double?,
        customBikeDist: Double?,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()
        val hardSessionDays = ArrayList<Int>()

        if (restDays != null && restDays.isNotEmpty()) {
            for (rd in restDays) usedDays.add(rd)
        }

        val isTaper = phase == "TAPER"
        val taperIdx = if (isTaper) taperWeeks - weeksUntilRace else -1

        val runVolume = weeklyRunDistanceM
        val swimVolume = weeklySwimDistanceM
        val bikeVolumeSeconds = weeklyBikeDurationS
        val easyPace = jr((paces.easy.minSecPerKm + paces.easy.maxSecPerKm) / 2.0)

        val maxLongRun = TRI_MAX_LONG_RUN[raceType] ?: 22000.0
        val longRunDist = minOf(
            jr(runVolume * WebPlanEngine.PLAN_CONSTANTS.LONG_RUN_RATIO),
            maxLongRun,
        )
        val remainingRunVol = maxOf(0.0, runVolume - longRunDist)

        val hasBrick = phase == "BUILD" || phase == "PEAK" || (isTaper && taperIdx == 0)
        val hasOpenWater = phase == "PEAK" || (isTaper && taperIdx <= 1)
        val hasTransition = phase == "PEAK" || (isTaper && taperIdx == 0)

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

        if (isTaper) {
            val taperFactor = when (taperIdx) {
                0 -> 0.5
                1 -> 0.65
                else -> 0.80
            }
            val taperedDist = jr(longRunDist * taperFactor)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = longRunDayResolved,
                    type = "LONG_RUN",
                    description = "Long Run: ${WebPlanEngine.toFixed1(taperedDist / 1000)}km @ Easy",
                    totalDistance = taperedDist,
                    targetPace = easyPace,
                    targetDuration = 0.0,
                )
            )
        } else {
            var longRunDesc = "Long Run: ${WebPlanEngine.toFixed1(longRunDist / 1000)}km @ Easy"
            if (phase == "PEAK") {
                val raceRunDist = customRunDist ?: (TRI_RACE_RUN_DIST[raceType] ?: 10000.0)
                val mpDist = minOf(jr(longRunDist * 0.3 / 100) * 100, raceRunDist * 0.3)
                val easyPart = longRunDist - mpDist
                longRunDesc =
                    "Long Run: ${WebPlanEngine.toFixed1(easyPart / 1000)}km Easy + ${WebPlanEngine.toFixed1(mpDist / 1000)}km @ Race Pace"
            }
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = longRunDayResolved,
                    type = "LONG_RUN",
                    description = longRunDesc,
                    totalDistance = longRunDist,
                    targetPace = easyPace,
                    targetDuration = 0.0,
                )
            )
        }

        if (!isRecoveryWeek && phase != "TAPER") {
            val qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays)
            usedDays.add(qualityDay)
            hardSessionDays.add(qualityDay)

            if (phase == "PEAK" && raceType == "FULL_IRONMAN") {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = qualityDay, type = "TEMPO",
                        description = "Run Threshold: 3x3km @ ${formatPace(paces.threshold.toDouble())}",
                        totalDistance = 13000.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                    )
                )
            } else if (phase == "PEAK") {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = qualityDay, type = "INTERVALS",
                        description = "Intervals: 5x1km @ ${formatPace(paces.interval.toDouble())}",
                        totalDistance = 10000.0, targetPace = paces.interval.toDouble(), targetDuration = 0.0,
                    )
                )
            } else {
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = qualityDay, type = "TEMPO",
                        description = "Threshold: 6km @ ${formatPace(paces.threshold.toDouble())}",
                        totalDistance = 8000.0, targetPace = paces.threshold.toDouble(), targetDuration = 0.0,
                    )
                )
            }
        }

        val runSlotsLeft = maxOf(0, runsPerWeek - 2)
        val easyRunDist = if (runSlotsLeft > 0) jr(remainingRunVol / runSlotsLeft / 100) * 100 else 0.0
        val clampedEasyDist = maxOf(
            WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MIN,
            minOf(WebPlanEngine.PLAN_CONSTANTS.EASY_RUN_MAX, easyRunDist),
        )

        for (i in 0 until runSlotsLeft) {
            val day = getAvailableDay((longRunDayResolved + 2 + i) % 7, hardSessionDays)
            if (usedDays.contains(day)) break
            usedDays.add(day)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day, type = "EASY",
                    description = "Easy: ${WebPlanEngine.toFixed1(clampedEasyDist / 1000)}km",
                    totalDistance = clampedEasyDist, targetPace = easyPace, targetDuration = 0.0,
                )
            )
        }

        val raceSwimDist = customSwimDist ?: (TRI_RACE_SWIM_DIST[raceType] ?: 1500.0)
        val maxSwimPerSession = raceSwimDist * 2
        val swimDistPerSession = minOf(
            if (swimsPerWeek > 0) jr(swimVolume / swimsPerWeek / 100) * 100 else 1500.0,
            maxSwimPerSession,
        )

        if (hasOpenWater && swimsPerWeek >= 2) {
            val owDay = getAvailableDay(preferredSwimDay, hardSessionDays)
            if (!usedDays.contains(owDay)) {
                usedDays.add(owDay)
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = owDay, type = "OPEN_WATER_SWIM",
                        description = "Open Water Swim: ${jr(swimDistPerSession / 100).toInt()}00m (sighting practice)",
                        totalDistance = swimDistPerSession,
                        targetPace = jr(css + 10),
                        targetDuration = 0.0,
                    )
                )
            }
        } else if (phase == "BASE") {
            val drillDay = getAvailableDay(preferredSwimDay, hardSessionDays)
            if (!usedDays.contains(drillDay)) {
                usedDays.add(drillDay)
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = drillDay, type = "SWIM_DRILL",
                        description = "Swim Drill: ${jr(jr(swimDistPerSession * 0.8) / 100).toInt()}00m (technique focus)",
                        totalDistance = jr(swimDistPerSession * 0.8),
                        targetPace = css,
                        targetDuration = 0.0,
                    )
                )
            }
        }

        val existingSwimVariants = workouts.count { it.type == "OPEN_WATER_SWIM" || it.type == "SWIM_DRILL" }
        var remainingSwims = swimsPerWeek - existingSwimVariants
        for (i in 0 until remainingSwims) {
            val day = getAvailableDay((preferredSwimDay + 2 + i * 2) % 7, hardSessionDays)
            if (usedDays.contains(day)) break
            usedDays.add(day)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day, type = "SWIM",
                    description = "Swim: ${jr(swimDistPerSession / 100).toInt()}00m @ Endurance",
                    totalDistance = swimDistPerSession,
                    targetPace = jr(css + 8),
                    targetDuration = 0.0,
                )
            )
        }

        val longRideDuration = getLongRideDuration(raceType, phase, isTaper, taperIdx, bikeVolumeSeconds)
        val hasLongRide = ridesPerWeek >= 2 && !isRecoveryWeek
        var longRideDay: Int? = null

        if (hasLongRide) {
            // Web parity: longRideDay is assigned BEFORE the placement check,
            // so the overflow easy rides anchor on it (and remainingRides
            // subtracts the long ride) even when the day is already taken and
            // the LONG_RIDE workout is never pushed.
            // Web parity: longRideDay is assigned BEFORE the placement check,
            // so the overflow easy rides anchor on it (and remainingRides
            // subtracts the long ride) even when the day is already taken and
            // the LONG_RIDE workout is never pushed.
            val candidate = getAvailableDay((longRunDayResolved + 5) % 7, hardSessionDays)
            longRideDay = candidate
            if (!usedDays.contains(candidate)) {
                usedDays.add(candidate)
                hardSessionDays.add(candidate)
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = candidate, type = "LONG_RIDE",
                        description = "Long Ride: ${jr(longRideDuration / 60).toInt()}min (Zone 2)",
                        totalDistance = 0.0, targetPace = 0.0, targetDuration = longRideDuration,
                    )
                )
            }
        }

        if (hasBrick && !isRecoveryWeek && !isTaper) {
            val brickDay = getAvailableDay(preferredWorkoutDay, hardSessionDays + longRunDayResolved)
            if (!usedDays.contains(brickDay)) {
                usedDays.add(brickDay)
                hardSessionDays.add(brickDay)
                val brickBikeMin = when (raceType) {
                    "FULL_IRONMAN" -> 90
                    "HALF_IRONMAN" -> 60
                    else -> 40
                }
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = brickDay, type = "BRICK",
                        description = "Brick: ${brickBikeMin}min Bike -> 15min Run (T1/T2 practice)",
                        totalDistance = 0.0, targetPace = 0.0,
                        targetDuration = (brickBikeMin + 20) * 60.0,
                    )
                )
            }
        }

        if (hasTransition && !usedDays.contains(preferredWorkoutDay)) {
            usedDays.add(preferredWorkoutDay)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = preferredWorkoutDay, type = "TRANSITION_PRACTICE",
                    description = "Transition Practice: T1 + T2 rehearsal",
                    totalDistance = 0.0, targetPace = 0.0, targetDuration = 1800.0,
                )
            )
        }

        val brickCount = workouts.count { it.type == "BRICK" }
        // Web parity: the long ride is subtracted when hasLongRide — even if
        // its day was taken and the workout was never pushed.
        // Web parity: the long ride is subtracted when hasLongRide — even if
        // its day was taken and the workout was never pushed.
        var remainingRides = ridesPerWeek - (if (hasLongRide) 1 else 0) - brickCount

        val brickBikeMinForCalc = when (raceType) {
            "FULL_IRONMAN" -> 90
            "HALF_IRONMAN" -> 60
            else -> 40
        }
        val usedBikeSeconds = longRideDuration + brickCount * (brickBikeMinForCalc * 60.0)
        val remainingBikeBudget = maxOf(0.0, bikeVolumeSeconds - usedBikeSeconds)

        if (!isRecoveryWeek && phase != "TAPER" && remainingRides > 0) {
            val intervalDay = getAvailableDay((preferredWorkoutDay + 2) % 7, hardSessionDays)
            if (!usedDays.contains(intervalDay)) {
                usedDays.add(intervalDay)
                hardSessionDays.add(intervalDay)
                val intervalDuration = if (remainingRides >= 2) {
                    maxOf(2400.0, minOf(5400.0, jr(remainingBikeBudget * 0.45)))
                } else {
                    maxOf(2400.0, minOf(5400.0, jr(remainingBikeBudget * 0.55)))
                }
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = intervalDay, type = "RIDE_INTERVALS",
                        description = "Bike Intervals: 4x5min @ Threshold (${bikeZones.threshold.min}-${bikeZones.threshold.max}W)",
                        totalDistance = 0.0, targetPace = 0.0, targetDuration = intervalDuration,
                    )
                )
                remainingRides--
            }
        }

        for (i in 0 until remainingRides) {
            // JS `longRideDay || (5 + i)` treats day 0 (Sunday) as falsy too
            val anchorDay = if (longRideDay != null && longRideDay != 0) longRideDay else 5 + i
            val day = getAvailableDay(anchorDay % 7, hardSessionDays)
            if (usedDays.contains(day)) break
            usedDays.add(day)
            val ridesLeft = remainingRides - i
            val usedSoFar = workouts
                .filter {
                    it.type == "LONG_RIDE" || it.type == "RIDE_INTERVALS" || it.type == "BRICK"
                }
                .sumOf { it.targetDuration ?: 0.0 }
            val easyDuration = maxOf(1800.0, jr((bikeVolumeSeconds - usedSoFar) / ridesLeft))
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day, type = "RIDE",
                    description = "Easy Ride: ${jr(easyDuration / 60).toInt()}min (Zone 1-2)",
                    totalDistance = 0.0, targetPace = 0.0, targetDuration = easyDuration,
                )
            )
        }

        var remainingStrength = strengthPerWeek
        val freeDays = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d)) freeDays.add(d)
        }
        for (d in freeDays) {
            if (remainingStrength <= 0) break
            usedDays.add(d)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = d, type = "STRENGTH",
                    description = "Strength: 45min (Triathlon Core & Stability)",
                    totalDistance = 0.0, targetPace = 0.0, targetDuration = 2700.0,
                )
            )
            remainingStrength--
        }

        return scaleTriRunVolume(workouts, weeklyRunDistanceM)
    }

    /** triathlon.ts `scaleTriRunVolume` (L674-715). */
    private fun scaleTriRunVolume(
        workouts: List<WebScheduledWorkout>,
        weeklyRunDistanceM: Double,
    ): List<WebScheduledWorkout> {
        val runWorkouts = workouts.filter { isTriRun(it.type) && it.totalDistance > 0 }
        val totalRunDistance = runWorkouts.sumOf { it.totalDistance }
        if (weeklyRunDistanceM <= 0 || totalRunDistance <= weeklyRunDistanceM) return workouts

        val priorityTypes = setOf("LONG_RUN", "TEMPO", "INTERVALS", "REPETITIONS", "FARTLEK")

        val priorityDistance = runWorkouts
            .filter { priorityTypes.contains(it.type) }
            .sumOf { it.totalDistance }
        val fillDistance = runWorkouts
            .filter { !priorityTypes.contains(it.type) }
            .sumOf { it.totalDistance }
        val fillBudget = maxOf(0.0, weeklyRunDistanceM - priorityDistance)
        val fillScale = if (fillDistance > 0) minOf(1.0, fillBudget / fillDistance) else 0.0

        if (priorityDistance <= weeklyRunDistanceM) {
            return workouts
                .map { w ->
                    if (!isTriRun(w.type) || priorityTypes.contains(w.type)) return@map w
                    val newDistance = roundRunDistance(w.totalDistance * fillScale)
                    withTriRunDistance(w, newDistance)
                }
                .filter { w -> !isTriRun(w.type) || w.totalDistance > 0 }
        }

        val priorityScale = weeklyRunDistanceM / priorityDistance
        return workouts
            .map { w ->
                if (!isTriRun(w.type)) return@map w
                if (!priorityTypes.contains(w.type)) return@map w.copy(totalDistance = 0.0, targetDuration = 0.0)
                val newDistance = roundRunDistance(w.totalDistance * priorityScale)
                withTriRunDistance(w, newDistance)
            }
            .filter { w -> !isTriRun(w.type) || w.totalDistance > 0 }
    }

    /** triathlon.ts `roundRunDistance` (L717-720). */
    private fun roundRunDistance(distance: Double): Double {
        if (distance <= 0) return 0.0
        return floor(distance / 100) * 100
    }

    /** triathlon.ts `withTriRunDistance` (L722-738). */
    private fun withTriRunDistance(workout: WebScheduledWorkout, distance: Double): WebScheduledWorkout {
        if (distance <= 0) {
            return workout.copy(totalDistance = 0.0, targetDuration = 0.0)
        }

        val description = updateTriRunDescription(workout, distance)
        val targetDuration = if (workout.targetDuration != null && workout.targetDuration > 0 &&
            workout.totalDistance > 0
        ) {
            jr(workout.targetDuration * (distance / workout.totalDistance))
        } else {
            workout.targetDuration
        }

        return workout.copy(
            totalDistance = distance,
            targetDuration = targetDuration,
            description = description,
        )
    }

    /** triathlon.ts `updateTriRunDescription` (L740-753). */
    private fun updateTriRunDescription(workout: WebScheduledWorkout, distance: Double): String {
        val distanceKm = WebPlanEngine.toFixed1(distance / 1000)
        if (workout.type == "LONG_RUN") {
            val segmentMatch = Regex("Easy\\s*\\+\\s*([\\d.]+)km\\s*@\\s*Race Pace").find(workout.description)
            if (segmentMatch != null) {
                return "Long Run: ${distanceKm}km @ Easy with Race Pace finish"
            }
            return "Long Run: ${distanceKm}km @ Easy"
        }
        if (workout.type == "EASY" || workout.type == "RECOVERY") {
            return "${if (workout.type == "RECOVERY") "Recovery" else "Easy"}: ${distanceKm}km"
        }
        return workout.description
    }

    /** triathlon.ts `isTriRun` (L755-766). */
    private fun isTriRun(type: String): Boolean =
        type == "EASY" || type == "LONG_RUN" || type == "TEMPO" || type == "INTERVALS" ||
            type == "FARTLEK" || type == "RECOVERY" || type == "REPETITIONS"

    /** triathlon.ts `getLongRideDuration` (L768-801). */
    private fun getLongRideDuration(
        raceType: String,
        phase: String,
        isTaper: Boolean,
        taperIdx: Int,
        bikeVolumeSeconds: Double?,
    ): Double {
        val baseDurations = mapOf(
            "SPRINT_TRI" to 3600.0, "OLYMPIC_TRI" to 5400.0,
            "HALF_IRONMAN" to 10800.0, "FULL_IRONMAN" to 18000.0,
        )
        val base = baseDurations[raceType] ?: 5400.0

        if (bikeVolumeSeconds != null && bikeVolumeSeconds > 0) {
            val longRideShare = when (raceType) {
                "FULL_IRONMAN" -> 0.55
                "HALF_IRONMAN" -> 0.50
                "OLYMPIC_TRI" -> 0.45
                else -> 0.40
            }
            val scaled = jr(bikeVolumeSeconds * longRideShare)
            if (phase == "BASE") return maxOf(1800.0, jr(scaled * 0.55))
            if (phase == "BUILD") return maxOf(2400.0, jr(scaled * 0.80))
            if (phase == "PEAK") return maxOf(3000.0, scaled)
            if (isTaper) {
                val factor = when (taperIdx) {
                    0 -> 0.4
                    1 -> 0.6
                    else -> 0.75
                }
                return maxOf(1800.0, jr(scaled * factor))
            }
            return maxOf(2400.0, scaled)
        }

        if (phase == "BASE") return jr(base * 0.5)
        if (phase == "BUILD") return jr(base * 0.75)
        if (phase == "PEAK") return base
        if (isTaper) {
            val factor = when (taperIdx) {
                0 -> 0.4
                1 -> 0.6
                else -> 0.75
            }
            return jr(base * factor)
        }
        return base
    }

    /** triathlon.ts `generateTriRaceWeek` (L803-864). */
    private fun generateTriRaceWeek(
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        css: Double,
        customSwimDist: Double?,
        customBikeDist: Double?,
        customRunDist: Double?,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()

        usedDays.add(0)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = 0,
                type = "RACE",
                description = "Race Day: " + (
                    if (customSwimDist != null || customBikeDist != null || customRunDist != null) {
                        "Custom Tri (${WebPlanEngine.toFixed1((customSwimDist ?: 750.0) / 1000)}km / " +
                            "${((customBikeDist ?: 20000.0) / 1000).toInt()}km / " +
                            "${WebPlanEngine.toFixed1((customRunDist ?: 5000.0) / 1000)}km)"
                    } else {
                        TRI_RACE_LABELS[raceType] ?: "Triathlon"
                    }
                    ),
                totalDistance = customRunDist ?: (TRI_RACE_RUN_DIST[raceType] ?: 10000.0),
                targetPace = 0.0,
                targetDuration = 0.0,
            )
        )

        usedDays.add(-2)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = -2, type = "SWIM",
                description = "Swim: 1000m Easy (race site familiarization)",
                totalDistance = 1000.0, targetPace = jr(css + 10), targetDuration = 0.0,
            )
        )

        usedDays.add(-3)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = -3, type = "RIDE",
                description = "Easy Spin: 30min (Zone 1)",
                totalDistance = 0.0, targetPace = 0.0, targetDuration = 1800.0,
            )
        )

        usedDays.add(-4)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = -4, type = "RECOVERY",
                description = "Shakeout Run: 3km Easy",
                totalDistance = 3000.0, targetPace = paces.easy.maxSecPerKm.toDouble(), targetDuration = 0.0,
            )
        )

        return workouts.sortedBy { it.dayOffset }
    }

    private fun formatPace(secondsPerKm: Double): String {
        val mins = floor(secondsPerKm / 60).toInt()
        val secs = jr(secondsPerKm % 60).toInt()
        return "$mins:${secs.toString().padStart(2, '0')}"
    }
}
