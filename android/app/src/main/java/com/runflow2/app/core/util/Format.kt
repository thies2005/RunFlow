package com.runflow2.app.core.util

import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

enum class DistanceUnit { METRIC, IMPERIAL }

object Format {

    private val dayFmt = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.ENGLISH)
    private val dayFmtWithYear = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH)
    private val timeOfDayFmt = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH)

    fun distance(km: Double, unit: DistanceUnit = DistanceUnit.METRIC, decimals: Int = 1): String =
        when (unit) {
            DistanceUnit.METRIC -> String.format(Locale.ENGLISH, "%.${decimals}f km", km)
            DistanceUnit.IMPERIAL -> String.format(
                Locale.ENGLISH,
                "%.${decimals}f mi",
                km * 0.621371,
            )
        }

    fun distanceShort(km: Double, unit: DistanceUnit = DistanceUnit.METRIC): String =
        when (unit) {
            DistanceUnit.METRIC -> String.format(Locale.ENGLISH, "%.1f", km)
            DistanceUnit.IMPERIAL -> String.format(Locale.ENGLISH, "%.1f", km * 0.621371)
        }

    fun distanceUnitLabel(unit: DistanceUnit): String = when (unit) {
        DistanceUnit.METRIC -> "km"
        DistanceUnit.IMPERIAL -> "mi"
    }

    /** Pace as m:ss /km (or /mi in imperial). Returns "—" for non-positive/non-finite input. */
    fun pace(secPerKm: Double?, unit: DistanceUnit = DistanceUnit.METRIC): String {
        if (secPerKm == null || !secPerKm.isFinite() || secPerKm <= 0.0) return "—"
        val sec = when (unit) {
            DistanceUnit.METRIC -> secPerKm
            DistanceUnit.IMPERIAL -> secPerKm / 0.621371
        }
        val total = sec.toInt()
        val m = total / 60
        val s = total % 60
        return String.format(Locale.ENGLISH, "%d:%02d", m, s)
    }

    fun paceWithUnit(secPerKm: Double?, unit: DistanceUnit = DistanceUnit.METRIC): String =
        pace(secPerKm, unit) + " /" + distanceUnitLabel(unit)

    fun paceRange(fastSec: Double?, slowSec: Double?, unit: DistanceUnit = DistanceUnit.METRIC): String {
        if (fastSec == null || slowSec == null) return "—"
        return "${pace(fastSec, unit)}–${pace(slowSec, unit)}"
    }

    fun duration(totalSec: Long): String {
        val h = totalSec / 3600
        val m = (totalSec % 3600) / 60
        val s = totalSec % 60
        return if (h > 0) String.format(Locale.ENGLISH, "%d:%02d:%02d", h, m, s)
        else String.format(Locale.ENGLISH, "%d:%02d", m, s)
    }

    fun duration(totalSec: Int) = duration(totalSec.toLong())

    fun date(date: LocalDate): String = date.format(dayFmt)

    fun dateWithYear(date: LocalDate): String = date.format(dayFmtWithYear)

    private val dateTimeFmt = DateTimeFormatter.ofPattern("EEEE, MMM d · HH:mm", Locale.ENGLISH)

    fun dateTimeLine(epochMillis: Long): String =
        localDateTime(epochMillis).format(dateTimeFmt)

    fun time(time: LocalTime): String = time.format(timeOfDayFmt)

    fun relativeDay(date: LocalDate, today: LocalDate = LocalDate.now()): String = when (date) {
        today -> "Today"
        today.minusDays(1) -> "Yesterday"
        today.plusDays(1) -> "Tomorrow"
        else -> date.format(dayFmt)
    }

    fun epochMillis(localDate: LocalDate, time: LocalTime = LocalTime.MIDNIGHT): Long =
        LocalDateTime.of(localDate, time).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

    fun localDate(epochMillis: Long): LocalDate =
        LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(epochMillis), ZoneId.systemDefault()).toLocalDate()

    fun localDateTime(epochMillis: Long): LocalDateTime =
        LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(epochMillis), ZoneId.systemDefault())

    fun dayName(day: DayOfWeek): String = when (day) {
        DayOfWeek.MONDAY -> "Monday"
        DayOfWeek.TUESDAY -> "Tuesday"
        DayOfWeek.WEDNESDAY -> "Wednesday"
        DayOfWeek.THURSDAY -> "Thursday"
        DayOfWeek.FRIDAY -> "Friday"
        DayOfWeek.SATURDAY -> "Saturday"
        DayOfWeek.SUNDAY -> "Sunday"
    }

    fun dayShort(day: DayOfWeek): String = dayName(day).take(3)

    /** e.g. "4 min 32 s /km faster than target" — helper for pace diff speech/text. */
    fun speedKmh(secPerKm: Double?): String =
        if (secPerKm == null || secPerKm <= 0) "—" else String.format(Locale.ENGLISH, "%.1f", 3600.0 / secPerKm)

    // Swim paces are stored per 100m, ride speeds read best in km/h — plan
    // generators and Strava both feed these raw strings through, so the
    // unit choice is made here once for every display site.
    private val SWIM_TYPES = setOf("SWIM", "SWIM_DRILL", "OPEN_WATER_SWIM")
    private val RIDE_TYPES = setOf("RIDE", "LONG_RIDE", "RIDE_INTERVALS", "VIRTUAL_RIDE")

    fun isSwimType(type: String?): Boolean = type in SWIM_TYPES

    fun isRideType(type: String?): Boolean = type in RIDE_TYPES

    private fun swimUnitLabel(unit: DistanceUnit): String =
        if (unit == DistanceUnit.METRIC) "/100m" else "/100yd"

    /**
     * Sport-aware pace label for PLAN/workout targets. Careful — the two pace
     * families store swims differently:
     *  - plan targets ([paceLabelFor]): swim values are ALREADY seconds per
     *    100m (web engine convention) → formatted as-is;
     *  - activity rows ([activityPaceLabel]): pace is seconds per KILOMETRE
     *    for every sport → converted here.
     * Ride targets are sec/km in both families → speed, "31.4 km/h"; runs
     * → "5:12 /km" (or "/mi"). Returns null when there is no usable pace.
     */
    fun paceLabelFor(type: String?, paceSecPerKm: Double?, unit: DistanceUnit = DistanceUnit.METRIC): String? {
        if (paceSecPerKm == null || !paceSecPerKm.isFinite() || paceSecPerKm <= 0.0) return null
        return when (type) {
            in SWIM_TYPES -> {
                val secPer100 = if (unit == DistanceUnit.METRIC) paceSecPerKm else paceSecPerKm * 1.09361
                "${pace(secPer100)} ${swimUnitLabel(unit)}"
            }
            in RIDE_TYPES -> "${speedKmh(paceSecPerKm)} km/h"
            else -> paceWithUnit(paceSecPerKm, unit)
        }
    }

    /**
     * Sport-aware pace label for ACTIVITY rows: [ActivityEntity.paceSecPerKm]
     * is seconds per kilometre for every sport, so a 1:52/100m swim arrives
     * as 1120 s/km and must be converted — otherwise it displays as an
     * absurd "18:40 /100m" that reads ten times slower than reality.
     */
    fun activityPaceLabel(type: String?, paceSecPerKm: Double?, unit: DistanceUnit = DistanceUnit.METRIC): String? {
        if (paceSecPerKm == null || !paceSecPerKm.isFinite() || paceSecPerKm <= 0.0) return null
        return when (type) {
            in SWIM_TYPES -> {
                val secPer100 = when (unit) {
                    DistanceUnit.METRIC -> paceSecPerKm / 10.0        // 100m is a tenth of a km
                    DistanceUnit.IMPERIAL -> paceSecPerKm * 0.09144   // 100yd = 91.44m
                }
                "${pace(secPer100)} ${swimUnitLabel(unit)}"
            }
            in RIDE_TYPES -> "${speedKmh(paceSecPerKm)} km/h"
            else -> paceWithUnit(paceSecPerKm, unit)
        }
    }

    /** Lowercase sport noun for about/chat wording: "run", "ride", "swim"… */
    fun activityNoun(type: String?): String = when (type?.uppercase()) {
        "RUN" -> "run"
        "RIDE", "VIRTUAL_RIDE" -> "ride"
        "SWIM" -> "swim"
        "WALK" -> "walk"
        "HIKE" -> "hike"
        "WORKOUT", "STRENGTH" -> "workout"
        else -> "activity"
    }

    fun heartRate(hr: Double?): String =
        if (hr == null || hr <= 0.0) "—" else "${hr.toInt()} bpm"

    fun intOrDash(v: Double?): String =
        if (v == null || !v.isFinite()) "—" else "${v.toInt()}"

    /** Rounded, unlike [intOrDash] which truncates — keeps header and chart legend in sync. */
    fun roundedIntOrDash(v: Double?): String =
        if (v == null || !v.isFinite()) "—" else "${v.roundToInt()}"

    fun oneDecimal(v: Double?): String =
        if (v == null || !v.isFinite()) "—" else String.format(Locale.ENGLISH, "%.1f", v)

    fun weeksBetween(start: LocalDate, end: LocalDate): Int {
        val days = Duration.between(start.atStartOfDay(), end.atStartOfDay()).toDays()
        return ((days + 6) / 7).toInt()
    }
}

object FormatRelative {
    /** Compact relative time: "just now", "12 min ago", "3 h ago", "2 days ago". */
    fun timeAgo(epochMillis: Long): String {
        val diff = System.currentTimeMillis() - epochMillis
        val min = diff / 60_000
        return when {
            min < 1 -> "just now"
            min < 60 -> "$min min ago"
            min < 60 * 24 -> "${min / 60} h ago"
            else -> "${min / (60 * 24)} days ago"
        }
    }
}
