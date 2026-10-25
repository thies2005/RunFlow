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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Pool
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.text.input.KeyboardType
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.repo.RunFlowRepository
import java.util.UUID
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.model.ActivityType
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivitiesScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onOpen: (String) -> Unit,
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val scope = rememberCoroutineScope()
    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val syncStatus by container.syncManager.status.collectAsState()
    var filter by rememberSaveable { mutableStateOf("ALL") }
    var showCreateManual by rememberSaveable { mutableStateOf(false) }

    val filtered = when (filter) {
        "RUN" -> activities.filter { it.type == "RUN" }
        "RIDE" -> activities.filter { Format.isRideType(it.type) }
        "SWIM" -> activities.filter { Format.isSwimType(it.type) }
        "OTHER" -> activities.filter { it.type != "RUN" && !Format.isRideType(it.type) && !Format.isSwimType(it.type) }
        else -> activities
    }

    // Pull-to-refresh runs a full sync including the server-side Strava import
    // (forced past the 6h throttle) so new rides/runs appear on demand.
    PullToRefreshBox(
        isRefreshing = syncStatus.running,
        onRefresh = {
            container.appScope.launch {
                container.syncManager.syncNow("pull-refresh", forceStrava = true)
            }
        },
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Activities") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showCreateManual = true }) {
                            Icon(Icons.Outlined.Add, contentDescription = "Log manual activity")
                        }
                    },
                )
            },
        ) { padding ->
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf(
                        "ALL" to "All",
                        "RUN" to "Runs",
                        "RIDE" to "Rides",
                        "SWIM" to "Swims",
                        "OTHER" to "Other",
                    ).forEach { (key, label) ->
                        FilterChip(
                            selected = filter == key,
                            onClick = { filter = key },
                            label = { Text(label) },
                        )
                    }
                }
                LazyColumn(
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filtered, key = { it.id }) { a ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpen(a.id) },
                        ) {
                            Row(
                                Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                val type = runCatching { ActivityType.valueOf(a.type) }
                                    .getOrDefault(ActivityType.RUN)
                                val icon = activityIcon(type)
                                Box(
                                    Modifier
                                        .size(40.dp)
                                        .background(MaterialTheme.colorScheme.secondaryContainer, CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(icon, null, tint = MaterialTheme.colorScheme.onSecondaryContainer)
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(a.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(
                                        "${Format.distance(a.distanceKm, unit)} · ${Format.duration(a.movingTimeSec)} · ${
                                            Format.activityPaceLabel(a.type, a.paceSecPerKm, unit) ?: "—"
                                        }",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        a.averageHr?.let { "${it.toInt()} bpm" } ?: "",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        Format.date(Format.localDate(a.startDate)),
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateManual) {
        var name by rememberSaveable { mutableStateOf("") }
        var sport by rememberSaveable { mutableStateOf("RUN") }
        var distanceText by rememberSaveable { mutableStateOf("") }
        var durationMinText by rememberSaveable { mutableStateOf("45") }
        var avgHrText by rememberSaveable { mutableStateOf("") }
        var avgWattsText by rememberSaveable { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showCreateManual = false },
            title = { Text("Log manual activity") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("RUN" to "Run", "RIDE" to "Ride", "SWIM" to "Swim", "WORKOUT" to "Gym").forEach { (code, label) ->
                            FilterChip(
                                selected = sport == code,
                                onClick = { sport = code },
                                label = { Text(label) },
                            )
                        }
                    }
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Activity name") },
                        placeholder = { Text("e.g. Indoor Ride / Track Session") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = distanceText,
                            onValueChange = { distanceText = it },
                            label = { Text("Distance (km)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = durationMinText,
                            onValueChange = { durationMinText = it.filter(Char::isDigit) },
                            label = { Text("Duration (min)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = avgHrText,
                            onValueChange = { avgHrText = it.filter(Char::isDigit).take(3) },
                            label = { Text("Avg HR (opt)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        if (sport == "RIDE") {
                            OutlinedTextField(
                                value = avgWattsText,
                                onValueChange = { avgWattsText = it.filter(Char::isDigit).take(4) },
                                label = { Text("Avg Watts (opt)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = (durationMinText.toIntOrNull() ?: 0) > 0,
                    onClick = {
                        val movingSec = (durationMinText.toIntOrNull() ?: 30).coerceAtLeast(1) * 60
                        val km = distanceText.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0
                        val avgHr = avgHrText.toDoubleOrNull()
                        val avgW = if (sport == "RIDE") avgWattsText.toDoubleOrNull() else null
                        scope.launch {
                            val profile = container.repository.profileOnce()
                            val trimp = RunFlowRepository.computeTrimp(
                                movingTimeSec = movingSec,
                                avgHr = avgHr,
                                zoneSeconds = List(7) { 0 },
                                distanceKm = km,
                                thresholdPaceSecPerKm = profile.thresholdPaceSecPerKm,
                                hrMax = profile.hrMax,
                                hrRest = profile.hrRest,
                                isRun = sport == "RUN",
                            )
                            val kcal = com.runflow2.app.core.math.CalorieMath.estimate(
                                movingSec, km * 1000.0, profile.weightKg, sport,
                            )
                            val entity = ActivityEntity(
                                id = UUID.randomUUID().toString(),
                                name = name.trim().ifBlank { "Manual ${Format.activityNoun(sport).replaceFirstChar { it.uppercase() }}" },
                                type = sport,
                                startDate = System.currentTimeMillis(),
                                distanceMeters = km * 1000.0,
                                movingTimeSec = movingSec,
                                averageHr = avgHr,
                                maxHr = null,
                                averageCadence = null,
                                totalElevation = 0.0,
                                calories = kcal,
                                trimp = trimp,
                                trainingType = if (sport == "RUN") "EASY" else "OTHER",
                                estimatedVdot = if (sport == "RUN") RunFlowRepository.estimateVdot(km, movingSec) else null,
                                routeJson = null,
                                lapsJson = null,
                                averageWatts = avgW,
                                npWatts = avgW,
                                isDemo = false,
                            )
                            container.repository.saveActivity(entity)
                            showCreateManual = false
                        }
                    },
                ) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showCreateManual = false }) { Text("Cancel") }
            },
        )
    }
}

fun activityIcon(type: ActivityType): ImageVector = when (type) {
    ActivityType.RUN -> Icons.Outlined.DirectionsRun
    ActivityType.RIDE -> Icons.Outlined.DirectionsBike
    ActivityType.WALK, ActivityType.HIKE -> Icons.Outlined.DirectionsWalk
    ActivityType.SWIM -> Icons.Outlined.Pool
    else -> Icons.Outlined.DirectionsRun
}
