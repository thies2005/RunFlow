package com.runflow.app.ui.screens.analytics

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow.app.data.model.TrainingPaces
import com.runflow.app.data.util.VdotCalculator

@Composable
fun TrainingPacesSection(
    paces: TrainingPaces,
    maxHr: Int = 190, // Default fallback, should ideally come from user profile
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Training Paces & Heart Rate",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Grid layout using FlowRow behavior manually or generic Row/Column
            // Web uses 5 columns. On mobile, maybe 2 rows (3 top, 2 bottom) or scrollable row?
            // "Training Paces" cards are quite small. 
            // Let's use a simplified FlowRow-like layout using Columns
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // E - Easy
                PaceCard(
                    title = "Easy (E)",
                    paceText = "${formatPace(paces.easy.max)} - ${formatPace(paces.easy.min)}",
                    hrText = "< ${(maxHr * 0.79).toInt()} bpm", // < 79%
                    percentText = "65-79%",
                    color = Color(0xFF4CAF50), // Green
                    modifier = Modifier.weight(1f)
                )
                
                // M - Marathon
                PaceCard(
                    title = "Marathon (M)",
                    paceText = formatPace(paces.marathon),
                    hrText = "~ ${(maxHr * 0.88).toInt()} bpm", // ~ 88%? usually 80-90%
                    percentText = "79-88%", // Web: 79-88% usually
                    color = Color(0xFF2196F3), // Blue
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // T - Threshold
                PaceCard(
                    title = "Threshold (T)",
                    paceText = formatPace(paces.threshold),
                    hrText = "~ ${(maxHr * 0.92).toInt()} bpm", // 88-92%
                    percentText = "88-92%",
                    color = Color(0xFFFFC107), // Amber
                    modifier = Modifier.weight(1f)
                )

                // I - Interval
                PaceCard(
                    title = "Interval (I)",
                    paceText = formatPace(paces.interval),
                    hrText = "≥ ${(maxHr * 0.98).toInt()} bpm", // 98-100%
                    percentText = "98-100%",
                    color = Color(0xFFFF9800), // Orange
                    modifier = Modifier.weight(1f)
                )
                
                // R - Repetition
                PaceCard(
                    title = "Repetition (R)",
                    paceText = formatPace(paces.repetition),
                    hrText = "Max",
                    percentText = "105%",
                    color = Color(0xFFF44336), // Red
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun PaceCard(
    title: String,
    paceText: String,
    hrText: String,
    percentText: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
        shape = MaterialTheme.shapes.small
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = paceText,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = hrText,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = percentText,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = androidx.compose.ui.unit.TextUnit.Unspecified
            )
        }
    }
}

private fun formatPace(secPerKm: Int): String {
    val mins = secPerKm / 60
    val secs = secPerKm % 60
    return "%d:%02d".format(mins, secs)
}
