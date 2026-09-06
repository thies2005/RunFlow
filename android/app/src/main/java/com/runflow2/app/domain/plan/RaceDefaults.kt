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

object RaceDefaultsTable {

    fun forRace(race: RaceType): RaceDefaults = when (race) {
        RaceType.FIVE_K -> RaceDefaults(4, 40.0, 14.0, 8)
        RaceType.TEN_K -> RaceDefaults(4, 45.0, 16.0, 8)
        RaceType.HALF_MARATHON -> RaceDefaults(5, 52.0, 24.0, 10)
        RaceType.MARATHON -> RaceDefaults(5, 58.0, 30.0, 12)
        RaceType.FIFTY_K -> RaceDefaults(5, 68.0, 36.0, 12)
        RaceType.FIFTY_MILE -> RaceDefaults(5, 82.0, 44.0, 14)
        RaceType.HUNDRED_K -> RaceDefaults(6, 95.0, 50.0, 16)
        RaceType.HUNDRED_MILE -> RaceDefaults(6, 110.0, 58.0, 16)
        RaceType.TWELVE_HOUR -> RaceDefaults(5, 85.0, 45.0, 16)
        RaceType.TWENTY_FOUR_HOUR -> RaceDefaults(6, 110.0, 55.0, 20)
        RaceType.BACKYARD_ULTRA -> RaceDefaults(6, 100.0, 52.0, 20)
        RaceType.CUSTOM_DISTANCE -> RaceDefaults(4, 45.0, 18.0, 10)
        RaceType.SPRINT_TRI -> RaceDefaults(3, 30.0, 14.0, 10)
        RaceType.OLYMPIC_TRI -> RaceDefaults(4, 38.0, 16.0, 12)
        RaceType.HALF_IRONMAN -> RaceDefaults(4, 45.0, 20.0, 12)
        RaceType.FULL_IRONMAN -> RaceDefaults(5, 50.0, 26.0, 16)
        RaceType.NONE -> RaceDefaults(4, 42.0, 16.0, 8)
    }

    /** Representative race distances used for wizard calibration. */
    val calibrationRaces: List<Triple<String, RaceType, Double>> = listOf(
        Triple("5K", RaceType.FIVE_K, 5000.0),
        Triple("10K", RaceType.TEN_K, 10000.0),
        Triple("Half Marathon", RaceType.HALF_MARATHON, 21097.5),
        Triple("Marathon", RaceType.MARATHON, 42195.0),
    )
}
