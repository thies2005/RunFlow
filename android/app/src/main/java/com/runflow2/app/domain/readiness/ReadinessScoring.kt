package com.runflow2.app.domain.readiness

import java.time.Instant
import java.time.LocalDate
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

/*
 * Daily readiness scoring. Originally a faithful Kotlin port of the deleted
 * Flutter app's ReadinessScoringService (flutter/lib/domain/services/
 * readiness/readiness_scoring_service.dart at commit a4616887). Two
 * deliberate divergences since then, both product decisions: HRV
 * ([HrvMetrics]) is a scored component (weight .15) on a 5/4/3
 * availability/confidence ladder, and since v2.8.0 every component is a
 * CONTINUOUS piecewise-linear curve instead of the Dart plateaus, so small
 * day-to-day changes move the score ("more sensitive"). Pure Kotlin: no
 * Android, Room or JSON dependencies; the wire format lives in
 * [ReadinessJson] (the web contract's hrvJson pass-through is unchanged).
 */

// ---- Enums (wire names match the Dart enum names used on the server) ----

/** Gives the readiness enums a JSON wire name (see [ReadinessJson]). */
interface WireNamed {
    val wireName: String
}

enum class ReadinessState(override val wireName: String) : WireNamed {
    EXCELLENT("excellent"),
    GOOD("good"),
    MODERATE("moderate"),
    REDUCED("reduced"),
    REST("rest"),
    UNAVAILABLE("unavailable"),
}

enum class DataConfidence(override val wireName: String) : WireNamed {
    FULL("full"),
    PARTIAL("partial"),
    ESTIMATED("estimated"),
    UNAVAILABLE("unavailable"),
}

enum class AdaptationType(override val wireName: String) : WireNamed {
    NONE("none"),
    VOLUME_REDUCTION("volumeReduction"),
    INTENSITY_REDUCTION("intensityReduction"),
    SWAP_TO_EASY("swapToEasy"),
    REST_OR_RESCHEDULE("restOrReschedule"),
    USER_OVERRIDE_HARDER("userOverrideHarder"),
    USER_OVERRIDE_EASIER("userOverrideEasier"),
}

enum class TrimpStrategy(override val wireName: String) : WireNamed {
    HEART_RATE_RESERVE("heartRateReserve"),
    SESSION_TYPE_FALLBACK("sessionTypeFallback"),
    UNAVAILABLE("unavailable"),
}

enum class ReadinessComponent(override val wireName: String) : WireNamed {
    HRR("hrr"),
    HRV("hrv"),
    SLEEP("sleep"),
    LOAD("load"),
    SUBJECTIVE("subjective"),
}

// ---- Configuration (defaults diverge from Dart: HRV weight added) ----

/**
 * Weights sum to 1.0 across the five components. Dart carried four
 * (hrr .35 / sleep .30 / load .25 / subjective .10); the HRV weight and the
 * renormalized remainder are the app's own decision.
 */
data class ReadinessScoringConfig(
    val hrrWeight: Double = 0.30,
    val hrvWeight: Double = 0.15,
    val sleepWeight: Double = 0.25,
    val loadWeight: Double = 0.20,
    val subjectiveWeight: Double = 0.10,
    val excellentThreshold: Double = 80.0,
    val goodThreshold: Double = 65.0,
    val moderateThreshold: Double = 50.0,
    val reducedThreshold: Double = 35.0,
)

// ---- Inputs (field-by-field mirror of the Flutter ReadinessInputs tree) ----

data class RhrMetrics(
    val todayRhr: Double? = null,
    val baselineRhr: Double? = null,
    val rhrDelta: Double? = null,
    val trendDirection: Int? = null,
)

data class SleepMetrics(
    val totalDurationMinutes: Double? = null,
    val deepMinutes: Double? = null,
    val remMinutes: Double? = null,
    val lightMinutes: Double? = null,
    val deepPercent: Double? = null,
    val remPercent: Double? = null,
    val sleepEfficiency: Double? = null,
)

data class LoadMetrics(
    val todayTrimp: Double? = null,
    val atl: Double? = null,
    val ctl: Double? = null,
    val tsb: Double? = null,
    val workloadRatio: Double? = null,
    val trimpStrategy: TrimpStrategy = TrimpStrategy.UNAVAILABLE,
    val sevenDayTrimpTotal: Double? = null,
)

data class SubjectiveInput(
    val exhaustionLevel: Int? = null,
    val muscleSoreness: Int? = null,
    val stressLevel: Int? = null,
    val note: String? = null,
    val enteredAt: Instant? = null,
)

data class ReadinessInputs(
    val date: LocalDate,
    val rhr: RhrMetrics? = null,
    val sleep: SleepMetrics? = null,
    val load: LoadMetrics? = null,
    val subjective: SubjectiveInput? = null,
    val hrv: HrvMetrics? = null,
    val maxHr: Int? = null,
    val restingHr: Int? = null,
)

/**
 * HRV snapshot for the day. Scored as the HRV component (see
 * [ReadinessScoring.scoreHrv]) and still synced in the daily payload
 * (hrvJson) for display.
 */
data class HrvMetrics(
    val todayHrv: Double? = null,
    val baselineHrv: Double? = null,
    val hrvDelta: Double? = null,
    val trendDirection: String? = null,
)

// ---- Results ----

data class ComponentScore(
    val component: ReadinessComponent,
    val score: Double,
    val isAvailable: Boolean,
    val reason: String? = null,
)

data class ReadinessResult(
    val compositeScore: Double,
    val state: ReadinessState,
    val confidence: DataConfidence,
    val componentScores: List<ComponentScore>,
    val reasons: List<String>,
    val adaptationType: AdaptationType,
    val adaptationDescription: String? = null,
    val recommendation: String? = null,
)

// ---- Scoring engine ----

/**
 * Scores one day of readiness. The HRR/sleep/load/subjective thresholds
 * mirror the Dart source; the HRV component and the five-component
 * availability ladder (see [determineConfidence]) are the app's semantics.
 */
object ReadinessScoring {

    fun score(
        inputs: ReadinessInputs,
        config: ReadinessScoringConfig = ReadinessScoringConfig(),
    ): ReadinessResult {
        val hrrScore = scoreHrr(inputs.rhr)
        val hrvScore = scoreHrv(inputs.hrv)
        val sleepScore = scoreSleep(inputs.sleep)
        val loadScore = scoreLoad(inputs.load)
        val subjectiveScore = scoreSubjective(inputs.subjective)

        val components = listOf(hrrScore, hrvScore, sleepScore, loadScore, subjectiveScore)
        val availableComponents = components.filter { it.isAvailable }

        if (availableComponents.size < 3) {
            return ReadinessResult(
                compositeScore = 0.0,
                state = ReadinessState.UNAVAILABLE,
                confidence = DataConfidence.UNAVAILABLE,
                componentScores = components,
                reasons = listOf("Insufficient data for readiness assessment"),
                adaptationType = AdaptationType.NONE,
            )
        }

        val confidence = determineConfidence(availableComponents.size)
        val compositeScore = computeComposite(availableComponents, config)
        val state = determineState(compositeScore, config)
        val adaptationType = determineAdaptation(state, loadScore)
        val reasons = availableComponents.mapNotNull { it.reason }

        return ReadinessResult(
            compositeScore = compositeScore,
            state = state,
            confidence = confidence,
            componentScores = components,
            reasons = reasons,
            adaptationType = adaptationType,
        )
    }

    // -- HRR: today's RHR vs baseline, LOWER is better. Continuous: every
    //    0.15 bpm of delta moves the score ~1 point (no stable plateau). --

    private fun scoreHrr(rhr: RhrMetrics?): ComponentScore {
        if (rhr == null || rhr.todayRhr == null) {
            return ComponentScore(ReadinessComponent.HRR, 0.0, isAvailable = false)
        }

        if (rhr.baselineRhr == null || rhr.rhrDelta == null) {
            return ComponentScore(
                component = ReadinessComponent.HRR,
                score = 65.0,
                isAvailable = true,
                reason = "RHR available but no baseline for comparison",
            )
        }

        val delta = rhr.rhrDelta
        // 7 points per bpm; improvement credit capped at 3 bpm so one
        // unusually low reading can't max the component
        val score = (75.0 - delta.coerceIn(-3.0, 7.0) * 7.0).coerceIn(20.0, 100.0)
        val reason = when {
            abs(delta) < 0.5 -> "Resting HR stable vs baseline"
            delta < 0 -> "Resting HR ${fmt1(abs(delta))} bpm below baseline"
            else -> "Resting HR ${fmt1(delta)} bpm above baseline"
        }

        return ComponentScore(ReadinessComponent.HRR, score, true, reason)
    }

    // -- HRV: % change vs the 7-day baseline, HIGHER is better. Continuous:
    //    1.5 points per percent, symmetric ±25 % cap. --

    private fun scoreHrv(hrv: HrvMetrics?): ComponentScore {
        if (hrv == null || hrv.todayHrv == null) {
            return ComponentScore(ReadinessComponent.HRV, 0.0, isAvailable = false)
        }

        val baseline = hrv.baselineHrv
        if (baseline == null || baseline <= 0.0) {
            return ComponentScore(
                component = ReadinessComponent.HRV,
                score = 65.0,
                isAvailable = true,
                reason = "HRV available but no baseline for comparison",
            )
        }

        val pct = (hrv.todayHrv!! - baseline) / baseline * 100.0
        val score = (75.0 + pct.coerceIn(-25.0, 25.0) * 1.5).coerceIn(20.0, 100.0)
        val reason = when {
            abs(pct) < 2.0 -> "HRV stable vs baseline"
            pct > 0 -> "HRV up ${fmt1(pct)}% vs baseline"
            else -> "HRV down ${fmt1(abs(pct))}% vs baseline"
        }

        return ComponentScore(ReadinessComponent.HRV, score, true, reason)
    }

    // -- Sleep: continuous duration curve with an 8h optimum, plus graded
    //    deep/REM modifiers. Linear between anchor points — no bands. --

    private fun scoreSleep(sleep: SleepMetrics?): ComponentScore {
        if (sleep == null || sleep.totalDurationMinutes == null) {
            return ComponentScore(ReadinessComponent.SLEEP, 0.0, isAvailable = false)
        }

        val hours = sleep.totalDurationMinutes / 60.0
        val durationScore = when {
            hours >= 8.5 -> 95.0 - min((hours - 8.5) * 4.0, 15.0) // oversleeping tapers gently
            hours >= 6.0 -> 45.0 + (hours - 6.0) * 20.0           // 6h -> 45, 7h -> 65, 8h -> 85
            else -> 45.0 - min((6.0 - hours) * 12.0, 30.0)        // 5h -> 33, 4h -> 21
        }.coerceIn(15.0, 100.0)

        // graded stage modifiers around healthy midpoints (deep ~13%, REM ~18%)
        val deepAdj = sleep.deepPercent?.let { (it - 13.0).coerceIn(-6.0, 6.0) } ?: 0.0
        val remAdj = sleep.remPercent?.let { (it - 18.0).coerceIn(-5.0, 5.0) } ?: 0.0
        val score = (durationScore + deepAdj + remAdj).coerceIn(15.0, 100.0)

        return ComponentScore(
            component = ReadinessComponent.SLEEP,
            score = score,
            isAvailable = true,
            reason = "Sleep: ${fmt1(hours)}h",
        )
    }

    // -- Load: atl/ctl ratio, continuous around a balanced 1.0. Pushing
    //    above 1.0 is penalized steeper than detraining below it. --

    private fun scoreLoad(load: LoadMetrics?): ComponentScore {
        if (load == null) {
            return ComponentScore(ReadinessComponent.LOAD, 0.0, isAvailable = false)
        }

        load.workloadRatio?.let { ratio ->
            val score = if (ratio >= 1.0) {
                (90.0 - (ratio - 1.0) * 70.0).coerceIn(15.0, 95.0)
            } else {
                (90.0 - (1.0 - ratio) * 40.0).coerceIn(15.0, 95.0)
            }
            val reason = when {
                abs(ratio - 1.0) <= 0.1 -> "Training load balanced (ratio: ${fmt2(ratio)})"
                ratio > 1.0 -> "Training load elevated (ratio: ${fmt2(ratio)})"
                else -> "Training load detrained (ratio: ${fmt2(ratio)})"
            }
            return ComponentScore(ReadinessComponent.LOAD, score, true, reason)
        }

        if (load.todayTrimp != null) {
            return ComponentScore(
                component = ReadinessComponent.LOAD,
                score = 60.0,
                isAvailable = true,
                reason = "Limited load data — today TRIMP available but no ratio",
            )
        }

        return ComponentScore(ReadinessComponent.LOAD, 0.0, isAvailable = false)
    }

    // -- Subjective: mean of inverted 1..10 answers * 10; >= 1 answer needed --

    private fun scoreSubjective(subjective: SubjectiveInput?): ComponentScore {
        if (subjective == null) {
            return ComponentScore(ReadinessComponent.SUBJECTIVE, 0.0, isAvailable = false)
        }

        val hasExhaustion = subjective.exhaustionLevel != null
        val hasSoreness = subjective.muscleSoreness != null
        val hasStress = subjective.stressLevel != null

        if (!hasExhaustion && !hasSoreness && !hasStress) {
            return ComponentScore(ReadinessComponent.SUBJECTIVE, 0.0, isAvailable = false)
        }

        val score: Double = when {
            hasExhaustion && hasSoreness && hasStress ->
                (((10 - subjective.exhaustionLevel!!) +
                    (10 - subjective.muscleSoreness!!) +
                    (10 - subjective.stressLevel!!)) / 3.0) * 10.0
            // Verbatim Dart behavior: when exhaustion is answered but not all
            // three questions are, exhaustion alone decides the score.
            hasExhaustion -> (10 - subjective.exhaustionLevel!!) * 10.0
            else -> {
                // Only reachable without exhaustion (the branch above owns
                // every case where exhaustion is answered), so the mean runs
                // over soreness/stress alone.
                var count = 0
                var sum = 0.0
                if (hasSoreness) {
                    sum += 10.0 - subjective.muscleSoreness!!
                    count++
                }
                if (hasStress) {
                    sum += 10.0 - subjective.stressLevel!!
                    count++
                }
                if (count > 0) (sum / count) * 10.0 else 0.0
            }
        }

        return ComponentScore(
            component = ReadinessComponent.SUBJECTIVE,
            score = score,
            isAvailable = true,
            reason = "Subjective wellness score",
        )
    }

    // -- Composite: weight-normalized sum over the available components --

    /**
     * Five-component availability ladder: 5 available = FULL, 4 = PARTIAL,
     * 3 = ESTIMATED, fewer = UNAVAILABLE (the score() gate above).
     */
    private fun determineConfidence(availableCount: Int): DataConfidence = when (availableCount) {
        5 -> DataConfidence.FULL
        4 -> DataConfidence.PARTIAL
        3 -> DataConfidence.ESTIMATED
        else -> DataConfidence.UNAVAILABLE
    }

    private fun computeComposite(available: List<ComponentScore>, cfg: ReadinessScoringConfig): Double {
        fun weightOf(component: ReadinessComponent): Double = when (component) {
            ReadinessComponent.HRR -> cfg.hrrWeight
            ReadinessComponent.HRV -> cfg.hrvWeight
            ReadinessComponent.SLEEP -> cfg.sleepWeight
            ReadinessComponent.LOAD -> cfg.loadWeight
            ReadinessComponent.SUBJECTIVE -> cfg.subjectiveWeight
        }

        val totalWeight = available.sumOf { weightOf(it.component) }
        if (totalWeight == 0.0) return 0.0

        var composite = 0.0
        for (c in available) {
            val normalizedWeight = weightOf(c.component) / totalWeight
            composite += c.score * normalizedWeight
        }
        return composite
    }

    private fun determineState(score: Double, cfg: ReadinessScoringConfig): ReadinessState = when {
        score >= cfg.excellentThreshold -> ReadinessState.EXCELLENT
        score >= cfg.goodThreshold -> ReadinessState.GOOD
        score >= cfg.moderateThreshold -> ReadinessState.MODERATE
        score >= cfg.reducedThreshold -> ReadinessState.REDUCED
        else -> ReadinessState.REST
    }

    private fun determineAdaptation(state: ReadinessState, loadScore: ComponentScore): AdaptationType = when (state) {
        ReadinessState.EXCELLENT, ReadinessState.GOOD -> AdaptationType.NONE
        ReadinessState.MODERATE ->
            if (loadScore.isAvailable && loadScore.score < 60) AdaptationType.VOLUME_REDUCTION
            else AdaptationType.INTENSITY_REDUCTION
        ReadinessState.REDUCED -> AdaptationType.SWAP_TO_EASY
        ReadinessState.REST -> AdaptationType.REST_OR_RESCHEDULE
        ReadinessState.UNAVAILABLE -> AdaptationType.NONE
    }

    // Locale.ROOT keeps the decimal point ASCII in reason strings.
    private fun fmt1(v: Double): String = String.format(Locale.ROOT, "%.1f", v)
    private fun fmt2(v: Double): String = String.format(Locale.ROOT, "%.2f", v)
}
