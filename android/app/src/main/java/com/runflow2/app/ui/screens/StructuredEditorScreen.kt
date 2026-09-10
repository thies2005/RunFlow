package com.runflow2.app.ui.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.Format
import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.domain.person.Personalization.PaceLetter
import com.runflow2.app.domain.plan.BuilderMainStep
import com.runflow2.app.domain.plan.BuilderSection
import com.runflow2.app.domain.plan.StructuredWorkoutBuilder
import com.runflow2.app.domain.plan.StructuredWorkoutBuilder.PACE_LETTERS
import com.runflow2.app.domain.plan.StructuredWorkoutDraft
import com.runflow2.app.domain.plan.formatTotalDistance
import com.runflow2.app.domain.plan.toDraft
import com.runflow2.app.domain.plan.vdotFromThresholdPaceSecPerKm
import kotlinx.coroutines.launch

/**
 * Structured interval editor — app mirror of the web's
 * StructuredWorkoutEditor (warmup / main entries "reps × distance @ pace,
 * rest" / cooldown, live total). Deviation from the web: the web form
 * auto-saves on a 500 ms debounce; the app follows its explicit-save
 * convention (Save button + back/cancel), like "Edit targets" on PlanScreen.
 *
 * Prefill: the workout's existing structuredStepsJson decoded via
 * [StructuredWorkoutBuilder] (nested builder shape directly, generator flat
 * shape converted), else [Personalization.structuredEditorDefaults] for the
 * athlete's VDOT (goal.vdotAtCreation → threshold-inverted → 50, same chain
 * as RecordingService).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StructuredEditorScreen(
    container: AppContainer,
    workoutId: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var loaded by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf(true) }
    var vdot by remember { mutableStateOf(50.0) }
    var warmupDistance by remember { mutableStateOf("") }
    var warmupPace by remember { mutableStateOf(PaceLetter.E) }
    var mainRows by remember { mutableStateOf(listOf(MainRowUi())) }
    var cooldownDistance by remember { mutableStateOf("") }
    var cooldownPace by remember { mutableStateOf(PaceLetter.E) }
    var saving by remember { mutableStateOf(false) }
    var notEditable by remember { mutableStateOf(false) }

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
        val table = PACE_LETTERS.associateWith { Personalization.trainingPaces(v).target(it) }
        val decoded = workout.structuredStepsJson?.let { StructuredWorkoutBuilder.decode(it, table) }
        notEditable = workout.structuredStepsJson != null && decoded == null
        val draft = decoded ?: Personalization.structuredEditorDefaults(v).toDraft()
        warmupDistance = draft.warmup.distanceM.toString()
        warmupPace = draft.warmup.pace
        mainRows = draft.main.map { MainRowUi(it.reps.toString(), it.distanceM.toString(), it.pace, it.restSeconds.toString()) }
        cooldownDistance = draft.cooldown.distanceM.toString()
        cooldownPace = draft.cooldown.pace
        loaded = true
    }

    /** Effective draft with web-style clamps (reps ≥ 1, distance/rest ≥ 0). */
    fun currentDraft(): StructuredWorkoutDraft = StructuredWorkoutDraft(
        warmup = BuilderSection(warmupDistance.toIntOrNull()?.coerceAtLeast(0) ?: 0, warmupPace),
        main = mainRows.map {
            BuilderMainStep(
                reps = (it.reps.toIntOrNull() ?: 0).coerceAtLeast(1),
                distanceM = (it.distance.toIntOrNull() ?: 0).coerceAtLeast(0),
                pace = it.pace,
                restSeconds = (it.rest.toIntOrNull() ?: 0).coerceAtLeast(0),
            )
        },
        cooldown = BuilderSection(cooldownDistance.toIntOrNull()?.coerceAtLeast(0) ?: 0, cooldownPace),
    )

    val paceTargets = remember(vdot) {
        PACE_LETTERS.associateWith { Personalization.trainingPaces(vdot).target(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit intervals") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
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

        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                "Paces from your VDOT (${Format.oneDecimal(vdot)}): " +
                    PACE_LETTERS.joinToString(" · ") { "${it.name} ${Format.pace(paceTargets[it]!!.toDouble())}" } +
                    " /km",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            SectionFields(
                label = "Warm-up",
                distanceText = warmupDistance,
                onDistanceChange = { warmupDistance = it },
                pace = warmupPace,
                onPaceChange = { warmupPace = it },
                paceTargets = paceTargets,
            )

            // ---- main set ----
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Main set", style = MaterialTheme.typography.titleSmall)
                TextButton(onClick = {
                    mainRows = mainRows + MainRowUi(reps = "1", distance = "400", pace = PaceLetter.I, rest = "60")
                }) {
                    Icon(Icons.Outlined.Add, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Add")
                }
            }
            mainRows.forEachIndexed { index, row ->
                key(row) {
                    MainEntryCard(
                        row = row,
                        canRemove = mainRows.size > 1,
                        paceTargets = paceTargets,
                        onChange = { newRow ->
                            mainRows = mainRows.toMutableList().also { it[index] = newRow }
                        },
                        onRemove = {
                            mainRows = mainRows.filterIndexed { i, _ -> i != index }
                        },
                    )
                }
            }

            SectionFields(
                label = "Cool-down",
                distanceText = cooldownDistance,
                onDistanceChange = { cooldownDistance = it },
                pace = cooldownPace,
                onPaceChange = { cooldownPace = it },
                paceTargets = paceTargets,
            )

            Text(
                "Total: ${formatTotalDistance(currentDraft().totalDistanceM)}",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (notEditable) {
                Text(
                    "This workout's structure isn't editable here — saving would replace it with the default set.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.weight(1f),
                    enabled = !saving,
                ) { Text("Cancel") }
                Button(
                    onClick = {
                        saving = true
                        val json = StructuredWorkoutBuilder.encodeToString(currentDraft())
                        scope.launch {
                            try {
                                container.repository.saveStructuredSteps(workoutId, json)
                                onBack()
                            } catch (e: Exception) {
                                saving = false
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !saving && mainRows.isNotEmpty() && !notEditable,
                ) { Text(if (saving) "Saving…" else "Save") }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Text-backed editable state of one main-set entry. */
private data class MainRowUi(
    val reps: String = "4",
    val distance: String = "400",
    val pace: PaceLetter = PaceLetter.I,
    val rest: String = "90",
)

@Composable
private fun SectionFields(
    label: String,
    distanceText: String,
    onDistanceChange: (String) -> Unit,
    pace: PaceLetter,
    onPaceChange: (PaceLetter) -> Unit,
    paceTargets: Map<PaceLetter, Int>,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = distanceText,
                onValueChange = onDistanceChange,
                label = { Text("Distance (m)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
            )
            PaceDropdown(letter = pace, paceTargets = paceTargets, onSelected = onPaceChange, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun MainEntryCard(
    row: MainRowUi,
    canRemove: Boolean,
    paceTargets: Map<PaceLetter, Int>,
    onChange: (MainRowUi) -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = row.reps,
                    onValueChange = { onChange(row.copy(reps = it)) },
                    label = { Text("Reps") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                Text("×", color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = row.distance,
                    onValueChange = { onChange(row.copy(distance = it)) },
                    label = { Text("Dist (m)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1.4f),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                PaceDropdown(
                    letter = row.pace,
                    paceTargets = paceTargets,
                    onSelected = { onChange(row.copy(pace = it)) },
                    modifier = Modifier.weight(1.6f),
                )
                OutlinedTextField(
                    value = row.rest,
                    onValueChange = { onChange(row.copy(rest = it)) },
                    label = { Text("Rest (s)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onRemove, enabled = canRemove) {
                    Icon(Icons.Outlined.Close, contentDescription = "Remove entry")
                }
            }
        }
    }
}

/** E/M/T/I/R dropdown showing the letter plus its resolved sec/km for the athlete's VDOT. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaceDropdown(
    letter: PaceLetter,
    paceTargets: Map<PaceLetter, Int>,
    onSelected: (PaceLetter) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = "${letter.name} · ${Format.pace(paceTargets[letter]?.toDouble())} /km",
            onValueChange = {},
            readOnly = true,
            label = { Text("Pace") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            PACE_LETTERS.forEach { l ->
                DropdownMenuItem(
                    text = { Text("${l.name} — ${paceLabel(l)} · ${Format.pace(paceTargets[l]?.toDouble())} /km") },
                    onClick = {
                        onSelected(l)
                        expanded = false
                    },
                )
            }
        }
    }
}

private fun paceLabel(letter: PaceLetter): String = when (letter) {
    PaceLetter.E -> "Easy"
    PaceLetter.M -> "Marathon"
    PaceLetter.T -> "Threshold"
    PaceLetter.I -> "Interval"
    PaceLetter.R -> "Repetition"
}
