package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
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
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
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
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.ui.components.RouteCanvas
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.StreamsChart
import com.runflow2.app.ui.components.ZoneDistribution
import com.runflow2.app.ui.theme.semanticColors
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

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
    onDiscuss: (String) -> Unit = {},
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(
        initial = com.runflow2.app.data.repo.AppSettings(),
    )
    val u = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    var activity by remember { mutableStateOf<ActivityEntity?>(null) }
    var loaded by remember { mutableStateOf(false) }
    LaunchedEffect(activityId) {
        activity = container.repository.activity(activityId)
        loaded = true
    }
    val a = activity
    if (a == null) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(if (loaded) "Activity not found" else "Activity") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                        }
                    },
                )
            },
        ) { padding ->
            Column(
                Modifier.fillMaxSize().padding(padding),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (!loaded) CircularProgressIndicator()
            }
        }
        return
    }
    var showDelete by remember { mutableStateOf(false) }
    var showRename by remember { mutableStateOf(false) }

    val route = remember(a.id, a.routeJson) { parseRoute(a.routeJson) }
    val laps = remember(a.id, a.lapsJson) { parseLaps(a.lapsJson) }

    val isRideTypeFlag = remember(a.type, a.averageWatts, a.npWatts) {
        Format.isRideType(a.type) || a.averageWatts != null || a.npWatts != null
    }
    // ---- analysis streams: local cache first, server fetch once for synced rows ----
    val series = remember(a.id, a.streamsJson, isRideTypeFlag) {
        a.streams()?.let { StreamMath.build(it, isRide = isRideTypeFlag) }
    }
    val isRide = remember(isRideTypeFlag, series) {
        isRideTypeFlag || (series?.hasWatts == true)
    }
    var loadingStreams by remember(activityId) { mutableStateOf(false) }
    LaunchedEffect(a.id, a.serverId, a.streamsJson) {
        if (series == null && a.serverId != null && (a.type == "RUN" || Format.isRideType(a.type))) {
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
                    IconButton(onClick = { showRename = true }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Rename")
                    }
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
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
                                when {
                                    Format.isRideType(a.type) -> "Speed"
                                    Format.isSwimType(a.type) -> "Pace /100m"
                                    else -> "Pace"
                                },
                                Format.activityPaceLabel(a.type, a.paceSecPerKm, u) ?: "—",
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
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

            // cycling power card (ride power metrics & Coggan zones)
            if (isRide) {
                item {
                    CyclingPowerCard(
                        activity = a,
                        series = series,
                        ftpWatts = settings.ftpWatts,
                    )
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
                }, onDiscuss = { onDiscuss(a.id) }, discussLabel = "Discuss this ${Format.activityNoun(a.type)}") }
            }

            // analysis charts (HR / pace / GAP / elevation / power)
            if (series != null && !series.isEmpty &&
                (series.hasHr || series.hasPace || series.hasElevation || series.hasWatts)
            ) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            SectionTitle("Analysis")
                            Spacer(Modifier.height(12.dp))
                            StreamsChart(series = series, unit = u, isRide = isRide, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
            } else if (loadingStreams) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                    ) {
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
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                    ) {
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
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                    ) {
                        Column(
                            Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            SectionTitle("Splits")
                            Spacer(Modifier.height(4.dp))
                            laps.forEachIndexed { idx, lap ->
                                val rowBg = if (idx % 2 == 1) MaterialTheme.colorScheme.surfaceContainer else Color.Transparent
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(rowBg, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
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
                                        when {
                                            Format.isRideType(a.type) -> "${Format.speedKmh(lap.third)} km/h"
                                            // lap paces are sec/km like every activity row
                                            Format.isSwimType(a.type) -> Format.activityPaceLabel("SWIM", lap.third, u) ?: "—"
                                            else -> Format.paceWithUnit(lap.third, u)
                                        },
                                        Modifier.padding(start = 16.dp),
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // zones
            if (a.zoneSeconds.sum() > 0) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                        ),
                    ) {
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

    if (showRename) {
        EditActivityDialog(
            initialName = a.name,
            initialType = a.type,
            initialTrainingType = a.trainingType ?: "EASY",
            onDismiss = { showRename = false },
            onConfirm = { name, sportType, trainingType ->
                showRename = false
                scope.launch {
                    container.repository.updateActivityDetails(a.id, name, sportType, trainingType)
                    activity = container.repository.activity(activityId)
                }
            },
        )
    }
}

@Composable
private fun EditActivityDialog(
    initialName: String,
    initialType: String,
    initialTrainingType: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit,
) {
    var name by remember { mutableStateOf(initialName) }
    var sportType by remember { mutableStateOf(initialType) }
    var trainingType by remember { mutableStateOf(initialTrainingType) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit activity") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it.take(200) },
                    label = { Text("Name") },
                    singleLine = true,
                    isError = name.isBlank(),
                    supportingText = if (name.isBlank()) {
                        { Text("Name can't be empty") }
                    } else null,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Sport", style = MaterialTheme.typography.labelMedium)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("RUN" to "Run", "RIDE" to "Ride", "SWIM" to "Swim", "WALK" to "Walk", "WORKOUT" to "Gym").forEach { (code, label) ->
                        androidx.compose.material3.FilterChip(
                            selected = sportType == code,
                            onClick = { sportType = code },
                            label = { Text(label) },
                        )
                    }
                }
                Text("Session intensity", style = MaterialTheme.typography.labelMedium)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf("EASY" to "Easy", "TEMPO" to "Tempo", "INTERVALS" to "Intervals", "LONG_RUN" to "Long", "RACE" to "Race").forEach { (code, label) ->
                        androidx.compose.material3.FilterChip(
                            selected = trainingType == code,
                            onClick = { trainingType = code },
                            label = { Text(label) },
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(name, sportType, trainingType) },
                enabled = name.isNotBlank(),
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun AiOverviewCard(
    state: AiUiState,
    onGenerate: (Boolean) -> Unit,
    onReload: () -> Unit,
    onDiscuss: () -> Unit = {},
    discussLabel: String = "Discuss this activity",
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
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
                    TextButton(onClick = onDiscuss) {
                        Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(discussLabel)
                    }
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
    // Feedback bodies carry real markdown (headers, bullets, bold, tables) —
    // the same content the web renders with react-markdown.
    com.runflow2.app.ui.components.MarkdownText(markdown = markdown)
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

@Composable
private fun CyclingPowerCard(
    activity: ActivityEntity,
    series: StreamMath.Series?,
    ftpWatts: Int,
) {
    val avgW = activity.averageWatts ?: series?.watts?.takeIf { it.isNotEmpty() }?.average()
    val npW = activity.npWatts ?: series?.watts?.let { AnalyticsEngine.calculateNormalizedPower(it) }
    val maxW = activity.maxWatts ?: series?.watts?.maxOrNull()
    val ifVal = activity.intensityFactor ?: (if (npW != null && ftpWatts > 0) AnalyticsEngine.calculateIntensityFactor(npW, ftpWatts) else null)
    val viVal = activity.variabilityIndex ?: (if (npW != null && avgW != null && avgW > 0.0) AnalyticsEngine.calculateVariabilityIndex(npW, avgW) else null)
    val tssVal = activity.bikeTss ?: (if (npW != null && ifVal != null && ftpWatts > 0) AnalyticsEngine.calculateBikeTss(activity.movingTimeSec, npW, ifVal, ftpWatts) else null)
    val workKj = if (avgW != null) (avgW * activity.movingTimeSec / 1000.0).roundToInt() else null
    val efVal = activity.efficiencyFactor ?: (if (npW != null && activity.averageHr != null && activity.averageHr > 0.0) AnalyticsEngine.calculateEfficiencyFactor(npW, activity.averageHr) else null)
    val decoupling = activity.aerobicDecoupling

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Outlined.Bolt,
                        contentDescription = null,
                        tint = MaterialTheme.semanticColors.streamPower,
                    )
                    Text(
                        "Cycling Power",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                // Badge: Power Meter vs Estimated
                androidx.compose.material3.Surface(
                    color = if (activity.deviceWatts) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                ) {
                    Text(
                        if (activity.deviceWatts) "Power Meter" else "Estimated Power",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = if (activity.deviceWatts) {
                            MaterialTheme.colorScheme.onPrimaryContainer
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                }
            }

            // Row 1: Avg Watts, NP, Max Watts
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatTile(
                    "Avg Power",
                    avgW?.let { "${it.roundToInt()} W" } ?: "—",
                    Icons.Outlined.Bolt,
                    accent = MaterialTheme.semanticColors.streamPower,
                )
                StatTile(
                    "Normalized (NP)",
                    npW?.let { "${it.roundToInt()} W" } ?: "—",
                    Icons.Outlined.Speed,
                    accent = MaterialTheme.colorScheme.primary,
                )
                StatTile(
                    "Max Power",
                    maxW?.let { "${it.roundToInt()} W" } ?: "—",
                    Icons.Outlined.Bolt,
                )
            }

            // Row 2: IF, VI, Bike TSS
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatTile(
                    "Intensity (IF)",
                    ifVal?.let { "%.2f".format(it) } ?: "—",
                    Icons.Outlined.Speed,
                )
                StatTile(
                    "Variability (VI)",
                    viVal?.let { "%.2f".format(it) } ?: "—",
                    Icons.Outlined.Speed,
                )
                StatTile(
                    "Bike TSS",
                    tssVal?.let { "%.0f".format(it) } ?: "—",
                    Icons.Outlined.Bolt,
                    accent = MaterialTheme.colorScheme.tertiary,
                )
            }

            // Row 3: Work, EF, Aerobic Decoupling
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatTile(
                    "Work",
                    workKj?.let { "$it kJ" } ?: "—",
                    Icons.Outlined.LocalFireDepartment,
                )
                StatTile(
                    "Efficiency (EF)",
                    efVal?.let { "%.2f".format(it) } ?: "—",
                    Icons.Outlined.Favorite,
                )
                StatTile(
                    "Decoupling",
                    decoupling?.let { "${if (it >= 0) "+" else ""}%.1f%%".format(it) } ?: "—",
                    Icons.Outlined.MonitorHeart,
                )
            }

            // 7-zone Coggan power breakdown if watts stream exists
            if (series?.hasWatts == true) {
                val effectiveFtp = if (ftpWatts > 0) ftpWatts else (AnalyticsEngine.estimateBikeFtpFromVdot(activity.estimatedVdot ?: 45.0) ?: 200)
                val powerZoneSecs = remember(series, effectiveFtp) {
                    AnalyticsEngine.calculatePowerZoneTimes(series.watts ?: emptyList(), series.time, effectiveFtp)
                }
                if (powerZoneSecs.sum() > 0) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        if (ftpWatts > 0) "Coggan Power Zones (FTP ${ftpWatts}W)" else "Coggan Power Zones (est. ${effectiveFtp}W)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    ZoneDistribution(zonesSeconds = powerZoneSecs)
                }
            }
        }
    }
}

