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
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Straighten
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.StreamMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.data.net.AiFeedbackDto
import com.runflow2.app.data.repo.RunFlowRepository
import com.runflow2.app.data.sync.streams
import com.runflow2.app.ui.components.RouteCanvas
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.StreamsChart
import com.runflow2.app.ui.components.ZoneDistribution
import kotlinx.coroutines.launch

/** UI state of the per-run AI overview card. */
private sealed interface AiUiState {
    data object Loading : AiUiState
    data object Missing : AiUiState
    data object Generating : AiUiState
    data class Ready(val feedback: AiFeedbackDto) : AiUiState
    data class Queued(val message: String) : AiUiState
    data class Error(val message: String) : AiUiState
}

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

    // ---- analysis streams: local cache first, server fetch once for synced rows ----
    val series = remember(a.id, a.streamsJson) { a.streams()?.let { StreamMath.build(it) } }
    var loadingStreams by remember(activityId) { mutableStateOf(false) }
    LaunchedEffect(a.id, a.serverId, a.streamsJson) {
        if (series == null && a.serverId != null) {
            loadingStreams = true
            val cached = container.repository.fetchAndCacheStreams(a.id, a.serverId)
            loadingStreams = false
            if (cached) activity = container.repository.activity(activityId)
        }
    }

    // ---- AI overview (server-generated; only exists for synced activities) ----
    var aiState by remember(activityId) {
        mutableStateOf<AiUiState>(if (a.serverId != null) AiUiState.Loading else AiUiState.Missing)
    }
    LaunchedEffect(a.id, a.serverId) {
        if (a.serverId != null) {
            aiState = when (val r = container.repository.loadActivityFeedback(a.serverId)) {
                is RunFlowRepository.AiFeedbackResult.Ready -> AiUiState.Ready(r.feedback)
                is RunFlowRepository.AiFeedbackResult.Error -> AiUiState.Error(r.message)
                is RunFlowRepository.AiFeedbackResult.Queued -> AiUiState.Queued(r.message)
                is RunFlowRepository.AiFeedbackResult.None -> AiUiState.Missing
            }
        }
    }

    fun generateAi(regenerate: Boolean) {
        val serverId = a.serverId ?: return
        scope.launch {
            aiState = AiUiState.Generating
            aiState = when (val r = container.repository.generateActivityFeedback(serverId, regenerate)) {
                is RunFlowRepository.AiFeedbackResult.Ready -> AiUiState.Ready(r.feedback)
                is RunFlowRepository.AiFeedbackResult.Error -> AiUiState.Error(r.message)
                is RunFlowRepository.AiFeedbackResult.Queued -> AiUiState.Queued(r.message)
                is RunFlowRepository.AiFeedbackResult.None -> AiUiState.Missing
            }
        }
    }

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

            // AI overview (web's "AI Coach Feedback")
            if (a.serverId != null) {
                item { AiOverviewCard(aiState, onGenerate = ::generateAi, onReload = {
                    scope.launch {
                        aiState = when (val r = container.repository.loadActivityFeedback(a.serverId)) {
                            is RunFlowRepository.AiFeedbackResult.Ready -> AiUiState.Ready(r.feedback)
                            is RunFlowRepository.AiFeedbackResult.Error -> AiUiState.Error(r.message)
                            is RunFlowRepository.AiFeedbackResult.Queued -> AiUiState.Queued(r.message)
                            is RunFlowRepository.AiFeedbackResult.None -> AiUiState.Missing
                        }
                    }
                }) }
            }

            // analysis charts (HR / pace / GAP / elevation)
            if (series != null && !series.isEmpty &&
                (series.hasHr || series.hasPace || series.hasElevation)
            ) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            SectionTitle("Analysis")
                            Spacer(Modifier.height(12.dp))
                            StreamsChart(series = series, unit = u, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
            } else if (loadingStreams) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                            Text(
                                "Loading analysis…",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
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

@Composable
private fun AiOverviewCard(
    state: AiUiState,
    onGenerate: (Boolean) -> Unit,
    onReload: () -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    Icons.Outlined.AutoAwesome,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    "AI Coach",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                if (state is AiUiState.Ready) {
                    TextButton(onClick = { onGenerate(true) }) {
                        Icon(Icons.Outlined.Refresh, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Regenerate")
                    }
                }
            }

            when (state) {
                is AiUiState.Loading, is AiUiState.Generating -> {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                        Text(
                            if (state is AiUiState.Loading) "Loading AI analysis…" else "Analyzing your run…",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                is AiUiState.Missing -> {
                    Text(
                        "Get an AI breakdown of this run — execution vs your plan, recent progress and goal trajectory.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = { onGenerate(false) }) { Text("Generate AI Analysis") }
                }
                is AiUiState.Queued -> {
                    Text(
                        state.message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = onReload) { Text("Check again") }
                }
                is AiUiState.Error -> {
                    Text(
                        state.message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                    TextButton(onClick = onReload) { Text("Retry") }
                }
                is AiUiState.Ready -> {
                    val f = state.feedback
                    AiFeedbackSection("Vs Planned Workout", f.plannedComparison)
                    AiFeedbackSection("Progress & Execution", f.progressAnalysis)
                    AiFeedbackSection("Goal Trajectory", f.goalTrajectory)
                }
            }
        }
    }
}

@Composable
private fun AiFeedbackSection(title: String, markdown: String?) {
    if (markdown.isNullOrBlank()) return
    Text(
        title,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
    )
    // The model returns light markdown (bold markers, dash bullets); strip
    // the markers rather than shipping a markdown renderer for 2-3 sentences.
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        markdown.split("\n").forEach { raw ->
            val line = raw.trim().trimStart('#').trim()
            if (line.isEmpty()) return@forEach
            val bullet = line.startsWith("- ") || line.startsWith("• ")
            val body = line.removePrefix("- ").removePrefix("• ").replace("**", "")
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = if (bullet) Modifier.padding(start = 10.dp) else Modifier,
            )
        }
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
