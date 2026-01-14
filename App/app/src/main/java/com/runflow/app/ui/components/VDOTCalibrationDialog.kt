package com.runflow.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.runflow.app.data.model.Activity

/**
 * VDOT Calibration Dialog matching the web implementation.
 * Has three tabs: VDOT Correction, Shape Factor, Manual
 */
@Composable
fun VDOTCalibrationDialog(
    recentActivities: List<Activity>,
    currentCorrectionFactor: Float,
    thresholdPace: Int?,
    onDismiss: () -> Unit,
    onApplyCalibration: (correctionFactor: Float, calibrationTime: Int?, calibrationDistance: String?) -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("VDOT Correction", "Shape Factor", "Manual")
    
    // VDOT Correction state
    var selectedActivity by remember { mutableStateOf<Activity?>(null) }
    var selectedDistance by remember { mutableStateOf("5K") }
    var customDistance by remember { mutableStateOf("") }
    var hours by remember { mutableStateOf("") }
    var minutes by remember { mutableStateOf("") }
    var seconds by remember { mutableStateOf("") }
    var activityDropdownExpanded by remember { mutableStateOf(false) }
    var distanceDropdownExpanded by remember { mutableStateOf(false) }
    var showCustomDistance by remember { mutableStateOf(false) }
    
    // Manual correction state
    var manualFactor by remember { mutableStateOf(currentCorrectionFactor.toString()) }
    
    val distances = listOf("5K", "10K", "Half Marathon", "Marathon")
    
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Speed,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Calibration",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, "Close")
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Tabs
                TabRow(selectedTabIndex = selectedTab) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = { Text(title, fontSize = MaterialTheme.typography.labelSmall.fontSize) }
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                when (selectedTab) {
                    0 -> VDOTCorrectionContent(
                        recentActivities = recentActivities,
                        selectedActivity = selectedActivity,
                        onActivitySelected = { selectedActivity = it },
                        activityDropdownExpanded = activityDropdownExpanded,
                        onActivityDropdownChange = { activityDropdownExpanded = it },
                        selectedDistance = selectedDistance,
                        onDistanceSelected = { 
                            selectedDistance = it
                            showCustomDistance = it == "Custom"
                        },
                        distanceDropdownExpanded = distanceDropdownExpanded,
                        onDistanceDropdownChange = { distanceDropdownExpanded = it },
                        showCustomDistance = showCustomDistance,
                        customDistance = customDistance,
                        onCustomDistanceChange = { customDistance = it },
                        hours = hours,
                        minutes = minutes,
                        seconds = seconds,
                        onHoursChange = { hours = it },
                        onMinutesChange = { minutes = it },
                        onSecondsChange = { seconds = it },
                        distances = distances,
                        currentCorrectionFactor = currentCorrectionFactor,
                        thresholdPace = thresholdPace
                    )
                    1 -> ShapeFactorContent()
                    2 -> ManualContent(
                        factor = manualFactor,
                        onFactorChange = { manualFactor = it }
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val timeSeconds = (hours.toIntOrNull() ?: 0) * 3600 +
                                    (minutes.toIntOrNull() ?: 0) * 60 +
                                    (seconds.toIntOrNull() ?: 0)
                            
                            val distance = if (showCustomDistance) customDistance else selectedDistance
                            
                            // Calculate proper factor if VDOT tab and valid
                            val manualFactorVal = if (selectedTab == 2) manualFactor.toFloatOrNull() ?: 1f else null
                            
                            // Calculate implied factor for VDOT tab
                            val vdotFactor = if (selectedTab == 0) {
                                val distMeters = if (selectedActivity != null) selectedActivity!!.distance
                                else if (showCustomDistance) customDistance.toFloatOrNull() ?: 0f
                                else when (distance) {
                                    "5K" -> 5000f
                                    "10K" -> 10000f
                                    "Half Marathon" -> 21097.5f
                                    "Marathon" -> 42195f
                                    else -> 0f
                                }
                                
                                val durationSec = if (selectedActivity != null) selectedActivity!!.movingTime
                                else timeSeconds
                                
                                if (distMeters > 0 && durationSec > 0 && thresholdPace != null && thresholdPace > 0) {
                                    val raceVdot = calculateVdot(distMeters, durationSec)
                                    val effectiveVdot = calculateEffectiveVdotFromPace(thresholdPace)
                                    val baseVdot = effectiveVdot / currentCorrectionFactor
                                    if (baseVdot > 0) raceVdot / baseVdot else null
                                } else null
                            } else null
                            
                            onApplyCalibration(
                                vdotFactor ?: manualFactorVal ?: currentCorrectionFactor,
                                if (selectedTab == 0) {
                                    if (selectedActivity != null) selectedActivity!!.movingTime
                                    else if (timeSeconds > 0) timeSeconds else null
                                } else null,
                                if (selectedTab == 0) {
                                    if (selectedActivity != null) selectedActivity!!.distance.toString()
                                    else distance
                                } else null
                            )
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFE57373)
                        )
                    ) {
                        Text("Apply Calibration")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VDOTCorrectionContent(
    recentActivities: List<Activity>,
    selectedActivity: Activity?,
    onActivitySelected: (Activity?) -> Unit,
    activityDropdownExpanded: Boolean,
    onActivityDropdownChange: (Boolean) -> Unit,
    selectedDistance: String,
    onDistanceSelected: (String) -> Unit,
    distanceDropdownExpanded: Boolean,
    onDistanceDropdownChange: (Boolean) -> Unit,
    showCustomDistance: Boolean,
    customDistance: String,
    onCustomDistanceChange: (String) -> Unit,
    hours: String,
    minutes: String,
    seconds: String,
    onHoursChange: (String) -> Unit,
    onMinutesChange: (String) -> Unit,
    onSecondsChange: (String) -> Unit,
    distances: List<String>,
    currentCorrectionFactor: Float,
    thresholdPace: Int? // seconds per km
) {
    // Calculate VDOT data
    val vdotData = remember(selectedActivity, selectedDistance, customDistance, hours, minutes, seconds, thresholdPace, currentCorrectionFactor) {
        val distMeters = if (selectedActivity != null) {
            selectedActivity.distance
        } else if (showCustomDistance) {
            customDistance.toFloatOrNull() ?: 0f
        } else {
            when (selectedDistance) {
                "5K" -> 5000f
                "10K" -> 10000f
                "Half Marathon" -> 21097.5f
                "Marathon" -> 42195f
                else -> 0f
            }
        }
        
        val durationSec = if (selectedActivity != null) {
            selectedActivity.movingTime
        } else {
            (hours.toIntOrNull() ?: 0) * 3600 +
            (minutes.toIntOrNull() ?: 0) * 60 +
            (seconds.toIntOrNull() ?: 0)
        }
        
        if (distMeters > 0 && durationSec > 0 && thresholdPace != null && thresholdPace > 0) {
            val raceVdot = calculateVdot(distMeters, durationSec)
            val effectiveVdot = calculateEffectiveVdotFromPace(thresholdPace)
            val baseVdot = effectiveVdot / currentCorrectionFactor
            val newFactor = if (baseVdot > 0) raceVdot / baseVdot else 0f
            Triple(raceVdot, baseVdot, newFactor)
        } else null
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Info box
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    Icons.Default.Info,
                    null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Calibrate your global Effective VO2max to match your actual race performance. This updates all your historical data.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
        
        // Auto-fill from activity
        Text(
            "Auto-fill from Recent Activity",
            style = MaterialTheme.typography.labelMedium
        )
        
        ExposedDropdownMenuBox(
            expanded = activityDropdownExpanded,
            onExpandedChange = onActivityDropdownChange
        ) {
            OutlinedTextField(
                value = selectedActivity?.name ?: "Select an activity...",
                onValueChange = {},
                readOnly = true,
                trailingIcon = { 
                    if (selectedActivity != null) {
                        IconButton(onClick = { onActivitySelected(null) }) {
                            Icon(Icons.Default.Clear, "Clear selection")
                        }
                    } else {
                        ExposedDropdownMenuDefaults.TrailingIcon(activityDropdownExpanded) 
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = activityDropdownExpanded,
                onDismissRequest = { onActivityDropdownChange(false) }
            ) {
                // Filter RUN activities - be more lenient, just require type RUN
                val runActivities = recentActivities.filter { 
                    it.type.name.uppercase().contains("RUN")
                }.take(50)
                
                if (runActivities.isEmpty()) {
                    DropdownMenuItem(
                        text = { 
                            Column {
                                Text("No eligible activities")
                                Text(
                                    "Need running activities for calibration",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        },
                        onClick = { onActivityDropdownChange(false) }
                    )
                } else {
                    runActivities.forEach { activity ->
                        DropdownMenuItem(
                            text = { 
                                Column {
                                    Text(activity.name)
                                    val distanceKm = (activity.distance ?: 0f) / 1000f
                                    val timeStr = formatTimeForCalibration(activity.movingTime)
                                    Text(
                                        "${String.format("%.2f", distanceKm)} km · $timeStr",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            onClick = {
                                onActivitySelected(activity)
                                onActivityDropdownChange(false)
                            }
                        )
                    }
                }
            }
        }
        
        if (selectedActivity == null) {
            // Distance selector
            Text(
                "Distance",
                style = MaterialTheme.typography.labelMedium
            )
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ExposedDropdownMenuBox(
                    expanded = distanceDropdownExpanded,
                    onExpandedChange = onDistanceDropdownChange,
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = selectedDistance,
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(distanceDropdownExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = distanceDropdownExpanded,
                        onDismissRequest = { onDistanceDropdownChange(false) }
                    ) {
                        (distances + "Custom").forEach { dist ->
                            DropdownMenuItem(
                                text = { Text(dist) },
                                onClick = {
                                    onDistanceSelected(dist)
                                    onDistanceDropdownChange(false)
                                }
                            )
                        }
                    }
                }
                
                if (showCustomDistance) {
                    OutlinedTextField(
                        value = customDistance,
                        onValueChange = onCustomDistanceChange,
                        placeholder = { Text("meters") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    TextButton(onClick = { onDistanceSelected("Custom") }) {
                        Text("Custom")
                    }
                }
            }
            
            // Time input
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TimeInputField(value = hours, onValueChange = onHoursChange, placeholder = "HH")
                Text(":", fontWeight = FontWeight.Bold)
                TimeInputField(value = minutes, onValueChange = onMinutesChange, placeholder = "MM")
                Text(":", fontWeight = FontWeight.Bold)
                TimeInputField(value = seconds, onValueChange = onSecondsChange, placeholder = "SS")
            }
        }
        
        // Results Visualization
        if (vdotData != null) {
            val (raceVdot, baseVdot, newFactor) = vdotData
            val isFactorValid = newFactor in 0.5f..1.5f
            
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Race VDOT
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.background, RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Effective VO2max", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(String.format("%.1f", raceVdot), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        
                        // Current VDOT
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.background, RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Current VDOT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(String.format("%.1f", baseVdot), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        
                        // Correction
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(MaterialTheme.colorScheme.background, RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Correction", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                String.format("%.3fx", newFactor), 
                                style = MaterialTheme.typography.titleMedium, 
                                fontWeight = FontWeight.Bold,
                                color = if (isFactorValid) Color(0xFF4CAF50) else Color(0xFFEF5350)
                            )
                        }
                    }
                    
                    if (!isFactorValid) {
                        Text(
                            "Correction factor must be between 0.5x and 1.5x.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFEF5350)
                        )
                    }
                    
                    Text(
                        "Current correction: ${String.format("%.3fx", currentCorrectionFactor)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

private fun calculateVdot(distanceMeters: Float, timeSeconds: Int): Float {
    if (timeSeconds <= 0) return 0f
    
    val timeMinutes = timeSeconds / 60.0
    val velocity = distanceMeters / timeMinutes
    
    // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    val vo2 = -4.60 + 0.182258 * velocity + 0.000104 * (velocity * velocity)
    
    // Percent VO2max
    val percentVo2Max = 0.8 + 
        0.1894393 * kotlin.math.exp(-0.012778 * timeMinutes) + 
        0.2989558 * kotlin.math.exp(-0.1932605 * timeMinutes)
        
    val vdot = vo2 / percentVo2Max
    return kotlin.math.max(0.0, vdot).toFloat()
}

// Calculate Effective VDOT from Threshold Pace (which corresponds to ~88% VO2max)
private fun calculateEffectiveVdotFromPace(paceSecondsPerKm: Int): Float {
    if (paceSecondsPerKm <= 0) return 0f
    
    // Velocity in meters/min
    val velocity = (1000.0 / paceSecondsPerKm) * 60.0
    
    // VO2 at this velocity
    val vo2 = -4.60 + 0.182258 * velocity + 0.000104 * (velocity * velocity)
    
    // Threshold is ~88% of VO2max (Effective VDOT)
    val vdot = vo2 / 0.88
    
    return kotlin.math.max(0.0, vdot).toFloat()
}

@Composable
private fun TimeInputField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String
) {
    OutlinedTextField(
        value = value,
        onValueChange = { if (it.length <= 2) onValueChange(it) },
        placeholder = { Text(placeholder, textAlign = TextAlign.Center) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = Modifier.width(60.dp),
        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center),
        singleLine = true
    )
}

@Composable
private fun ShapeFactorContent() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
            )
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    Icons.Default.Info,
                    null,
                    tint = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Shape Factor adjusts your marathon readiness prediction based on training specificity. This is automatically calculated from your training but can be fine-tuned.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        
        Text(
            "This feature adjusts based on your training history automatically.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ManualContent(
    factor: String,
    onFactorChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
            )
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    Icons.Default.Warning,
                    null,
                    tint = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Manually set a correction factor. Values > 1.0 increase your effective VO2max, values < 1.0 decrease it.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        
        Text("Correction Factor", style = MaterialTheme.typography.labelMedium)
        
        OutlinedTextField(
            value = factor,
            onValueChange = onFactorChange,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            supportingText = { Text("Default: 1.0 (no correction)") }
        )
    }
}

/**
 * Format time in seconds to a readable string (HH:MM:SS or MM:SS)
 */
private fun formatTimeForCalibration(seconds: Int): String {
    val hours = seconds / 3600
    val mins = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, mins, secs)
    } else {
        String.format("%d:%02d", mins, secs)
    }
}
