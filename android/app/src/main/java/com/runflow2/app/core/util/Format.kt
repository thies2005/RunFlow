package com.runflow2.app.core.util

import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

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

    fun heartRate(hr: Double?): String =
        if (hr == null || hr <= 0.0) "—" else "${hr.toInt()} bpm"

    fun intOrDash(v: Double?): String =
        if (v == null || !v.isFinite()) "—" else "${v.toInt()}"

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
