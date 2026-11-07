package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.repo.*
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.core.util.Format
import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.util.DistanceUnit
import java.time.DayOfWeek
import java.time.LocalDate

internal fun periodActivities(activities: List<ActivityEntity>, start: LocalDate, end: LocalDate): List<ActivityEntity> =
    activities.filter { Format.localDate(it.startDate).let { d -> !d.isBefore(start) && !d.isAfter(end) } }

internal fun actualTss(activities: List<ActivityEntity>): Double? {
    val values = activities.map {
        TrainingLoad.resolveEffectiveTss(it.type, it.movingTimeSec, bikeTss = it.bikeTss ?: 0.0, trimp = it.trimp, trainingType = it.trainingType)
    }
    return if (values.any { !it.isFinite() || it <= 0.0 }) null else values.sum()
}
internal fun tssLabel(activities: List<ActivityEntity>): String =
    if (activities.any { !Format.isRideType(it.type) || (it.bikeTss ?: 0.0) <= 0.0 }) "estimated TSS" else "TSS"
internal fun actualTrimp(activities: List<ActivityEntity>): Double? =
    if (activities.any { it.trimp <= 0.0 }) null else activities.sumOf { it.trimp }

internal fun swimDistanceKm(activities: List<ActivityEntity>, start: LocalDate, end: LocalDate): Double =
    periodActivities(activities, start, end).filter { it.type.trim().uppercase().replace("_", "") in setOf("SWIM", "SWIMMING") }.sumOf { it.distanceKm }

/** Returns null when a ride has no TSS, since TRIMP is not interchangeable with TSS. */
internal fun currentWeekBikeTss(activities: List<ActivityEntity>, today: LocalDate): Double? {
    val start = today.with(DayOfWeek.MONDAY)
    val rides = activities.filter { Format.isRideType(it.type) && Format.localDate(it.startDate).let { d -> !d.isBefore(start) && !d.isAfter(today) } }
    if (rides.any { it.bikeTss == null || it.bikeTss <= 0.0 }) return null
    return rides.sumOf { it.bikeTss ?: 0.0 }
}

@Composable
internal fun DashboardSportMetrics(settings: AppSettings, analytics: AnalyticsBundle?, activities: List<ActivityEntity>, today: LocalDate, unit: DistanceUnit, sample: Boolean = false, previewSport: String? = null, onOpenAnalytics: ((String?) -> Unit)? = null) {
    val c = settings.customization
    val bike = analytics?.cycling
    val weekStart = today.with(DayOfWeek.MONDAY)
    val week = periodActivities(activities, weekStart, today)
    val runWeekKm = week.filter { it.type == "RUN" }.sumOf { it.distanceKm }
    val runAvgKm = periodActivities(activities, weekStart.minusWeeks(11), today).filter { it.type == "RUN" }.sumOf { it.distanceKm } / 12.0
    val bikeWeekKm = week.filter { Format.isRideType(it.type) }.sumOf { it.distanceKm }
    val running = listOfNotNull(
        ("VDOT" to (analytics?.effectiveVdot?.let { Format.oneDecimal(it) } ?: "—")).takeIf { DashboardMetric.RUN_VDOT in c.metrics },
        ("Week distance" to (analytics?.let { Format.distance(runWeekKm, unit) } ?: "—")).takeIf { DashboardMetric.RUN_WEEK_DISTANCE in c.metrics },
        ("Avg weekly distance" to (analytics?.let { Format.distance(runAvgKm, unit) } ?: "—")).takeIf { DashboardMetric.RUN_AVG_DISTANCE in c.metrics },
    )
    val cycling = listOfNotNull(
        ("VO2max" to (bike?.cyclingVo2max?.let { Format.oneDecimal(it) } ?: "—")).takeIf { DashboardMetric.BIKE_VO2MAX in c.metrics },
        ("FTP" to (bike?.let { (it.ftpWatts.takeIf { n -> n > 0 } ?: it.eFtpWatts)?.let { n -> "$n W" } } ?: "—")).takeIf { DashboardMetric.BIKE_FTP in c.metrics },
        ("W/kg" to (bike?.wPerKg?.let { Format.oneDecimal(it) } ?: "—")).takeIf { DashboardMetric.BIKE_WKG in c.metrics },
        ("Week distance" to (analytics?.let { Format.distance(bikeWeekKm, unit) } ?: "—")).takeIf { DashboardMetric.BIKE_WEEK_DISTANCE in c.metrics },
        ("Week TSS" to (if (analytics == null) "—" else currentWeekBikeTss(activities, today)?.let { Format.roundedIntOrDash(it) } ?: "—")).takeIf { DashboardMetric.BIKE_WEEK_TSS in c.metrics },
        ("Fitness" to Format.roundedIntOrDash(bike?.ctlBike)).takeIf { DashboardMetric.BIKE_FITNESS in c.metrics },
        ("Form" to Format.roundedIntOrDash(bike?.tsbBike)).takeIf { DashboardMetric.BIKE_FORM in c.metrics },
    )
    val swimWeekKm = swimDistanceKm(activities, weekStart, today)
    val swimming = listOfNotNull(("Week distance" to Format.distance(swimWeekKm, unit)).takeIf { DashboardMetric.SWIM_WEEK_DISTANCE in c.metrics })
    val sampleRun = listOf("VDOT" to "48.2", "Week distance" to if (unit == DistanceUnit.IMPERIAL) "18.6 mi" else "30.0 km", "Avg weekly distance" to if (unit == DistanceUnit.IMPERIAL) "21.7 mi" else "35.0 km")
    val sampleBike = listOf("VO2max" to "49.0", "FTP" to "240 W", "W/kg" to "3.4", "Week distance" to if (unit == DistanceUnit.IMPERIAL) "31.1 mi" else "50.0 km", "Week TSS" to "120", "Fitness" to "42", "Form" to "+3")
    val shownRun = if (sample) running.map { item -> item.first to (sampleRun.firstOrNull { it.first == item.first }?.second ?: item.second) } else running
    val shownBike = if (sample) cycling.map { item -> item.first to (sampleBike.firstOrNull { it.first == item.first }?.second ?: item.second) } else cycling
    when(c.layout) {
        DashboardLayout.RUNNING -> SportMetricCard("Running", shownRun, analytics, "volume", onOpenAnalytics)
        DashboardLayout.CYCLING -> SportMetricCard("Cycling", shownBike, analytics, "cycling", onOpenAnalytics)
        DashboardLayout.SEPARATE, DashboardLayout.HYBRID, DashboardLayout.TRIATHLON -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val sports = if (c.layout == DashboardLayout.TRIATHLON) listOf("Running", "Cycling", "Swimming") else listOf("Running", "Cycling")
            val ordered = if (previewSport in sports) listOf(previewSport!!) + sports.filter { it != previewSport } else sports
            ordered.forEach { sport -> when (sport) {
                "Running" -> SportMetricCard("Running", shownRun, analytics, "volume", onOpenAnalytics)
                "Cycling" -> SportMetricCard("Cycling", shownBike, analytics, "cycling", onOpenAnalytics)
                else -> SportMetricCard("Swimming", swimming, analytics, null, onOpenAnalytics)
            } }
        }
    }
}

@Composable
private fun SportMetricCard(title: String, metrics: List<Pair<String, String>>, analytics: AnalyticsBundle?, route: String?, onOpen: ((String?) -> Unit)?) {
    var expanded by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(if (title != "Swimming") Modifier.fillMaxWidth().clickable { expanded = !expanded } else Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(when(title) { "Running" -> Icons.Outlined.DirectionsRun; "Cycling" -> Icons.Outlined.DirectionsBike; else -> Icons.Outlined.Pool }, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(36.dp))
                Text("$title status", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (title != "Swimming") Icon(if (expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, if (expanded) "Collapse $title status" else "Expand $title status")
            }
            if (metrics.isEmpty()) Text("No metrics selected", style = MaterialTheme.typography.bodySmall)
            metrics.chunked(2).forEach { row -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (label, value) -> Row((if (route != null && onOpen != null) Modifier.weight(1f).clickable { onOpen(route) } else Modifier.weight(1f)).padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(when { label.contains("distance", ignoreCase = true) -> Icons.Outlined.Place; label == "FTP" || label == "W/kg" || label == "Week TSS" -> Icons.Outlined.Bolt; label == "VDOT" || label == "VO2max" -> Icons.Outlined.Favorite; else -> Icons.Outlined.Insights }, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(8.dp)).padding(5.dp))
                    Column(Modifier.weight(1f)) {
                        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                } }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            } }
            if (metrics.isNotEmpty() && route != null && onOpen != null) Text("Tap a metric for details", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (expanded && analytics != null && title != "Swimming") {
                HorizontalDivider()
                val runLatest = analytics.runFitnessSeries.lastOrNull()
                val fitness = if (title == "Cycling") analytics.cycling?.ctlBike else runLatest?.ctl
                val fatigue = if (title == "Cycling") analytics.cycling?.atlBike else runLatest?.atl
                val form = if (title == "Cycling") analytics.cycling?.tsbBike else runLatest?.tsb
                Text("Training load", style = MaterialTheme.typography.titleSmall)
                val maxFitness = if (title == "Cycling") analytics.cycling?.bikeFitnessSeries?.maxOfOrNull { it.ctl } else analytics.runFitnessSeries.maxOfOrNull { it.ctl }
                val maxFatigue = if (title == "Cycling") analytics.cycling?.bikeFitnessSeries?.maxOfOrNull { it.atl } else analytics.runFitnessSeries.maxOfOrNull { it.atl }
                LoadRow("Fitness", fitness, maxFitness, MaterialTheme.colorScheme.primary)
                LoadRow("Fatigue", fatigue, maxFatigue, MaterialTheme.colorScheme.tertiary)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Form (TSB)", style = MaterialTheme.typography.bodyMedium)
                    Text(Format.roundedIntOrDash(form), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                }
                Text("Bars relative to each recorded peak", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun LoadRow(label: String, value: Double?, peak: Double?, color: androidx.compose.ui.graphics.Color) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
        if (value != null && peak != null && peak > 0) {
            LinearProgressIndicator(progress = { (value / peak).coerceIn(0.0, 1.0).toFloat() }, modifier = Modifier.weight(1.2f), color = color)
        } else Spacer(Modifier.weight(1.2f))
        Text(Format.roundedIntOrDash(value), Modifier.widthIn(min = 32.dp), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = color, textAlign = androidx.compose.ui.text.style.TextAlign.End)
    }
}
