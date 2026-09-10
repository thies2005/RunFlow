package com.runflow2.app.domain.plan

import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.domain.person.Personalization
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.pow

/**
 * Kotlin port of the web training-plan generator — the same engine that backs
 * POST /api/plans — so offline plans are identical to server plans.
 *
 * Faithful port of Web/src/lib/plans/index.ts:
 *  - `generateTrainingPlan` (L344-372) and the standard-run generator
 *    `generateStandardPlan` (L374-591) incl. `generateRaceWeek` (L642-787) and
 *    `generateWeek` (L802-1184)
 *  - phase budget `resolvePhaseBudget` (L124-239) / `getPhase` (L602-616) and
 *    VDOT progression `resolvePhaseVdot` (L318-340)
 *  - enrichment pipeline: `assignWorkoutTargets`, `fillDurations`,
 *    `enrichWorkoutsWithTargets` (L2067-2143) and
 *    `buildStructuredStepsForWorkout` (L1788-2048)
 *  - generator constants (L20-73)
 *
 * Race-family generators live in [WebPlanUltraGenerator] (run-ultra.ts),
 * [WebPlanNoRaceGenerator] (no-race.ts) and [WebPlanTriathlonGenerator]
 * (triathlon.ts); cross-cutting helpers in [WebPlanDescriptions] and
 * [WebPlanScheduleUtils]. Training paces and HR zones reuse
 * [Personalization] (already a byte-faithful port of vdot.ts / hr-zones.ts).
 *
 * Pure Kotlin — no Android imports — so the parity test can run it on the JVM.
 *
 * Numeric fidelity: everywhere the web uses `Math.round` this port uses
 * [jr] (floor(x+0.5), ties toward +infinity like JS) and `toFixed(1)`
 * becomes [toFixed1] via exact BigDecimal scaling. Dates are [LocalDate]
 * (the web's UTC-midnight dates); day-of-week uses the JS convention
 * (0 = Sunday) via [jsDay].
 */
object WebPlanEngine {

    // -------------------------------------------------------------------
    // Dispatch — index.ts L11-18, L344-372
    // -------------------------------------------------------------------

    /** index.ts L11-14. */
    val ULTRA_RACE_TYPES: Set<String> = setOf(
        "FIFTY_K", "FIFTY_MILE", "HUNDRED_K", "HUNDRED_MILE",
        "TWELVE_HOUR", "TWENTY_FOUR_HOUR", "BACKYARD_ULTRA",
    )

    /** index.ts L16-18. */
    val TRIATHLON_RACE_TYPES: Set<String> = setOf(
        "SPRINT_TRI", "OLYMPIC_TRI", "HALF_IRONMAN", "FULL_IRONMAN", "CUSTOM_TRI",
    )

    /**
     * Port of `generateTrainingPlan` (index.ts L344-372). The returned
     * workouts additionally carry `structuredSteps` from
     * [buildStructuredStepsForWorkout] — the same call the web API route
     * performs on each generated workout.
     */
    fun generateTrainingPlan(config: WebPlanConfig): List<WebGeneratedWorkout> {
        val paces = Personalization.trainingPaces(config.vdot)
        val withTargets = when {
            config.sport == "TRIATHLON" ||
                (config.raceType != null && config.raceType in TRIATHLON_RACE_TYPES) ->
                enrichTargets(WebPlanTriathlonGenerator.generate(config), config, paces, usePhaseVdot = false)

            config.raceType == null ->
                enrichTargets(WebPlanNoRaceGenerator.generate(config), config, paces, usePhaseVdot = false)

            config.raceType != null && config.raceType in ULTRA_RACE_TYPES ->
                enrichTargets(WebPlanUltraGenerator.generate(config), config, paces, usePhaseVdot = false)

            else -> enrichTargets(generateStandardPlan(config), config, paces, usePhaseVdot = true)
        }
        return withTargets.map { it.copy(structuredSteps = buildStructuredStepsForWorkout(it)) }
    }

    /** index.ts `enrichTargets` closure (L347-357). */
    private fun enrichTargets(
        workouts: List<WebGeneratedWorkout>,
        config: WebPlanConfig,
        paces: Personalization.PersonTrainingPaces,
        usePhaseVdot: Boolean,
    ): List<WebGeneratedWorkout> {
        val out = workouts.toMutableList()
        assignWorkoutTargets(out)
        fillDurations(out, paces)
        enrichWorkoutsWithTargets(out, paces, config, usePhaseVdot)
        return out
    }

    // -------------------------------------------------------------------
    // Generator constants — index.ts L20-73
    // -------------------------------------------------------------------

    /** index.ts L20-66. */
    object PLAN_CONSTANTS {
        val MIN_PEAK_VOLUME: Map<String, Double> = mapOf(
            "FIVE_K" to 20000.0, "TEN_K" to 30000.0,
            "HALF_MARATHON" to 40000.0, "MARATHON" to 50000.0,
        )
        val MAX_LONG_RUN_DIST: Map<String, Double> = mapOf(
            "FIVE_K" to 18000.0, "TEN_K" to 22000.0,
            "HALF_MARATHON" to 24000.0, "MARATHON" to 32000.0,
        )
        const val DYNAMIC_LONG_RUN_RATIO: Double = 0.55
        const val MIN_LONG_RUN: Double = 6000.0
        const val MIN_VOLUME_START: Double = 15000.0
        val MIN_START_VOLUME: Map<String, Double> = mapOf(
            "FIVE_K" to 8000.0, "TEN_K" to 10000.0, "HALF_MARATHON" to 12000.0,
            "MARATHON" to 15000.0, "FIFTY_K" to 20000.0, "FIFTY_MILE" to 25000.0,
            "HUNDRED_K" to 25000.0, "HUNDRED_MILE" to 30000.0, "TWELVE_HOUR" to 20000.0,
            "TWENTY_FOUR_HOUR" to 25000.0, "BACKYARD_ULTRA" to 20000.0,
            "SPRINT_TRI" to 10000.0, "OLYMPIC_TRI" to 10000.0, "HALF_IRONMAN" to 12000.0,
            "FULL_IRONMAN" to 15000.0, "CUSTOM_TRI" to 10000.0, "CUSTOM_DISTANCE" to 10000.0,
        )
        const val EASY_RUN_MIN: Double = 4000.0
        const val EASY_RUN_MAX: Double = 12000.0
        const val LONG_RUN_RATIO: Double = 0.50
        const val LONG_RUN_RATIO_LOW_VOLUME: Double = 0.65
        const val LOW_VOLUME_THRESHOLD: Double = 64000.0
        const val START_VOLUME_RATIO: Double = 0.60
        const val WEEKLY_GROWTH_CAP: Double = 1.10
        const val RECOVERY_WEEK_FACTOR: Double = 0.80
        const val STEP_LOADING_CYCLE: Int = 4
        const val MIN_GAP_DAYS: Int = 2
        const val MAX_TIME_ON_FEET_SECONDS: Double = 12600.0
    }

    /** index.ts L68-73. */
    val TAPER_FRACTIONS: Map<String, List<Double>> = mapOf(
        "FIVE_K" to listOf(0.75),
        "TEN_K" to listOf(0.80, 0.60),
        "HALF_MARATHON" to listOf(0.75, 0.55),
        "MARATHON" to listOf(0.80, 0.65, 0.45),
    )

    /** index.ts L75-80. */
    fun getMinStartVolume(raceType: String?): Double {
        if (raceType != null) PLAN_CONSTANTS.MIN_START_VOLUME[raceType]?.let { return it }
        return PLAN_CONSTANTS.MIN_VOLUME_START
    }

    /** index.ts L82-87. */
    fun classifyCustomRunDistance(customDistanceM: Double): String = when {
        customDistanceM <= 6000 -> "FIVE_K"
        customDistanceM <= 15000 -> "TEN_K"
        customDistanceM <= 30000 -> "HALF_MARATHON"
        else -> "MARATHON"
    }

    /** index.ts L105-112. */
    data class PhaseBudget(
        val taperWeeks: Int,
        val peakWeeks: Int,
        val buildWeeks: Int,
        val enduranceWeeks: Int = 0,
        val mentalPrepWeeks: Int = 0,
        val baseWeeks: Int = 0,
    )

    /** index.ts L124-239. */
    fun resolvePhaseBudget(
        totalWeeks: Int,
        taperWeeks: Int?,
        peakWeeks: Int?,
        buildWeeks: Int?,
        isTriathlon: Boolean = false,
        isUltra: Boolean = false,
        isBackyardUltra: Boolean = false,
        defaultTaper: Int? = null,
    ): PhaseBudget {
        val resolvedTotal = maxOf(1, totalWeeks)
        val availableWeeks = maxOf(0, resolvedTotal - 1)

        var taper = taperWeeks ?: (defaultTaper ?: 2)
        taper = taper.coerceIn(0, availableWeeks)

        var remaining = availableWeeks - taper

        if (isUltra) {
            val hasExplicitUltraBuildOrPeak = peakWeeks != null || buildWeeks != null
            if (hasExplicitUltraBuildOrPeak) {
                var peak = peakWeeks ?: 2
                peak = peak.coerceIn(0, remaining)
                remaining -= peak

                var build = buildWeeks ?: maxOf(2, minOf(6, floor(availableWeeks * 0.35).toInt()))
                build = build.coerceIn(0, remaining)
                remaining -= build

                var endurance = maxOf(3, minOf(6, floor(availableWeeks * 0.25).toInt()))
                    .coerceIn(0, remaining)
                remaining -= endurance

                var mentalPrep = 0
                if (isBackyardUltra && remaining > 0) {
                    mentalPrep = minOf(4, remaining)
                    remaining -= mentalPrep
                }
                val base = maxOf(0, remaining)
                return PhaseBudget(taper, peak, build, endurance, mentalPrep, base)
            }

            var peak = 2
            peak = peak.coerceIn(0, remaining)
            remaining -= peak

            var endurance = maxOf(3, minOf(6, floor(availableWeeks * 0.25).toInt()))
            endurance = endurance.coerceIn(0, remaining)
            remaining -= endurance

            var build = maxOf(2, minOf(6, floor(availableWeeks * 0.35).toInt()))
            build = build.coerceIn(0, remaining)
            remaining -= build

            var mentalPrep = 0
            if (isBackyardUltra && remaining > 0) {
                mentalPrep = minOf(4, remaining)
                remaining -= mentalPrep
            }
            val base = maxOf(0, remaining)
            return PhaseBudget(taper, peak, build, endurance, mentalPrep, base)
        } else {
            val reserveBaseWeeks = if (peakWeeks == null && buildWeeks == null) {
                when {
                    resolvedTotal >= 10 -> 4
                    resolvedTotal >= 8 -> 3
                    resolvedTotal >= 6 -> 2
                    else -> 0
                }
            } else 0
            val phaseBudget = maxOf(0, remaining - reserveBaseWeeks)

            var peak = peakWeeks ?: 2
            val maxPeak = maxOf(1, floor(availableWeeks / 3.0).toInt())
            peak = peak.coerceIn(0, maxPeak)
            peak = minOf(peak, if (reserveBaseWeeks > 0) phaseBudget else remaining)
            remaining -= peak

            var build = buildWeeks ?: 4
            val buildBudget = if (reserveBaseWeeks > 0) maxOf(0, phaseBudget - peak) else remaining
            build = build.coerceIn(0, buildBudget)
            remaining -= build

            val base = maxOf(0, remaining)
            return PhaseBudget(taper, peak, build, 0, 0, base)
        }
    }

    /** index.ts L602-616. */
    fun getPhase(weeksUntilRace: Int, taperWeeks: Int, peakWeeks: Int, buildWeeks: Int): String {
        if (weeksUntilRace <= 0) return "BASE"
        if (weeksUntilRace == 1) return "RACE_WEEK"
        if (taperWeeks > 0 && weeksUntilRace <= taperWeeks) return "TAPER"
        if (peakWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks) return "PEAK"
        if (buildWeeks > 0 && weeksUntilRace <= taperWeeks + peakWeeks + buildWeeks) return "BUILD"
        return "BASE"
    }

    /** index.ts L318-340. */
    fun resolvePhaseVdot(currentVdot: Double, targetVdot: Double?, phase: String): Double {
        if (targetVdot == null || targetVdot <= currentVdot) return currentVdot
        val gap = targetVdot - currentVdot
        val maxVdot = jr(currentVdot * 1.05 * 10) / 10
        if (phase == "TAPER") return resolvePhaseVdot(currentVdot, targetVdot, "PEAK")
        val progressionVdot = when (phase) {
            "BUILD" -> currentVdot + gap * 0.5
            "PEAK" -> currentVdot + gap * 0.75
            else -> return currentVdot
        }
        return minOf(jr(progressionVdot * 10) / 10, maxVdot)
    }

    // -------------------------------------------------------------------
    // Standard (non-ultra, non-tri) plan — index.ts L374-591
    // -------------------------------------------------------------------

    internal data class StandardPhases(
        val effectiveRaceType: String,
        val startDate: LocalDate,
        val weekStart: LocalDate,
        val totalWeeks: Int,
        val startVolume: Double,
        val peakVolume: Double,
        val effectivePeakVolume: Double,
        val weeklyGrowthRate: Double,
        val taperWeeks: Int,
        val peakWeeks: Int,
        val buildWeeks: Int,
    )

    /** index.ts `generateStandardPlan` (L374-591). */
    fun generateStandardPlan(config: WebPlanConfig): List<WebGeneratedWorkout> {
        val vdot = config.vdot
        val raceDate = config.raceDate
        val raceType = config.raceType!!
        val effectiveRaceType = if (raceType == "CUSTOM_DISTANCE" &&
            config.customDistanceM != null && config.customDistanceM > 0
        ) classifyCustomRunDistance(config.customDistanceM!!) else raceType

        val requestedStartDate = config.startDate ?: LocalDate.now()
        val startDate = if (requestedStartDate > raceDate) raceDate else requestedStartDate
        val runsPerWeek = maxOf(0, config.runsPerWeek ?: 4)
        val ridesPerWeek = maxOf(0, config.ridesPerWeek ?: 0)
        val strengthPerWeek = maxOf(0, config.strengthPerWeek ?: 0)
        val swimsPerWeek = maxOf(0, config.swimsPerWeek ?: 0)

        val longRunDay = config.longRunDay ?: 0
        val workoutDay = config.workoutDay ?: 3

        var peakVolume = config.weeklyMileageGoal.orWebDefault(40000.0)
        val minPeak = PLAN_CONSTANTS.MIN_PEAK_VOLUME[effectiveRaceType] ?: 20000.0
        if (peakVolume < minPeak) peakVolume = minPeak

        // current week's Sunday (index.ts L395-396)
        val weekStart = startDate.minusDays(jsDay(startDate).toLong())

        val totalWeeks = maxOf(
            1,
            ceil(ChronoUnit.DAYS.between(weekStart, raceDate) / 7.0).toInt(),
        )

        val minStart = getMinStartVolume(config.raceType)
        val startVolume: Double = if (config.startWeeklyMileage != null && config.startWeeklyMileage > 0) {
            minOf(maxOf(config.startWeeklyMileage!!, minStart), peakVolume)
        } else {
            val sv = peakVolume * PLAN_CONSTANTS.START_VOLUME_RATIO
            if (sv < minStart) minOf(minStart, peakVolume) else sv
        }

        val paces = Personalization.trainingPaces(vdot)
        val targetRacePace = getTargetRacePaceSeconds(effectiveRaceType, config.targetTime, config.customDistanceM)

        val defaultTaperWeeks = TAPER_FRACTIONS[effectiveRaceType]?.size ?: 2
        val phases = resolvePhaseBudget(
            totalWeeks,
            config.taperWeeks,
            config.peakWeeks,
            config.buildWeeks,
            defaultTaper = defaultTaperWeeks,
        )
        val taperWeeks = phases.taperWeeks
        val peakWeeks = phases.peakWeeks
        val buildWeeks = phases.buildWeeks

        val growthRatio = peakVolume / startVolume
        val minRampWeeks = if (growthRatio > 1.001) {
            ceil(ln(growthRatio) / ln(PLAN_CONSTANTS.WEEKLY_GROWTH_CAP)).toInt()
        } else 1

        var calendarRampWeeks = minRampWeeks
        while (calendarRampWeeks - calendarRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE < minRampWeeks) {
            calendarRampWeeks++
        }

        val availableRampWeeks = maxOf(1, totalWeeks - taperWeeks)
        var effectivePeakVolume = peakVolume
        if (availableRampWeeks < calendarRampWeeks) {
            val effWeeks = availableRampWeeks - availableRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE
            effectivePeakVolume = jr(
                startVolume * PLAN_CONSTANTS.WEEKLY_GROWTH_CAP.pow(maxOf(1, effWeeks).toDouble()),
            )
            calendarRampWeeks = availableRampWeeks
        }

        val effectiveWeeksInRamp = maxOf(
            1,
            calendarRampWeeks - calendarRampWeeks / PLAN_CONSTANTS.STEP_LOADING_CYCLE,
        )
        val weeklyGrowthRate = (effectivePeakVolume / startVolume).pow(1.0 / effectiveWeeksInRamp)

        var lastNonRecoveryVolume = startVolume
        var effectiveWeekIndex = 0
        var baseBuildCounter = 0
        var lastPhase: String? = null
        var weekInPhase = 0

        val workouts = ArrayList<WebGeneratedWorkout>()

        var currentDate = weekStart
        for (week in 1..totalWeeks) {
            val weeksUntilRace = totalWeeks - week + 1
            val phase = getPhase(weeksUntilRace, taperWeeks, peakWeeks, buildWeeks)

            if (phase != "RACE_WEEK") {
                if (phase != lastPhase) {
                    weekInPhase = 1
                    lastPhase = phase
                } else {
                    weekInPhase++
                }
            }

            if (phase == "RACE_WEEK") {
                val raceWeekWorkouts = generateRaceWeek(
                    raceDate = raceDate,
                    raceType = raceType,
                    paces = paces,
                    runsPerWeek = runsPerWeek,
                    raceWeekRunVolumeCap = getRaceWeekRunVolumeCap(effectiveRaceType, effectivePeakVolume, config.customDistanceM),
                    ridesPerWeek = ridesPerWeek,
                    swimsPerWeek = swimsPerWeek,
                    strengthPerWeek = strengthPerWeek,
                    customDistanceM = config.customDistanceM,
                    targetRacePace = targetRacePace,
                    targetRaceDuration = config.targetTime,
                )
                for (w in raceWeekWorkouts) {
                    var specificDate = raceDate
                    if (w.type != "RACE") {
                        specificDate = raceDate.plusDays(w.dayOffset.toLong())
                    }
                    // index.ts L484-491: clamp into the plan start
                    if (specificDate < startDate) specificDate = startDate
                    workouts.add(
                        WebGeneratedWorkout(
                            date = specificDate,
                            type = w.type,
                            description = w.description,
                            totalDistance = w.totalDistance,
                            targetPace = w.targetPace,
                            targetDuration = w.targetDuration,
                            phase = w.phase,
                            targetHrZone = w.targetHrZone,
                        )
                    )
                }
                currentDate = currentDate.plusDays(7)
                continue
            }

            var weekVolumeCap: Double
            val isRecoveryWeek: Boolean

            if (phase == "TAPER") {
                weekVolumeCap = getTaperVolume(weeksUntilRace, taperWeeks, effectivePeakVolume, effectiveRaceType)
                weekVolumeCap = maxOf(PLAN_CONSTANTS.EASY_RUN_MIN * 2, weekVolumeCap)
                isRecoveryWeek = false
            } else if (phase == "PEAK") {
                weekVolumeCap = effectivePeakVolume
                isRecoveryWeek = false
            } else {
                baseBuildCounter++
                isRecoveryWeek = baseBuildCounter % PLAN_CONSTANTS.STEP_LOADING_CYCLE == 0
                weekVolumeCap = if (isRecoveryWeek) {
                    jr(lastNonRecoveryVolume * weeklyGrowthRate * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
                } else {
                    effectiveWeekIndex++
                    var cap = jr(startVolume * weeklyGrowthRate.pow(effectiveWeekIndex.toDouble()))
                    cap = minOf(cap, effectivePeakVolume)
                    lastNonRecoveryVolume = cap
                    cap
                }
            }

            val effectiveFloor = if (isRecoveryWeek) {
                jr(PLAN_CONSTANTS.MIN_VOLUME_START * PLAN_CONSTANTS.RECOVERY_WEEK_FACTOR)
            } else {
                PLAN_CONSTANTS.MIN_VOLUME_START
            }
            weekVolumeCap = maxOf(effectiveFloor, weekVolumeCap)

            val phaseVdot = resolvePhaseVdot(vdot, config.targetVdot, phase)
            val phasePaces = if (phaseVdot != vdot) Personalization.trainingPaces(phaseVdot) else paces

            var weekSchedule = generateWeek(
                phase = phase,
                raceType = effectiveRaceType,
                paces = phasePaces,
                runsPerWeek = runsPerWeek,
                ridesPerWeek = ridesPerWeek,
                strengthPerWeek = strengthPerWeek,
                swimsPerWeek = swimsPerWeek,
                weeklyVolume = weekVolumeCap,
                maxLongRunKm = config.maxLongRunKm,
                preferredLongRunDay = longRunDay,
                preferredWorkoutDay = workoutDay,
                preferredSwimDay = config.swimDay,
                restDays = config.restDays,
                weekInPhase = weekInPhase,
                targetRacePace = targetRacePace,
            )

            val totalRunDistance = weekSchedule.filter { isRun(it.type) }.sumOf { it.totalDistance }

            if (totalRunDistance > weekVolumeCap) {
                weekSchedule = scaleToVolumeCap(weekSchedule, weekVolumeCap)
            }

            for (w in weekSchedule) {
                val specificDate = currentDate.plusDays(w.dayOffset.toLong())
                if (specificDate < startDate) continue
                if (isRun(w.type) && w.totalDistance == 0.0) continue

                workouts.add(
                    WebGeneratedWorkout(
                        date = specificDate,
                        type = w.type,
                        description = w.description,
                        totalDistance = w.totalDistance,
                        targetPace = w.targetPace,
                        targetDuration = w.targetDuration,
                        phase = w.phase,
                        targetHrZone = w.targetHrZone,
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

    /** index.ts L618-630. */
    private fun getTaperVolume(weeksUntilRace: Int, taperWeeks: Int, peakVolume: Double, raceType: String): Double {
        val fractions = TAPER_FRACTIONS[raceType] ?: return jr(peakVolume * 0.65)
        val taperWeekIndex = taperWeeks - weeksUntilRace
        val clampedIndex = taperWeekIndex.coerceIn(0, fractions.size - 1)
        return jr(peakVolume * fractions[clampedIndex])
    }

    /** index.ts L632-640. */
    fun getRaceWeekRunVolumeCap(raceType: String, effectivePeakVolume: Double, customDistanceM: Double?): Double {
        val fractions = TAPER_FRACTIONS[raceType]
        val finalTaperFraction = fractions?.last() ?: 0.45
        val raceDist = getRaceDistanceMeters(raceType, customDistanceM).takeIf { it > 0 } ?: 10000.0
        return maxOf(
            jr(effectivePeakVolume * finalTaperFraction * 0.5),
            raceDist + 10000,
        )
    }

    /** index.ts L642-787 (`generateRaceWeek`). */
    private fun generateRaceWeek(
        raceDate: LocalDate,
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        runsPerWeek: Int,
        raceWeekRunVolumeCap: Double,
        ridesPerWeek: Int?,
        swimsPerWeek: Int?,
        strengthPerWeek: Int?,
        customDistanceM: Double?,
        targetRacePace: Double?,
        targetRaceDuration: Double?,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()

        val raceDistKm = getRaceDistanceKm(raceType, customDistanceM)
        val raceDistMeters = getRaceDistanceMeters(raceType, customDistanceM)
        val maxRunVolume = maxOf(raceDistMeters, raceWeekRunVolumeCap)

        var remainingExtraRunSlots = maxOf(0, runsPerWeek - 1)
        var remainingSupplementalRunVolume = maxOf(0.0, maxRunVolume - raceDistMeters)

        usedDays.add(0)
        workouts.add(
            WebScheduledWorkout(
                dayOffset = 0,
                type = "RACE",
                description = "Race Day: ${raceDistKm}km",
                totalDistance = raceDistMeters,
                targetPace = targetRacePace ?: 0.0,
                targetDuration = targetRaceDuration
                    ?: (targetRacePace?.takeIf { it > 0 }?.let { computeDuration(raceDistMeters, it) } ?: 0.0),
                phase = "RACE_WEEK",
                targetHrZone = workoutTypeToHrZone("RACE"),
            )
        )

        fun addSupplementalRun(relativeOffset: Int, workout: WebScheduledWorkout): Boolean {
            if (remainingExtraRunSlots <= 0) return false
            if (workout.totalDistance > remainingSupplementalRunVolume) return false
            val dayOffset = relativeOffset
            if (usedDays.contains(dayOffset)) return false
            usedDays.add(dayOffset)
            workouts.add(workout.copy(dayOffset = dayOffset))
            remainingExtraRunSlots--
            remainingSupplementalRunVolume -= workout.totalDistance
            return true
        }

        val preRaceStrideRelativeOffset = -2
        addSupplementalRun(
            preRaceStrideRelativeOffset,
            WebScheduledWorkout(
                dayOffset = 0,
                type = "EASY",
                description = "Easy Run: 3km + 4x100m Strides",
                totalDistance = 3400.0,
                targetPace = jr((paces.easy.maxSecPerKm + paces.easy.minSecPerKm) / 2.0),
                targetDuration = computeDuration(
                    3400.0,
                    jr((paces.easy.maxSecPerKm + paces.easy.minSecPerKm) / 2.0),
                ),
                phase = "RACE_WEEK",
                targetHrZone = workoutTypeToHrZone("EASY"),
            ),
        )

        val shakeoutRelativeOffsets = listOf(-1, -3, -4, -5, -6)
        var shakeoutCount = 0
        for (relativeOffset in shakeoutRelativeOffsets) {
            if (shakeoutCount >= 2) break
            val wasAdded = addSupplementalRun(
                relativeOffset,
                WebScheduledWorkout(
                    dayOffset = 0,
                    type = "RECOVERY",
                    description = "Shakeout Run: 3km @ Easy",
                    totalDistance = 3000.0,
                    targetPace = paces.easy.maxSecPerKm.toDouble(),
                    targetDuration = computeDuration(3000.0, paces.easy.maxSecPerKm.toDouble()),
                    phase = "RACE_WEEK",
                    targetHrZone = workoutTypeToHrZone("RECOVERY"),
                ),
            )
            if (wasAdded) shakeoutCount++
        }

        val rwRidesPerWeek = ridesPerWeek ?: 0
        val rwSwimsPerWeek = swimsPerWeek ?: 0
        val rwStrengthPerWeek = strengthPerWeek ?: 0

        if (rwRidesPerWeek > 0 || rwSwimsPerWeek > 0 || rwStrengthPerWeek > 0) {
            val freeDaysForCT = listOf(-4, -3, -5, -1, -6).filter { !usedDays.contains(it) }

            var ctRidePlaced = false
            var ctSwimPlaced = false
            var ctStrengthPlaced = false
            var ctSwimDay: Int? = null

            for (d in freeDaysForCT) {
                if (ctRidePlaced && ctSwimPlaced && ctStrengthPlaced) break

                if (!ctRidePlaced && rwRidesPerWeek > 0) {
                    ctRidePlaced = true
                    usedDays.add(d)
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = d, type = "RIDE",
                            description = "Easy Spin: 30min (Zone 1)",
                            totalDistance = 0.0, targetPace = 0.0, targetDuration = 1800.0,
                            phase = "RACE_WEEK", targetHrZone = workoutTypeToHrZone("RIDE"),
                        )
                    )
                    continue
                }

                if (!ctSwimPlaced && rwSwimsPerWeek > 0) {
                    ctSwimPlaced = true
                    ctSwimDay = d
                    usedDays.add(d)
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = d, type = "SWIM",
                            description = "Swim: 1200m @ Easy",
                            totalDistance = 1200.0, targetPace = 120.0, targetDuration = 2100.0,
                            phase = "RACE_WEEK", targetHrZone = workoutTypeToHrZone("SWIM"),
                        )
                    )
                    continue
                }

                if (!ctStrengthPlaced && rwStrengthPerWeek > 0 && d != ctSwimDay) {
                    ctStrengthPlaced = true
                    usedDays.add(d)
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = d, type = "STRENGTH",
                            description = "Strength: 30min (Light)",
                            totalDistance = 0.0, targetPace = 0.0, targetDuration = 1800.0,
                            phase = "RACE_WEEK", targetHrZone = workoutTypeToHrZone("STRENGTH"),
                        )
                    )
                    continue
                }
            }
        }

        return workouts.sortedBy { it.dayOffset }
    }

    /** index.ts L789-800. */
    private fun getSwimWorkout(phase: String, weekInPhase: Int): SwimWorkoutSpec = when (phase) {
        "BASE" -> SwimWorkoutSpec("Swim: 1500m @ Easy", 1500.0, 120.0, 2700.0)
        "BUILD" -> SwimWorkoutSpec("Swim: 1800m (4x100m drills + 1400m steady)", 1800.0, 115.0, 3000.0)
        "PEAK" -> SwimWorkoutSpec(
            "Swim: 1500m (200m warmup + 4x200m @ moderate + 500m cooldown)", 1500.0, 110.0, 2700.0,
        )
        else -> SwimWorkoutSpec("Swim: 1200m @ Easy", 1200.0, 120.0, 2100.0)
    }

    internal data class SwimWorkoutSpec(
        val description: String,
        val totalDistance: Double,
        val targetPace: Double,
        val targetDuration: Double,
    )

    /** index.ts L802-1184 (`generateWeek`). */
    internal fun generateWeek(
        phase: String,
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        runsPerWeek: Int,
        ridesPerWeek: Int,
        strengthPerWeek: Int,
        swimsPerWeek: Int,
        weeklyVolume: Double,
        maxLongRunKm: Double?,
        preferredLongRunDay: Int,
        preferredWorkoutDay: Int,
        preferredSwimDay: Int?,
        restDays: List<Int>?,
        weekInPhase: Int?,
        targetRacePace: Double?,
    ): List<WebScheduledWorkout> {
        val workouts = ArrayList<WebScheduledWorkout>()
        val usedDays = HashSet<Int>()
        val hardSessionDays = ArrayList<Int>()

        // Pre-mark user-designated rest days so no workouts are scheduled on them
        if (restDays != null && restDays.isNotEmpty()) {
            for (rd in restDays) usedDays.add(rd)
        }

        val longRunDist = getLongRunDistance(raceType, weeklyVolume, paces, maxLongRunKm)

        val hasQuality = runsPerWeek >= 2 && phase != "TAPER"
        val qualitySession = if (hasQuality) {
            getQualitySession(raceType, paces, phase, weeklyVolume, weekInPhase ?: 1, targetRacePace)
        } else null
        val qualityDist = qualitySession?.totalDistance ?: 0.0

        val longRunCount = if (runsPerWeek >= 1) 1 else 0
        val qualityRunCount = if (hasQuality) 1 else 0
        val totalKeyRuns = longRunCount + qualityRunCount
        val easyRunsCount = if (hasQuality) {
            maxOf(0, runsPerWeek - totalKeyRuns)
        } else {
            maxOf(0, runsPerWeek - longRunCount)
        }

        val remainingVol = maxOf(0.0, weeklyVolume - longRunDist - qualityDist)
        val calculatedEasyDist = if (easyRunsCount > 0) remainingVol / easyRunsCount else 5000.0

        val easyDist = maxOf(
            PLAN_CONSTANTS.EASY_RUN_MIN,
            minOf(jr(calculatedEasyDist / 100) * 100, PLAN_CONSTANTS.EASY_RUN_MAX),
        )

        val easyPace = paces.easy.maxSecPerKm.toDouble()
        val recoveryPace = paces.easy.maxSecPerKm.toDouble()

        fun getAvailableDayWithGap(preferred: Int, gapFrom: List<Int>): Int {
            val candidates = ArrayList<Int>()
            for (d in 0 until 7) {
                if (usedDays.contains(d)) continue
                val tooClose = gapFrom.any { hd ->
                    val diff = abs(d - hd)
                    minOf(diff, 7 - diff) < PLAN_CONSTANTS.MIN_GAP_DAYS
                }
                if (!tooClose) candidates.add(d)
            }

            if (candidates.contains(preferred)) return preferred
            if (candidates.isNotEmpty()) {
                return candidates.sortedBy { abs(it - preferred) }[0]
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
            val day = getAvailableDayWithGap(preferredLongRunDay, emptyList())
            usedDays.add(day)
            hardSessionDays.add(day)

            var longRunDesc = "Long Run: ${toFixed1(longRunDist / 1000)}km @ Easy"
            var longRunPace = easyPace

            if (phase == "BUILD" && (raceType == "HALF_MARATHON" || raceType == "MARATHON")) {
                longRunDesc = "Long Run: ${toFixed1(longRunDist / 1000)}km (last 3km progressive)"
                longRunPace = easyPace
            }

            if (phase == "PEAK" && (raceType == "HALF_MARATHON" || raceType == "MARATHON")) {
                val mpDist = jr(longRunDist * 0.3 / 100) * 100
                val easyPart = longRunDist - mpDist
                longRunDesc =
                    "Long Run: ${toFixed1(easyPart / 1000)}km Easy + ${toFixed1(mpDist / 1000)}km @ Goal Pace"
                longRunPace = easyPace
            }

            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day,
                    type = "LONG_RUN",
                    description = longRunDesc,
                    totalDistance = longRunDist,
                    targetPace = longRunPace,
                    targetDuration = computeDuration(longRunDist, longRunPace),
                    phase = phase,
                    targetHrZone = workoutTypeToHrZone("LONG_RUN"),
                )
            )
        }

        if (hasQuality && qualitySession != null) {
            val day = getAvailableDayWithGap(preferredWorkoutDay, hardSessionDays)
            usedDays.add(day)
            hardSessionDays.add(day)
            workouts.add(
                qualitySession.copy(
                    dayOffset = day,
                    targetDuration = computeQualityDuration(
                        qualitySession.totalDistance,
                        qualitySession.targetPace ?: 0.0,
                        easyPace,
                        getQualityFraction(qualitySession.type),
                    ),
                    phase = phase,
                    targetHrZone = getRunQualityHrZone(qualitySession.type, qualitySession.description),
                )
            )
        } else if (runsPerWeek >= 2) {
            val day = getAvailableDayWithGap(preferredWorkoutDay, hardSessionDays)
            usedDays.add(day)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day,
                    type = "EASY",
                    description = "Easy Run: ${toFixed1(easyDist / 1000)}km",
                    totalDistance = easyDist,
                    targetPace = easyPace,
                    targetDuration = computeDuration(easyDist, easyPace),
                    phase = phase,
                    targetHrZone = workoutTypeToHrZone("EASY"),
                )
            )
        }

        val alreadyScheduledEasyRuns = if (hasQuality) 0 else if (runsPerWeek >= 2) 1 else 0
        val additionalRunsCount = maxOf(0, easyRunsCount - alreadyScheduledEasyRuns)
        val easyRunDays = getDistributedDays(additionalRunsCount, usedDays)

        var stridesInjected = 0
        val stridesPerWeek = if (phase == "BASE") 2 else 0

        for (d in easyRunDays) {
            usedDays.add(d)

            val dayAfterHard = hardSessionDays.any { hd ->
                val diff = (d - hd + 7) % 7
                diff == 1
            }

            if (dayAfterHard) {
                val includeStrides = phase == "BASE" && stridesInjected < stridesPerWeek
                val suffix = if (includeStrides) " + 6x100m Strides" else ""
                if (includeStrides) stridesInjected++

                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d,
                        type = "RECOVERY",
                        description = "Recovery Run: ${toFixed1(easyDist / 1000)}km$suffix",
                        totalDistance = easyDist,
                        targetPace = recoveryPace,
                        targetDuration = computeDuration(easyDist, recoveryPace),
                        phase = phase,
                        targetHrZone = workoutTypeToHrZone("RECOVERY"),
                    )
                )
            } else {
                val includeStrides = phase == "BASE" && stridesInjected < stridesPerWeek
                val desc = if (includeStrides) {
                    "Easy Run: ${toFixed1(easyDist / 1000)}km + 6x100m Strides"
                } else {
                    "Easy Run: ${toFixed1(easyDist / 1000)}km"
                }

                if (includeStrides) stridesInjected++

                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d,
                        type = "EASY",
                        description = desc,
                        totalDistance = easyDist,
                        targetPace = easyPace,
                        targetDuration = computeDuration(easyDist, easyPace),
                        phase = phase,
                        targetHrZone = workoutTypeToHrZone("EASY"),
                    )
                )
            }
        }

        val longRunDayOffset = workouts.firstOrNull { it.type == "LONG_RUN" }?.dayOffset
        val qualityDay = workouts.firstOrNull { w ->
            w.type == "INTERVALS" || w.type == "TEMPO" ||
                w.type == "REPETITIONS" || w.type == "FARTLEK" ||
                (w.type == "EASY" && w.description.contains("Fartlek"))
        }?.dayOffset

        val protectedDays = HashSet<Int>()
        if (longRunDayOffset != null) protectedDays.add(longRunDayOffset)
        if (qualityDay != null) protectedDays.add(qualityDay)

        var remainingRides = ridesPerWeek
        var remainingSwims = swimsPerWeek

        // If the user has a preferred swim day, try to place the first swim there
        if (preferredSwimDay != null && remainingSwims > 0 && !usedDays.contains(preferredSwimDay)) {
            usedDays.add(preferredSwimDay)
            remainingSwims--
            val swimDetails = getSwimWorkout(phase, weekInPhase ?: 1)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = preferredSwimDay,
                    type = "SWIM",
                    description = swimDetails.description,
                    totalDistance = swimDetails.totalDistance,
                    targetPace = swimDetails.targetPace,
                    targetDuration = swimDetails.targetDuration,
                    phase = phase,
                    targetHrZone = workoutTypeToHrZone("SWIM"),
                )
            )
        }

        val totalCardio = remainingRides + remainingSwims
        val cardioFreeDays = getAvailableCrossTrainingDays(totalCardio, usedDays, protectedDays)

        for (d in cardioFreeDays) {
            usedDays.add(d)
            if (remainingRides > 0) {
                remainingRides--
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d, type = "RIDE",
                        description = "Bike Ride: 60min (Zone 1-2)",
                        totalDistance = 0.0, targetPace = 0.0, targetDuration = 3600.0,
                        phase = phase, targetHrZone = workoutTypeToHrZone("RIDE"),
                    )
                )
            } else if (remainingSwims > 0) {
                remainingSwims--
                val swimDetails = getSwimWorkout(phase, weekInPhase ?: 1)
                workouts.add(
                    WebScheduledWorkout(
                        dayOffset = d, type = "SWIM",
                        description = swimDetails.description,
                        totalDistance = swimDetails.totalDistance,
                        targetPace = swimDetails.targetPace,
                        targetDuration = swimDetails.targetDuration,
                        phase = phase, targetHrZone = workoutTypeToHrZone("SWIM"),
                    )
                )
            }
        }

        if (remainingRides > 0 || remainingSwims > 0) {
            val overloadDays = getDistributedDays(remainingRides + remainingSwims, usedDays, true, workouts)
            for (d in overloadDays) {
                usedDays.add(d)
                if (remainingRides > 0) {
                    remainingRides--
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = d, type = "RIDE",
                            description = "Bike Ride: 60min (Zone 1-2)",
                            totalDistance = 0.0, targetPace = 0.0, targetDuration = 3600.0,
                            phase = phase, targetHrZone = workoutTypeToHrZone("RIDE"),
                        )
                    )
                } else if (remainingSwims > 0) {
                    remainingSwims--
                    val swimDetails = getSwimWorkout(phase, weekInPhase ?: 1)
                    workouts.add(
                        WebScheduledWorkout(
                            dayOffset = d, type = "SWIM",
                            description = swimDetails.description,
                            totalDistance = swimDetails.totalDistance,
                            targetPace = swimDetails.targetPace,
                            targetDuration = swimDetails.targetDuration,
                            phase = phase, targetHrZone = workoutTypeToHrZone("SWIM"),
                        )
                    )
                }
            }
        }

        val rideDays = ArrayList<Int>()
        val swimDays = ArrayList<Int>()
        for (w in workouts) {
            if (w.type == "RIDE") rideDays.add(w.dayOffset)
            if (w.type == "SWIM") swimDays.add(w.dayOffset)
        }

        var remainingStrength = strengthPerWeek
        val strengthDays = LinkedHashSet<Int>()

        fun pickBestCandidate(candidates: List<Int>): Int? {
            if (candidates.isEmpty()) return null
            if (strengthDays.isEmpty()) return candidates[0]

            var bestCandidate = candidates[0]
            var bestMinDist = -1
            for (candidate in candidates) {
                var minDist = 7
                for (sd in strengthDays) {
                    val diff = abs(candidate - sd)
                    val dist = minOf(diff, 7 - diff)
                    if (dist < minDist) minDist = dist
                }
                if (minDist > bestMinDist) {
                    bestMinDist = minDist
                    bestCandidate = candidate
                }
            }
            return bestCandidate
        }

        fun addStrengthOnDay(day: Int): Boolean {
            if (remainingStrength <= 0 || strengthDays.contains(day)) return false
            strengthDays.add(day)
            usedDays.add(day)
            workouts.add(
                WebScheduledWorkout(
                    dayOffset = day, type = "STRENGTH",
                    description = "Strength: 45min Session",
                    totalDistance = 0.0, targetPace = 0.0, targetDuration = 2700.0,
                    phase = phase, targetHrZone = workoutTypeToHrZone("STRENGTH"),
                )
            )
            remainingStrength--
            return true
        }

        val pairableRunDays = workouts
            .filter { w ->
                (w.type == "EASY" || w.type == "RECOVERY") &&
                    !protectedDays.contains(w.dayOffset) &&
                    !rideDays.contains(w.dayOffset) &&
                    !swimDays.contains(w.dayOffset)
            }
            .map { it.dayOffset }
            .distinct()
            .toMutableList()

        while (remainingStrength > 0 && pairableRunDays.isNotEmpty()) {
            val chosen = pickBestCandidate(pairableRunDays) ?: break
            val idx = pairableRunDays.indexOf(chosen)
            if (idx >= 0) pairableRunDays.removeAt(idx)
            addStrengthOnDay(chosen)
        }

        val freeDays = (0 until 7).filter { !usedDays.contains(it) }.toMutableList()

        while (remainingStrength > 0 && freeDays.isNotEmpty()) {
            val chosen = pickBestCandidate(freeDays) ?: break
            val idx = freeDays.indexOf(chosen)
            if (idx >= 0) freeDays.removeAt(idx)
            addStrengthOnDay(chosen)
        }

        val fallbackRideDays = rideDays.filter { !strengthDays.contains(it) }.toMutableList()
        while (remainingStrength > 0 && fallbackRideDays.isNotEmpty()) {
            val chosen = pickBestCandidate(fallbackRideDays) ?: break
            val idx = fallbackRideDays.indexOf(chosen)
            if (idx >= 0) fallbackRideDays.removeAt(idx)
            addStrengthOnDay(chosen)
        }

        return workouts
    }

    /** index.ts L1186-1218. */
    private fun getLongRunDistance(
        raceType: String,
        weeklyVolume: Double,
        paces: Personalization.PersonTrainingPaces,
        maxLongRunKm: Double?,
    ): Double {
        var ratio = PLAN_CONSTANTS.LONG_RUN_RATIO

        if ((raceType == "HALF_MARATHON" || raceType == "MARATHON") &&
            weeklyVolume < PLAN_CONSTANTS.LOW_VOLUME_THRESHOLD
        ) {
            ratio = PLAN_CONSTANTS.LONG_RUN_RATIO_LOW_VOLUME
        }

        var dist = weeklyVolume * ratio

        var dynamicCap = minOf(
            weeklyVolume * PLAN_CONSTANTS.DYNAMIC_LONG_RUN_RATIO,
            PLAN_CONSTANTS.MAX_LONG_RUN_DIST[raceType] ?: 34000.0,
        )
        if (maxLongRunKm != null && maxLongRunKm != 0.0) {
            val userCap = maxLongRunKm * 1000
            if (userCap < dynamicCap) dynamicCap = userCap
        }
        if (dist > dynamicCap) dist = dynamicCap

        val safeEasyMax = maxOf(120.0, paces.easy.maxSecPerKm.toDouble())
        val maxDistForTime = jr(PLAN_CONSTANTS.MAX_TIME_ON_FEET_SECONDS / safeEasyMax * 1000)
        if (dist > maxDistForTime) dist = maxDistForTime

        if (dist < PLAN_CONSTANTS.MIN_LONG_RUN) dist = PLAN_CONSTANTS.MIN_LONG_RUN

        return jr(dist / 100) * 100
    }

    /** index.ts L1220-1243. */
    internal fun getQualitySession(
        raceType: String,
        paces: Personalization.PersonTrainingPaces,
        phase: String,
        weeklyVolume: Double,
        weekInPhase: Int,
        targetRacePace: Double?,
    ): WebScheduledWorkout {
        val base = when (raceType) {
            "FIVE_K" -> get5KQualitySession(paces, phase, weekInPhase)
            "TEN_K" -> get10KQualitySession(paces, phase, weekInPhase)
            "HALF_MARATHON" -> getHalfMarathonQualitySession(paces, phase, weekInPhase, targetRacePace)
            else -> getMarathonQualitySession(paces, phase, weekInPhase, targetRacePace)
        }
        return base.copy(
            totalDistance = scaleQualitySessionDistance(base.type, base.totalDistance, weeklyVolume, raceType),
        )
    }

    /** index.ts L1245-1265. */
    fun scaleQualitySessionDistance(type: String, baseDistance: Double, weeklyVolume: Double, raceType: String): Double {
        val qualityFraction = when (type) {
            "REPETITIONS" -> 0.18
            "INTERVALS" -> 0.22
            "FARTLEK" -> 0.22
            "TEMPO" -> if (raceType == "MARATHON" || raceType == "HALF_MARATHON") 0.28 else 0.25
            else -> 0.22
        }
        val raceFloor = when (raceType) {
            "FIVE_K" -> 6000.0
            "TEN_K" -> 7000.0
            else -> 8000.0
        }
        val raceCeiling = when (raceType) {
            "MARATHON" -> 18000.0
            "HALF_MARATHON" -> 15000.0
            "TEN_K" -> 12000.0
            else -> 10000.0
        }
        val scaled = jr(weeklyVolume * qualityFraction / 500) * 500
        return maxOf(raceFloor, minOf(scaled, minOf(baseDistance, raceCeiling)))
    }

    /** index.ts L1267-1279. */
    private fun getFartlekHardPace(paces: Personalization.PersonTrainingPaces): Double =
        paces.threshold.toDouble() + 5

    private fun getFartlekDescription(
        distanceKm: Int,
        hardMinutes: Int,
        easyMinutes: Int,
        hardPace: Double,
        easyPace: Double,
    ): String =
        "Fartlek: ${distanceKm}km (${hardMinutes}min @ F (T-I) ${formatPace(hardPace)} / ${easyMinutes}min @ E ${formatPace(easyPace)})"

    /** index.ts L1281-1322. */
    private fun get5KQualitySession(
        paces: Personalization.PersonTrainingPaces,
        phase: String,
        weekInPhase: Int,
    ): WebScheduledWorkout {
        if (phase == "BASE") {
            val hardPace = getFartlekHardPace(paces)
            val easyPace = paces.easy.maxSecPerKm.toDouble()
            return if (weekInPhase <= 3) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(8, 2, 2, hardPace, easyPace), 8000.0, hardPace,
                )
            } else if (weekInPhase <= 6) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(8, 3, 2, hardPace, easyPace), 8000.0, hardPace,
                )
            } else {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(10, 4, 3, hardPace, easyPace), 10000.0, hardPace,
                )
            }
        }
        if (phase == "PEAK") {
            return WebScheduledWorkout(
                0, "REPETITIONS",
                "Reps: 6x400m @ ${formatPace(paces.repetition.toDouble())}", 7000.0, paces.repetition.toDouble(),
            )
        }
        return WebScheduledWorkout(
            0, "INTERVALS",
            "Intervals: 5x1km @ ${formatPace(paces.interval.toDouble())}", 10000.0, paces.interval.toDouble(),
        )
    }

    /** index.ts L1324-1365. */
    private fun get10KQualitySession(
        paces: Personalization.PersonTrainingPaces,
        phase: String,
        weekInPhase: Int,
    ): WebScheduledWorkout {
        if (phase == "BASE") {
            val hardPace = getFartlekHardPace(paces)
            val easyPace = paces.easy.maxSecPerKm.toDouble()
            return if (weekInPhase <= 3) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(8, 2, 2, hardPace, easyPace), 8000.0, hardPace,
                )
            } else if (weekInPhase <= 6) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(10, 3, 2, hardPace, easyPace), 10000.0, hardPace,
                )
            } else {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(10, 4, 3, hardPace, easyPace), 10000.0, hardPace,
                )
            }
        }
        if (phase == "PEAK") {
            return WebScheduledWorkout(
                0, "TEMPO",
                "Threshold: 4x2km @ ${formatPace(paces.threshold.toDouble())}", 12000.0, paces.threshold.toDouble(),
            )
        }
        return WebScheduledWorkout(
            0, "INTERVALS",
            "Intervals: 6x1km @ ${formatPace(paces.interval.toDouble())}", 11000.0, paces.interval.toDouble(),
        )
    }

    /** index.ts L1367-1425. */
    private fun getHalfMarathonQualitySession(
        paces: Personalization.PersonTrainingPaces,
        phase: String,
        weekInPhase: Int,
        targetRacePace: Double?,
    ): WebScheduledWorkout {
        if (phase == "BASE") {
            val hardPace = getFartlekHardPace(paces)
            val easyPace = paces.easy.maxSecPerKm.toDouble()
            return if (weekInPhase <= 3) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(8, 3, 2, hardPace, easyPace), 8000.0, hardPace,
                )
            } else if (weekInPhase <= 6) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(10, 4, 3, hardPace, easyPace), 10000.0, hardPace,
                )
            } else {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(12, 5, 3, hardPace, easyPace), 12000.0, hardPace,
                )
            }
        }
        if (phase == "PEAK") {
            val hmRacePace = targetRacePace ?: jr((paces.marathon + paces.threshold) / 2.0)
            return WebScheduledWorkout(
                0, "TEMPO",
                "HM Pace Segments: 3x3km @ ${formatPace(hmRacePace)}", 13000.0, hmRacePace,
            )
        }
        return if (weekInPhase <= 3) {
            WebScheduledWorkout(
                0, "INTERVALS",
                "Intervals: 5x800m @ ${formatPace(paces.interval.toDouble())}", 10000.0, paces.interval.toDouble(),
            )
        } else if (weekInPhase <= 6) {
            WebScheduledWorkout(
                0, "INTERVALS",
                "Intervals: 6x800m @ ${formatPace(paces.interval.toDouble())}", 11000.0, paces.interval.toDouble(),
            )
        } else {
            WebScheduledWorkout(
                0, "INTERVALS",
                "Intervals: 5x1km @ ${formatPace(paces.interval.toDouble())}", 12000.0, paces.interval.toDouble(),
            )
        }
    }

    /** index.ts L1427-1469. */
    private fun getMarathonQualitySession(
        paces: Personalization.PersonTrainingPaces,
        phase: String,
        weekInPhase: Int,
        targetRacePace: Double?,
    ): WebScheduledWorkout {
        if (phase == "BASE") {
            val hardPace = getFartlekHardPace(paces)
            val easyPace = paces.easy.maxSecPerKm.toDouble()
            return if (weekInPhase <= 3) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(10, 3, 2, hardPace, easyPace), 10000.0, hardPace,
                )
            } else if (weekInPhase <= 6) {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(12, 4, 3, hardPace, easyPace), 12000.0, hardPace,
                )
            } else {
                WebScheduledWorkout(
                    0, "FARTLEK",
                    getFartlekDescription(12, 5, 3, hardPace, easyPace), 12000.0, hardPace,
                )
            }
        }
        if (phase == "PEAK") {
            val marathonPace = targetRacePace ?: paces.marathon.toDouble()
            return WebScheduledWorkout(
                0, "TEMPO",
                "MP Segments: 3x5km @ ${formatPace(marathonPace)}", 18000.0, marathonPace,
            )
        }
        return WebScheduledWorkout(
            0, "INTERVALS",
            "Intervals: 5x1km @ ${formatPace(paces.interval.toDouble())}", 13000.0, paces.interval.toDouble(),
        )
    }

    /** index.ts L1471-1494. */
    private fun getAvailableCrossTrainingDays(count: Int, usedDays: Set<Int>, protectedDays: Set<Int>): List<Int> {
        if (count <= 0) return emptyList()

        val available = ArrayList<Int>()
        for (d in 0 until 7) {
            if (!usedDays.contains(d) && !protectedDays.contains(d)) available.add(d)
        }

        val toTake = minOf(count, available.size)
        val idealInterval = available.size.toDouble() / toTake
        val selected = ArrayList<Int>()
        val pickedIndices = ArrayList<Int>()

        for (i in 0 until toTake) {
            val targetIndex = floor(i * idealInterval).toInt()
            val idx = minOf(targetIndex, available.size - 1)
            if (!pickedIndices.contains(idx)) {
                pickedIndices.add(idx)
                selected.add(available[idx])
            }
        }

        return selected
    }

    /** index.ts L1496-1549. */
    private fun getDistributedDays(
        count: Int,
        usedDays: Set<Int>,
        allowDoubleDays: Boolean = false,
        existingWorkouts: List<WebScheduledWorkout> = emptyList(),
    ): List<Int> {
        if (count <= 0) return emptyList()

        var availableDays = (0 until 7).filter { !usedDays.contains(it) }.toMutableList()

        val selectedDays = ArrayList<Int>()
        var remaining = count

        while (remaining > 0) {
            if (availableDays.isEmpty()) {
                if (!allowDoubleDays) break

                // Fallback: Pick days with the least number of scheduled workouts
                val dayCounts = IntArray(7)
                for (w in existingWorkouts) {
                    if (w.dayOffset in 0 until 7) {
                        dayCounts[w.dayOffset]++
                    }
                }

                val minCount = dayCounts.min()
                availableDays = ArrayList()
                for (d in 0 until 7) {
                    if (dayCounts[d] == minCount) availableDays.add(d)
                }

                if (availableDays.isEmpty()) availableDays = mutableListOf(0, 1, 2, 3, 4, 5, 6)
            }

            val toTake = minOf(remaining, availableDays.size)
            val idealInterval = availableDays.size.toDouble() / toTake

            // Collect indices to pick, then remove them in reverse order to not shift indices
            val indicesToPick = ArrayList<Int>()
            for (i in 0 until toTake) {
                val targetIndex = floor(i * idealInterval).toInt()
                indicesToPick.add(minOf(targetIndex, availableDays.size - 1))
            }

            for (idx in indicesToPick) {
                selectedDays.add(availableDays[idx])
            }

            availableDays = availableDays
                .withIndex()
                .filter { (idx, _) -> !indicesToPick.contains(idx) }
                .map { it.value }
                .toMutableList()

            remaining -= toTake
        }

        return selectedDays
    }

    /** index.ts L1551-1599. */
    private fun scaleToVolumeCap(weekSchedule: List<WebScheduledWorkout>, weekVolumeCap: Double): List<WebScheduledWorkout> {
        fun roundDownTo100(meters: Double): Double {
            if (meters <= 0) return 0.0
            return floor(meters / 100) * 100
        }

        fun isPriority(w: WebScheduledWorkout): Boolean =
            w.type == "LONG_RUN" ||
                w.type == "INTERVALS" ||
                w.type == "TEMPO" ||
                w.type == "RACE" ||
                w.type == "FARTLEK" ||
                w.type == "REPETITIONS" ||
                w.description.contains("Fartlek") ||
                w.description.contains("MP Segment") ||
                w.description.contains("HM Pace Segment")

        val runningWorkouts = weekSchedule.filter { isRun(it.type) }
        val priorityWorkouts = runningWorkouts.filter { isPriority(it) }
        val fillWorkouts = runningWorkouts.filter { !isPriority(it) }

        val priorityDist = priorityWorkouts.sumOf { it.totalDistance }
        val fillDist = fillWorkouts.sumOf { it.totalDistance }

        var remainingCap = weekVolumeCap - priorityDist

        if (remainingCap < 0) {
            val scalingFactor = weekVolumeCap / priorityDist
            return weekSchedule.map { w ->
                if (!isRun(w.type)) return@map w
                if (!isPriority(w)) {
                    return@map w.copy(totalDistance = 0.0, targetDuration = 0.0, description = "Rest (Volume Cap)")
                }
                val newDist = roundDownTo100(w.totalDistance * scalingFactor)
                val finalDist = maxOf(newDist, 0.0)
                withScaledDistance(w, finalDist, preserveSpecialDescription(w, finalDist))
            }
        }

        val fillScalingFactor = if (fillDist > 0) remainingCap / fillDist else 0.0
        return weekSchedule.map { w ->
            if (!isRun(w.type) || isPriority(w)) return@map w
            val newDist = roundDownTo100(w.totalDistance * fillScalingFactor)
            if (newDist > 0 && newDist < PLAN_CONSTANTS.EASY_RUN_MIN) {
                return@map w.copy(totalDistance = 0.0, targetDuration = 0.0, description = "Rest (Volume Cap)")
            }
            withScaledDistance(w, newDist, preserveSpecialDescription(w, newDist))
        }
    }

    /** index.ts L1601-1618. */
    private fun withScaledDistance(
        w: WebScheduledWorkout,
        distance: Double,
        description: String,
    ): WebScheduledWorkout {
        val previousDistance = w.totalDistance
        var targetDuration = w.targetDuration ?: 0.0
        if (distance <= 0) {
            targetDuration = 0.0
        } else if (targetDuration > 0 && previousDistance > 0) {
            targetDuration = jr(targetDuration * (distance / previousDistance))
        } else if (w.targetPace != null && w.targetPace > 0) {
            targetDuration = computeDuration(distance, w.targetPace!!)
        }

        return w.copy(
            totalDistance = distance,
            targetDuration = targetDuration,
            description = description,
        )
    }

    /** index.ts L1620-1659. */
    private fun preserveSpecialDescription(w: WebScheduledWorkout, distance: Double): String {
        val distanceKm = toFixed1(distance / 1000)

        if (w.description.contains("progressive")) {
            val match = Regex("^(Long Run):\\s*[\\d.]+km(\\s*\\(last \\d+km progressive\\))").find(w.description)
            if (match != null) {
                return "${match.groupValues[1]}: ${toFixed1(distance / 1000)}km${match.groupValues[2]}"
            }
        }

        if (w.description.contains("Fartlek")) {
            val match = Regex("^Fartlek:\\s*[0-9.]+km(.*)$").find(w.description)
            val suffix = match?.groupValues?.get(1) ?: ""
            return "Fartlek: ${distanceKm}km$suffix"
        }

        if (w.description.contains("Strides")) {
            val match = Regex("^(Easy Run|Recovery Run):\\s*[0-9.]+km(.*Strides.*)$").find(w.description)
            if (match != null) {
                return "${match.groupValues[1]}: ${distanceKm}km${match.groupValues[2]}"
            }
            return updateDescription(w.type, distance, w.targetPace ?: 0.0)
        }

        if (w.type == "INTERVALS" || w.type == "REPETITIONS") {
            return w.description
        }

        if (w.type == "TEMPO" && (
                w.description.contains("Threshold:") ||
                    w.description.contains("MP Segments") ||
                    w.description.contains("HM Pace Segments")
                )
        ) {
            return w.description
        }

        if (w.description.contains("MP")) {
            return w.description
        }
        if (w.description.contains("Goal Pace")) {
            return w.description
        }
        return updateDescription(w.type, distance, w.targetPace ?: 0.0)
    }

    /** index.ts L1661-1689. */
    internal fun getRaceDistanceKm(raceType: String, customDistanceM: Double?): String = when (raceType) {
        "FIVE_K" -> "5"
        "TEN_K" -> "10"
        "HALF_MARATHON" -> "21.1"
        "MARATHON" -> "42.2"
        "FIFTY_K" -> "50"
        "FIFTY_MILE" -> "80.5"
        "HUNDRED_K" -> "100"
        "HUNDRED_MILE" -> "161"
        "CUSTOM_DISTANCE" -> if (customDistanceM != null && customDistanceM > 0) toFixed1(customDistanceM / 1000) else "0"
        else -> "0"
    }

    internal fun getRaceDistanceMeters(raceType: String, customDistanceM: Double?): Double = when (raceType) {
        "FIVE_K" -> 5000.0
        "TEN_K" -> 10000.0
        "HALF_MARATHON" -> 21097.0
        "MARATHON" -> 42195.0
        "FIFTY_K" -> 50000.0
        "FIFTY_MILE" -> 80467.0
        "HUNDRED_K" -> 100000.0
        "HUNDRED_MILE" -> 160934.0
        "CUSTOM_DISTANCE" -> if (customDistanceM != null && customDistanceM > 0) customDistanceM else 0.0
        else -> 0.0
    }

    /** index.ts L1691-1696. */
    private fun getTargetRacePaceSeconds(raceType: String, targetTime: Double?, customDistanceM: Double?): Double? {
        if (targetTime == null || targetTime <= 0) return null
        val distanceMeters = getRaceDistanceMeters(raceType, customDistanceM)
        if (distanceMeters <= 0) return null
        return jr(targetTime / distanceMeters * 1000)
    }

    /** index.ts L1698-1702. */
    internal fun formatPace(secondsPerKm: Double): String {
        val mins = floor(secondsPerKm / 60).toInt()
        val secs = jr(secondsPerKm % 60).toInt()
        return "$mins:${secs.toString().padStart(2, '0')}"
    }

    // -------------------------------------------------------------------
    // Wizard / repository integration
    // -------------------------------------------------------------------

    /**
     * Maps the wizard's [PlanSpec] to a [WebPlanConfig]: the same conversion
     * the web request body performs (km -> m, DayOfWeek -> JS day numbers,
     * NONE -> null raceType for the no-race generator).
     */
    fun configFromSpec(spec: PlanSpec): WebPlanConfig {
        val isTriathlon = spec.raceType.tri
        return WebPlanConfig(
            vdot = spec.vdot ?: 40.0,
            targetTime = spec.targetTimeSec?.toDouble(),
            raceType = if (spec.raceType == RaceType.NONE) null else spec.raceType.name,
            raceDate = spec.raceDate,
            startDate = spec.startDate,
            sport = if (isTriathlon) "TRIATHLON" else null,
            runsPerWeek = spec.runsPerWeek,
            strengthPerWeek = spec.strengthPerWeek,
            weeklyMileageGoal = spec.weeklyKm * 1000,
            taperWeeks = spec.taperWeeks,
            maxLongRunKm = spec.longRunKm,
            longRunDay = spec.longRunDay.toJsDay(),
            workoutDay = spec.workoutDay.toJsDay(),
            restDays = spec.restDays.map { it.toJsDay() }.sorted(),
            weeksTotal = if (spec.raceType == RaceType.NONE) PlanGenerator.planWeeks(spec) else null,
            customDistanceM = spec.customDistanceKm?.times(1000),
        )
    }

    /**
     * Web workout type -> the domain [WorkoutType] stored in WorkoutEntity
     * (multi-sport types collapse to their closest single-sport domain value,
     * mirroring the server's own display mapping).
     */
    fun toDomainWorkoutType(webType: String): WorkoutType = when (webType) {
        "EASY" -> WorkoutType.EASY
        "LONG_RUN" -> WorkoutType.LONG_RUN
        "TEMPO" -> WorkoutType.TEMPO
        "INTERVALS" -> WorkoutType.INTERVALS
        "FARTLEK" -> WorkoutType.FARTLEK
        "REPETITIONS" -> WorkoutType.REPETITIONS
        "RECOVERY" -> WorkoutType.RECOVERY
        "RACE" -> WorkoutType.RACE
        "REST" -> WorkoutType.REST
        "RIDE", "LONG_RIDE" -> WorkoutType.RIDE
        "SWIM", "SWIM_DRILL", "OPEN_WATER_SWIM" -> WorkoutType.SWIM
        "STRENGTH" -> WorkoutType.STRENGTH
        "BRICK", "TRANSITION_PRACTICE", "CROSS_TRAIN", "DOUBLE_DAY", "RIDE_INTERVALS" ->
            WorkoutType.CROSS_TRAIN
        else -> WorkoutType.OTHER
    }

    /**
     * Web phase -> the domain [PlanPhase] stored in WorkoutEntity. Ultra
     * ENDURANCE folds into BUILD, tri/no-race extras into their closest phase.
     */
    fun toDomainPhase(webPhase: String?): PlanPhase = when (webPhase) {
        "BASE" -> PlanPhase.BASE
        "BUILD" -> PlanPhase.BUILD
        "PEAK" -> PlanPhase.PEAK
        "TAPER" -> PlanPhase.TAPER
        "RACE_WEEK" -> PlanPhase.RACE_WEEK
        "RECOVERY" -> PlanPhase.RECOVERY
        "ENDURANCE", "TUNE_UP" -> PlanPhase.BUILD
        "MENTAL_PREP" -> PlanPhase.PEAK
        "MAINTAIN" -> PlanPhase.BASE
        else -> PlanPhase.BASE
    }

    /** JS `x.toFixed(1)` — exact-binary round-half-up to one decimal. */
    internal fun toFixed1(x: Double): String =
        BigDecimal(x).setScale(1, RoundingMode.HALF_UP).toPlainString()

    /** index.ts L1704-1706. */
    internal fun isRun(type: String): Boolean =
        type == "EASY" || type == "LONG_RUN" || type == "TEMPO" || type == "INTERVALS" ||
            type == "FARTLEK" || type == "RECOVERY" || type == "RACE" || type == "REPETITIONS"

    /** index.ts L1708-1711. */
    fun computeDuration(distanceMeters: Double, paceSecondsPerKm: Double): Double {
        if (distanceMeters <= 0 || paceSecondsPerKm <= 0) return 0.0
        return jr(distanceMeters / 1000 * paceSecondsPerKm)
    }

    /** index.ts L1713-1716. */
    fun computeSwimDuration(distanceMeters: Double, paceSecondsPer100m: Double): Double {
        if (distanceMeters <= 0 || paceSecondsPer100m <= 0) return 0.0
        return jr(distanceMeters / 100 * paceSecondsPer100m)
    }

    /** index.ts L1718-1728. */
    fun computeQualityDuration(
        totalDistance: Double,
        qualityPace: Double,
        easyPace: Double,
        qualityFraction: Double = 0.5,
    ): Double {
        if (totalDistance <= 0) return 0.0
        val qualityDist = totalDistance * qualityFraction
        val easyDist = totalDistance - qualityDist
        return jr(qualityDist / 1000 * qualityPace + easyDist / 1000 * easyPace)
    }

    /** index.ts L1730-1742. */
    fun workoutTypeToHrZone(type: String): Int? = when (type) {
        "RECOVERY" -> 1
        "EASY" -> 2
        "LONG_RUN" -> 2
        "TEMPO" -> 3
        "FARTLEK" -> 4
        "INTERVALS" -> 4
        "REPETITIONS" -> 5
        "RACE" -> 5
        else -> null
    }

    /** index.ts L1744-1747. */
    private fun getRunQualityHrZone(type: String, description: String): Int? {
        if (type == "TEMPO" && description.contains("Threshold")) return 4
        return workoutTypeToHrZone(type)
    }

    /** index.ts L1749-1757. */
    fun getQualityFraction(type: String): Double = when (type) {
        "INTERVALS" -> 0.5
        "REPETITIONS" -> 0.35
        "TEMPO" -> 0.65
        "FARTLEK" -> 0.45
        else -> 0.5
    }

    /** index.ts L2050-2065. */
    private fun updateDescription(type: String, distance: Double, pace: Double): String {
        val distKm = toFixed1(distance / 1000)
        val paceStr = if (pace > 0) " @ ${formatPace(pace)}" else ""

        return when (type) {
            "LONG_RUN" -> "Long Run: ${distKm}km @ Easy"
            "EASY" -> "Easy Run: ${distKm}km"
            "RECOVERY" -> "Recovery Run: ${distKm}km"
            "TEMPO" -> "Tempo: ${distKm}km$paceStr"
            "INTERVALS" -> "Intervals: Total ${distKm}km Session"
            "FARTLEK" -> "Fartlek: ${distKm}km$paceStr"
            "REPETITIONS" -> "Reps: Total ${distKm}km Session"
            "RACE" -> "Race Day: ${distKm}km"
            else -> "$type: ${distKm}km"
        }
    }
}

// =======================================================================
// Shared types + JS-fidelity helpers
// =======================================================================

/** JS `Math.round` — floor(x+0.5): ties round toward +infinity. */
internal fun jr(x: Double): Double = floor(x + 0.5)

/** JS day-of-week convention: 0 = Sunday … 6 = Saturday. */
internal fun jsDay(date: LocalDate): Int = date.dayOfWeek.value % 7

internal fun DayOfWeek.toJsDay(): Int = value % 7

/** TS `x || default` for numbers: null/0/undefined fall back. */
internal fun Double?.orWebDefault(default: Double): Double =
    if (this == null || this == 0.0) default else this

/**
 * Input config for [WebPlanEngine.generateTrainingPlan] — mirror of the web
 * `PlanConfig` (index.ts L241-278), only the fields the generator reads.
 * [raceType] is the web `RaceType` enum value, or null for no-race plans.
 */
data class WebPlanConfig(
    val vdot: Double,
    val targetVdot: Double? = null,
    val targetTime: Double? = null,
    val raceType: String? = null,
    val raceDate: LocalDate,
    val startDate: LocalDate? = null,
    val sport: String? = null,
    val runsPerWeek: Int? = null,
    val ridesPerWeek: Int? = null,
    val strengthPerWeek: Int? = null,
    val swimsPerWeek: Int? = null,
    val weeklyMileageGoal: Double? = null,
    val startWeeklyMileage: Double? = null,
    val taperWeeks: Int? = null,
    val peakWeeks: Int? = null,
    val buildWeeks: Int? = null,
    val maxLongRunKm: Double? = null,
    /** JS day number, 0 = Sunday. */
    val longRunDay: Int? = null,
    val workoutDay: Int? = null,
    val swimDay: Int? = null,
    /** JS day numbers, 0 = Sunday. */
    val restDays: List<Int>? = null,
    val weeksTotal: Int? = null,
    val thresholdHeartRate: Int? = null,
    val hrZoneMethod: String? = null,
    val hrZone1Max: Int? = null,
    val hrZone2Max: Int? = null,
    val hrZone3Max: Int? = null,
    val hrZone4Max: Int? = null,
    val hrZone5Max: Int? = null,
    val hrZone6Max: Int? = null,
    val hrMax: Int? = null,
    val hrRest: Int? = null,
    val customDistanceM: Double? = null,
    val customSwimDistM: Double? = null,
    val customBikeDistM: Double? = null,
    val customRunDistM: Double? = null,
)

/** Mirror of the web `StructuredWorkoutStep` (index.ts L307-314). */
data class WebStructuredStep(
    val type: String,
    val name: String,
    val distanceMeters: Double? = null,
    val durationSeconds: Double? = null,
    val paceSecondsPerKm: Double? = null,
    val hrZone: Int? = null,
)

/** Mirror of the web `StructuredWorkoutPlan` (index.ts L301-305). */
data class WebStructuredPlan(
    val version: Int = 1,
    val source: String = "generated-plan",
    val steps: List<WebStructuredStep> = emptyList(),
)

/**
 * Mirror of the web `GeneratedWorkout` (index.ts L280-299) plus the enriched
 * target fields the pipeline adds. [type]/[phase] carry the web enum VALUES
 * ("LONG_RUN", "RACE_WEEK", …) so they round-trip with the server exactly.
 */
data class WebGeneratedWorkout(
    val date: LocalDate,
    val type: String,
    val description: String,
    /** Meters. */
    val totalDistance: Double,
    /** sec/km. */
    val targetPace: Double? = null,
    /** Seconds. */
    val targetDuration: Double? = null,
    val phase: String? = null,
    val targetHrZone: Int? = null,
    val displayDescription: String? = null,
    val sport: String? = null,
    val intensityZone: String? = null,
    val structuredSteps: WebStructuredPlan? = null,
    val targetHrZoneLabel: String? = null,
    val targetHrMinBpm: Double? = null,
    val targetHrMaxBpm: Double? = null,
    val targetPaceZoneLabel: String? = null,
    val targetPaceMinSecondsPerKm: Double? = null,
    val targetPaceMaxSecondsPerKm: Double? = null,
)

/** index.ts L342: `Omit<GeneratedWorkout, 'date'> & { dayOffset }`. */
internal data class WebScheduledWorkout(
    val dayOffset: Int,
    val type: String,
    val description: String,
    val totalDistance: Double,
    val targetPace: Double? = null,
    val targetDuration: Double? = null,
    val phase: String? = null,
    val targetHrZone: Int? = null,
)
