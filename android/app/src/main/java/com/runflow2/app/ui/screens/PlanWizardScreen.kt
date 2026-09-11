package com.runflow2.app.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material.icons.outlined.SelfImprovement
import androidx.compose.material.icons.outlined.Terrain
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.material3.Switch
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.AppLog
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.sync.calibrationDistanceFor
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.model.RaceType
import com.runflow2.app.domain.plan.EventCategory
import com.runflow2.app.domain.plan.PlanMath
import com.runflow2.app.domain.plan.PlanMethodFlow
import com.runflow2.app.domain.plan.PlanSpec
import com.runflow2.app.domain.plan.RaceDefaultsTable
import com.runflow2.app.domain.plan.WizardStep
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

private data class WizardData(
    val name: String = "",
    val category: EventCategory = EventCategory.RUN,
    val raceType: RaceType = RaceType.MARATHON,
    val raceDate: LocalDate = LocalDate.now().plusWeeks(16),
    val calibrationVdot: Double? = null,
    val calibTimeText: String = "",
    val calibDistance: Triple<String, RaceType, Double> = RaceDefaultsTable.calibrationRaces[1],
    val targetTimeSec: Int? = null,
    val planLengthWeeks: Int = 12,
    // volume
    val runsPerWeek: Int = 5,
    val weeklyKm: Double = 58.0,
    val longRunKm: Double = 30.0,
    val strengthPerWeek: Int = 1,
    // ---- advanced (web-parity) ----
    val ridesPerWeek: Int = 0,
    val swimsPerWeek: Int = 0,
    val startManual: Boolean = false,
    val startWeeklyKm: Double? = null, // null = engine derives from history
    val taperWeeks: Int = 2,
    val peakWeeks: Int = 3,
    val buildWeeks: Int = 4,
    val customDistanceText: String = "",
    val customSwimText: String = "",
    val customBikeText: String = "",
    val customRunText: String = "",
    val backyardLoopText: String = "",
    val targetLaps: Int? = null,
    val hrMaxText: String = "",
    val hrRestText: String = "",
    val lthrText: String = "",
    val thresholdPaceText: String = "", // m:ss per km
    // schedule
    val longRunDay: DayOfWeek = DayOfWeek.SUNDAY,
    val workoutDay: DayOfWeek = DayOfWeek.THURSDAY,
    val swimDay: DayOfWeek? = DayOfWeek.TUESDAY,
    val restDays: Set<DayOfWeek> = setOf(DayOfWeek.TUESDAY, DayOfWeek.FRIDAY),
)

/** Races offered for each event category (wizard screen 2). */
private fun racesFor(category: EventCategory): List<RaceType> = when (category) {
    EventCategory.RUN -> RaceDefaultsTable.runRaces
    EventCategory.ULTRA -> RaceDefaultsTable.ultraRaces
    EventCategory.TRIATHLON -> RaceDefaultsTable.triRaces
    EventCategory.GENERAL -> listOf(RaceType.NONE)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanWizardScreen(
    container: AppContainer,
    onDone: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val auth by container.authStore.state.collectAsState()
    val analytics by androidx.compose.runtime.produceState<AnalyticsBundle?>(initialValue = null) {
        value = container.repository.analytics(365)
    }

    var step by remember { mutableStateOf(0) }
    var data by remember { mutableStateOf(WizardData()) }
    var creating by remember { mutableStateOf(false) }

    val steps = remember(data.raceType) { PlanMethodFlow.stepsFor(data.raceType == RaceType.NONE) }
    val stepCount = steps.size

    // prefill volume + advanced defaults from the race type (mirrors the
    // web RACE_DEFAULTS so both engines see the same starting point)
    LaunchedEffect(data.raceType) {
        val d = RaceDefaultsTable.forRace(data.raceType)
        val c = RaceDefaultsTable.crossFor(data.raceType)
        data = data.copy(
            runsPerWeek = d.runsPerWeek,
            weeklyKm = d.weeklyKm,
            longRunKm = d.longRunKm,
            strengthPerWeek = c.strengthPerWeek,
            ridesPerWeek = c.ridesPerWeek,
            swimsPerWeek = c.swimsPerWeek,
            taperWeeks = c.taperWeeks,
            peakWeeks = c.peakWeeks,
            buildWeeks = c.buildWeeks,
        )
    }

    // prefill the HR profile from the athlete profile once (like the web
    // route backfills missing HR fields from the user profile)
    LaunchedEffect(Unit) {
        val p = container.repository.profile.first() ?: return@LaunchedEffect
        data = data.copy(
            hrMaxText = if (p.hrMax > 0) p.hrMax.toString() else "",
            hrRestText = if (p.hrRest > 0) p.hrRest.toString() else "",
            lthrText = if (p.thresholdHr > 0) p.thresholdHr.toString() else "",
            thresholdPaceText = if (p.thresholdPaceSecPerKm > 0) {
                "${p.thresholdPaceSecPerKm / 60}:${(p.thresholdPaceSecPerKm % 60).toString().padStart(2, '0')}"
            } else "",
        )
    }

    val effectiveVdot = data.calibrationVdot ?: analytics?.effectiveVdot ?: 47.5
    val raceKm = data.raceType.distanceKm
        ?: data.customDistanceKm()
        ?: if (data.raceType == RaceType.CUSTOM_TRI) data.parseKm(data.customRunText) else null

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
                progress = { (step + 1).toFloat() / stepCount },
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "Step ${step + 1} of $stepCount",
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
                    when (steps[s]) {
                        WizardStep.EVENT_TYPE -> StepEventType(data, analytics) { data = it }
                        WizardStep.RACE -> StepRace(data) { data = it }
                        WizardStep.DATE -> StepDate(data) { data = it }
                        WizardStep.CALIBRATION -> StepCalibration(data, analytics) { data = it }
                        WizardStep.TARGET -> StepTarget(data, effectiveVdot, raceKm) { data = it }
                        WizardStep.VOLUME -> StepVolume(data) { data = it }
                        WizardStep.ADVANCED -> StepAdvanced(data, analytics) { data = it }
                        WizardStep.SCHEDULE -> StepSchedule(data) { data = it }
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
                        if (step < stepCount - 1) {
                            step++
                        } else if (!creating) {
                            creating = true
                            scope.launch {
                                val noRace = data.raceType == RaceType.NONE
                                val spec = PlanSpec(
                                    name = data.name.ifBlank { data.raceType.label },
                                    raceType = data.raceType,
                                    raceDate = if (noRace) LocalDate.now().plusWeeks(data.planLengthWeeks.toLong()) else data.raceDate,
                                    startDate = LocalDate.now(),
                                    targetTimeSec = data.targetTimeSec,
                                    weeklyKm = data.weeklyKm,
                                    runsPerWeek = data.runsPerWeek,
                                    longRunKm = data.longRunKm,
                                    strengthPerWeek = data.strengthPerWeek,
                                    longRunDay = data.longRunDay,
                                    workoutDay = data.workoutDay,
                                    restDays = data.restDays,
                                    taperWeeks = data.taperWeeks,
                                    vdot = effectiveVdot,
                                    calibrationTimeSec = data.calibrationVdot?.let { parseDuration(data.calibTimeText) },
                                    calibrationDistance = calibrationDistanceFor(data.calibDistance.first),
                                    ridesPerWeek = data.ridesPerWeek,
                                    swimsPerWeek = data.swimsPerWeek,
                                    startWeeklyKm = data.startWeeklyKm,
                                    peakWeeks = data.peakWeeks,
                                    buildWeeks = data.buildWeeks,
                                    swimDay = data.swimDay,
                                    backyardLoopKm = data.parseKm(data.backyardLoopText),
                                    targetLaps = data.targetLaps,
                                    customDistanceKm = data.customDistanceKm(),
                                    customSwimKm = if (data.raceType == RaceType.CUSTOM_TRI) data.parseKm(data.customSwimText) else null,
                                    customBikeKm = if (data.raceType == RaceType.CUSTOM_TRI) data.parseKm(data.customBikeText) else null,
                                    customRunKm = if (data.raceType == RaceType.CUSTOM_TRI) data.parseKm(data.customRunText) else null,
                                    maxHeartRate = data.parseInt(data.hrMaxText),
                                    restingHeartRate = data.parseInt(data.hrRestText),
                                    thresholdHeartRate = data.parseInt(data.lthrText),
                                    thresholdPaceSecPerKm = parseDuration(data.thresholdPaceText),
                                )

                                // The engine is picked automatically, never by the
                                // user: the server generator when signed in (same
                                // engine as the website, syncs instantly), the
                                // on-device port of it otherwise. There is no
                                // classic fallback any more — the on-device web
                                // engine IS the offline path.
                                var created = false
                                var note: String? = null
                                if (auth.loggedIn) {
                                    val viaServer = runCatching { container.repository.createPlanViaServer(spec) }
                                    if (viaServer.isSuccess) {
                                        created = true
                                    } else {
                                        AppLog.w(
                                            "Wizard",
                                            "server engine unavailable (${viaServer.exceptionOrNull()?.message}) — falling back to the on-device engine",
                                        )
                                        note = "Couldn't reach the server — generated the plan on this phone with the same engine as the website."
                                    }
                                }
                                if (!created) {
                                    created = runCatching { container.repository.createPlanOffline(spec) }.isSuccess
                                }
                                note?.let {
                                    Toast.makeText(container.appContext, it, Toast.LENGTH_LONG).show()
                                }
                                if (!created) {
                                    Toast.makeText(
                                        container.appContext,
                                        "Couldn't create the plan — please try again.",
                                        Toast.LENGTH_LONG,
                                    ).show()
                                }
                                creating = false
                                if (created) onDone()
                            }
                        }
                    },
                    modifier = Modifier.weight(2f),
                    enabled = when (steps[step]) {
                        WizardStep.EVENT_TYPE -> data.name.isNotBlank()
                        WizardStep.RACE ->
                            data.raceType != RaceType.CUSTOM_DISTANCE || (data.customDistanceKm() ?: 0.0) > 0.0
                        else -> true
                    },
                ) {
                    Text(if (step == stepCount - 1) "Create plan" else "Continue")
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

/** Parses a plain kilometres decimal ("42.2") — blank/invalid returns null. */
private fun WizardData.parseKm(text: String): Double? =
    text.trim().toDoubleOrNull()?.takeIf { it > 0.0 }

private fun WizardData.parseInt(text: String): Int? =
    text.trim().toIntOrNull()?.takeIf { it > 0 }

private fun WizardData.customDistanceKm(): Double? =
    if (raceType == RaceType.CUSTOM_DISTANCE) parseKm(customDistanceText) else null

// ---------------------------------------------------------------------
// Step 1 — event category (run / ultra / triathlon / general)
// ---------------------------------------------------------------------

@Composable
private fun StepEventType(
    data: WizardData,
    analytics: AnalyticsBundle?,
    update: (WizardData) -> Unit,
) {
    StepHeader("What are you training for?", "Pick a category — the specific race comes next.")

    OutlinedTextField(
        value = data.name,
        onValueChange = { update(data.copy(name = it)) },
        label = { Text("Goal name (e.g. Berlin Marathon)") },
        modifier = Modifier.fillMaxWidth(),
    )

    analytics?.effectiveVdot?.let {
        Text(
            "Your history says VO₂ max ${Format.oneDecimal(it)} — targets will adapt.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    val cards = listOf(
        Triple(EventCategory.RUN, Icons.Outlined.DirectionsRun, "5K · 10K · Half · Marathon · Custom"),
        Triple(EventCategory.ULTRA, Icons.Outlined.Terrain, "50K to 100 miles · timed · backyard"),
        Triple(EventCategory.TRIATHLON, Icons.Outlined.Pool, "Sprint to Ironman · custom"),
        Triple(EventCategory.GENERAL, Icons.Outlined.SelfImprovement, "No race — build fitness"),
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        cards.chunked(2).forEach { rowCards ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowCards.forEach { (category, icon, subtitle) ->
                    EventCard(
                        icon = icon,
                        title = category.label,
                        subtitle = subtitle,
                        selected = data.category == category,
                        modifier = Modifier.weight(1f),
                    ) {
                        if (data.category != category) {
                            val race = racesFor(category).first()
                            update(data.copy(category = category, raceType = race))
                        }
                    }
                }
                if (rowCards.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun EventCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        border = if (selected) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(
                icon, null,
                tint = if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ---------------------------------------------------------------------
// Step 2 — the specific race
// ---------------------------------------------------------------------

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StepRace(data: WizardData, update: (WizardData) -> Unit) {
    if (data.category == EventCategory.GENERAL) {
        StepHeader("General fitness", "No goal race — a repeating base plan.")
        return
    }
    StepHeader(
        "Which ${data.category.label.lowercase().let { if (it == "run") "race" else "event" }}?",
        "The plan is built around this distance.",
    )

    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        racesFor(data.category).forEach { rt ->
            FilterChip(
                selected = data.raceType == rt,
                onClick = { update(data.copy(raceType = rt)) },
                label = { Text(rt.label) },
            )
        }
    }

    when (data.raceType) {
        RaceType.CUSTOM_DISTANCE -> {
            OutlinedTextField(
                value = data.customDistanceText,
                onValueChange = { update(data.copy(customDistanceText = it)) },
                label = { Text("Race distance (km)") },
                placeholder = { Text("e.g. 32") },
                isError = (data.customDistanceKm() ?: 0.0) <= 0.0,
                supportingText = { Text("Required — a single run distance in km") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        RaceType.CUSTOM_TRI -> {
            Text("Leg distances (optional)", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = data.customSwimText,
                    onValueChange = { update(data.copy(customSwimText = it)) },
                    label = { Text("Swim km") },
                    placeholder = { Text("1.5") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = data.customBikeText,
                    onValueChange = { update(data.copy(customBikeText = it)) },
                    label = { Text("Bike km") },
                    placeholder = { Text("40") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = data.customRunText,
                    onValueChange = { update(data.copy(customRunText = it)) },
                    label = { Text("Run km") },
                    placeholder = { Text("10") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }
            Text(
                "Leave blank to use the Olympic defaults (1.5 km / 40 km / 10 km).",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        else -> {}
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
    val weeks = PlanMath.planWeeks(
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

    if (data.raceType == RaceType.NONE) {
        Text("Plan length", style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(8, 12, 16, 20).forEach { weeks ->
                FilterChip(
                    selected = data.planLengthWeeks == weeks,
                    onClick = { update(data.copy(planLengthWeeks = weeks)) },
                    label = { Text("$weeks wk") },
                )
            }
        }
    }

    Text("Runs per week: ${data.runsPerWeek}", style = MaterialTheme.typography.titleSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (2..7).forEach { n ->
            FilterChip(
                selected = data.runsPerWeek == n,
                onClick = { update(data.copy(runsPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }

    Text(
        "Peak weekly mileage: ${Format.distance(data.weeklyKm)}",
        style = MaterialTheme.typography.titleSmall,
    )
    Slider(
        value = data.weeklyKm.toFloat().coerceIn(20f, 120f),
        onValueChange = { update(data.copy(weeklyKm = (it / 2).roundToInt() * 2.0)) },
        valueRange = 20f..120f,
    )

    val cap = RaceDefaultsTable.longRunCapKm(data.raceType).toFloat()
    Text(
        "Longest long run: ${Format.distance(data.longRunKm)}",
        style = MaterialTheme.typography.titleSmall,
    )
    Slider(
        value = data.longRunKm.toFloat().coerceIn(6f, cap),
        onValueChange = { update(data.copy(longRunKm = (it / 1).roundToInt().toDouble())) },
        valueRange = 6f..cap,
    )

    Text("Strength sessions / week", style = MaterialTheme.typography.titleSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (0..4).forEach { n ->
            FilterChip(
                selected = data.strengthPerWeek == n,
                onClick = { update(data.copy(strengthPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }
}

// ---------------------------------------------------------------------
// Advanced options — everything the web generator offers
// ---------------------------------------------------------------------

@Composable
private fun StepAdvanced(
    data: WizardData,
    analytics: AnalyticsBundle?,
    update: (WizardData) -> Unit,
) {
    StepHeader("Advanced options", "Cross-training, start volume, phases & heart rate. Defaults match the web engine.")

    // ---- cross-training ----
    Text("Cross-training", style = MaterialTheme.typography.titleSmall)
    Text("Rides / week", style = MaterialTheme.typography.bodyMedium)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (0..3).forEach { n ->
            FilterChip(
                selected = data.ridesPerWeek == n,
                onClick = { update(data.copy(ridesPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }
    Text("Swims / week", style = MaterialTheme.typography.bodyMedium)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (0..3).forEach { n ->
            FilterChip(
                selected = data.swimsPerWeek == n,
                onClick = { update(data.copy(swimsPerWeek = n)) },
                label = { Text("$n") },
            )
        }
    }

    // ---- starting mileage ----
    val suggested = analytics?.weeklyVolume?.takeLast(4)
        ?.takeIf { it.isNotEmpty() }
        ?.let { weeks -> weeks.sumOf { it.km } / weeks.size }
        ?.let { (it / 5).toInt() * 5.0 }?.coerceAtLeast(5.0)
    Text("Starting weekly mileage", style = MaterialTheme.typography.titleSmall)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Set manually", style = MaterialTheme.typography.bodyLarge)
            Text(
                if (suggested != null) "Auto uses your history (≈ ${Format.distance(suggested)} recently)"
                else "Auto derives it from your history",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(
            checked = data.startManual,
            onCheckedChange = { manual ->
                update(
                    data.copy(
                        startManual = manual,
                        startWeeklyKm = if (manual) (data.startWeeklyKm ?: suggested ?: data.weeklyKm * 0.6) else null,
                    ),
                )
            },
        )
    }
    if (data.startManual) {
        val start = (data.startWeeklyKm ?: 0.0).coerceIn(0.0, data.weeklyKm)
        Text(
            "First week: ${Format.distance(start)}${if (start >= data.weeklyKm) " (same as peak)" else ""}",
            style = MaterialTheme.typography.bodyMedium,
        )
        Slider(
            value = start.toFloat(),
            onValueChange = { update(data.copy(startWeeklyKm = ((it / 5).roundToInt() * 5.0))) },
            valueRange = 0f..data.weeklyKm.toFloat().coerceAtLeast(5f),
        )
    }

    // ---- training phases ----
    Text("Training phases", style = MaterialTheme.typography.titleSmall)
    Text("Taper weeks: ${data.taperWeeks}", style = MaterialTheme.typography.bodyMedium)
    Slider(
        value = data.taperWeeks.toFloat(),
        onValueChange = { update(data.copy(taperWeeks = it.roundToInt())) },
        valueRange = 0f..4f,
    )
    Text("Peak weeks: ${data.peakWeeks}", style = MaterialTheme.typography.bodyMedium)
    Slider(
        value = data.peakWeeks.toFloat(),
        onValueChange = { update(data.copy(peakWeeks = it.roundToInt())) },
        valueRange = 0f..6f,
    )
    Text("Build weeks: ${data.buildWeeks}", style = MaterialTheme.typography.bodyMedium)
    Slider(
        value = data.buildWeeks.toFloat(),
        onValueChange = { update(data.copy(buildWeeks = it.roundToInt())) },
        valueRange = 0f..10f,
    )

    // ---- race-specific extras ----
    if (data.raceType == RaceType.BACKYARD_ULTRA) {
        Text("Backyard format", style = MaterialTheme.typography.titleSmall)
        OutlinedTextField(
            value = data.backyardLoopText,
            onValueChange = { update(data.copy(backyardLoopText = it)) },
            label = { Text("Loop distance (km)") },
            placeholder = { Text("6.7") },
            supportingText = { Text("Standard backyard: 4.167 mi (6.706 km)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Text("Target laps: ${data.targetLaps ?: 2}", style = MaterialTheme.typography.bodyMedium)
        Slider(
            value = (data.targetLaps ?: 2).toFloat(),
            onValueChange = { update(data.copy(targetLaps = it.roundToInt().coerceIn(1, 100))) },
            valueRange = 1f..100f,
        )
    }

    // ---- heart-rate profile ----
    Text("Heart-rate profile", style = MaterialTheme.typography.titleSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = data.hrMaxText,
            onValueChange = { update(data.copy(hrMaxText = it)) },
            label = { Text("Max HR") },
            placeholder = { Text("185") },
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
            value = data.hrRestText,
            onValueChange = { update(data.copy(hrRestText = it)) },
            label = { Text("Resting HR") },
            placeholder = { Text("55") },
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = data.lthrText,
            onValueChange = { update(data.copy(lthrText = it)) },
            label = { Text("Lactate threshold HR") },
            placeholder = { Text("170") },
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
            value = data.thresholdPaceText,
            onValueChange = { update(data.copy(thresholdPaceText = it)) },
            label = { Text("Threshold pace (m:ss /km)") },
            placeholder = { Text("4:35") },
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
    }
    Text(
        "Used for zone targets. Blank fields fall back to your athlete profile.",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
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

    if (data.swimsPerWeek > 0) {
        Text("Swim day", style = MaterialTheme.typography.titleSmall)
        DayPicker(selected = data.swimDay ?: DayOfWeek.TUESDAY, exclude = setOf(data.longRunDay, data.workoutDay)) {
            update(data.copy(swimDay = it))
        }
    }

    Text("Rest days", style = MaterialTheme.typography.titleSmall)
    val reserved = buildSet {
        add(data.longRunDay)
        add(data.workoutDay)
        if (data.swimsPerWeek > 0) data.swimDay?.let { add(it) }
    }
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        DayOfWeek.entries.forEach { d ->
            val disabled = d in reserved
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
            if (data.raceType == RaceType.NONE)
                "The plan repeats weekly base and build blocks, stepping your mileage up gradually."
            else
                "Every 4th week is a recovery week. Taper begins ${data.taperWeeks} week${if (data.taperWeeks == 1) "" else "s"} before race day.",
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
