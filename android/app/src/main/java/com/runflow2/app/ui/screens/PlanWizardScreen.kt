package com.runflow2.app.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.plan.PlanGenerator
import com.runflow2.app.domain.plan.PlanSpec
import com.runflow2.app.domain.plan.RaceDefaultsTable
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

private const val STEP_COUNT = 6

private data class WizardData(
    val name: String = "",
    val raceType: RaceType = RaceType.MARATHON,
    val raceDate: LocalDate = LocalDate.now().plusWeeks(16),
    val calibrationVdot: Double? = null,
    val calibTimeText: String = "",
    val calibDistance: Triple<String, RaceType, Double> = RaceDefaultsTable.calibrationRaces[1],
    val targetTimeSec: Int? = null,
    val runsPerWeek: Int = 5,
    val weeklyKm: Double = 58.0,
    val longRunKm: Double = 30.0,
    val strengthPerWeek: Int = 1,
    val longRunDay: DayOfWeek = DayOfWeek.SUNDAY,
    val workoutDay: DayOfWeek = DayOfWeek.THURSDAY,
    val restDays: Set<DayOfWeek> = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanWizardScreen(
    container: AppContainer,
    onDone: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val analytics by androidx.compose.runtime.produceState<AnalyticsBundle?>(initialValue = null) {
        value = container.repository.analytics(365)
    }

    var step by remember { mutableStateOf(0) }
    var data by remember { mutableStateOf(WizardData()) }
    var creating by remember { mutableStateOf(false) }

    // prefill volume defaults from race type
    LaunchedEffect(data.raceType) {
        val d = RaceDefaultsTable.forRace(data.raceType)
        data = data.copy(
            runsPerWeek = d.runsPerWeek,
            weeklyKm = d.weeklyKm,
            longRunKm = d.longRunKm,
        )
    }

    val effectiveVdot = data.calibrationVdot ?: analytics?.effectiveVdot ?: 47.5
    val raceKm = data.raceType.distanceKm

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New training plan") },
                navigationIcon = {
                    IconButton(onClick = { if (step > 0) step-- else onDone() }) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
        ) {
            LinearProgressIndicator(
                progress = { (step + 1).toFloat() / STEP_COUNT },
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "Step ${step + 1} of $STEP_COUNT",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )

            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    if (targetState > initialState)
                        (slideInHorizontally { it } + fadeIn()).togetherWith(slideOutHorizontally { -it } + fadeOut())
                    else
                        (slideInHorizontally { -it } + fadeIn()).togetherWith(slideOutHorizontally { it } + fadeOut())
                },
                label = "wizard",
                modifier = Modifier.weight(1f),
            ) { s ->
                Column(
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    when (s) {
                        0 -> StepGoal(data) { data = it }
                        1 -> StepDate(data) { data = it }
                        2 -> StepCalibration(data, analytics) { data = it }
                        3 -> StepTarget(data, effectiveVdot, raceKm) { data = it }
                        4 -> StepVolume(data) { data = it }
                        5 -> StepSchedule(data) { data = it }
                    }
                }
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (step > 0) {
                    OutlinedButton(onClick = { step-- }, modifier = Modifier.weight(1f)) {
                        Text("Back")
                    }
                }
                Button(
                    onClick = {
                        if (step < STEP_COUNT - 1) {
                            step++
                        } else if (!creating) {
                            creating = true
                            scope.launch {
                                val spec = PlanSpec(
                                    name = data.name.ifBlank { data.raceType.label },
                                    raceType = data.raceType,
                                    raceDate = data.raceDate,
                                    startDate = LocalDate.now(),
                                    targetTimeSec = data.targetTimeSec,
                                    weeklyKm = data.weeklyKm,
                                    runsPerWeek = data.runsPerWeek,
                                    longRunKm = data.longRunKm,
                                    strengthPerWeek = data.strengthPerWeek,
                                    longRunDay = data.longRunDay,
                                    workoutDay = data.workoutDay,
                                    restDays = data.restDays,
                                    vdot = effectiveVdot,
                                )
                                container.repository.createPlan(spec)
                                onDone()
                            }
                        }
                    },
                    modifier = Modifier.weight(2f),
                    enabled = when (step) {
                        0 -> data.name.isNotBlank() && data.raceType != RaceType.NONE || data.raceType == RaceType.NONE
                        else -> true
                    },
                ) {
                    Text(if (step == STEP_COUNT - 1) "Create plan" else "Continue")
                }
            }
        }
    }
}

@Composable
private fun StepHeader(title: String, subtitle: String) {
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StepGoal(data: WizardData, update: (WizardData) -> Unit) {
    StepHeader("Your goal", "What are you training for?")
    OutlinedTextField(
        value = data.name,
        onValueChange = { update(data.copy(name = it)) },
        label = { Text("Goal name (e.g. Berlin Marathon)") },
        modifier = Modifier.fillMaxWidth(),
    )
    Text("Race type", style = MaterialTheme.typography.titleSmall)
    val grouped = listOf(
        "Road" to listOf(
            RaceType.FIVE_K, RaceType.TEN_K, RaceType.HALF_MARATHON, RaceType.MARATHON,
        ),
        "Ultra" to listOf(
            RaceType.FIFTY_K, RaceType.FIFTY_MILE, RaceType.HUNDRED_K, RaceType.HUNDRED_MILE,
            RaceType.TWELVE_HOUR, RaceType.TWENTY_FOUR_HOUR, RaceType.BACKYARD_ULTRA,
        ),
        "Triathlon" to listOf(
            RaceType.SPRINT_TRI, RaceType.OLYMPIC_TRI, RaceType.HALF_IRONMAN, RaceType.FULL_IRONMAN,
        ),
        "General" to listOf(RaceType.NONE),
    )
    grouped.forEach { (group, types) ->
        Text(group, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            types.forEach { rt ->
                FilterChip(
                    selected = data.raceType == rt,
                    onClick = { update(data.copy(raceType = rt)) },
                    label = { Text(rt.label) },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StepDate(data: WizardData, update: (WizardData) -> Unit) {
    StepHeader("Race day", "When is your goal race?")
    var showPicker by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { showPicker = true }, modifier = Modifier.fillMaxWidth()) {
        Text(Format.dateWithYear(data.raceDate))
    }
    if (showPicker) {
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = data.raceDate
                .atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        pickerState.selectedDateMillis?.let { ms ->
                            val picked = java.time.Instant.ofEpochMilli(ms)
                                .atZone(ZoneId.of("UTC")).toLocalDate()
                            if (!picked.isBefore(LocalDate.now().plusWeeks(3))) {
                                update(data.copy(raceDate = picked))
                            }
                        }
                        showPicker = false
                    },
                ) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Cancel") } },
        ) {
            DatePicker(state = pickerState)
        }
    }
    val weeks = PlanGenerator.planWeeks(
        PlanSpec(
            name = "", raceType = data.raceType, raceDate = data.raceDate, startDate = LocalDate.now(),
            weeklyKm = 50.0, runsPerWeek = 4, longRunKm = 20.0,
        ),
    )
    val days = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), data.raceDate)
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("$days days to race day")
            Text(
                "$weeks training weeks · starting next Monday (or today)",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (days < 28) {
                Text(
                    "Tip: a minimum of 4 weeks is required; ideal is 12–16.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
        }
    }
}

@Composable
private fun StepCalibration(
    data: WizardData,
    analytics: AnalyticsBundle?,
    update: (WizardData) -> Unit,
) {
    StepHeader("Calibration", "A recent race result sharpens your pace targets.")
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("From your history", style = MaterialTheme.typography.titleSmall)
            Text(
                if (analytics?.effectiveVdot != null)
                    "Effective VO₂ max: ${Format.oneDecimal(analytics.effectiveVdot)}"
                else "No recent performances found — add a race result below.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
    Text("Recent race (optional)", style = MaterialTheme.typography.titleSmall)
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        RaceDefaultsTable.calibrationRaces.forEach { r ->
            FilterChip(
                selected = data.calibDistance == r,
                onClick = { update(data.copy(calibDistance = r)) },
                label = { Text(r.first) },
            )
        }
    }
    OutlinedTextField(
        value = data.calibTimeText,
        onValueChange = { t ->
            val vdot = parseDuration(t)?.let { VdotMath.vdot(data.calibDistance.third * 1000.0, it.toDouble()) }
            update(data.copy(calibTimeText = t, calibrationVdot = vdot?.takeIf { v -> v in 20.0..85.0 }))
        },
        label = { Text("Time at ${data.calibDistance.first} (h:mm:ss)") },
        modifier = Modifier.fillMaxWidth(),
    )
    data.calibrationVdot?.let {
        Card {
            Text(
                "Calibrated VDOT: ${Format.oneDecimal(it)}",
                Modifier.padding(16.dp),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun StepTarget(
    data: WizardData,
    vdot: Double,
    raceKm: Double?,
    update: (WizardData) -> Unit,
) {
    if (raceKm == null) {
        StepHeader("Target", "Timed events use time-based goals — pick your volume in the next step.")
        Card {
            Text(
                "Your plan will be built around your weekly volume and long-run progression.",
                Modifier.padding(16.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        return
    }
    val predicted = VdotMath.predictTimeSec(vdot, raceKm * 1000.0) ?: (raceKm * 260.0)
    // slider range: 85% .. 115% of predicted as seconds
    val minSec = (predicted * 0.85 / 30).toInt() * 30
    val maxSec = (predicted * 1.15 / 30).toInt() * 30
    val current = data.targetTimeSec ?: ((predicted / 30).toInt() * 30).coerceIn(minSec, maxSec)

    StepHeader("Target time", "Based on VDOT ${Format.oneDecimal(vdot)} we predict ${Format.duration(predicted.toInt())}.")
    Text(
        Format.duration(current),
        style = MaterialTheme.typography.displayMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
    )
    Slider(
        value = current.toFloat(),
        onValueChange = { update(data.copy(targetTimeSec = (it.toInt() / 30 * 30).coerceAtLeast(60))) },
        valueRange = minSec.toFloat()..maxSec.toFloat(),
    )
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("Conservative", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Ambitious", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    val targetPace = current / raceKm
    Text(
        "That is ${Format.pace(targetPace)} /km for ${Format.distance(raceKm)}",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    TextButton(onClick = { update(data.copy(targetTimeSec = null)) }) {
        Text("Skip — let the plan use prediction")
    }
}

@Composable
private fun StepVolume(data: WizardData, update: (WizardData) -> Unit) {
    StepHeader("Training volume", "How much are you ready to run?")

    Text("Runs per week: ${data.runsPerWeek}", style = MaterialTheme.typography.titleSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (3..7).forEach { n ->
            FilterChip(
                selected = data.runsPerWeek == n,
                onClick = { update(data.copy(runsPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }

    Text(
        "Weekly mileage: ${Format.distance(data.weeklyKm)}",
        style = MaterialTheme.typography.titleSmall,
    )
    Slider(
        value = data.weeklyKm.toFloat(),
        onValueChange = { update(data.copy(weeklyKm = (it / 2).roundToInt() * 2.0)) },
        valueRange = 20f..120f,
    )

    Text(
        "Longest long run: ${Format.distance(data.longRunKm)}",
        style = MaterialTheme.typography.titleSmall,
    )
    Slider(
        value = data.longRunKm.toFloat(),
        onValueChange = { update(data.copy(longRunKm = (it / 2).roundToInt() * 2.0)) },
        valueRange = 10f..45f,
    )

    Text("Strength sessions / week", style = MaterialTheme.typography.titleSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (0..3).forEach { n ->
            FilterChip(
                selected = data.strengthPerWeek == n,
                onClick = { update(data.copy(strengthPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }
}

@Composable
private fun StepSchedule(data: WizardData, update: (WizardData) -> Unit) {
    StepHeader("Weekly schedule", "Pick your long run, quality session, and rest days.")

    Text("Long run day", style = MaterialTheme.typography.titleSmall)
    DayPicker(selected = data.longRunDay, exclude = emptySet()) { update(data.copy(longRunDay = it)) }

    Text("Quality workout day", style = MaterialTheme.typography.titleSmall)
    DayPicker(selected = data.workoutDay, exclude = setOf(data.longRunDay)) {
        update(data.copy(workoutDay = it))
    }

    Text("Rest days", style = MaterialTheme.typography.titleSmall)
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        DayOfWeek.entries.forEach { d ->
            val disabled = d == data.longRunDay || d == data.workoutDay
            androidx.compose.material3.FilterChip(
                selected = d in data.restDays,
                onClick = {
                    val new = if (d in data.restDays) data.restDays - d else data.restDays + d
                    update(data.copy(restDays = new))
                },
                label = { Text(Format.dayShort(d)) },
                enabled = !disabled,
            )
        }
    }

    Card {
        Text(
            "Every 4th week is a recovery week. Taper begins 2 weeks before race day.",
            Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun DayPicker(
    selected: DayOfWeek,
    exclude: Set<DayOfWeek>,
    onSelect: (DayOfWeek) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        DayOfWeek.entries.forEach { d ->
            FilterChip(
                selected = selected == d,
                onClick = { onSelect(d) },
                label = { Text(Format.dayShort(d)) },
                enabled = d !in exclude,
            )
        }
    }
}
