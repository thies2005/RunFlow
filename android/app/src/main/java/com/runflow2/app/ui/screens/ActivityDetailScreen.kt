package com.runflow2.app.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Straighten
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.ui.components.RouteCanvas
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.ZoneDistribution
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityDetailScreen(
    container: AppContainer,
    activityId: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(
        initial = com.runflow2.app.data.repo.AppSettings(),
    )
    val u = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    var activity by remember { mutableStateOf<ActivityEntity?>(null) }
    LaunchedEffect(activityId) {
        activity = container.repository.activity(activityId)
    }
    val a = activity ?: return
    var showDelete by remember { mutableStateOf(false) }

    val route = remember(a.id, a.routeJson) { parseRoute(a.routeJson) }
    val laps = remember(a.id, a.lapsJson) { parseLaps(a.lapsJson) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(a.name, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showDelete = true }) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete")
                    }
                },
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
            // hero metrics
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text(
                                    Format.distance(a.distanceKm, u, 2),
                                    style = MaterialTheme.typography.displaySmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    Format.dateTimeLine(a.startDate),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile("Time", Format.duration(a.movingTimeSec), Icons.Outlined.Timer)
                            StatTile(
                                "Pace",
                                Format.paceWithUnit(a.paceSecPerKm, u),
                                Icons.Outlined.Speed,
                                accent = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile("Avg HR", Format.heartRate(a.averageHr), Icons.Outlined.Favorite)
                            StatTile("Max HR", a.maxHr?.toString() ?: "—", Icons.Outlined.MonitorHeart)
                        }
                    }
                }
            }

            // more metrics
            item {
                Card(Modifier.fillMaxWidth()) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        StatTile("Elev gain", "${a.totalElevation.toInt()} m", Icons.Outlined.Straighten)
                        StatTile("Calories", a.calories?.toString() ?: "—", Icons.Outlined.LocalFireDepartment)
                        StatTile("TRIMP", Format.intOrDash(a.trimp), Icons.Outlined.Bolt, accent = MaterialTheme.colorScheme.tertiary)
                    }
                }
            }

            // route
            if (route.size > 2) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            SectionTitle("Route")
                            Spacer(Modifier.height(10.dp))
                            RouteCanvas(
                                points = route,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                            )
                        }
                    }
                }
            }

            // laps
            if (laps.isNotEmpty()) {
                item { SectionTitle("Splits") }
                items(laps.size) { i ->
                    val lap = laps[i]
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    ) {
                        Text(
                            "Km ${lap.first}",
                            Modifier.weight(1f),
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Text(
                            Format.duration(lap.second),
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            Format.paceWithUnit(lap.third, u),
                            Modifier.padding(start = 16.dp),
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }

            // zones
            if (a.zoneSeconds.sum() > 0) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            SectionTitle("Heart-rate zones")
                            ZoneDistribution(zonesSeconds = a.zoneSeconds)
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    if (showDelete) {
        AlertDialog(
            onDismissRequest = { showDelete = false },
            title = { Text("Delete activity?") },
            text = { Text("This removes the run and its data from this device.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDelete = false
                        scope.launch {
                            container.repository.deleteActivity(a.id)
                            onBack()
                        }
                    },
                ) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { showDelete = false }) { Text("Cancel") } },
        )
    }
}

private fun parseRoute(json: String?): List<Pair<Double, Double>> {
    if (json.isNullOrBlank()) return emptyList()
    return runCatching {
        Regex("""\[(\-?\d+\.\d+),(\-?\d+\.\d+)\]""").findAll(json)
            .map { m ->
                val lat = m.groupValues[1].toDouble()
                val lng = m.groupValues[2].toDouble()
                lat to lng
            }
            .toList()
    }.getOrDefault(emptyList())
}

private fun parseLaps(json: String?): List<Triple<Int, Int, Double>> {
    if (json.isNullOrBlank()) return emptyList()
    return runCatching {
        Regex("""\{"km":(\d+),"durSec":(\d+),"paceSecPerKm":(\d+)\}""").findAll(json)
            .map { m ->
                Triple(
                    m.groupValues[1].toInt(),
                    m.groupValues[2].toInt(),
                    m.groupValues[3].toDouble(),
                )
            }
            .toList()
    }.getOrDefault(emptyList())
}
