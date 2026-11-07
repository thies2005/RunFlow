package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.data.repo.*
import com.runflow2.app.domain.analytics.AnalyticsBundle
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun CustomizationEditor(container: AppContainer, onDismiss: () -> Unit) {
    val scope = container.appScope
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val goal by container.repository.activeGoal.collectAsState(initial = null)
    val workouts = goal?.let { container.repository.workoutsForGoal(it.id).collectAsState(initial = emptyList()).value } ?: emptyList()
    val analytics by produceState<AnalyticsBundle?>(null, activities, settings.primaryLoadMetric, settings.ftpWatts, settings.autoEstimateFtp, settings.includeCrossTraining, settings.effectiveVo2maxCorrection) { value = container.repository.analytics(365) }
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val todayEntry by container.repository.dailyEntryFlow(LocalDate.now()).collectAsState(initial = null)
    val c = settings.customization
    var previewFocus by remember { mutableStateOf(DashboardWidget.EFFORT) }
    var previewSport by remember { mutableStateOf<String?>(null) }
    var previewRevision by remember { mutableIntStateOf(0) }
    fun focus(widget: DashboardWidget) { previewFocus = widget; previewRevision++ }
    val previewScroll = rememberScrollState()
    LaunchedEffect(previewRevision) { previewScroll.scrollTo(0) }
    val today = LocalDate.now()
    val todayWorkouts = workouts.filter { com.runflow2.app.core.util.Format.localDate(it.scheduledDate) == today }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Scaffold(topBar = { TopAppBar(title = { Text("Edit widgets") }, actions = { TextButton(onClick = onDismiss) { Text("Done") } }) }) { padding ->
            Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
                Column(Modifier.fillMaxWidth().heightIn(max = 250.dp).verticalScroll(previewScroll).padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Live preview", style = MaterialTheme.typography.titleMedium)
                Text("Your current data and device settings", style = MaterialTheme.typography.bodySmall)
                val orderedWidgets = listOf(previewFocus) + DashboardWidget.values().filter { it != previewFocus }
                orderedWidgets.filter { it in c.visibleWidgets }.forEach { widget ->
                    when (widget) {
                        DashboardWidget.EFFORT -> DashboardEffortCard(settings, activities, workouts, today, unit)
                        DashboardWidget.SPORT -> DashboardSportMetrics(settings, analytics, activities, today, unit, previewSport = previewSport)
                        DashboardWidget.RECOVERY -> PreviewLine("Recovery", todayEntry?.score?.let { "${it.toInt()}" } ?: "—")
                        DashboardWidget.FORM -> PreviewLine("Form", analytics?.tsbStatus?.label ?: "—")
                        DashboardWidget.PLAN -> PlanPreview(goal, workouts, c.countdownStyle)
                        DashboardWidget.WORKOUT -> WorkoutPreview(todayWorkouts, c.workoutStyle, unit)
                    }
                }
                if (c.visibleWidgets.isEmpty()) Text("All widgets are hidden. Turn one on below.")
                }
                HorizontalDivider()
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Presets", style = MaterialTheme.typography.titleMedium)
                Text("Choose a starting point, then adjust individual metrics.", style = MaterialTheme.typography.bodySmall)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    val presets = listOf(DashboardLayout.RUNNING to "Running", DashboardLayout.CYCLING to "Cycling", DashboardLayout.TRIATHLON to "Triathlon")
                    presets.forEachIndexed { index, (value, label) ->
                        SegmentedButton(selected = c.layout == value, onClick = { previewSport = null; focus(DashboardWidget.SPORT); scope.launch { container.settings.applyDashboardPreset(value) } }, shape = SegmentedButtonDefaults.itemShape(index, presets.size)) { Text(label, maxLines = 1) }
                    }
                }
                Text("Show widgets", style = MaterialTheme.typography.titleMedium)
                DashboardWidget.values().forEach { widget ->
                    val label = when(widget) { DashboardWidget.EFFORT -> "Effort"; DashboardWidget.SPORT -> "Sport status"; DashboardWidget.RECOVERY -> "Recovery"; DashboardWidget.FORM -> "Form"; DashboardWidget.PLAN -> "Plan and countdown"; DashboardWidget.WORKOUT -> "Today's workout" }
                    ToggleRow(label, widget in c.visibleWidgets) { focus(widget); scope.launch { container.settings.setDashboardWidget(widget, it) } }
                }
                Text("Metrics", style = MaterialTheme.typography.titleMedium)
                DashboardMetric.values().forEach { metric ->
                    val label = when(metric) {
                        DashboardMetric.RUN_VDOT -> "Running · VDOT"; DashboardMetric.RUN_WEEK_DISTANCE -> "Running · week distance"; DashboardMetric.RUN_AVG_DISTANCE -> "Running · average weekly distance"
                        DashboardMetric.BIKE_VO2MAX -> "Cycling · VO2max"; DashboardMetric.BIKE_FTP -> "Cycling · FTP"; DashboardMetric.BIKE_WKG -> "Cycling · W/kg"; DashboardMetric.BIKE_WEEK_DISTANCE -> "Cycling · week distance"; DashboardMetric.BIKE_WEEK_TSS -> "Cycling · week TSS"; DashboardMetric.BIKE_FITNESS -> "Cycling · fitness"; DashboardMetric.BIKE_FORM -> "Cycling · form"; DashboardMetric.SWIM_WEEK_DISTANCE -> "Swimming · week distance"
                    }
                    ToggleRow(label, metric in c.metrics) { previewSport = when { metric.name.startsWith("BIKE_") -> "Cycling"; metric.name.startsWith("SWIM_") -> "Swimming"; else -> "Running" }; focus(DashboardWidget.SPORT); scope.launch { container.settings.setDashboardMetric(metric, it) } }
                }
                Text("Workout cards", style = MaterialTheme.typography.titleMedium)
                WorkoutCardStyle.values().forEach { value -> ChoiceRow(if (value == WorkoutCardStyle.COMPACT) "Compact" else "Detailed", c.workoutStyle == value) { focus(DashboardWidget.WORKOUT); scope.launch { container.settings.setWorkoutCardStyle(value) } } }
                Text("Race countdown", style = MaterialTheme.typography.titleMedium)
                CountdownStyle.values().forEach { value -> ChoiceRow(if (value == CountdownStyle.BAR) "Compact bar" else "Two boxes", c.countdownStyle == value) { focus(DashboardWidget.PLAN); scope.launch { container.settings.setCountdownStyle(value) } } }
                Text("Effort card", style = MaterialTheme.typography.titleMedium)
                listOf("WEEK_AND_MONTH" to "Week + month", "WEEK_ONLY" to "Week only", "LEGACY_KM" to "Distance").forEach { (value, label) -> ChoiceRow(label, settings.effortCardMode == value) { focus(DashboardWidget.EFFORT); scope.launch { container.settings.setEffortCardMode(value) } } }
                Text("These choices stay on this device.", style = MaterialTheme.typography.bodySmall)
                OutlinedButton(onClick = { scope.launch { container.settings.resetDashboardCustomization() } }) { Text("Reset customization") }
                }
            }
        }
    }
}

@Composable
private fun ChoiceRow(label: String, selected: Boolean, onSelect: () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).selectable(selected = selected, onClick = onSelect, role = Role.RadioButton), verticalAlignment = Alignment.CenterVertically) {
        RadioButton(selected = selected, onClick = null); Text(label, Modifier.padding(start = 8.dp))
    }
}
@Composable
private fun ToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).toggleable(value = checked, role = Role.Switch, onValueChange = onChange), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f)); Switch(checked = checked, onCheckedChange = null)
    }
}

@Composable
private fun PreviewLine(label: String, value: String) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) { Text(label); Spacer(Modifier.width(12.dp)); Text(value, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End) }
    }
}

@Composable
private fun PlanPreview(goal: com.runflow2.app.data.db.GoalEntity?, workouts: List<com.runflow2.app.data.db.WorkoutEntity>, style: CountdownStyle) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(goal?.name ?: "No active goal", style = MaterialTheme.typography.titleSmall)
            if (goal != null) {
                val days = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), com.runflow2.app.core.util.Format.localDate(goal.raceDate))
                val done = workouts.count { it.isCompleted }
                if (style == CountdownStyle.BOXES) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("$days days to go", Modifier.weight(1f)); Text("$done / ${workouts.size} workouts", Modifier.weight(1f))
                    }
                } else {
                    Text("$days days to go · $done / ${workouts.size} workouts")
                    if (workouts.isNotEmpty()) LinearProgressIndicator(progress = { done.toFloat() / workouts.size }, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun WorkoutPreview(workouts: List<com.runflow2.app.data.db.WorkoutEntity>, style: WorkoutCardStyle, unit: DistanceUnit) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Today’s workout", style = MaterialTheme.typography.titleSmall)
            if (workouts.isEmpty()) Text("No workout scheduled")
            workouts.forEach { workout ->
                Text(workout.workoutType.replace('_', ' '))
                if (style == WorkoutCardStyle.DETAILED) Text(com.runflow2.app.core.util.Format.workoutInstructions(workout.description, unit, workout.webWorkoutType != null), style = MaterialTheme.typography.bodySmall)
                workout.targetDistanceKm?.let { Text(com.runflow2.app.core.util.Format.distance(it, unit), style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}
