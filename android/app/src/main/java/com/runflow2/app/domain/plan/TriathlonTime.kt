package com.runflow2.app.domain.plan

import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.domain.model.RaceType
import kotlin.math.pow
import kotlin.math.roundToInt

/** One swim → T1 → bike → T2 → run split of a projected triathlon finish. */
data class TriathlonSplits(
    val totalSeconds: Int,
    val swimSeconds: Int,
    val bikeSeconds: Int,
    val runSeconds: Int,
    val t1Seconds: Int,
    val t2Seconds: Int,
)

data class TriathlonLegs(val swimM: Double, val bikeM: Double, val runM: Double)

data class TriathlonTimeProjection(
    val optimal: TriathlonSplits,
    val projected: TriathlonSplits,
    val conservative: TriathlonSplits,
    val legs: TriathlonLegs,
)

/**
 * Port of Web/src/lib/plans/triathlon-time.ts (L29-137) — projects a total
 * finish time (and per-leg splits) from a run VDOT. Used by the plan wizard
 * so triathlon targets show the whole race, not just the run leg.
 */
object TriathlonTimeEstimator {

    private val SWIM_M: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 750.0, "OLYMPIC_TRI" to 1500.0, "HALF_IRONMAN" to 1900.0,
        "FULL_IRONMAN" to 3800.0, "CUSTOM_TRI" to 750.0,
    )
    private val BIKE_M: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 20000.0, "OLYMPIC_TRI" to 40000.0, "HALF_IRONMAN" to 90000.0,
        "FULL_IRONMAN" to 180000.0, "CUSTOM_TRI" to 20000.0,
    )
    private val RUN_M: Map<String, Double> = mapOf(
        "SPRINT_TRI" to 5000.0, "OLYMPIC_TRI" to 10000.0, "HALF_IRONMAN" to 21097.0,
        "FULL_IRONMAN" to 42195.0, "CUSTOM_TRI" to 5000.0,
    )

    private data class Transitions(val t1: Int, val t2: Int)

    private val TRANSITIONS: Map<String, Transitions> = mapOf(
        "SPRINT_TRI" to Transitions(120, 90),
        "OLYMPIC_TRI" to Transitions(150, 120),
        "HALF_IRONMAN" to Transitions(330, 210),
        "FULL_IRONMAN" to Transitions(510, 360),
    )
    private val DEFAULT_TRANSITION = Transitions(150, 120)

    fun estimate(
        vdot: Double,
        raceType: RaceType,
        customSwimDistM: Double? = null,
        customBikeDistM: Double? = null,
        customRunDistM: Double? = null,
    ): TriathlonTimeProjection? {
        if (vdot <= 0.0) return null

        val key = raceType.name
        val swim = customSwimDistM?.takeIf { it > 0 } ?: (SWIM_M[key] ?: SWIM_M.getValue("SPRINT_TRI"))
        val bike = customBikeDistM?.takeIf { it > 0 } ?: (BIKE_M[key] ?: BIKE_M.getValue("SPRINT_TRI"))
        val run = customRunDistM?.takeIf { it > 0 } ?: (RUN_M[key] ?: RUN_M.getValue("SPRINT_TRI"))
        val t = TRANSITIONS[key] ?: DEFAULT_TRANSITION

        val optimal = splits(vdot, swim, bike, run, t)

        // longer courses degrade the run more (triathlon-time.ts L108-110)
        val isLongCourse = (swim + bike + run) / 1000.0 >= 100.0
        val projRunMult = if (isLongCourse) 1.15 else 1.10
        val consRunMult = if (isLongCourse) 1.25 else 1.20

        fun scaled(swimMult: Double, bikeMult: Double, runMult: Double): TriathlonSplits {
            val s = (optimal.swimSeconds * swimMult).roundToInt()
            val b = (optimal.bikeSeconds * bikeMult).roundToInt()
            val r = (optimal.runSeconds * runMult).roundToInt()
            return TriathlonSplits(s + b + r + t.t1 + t.t2, s, b, r, t.t1, t.t2)
        }

        val projected = scaled(1.05, 1.08, projRunMult)
        val conservative = scaled(1.10, 1.15, consRunMult)
        return TriathlonTimeProjection(optimal, projected, conservative, TriathlonLegs(swim, bike, run))
    }

    private fun splits(
        vdot: Double,
        swimDistM: Double,
        bikeDistM: Double,
        runDistM: Double,
        t: Transitions,
    ): TriathlonSplits {
        val swimSec = estimateSwimPaceFromVdot(vdot) * swimDistM / 100.0
        val ftp = estimateBikeFtpFromVdot(vdot)
        val bikeSec = bikeDistM / bikePowerToSpeed(ftp * 0.75)
        val runSec = VdotMath.predictTimeSec(vdot, runDistM) ?: runDistM / 3.0
        // round each leg, then total the rounded legs so the displayed
        // splits always add up exactly (web rounds independently; ≤1s drift)
        val swimR = swimSec.roundToInt()
        val bikeR = bikeSec.roundToInt()
        val runR = runSec.roundToInt()
        return TriathlonSplits(
            totalSeconds = swimR + bikeR + runR + t.t1 + t.t2,
            swimSeconds = swimR,
            bikeSeconds = bikeR,
            runSeconds = runR,
            t1Seconds = t.t1,
            t2Seconds = t.t2,
        )
    }

    /** triathlon-time.ts `bikePowerToSpeed` (L77-79): m/s at ~0.38 CdA-ish drag constant. */
    private fun bikePowerToSpeed(watts: Double): Double = (watts / 0.38).pow(1.0 / 3.0)
}
