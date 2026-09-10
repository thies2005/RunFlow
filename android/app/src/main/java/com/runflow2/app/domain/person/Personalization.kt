package com.runflow2.app.domain.person

import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.domain.model.RaceType
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.math.roundToInt

/**
 * Pure personalization engine: person-specific defaults for paces, HR zones,
 * plan volumes and the structured-workout editor prefill.
 *
 * Every number is a faithful port of the web sources so Android and Web build
 * identical plans for the same athlete:
 *  - Training paces: Web/src/lib/metrics/vdot.ts `calculateTrainingPaces` (L137-164)
 *  - HR zones:       Web/src/lib/metrics/hr-zones.ts (custom / LTHR / Karvonen)
 *  - Plan defaults:  Web/src/lib/plans/defaults.ts + PlanSetupForm.tsx
 *                    `getDefaultMaxLongRunKm` (L81-85)
 *
 * Reuses [VdotMath.speedForVo2Fraction], which is byte-identical to the web's
 * `velocityAtPercentVO2max` (vdot.ts L109-123). The existing
 * core/math `TrainingPaces` is NOT reused for paces because it uses different
 * VO2max bands (e.g. T mid 87%, I mid 97.5%) and unrounded doubles; this file
 * pins the exact web fractions (E 65-79%, M 78%, T 88%, I 100%, R 105%) and
 * the web's integer rounding.
 */
object Personalization {

    // -------------------------------------------------------------------
    // Training paces — vdot.ts L137-164
    // -------------------------------------------------------------------

    /** Pace band in sec/km; lower = faster. Port of vdot.ts `PaceRange` (L32-35). */
    data class PaceRangeSecPerKm(val minSecPerKm: Int, val maxSecPerKm: Int)

    /** Port of vdot.ts `TrainingPaces` (L24-30): E range + M/T/I/R points, sec/km. */
    data class PersonTrainingPaces(
        val easy: PaceRangeSecPerKm,
        val marathon: Int,
        val threshold: Int,
        val interval: Int,
        val repetition: Int,
    ) {
        /**
         * Single target pace (sec/km) a UI dropdown should show for a letter, as
         * the web builder does (WorkoutDetailPanel.tsx L88-94): E is the rounded
         * midpoint of the easy range, M/T/I/R are the point paces.
         */
        fun target(letter: PaceLetter): Int = when (letter) {
            PaceLetter.E -> ((easy.minSecPerKm + easy.maxSecPerKm) / 2.0).roundToInt()
            PaceLetter.M -> marathon
            PaceLetter.T -> threshold
            PaceLetter.I -> interval
            PaceLetter.R -> repetition
        }
    }

    /** Pace letters used by the builder's structured editor (E/M/T/I/R). */
    enum class PaceLetter { E, M, T, I, R }

    /**
     * Training paces for a VDOT (vdot.ts L137-164):
     *  - easy range from 65-79% VO2max — min is the FASTER end (79%),
     *    max the slower end (65%) because lower sec/km = faster (L155-158);
     *  - marathon 78% (L143), threshold 88% (L146), interval 100% (L149),
     *    repetition 105% (L152);
     *  - each pace is rounded like `velocityToPace` (L128-132).
     */
    fun trainingPaces(vdot: Double): PersonTrainingPaces = PersonTrainingPaces(
        easy = PaceRangeSecPerKm(
            minSecPerKm = roundedPaceAtFraction(vdot, 0.79),
            maxSecPerKm = roundedPaceAtFraction(vdot, 0.65),
        ),
        marathon = roundedPaceAtFraction(vdot, 0.78),
        threshold = roundedPaceAtFraction(vdot, 0.88),
        interval = roundedPaceAtFraction(vdot, 1.00),
        repetition = roundedPaceAtFraction(vdot, 1.05),
    )

    /** vdot.ts `velocityToPace` (L128-132): velocity m/min → rounded sec/km. */
    private fun roundedPaceAtFraction(vdot: Double, fraction: Double): Int {
        val velocity = VdotMath.speedForVo2Fraction(vdot, fraction)
        if (velocity <= 0.0) return 0
        return (1000.0 / velocity * 60.0).roundToInt()
    }

    // -------------------------------------------------------------------
    // HR zones — hr-zones.ts
    // -------------------------------------------------------------------

    /** hr-zones.ts L1: 'CUSTOM' | 'LTHR' | 'KARVONEN' | 'UNKNOWN' (+ AUTO = web resolve order). */
    enum class HrZoneMethod { AUTO, CUSTOM, LTHR, KARVONEN, UNKNOWN }

    /** hr-zones.ts L3-8. `maxBpm == null` means open-ended (zone 7 in CUSTOM/LTHR). */
    data class HrZone(val zone: Int, val label: String, val minBpm: Int?, val maxBpm: Int?)

    data class HrZoneResult(val method: HrZoneMethod, val zones: List<HrZone>?)

    /** hr-zones.ts L10-20 (nulls instead of undefined). */
    data class HrZoneInput(
        val hrZone1Max: Int? = null,
        val hrZone2Max: Int? = null,
        val hrZone3Max: Int? = null,
        val hrZone4Max: Int? = null,
        val hrZone5Max: Int? = null,
        val hrZone6Max: Int? = null,
        val thresholdHeartRate: Int? = null,
        val hrMax: Int? = null,
        val hrRest: Int? = null,
    )

    /** hr-zones.ts L22-30. */
    val HR_ZONE_LABELS: Map<Int, String> = mapOf(
        1 to "Z1 Recovery",
        2 to "Z2 Aerobic",
        3 to "Z3 Tempo",
        4 to "Z4 Threshold",
        5 to "Z5 VO2max",
        6 to "Z6 Anaerobic",
        7 to "Z7 Neuromuscular",
    )

    /**
     * hr-zones.ts `resolveHrZones` (L155-166): CUSTOM wins, then LTHR, then
     * Karvonen; null zones → UNKNOWN.
     */
    fun resolveHrZones(input: HrZoneInput): HrZoneResult {
        buildCustomZones(input)?.let { return HrZoneResult(HrZoneMethod.CUSTOM, it) }
        buildLthrZones(input.thresholdHeartRate)?.let { return HrZoneResult(HrZoneMethod.LTHR, it) }
        buildKarvonenZones(input.hrMax, input.hrRest)?.let { return HrZoneResult(HrZoneMethod.KARVONEN, it) }
        return HrZoneResult(HrZoneMethod.UNKNOWN, null)
    }

    /**
     * Convenience overload for callers that already know which model they want.
     * [HrZoneMethod.AUTO] mirrors [resolveHrZones]; an explicit method forces
     * that model and yields UNKNOWN zones when its inputs are missing.
     *
     * [customBoundaries] are the six CUSTOM zone maxes (Z1..Z6); values <= 100
     * are treated as percentages of [hrMax] (legacy heuristic, hr-zones.ts L49-71).
     */
    fun hrZones(
        hrMax: Int? = null,
        hrRest: Int? = null,
        lthr: Int? = null,
        customBoundaries: List<Int>? = null,
        method: HrZoneMethod = HrZoneMethod.AUTO,
    ): HrZoneResult {
        val input = customBoundaries
            ?.let {
                Personalization.HrZoneInput(
                    hrZone1Max = it.getOrNull(0),
                    hrZone2Max = it.getOrNull(1),
                    hrZone3Max = it.getOrNull(2),
                    hrZone4Max = it.getOrNull(3),
                    hrZone5Max = it.getOrNull(4),
                    hrZone6Max = it.getOrNull(5),
                    thresholdHeartRate = lthr,
                    hrMax = hrMax,
                    hrRest = hrRest,
                )
            }
            ?: HrZoneInput(thresholdHeartRate = lthr, hrMax = hrMax, hrRest = hrRest)
        return when (method) {
            HrZoneMethod.AUTO -> resolveHrZones(input)
            HrZoneMethod.CUSTOM -> buildCustomZones(input)
                ?.let { HrZoneResult(HrZoneMethod.CUSTOM, it) }
                ?: HrZoneResult(HrZoneMethod.UNKNOWN, null)
            HrZoneMethod.LTHR -> buildLthrZones(lthr)
                ?.let { HrZoneResult(HrZoneMethod.LTHR, it) }
                ?: HrZoneResult(HrZoneMethod.UNKNOWN, null)
            HrZoneMethod.KARVONEN -> buildKarvonenZones(hrMax, hrRest)
                ?.let { HrZoneResult(HrZoneMethod.KARVONEN, it) }
                ?: HrZoneResult(HrZoneMethod.UNKNOWN, null)
            HrZoneMethod.UNKNOWN -> HrZoneResult(HrZoneMethod.UNKNOWN, null)
        }
    }

    /**
     * hr-zones.ts `normalizeZoneValue` (L49-71): round, drop <= 0, and treat a
     * value <= 100 as a percentage of hrMax when hrMax >= 100 (legacy inputs).
     */
    private fun normalizeZoneValue(value: Int?, hrMax: Int?): Int? {
        if (value == null) return null
        val rounded = value.toDouble().roundToInt()
        if (rounded <= 0) return null
        val interpretAsPercent = rounded <= 100 && hrMax != null && hrMax >= 100
        if (interpretAsPercent) {
            return (hrMax.toDouble() * (rounded / 100.0)).roundToInt()
        }
        return rounded
    }

    /** hr-zones.ts L73-78. */
    private fun isStrictlyIncreasing(values: List<Int>): Boolean {
        for (i in 1 until values.size) {
            if (values[i] <= values[i - 1]) return false
        }
        return true
    }

    /** hr-zones.ts `buildCustomZones` (L80-102). */
    fun buildCustomZones(input: HrZoneInput): List<HrZone>? {
        val hrMax = input.hrMax
        val maxes = listOf(
            normalizeZoneValue(input.hrZone1Max, hrMax),
            normalizeZoneValue(input.hrZone2Max, hrMax),
            normalizeZoneValue(input.hrZone3Max, hrMax),
            normalizeZoneValue(input.hrZone4Max, hrMax),
            normalizeZoneValue(input.hrZone5Max, hrMax),
            normalizeZoneValue(input.hrZone6Max, hrMax),
        )
        if (maxes.any { it == null }) return null
        val z = maxes.map { it!! }
        if (!isStrictlyIncreasing(z)) return null
        return listOf(
            HrZone(1, HR_ZONE_LABELS.getValue(1), 0, z[0]),
            HrZone(2, HR_ZONE_LABELS.getValue(2), z[0] + 1, z[1]),
            HrZone(3, HR_ZONE_LABELS.getValue(3), z[1] + 1, z[2]),
            HrZone(4, HR_ZONE_LABELS.getValue(4), z[2] + 1, z[3]),
            HrZone(5, HR_ZONE_LABELS.getValue(5), z[3] + 1, z[4]),
            HrZone(6, HR_ZONE_LABELS.getValue(6), z[4] + 1, z[5]),
            HrZone(7, HR_ZONE_LABELS.getValue(7), z[5] + 1, null),
        )
    }

    /** hr-zones.ts `buildLthrZones` (L104-123): 7-zone LTHR model, Z1=75% … Z6=110%, Z7 above. */
    fun buildLthrZones(thresholdHeartRate: Int?): List<HrZone>? {
        if (thresholdHeartRate == null || thresholdHeartRate <= 0) return null
        val lthr = thresholdHeartRate.toDouble().roundToInt()
        val z1 = (lthr * 0.75).roundToInt()
        val z2 = (lthr * 0.87).roundToInt()
        val z3 = (lthr * 0.94).roundToInt()
        val z4 = lthr
        val z5 = (lthr * 1.05).roundToInt()
        val z6 = (lthr * 1.10).roundToInt()
        return listOf(
            HrZone(1, HR_ZONE_LABELS.getValue(1), 0, z1),
            HrZone(2, HR_ZONE_LABELS.getValue(2), z1 + 1, z2),
            HrZone(3, HR_ZONE_LABELS.getValue(3), z2 + 1, z3),
            HrZone(4, HR_ZONE_LABELS.getValue(4), z3 + 1, z4),
            HrZone(5, HR_ZONE_LABELS.getValue(5), z4 + 1, z5),
            HrZone(6, HR_ZONE_LABELS.getValue(6), z5 + 1, z6),
            HrZone(7, HR_ZONE_LABELS.getValue(7), z6 + 1, null),
        )
    }

    /**
     * hr-zones.ts `buildKarvonenZones` (L125-153): 50-100% HRR; zone mins reuse
     * the previous max (no +1), and Z7's max is hrMax.
     */
    fun buildKarvonenZones(hrMax: Int?, hrRest: Int?): List<HrZone>? {
        if (hrMax == null || hrRest == null) return null
        if (hrMax <= 0 || hrRest <= 0 || hrMax <= hrRest) return null
        val hrr = (hrMax - hrRest).toDouble()
        val rest = hrRest.toDouble()
        val z1Min = (hrr * 0.5 + rest).roundToInt()
        val z1Max = (hrr * 0.6 + rest).roundToInt()
        val z2Max = (hrr * 0.7 + rest).roundToInt()
        val z3Max = (hrr * 0.8 + rest).roundToInt()
        val z4Max = (hrr * 0.9 + rest).roundToInt()
        val z5Max = (hrr * 0.95 + rest).roundToInt()
        val z6Max = (hrr * 1.0 + rest).roundToInt()
        return listOf(
            HrZone(1, HR_ZONE_LABELS.getValue(1), z1Min, z1Max),
            HrZone(2, HR_ZONE_LABELS.getValue(2), z1Max, z2Max),
            HrZone(3, HR_ZONE_LABELS.getValue(3), z2Max, z3Max),
            HrZone(4, HR_ZONE_LABELS.getValue(4), z3Max, z4Max),
            HrZone(5, HR_ZONE_LABELS.getValue(5), z4Max, z5Max),
            HrZone(6, HR_ZONE_LABELS.getValue(6), z5Max, z6Max),
            HrZone(7, HR_ZONE_LABELS.getValue(7), z6Max, hrMax),
        )
    }

    // -------------------------------------------------------------------
    // Plan defaults — defaults.ts
    // -------------------------------------------------------------------

    /** Port of defaults.ts `RaceDefaults` (L1-13). */
    data class RacePlanDefaults(
        val runsPerWeek: Int,
        val ridesPerWeek: Int,
        val swimsPerWeek: Int,
        val strengthPerWeek: Int,
        val weeklyVolumeKm: Int,
        val maxLongRunKm: Int,
        val taperWeeks: Int,
        val peakWeeks: Int,
        val buildWeeks: Int,
        val backyardLoopDistM: Int? = null,
        val targetLaps: Int? = null,
    )

    /** Port of defaults.ts `RACE_DEFAULTS` (L15-85), keyed exactly like the web. */
    val RACE_DEFAULTS: Map<String, RacePlanDefaults> = mapOf(
        "FIVE_K" to RacePlanDefaults(4, 0, 0, 1, 28, 18, 1, 2, 4),
        "TEN_K" to RacePlanDefaults(4, 0, 0, 1, 35, 22, 2, 2, 4),
        "HALF_MARATHON" to RacePlanDefaults(4, 0, 0, 1, 45, 24, 2, 2, 4),
        "MARATHON" to RacePlanDefaults(5, 0, 0, 1, 58, 32, 2, 3, 4),
        "FIFTY_K" to RacePlanDefaults(5, 0, 0, 1, 70, 35, 2, 3, 5),
        "FIFTY_MILE" to RacePlanDefaults(6, 0, 0, 1, 80, 40, 2, 3, 6),
        "HUNDRED_K" to RacePlanDefaults(6, 0, 0, 1, 90, 45, 2, 3, 6),
        "HUNDRED_MILE" to RacePlanDefaults(6, 0, 0, 1, 105, 50, 3, 4, 8),
        "TWELVE_HOUR" to RacePlanDefaults(5, 0, 0, 1, 80, 40, 2, 3, 5),
        "TWENTY_FOUR_HOUR" to RacePlanDefaults(6, 0, 0, 1, 95, 50, 3, 4, 6),
        "BACKYARD_ULTRA" to RacePlanDefaults(5, 0, 0, 1, 60, 35, 2, 3, 5, backyardLoopDistM = 6706, targetLaps = 2),
        "SPRINT_TRI" to RacePlanDefaults(3, 2, 2, 2, 25, 15, 2, 2, 4),
        "OLYMPIC_TRI" to RacePlanDefaults(3, 3, 2, 2, 30, 18, 2, 2, 4),
        "HALF_IRONMAN" to RacePlanDefaults(3, 3, 2, 2, 35, 22, 2, 3, 4),
        "FULL_IRONMAN" to RacePlanDefaults(3, 3, 2, 3, 40, 30, 3, 4, 4),
        "CUSTOM_TRI" to RacePlanDefaults(3, 3, 2, 2, 35, 22, 2, 3, 4),
        "CUSTOM_DISTANCE" to RacePlanDefaults(4, 0, 0, 1, 40, 25, 2, 2, 4),
    )

    /** defaults.ts `getRaceDefaults` (L87-89): unknown keys fall back to MARATHON. */
    fun getRaceDefaults(raceType: String): RacePlanDefaults =
        RACE_DEFAULTS[raceType] ?: RACE_DEFAULTS.getValue("MARATHON")

    /**
     * defaults.ts `adjustDefaultsForVdot` (L91-108): volume x0.85 if vdot<30,
     * x1.0 if <40, x1.10 if <50, x1.15 otherwise (rounded); runsPerWeek -1
     * clamped to 3..7 when vdot<30. vdot<=0 returns the defaults untouched.
     */
    fun adjustDefaultsForVdot(defaults: RacePlanDefaults, vdot: Double): RacePlanDefaults {
        if (vdot <= 0.0) return defaults
        val volumeFactor = when {
            vdot < 30 -> 0.85
            vdot < 40 -> 1.0
            vdot < 50 -> 1.10
            else -> 1.15
        }
        return defaults.copy(
            weeklyVolumeKm = (defaults.weeklyVolumeKm * volumeFactor).roundToInt(),
            runsPerWeek = if (vdot < 30) {
                (defaults.runsPerWeek - 1).coerceIn(3, 7)
            } else {
                defaults.runsPerWeek
            },
        )
    }

    /** defaults.ts `getScaledPhaseDefaults` return shape (L110-113). */
    data class PhaseWeeks(val taperWeeks: Int, val peakWeeks: Int, val buildWeeks: Int)

    /**
     * defaults.ts `getScaledPhaseDefaults` (L110-130): keeps the race's default
     * phases when they fit the plan budget, else scales them proportionally
     * (taper/peak min 1) and spends the remainder on build weeks.
     */
    fun getScaledPhaseDefaults(raceType: String, planWeeks: Int): PhaseWeeks {
        val defaults = getRaceDefaults(raceType)
        val taper = defaults.taperWeeks
        val peak = defaults.peakWeeks
        val build = defaults.buildWeeks
        val weeks = maxOf(1, planWeeks)
        val minBaseWeeks = when {
            weeks >= 10 -> 4
            weeks >= 8 -> 3
            weeks >= 6 -> 2
            else -> 1
        }
        val phaseBudget = maxOf(1, weeks - minBaseWeeks)
        val total = taper + peak + build
        if (total <= phaseBudget || total == 0) return PhaseWeeks(taper, peak, build)
        val proportion = phaseBudget.toDouble() / total
        val clampedTaper = maxOf(1, (taper * proportion).roundToInt())
        val clampedPeak = maxOf(1, (peak * proportion).roundToInt())
        val clampedBuild = maxOf(0, phaseBudget - clampedTaper - clampedPeak)
        return PhaseWeeks(clampedTaper, clampedPeak, clampedBuild)
    }

    /**
     * PlanSetupForm.tsx `getDefaultMaxLongRunKm` (L81-85):
     * max(6, min(round(weeklyKm x 0.55), race cap)).
     */
    fun getDefaultMaxLongRunKm(raceType: String, weeklyKm: Int): Int {
        val raceCap = getRaceDefaults(raceType).maxLongRunKm
        val calculated = (weeklyKm * 0.55).roundToInt()
        return maxOf(6, minOf(calculated, raceCap))
    }

    /** What the wizard should prefill for a person's race/vdot/plan length. */
    data class PersonPlanDefaults(
        val runsPerWeek: Int,
        val ridesPerWeek: Int,
        val swimsPerWeek: Int,
        val strengthPerWeek: Int,
        val weeklyKm: Int,
        val maxLongRunKm: Int,
        val taperWeeks: Int,
        val peakWeeks: Int,
        val buildWeeks: Int,
    )

    /**
     * Composition the web setup form uses: race defaults (defaults.ts L15-85)
     * -> vdot-adjusted volumes (L91-108) -> plan-length-scaled phases
     * (L110-130) -> maxLongRunKm from the ADJUSTED weekly volume against the
     * race cap (PlanSetupForm.tsx L81-85).
     */
    fun personPlanDefaults(raceType: String, vdot: Double, durationWeeks: Int): PersonPlanDefaults {
        val adjusted = adjustDefaultsForVdot(getRaceDefaults(raceType), vdot)
        val phases = getScaledPhaseDefaults(raceType, durationWeeks)
        return PersonPlanDefaults(
            runsPerWeek = adjusted.runsPerWeek,
            ridesPerWeek = adjusted.ridesPerWeek,
            swimsPerWeek = adjusted.swimsPerWeek,
            strengthPerWeek = adjusted.strengthPerWeek,
            weeklyKm = adjusted.weeklyVolumeKm,
            maxLongRunKm = getDefaultMaxLongRunKm(raceType, adjusted.weeklyVolumeKm),
            taperWeeks = phases.taperWeeks,
            peakWeeks = phases.peakWeeks,
            buildWeeks = phases.buildWeeks,
        )
    }

    /** [RaceType] convenience overload — keys are the enum names used by the web. */
    fun personPlanDefaults(raceType: RaceType, vdot: Double, durationWeeks: Int): PersonPlanDefaults =
        personPlanDefaults(raceType.name, vdot, durationWeeks)

    // -------------------------------------------------------------------
    // Structured editor prefill
    // -------------------------------------------------------------------

    /**
     * Default structured workout the builder prefills: warmup 1000 m @ E,
     * main 4x400 m @ I with 90 s rest, cooldown 1000 m @ E. Pace letters carry
     * the person's resolved sec/km targets (E uses the web dropdown's
     * easy-range midpoint, WorkoutDetailPanel.tsx L89).
     */
    data class StructuredEditorDefaults(
        val warmupDistanceM: Int,
        val warmupPace: PaceLetter,
        val warmupPaceSecPerKm: Int,
        val mainReps: Int,
        val mainDistanceM: Int,
        val mainPace: PaceLetter,
        val mainPaceSecPerKm: Int,
        val restSeconds: Int,
        val cooldownDistanceM: Int,
        val cooldownPace: PaceLetter,
        val cooldownPaceSecPerKm: Int,
    ) {
        /**
         * BUILDER nested structuredSteps JSON — the exact shape
         * StructuredStepsParser's nested branch parses:
         * {"warmup":{"distance":1000,"pace":"E"},
         *  "main":[{"reps":4,"distance":400,"pace":"I","restSeconds":90}],
         *  "cooldown":{"distance":1000,"pace":"E"}}
         */
        fun toJson(): JsonObject = buildJsonObject {
            put("warmup", buildJsonObject {
                put("distance", warmupDistanceM)
                put("pace", warmupPace.name)
            })
            put("main", JsonArray(listOf(buildJsonObject {
                put("reps", mainReps)
                put("distance", mainDistanceM)
                put("pace", mainPace.name)
                put("restSeconds", restSeconds)
            })))
            put("cooldown", buildJsonObject {
                put("distance", cooldownDistanceM)
                put("pace", cooldownPace.name)
            })
        }

        fun toJsonString(): String = toJson().toString()
    }

    fun structuredEditorDefaults(vdot: Double): StructuredEditorDefaults {
        val paces = trainingPaces(vdot)
        return StructuredEditorDefaults(
            warmupDistanceM = 1000,
            warmupPace = PaceLetter.E,
            warmupPaceSecPerKm = paces.target(PaceLetter.E),
            mainReps = 4,
            mainDistanceM = 400,
            mainPace = PaceLetter.I,
            mainPaceSecPerKm = paces.target(PaceLetter.I),
            restSeconds = 90,
            cooldownDistanceM = 1000,
            cooldownPace = PaceLetter.E,
            cooldownPaceSecPerKm = paces.target(PaceLetter.E),
        )
    }
}
