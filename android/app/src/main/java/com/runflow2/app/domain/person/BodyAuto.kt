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

    /** A run only counts as a max-HR observation when its average HR shows a real effort. */
    const val HR_EFFORT_MIN_AVG_HR = 100.0

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
     * Highest believable observed max HR: an activity's maxHr only counts
     * when its averageHr shows a real effort (> [HR_EFFORT_MIN_AVG_HR]) and
     * the value itself stays within 1..[HR_ABS_CEILING]; null when nothing
     * qualifies.
     */
    fun observedHrMax(efforts: List<HrEffort>): Int? = efforts
        .mapNotNull { e -> e.maxHr?.takeIf { (e.averageHr ?: 0.0) > HR_EFFORT_MIN_AVG_HR } }
        .filter { it in 1..HR_ABS_CEILING }
        .maxOrNull()

    /**
     * The whole decision in one pure function:
     *  - hrRest moves to the rounded median only with [MIN_RHR_SAMPLES]
     *    values and a shift of at least [RHR_CHANGE_THRESHOLD] bpm, and only
     *    to a value that keeps hrRest < currentHrMax (so the Karvonen math
     *    downstream can never be handed an inverted pair);
     *  - hrMax RISES ONLY, to the highest believable observation not above
     *    [HR_ABS_CEILING] — a lower or equal observation never lowers it.
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
        val hrMax = observedHrMax(observedMaxCandidates)
            ?.takeIf { it > currentHrMax && it <= HR_ABS_CEILING }
        return Updates(hrRest = hrRest, hrMax = hrMax)
    }
}
