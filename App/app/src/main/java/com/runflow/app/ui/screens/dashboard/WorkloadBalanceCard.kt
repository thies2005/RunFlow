package com.runflow.app.ui.screens.dashboard

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import com.runflow.app.ui.theme.FitnessGreen
import com.runflow.app.ui.theme.FormRed

@Composable
fun WorkloadBalanceCard(
    workloadRatio: Float, // ACWR
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = androidx.compose.material.icons.Icons.AutoMirrored.Filled.TrendingUp, // Using generic trend icon
                        contentDescription = null,
                        tint = FormRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "WORKLOAD BALANCE",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                // Status Badge
                val statusText = when {
                    workloadRatio < 0.8f -> "LOW"
                    workloadRatio > 1.3f -> "OVERLOAD"
                    else -> "SWEET SPOT"
                }
                val statusColor = when {
                    workloadRatio < 0.8f -> Color.Gray
                    workloadRatio > 1.3f -> FormRed
                    else -> FitnessGreen
                }
                
                Surface(
                    color = statusColor.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, statusColor)
                ) {
                    Text(
                        text = statusText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Gauge
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(30.dp)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val width = size.width
                    val height = 8.dp.toPx()
                    val centerY = size.height / 2
                    
                    // Track Background (Gradient)
                    // We want to visualize roughly 0.0 to 2.0 range.
                    // 0.8 to 1.3 is Sweet Spot (Green)
                    // < 0.8 is Low (Gray/Dark)
                    // > 1.3 is Overload (Red)
                    
                    val brush = Brush.horizontalGradient(
                        0.0f to Color(0xFF444444), // Low
                        0.4f to FitnessGreen,      // Start of Sweet Spot (approx 0.8/2.0)
                        0.65f to FitnessGreen,     // End of Sweet Spot (approx 1.3/2.0)
                        1.0f to FormRed            // Overload
                    )
                    
                    drawRoundRect(
                        brush = brush,
                        topLeft = Offset(0f, centerY - height / 2),
                        size = Size(width, height),
                        cornerRadius = CornerRadius(height / 2)
                    )
                    
                    // Markers for Sweet Spot
                    val sweetSpotStartRatio = 0.8f / 2.0f // Assuming max scale 2.0
                    val sweetSpotEndRatio = 1.3f / 2.0f
                    
                    val markerX1 = width * sweetSpotStartRatio
                    val markerX2 = width * sweetSpotEndRatio
                    
                    drawLine(
                        color = Color.Black.copy(alpha = 0.5f),
                        start = Offset(markerX1, centerY - height/2),
                        end = Offset(markerX1, centerY + height/2),
                        strokeWidth = 2.dp.toPx()
                    )
                    drawLine(
                        color = Color.Black.copy(alpha = 0.5f),
                        start = Offset(markerX2, centerY - height/2),
                        end = Offset(markerX2, centerY + height/2),
                        strokeWidth = 2.dp.toPx()
                    )

                    // Knob (Current Value)
                    // Clamp value between 0 and 2.0 for display
                    val displayValue = workloadRatio.coerceIn(0f, 2.0f)
                    val knobX = width * (displayValue / 2.0f)
                    
                    drawCircle(
                        color = Color.White,
                        radius = 8.dp.toPx(),
                        center = Offset(knobX, centerY)
                    )
                    
                    // Glow effect
                    drawCircle(
                        color = Color.White.copy(alpha = 0.3f),
                        radius = 12.dp.toPx(),
                        center = Offset(knobX, centerY)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Labels
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "LOW",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "SWEET SPOT (0.8 - 1.3)",
                    style = MaterialTheme.typography.labelSmall,
                    color = FitnessGreen,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = String.format("%.2f", workloadRatio),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
