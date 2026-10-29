@file:OptIn(
    androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class,
    androidx.compose.material3.ExperimentalMaterial3Api::class,
)

package com.runflow2.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AcUnit
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.GpsFixed
import androidx.compose.material.icons.outlined.HourglassBottom
import androidx.compose.material.icons.outlined.KeyboardVoice
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Stop
import androidx.compose.material.icons.outlined.Whatshot
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialShapes
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.toShape
import com.runflow2.app.ui.components.PixelSwitch
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.model.PaceZoneStatus
import com.runflow2.app.recording.RecStatus
import com.runflow2.app.recording.RecordingService
import com.runflow2.app.recording.StepDurationType
import com.runflow2.app.recording.StepRuntime
import com.runflow2.app.ui.components.InfoChip
import com.runflow2.app.ui.components.RouteCanvas
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.theme.semanticColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun RecordScreen(
    container: AppContainer,
    onOpenSaved: (String) -> Unit,
) {
    val context = LocalContext.current
    val rec by container.recording.state.collectAsState()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    var hasLocation by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    var showStopDialog by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        hasLocation = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    // after a save, open the summary
    LaunchedEffect(rec.status) {
        if (rec.status == RecStatus.IDLE) {
            container.recording.lastSavedActivityId?.let { id ->
                container.recording.lastSavedActivityId = null
                onOpenSaved(id)
            }
        }
    }

    fun begin() {
        val want = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= 29) want.add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 33) want.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = want.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        val missingLocation = missing.any {
            it == Manifest.permission.ACCESS_FINE_LOCATION || it == Manifest.permission.ACCESS_COARSE_LOCATION
        }
        if (missingLocation) {
            permissionLauncher.launch(missing.toTypedArray())
        } else {
            if (missing.isNotEmpty()) {
                permissionLauncher.launch(missing.toTypedArray())
            }
            val workoutId = container.recording.pendingWorkoutId
            RecordingService.start(context, workoutId, settings.autoPause, settings.voiceCoach)
        }
    }

    when (rec.status) {
        RecStatus.IDLE, RecStatus.FINISHED -> RecordIdle(
            container = container,
            unit = unit,
            hasLocation = hasLocation,
            onRequestPermission = { permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) },
            onStart = ::begin,
        )

        RecStatus.COUNTDOWN -> CountdownOverlay(seconds = rec.countdownRemaining)

        RecStatus.RUNNING, RecStatus.PAUSED -> RecordRunning(
            rec = rec,
            unit = unit,
            onPauseResume = {
                RecordingService.send(context, if (rec.status == RecStatus.RUNNING) RecordingService.ACTION_PAUSE else RecordingService.ACTION_RESUME)
            },
            onStop = { showStopDialog = true },
            onLap = {
                RecordingService.lap(context)
            },
        )
    }

    if (showStopDialog) {
        AlertDialog(
            onDismissRequest = { showStopDialog = false },
            title = { Text("Finish workout?") },
            text = {
                Text(
                    "Save ${Format.distance(rec.distanceM / 1000.0, unit)} in ${Format.duration(rec.elapsedMovingSec.toLong())}?",
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showStopDialog = false
                        RecordingService.send(context, RecordingService.ACTION_STOP)
                    },
                ) { Text("Save") }
            },
            dismissButton = {
                Row {
                    TextButton(
                        onClick = {
                            showStopDialog = false
                            RecordingService.send(context, RecordingService.ACTION_DISCARD)
                        },
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(
                            contentColor = MaterialTheme.colorScheme.error,
                        ),
                    ) { Text("Discard") }
                    TextButton(onClick = { showStopDialog = false }) { Text("Keep going") }
                }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun RecordIdle(
    container: AppContainer,
    unit: DistanceUnit,
    hasLocation: Boolean,
    onRequestPermission: () -> Unit,
    onStart: () -> Unit,
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val pendingWorkout = container.recording.pendingWorkoutId
    var selectedSport by remember { mutableStateOf(container.recording.selectedSportType) }
    var workout by remember { mutableStateOf<com.runflow2.app.data.db.WorkoutEntity?>(null) }
    LaunchedEffect(pendingWorkout) {
        workout = pendingWorkout?.let { container.repository.workout(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Record")
                        Text(
                            "GPS run with live pace coaching",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (!hasLocation) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.GpsFixed, null)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Location permission needed", style = MaterialTheme.typography.titleSmall)
                            Text("GPS is required to record distance and pace.", style = MaterialTheme.typography.bodySmall)
                        }
                        TextButton(onClick = onRequestPermission) { Text("Grant") }
                    }
                }
            }

            if (workout == null) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    val sportChoices = listOf(
                        "RUN" to "Run",
                        "RIDE" to "Ride",
                        "WALK" to "Walk",
                        "SWIM" to "Swim",
                        "WORKOUT" to "Strength",
                    )
                    items(sportChoices) { (code, label) ->
                        FilterChip(
                            selected = selectedSport == code,
                            onClick = {
                                selectedSport = code
                                container.recording.selectedSportType = code
                            },
                            label = { Text(label) },
                        )
                    }
                }
            }

            workout?.let { wk ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle("Planned workout")
                        Text(wk.description, style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            wk.targetDistanceKm?.let { InfoChip(Format.distance(it, unit)) }
                            Format.paceLabelFor(wk.workoutType, wk.targetPaceSecPerKm?.toDouble(), unit)?.let {
                                InfoChip(it)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // expressive cookie-shaped start button
            val cookieShape = MaterialShapes.Cookie12Sided.toShape()
            Box(
                modifier = Modifier
                    .size(150.dp)
                    .clip(cookieShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                androidx.compose.material3.IconButton(onClick = onStart, modifier = Modifier.fillMaxSize()) {
                    Icon(
                        Icons.Outlined.PlayArrow, "Start run",
                        modifier = Modifier.size(72.dp),
                        tint = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
            Text(
                "Tap to start",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Pause, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Auto-pause", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "Pauses when you stop moving",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        PixelSwitch(
                            checked = settings.autoPause,
                            onCheckedChange = { on ->
                                scope.launch { container.settings.setAutoPause(on) }
                            },
                        )
                    }
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.KeyboardVoice, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Voice coach", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "Km splits, pace warnings & step cues",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        PixelSwitch(
                            checked = settings.voiceCoach,
                            onCheckedChange = { on ->
                                scope.launch { container.settings.setVoiceCoach(on) }
                            },
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun CountdownOverlay(seconds: Int) {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.82f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                if (seconds > 0) "$seconds" else "GO!",
                style = MaterialTheme.typography.displayLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.inverseOnSurface,
            )
            Text(
                "Starting your run",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.inverseOnSurface.copy(alpha = 0.7f),
            )
        }
    }
}

@Composable
private fun RecordRunning(
    rec: com.runflow2.app.recording.RecordingState,
    unit: DistanceUnit,
    onPauseResume: () -> Unit,
    onStop: () -> Unit,
    onLap: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // header row: name + GPS chip
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    rec.workoutName ?: "Free run",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    if (rec.status == RecStatus.PAUSED) "Paused" else "Recording",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            InfoChip(
                if (rec.gpsFixed) "GPS ±${rec.gpsAccuracyM?.toInt() ?: 0} m" else "GPS searching",
                icon = Icons.Outlined.GpsFixed,
                container = if (rec.gpsFixed) MaterialTheme.colorScheme.secondaryContainer
                else MaterialTheme.colorScheme.errorContainer,
                contentColor = if (rec.gpsFixed) MaterialTheme.colorScheme.onSecondaryContainer
                else MaterialTheme.colorScheme.onErrorContainer,
            )
        }

        // hero pace
        Column(
            Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                Format.pace(rec.currentPaceSecPerKm, unit),
                style = MaterialTheme.typography.displayLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "min / ${Format.distanceUnitLabel(unit)}   (avg ${Format.pace(rec.avgPaceSecPerKm, unit)})",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        PaceZoneIndicator(rec.paceZone, rec.targetPaceSecPerKm, unit)

        // metric grid
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            androidx.compose.foundation.layout.Row(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                MetricCell("Distance", Format.distance(rec.distanceM / 1000.0, unit, 2))
                MetricCell("Time", Format.duration(rec.elapsedMovingSec.toLong()))
                MetricCell("Elev", "${rec.elevationGainM.toInt()} m")
            }
        }

        // route
        if (rec.routePreview.size > 3) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                RouteCanvas(
                    points = rec.routePreview,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .padding(12.dp),
                )
            }
        }

        // structured steps
        if (rec.steps.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val active = rec.steps.getOrNull(rec.activeStepIndex)
                    if (active != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Flag, null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                active.label,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f),
                            )
                            rec.currentStepRemaining?.let { remaining ->
                                InfoChip(stepRemainingLabel(active, remaining, unit))
                            }
                        }
                        LinearProgressIndicator(
                            progress = { rec.stepProgress },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        active.note?.takeIf { it.isNotBlank() }?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        val minP = active.minPaceSecPerKm
                        val maxP = active.maxPaceSecPerKm
                        val targetP = active.targetPaceSecPerKm
                        val paceUnitLabel = if (active.isSwim) "100m" else Format.distanceUnitLabel(unit)
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (minP != null && maxP != null && minP < maxP) {
                                InfoChip(
                                    "${Format.pace(minP, unit)}–${Format.pace(maxP, unit)} /${paceUnitLabel}",
                                    container = MaterialTheme.colorScheme.surfaceContainerHighest,
                                )
                            } else if (targetP != null) {
                                InfoChip(
                                    "Target ${Format.pace(targetP, unit)} /${paceUnitLabel}",
                                    container = MaterialTheme.colorScheme.surfaceContainerHighest,
                                )
                            }
                            if (active.targetPowerMinWatts != null && active.targetPowerMaxWatts != null) {
                                InfoChip(
                                    "${active.targetPowerMinWatts}–${active.targetPowerMaxWatts} W",
                                    container = MaterialTheme.colorScheme.tertiaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
                                )
                            }
                            if (active.hrZone != null) {
                                InfoChip(
                                    "Z${active.hrZone}",
                                    container = MaterialTheme.colorScheme.secondaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                                )
                            }
                        }
                        val upcoming = rec.steps.drop(rec.activeStepIndex + 1)
                        if (upcoming.isNotEmpty()) {
                            Text(
                                "Upcoming",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            upcoming.take(3).forEach { step ->
                                UpcomingStepRow(step, unit)
                            }
                            val rest = upcoming.drop(3)
                            if (rest.isNotEmpty()) {
                                LazyColumn(
                                    Modifier.heightIn(max = 168.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    items(rest) { step ->
                                        UpcomingStepRow(step, unit, compact = true)
                                    }
                                }
                            }
                        }
                    } else {
                        Text(
                            "All steps complete — cool down and finish when ready.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        // laps
        if (rec.laps.isNotEmpty()) {
            Text("Splits", style = MaterialTheme.typography.titleSmall)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rec.laps) { lap ->
                    InfoChip(
                        "K${lap.km} · ${Format.pace(lap.paceSecPerKm.toDouble(), unit)}",
                        container = MaterialTheme.colorScheme.surfaceContainerHighest,
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // control buttons
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            androidx.compose.material3.OutlinedButton(
                onClick = onStop,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
            ) {
                Icon(Icons.Outlined.Stop, null)
                Spacer(Modifier.width(4.dp))
                Text("Finish")
            }
            androidx.compose.material3.OutlinedButton(
                onClick = onLap,
                modifier = Modifier
                    .weight(1.2f)
                    .height(56.dp),
            ) {
                Icon(Icons.Outlined.Flag, null)
                Spacer(Modifier.width(4.dp))
                Text(if (rec.steps.isNotEmpty() && rec.activeStepIndex < rec.steps.size) "Lap / Next" else "Lap")
            }
            Button(
                onClick = onPauseResume,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
            ) {
                Icon(
                    if (rec.status == RecStatus.RUNNING) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                    null,
                )
                Spacer(Modifier.width(4.dp))
                Text(if (rec.status == RecStatus.RUNNING) "Pause" else "Resume")
            }
        }
    }
}

@Composable
private fun MetricCell(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** mm:ss for TIME steps, meters for DISTANCE steps (converted for imperial users). */
private fun stepRemainingLabel(step: StepRuntime, remaining: Double, unit: DistanceUnit): String =
    if (step.durationType == StepDurationType.TIME) {
        Format.duration(kotlin.math.ceil(remaining).toLong())
    } else if (unit == DistanceUnit.METRIC) {
        "${remaining.toInt()} m"
    } else {
        Format.distance(remaining / 1000.0, unit)
    }

private fun stepIcon(kind: String): ImageVector = when (kind) {
    "warmup" -> Icons.Outlined.Whatshot
    "recovery" -> Icons.Outlined.HourglassBottom
    "cooldown" -> Icons.Outlined.AcUnit
    else -> Icons.Outlined.Flag
}

/** Right-aligned detail: target pace when known, else the step's duration/distance. */
private fun stepDetail(step: StepRuntime, unit: DistanceUnit): String =
    step.targetPaceSecPerKm?.let { Format.pace(it, unit) }
        ?: if (step.durationType == StepDurationType.DISTANCE) {
            Format.distance(step.distanceM / 1000.0, unit)
        } else {
            Format.duration(step.durationSec.toLong())
        }

@Composable
private fun UpcomingStepRow(step: StepRuntime, unit: DistanceUnit, compact: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            stepIcon(step.kind),
            null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(if (compact) 16.dp else 18.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            step.label,
            style = if (compact) MaterialTheme.typography.bodySmall else MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            stepDetail(step, unit),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun PaceZoneIndicator(
    status: PaceZoneStatus,
    targetPace: Double?,
    unit: DistanceUnit,
) {
    if (targetPace == null || status == PaceZoneStatus.NO_TARGET) return
    val (color, label) = when (status) {
        PaceZoneStatus.TOO_FAST -> MaterialTheme.semanticColors.statusFatigued to "Too fast — ease off"
        PaceZoneStatus.IN_ZONE -> MaterialTheme.semanticColors.statusFresh to "In target zone"
        PaceZoneStatus.TOO_SLOW -> MaterialTheme.semanticColors.statusNeutral to "Below target — push a bit"
        PaceZoneStatus.NO_TARGET -> return
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(10.dp)
                        .background(color, CircleShape),
                )
                Spacer(Modifier.width(8.dp))
                Text(label, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.weight(1f))
                Text(
                    "target ${Format.pace(targetPace, unit)} /${Format.distanceUnitLabel(unit)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            LinearProgressIndicator(
                progress = {
                    when (status) {
                        PaceZoneStatus.TOO_FAST -> 0.12f
                        PaceZoneStatus.IN_ZONE -> 0.5f
                        else -> 0.88f
                    }
                },
                color = color,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
