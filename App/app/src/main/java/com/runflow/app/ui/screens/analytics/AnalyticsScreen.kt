package com.runflow.app.ui.screens.analytics

import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.data.model.TimeRange
import com.runflow.app.data.model.MarathonShape
import com.runflow.app.ui.theme.FitnessGreen
import com.runflow.app.ui.theme.FatigueOrange
import com.runflow.app.ui.theme.FormCyan
import com.runflow.app.ui.theme.FormRed
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    onNavigateBack: () -> Unit,
    viewModel: AnalyticsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val selectedTimeRange by viewModel.selectedTimeRange.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Analytics") },
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is AnalyticsUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is AnalyticsUiState.Success -> {
                AnalyticsContent(
                    data = state.data,
                    selectedTimeRange = selectedTimeRange,
                    onTimeRangeSelected = { viewModel.setTimeRange(it) },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                )
            }
            is AnalyticsUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        )
                        Text("Error: ${state.message}")
                        Button(onClick = { viewModel.loadAnalytics() }) {
                            Text("Retry")
                        }
                    }
                }
            }
        }
    }
}



@Composable
fun AnalyticsContent(
    data: com.runflow.app.data.model.AnalyticsStats,
    selectedTimeRange: TimeRange,
    onTimeRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Combined Analytics Overview
        CombinedAnalyticsChart(
            data = data,
            selectedTimeRange = selectedTimeRange,
            onTimeRangeSelected = onTimeRangeSelected
        )

        // Training Paces & Heart Rate
        if (data.trainingPaces != null) {
            TrainingPacesSection(paces = data.trainingPaces)
        }

        // Race Predictions (Interactive)
        val shapeScore = data.marathonShape?.shape?.toFloat() ?: 0f
        RacePredictionsSection(
            effectiveVo2max = data.effectiveVO2max,
            marathonShapeScore = shapeScore
        )

        // Marathon Shape Card
        MarathonShapeCard(data.marathonShape ?: MarathonShape())
    }
}



// Legacy components removed

@Composable
fun MarathonShapeCard(marathonShape: com.runflow.app.data.model.MarathonShape) {
    val hasData = (marathonShape.score != null && marathonShape.score > 0) ||
            (marathonShape.shape > 0) || (marathonShape.mileageScore > 0)
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.EmojiEvents,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Marathon Shape",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (hasData) {
                // Main metrics row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = String.format("%.1f", marathonShape.score ?: marathonShape.shape),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                        Text(
                            text = "Shape Score",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                    if (marathonShape.prediction != null && marathonShape.prediction > 0) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = formatTime(marathonShape.prediction),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                            Text(
                                text = "Prediction",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        }
                    }
                }
                
                // Component scores row if available
                if (marathonShape.mileageScore > 0 || marathonShape.longRunScore > 0) {
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.2f)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        if (marathonShape.mileageScore > 0) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                // If value is <= 1, treat as decimal (0-1), otherwise treat as percentage
                                val displayValue = if (marathonShape.mileageScore <= 1f) {
                                    marathonShape.mileageScore * 100
                                } else {
                                    marathonShape.mileageScore
                                }
                                Text(
                                    text = String.format("%.0f%%", displayValue),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = "Mileage",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                        if (marathonShape.longRunScore > 0) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                val displayValue = if (marathonShape.longRunScore <= 1f) {
                                    marathonShape.longRunScore * 100
                                } else {
                                    marathonShape.longRunScore
                                }
                                Text(
                                    text = String.format("%.0f%%", displayValue),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = "Long Run",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                        if (marathonShape.confidence != null && marathonShape.confidence > 0) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                val displayValue = if (marathonShape.confidence <= 1f) {
                                    marathonShape.confidence * 100
                                } else {
                                    marathonShape.confidence
                                }
                                Text(
                                    text = String.format("%.0f%%", displayValue),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Text(
                                    text = "Confidence",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                            }
                        }
                    }
                }
            } else {
                // No data available message
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.6f),
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Complete more training to calculate marathon shape",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}

// Simple chart components
@Composable
fun SimpleLineChart(
    data: List<ChartPoint>,
    color: Color,
    modifier: Modifier = Modifier
) {
    // Simplified line chart using Canvas
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val padding = 32.dp.toPx()

        if (data.size < 2) return@Canvas

        val maxVal = data.maxOfOrNull { it.value } ?: 0f
        val minVal = data.minOfOrNull { it.value } ?: 0f
        val range = maxVal - minVal
        val safeRange = if (range == 0f) 1f else range

        val points = data.mapIndexed { index, point ->
            androidx.compose.ui.geometry.Offset(
                x = padding + (index.toFloat() / (data.size - 1)) * (width - 2 * padding),
                y = height - padding - ((point.value - minVal) / safeRange) * (height - 2 * padding)
            )
        }

        // Draw line
        drawPath(
            path = androidx.compose.ui.graphics.Path().apply {
                moveTo(points.first().x, points.first().y)
                points.drop(1).forEach { point ->
                    lineTo(point.x, point.y)
                }
            },
            color = color,
            style = androidx.compose.ui.graphics.drawscope.Stroke(
                width = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
        )

        // Draw points
        points.forEach { point ->
            drawCircle(
                color = color,
                radius = 4.dp.toPx(),
                center = point
            )
        }
    }
}

@Composable
fun SimpleBarChart(
    data: List<ChartPoint>,
    color: Color,
    modifier: Modifier = Modifier
) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val padding = 32.dp.toPx()

        if (data.isEmpty()) return@Canvas

        val maxVal = data.maxOfOrNull { it.value } ?: 0f
        val safeMax = if (maxVal == 0f) 1f else maxVal

        val barWidth = (width - 2 * padding) / data.size - 8.dp.toPx()

        data.forEachIndexed { index, point ->
            val barHeight = (point.value / safeMax) * (height - 2 * padding)
            val x = padding + index * ((width - 2 * padding) / data.size)
            val y = height - padding - barHeight

            drawRoundRect(
                color = color,
                topLeft = androidx.compose.ui.geometry.Offset(x, y),
                size = androidx.compose.ui.geometry.Size(barWidth, barHeight),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
            )
        }
    }
}

@Composable
fun SimpleMultiLineChart(
    ctlData: List<ChartPoint>,
    atlData: List<ChartPoint>,
    tsbData: List<ChartPoint>,
    modifier: Modifier = Modifier
) {
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val padding = 32.dp.toPx()

        val allValues = ctlData.map { it.value } + atlData.map { it.value } + tsbData.map { it.value }
        val maxVal = allValues.maxOrNull() ?: 0f
        val minVal = allValues.minOrNull() ?: 0f
        val range = maxVal - minVal
        val safeRange = if (range == 0f) 1f else range

        fun getY(value: Float): Float {
            return height - padding - ((value - minVal) / safeRange) * (height - 2 * padding)
        }

        fun getX(index: Int, size: Int): Float {
            return padding + (index.toFloat() / (size - 1)) * (width - 2 * padding)
        }

        fun drawLine(data: List<ChartPoint>, color: Color) {
            if (data.size < 2) return
            val points = data.mapIndexed { index, point ->
                androidx.compose.ui.geometry.Offset(
                    x = getX(index, data.size),
                    y = getY(point.value)
                )
            }
            drawPath(
                path = androidx.compose.ui.graphics.Path().apply {
                    moveTo(points.first().x, points.first().y)
                    points.drop(1).forEach { point ->
                        lineTo(point.x, point.y)
                    }
                },
                color = color,
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = 2.dp.toPx(),
                    cap = StrokeCap.Round
                )
            )
        }

        drawLine(ctlData, FitnessGreen)
        drawLine(atlData, FatigueOrange)
        drawLine(tsbData, FormCyan)
    }
}

// Data classes
data class ChartPoint(
    val label: String,
    val value: Float
)

// Helper functions
fun formatTime(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, secs)
    } else {
        String.format("%d:%02d", minutes, secs)
    }
}

@Composable
fun DebugAnalyticsCard(data: com.runflow.app.data.model.AnalyticsStats) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "DEBUG INFO (Remove Later)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text("CTL: ${data.ctl}", style = MaterialTheme.typography.bodySmall)
            Text("CTL History Size: ${data.ctlHistory.size}", style = MaterialTheme.typography.bodySmall)
            if (data.ctlHistory.isNotEmpty()) {
                Text("First CTL Date: ${data.ctlHistory.first().date}, Val: ${data.ctlHistory.first().value}", style = MaterialTheme.typography.bodySmall)
            }
            Text("VO2max History Size: ${data.vo2maxHistory.size}", style = MaterialTheme.typography.bodySmall)
            Text("Marathon Score: ${data.marathonShape?.score ?: "null"}", style = MaterialTheme.typography.bodySmall)
            Text("Mileage Score: ${data.marathonShape?.mileageScore ?: "null"}", style = MaterialTheme.typography.bodySmall)
        }
    }
}
