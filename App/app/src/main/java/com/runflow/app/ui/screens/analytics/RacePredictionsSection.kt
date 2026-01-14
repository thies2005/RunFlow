package com.runflow.app.ui.screens.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow.app.data.util.VdotCalculator
import kotlin.math.roundToInt

@Composable
fun RacePredictionsSection(
    effectiveVo2max: Float,
    marathonShapeScore: Float, // 0-100
    modifier: Modifier = Modifier
) {
    // Local state for simulation
    var simulatedVo2max by remember(effectiveVo2max) { mutableFloatStateOf(effectiveVo2max) }
    var simulatedShape by remember(marathonShapeScore) { mutableFloatStateOf(marathonShapeScore) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Race Predictions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Sliders Section
            Text("Effective VO2max: ${String.format("%.1f", simulatedVo2max)}")
            Slider(
                value = simulatedVo2max,
                onValueChange = { simulatedVo2max = it },
                valueRange = 20f..85f,
                modifier = Modifier.fillMaxWidth()
            )

            Text("Marathon Shape: ${simulatedShape.toInt()}%")
            Slider(
                value = simulatedShape,
                onValueChange = { simulatedShape = it },
                valueRange = 0f..100f,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Calculate Predictions
            // Using simplified logic: "Predicted" degrades based on Shape for longer distances
            val predictions = remember(simulatedVo2max, simulatedShape) {
                calculatePredictions(simulatedVo2max, simulatedShape)
            }

            // Cards Grid
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PredictionCard("5K", predictions["5K"]!!, Modifier.weight(1f))
                PredictionCard("10K", predictions["10K"]!!, Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PredictionCard("Half", predictions["Half"]!!, Modifier.weight(1f))
                PredictionCard("Marathon", predictions["Marathon"]!!, Modifier.weight(1f))
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Bar Chart Visualization
            // Showing generic bar comparison relative to max time (Marathon)
            val maxTime = predictions["Marathon"]!!.predicted.toFloat()
            
            PredictionBar("Marathon", predictions["Marathon"]!!, maxTime)
            Spacer(modifier = Modifier.height(8.dp))
            PredictionBar("Half", predictions["Half"]!!, maxTime)
            Spacer(modifier = Modifier.height(8.dp))
            PredictionBar("10K", predictions["10K"]!!, maxTime)
        }
    }
}

data class PredictionResult(
    val optimal: Int,   // seconds
    val predicted: Int  // seconds
)

@Composable
fun PredictionResult.formattedOptimal(): String = formatSeconds(optimal)
@Composable
fun PredictionResult.formattedPredicted(): String = formatSeconds(predicted)

@Composable
fun PredictionCard(title: String, result: PredictionResult, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha=0.5f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = title, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = formatSeconds(result.predicted),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Opt: ${formatSeconds(result.optimal)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun PredictionBar(label: String, result: PredictionResult, maxScale: Float) {
    Row(
        modifier = Modifier.fillMaxWidth().height(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.width(60.dp)
        )
        
        Box(modifier = Modifier.weight(1f)) {
            // Background track
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Gray.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            )
            
            // Optimal Bar (Lighter/Ghost)
            val optimWidthParams = (result.optimal / maxScale).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(optimWidthParams)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
            )

            // Predicted Bar (Solid)
            val predWidthParams = (result.predicted / maxScale).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(predWidthParams)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
        
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = formatSeconds(result.predicted),
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.width(50.dp) // Fixed width for alignment
        )
    }
}

private fun calculatePredictions(vo2max: Float, shape: Float): Map<String, PredictionResult> {
    val optimalVdot = vo2max.toDouble()
    
    // Simple degradation model for shape < 100%
    // Shape primarily affects Marathon, less so shorter distances
    // 0% shape = VDOT - 3? Or time * 1.x?
    // Let's degrade effective VDOT for prediction
    
    // Formula approximation:
    // 5K: minimal impact
    // Marathon: 100% shape -> 0 penalty. 0% shape -> significant penalty.
    
    fun getPenalty(distKm: Double): Double {
        // e.g. Marathon (42km) gets max penalty
        // Penalty factor: (100 - shape)/100 * distFactor
        val shapeDeficit = (100f - shape) / 100f // 0.0 to 1.0
        val distFactor = (distKm / 42.195).coerceIn(0.0, 1.0)
        return 1.0 + (shapeDeficit * 0.15 * distFactor) // Max 15% slower at 0% shape for marathon
    }

    val distances = mapOf(
        "5K" to VdotCalculator.DISTANCE_5K,
        "10K" to VdotCalculator.DISTANCE_10K,
        "Half" to VdotCalculator.DISTANCE_HALF,
        "Marathon" to VdotCalculator.DISTANCE_MARATHON
    )
    
    return distances.mapValues { (name, dist) ->
        val optimalTime = VdotCalculator.predictRaceTime(optimalVdot, dist)
        val penalty = getPenalty(dist / 1000.0)
        val predictedTime = (optimalTime * penalty).roundToInt()
        
        PredictionResult(optimalTime, predictedTime)
    }
}

private fun formatSeconds(seconds: Int): String {
    val hours = seconds / 3600
    val mins = (seconds % 3600) / 60
    val secs = seconds % 60
    
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, mins, secs)
    } else {
        "%d:%02d".format(mins, secs)
    }
}
