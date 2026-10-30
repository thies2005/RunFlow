package com.runflow2.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.KeyboardArrowUp
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.domain.person.Personalization.PaceLetter
import com.runflow2.app.domain.plan.StructuredWorkoutBuilder
import com.runflow2.app.domain.plan.StructuredWorkoutBuilder.PACE_LETTERS
import com.runflow2.app.domain.plan.structured.Duration
import com.runflow2.app.domain.plan.structured.RepeatGroup
import com.runflow2.app.domain.plan.structured.StepNode
import com.runflow2.app.domain.plan.structured.StructuredStep
import com.runflow2.app.domain.plan.structured.StructuredWorkoutV2
import com.runflow2.app.domain.plan.structured.Target
import com.runflow2.app.domain.plan.structured.flattenStructuredWorkout
import com.runflow2.app.domain.plan.toDraft
import com.runflow2.app.domain.plan.vdotFromThresholdPaceSecPerKm
import com.runflow2.app.ui.theme.semanticColors
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StructuredEditorScreen(
    container: AppContainer,
    workoutId: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    var loaded by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf(true) }
    var vdot by remember { mutableStateOf(50.0) }
    var ftpWatts by remember { mutableStateOf(200) }
    var rootNodes by remember { mutableStateOf<List<StepNode>>(emptyList()) }
    var saving by remember { mutableStateOf(false) }

    LaunchedEffect(workoutId) {
        val workout = container.repository.workout(workoutId)
        if (workout == null) {
            found = false
            loaded = true
            return@LaunchedEffect
        }
        val profile = container.repository.profileOnce()
        val v = container.repository.goal(workout.goalId)?.vdotAtCreation
            ?: vdotFromThresholdPaceSecPerKm(profile.thresholdPaceSecPerKm.toDouble())
            ?: 50.0
        vdot = v
        ftpWatts = settings.ftpWatts.takeIf { it > 0 } ?: 200

        val rawJson = workout.structuredStepsJson
        val jsonParser = Json { ignoreUnknownKeys = true; isLenient = true }
        val decodedV2 = if (!rawJson.isNullOrBlank()) {
            runCatching {
                jsonParser.decodeFromString(StructuredWorkoutV2.serializer(), rawJson)
            }.getOrNull()
        } else null

        if (decodedV2 != null && decodedV2.steps.isNotEmpty()) {
            rootNodes = decodedV2.steps
        } else {
            // Check legacy builder draft or initialize defaults
            val paceTable = PACE_LETTERS.associateWith { Personalization.trainingPaces(v).target(it) }
            val legacyDraft = if (!rawJson.isNullOrBlank()) {
                StructuredWorkoutBuilder.decode(rawJson, paceTable)
            } else null
            val draft = legacyDraft ?: Personalization.structuredEditorDefaults(v).toDraft()

            val initialNodes = mutableListOf<StepNode>()
            if (draft.warmup.distanceM > 0) {
                initialNodes.add(
                    StructuredStep(
                        kind = "warmup",
                        label = "Warm-up",
                        duration = Duration.Distance(draft.warmup.distanceM.toDouble()),
                        target = Target.Pace(zoneLabel = draft.warmup.pace.name),
                    )
                )
            }
            draft.main.forEach { m ->
                val innerSteps = mutableListOf<StepNode>(
                    StructuredStep(
                        kind = "work",
                        label = "Interval",
                        duration = Duration.Distance(m.distanceM.toDouble()),
                        target = Target.Pace(zoneLabel = m.pace.name),
                    )
                )
                if (m.restSeconds > 0) {
                    innerSteps.add(
                        StructuredStep(
                            kind = "recovery",
                            label = "Rest",
                            duration = Duration.Time(m.restSeconds),
                            target = Target.Free,
                        )
                    )
                }
                initialNodes.add(
                    RepeatGroup(
                        times = m.reps.coerceAtLeast(1),
                        steps = innerSteps,
                    )
                )
            }
            if (draft.cooldown.distanceM > 0) {
                initialNodes.add(
                    StructuredStep(
                        kind = "cooldown",
                        label = "Cool-down",
                        duration = Duration.Distance(draft.cooldown.distanceM.toDouble()),
                        target = Target.Pace(zoneLabel = draft.cooldown.pace.name),
                    )
                )
            }
            rootNodes = initialNodes
        }
        loaded = true
    }

    val paceTargets = remember(vdot) {
        PACE_LETTERS.associateWith { Personalization.trainingPaces(vdot).target(it) }
    }

    val currentWorkoutV2 = remember(rootNodes) {
        StructuredWorkoutV2(version = 2, source = "manual", steps = rootNodes)
    }

    // Live summary: total distance, duration, estimated TSS
    val summary = remember(currentWorkoutV2, paceTargets, ftpWatts) {
        calculateSummary(currentWorkoutV2, paceTargets, ftpWatts)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Structured Workout Editor") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            saving = true
                            val jsonString = Json {
                                ignoreUnknownKeys = true
                                encodeDefaults = true
                            }.encodeToString(StructuredWorkoutV2.serializer(), currentWorkoutV2)

                            scope.launch {
                                try {
                                    container.repository.saveStructuredSteps(workoutId, jsonString)
                                    Toast.makeText(container.appContext, "Workout saved", Toast.LENGTH_SHORT).show()
                                    onBack()
                                } catch (e: Exception) {
                                    saving = false
                                    Toast.makeText(container.appContext, "Save failed: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        enabled = !saving && rootNodes.isNotEmpty(),
                    ) {
                        Text(if (saving) "Saving…" else "Save", fontWeight = FontWeight.Bold)
                    }
                },
            )
        },
    ) { padding ->
        if (!loaded) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }
        if (!found) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Workout not found", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Live Summary Header
            item {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            "Workout Overview",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text("Distance", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    Format.distance(summary.totalDistanceKm, unit),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Column {
                                Text("Est. Time", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    Format.duration(summary.totalDurationSec),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Column {
                                Text("Est. Load", style = MaterialTheme.typography.bodySmall)
                                Text(
                                    "${summary.estimatedTss} TSS",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }

            // Steps Tree
            itemsIndexed(rootNodes) { index, node ->
                when (node) {
                    is StructuredStep -> {
                        StepCard(
                            step = node,
                            paceTargets = paceTargets,
                            canMoveUp = index > 0,
                            canMoveDown = index < rootNodes.lastIndex,
                            onMoveUp = {
                                val list = rootNodes.toMutableList()
                                val item = list.removeAt(index)
                                list.add(index - 1, item)
                                rootNodes = list
                            },
                            onMoveDown = {
                                val list = rootNodes.toMutableList()
                                val item = list.removeAt(index)
                                list.add(index + 1, item)
                                rootNodes = list
                            },
                            onDelete = {
                                val list = rootNodes.toMutableList()
                                list.removeAt(index)
                                rootNodes = list
                            },
                            onChange = { updated ->
                                val list = rootNodes.toMutableList()
                                list[index] = updated
                                rootNodes = list
                            },
                        )
                    }
                    is RepeatGroup -> {
                        RepeatGroupCard(
                            group = node,
                            paceTargets = paceTargets,
                            canMoveUp = index > 0,
                            canMoveDown = index < rootNodes.lastIndex,
                            onMoveUp = {
                                val list = rootNodes.toMutableList()
                                val item = list.removeAt(index)
                                list.add(index - 1, item)
                                rootNodes = list
                            },
                            onMoveDown = {
                                val list = rootNodes.toMutableList()
                                val item = list.removeAt(index)
                                list.add(index + 1, item)
                                rootNodes = list
                            },
                            onDelete = {
                                val list = rootNodes.toMutableList()
                                list.removeAt(index)
                                rootNodes = list
                            },
                            onChange = { updated ->
                                val list = rootNodes.toMutableList()
                                list[index] = updated
                                rootNodes = list
                            },
                        )
                    }
                }
            }

            // Add Node Buttons
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = {
                            val newStep = StructuredStep(
                                kind = "work",
                                label = "Step",
                                duration = Duration.Distance(1000.0),
                                target = Target.Pace(zoneLabel = "M"),
                            )
                            rootNodes = rootNodes + newStep
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Add Step")
                    }

                    OutlinedButton(
                        onClick = {
                            val newRepeat = RepeatGroup(
                                times = 4,
                                steps = listOf(
                                    StructuredStep(
                                        kind = "work",
                                        label = "Interval",
                                        duration = Duration.Distance(400.0),
                                        target = Target.Pace(zoneLabel = "I"),
                                    ),
                                    StructuredStep(
                                        kind = "recovery",
                                        label = "Rest",
                                        duration = Duration.Time(60),
                                        target = Target.Free,
                                    ),
                                ),
                            )
                            rootNodes = rootNodes + newRepeat
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Outlined.Repeat, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Add Repeat")
                    }
                }
            }

            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

// -------------------------------------------------------------------
// Summary Calculation
// -------------------------------------------------------------------

private data class WorkoutSummary(
    val totalDistanceKm: Double,
    val totalDurationSec: Int,
    val estimatedTss: Int,
)

private fun calculateSummary(
    workout: StructuredWorkoutV2,
    paceTargets: Map<PaceLetter, Int>,
    ftpWatts: Int,
): WorkoutSummary {
    val flattened = flattenStructuredWorkout(workout)
    var totalMeters = 0.0
    var totalSec = 0
    var totalTss = 0.0

    val eSec = (paceTargets[PaceLetter.E] ?: 330).toDouble()
    val tSec = (paceTargets[PaceLetter.T] ?: 260).toDouble()

    for (step in flattened) {
        val stepPaceSec = when (val t = step.target) {
            is Target.Pace -> {
                t.min ?: t.max ?: (t.zoneLabel?.let { l -> runCatching { PaceLetter.valueOf(l) }.getOrNull()?.let { paceTargets[it]?.toDouble() } }) ?: eSec
            }
            else -> eSec
        }

        var m = 0.0
        var s = 0
        when (val d = step.duration) {
            is Duration.Distance -> {
                m = d.meters
                s = ((d.meters / 1000.0) * stepPaceSec).roundToInt()
            }
            is Duration.Time -> {
                s = d.seconds
                m = (d.seconds / stepPaceSec) * 1000.0
            }
            is Duration.LapPress -> {
                s = 180
                m = (180.0 / stepPaceSec) * 1000.0
            }
        }
        totalMeters += m
        totalSec += s

        // TSS estimate
        val durHr = s / 3600.0
        val tss = when (val t = step.target) {
            is Target.Power -> {
                val watts = t.minWatts ?: t.maxWatts ?: (t.ftpPercent?.let { it * ftpWatts / 100 }) ?: (ftpWatts * 0.75).toInt()
                val ifFact = watts.toDouble() / ftpWatts.toDouble().coerceAtLeast(100.0)
                durHr * (ifFact * ifFact) * 100.0
            }
            is Target.Pace -> {
                val ifFact = (tSec / stepPaceSec).coerceIn(0.5, 1.5)
                durHr * (ifFact * ifFact) * 100.0
            }
            else -> {
                val rate = when (step.kind) {
                    "warmup", "cooldown" -> 45.0
                    "recovery" -> 35.0
                    "steady", "work" -> 75.0
                    else -> 50.0
                }
                durHr * rate
            }
        }
        totalTss += tss
    }

    return WorkoutSummary(
        totalDistanceKm = (totalMeters / 1000.0 * 10.0).roundToInt() / 10.0,
        totalDurationSec = totalSec,
        estimatedTss = totalTss.roundToInt(),
    )
}

// -------------------------------------------------------------------
// Step Card Component
// -------------------------------------------------------------------

@Composable
private fun StepCard(
    step: StructuredStep,
    paceTargets: Map<PaceLetter, Int>,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onDelete: () -> Unit,
    onChange: (StructuredStep) -> Unit,
    modifier: Modifier = Modifier,
) {
    val stepKinds = listOf("warmup", "work", "steady", "recovery", "cooldown")
    val kindColors = mapOf(
        "warmup" to MaterialTheme.semanticColors.ctl,
        "work" to MaterialTheme.colorScheme.primary,
        "steady" to MaterialTheme.semanticColors.atl,
        "recovery" to MaterialTheme.semanticColors.tsb,
        "cooldown" to MaterialTheme.colorScheme.tertiary,
    )
    val badgeColor = kindColors[step.kind] ?: MaterialTheme.colorScheme.primary

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Header Row: Kind chips + Move/Delete actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                var showKindMenu by remember { mutableStateOf(false) }
                Box {
                    FilterChip(
                        selected = true,
                        onClick = { showKindMenu = true },
                        label = { Text(step.kind.replaceFirstChar { it.uppercase() }) },
                    )
                    DropdownMenu(
                        expanded = showKindMenu,
                        onDismissRequest = { showKindMenu = false },
                    ) {
                        stepKinds.forEach { k ->
                            DropdownMenuItem(
                                text = { Text(k.replaceFirstChar { it.uppercase() }) },
                                onClick = {
                                    showKindMenu = false
                                    onChange(step.copy(kind = k))
                                },
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onMoveUp, enabled = canMoveUp, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.KeyboardArrowUp, contentDescription = "Move Up")
                    }
                    IconButton(onClick = onMoveDown, enabled = canMoveDown, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "Move Down")
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }

            // Label & Note
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = step.label ?: "",
                    onValueChange = { onChange(step.copy(label = it.ifBlank { null })) },
                    label = { Text("Label") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = step.note ?: "",
                    onValueChange = { onChange(step.copy(note = it.ifBlank { null })) },
                    label = { Text("Note / Cue") },
                    singleLine = true,
                    modifier = Modifier.weight(1.2f),
                )
            }

            // Duration Selector & Value
            DurationEditor(
                duration = step.duration,
                onDurationChange = { onChange(step.copy(duration = it)) },
            )

            // Target Selector & Value
            TargetEditor(
                target = step.target,
                paceTargets = paceTargets,
                onTargetChange = { onChange(step.copy(target = it)) },
            )

            // Optional Cadence
            var cadenceText by remember(step.cadenceRpm) {
                mutableStateOf(step.cadenceRpm?.toString() ?: "")
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = cadenceText,
                    onValueChange = {
                        cadenceText = it.filter(Char::isDigit).take(3)
                        onChange(step.copy(cadenceRpm = cadenceText.toIntOrNull()))
                    },
                    label = { Text("Cadence (opt rpm)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

// -------------------------------------------------------------------
// Duration Editor Sub-Component
// -------------------------------------------------------------------

@Composable
private fun DurationEditor(
    duration: Duration,
    onDurationChange: (Duration) -> Unit,
) {
    val durationTypes = listOf("Distance", "Time", "LapPress")
    var currentType by remember(duration) {
        mutableStateOf(
            when (duration) {
                is Duration.Distance -> "Distance"
                is Duration.Time -> "Time"
                is Duration.LapPress -> "LapPress"
            }
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Duration", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            durationTypes.forEach { dtype ->
                FilterChip(
                    selected = currentType == dtype,
                    onClick = {
                        currentType = dtype
                        when (dtype) {
                            "Distance" -> onDurationChange(Duration.Distance(1000.0))
                            "Time" -> onDurationChange(Duration.Time(300))
                            "LapPress" -> onDurationChange(Duration.LapPress)
                        }
                    },
                    label = { Text(if (dtype == "LapPress") "Lap Press" else dtype) },
                )
            }
        }

        when (duration) {
            is Duration.Distance -> {
                var distText by remember(duration.meters) {
                    mutableStateOf(duration.meters.roundToInt().toString())
                }
                OutlinedTextField(
                    value = distText,
                    onValueChange = {
                        distText = it.filter(Char::isDigit)
                        val m = distText.toDoubleOrNull() ?: 0.0
                        onDurationChange(Duration.Distance(m))
                    },
                    label = { Text("Meters") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            is Duration.Time -> {
                var secText by remember(duration.seconds) {
                    mutableStateOf(duration.seconds.toString())
                }
                OutlinedTextField(
                    value = secText,
                    onValueChange = {
                        secText = it.filter(Char::isDigit)
                        val s = secText.toIntOrNull() ?: 0
                        onDurationChange(Duration.Time(s))
                    },
                    label = { Text("Seconds") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            is Duration.LapPress -> {
                Text(
                    "Step continues until the lap key is pressed on device.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// -------------------------------------------------------------------
// Target Editor Sub-Component
// -------------------------------------------------------------------

@Composable
private fun TargetEditor(
    target: Target?,
    paceTargets: Map<PaceLetter, Int>,
    onTargetChange: (Target) -> Unit,
) {
    val targetTypes = listOf("Pace", "PowerWatts", "PowerFtpPercent", "HrZone", "HrBpm", "Open")
    var currentType by remember(target) {
        mutableStateOf(
            when (target) {
                is Target.Pace -> "Pace"
                is Target.Power -> if (target.ftpPercent != null) "PowerFtpPercent" else "PowerWatts"
                is Target.Hr -> if (target.zone != null) "HrZone" else "HrBpm"
                is Target.Free, null -> "Open"
                else -> "Open"
            }
        )
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Target", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            val displayLabels = mapOf(
                "Pace" to "Pace",
                "PowerWatts" to "Power (W)",
                "PowerFtpPercent" to "% FTP",
                "HrZone" to "HR Zone",
                "HrBpm" to "HR (bpm)",
                "Open" to "Open",
            )
            var showTargetMenu by remember { mutableStateOf(false) }
            Box {
                FilterChip(
                    selected = true,
                    onClick = { showTargetMenu = true },
                    label = { Text(displayLabels[currentType] ?: currentType) },
                )
                DropdownMenu(
                    expanded = showTargetMenu,
                    onDismissRequest = { showTargetMenu = false },
                ) {
                    targetTypes.forEach { t ->
                        DropdownMenuItem(
                            text = { Text(displayLabels[t] ?: t) },
                            onClick = {
                                showTargetMenu = false
                                currentType = t
                                when (t) {
                                    "Pace" -> onTargetChange(Target.Pace(zoneLabel = "M"))
                                    "PowerWatts" -> onTargetChange(Target.Power(minWatts = 200, maxWatts = 220))
                                    "PowerFtpPercent" -> onTargetChange(Target.Power(ftpPercent = 90))
                                    "HrZone" -> onTargetChange(Target.Hr(zone = 2))
                                    "HrBpm" -> onTargetChange(Target.Hr(minBpm = 140, maxBpm = 155))
                                    "Open" -> onTargetChange(Target.Free)
                                }
                            },
                        )
                    }
                }
            }
        }

        when (currentType) {
            "Pace" -> {
                val paceTarget = target as? Target.Pace
                val currentLetter = runCatching {
                    PaceLetter.valueOf(paceTarget?.zoneLabel ?: "M")
                }.getOrDefault(PaceLetter.M)

                PaceZoneSlider(
                    letter = currentLetter,
                    paceTargets = paceTargets,
                    onSelected = { l ->
                        val paceSec = paceTargets[l]?.toDouble()
                        onTargetChange(Target.Pace(zoneLabel = l.name, min = paceSec, max = paceSec))
                    },
                )
            }
            "PowerWatts" -> {
                val p = target as? Target.Power
                var minW by remember(p?.minWatts) { mutableStateOf(p?.minWatts?.toString() ?: "200") }
                var maxW by remember(p?.maxWatts) { mutableStateOf(p?.maxWatts?.toString() ?: "220") }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = minW,
                        onValueChange = {
                            minW = it.filter(Char::isDigit)
                            onTargetChange(Target.Power(minWatts = minW.toIntOrNull(), maxWatts = maxW.toIntOrNull()))
                        },
                        label = { Text("Min Watts") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = maxW,
                        onValueChange = {
                            maxW = it.filter(Char::isDigit)
                            onTargetChange(Target.Power(minWatts = minW.toIntOrNull(), maxWatts = maxW.toIntOrNull()))
                        },
                        label = { Text("Max Watts") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            "PowerFtpPercent" -> {
                val p = target as? Target.Power
                var pct by remember(p?.ftpPercent) { mutableStateOf(p?.ftpPercent?.toString() ?: "90") }
                OutlinedTextField(
                    value = pct,
                    onValueChange = {
                        pct = it.filter(Char::isDigit).take(3)
                        onTargetChange(Target.Power(ftpPercent = pct.toIntOrNull() ?: 90))
                    },
                    label = { Text("Target % FTP") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            "HrZone" -> {
                val h = target as? Target.Hr
                var zone by remember(h?.zone) { mutableStateOf(h?.zone?.toString() ?: "2") }
                OutlinedTextField(
                    value = zone,
                    onValueChange = {
                        zone = it.filter(Char::isDigit).take(1)
                        val z = zone.toIntOrNull()?.coerceIn(1, 5) ?: 2
                        onTargetChange(Target.Hr(zone = z))
                    },
                    label = { Text("HR Zone (1–5)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            "HrBpm" -> {
                val h = target as? Target.Hr
                var minBpm by remember(h?.minBpm) { mutableStateOf(h?.minBpm?.toString() ?: "140") }
                var maxBpm by remember(h?.maxBpm) { mutableStateOf(h?.maxBpm?.toString() ?: "155") }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = minBpm,
                        onValueChange = {
                            minBpm = it.filter(Char::isDigit).take(3)
                            onTargetChange(Target.Hr(minBpm = minBpm.toIntOrNull(), maxBpm = maxBpm.toIntOrNull()))
                        },
                        label = { Text("Min BPM") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = maxBpm,
                        onValueChange = {
                            maxBpm = it.filter(Char::isDigit).take(3)
                            onTargetChange(Target.Hr(minBpm = minBpm.toIntOrNull(), maxBpm = maxBpm.toIntOrNull()))
                        },
                        label = { Text("Max BPM") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            "Open" -> {
                Text(
                    "Open effort without strict pace/power targets.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// -------------------------------------------------------------------
// Repeat Group Card Component
// -------------------------------------------------------------------

@Composable
private fun RepeatGroupCard(
    group: RepeatGroup,
    paceTargets: Map<PaceLetter, Int>,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onDelete: () -> Unit,
    onChange: (RepeatGroup) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
        ),
        modifier = modifier
            .fillMaxWidth()
            .border(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.4f), RoundedCornerShape(18.dp)),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Header: Times × Reps + Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Outlined.Repeat,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                    var repsText by remember(group.times) { mutableStateOf(group.times.toString()) }
                    OutlinedTextField(
                        value = repsText,
                        onValueChange = {
                            repsText = it.filter(Char::isDigit).take(2)
                            val t = repsText.toIntOrNull()?.coerceIn(1, 99) ?: 1
                            onChange(group.copy(times = t))
                        },
                        label = { Text("Repeats (×)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.width(110.dp),
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onMoveUp, enabled = canMoveUp, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.KeyboardArrowUp, contentDescription = "Move Up")
                    }
                    IconButton(onClick = onMoveDown, enabled = canMoveDown, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "Move Down")
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }

            // Optional Group Label
            OutlinedTextField(
                value = group.label ?: "",
                onValueChange = { onChange(group.copy(label = it.ifBlank { null })) },
                label = { Text("Set Label (e.g. 4x800m Repeats)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            // Inner steps
            Text(
                "Steps in set (${group.steps.size}):",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )

            group.steps.forEachIndexed { innerIndex, node ->
                if (node is StructuredStep) {
                    StepCard(
                        step = node,
                        paceTargets = paceTargets,
                        canMoveUp = innerIndex > 0,
                        canMoveDown = innerIndex < group.steps.lastIndex,
                        onMoveUp = {
                            val list = group.steps.toMutableList()
                            val item = list.removeAt(innerIndex)
                            list.add(innerIndex - 1, item)
                            onChange(group.copy(steps = list))
                        },
                        onMoveDown = {
                            val list = group.steps.toMutableList()
                            val item = list.removeAt(innerIndex)
                            list.add(innerIndex + 1, item)
                            onChange(group.copy(steps = list))
                        },
                        onDelete = {
                            val list = group.steps.toMutableList()
                            list.removeAt(innerIndex)
                            onChange(group.copy(steps = list))
                        },
                        onChange = { updated ->
                            val list = group.steps.toMutableList()
                            list[innerIndex] = updated
                            onChange(group.copy(steps = list))
                        },
                    )
                }
            }

            // Add step inside repeat
            TextButton(
                onClick = {
                    val newInner = StructuredStep(
                        kind = "work",
                        label = "Interval",
                        duration = Duration.Distance(400.0),
                        target = Target.Pace(zoneLabel = "I"),
                    )
                    onChange(group.copy(steps = group.steps + newInner))
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Add step inside repeat block")
            }
        }
    }
}

// -------------------------------------------------------------------
// Daniels Pace Picker Slider
// -------------------------------------------------------------------

@Composable
private fun PaceZoneSlider(
    letter: PaceLetter,
    paceTargets: Map<PaceLetter, Int>,
    onSelected: (PaceLetter) -> Unit,
    modifier: Modifier = Modifier,
) {
    val zoneColor = paceZoneColor(letter)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            "Pace · ${paceLabel(letter)} — ${Format.pace(paceTargets[letter]?.toDouble())} /km",
            style = MaterialTheme.typography.labelMedium,
            color = zoneColor,
            fontWeight = FontWeight.SemiBold,
        )
        Slider(
            value = PACE_LETTERS.indexOf(letter).toFloat(),
            onValueChange = { v ->
                onSelected(PACE_LETTERS[v.roundToInt().coerceIn(0, PACE_LETTERS.lastIndex)])
            },
            valueRange = 0f..PACE_LETTERS.lastIndex.toFloat(),
            steps = PACE_LETTERS.size - 2,
            colors = SliderDefaults.colors(
                thumbColor = zoneColor,
                activeTrackColor = zoneColor,
                inactiveTrackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            ),
        )
        Row(Modifier.fillMaxWidth().height(20.dp)) {
            PACE_LETTERS.forEachIndexed { i, l ->
                val selected = l == letter
                val c = paceZoneColor(l)
                Box(
                    Modifier
                        .weight(if (i == 0 || i == PACE_LETTERS.lastIndex) 1f else 2f)
                        .fillMaxHeight()
                        .padding(horizontal = 1.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (selected) c else c.copy(alpha = 0.30f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        l.name,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) {
                            if (c.luminance() > 0.45f) Color(0xFF111316) else Color.White
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        fontWeight = if (selected) FontWeight.Bold else null,
                    )
                }
            }
        }
    }
}

@Composable
private fun paceZoneColor(letter: PaceLetter): Color = when (letter) {
    PaceLetter.E -> MaterialTheme.semanticColors.ctl
    PaceLetter.M -> MaterialTheme.semanticColors.tsb
    PaceLetter.T -> MaterialTheme.semanticColors.atl
    PaceLetter.I -> MaterialTheme.colorScheme.error
    PaceLetter.R -> MaterialTheme.colorScheme.tertiary
}

private fun paceLabel(letter: PaceLetter): String = when (letter) {
    PaceLetter.E -> "Easy"
    PaceLetter.M -> "Marathon"
    PaceLetter.T -> "Threshold"
    PaceLetter.I -> "Interval"
    PaceLetter.R -> "Repetition"
}
