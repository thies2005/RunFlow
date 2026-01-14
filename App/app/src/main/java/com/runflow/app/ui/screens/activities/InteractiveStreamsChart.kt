package com.runflow.app.ui.screens.activities

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.runflow.app.ui.theme.FatigueOrange
import com.runflow.app.ui.theme.FitnessGreen

@Composable
fun InteractiveStreamsChart(
    streams: Map<String, List<Double>>,
    modifier: Modifier = Modifier
) {
    // Metric visibility states
    var showHeartRate by remember { mutableStateOf(true) }
    var showPace by remember { mutableStateOf(true) }
    var showElevation by remember { mutableStateOf(false) }
    var showCadence by remember { mutableStateOf(false) }

    // Parse streams
    val timeStream = streams["time"] ?: emptyList()
    val hrStream = streams["heartrate"] ?: emptyList()
    val velocityStream = streams["velocity_smooth"] ?: emptyList()
    val altitudeStream = streams["altitude"] ?: emptyList()
    val cadenceStream = streams["cadence"] ?: emptyList()

    if (timeStream.isEmpty()) {
        Box(modifier = modifier.height(200.dp), contentAlignment = Alignment.Center) {
            Text("No detailed analysis data", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Detailed Analysis",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Toggles
            @OptIn(ExperimentalLayoutApi::class)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                if (hrStream.isNotEmpty()) MetricToggle("Heart Rate", showHeartRate, Color.Red) { showHeartRate = it }
                if (velocityStream.isNotEmpty()) MetricToggle("Pace", showPace, Color.Blue) { showPace = it }
                if (altitudeStream.isNotEmpty()) MetricToggle("Elevation", showElevation, FitnessGreen) { showElevation = it }
                if (cadenceStream.isNotEmpty()) MetricToggle("Cadence", showCadence, FatigueOrange) { showCadence = it }
            }

            // Chart
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            ) {
                StreamsChartCanvas(
                    timeStream = timeStream,
                    hrStream = if (showHeartRate) hrStream else emptyList(),
                    velocityStream = if (showPace) velocityStream else emptyList(),
                    altitudeStream = if (showElevation) altitudeStream else emptyList(),
                    cadenceStream = if (showCadence) cadenceStream else emptyList()
                )
            }
        }
    }
}

@Composable
private fun MetricToggle(
    label: String,
    isSelected: Boolean,
    color: Color,
    onToggle: (Boolean) -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = { onToggle(!isSelected) },
        label = { Text(label) },
        leadingIcon = {
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(color)
                )
            }
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Color.Transparent,
            selectedLabelColor = MaterialTheme.colorScheme.onSurface,
            selectedLeadingIconColor = color,
            containerColor = Color.Transparent
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = true,
            selected = isSelected,
            borderColor = if (isSelected) color else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
        )
    )
}

@Composable
fun StreamsChartCanvas(
    timeStream: List<Double>,
    hrStream: List<Double>,
    velocityStream: List<Double>,
    altitudeStream: List<Double>,
    cadenceStream: List<Double>
) {
    val textMeasurer = androidx.compose.ui.text.rememberTextMeasurer() // Not used but good practice
    val axisLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)

    Canvas(modifier = Modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val paddingStart = 0f // Full width
        val paddingEnd = 0f
        val paddingBottom = 40f
        val paddingTop = 20f

        val chartWidth = width - paddingStart - paddingEnd
        val chartHeight = height - paddingTop - paddingBottom

        val maxTime = timeStream.lastOrNull()?.toFloat() ?: 1f

        // Helper X coordinate
        fun getX(timeVal: Double): Float {
            return paddingStart + (timeVal.toFloat() / maxTime) * chartWidth
        }

        // Draw Logic per stream
        
        // 1. Elevation (Green Area)
        if (altitudeStream.isNotEmpty()) {
            val minAlt = altitudeStream.minOrNull()?.toFloat() ?: 0f
            val maxAlt = altitudeStream.maxOrNull()?.toFloat() ?: 100f
            val rangeAlt = (maxAlt - minAlt).coerceAtLeast(1f)

            val path = Path()
            altitudeStream.forEachIndexed { i, alt ->
                val x = getX(timeStream[i])
                val y = height - paddingBottom - ((alt.toFloat() - minAlt) / rangeAlt) * (chartHeight * 0.4f) // Use bottom 40%
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            // Close path for area
            path.lineTo(width, height - paddingBottom)
            path.lineTo(0f, height - paddingBottom)
            path.close()
            
            drawPath(path, FitnessGreen.copy(alpha = 0.2f))
            drawPath(path, FitnessGreen, style = Stroke(width = 2f))
        }

        // 2. Heart Rate (Red Line) - Left Axis Scale (Top 80%)
        if (hrStream.isNotEmpty()) {
            val minHr = hrStream.minOrNull()?.toFloat() ?: 40f
            val maxHr = hrStream.maxOrNull()?.toFloat() ?: 200f
            val rangeHr = (maxHr - minHr).coerceAtLeast(1f)
            
            val path = Path()
            hrStream.forEachIndexed { i, hr ->
                val x = getX(timeStream[i])
                val y = paddingTop + (1f - (hr.toFloat() - minHr) / rangeHr) * (chartHeight * 0.8f)
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, Color.Red, style = Stroke(width = 3f))
        }

        // 3. Pace (Blue Line) - Right Axis Scale (Top 80%)
        // Pace is inverse of speed. velocity_smooth is m/s. 
        // We want min/km. 1 m/s = 1000/60 = 16.66 min/km? No.
        // Pace (min/km) = 16.666 / speed (m/s).
        // Higher speed = Lower pace value (faster). 
        // We want faster (lower value) at the top.
        if (velocityStream.isNotEmpty()) {
            val paces = velocityStream.map { v -> 
                if (v > 0) 16.666666f / v.toFloat() else 30f // Cap slow pace
            }
            val minPace = paces.minOrNull() ?: 3f
            val maxPace = (paces.maxOrNull() ?: 15f).coerceAtMost(30f) // Cap for scaling
            val rangePace = (maxPace - minPace).coerceAtLeast(0.1f)

            val path = Path()
            paces.forEachIndexed { i, pace ->
                val x = getX(timeStream[i])
                // Invert y: minPace (fast) at top (y=0 relative), maxPace (slow) at bottom
                val normalized = (pace - minPace) / rangePace // 0=fastest, 1=slowest
                val y = paddingTop + normalized * (chartHeight * 0.8f) // 0 at top
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, Color.Blue, style = Stroke(width = 3f))
        }
        
        // 4. Cadence (Orange) - Bottom Overlay
        if (cadenceStream.isNotEmpty()) {
            val maxCad = 220f // Fixed sensible max
            val path = Path()
            cadenceStream.forEachIndexed { i, cad ->
                val x = getX(timeStream[i])
                val y = height - paddingBottom - (cad.toFloat() / maxCad) * (chartHeight * 0.3f)
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
             drawPath(path, FatigueOrange, style = Stroke(width = 2f))
        }

        // X-Axis Labels (Time)
        // 0, 50%, 100%
        val formatTime = { mins: Int -> 
            val h = mins / 60
            val m = mins % 60
            if (h > 0) "$h h $m m" else "$m m"
        }
        
        val totalMinutes = (maxTime / 60).toInt()
        
        // 0
        drawContext.canvas.nativeCanvas.drawText(
            "0m",
            paddingStart,
            height,
            android.graphics.Paint().apply {
                color = axisLabelColor.toArgb()
                textSize = 30f
            }
        )
        // Max
         drawContext.canvas.nativeCanvas.drawText(
            formatTime(totalMinutes),
            width - 80f,
            height,
             android.graphics.Paint().apply {
                color = axisLabelColor.toArgb()
                textSize = 30f
            }
        )
    }
}
