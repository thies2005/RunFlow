package com.runflow.app.ui.screens.activities

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.ui.common.*
import com.runflow.app.data.model.Activity
import com.runflow.app.data.model.ActivityType
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityDetailScreen(
    onNavigateBack: () -> Unit,
    viewModel: ActivityDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Activity Details") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is ActivityDetailUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is ActivityDetailUiState.Success -> {
                ActivityDetailContent(
                    activity = state.activity,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                )
            }
            is ActivityDetailUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Error: ${state.message}", color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
fun ActivityDetailContent(
    activity: Activity,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Activity Header
        ActivityHeader(activity)

        // Stats Grid
        ActivityStatsGrid(activity)

        // Heart Rate Section
        if (activity.hasHeartrate && activity.averageHr != null) {
            HeartRateSection(activity)
        }

        // Performance Metrics
        if (activity.estimatedVdot != null || activity.trimp != null) {
            PerformanceMetrics(activity)
        }

        // Detailed Analysis
        if (!activity.streams.isNullOrEmpty()) {
            InteractiveStreamsChart(streams = activity.streams)
        }
    }
}

@Composable
fun ActivityHeader(activity: Activity) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = activity.type.toIcon(),
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = activity.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = formatDateWithTime(activity.startDate),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
fun ActivityStatsGrid(activity: Activity) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Activity Stats",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    icon = Icons.Default.Straighten,
                    label = "Distance",
                    value = formatDistance(activity.distance)
                )
                StatItem(
                    icon = Icons.Default.Schedule,
                    label = "Duration",
                    value = formatDuration(activity.movingTime)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                if (activity.averageSpeed != null) {
                    StatItem(
                        icon = Icons.Default.Speed,
                        label = "Avg Speed",
                        value = formatSpeed(activity.averageSpeed)
                    )
                }
                if (activity.totalElevation != null) {
                    StatItem(
                        icon = Icons.Default.Terrain,
                        label = "Elevation",
                        value = formatElevation(activity.totalElevation)
                    )
                }
            }
        }
    }
}

@Composable
fun StatItem(
    icon: ImageVector,
    label: String,
    value: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(100.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun HeartRateSection(activity: Activity) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = null,
                    tint = Color.Red,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Heart Rate",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                if (activity.averageHr != null) {
                    StatItem(
                        icon = Icons.AutoMirrored.Filled.ShowChart,
                        label = "Average HR",
                        value = "${activity.averageHr.toInt()} bpm"
                    )
                }
                if (activity.maxHr != null) {
                    StatItem(
                        icon = Icons.AutoMirrored.Filled.TrendingUp,
                        label = "Max HR",
                        value = "${activity.maxHr} bpm"
                    )
                }
            }

            // Zones
            if (activity.hrZone1Time != null || activity.hrZone2Time != null) {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Heart Rate Zones",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                val z1 = activity.hrZone1Time ?: 0
                val z2 = activity.hrZone2Time ?: 0
                val z3 = activity.hrZone3Time ?: 0
                val z4 = activity.hrZone4Time ?: 0
                val z5 = activity.hrZone5Time ?: 0
                val z6 = activity.hrZone6Time ?: 0
                val z7 = activity.hrZone7Time ?: 0
                val totalTime = (z1 + z2 + z3 + z4 + z5 + z6 + z7).toFloat()
                
                if (totalTime > 0) {
                    // Build list of zones with data
                    data class ZoneData(val name: String, val time: Int, val color: Color)
                    val zones = listOfNotNull(
                        if (z1 > 0) ZoneData("Z1", z1, Color(0xFF4CAF50)) else null,
                        if (z2 > 0) ZoneData("Z2", z2, Color(0xFFCDDC39)) else null,
                        if (z3 > 0) ZoneData("Z3", z3, Color(0xFFFFC107)) else null,
                        if (z4 > 0) ZoneData("Z4", z4, Color(0xFFFF9800)) else null,
                        if (z5 > 0) ZoneData("Z5", z5, Color(0xFFF44336)) else null,
                        if (z6 > 0) ZoneData("Z6", z6, Color(0xFF3F51B5)) else null,
                        if (z7 > 0) ZoneData("Z7", z7, Color(0xFF673AB7)) else null
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Horizontal bar with zone labels inside
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                    ) {
                        zones.forEach { zone ->
                            val weight = zone.time / totalTime
                            Box(
                                modifier = Modifier
                                    .weight(weight)
                                    .fillMaxHeight()
                                    .background(zone.color),
                                contentAlignment = Alignment.Center
                            ) {
                                // Only show label if zone is wide enough
                                if (weight >= 0.08f) {
                                    Text(
                                        text = zone.name,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                    
                    // Zone breakdown - only show zones with data
                    Spacer(modifier = Modifier.height(12.dp))
                    zones.forEach { zone ->
                        val percentage = (zone.time / totalTime * 100).toInt()
                        val minutes = zone.time / 60
                        val seconds = zone.time % 60
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(zone.color)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = zone.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Text(
                                text = "${minutes}:${String.format(java.util.Locale.US, "%02d", seconds)} ($percentage%)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PerformanceMetrics(activity: Activity) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Performance Metrics",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                if (activity.estimatedVdot != null) {
                    StatItem(
                        icon = Icons.Default.EmojiEvents,
                        label = "VDOT",
                        value = String.format(java.util.Locale.US, "%.1f", activity.estimatedVdot)
                    )
                }
                if (activity.trimp != null) {
                    StatItem(
                        icon = Icons.Default.FitnessCenter,
                        label = "TRIMP",
                        value = String.format(java.util.Locale.US, "%.0f", activity.trimp)
                    )
                }
            }
        }
    }
}

// Extension functions

fun formatDateWithTime(isoString: String): String {
    val datetime = Instant.parse(isoString).atZone(ZoneId.systemDefault()).toLocalDateTime()
    return datetime.format(DateTimeFormatter.ofPattern("MMM d, yyyy · h:mm a"))
}
