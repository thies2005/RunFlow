package com.runflow2.app.domain.readiness

import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.data.db.DailyEntryEntity
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import java.time.Instant
import java.time.LocalDate
import kotlin.math.roundToInt

/*
 * Assembles [ReadinessInputs] from a day's [DailyEntryEntity], the training
 * load series and the profile, then scores and caches the result on the
 * entity row. Ports the SEMANTICS of the deleted Flutter
 * ReadinessOrchestrator (flutter/lib/services/readiness_orchestrator.dart
 * at commit a4616887); deviations are called out inline.
 */

object ReadinessComposer {

    // ---- Baseline windows ----

    /** Dart's orchestrator read a 30-day RHR history and took its median. */
    const val RHR_BASELINE_WINDOW_DAYS = 30L

    /**
     * The Dart orchestrator only required a non-empty history (a single day
     * became its own baseline, delta 0). That is too noisy to score against,
     * so the app requires a minimum of 7 values before a baseline exists.
     */
    const val RHR_BASELINE_MIN_VALUES = 7

    /** HRV baseline: previous-7-days median (app decision — the Dart/plan
     * sources are silent on HRV baselining; HRV is display-only anyway). */
    const val HRV_BASELINE_WINDOW_DAYS = 7L

    /** Majority of the 7-day window; keeps the delta displayable early. */
    const val HRV_BASELINE_MIN_VALUES = 4

    /** Server baseline row fields: rhrMedian30Day / sleepAverage28Day. */
    const val SLEEP_AVERAGE_WINDOW_DAYS = 28L
    const val SLEEP_AVERAGE_MIN_VALUES = 7

    // ---- Baselines ----

    /**
     * Median resting HR over the [RHR_BASELINE_WINDOW_DAYS] days before
     * [date]. Uses Dart's pick (`sorted[length ~/ 2]`, the upper-middle
     * element for even counts) rather than a true interpolated median.
     */
    fun rhrBaselineOf(entries: List<DailyEntryEntity>, date: LocalDate): Double? =
        windowValues(entries, date, RHR_BASELINE_WINDOW_DAYS) { it.restingHr?.toDouble() }
            .takeIf { it.size >= RHR_BASELINE_MIN_VALUES }
            ?.let(::dartMedian)

    /** Median HRV over the [HRV_BASELINE_WINDOW_DAYS] days before [date]. */
    fun hrvBaselineOf(entries: List<DailyEntryEntity>, date: LocalDate): Double? =
        windowValues(entries, date, HRV_BASELINE_WINDOW_DAYS) { it.hrvMs }
            .takeIf { it.size >= HRV_BASELINE_MIN_VALUES }
            ?.let(::dartMedian)

    /** Mean sleep minutes over the [SLEEP_AVERAGE_WINDOW_DAYS] days before [date]. */
    fun sleepAverageOf(entries: List<DailyEntryEntity>, date: LocalDate): Double? {
        val values = windowValues(entries, date, SLEEP_AVERAGE_WINDOW_DAYS) { it.sleepMinutes?.toDouble() }
        if (values.size < SLEEP_AVERAGE_MIN_VALUES) return null
        return values.sum() / values.size
    }

    /** Values of [select] for entries in [date - days, date - 1], sorted. */
    private fun windowValues(
        entries: List<DailyEntryEntity>,
        date: LocalDate,
        days: Long,
        select: (DailyEntryEntity) -> Double?,
    ): List<Double> {
        val start = date.minusDays(days)
        return entries.asSequence()
            .mapNotNull { e ->
                val d = runCatching { LocalDate.parse(e.date) }.getOrNull() ?: return@mapNotNull null
                if (d in start..date.minusDays(1)) select(e) else null
            }
            .sorted()
            .toList()
    }

    /** Dart's `sorted[values.length ~/ 2]` pick (not an interpolated median). */
    private fun dartMedian(sorted: List<Double>): Double = sorted[sorted.size / 2]

    // ---- Input assembly ----

    /**
     * Maps a day's entry onto the ReadinessInputs tree. Components with no
     * source data stay null exactly like the Dart orchestrator left them
     * unset; [ReadinessScoring] treats null and empty identically.
     */
    /**
     * [hrvBaseline] is accepted for call-site symmetry — HRV is not part of
     * the inputs tree (never scored); it feeds [hrvMetrics] only.
     */
    fun buildInputs(
        date: LocalDate,
        entry: DailyEntryEntity?,
        rhrBaseline: Double?,
        @Suppress("UNUSED_PARAMETER") hrvBaseline: Double?,
        load: LoadMetrics?,
        profileMaxHr: Int?,
        profileRestingHr: Int?,
    ): ReadinessInputs = ReadinessInputs(
        date = date,
        rhr = rhrMetrics(entry, rhrBaseline),
        sleep = sleepMetrics(entry),
        load = load,
        subjective = subjectiveInput(entry),
        maxHr = profileMaxHr,
        restingHr = profileRestingHr,
    )

    /**
     * RHR component: today's value vs the baseline. Delta and trendDirection
     * follow the Dart orchestrator verbatim (delta = today - baseline;
     * trend -1 when delta < -1, +1 when delta > 1, else 0 — never null when
     * a value exists).
     */
    fun rhrMetrics(entry: DailyEntryEntity?, rhrBaseline: Double?): RhrMetrics? {
        val today = entry?.restingHr?.toDouble() ?: return null
        val delta = rhrBaseline?.let { today - it }
        val trend = when {
            delta == null -> 0
            delta < -1 -> -1
            delta > 1 -> 1
            else -> 0
        }
        return RhrMetrics(todayRhr = today, baselineRhr = rhrBaseline, rhrDelta = delta, trendDirection = trend)
    }

    /**
     * Sleep component. Percent fields are computed only when the stage AND a
     * positive total exist (stage / total * 100), like the Dart orchestrator.
     * sleepEfficiency stays null: Dart hardcoded a 0.85 placeholder which is
     * deliberately not ported.
     */
    fun sleepMetrics(entry: DailyEntryEntity?): SleepMetrics? {
        val total = entry?.sleepMinutes?.takeIf { it > 0 }?.toDouble() ?: return null
        val deep = entry.deepMinutes?.toDouble()
        val rem = entry.remMinutes?.toDouble()
        return SleepMetrics(
            totalDurationMinutes = total,
            deepMinutes = deep,
            remMinutes = rem,
            lightMinutes = entry.lightMinutes?.toDouble(),
            deepPercent = deep?.let { it / total * 100.0 },
            remPercent = rem?.let { it / total * 100.0 },
            sleepEfficiency = null,
        )
    }

    /** HRV pass-through for the payload (never scored). */
    fun hrvMetrics(entry: DailyEntryEntity?, hrvBaseline: Double?): HrvMetrics? {
        val today = entry?.hrvMs ?: return null
        val delta = hrvBaseline?.let { today - it }
        return HrvMetrics(
            todayHrv = today,
            baselineHrv = hrvBaseline,
            hrvDelta = delta,
            trendDirection = when {
                delta == null -> null
                delta < 0 -> "down"
                delta > 0 -> "up"
                else -> "stable"
            },
        )
    }

    /**
     * Subjective component: present only when at least one level was answered
     * (the note alone never makes the component available). enteredAt is the
     * row's updatedAt — the closest thing to a "when was this entered".
     */
    fun subjectiveInput(entry: DailyEntryEntity?): SubjectiveInput? {
        if (entry == null) return null
        if (entry.exhaustionLevel == null && entry.muscleSoreness == null && entry.stressLevel == null) return null
        return SubjectiveInput(
            exhaustionLevel = entry.exhaustionLevel,
            muscleSoreness = entry.muscleSoreness,
            stressLevel = entry.stressLevel,
            note = entry.note,
            enteredAt = Instant.ofEpochMilli(entry.updatedAt),
        )
    }

    // ---- Load assembly ----

    /**
     * Load component from the analytics daily series (CTL/ATL per day ending
     * today). Everything is taken from the series entry of [date]:
     *  - todayTrimp only when the day actually carried load (> 0) — a rest
     *    day must not score as "limited load data";
     *  - atl/ctl/tsb straight from the series, tsb = ctl - atl;
     *  - sevenDayTrimpTotal = sum of the last 7 days including [date];
     *  - workloadRatio = atl / ctl when ctl > 0 — the server's own definition
     *    (Web/src/app/api/mobile/v1/dashboard/route.ts). The Dart orchestrator
     *    never computed a ratio (it shipped LoadMetrics empty), so the server
     *    semantics are authoritative;
     *  - trimpStrategy stays UNAVAILABLE: the series does not record whether
     *    a day's TRIMP came from HR data, and the Dart orchestrator sent
     *    unavailable unconditionally too.
     */
    fun loadMetrics(series: List<TrainingLoad.DailyLoad>, date: LocalDate): LoadMetrics? {
        val day = series.firstOrNull { it.date == date } ?: return null
        val weekTotal = series
            .filter { !it.date.isBefore(date.minusDays(6)) && !it.date.isAfter(date) }
            .sumOf { it.trimp }
        return LoadMetrics(
            todayTrimp = day.trimp.takeIf { it > 0.0 },
            atl = day.atl,
            ctl = day.ctl,
            tsb = day.ctl - day.atl,
            workloadRatio = if (day.ctl > 0.0) day.atl / day.ctl else null,
            sevenDayTrimpTotal = weekTotal,
        )
    }

    // ---- Scoring + cache write-back ----

    /**
     * Scores [entry]'s inputs and returns the row with the cache columns
     * filled (score, state/confidence wire names, componentScoresJson).
     * When the score is UNAVAILABLE the cache columns are kept null — an
     * unscorable day must not render as a 0-score day.
     */
    fun computedCache(
        entry: DailyEntryEntity,
        rhrBaseline: Double?,
        hrvBaseline: Double?,
        load: LoadMetrics?,
        profileMaxHr: Int?,
        profileRestingHr: Int?,
    ): DailyEntryEntity {
        val inputs = buildInputs(
            date = LocalDate.parse(entry.date),
            entry = entry,
            rhrBaseline = rhrBaseline,
            hrvBaseline = hrvBaseline,
            load = load,
            profileMaxHr = profileMaxHr,
            profileRestingHr = profileRestingHr,
        )
        return withCache(entry, ReadinessScoring.score(inputs))
    }

    /** Applies a scoring result's cache columns onto [entry]. */
    fun withCache(entry: DailyEntryEntity, result: ReadinessResult): DailyEntryEntity {
        if (result.state == ReadinessState.UNAVAILABLE) {
            return entry.copy(score = null, state = null, confidence = null, componentScoresJson = null)
        }
        return entry.copy(
            score = result.compositeScore,
            state = result.state.wireName,
            confidence = result.confidence.wireName,
            componentScoresJson = componentScoresJson(result),
        )
    }

    /** componentScores serialized in the payload's map shape (ReadinessCard). */
    fun componentScoresJson(result: ReadinessResult): String =
        ReadinessJson.json.encodeToString(
            MapSerializer(String.serializer(), ComponentScoreJson.serializer()),
            result.componentScores.associate { cs ->
                cs.component.wireName to ComponentScoreJson(cs.score, cs.isAvailable, cs.reason)
            },
        )

    // ---- Push payload ----

    /**
     * Scores [inputs] and wraps everything (inputs + HRV + result) into the
     * POST /readiness/daily body. Kept separate from [computedCache] so the
     * sync path can reuse one scoring pass for both cache and payload.
     */
    fun payloadFor(
        inputs: ReadinessInputs,
        hrv: HrvMetrics? = null,
        computedAt: Instant? = null,
    ): ReadinessPayload = ReadinessJson.buildPayload(
        inputs = inputs,
        result = ReadinessScoring.score(inputs),
        hrv = hrv,
        computedAt = computedAt,
    )

    /** Convenience for display layers: rounded cache score or null. */
    fun DailyEntryEntity.cachedScoreRounded(): Int? = score?.roundToInt()
}
