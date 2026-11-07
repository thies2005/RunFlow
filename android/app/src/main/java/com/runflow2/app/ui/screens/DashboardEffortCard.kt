package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.repo.AppSettings
import java.time.DayOfWeek
import java.time.LocalDate

internal fun effortRatio(actual: Double?, planned: Double?): Double? =
    if (actual != null && planned != null && actual.isFinite() && planned.isFinite() && planned > 0) actual / planned else null

@Composable
internal fun DashboardEffortCard(settings: AppSettings, activities: List<ActivityEntity>, workouts: List<WorkoutEntity>, today: LocalDate, unit: DistanceUnit) {
    val start = today.with(DayOfWeek.MONDAY)
    val current = periodActivities(activities, start, today)
    val distance = settings.effortCardMode == "LEGACY_KM"
    val plan = workouts.filter { val d = Format.localDate(it.scheduledDate); !d.isBefore(start) && d.isBefore(start.plusWeeks(1)) && it.workoutType != "REST" && (!distance || it.sport.equals("RUN", ignoreCase = true)) }
    val actual = if (distance) current.filter { it.type == "RUN" }.sumOf { it.distanceKm } else if (settings.primaryLoadMetric == "TRIMP") actualTrimp(current) else actualTss(current)
    val planned = plan.takeIf { it.isNotEmpty() && it.all { w -> if (distance) w.targetDistanceKm != null else w.plannedTss != null } }?.sumOf { if (distance) it.targetDistanceKm ?: 0.0 else it.plannedTss ?: 0.0 }?.takeIf { distance || settings.primaryLoadMetric != "TRIMP" }
    val actualText = if (distance) actual?.let { Format.distance(it, unit) } ?: "—" else Format.roundedIntOrDash(actual)
    val plannedText = if (distance) planned?.let { Format.distance(it, unit) } ?: "—" else Format.roundedIntOrDash(planned)
    val label = if (distance) "distance" else if (settings.primaryLoadMetric == "TRIMP") "TRIMP" else tssLabel(current)
    val ratio = effortRatio(actual, planned)
    val progress = ratio?.coerceIn(0.0, 1.0)?.toFloat()
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("This week", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("${Format.dateWithYear(start)} – ${Format.dateWithYear(start.plusDays(6))}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(actualText, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                    Text("of $plannedText planned · $label", style = MaterialTheme.typography.bodyMedium)
                    if (settings.primaryLoadMetric == "DUAL" && !distance) Text("TRIMP ${Format.roundedIntOrDash(actualTrimp(current))}", style = MaterialTheme.typography.bodySmall)
                }
                if (progress != null) Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxSize(), strokeWidth = 7.dp, trackColor = MaterialTheme.colorScheme.surfaceContainerHighest)
                    Text("${kotlin.math.round((ratio ?: 0.0) * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
                }
            }
            if (progress != null) LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
            if (settings.effortCardMode == "WEEK_AND_MONTH") {
                val month = periodActivities(activities, today.withDayOfMonth(1), today)
                val value = if (settings.primaryLoadMetric == "TRIMP") actualTrimp(month) else actualTss(month)
                val monthLabel = if (settings.primaryLoadMetric == "TRIMP") "TRIMP" else tssLabel(month)
                val monthPlan = workouts.filter { val d = Format.localDate(it.scheduledDate); d.year == today.year && d.month == today.month && it.workoutType != "REST" }
                val monthTarget = monthPlan.takeIf { it.isNotEmpty() && it.all { w -> w.plannedTss != null } && settings.primaryLoadMetric != "TRIMP" }?.sumOf { it.plannedTss ?: 0.0 }
                Text("This month: ${Format.roundedIntOrDash(value)} $monthLabel · planned TSS ${Format.roundedIntOrDash(monthTarget)}", style = MaterialTheme.typography.bodySmall)
                if (settings.primaryLoadMetric == "DUAL") Text("This month: ${Format.roundedIntOrDash(actualTrimp(month))} TRIMP", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
