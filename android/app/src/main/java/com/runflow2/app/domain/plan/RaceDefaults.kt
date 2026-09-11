package com.runflow2.app.domain.plan

import com.runflow2.app.domain.model.RaceType

/**
 * Default training volumes per race type (mirrors Web/src/lib race_defaults / PLAN_CONSTANTS).
 */
data class RaceDefaults(
    val runsPerWeek: Int,
    val weeklyKm: Double,
    val longRunKm: Double,
    val minPlanWeeks: Int,
)

/** Cross-training + phase defaults, mirroring Web/src/lib/plans/defaults.ts RACE_DEFAULTS. */
data class CrossDefaults(
    val ridesPerWeek: Int,
    val swimsPerWeek: Int,
    val strengthPerWeek: Int,
    val taperWeeks: Int,
    val peakWeeks: Int,
    val buildWeeks: Int,
)

object RaceDefaultsTable {

    /**
     * Volume defaults (peak weekly km + longest long run) mirroring the weekly
     * volume / maxLongRunKm columns of RACE_DEFAULTS in Web/src/lib/plans/defaults.ts,
     * so the wizard prefills exactly what the website would.
     */
    fun forRace(race: RaceType): RaceDefaults = when (race) {
        RaceType.FIVE_K -> RaceDefaults(4, 28.0, 18.0, 8)
        RaceType.TEN_K -> RaceDefaults(4, 35.0, 22.0, 8)
        RaceType.HALF_MARATHON -> RaceDefaults(4, 45.0, 24.0, 10)
        RaceType.MARATHON -> RaceDefaults(5, 58.0, 32.0, 12)
        RaceType.FIFTY_K -> RaceDefaults(5, 70.0, 35.0, 12)
        RaceType.FIFTY_MILE -> RaceDefaults(6, 80.0, 40.0, 14)
        RaceType.HUNDRED_K -> RaceDefaults(6, 90.0, 45.0, 16)
        RaceType.HUNDRED_MILE -> RaceDefaults(6, 105.0, 50.0, 16)
        RaceType.TWELVE_HOUR -> RaceDefaults(5, 80.0, 40.0, 16)
        RaceType.TWENTY_FOUR_HOUR -> RaceDefaults(6, 95.0, 50.0, 20)
        RaceType.BACKYARD_ULTRA -> RaceDefaults(5, 60.0, 35.0, 20)
        RaceType.CUSTOM_DISTANCE -> RaceDefaults(4, 40.0, 25.0, 10)
        RaceType.SPRINT_TRI -> RaceDefaults(3, 25.0, 15.0, 10)
        RaceType.OLYMPIC_TRI -> RaceDefaults(3, 30.0, 18.0, 12)
        RaceType.HALF_IRONMAN -> RaceDefaults(3, 35.0, 22.0, 12)
        RaceType.FULL_IRONMAN -> RaceDefaults(3, 40.0, 30.0, 16)
        RaceType.CUSTOM_TRI -> RaceDefaults(3, 35.0, 22.0, 12)
        RaceType.NONE -> RaceDefaults(4, 42.0, 16.0, 8)
    }

    /**
     * Cross-training (rides/swims/strength) and phase-length defaults per race.
     * Column values mirror Web/src/lib/plans/defaults.ts (RACE_DEFAULTS):
     * runs, rides, swims, strength, volume, longRun, taper, peak, build.
     */
    fun crossFor(race: RaceType): CrossDefaults = when (race) {
        RaceType.FIVE_K -> CrossDefaults(0, 0, 1, 1, 2, 4)
        RaceType.TEN_K -> CrossDefaults(0, 0, 1, 2, 2, 4)
        RaceType.HALF_MARATHON -> CrossDefaults(0, 0, 1, 2, 2, 4)
        RaceType.MARATHON -> CrossDefaults(0, 0, 1, 2, 3, 4)
        RaceType.FIFTY_K -> CrossDefaults(0, 0, 1, 2, 3, 5)
        RaceType.FIFTY_MILE -> CrossDefaults(0, 0, 1, 2, 3, 6)
        RaceType.HUNDRED_K -> CrossDefaults(0, 0, 1, 2, 3, 6)
        RaceType.HUNDRED_MILE -> CrossDefaults(0, 0, 1, 3, 4, 8)
        RaceType.TWELVE_HOUR -> CrossDefaults(0, 0, 1, 2, 3, 5)
        RaceType.TWENTY_FOUR_HOUR -> CrossDefaults(0, 0, 1, 3, 4, 6)
        RaceType.BACKYARD_ULTRA -> CrossDefaults(0, 0, 1, 2, 3, 5)
        RaceType.CUSTOM_DISTANCE -> CrossDefaults(0, 0, 1, 2, 2, 4)
        RaceType.SPRINT_TRI -> CrossDefaults(2, 2, 2, 2, 2, 4)
        RaceType.OLYMPIC_TRI -> CrossDefaults(3, 2, 2, 2, 2, 4)
        RaceType.HALF_IRONMAN -> CrossDefaults(3, 2, 2, 2, 3, 4)
        RaceType.FULL_IRONMAN -> CrossDefaults(3, 2, 3, 3, 4, 4)
        RaceType.CUSTOM_TRI -> CrossDefaults(3, 2, 2, 2, 3, 4)
        RaceType.NONE -> CrossDefaults(0, 0, 1, 2, 2, 4)
    }

    /**
     * Wizard cap for the longest-long-run slider, mirroring LONG_RUN_CAPS in
     * Web/src/components/PlanSetupForm.tsx.
     */
    fun longRunCapKm(race: RaceType): Double = when (race) {
        RaceType.FIVE_K -> 21.0
        RaceType.TEN_K -> 25.0
        RaceType.HALF_MARATHON -> 27.0
        RaceType.MARATHON -> 35.0
        RaceType.FIFTY_K -> 38.0
        RaceType.FIFTY_MILE -> 43.0
        RaceType.HUNDRED_K -> 48.0
        RaceType.HUNDRED_MILE -> 53.0
        RaceType.TWELVE_HOUR -> 43.0
        RaceType.TWENTY_FOUR_HOUR -> 53.0
        RaceType.BACKYARD_ULTRA -> 38.0
        RaceType.SPRINT_TRI -> 18.0
        RaceType.OLYMPIC_TRI -> 21.0
        RaceType.HALF_IRONMAN -> 25.0
        RaceType.FULL_IRONMAN -> 33.0
        RaceType.CUSTOM_TRI -> 25.0
        RaceType.CUSTOM_DISTANCE, RaceType.NONE -> 28.0
    }

    /** Representative race distances used for wizard calibration. */
    val calibrationRaces: List<Triple<String, RaceType, Double>> = listOf(
        Triple("5K", RaceType.FIVE_K, 5000.0),
        Triple("10K", RaceType.TEN_K, 10000.0),
        Triple("Half Marathon", RaceType.HALF_MARATHON, 21097.5),
        Triple("Marathon", RaceType.MARATHON, 42195.0),
    )

    /** Races offered per event category on the wizard's race screen. */
    val runRaces: List<RaceType> = listOf(
        RaceType.FIVE_K, RaceType.TEN_K, RaceType.HALF_MARATHON, RaceType.MARATHON, RaceType.CUSTOM_DISTANCE,
    )
    val ultraRaces: List<RaceType> = listOf(
        RaceType.FIFTY_K, RaceType.FIFTY_MILE, RaceType.HUNDRED_K, RaceType.HUNDRED_MILE,
        RaceType.TWELVE_HOUR, RaceType.TWENTY_FOUR_HOUR, RaceType.BACKYARD_ULTRA,
    )
    val triRaces: List<RaceType> = listOf(
        RaceType.SPRINT_TRI, RaceType.OLYMPIC_TRI, RaceType.HALF_IRONMAN, RaceType.FULL_IRONMAN, RaceType.CUSTOM_TRI,
    )
}
