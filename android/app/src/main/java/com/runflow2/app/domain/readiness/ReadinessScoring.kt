package com.runflow2.app.domain.readiness

import java.time.Instant
import java.time.LocalDate
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min

/*
 * Daily readiness scoring — a faithful Kotlin port of the deleted Flutter
 * app's ReadinessScoringService (flutter/lib/domain/services/readiness/
 * readiness_scoring_service.dart at commit a4616887). Pure Kotlin: no
 * Android, Room or JSON dependencies; the wire format lives in
 * [ReadinessJson]. HRV is deliberately carried ([HrvMetrics]) but never
 * scored — product decision, mirrors the web contract's hrvJson pass-through.
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
    SLEEP("sleep"),
    LOAD("load"),
    SUBJECTIVE("subjective"),
}

// ---- Configuration (defaults mirror ReadinessScoringConfig in Dart) ----

data class ReadinessScoringConfig(
    val hrrWeight: Double = 0.35,
    val sleepWeight: Double = 0.30,
    val loadWeight: Double = 0.25,
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
    val maxHr: Int? = null,
    val restingHr: Int? = null,
)

/**
 * HRV snapshot for the day. Carried alongside readiness and synced in the
 * daily payload (hrvJson) but intentionally NOT part of the score.
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

/** Scores one day of readiness; every threshold mirrors the Dart source. */
object ReadinessScoring {

    fun score(
        inputs: ReadinessInputs,
        config: ReadinessScoringConfig = ReadinessScoringConfig(),
    ): ReadinessResult {
        val hrrScore = scoreHrr(inputs.rhr)
        val sleepScore = scoreSleep(inputs.sleep)
        val loadScore = scoreLoad(inputs.load)
        val subjectiveScore = scoreSubjective(inputs.subjective)

        val components = listOf(hrrScore, sleepScore, loadScore, subjectiveScore)
        val availableComponents = components.filter { it.isAvailable }

        if (availableComponents.size < 2) {
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

    // -- HRR: no todayRhr -> unavailable; no baseline -> fixed 65 --

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
        val score: Double
        val reason: String

        if (delta < 0) {
            score = 85.0 + min(abs(delta) * 2, 15.0)
            reason = "Resting heart rate improved by ${fmt1(abs(delta))} bpm"
        } else if (abs(delta) < 1) {
            score = 75.0
            reason = "Resting heart rate stable"
        } else {
            score = 75.0 - min(delta * 3, 40.0)
            reason = "Resting heart rate elevated by ${fmt1(delta)} bpm"
        }

        return ComponentScore(ReadinessComponent.HRR, score, true, reason)
    }

    // -- Sleep: duration bands + deep%/rem% modifiers, clamped 0..100 --

    private fun scoreSleep(sleep: SleepMetrics?): ComponentScore {
        if (sleep == null || sleep.totalDurationMinutes == null) {
            return ComponentScore(ReadinessComponent.SLEEP, 0.0, isAvailable = false)
        }

        val durationHours = sleep.totalDurationMinutes / 60.0

        val baseScore = when {
            durationHours >= 8 -> 85.0
            durationHours >= 7 -> 75.0
            durationHours >= 6 -> 60.0
            durationHours >= 5 -> 45.0
            else -> 30.0
        }

        var score = baseScore

        sleep.deepPercent?.let { deep ->
            when {
                deep >= 20 -> score += 5
                deep >= 15 -> score += 2
                deep < 10 -> score -= 5
            }
        }

        sleep.remPercent?.let { rem ->
            when {
                rem >= 20 -> score += 3
                rem < 10 -> score -= 3
            }
        }

        score = score.coerceIn(0.0, 100.0)

        return ComponentScore(
            component = ReadinessComponent.SLEEP,
            score = score,
            isAvailable = true,
            reason = "Sleep: ${fmt1(durationHours)}h",
        )
    }

    // -- Load: workloadRatio bands; todayTrimp-only -> 60; else unavailable --

    private fun scoreLoad(load: LoadMetrics?): ComponentScore {
        if (load == null) {
            return ComponentScore(ReadinessComponent.LOAD, 0.0, isAvailable = false)
        }

        load.workloadRatio?.let { ratio ->
            val score: Double
            val reason: String
            when {
                ratio < 0.8 -> {
                    score = 70.0
                    reason = "Training load undertrained (ratio: ${fmt2(ratio)})"
                }
                ratio <= 1.3 -> {
                    score = 90.0
                    reason = "Training load optimal (ratio: ${fmt2(ratio)})"
                }
                ratio <= 1.5 -> {
                    score = 65.0
                    reason = "Training load high (ratio: ${fmt2(ratio)})"
                }
                ratio <= 2.0 -> {
                    score = 45.0
                    reason = "Training load very high (ratio: ${fmt2(ratio)})"
                }
                else -> {
                    score = 25.0
                    reason = "Overreaching risk (ratio: ${fmt2(ratio)})"
                }
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

    private fun determineConfidence(availableCount: Int): DataConfidence = when (availableCount) {
        4 -> DataConfidence.FULL
        3 -> DataConfidence.PARTIAL
        2 -> DataConfidence.ESTIMATED
        else -> DataConfidence.UNAVAILABLE
    }

    private fun computeComposite(available: List<ComponentScore>, cfg: ReadinessScoringConfig): Double {
        fun weightOf(component: ReadinessComponent): Double = when (component) {
            ReadinessComponent.HRR -> cfg.hrrWeight
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
