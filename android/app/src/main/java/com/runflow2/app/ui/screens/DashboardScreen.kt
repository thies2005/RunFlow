package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.raceType
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.components.InfoChip
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.components.WorkoutVisuals
import com.runflow2.app.ui.components.color
import com.runflow2.app.domain.model.TsbStatus
import com.runflow2.app.domain.model.WorkoutType
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DashboardScreen(
    container: AppContainer,
    onOpenActivity: (String) -> Unit,
    onOpenAnalytics: () -> Unit,
    onStartWorkout: (String?) -> Unit,
    onCreatePlan: () -> Unit,
    onOpenActivities: () -> Unit,
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val today = androidx.compose.runtime.remember { LocalDate.now() }

    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val activeGoal by container.repository.activeGoal.collectAsState(initial = null)
    val workouts = activeGoal?.let { goal ->
        container.repository.workoutsForGoal(goal.id).collectAsState(initial = emptyList()).value
    } ?: emptyList()

    val analytics by produceState<AnalyticsBundle?>(null, activities) {
        value = container.repository.analytics(365)
    }

    val weekStart = today.with(DayOfWeek.MONDAY)
    val runsThisWeek = activities.count {
        val d = Format.localDate(it.startDate)
        !d.isBefore(weekStart) && !d.isAfter(today)
    }

    PullToRefreshBox(
        isRefreshing = false,
        onRefresh = {
            container.appScope.launch {
                container.repository.analytics(365)
            }
        },
        modifier = Modifier.fillMaxSize(),
    ) {
        Scaffold(
            topBar = {
                MediumFlexibleTopAppBar(
                    title = { Text("RunFlow") },
                    subtitle = { Text(Format.dateWithYear(today)) },
                    scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior(),
                )
            },
        ) { padding ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                // ---- This week hero ----
                item {
                    val a = analytics
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        "THIS WEEK",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                                    )
                                    Text(
                                        Format.distance(a?.currentWeekKm ?: 0.0, unit),
                                        style = MaterialTheme.typography.displaySmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                val weekGoal = activeGoal?.weeklyKmGoal
                                if (weekGoal != null && weekGoal > 0) {
                                    ProgressRing(
                                        progress = ((a?.currentWeekKm ?: 0.0) / weekGoal).toFloat(),
                                        modifier = Modifier.size(64.dp),
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                StatTile(
                                    label = "Runs",
                                    value = "$runsThisWeek",
                                    icon = Icons.Outlined.DirectionsRun,
                                )
                                StatTile(
                                    label = "VO₂ max",
                                    value = Format.oneDecimal(a?.effectiveVdot),
                                    icon = Icons.Outlined.MonitorHeart,
                                    accent = MaterialTheme.colorScheme.tertiary,
                                )
                                StatTile(
                                    label = "Fitness",
                                    value = Format.intOrDash(a?.ctl),
                                    icon = Icons.Outlined.Favorite,
                                    accent = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }

                // ---- Form / TSB quick card ----
                item {
                    val a = analytics
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .clickable { onOpenAnalytics() },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                Modifier
                                    .size(12.dp)
                                    .background((a?.tsbStatus ?: TsbStatus.NEUTRAL).color(), CircleShape),
                            )
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    "Form · ${(a?.tsbStatus ?: TsbStatus.NEUTRAL).label}",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    "CTL ${Format.intOrDash(a?.ctl)}  ·  ATL ${Format.intOrDash(a?.atl)}  ·  TSB ${if (a != null && a.tsb > 0) "+" else ""}${Format.intOrDash(a?.tsb)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Icon(Icons.Outlined.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                // ---- Race countdown ----
                if (activeGoal != null) {
                    item {
                        val goal = activeGoal!!
                        val raceDate = Format.localDate(goal.raceDate)
                        val daysToGo = ChronoUnit.DAYS.between(today, raceDate)
                        val done = workouts.count { it.isCompleted }
                        val total = workouts.size.coerceAtLeast(1)
                        val a = analytics
                        val projected = a?.effectiveVdot?.let { eff ->
                            (goal.customDistanceKm ?: goal.raceType().distanceKm)?.let { km ->
                                VdotMath.predictTimeSec(eff, km * 1000.0)?.toInt()
                            }
                        }
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(
                                        Icons.Outlined.EmojiEvents, null,
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(goal.name, style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            "${goal.raceType().label} · ${Format.dateWithYear(raceDate)}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "$daysToGo",
                                            style = MaterialTheme.typography.headlineMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary,
                                        )
                                        Text(
                                            if (daysToGo == 1L) "day to go" else "days to go",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }

                                LinearProgressIndicator(
                                    progress = { done.toFloat() / total },
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                Text(
                                    "$done of $total workouts completed",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )

                                if (goal.targetTimeSec != null) {
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column {
                                            Text("Target", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(Format.duration(goal.targetTimeSec), style = MaterialTheme.typography.titleMedium)
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Projected", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(
                                                projected?.let { Format.duration(it) } ?: "—",
                                                style = MaterialTheme.typography.titleMedium,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCreatePlan() },
                        ) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Flag, null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("No active goal", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        "Build a personalized training plan",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Icon(Icons.Outlined.Add, null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }

                // ---- Today's workout ----
                val todayWorkouts = workouts.filter { Format.localDate(it.scheduledDate) == today }
                if (todayWorkouts.isNotEmpty()) {
                    item {
                        SectionTitle("Today")
                        Spacer(Modifier.height(8.dp))
                        todayWorkouts.forEach { w ->
                            val type = runCatching { WorkoutType.valueOf(w.workoutType) }.getOrDefault(WorkoutType.EASY)
                            val visual = WorkoutVisuals.forType(type)
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp),
                            ) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            Modifier
                                                .size(40.dp)
                                                .background(WorkoutVisuals.containerFor(type, true), CircleShape),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(visual.icon, type.label, tint = visual.color)
                                        }
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(type.label, style = MaterialTheme.typography.titleMedium)
                                            Text(
                                                w.description,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 2,
                                            )
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        w.targetDistanceKm?.let {
                                            InfoChip(Format.distance(it, unit), icon = Icons.Outlined.DirectionsRun)
                                        }
                                        w.targetPaceSecPerKm?.let {
                                            InfoChip("${Format.pace(it.toDouble(), unit)} /${Format.distanceUnitLabel(unit)}", icon = Icons.Outlined.Speed)
                                        }
                                        w.targetDurationSec?.let {
                                            InfoChip(Format.duration(it), icon = Icons.Outlined.Timer)
                                        }
                                    }
                                    if (!w.isCompleted && type != WorkoutType.REST) {
                                        Button(
                                            onClick = { onStartWorkout(w.id) },
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Icon(Icons.Outlined.PlayArrow, null)
                                            Spacer(Modifier.width(6.dp))
                                            Text("Start workout")
                                        }
                                    } else if (w.isCompleted) {
                                        InfoChip(
                                            "Completed",
                                            container = MaterialTheme.colorScheme.secondaryContainer,
                                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ---- Recent activities ----
                item {
                    SectionTitle(
                        "Recent activities",
                        trailing = {
                            TextButton(onClick = onOpenActivities) { Text("All") }
                        },
                    )
                }
                val recent = activities.take(5)
                items(recent, key = { it.id }) { a ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenActivity(a.id) },
                    ) {
                        Row(
                            Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            val type = runCatching { WorkoutType.valueOf(a.trainingType ?: "EASY") }
                                .getOrDefault(WorkoutType.EASY)
                            val visual = WorkoutVisuals.forType(type)
                            Box(
                                Modifier
                                    .size(40.dp)
                                    .background(WorkoutVisuals.containerFor(type, true), CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(visual.icon, null, tint = visual.color)
                            }
                            Column(Modifier.weight(1f)) {
                                Text(
                                    a.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    maxLines = 1,
                                )
                                Text(
                                    "${Format.distance(a.distanceKm, unit)} · ${Format.duration(a.movingTimeSec)} · ${Format.paceWithUnit(a.paceSecPerKm, unit)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                Format.relativeDay(Format.localDate(a.startDate), today),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // ---- Weekly volume mini ----
                item {
                    analytics?.let { a ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                SectionTitle("Weekly volume")
                                Spacer(Modifier.height(12.dp))
                                WeeklyVolumeBars(
                                    weeks = a.weeklyVolume.takeLast(16),
                                    unitLabel = Format.distanceUnitLabel(unit),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
