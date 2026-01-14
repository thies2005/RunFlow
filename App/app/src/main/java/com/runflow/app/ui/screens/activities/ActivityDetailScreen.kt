package com.runflow.app.ui.screens.activities

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
                        value = String.format("%.1f", activity.estimatedVdot)
                    )
                }
                if (activity.trimp != null) {
                    StatItem(
                        icon = Icons.Default.FitnessCenter,
                        label = "TRIMP",
                        value = String.format("%.0f", activity.trimp)
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
