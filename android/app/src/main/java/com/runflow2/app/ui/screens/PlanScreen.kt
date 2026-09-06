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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.GoalEntity
import com.runflow2.app.data.db.WorkoutEntity
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.raceType
import com.runflow2.app.domain.model.PlanPhase
import com.runflow2.app.domain.model.WorkoutType
import com.runflow2.app.ui.components.InfoChip
import com.runflow2.app.ui.components.WorkoutVisuals
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PlanScreen(
    container: AppContainer,
    onCreatePlan: () -> Unit,
    onOpenActivity: (String) -> Unit,
    onStartWorkout: (String) -> Unit = {},
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val scope = rememberCoroutineScope()
    val today = remember { LocalDate.now() }

    val goal by container.repository.activeGoal.collectAsState(initial = null)
    val workouts = goal?.let { g ->
        container.repository.workoutsForGoal(g.id).collectAsState(initial = emptyList()).value
    } ?: emptyList()

    var selectedWorkout by remember { mutableStateOf<WorkoutEntity?>(null) }
    var showRaceResult by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text("Training Plan") },
                actions = {
                    if (goal != null) {
                        IconButton(onClick = onCreatePlan) {
                            Icon(Icons.Outlined.Add, contentDescription = "New plan")
                        }
                    }
                },
                scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior(),
            )
        },
    ) { padding ->
        if (goal == null) {
            EmptyPlanState(Modifier.padding(padding), onCreatePlan)
        } else {
            val g = goal!!
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    GoalHeaderCard(
                        goalName = g.name,
                        raceLabel = g.raceType().label,
                        raceDate = Format.localDate(g.raceDate),
                        daysToGo = ChronoUnit.DAYS.between(today, Format.localDate(g.raceDate)),
                        done = workouts.count { it.isCompleted },
                        total = workouts.size,
                        weeklyKm = g.weeklyKmGoal,
                        targetTime = g.targetTimeSec,
                        unit = unit,
                        onRecordResult = { showRaceResult = true },
                    )
                }

                val firstWeek = workouts.minOfOrNull { Format.localDate(it.scheduledDate) }?.with(DayOfWeek.MONDAY)
                val grouped = workouts
                    .groupBy { Format.localDate(it.scheduledDate).with(DayOfWeek.MONDAY) }
                    .toSortedMap()
                grouped.forEach { (weekMonday, weekWorkouts) ->
                    item(key = "week_$weekMonday") {
                        val phase = weekWorkouts.firstOrNull()
                            ?.let { runCatching { PlanPhase.valueOf(it.phase) }.getOrNull() }
                        WeekHeader(
                            weekNumber = if (firstWeek != null)
                                ChronoUnit.WEEKS.between(firstWeek, weekMonday).toInt() + 1 else 1,
                            phase = phase,
                            totalKm = weekWorkouts.sumOf { it.targetDistanceKm ?: 0.0 },
                            unit = unit,
                            isCurrent = weekMonday == today.with(DayOfWeek.MONDAY),
                        )
                    }
                    weekWorkouts.sortedBy { it.scheduledDate }.forEach { w ->
                        item(key = w.id) {
                            WorkoutCard(
                                workout = w,
                                today = today,
                                unit = unit,
                                onClick = { selectedWorkout = w },
                            )
                        }
                    }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    // ---- workout action sheet ----
    selectedWorkout?.let { selected ->
        val liveWorkout = workouts.firstOrNull { it.id == selected.id } ?: selected
        ModalBottomSheet(onDismissRequest = { selectedWorkout = null }) {
            WorkoutActionSheet(
                workout = liveWorkout,
                unit = unit,
                onStart = {
                    selectedWorkout = null
                    onStartWorkout(liveWorkout.id)
                },
                onComplete = {
                    scope.launch { container.repository.completeWorkout(liveWorkout.id, null) }
                    selectedWorkout = null
                },
                onUncomplete = {
                    scope.launch { container.repository.uncompleteWorkout(liveWorkout.id) }
                    selectedWorkout = null
                },
                onShift = { days ->
                    scope.launch { container.repository.shiftWorkoutDate(liveWorkout.id, days) }
                },
                onDelete = {
                    scope.launch { container.repository.deleteWorkout(liveWorkout.id) }
                    selectedWorkout = null
                },
                onSaveEdit = { updated ->
                    scope.launch { container.repository.saveWorkout(updated) }
                    selectedWorkout = null
                },
            )
        }
    }

    // ---- race result dialog ----
    if (showRaceResult && goal != null) {
        RaceResultDialog(
            goal = goal!!,
            container = container,
            onDismiss = { showRaceResult = false },
        )
    }
}

@Composable
private fun EmptyPlanState(modifier: Modifier, onCreatePlan: () -> Unit) {
    Column(
        modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.EmojiEvents,
            null,
            modifier = Modifier.size(72.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.height(16.dp))
        Text("No training plan yet", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))
        Text(
            "Create a personalized plan for your next race — phased training, long-run progression, and pace targets from your VDOT.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onCreatePlan) {
            Icon(Icons.Outlined.Add, null)
            Spacer(Modifier.width(8.dp))
            Text("Create your plan")
        }
    }
}

@Composable
private fun GoalHeaderCard(
    goalName: String,
    raceLabel: String,
    raceDate: LocalDate,
    daysToGo: Long,
    done: Int,
    total: Int,
    weeklyKm: Double,
    targetTime: Int?,
    unit: DistanceUnit,
    onRecordResult: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.EmojiEvents, null)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(goalName, style = MaterialTheme.typography.titleLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("$raceLabel · ${Format.dateWithYear(raceDate)}", style = MaterialTheme.typography.bodyMedium)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("$daysToGo", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text(if (daysToGo == 1L) "day" else "days", style = MaterialTheme.typography.labelMedium)
                }
            }
            LinearProgressIndicator(
                progress = { if (total > 0) done.toFloat() / total else 0f },
                modifier = Modifier.fillMaxWidth(),
            )
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("$done / $total workouts · ${Format.distance(weeklyKm, unit)}/wk")
                if (targetTime != null) {
                    Text("Target ${Format.duration(targetTime)}")
                }
            }
            if (daysToGo <= 2) {
                TextButton(onClick = onRecordResult) {
                    Icon(Icons.Outlined.Check, null)
                    Spacer(Modifier.width(6.dp))
                    Text("Record race result")
                }
            }
        }
    }
}

@Composable
private fun WeekHeader(
    weekNumber: Int,
    phase: PlanPhase?,
    totalKm: Double,
    unit: DistanceUnit,
    isCurrent: Boolean,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(top = 14.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Week $weekNumber", style = MaterialTheme.typography.titleMedium)
                if (isCurrent) {
                    InfoChip(
                        "Current",
                        container = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
            }
            if (phase != null) {
                Text(
                    "${phase.label} phase",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            Format.distance(totalKm, unit),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun WorkoutCard(
    workout: WorkoutEntity,
    today: LocalDate,
    unit: DistanceUnit,
    onClick: () -> Unit,
) {
    val type = runCatching { WorkoutType.valueOf(workout.workoutType) }.getOrDefault(WorkoutType.EASY)
    val visual = WorkoutVisuals.forType(type)
    val date = Format.localDate(workout.scheduledDate)
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (date == today) MaterialTheme.colorScheme.surfaceContainerHigh
            else MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(42.dp)
                    .background(WorkoutVisuals.containerFor(type, true), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(visual.icon, type.label, tint = visual.color, modifier = Modifier.size(21.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        type.label,
                        style = MaterialTheme.typography.titleSmall,
                        textDecoration = if (workout.isCompleted) TextDecoration.LineThrough else null,
                    )
                    if (workout.isCompleted) {
                        Icon(
                            Icons.Outlined.Check, "Completed",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
                Text(
                    workout.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                    workout.targetDistanceKm?.let {
                        InfoChip(Format.distance(it, unit))
                    }
                    workout.targetPaceSecPerKm?.let {
                        InfoChip("${Format.pace(it.toDouble(), unit)} /${Format.distanceUnitLabel(unit)}")
                    }
                }
            }
            Text(
                Format.relativeDay(date, today),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutActionSheet(
    workout: WorkoutEntity,
    unit: DistanceUnit,
    onStart: () -> Unit,
    onComplete: () -> Unit,
    onUncomplete: () -> Unit,
    onShift: (Int) -> Unit,
    onDelete: () -> Unit,
    onSaveEdit: (WorkoutEntity) -> Unit,
) {
    val type = runCatching { WorkoutType.valueOf(workout.workoutType) }.getOrDefault(WorkoutType.EASY)
    val visual = WorkoutVisuals.forType(type)
    var editMode by remember { mutableStateOf(false) }

    Column(
        Modifier
            .padding(horizontal = 20.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(visual.icon, null, tint = visual.color)
            Spacer(Modifier.width(10.dp))
            Column {
                Text(type.label, style = MaterialTheme.typography.titleMedium)
                Text(
                    Format.relativeDay(Format.localDate(workout.scheduledDate)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(workout.description, style = MaterialTheme.typography.bodyMedium)

        if (!editMode) {
            if (!workout.isCompleted && type != WorkoutType.REST) {
                Button(onClick = onStart, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.PlayArrow, null)
                    Spacer(Modifier.width(6.dp))
                    Text("Start this workout")
                }
            }
            if (!workout.isCompleted) {
                TextButton(onClick = onComplete, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.Check, null)
                    Spacer(Modifier.width(6.dp))
                    Text("Mark complete")
                }
            } else {
                TextButton(onClick = onUncomplete, modifier = Modifier.fillMaxWidth()) {
                    Text("Mark as not done")
                }
            }
            TextButton(onClick = { editMode = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Edit, null)
                Spacer(Modifier.width(6.dp))
                Text("Edit targets")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { onShift(-1) }, modifier = Modifier.weight(1f)) { Text("◀ Day earlier") }
                TextButton(onClick = { onShift(1) }, modifier = Modifier.weight(1f)) { Text("Day later ▶") }
            }
            TextButton(
                onClick = onDelete,
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                Icon(Icons.Outlined.Delete, null)
                Spacer(Modifier.width(6.dp))
                Text("Delete workout")
            }
        } else {
            EditWorkoutFields(workout = workout, onSave = onSaveEdit, onCancel = { editMode = false })
        }
    }
}

@Composable
private fun EditWorkoutFields(
    workout: WorkoutEntity,
    onSave: (WorkoutEntity) -> Unit,
    onCancel: () -> Unit,
) {
    var desc by remember(workout.id) { mutableStateOf(workout.description) }
    var kmText by remember(workout.id) {
        mutableStateOf(workout.targetDistanceKm?.let { "%.1f".format(it) } ?: "")
    }
    var paceText by remember(workout.id) {
        mutableStateOf(workout.targetPaceSecPerKm?.let { Format.pace(it.toDouble()) } ?: "")
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(
            value = desc,
            onValueChange = { desc = it },
            label = { Text("Description") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = kmText,
                onValueChange = { kmText = it },
                label = { Text("Distance (km)") },
                modifier = Modifier.weight(1f),
            )
            OutlinedTextField(
                value = paceText,
                onValueChange = { paceText = it },
                label = { Text("Pace (m:ss)") },
                modifier = Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            androidx.compose.material3.OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) {
                Text("Cancel")
            }
            Button(
                onClick = {
                    val km = kmText.toDoubleOrNull()
                    val pace = parsePace(paceText)
                    onSave(
                        workout.copy(
                            description = desc.ifBlank { workout.description },
                            targetDistanceKm = km ?: workout.targetDistanceKm,
                            targetPaceSecPerKm = pace ?: workout.targetPaceSecPerKm,
                        ),
                    )
                },
                modifier = Modifier.weight(1f),
                enabled = desc.isNotBlank(),
            ) {
                Text("Save")
            }
        }
    }
}

/** Parses "4:35", "4:35:00" or "275" into seconds. */
fun parsePace(text: String): Int? {
    val t = text.trim()
    if (t.isEmpty()) return null
    if (!t.contains(':')) return t.toIntOrNull()
    val parts = t.split(':').mapNotNull { it.toIntOrNull() }
    if (parts.size == 2) return parts[0] * 60 + parts[1]
    if (parts.size == 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return null
}

/** Parses "HH:MM:SS" or "MM:SS" into seconds. */
fun parseDuration(text: String): Int? {
    val t = text.trim()
    if (t.isEmpty()) return null
    val parts = t.split(':').mapNotNull { it.toIntOrNull() }
    if (parts.size == 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.size == 2) return parts[0] * 60 + parts[1]
    return t.toIntOrNull()
}

@Composable
private fun RaceResultDialog(
    goal: GoalEntity,
    container: AppContainer,
    onDismiss: () -> Unit,
) {
    var timeText by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val raceType = goal.raceType()
    val raceKm = goal.customDistanceKm ?: raceType.distanceKm

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Race result") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("${goal.name} · ${raceType.label}")
                OutlinedTextField(
                    value = timeText,
                    onValueChange = { timeText = it; error = false },
                    label = { Text("Finish time (h:mm:ss)") },
                    isError = error,
                    supportingText = if (error) {
                        { Text("Enter a valid time like 3:45:10") }
                    } else null,
                )
                Text(
                    "Recording your result recalibrates your VDOT and completes the goal.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val sec = parseDuration(timeText)
                    if (sec == null || sec < 300) {
                        error = true
                    } else {
                        scope.launch {
                            if (raceKm != null) {
                                val vdot = VdotMath.vdot(raceKm * 1000.0, sec.toDouble())
                                val profile = container.repository.profileOnce()
                                val raw = container.repository.analytics(365).rawVdot
                                val newCorrection = if (raw != null && raw > 20) (vdot / raw).coerceIn(0.8, 1.25)
                                else 1.0
                                container.repository.saveProfile(
                                    profile.copy(vdotCorrection = newCorrection),
                                )
                            }
                            container.repository.completeGoal(goal.id)
                            onDismiss()
                        }
                    }
                },
            ) { Text("Save result") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
