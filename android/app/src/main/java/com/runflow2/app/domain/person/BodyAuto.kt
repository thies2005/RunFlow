package com.runflow2.app.domain.person

import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Pure decision logic for auto-updating the athlete's body metrics from
 * recorded data: resting HR from the daily-entry history, max HR from
 * believable run observations. Deliberately free of Android/Room/UI imports —
 * the repository owns the data access, this object owns the rules, so the
 * thresholds stay unit-testable in isolation.
 */
object BodyAuto {

    /** Daily resting-HR values required before a median is trusted. */
    const val MIN_RHR_SAMPLES = 7

    /** bpm the median must differ from the profile's hrRest before it moves. */
    const val RHR_CHANGE_THRESHOLD = 2.0

    /** Hard physiological ceiling: observed max HRs above it are sensor noise. */
    const val HR_ABS_CEILING = 210

    /** A run only counts as a max-HR observation when its average HR shows a real hard effort. */
    const val HR_EFFORT_MIN_AVG_HR = 135.0

    /**
     * Max-to-average HR spread within one activity above which the maxHr is
     * treated as optical-sensor noise (an easy run with avgHr 125 and maxHr
     * 205 is a cadence-lock spike, not a true max-HR effort).
     */
    const val HR_MAX_SPIKE_DIFF = 45.0

    /** Observations required within this many bpm of the candidate before hrMax may rise. */
    const val HR_MAX_CORROBORATION_BPM = 3

    /** Minimum corroborating observations (see [HR_MAX_CORROBORATION_BPM]). */
    const val HR_MAX_MIN_OBSERVATIONS = 2

    /** One activity's HR summary relevant to a max-HR observation. */
    data class HrEffort(val maxHr: Int?, val averageHr: Double?)

    /** What [compute] decided to change; null = keep the profile's current value. */
    data class Updates(
        val hrRest: Int?,
        val hrMax: Int?,
        /** Filled by the caller (needs the Karvonen model); compute never sets it. */
        val zoneMaxes: List<Int>? = null,
    )

    /**
     * Dart-style median pick (`sorted[length ~/ 2]`, the upper-middle element
     * for even counts — same convention as ReadinessComposer's dartMedian).
     * Pure: the [MIN_RHR_SAMPLES] gate is [compute]'s rule, not the median's.
     */
    fun rhrMedian(values: List<Double>): Double? {
        if (values.isEmpty()) return null
        return values.sorted()[values.size / 2]
    }

    /**
     * All believable max-HR observations: an activity's maxHr only counts when
     * its averageHr shows a real hard effort (> [HR_EFFORT_MIN_AVG_HR]), the
     * max-to-average spread stays within [HR_MAX_SPIKE_DIFF], and the value
     * itself stays within 1..[HR_ABS_CEILING].
     */
    fun believableMaxes(efforts: List<HrEffort>): List<Int> = efforts
        .mapNotNull { e ->
            val avg = e.averageHr
            e.maxHr?.takeIf { avg != null && avg > HR_EFFORT_MIN_AVG_HR && (it - avg) <= HR_MAX_SPIKE_DIFF }
        }
        .filter { it in 1..HR_ABS_CEILING }

    /**
     * Highest believable observed max HR (see [believableMaxes]); null when
     * nothing qualifies.
     */
    fun observedHrMax(efforts: List<HrEffort>): Int? = believableMaxes(efforts).maxOrNull()

    /**
     * The whole decision in one pure function:
     *  - hrRest moves to the rounded median only with [MIN_RHR_SAMPLES]
     *    values and a shift of at least [RHR_CHANGE_THRESHOLD] bpm, and only
     *    to a value that keeps hrRest < currentHrMax (so the Karvonen math
     *    downstream can never be handed an inverted pair);
     *  - hrMax RISES ONLY, to the highest believable observation not above
     *    [HR_ABS_CEILING] AND corroborated by at least
     *    [HR_MAX_MIN_OBSERVATIONS] observations within
     *    [HR_MAX_CORROBORATION_BPM] bpm of it — a single spike never
     *    ratchets hrMax up (which would silently inflate every HR-based
     *    VO2max estimate afterwards). A lower or equal observation never
     *    lowers it.
     */
    fun compute(
        currentHrRest: Int,
        currentHrMax: Int,
        rhrValues: List<Double>,
        observedMaxCandidates: List<HrEffort>,
    ): Updates {
        val median = rhrValues.takeIf { it.size >= MIN_RHR_SAMPLES }?.let(::rhrMedian)
        val hrRest = median
            ?.takeIf { abs(it - currentHrRest) >= RHR_CHANGE_THRESHOLD }
            ?.roundToInt()
            ?.takeIf { it in 1 until currentHrMax }
        val maxes = believableMaxes(observedMaxCandidates)
        val hrMax = maxes.maxOrNull()?.takeIf { candidate ->
            candidate > currentHrMax && candidate <= HR_ABS_CEILING &&
                maxes.count { abs(it - candidate) <= HR_MAX_CORROBORATION_BPM } >= HR_MAX_MIN_OBSERVATIONS
        }
        return Updates(hrRest = hrRest, hrMax = hrMax)
    }
}
