package com.runflow2.app.ui.screens.analytics

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.KeyboardArrowUp
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.math.BestEffortsEngine
import com.runflow2.app.core.math.TrainingPaces
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.analytics.MetricSource
import com.runflow2.app.domain.model.PaceZone
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.Sparkline
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.theme.semanticColors
import kotlin.math.roundToInt

@Composable
fun RunningAnalyticsTab(
    bundle: AnalyticsBundle,
    unit: DistanceUnit,
    modifier: Modifier = Modifier,
) {
    var marathonShapeExpanded by remember { mutableStateOf(false) }
    val sem = MaterialTheme.semanticColors

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // 1. VDOT & Aerobic Fitness with Server vs On-Device badge
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SectionTitle("VDOT & Running Fitness")
                    val isServer = bundle.vdotSource == MetricSource.SERVER
                    Surface(
                        color = if (isServer) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Icon(
                                if (isServer) Icons.Outlined.CloudDone else Icons.Outlined.PhoneAndroid,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (isServer) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                if (isServer) "Server Verified" else "On-Device",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Medium,
                                color = if (isServer) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    StatTile(
                        label = "Effective VDOT",
                        value = Format.oneDecimal(bundle.effectiveVdot),
                        icon = Icons.Outlined.Speed,
                        accent = sem.vo2,
                    )
                    StatTile(
                        label = "Aerobic VO2max",
                        value = Format.oneDecimal(bundle.aerobicVo2max),
                        icon = Icons.Outlined.MonitorHeart,
                        accent = MaterialTheme.colorScheme.primary,
                    )
                }

                // VDOT Trend sparkline
                if (bundle.vdotTrend.size >= 2) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            "26-Week VDOT Progression",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Sparkline(
                            values = bundle.vdotTrend.map { it.vdot },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            color = sem.vo2,
                        )
                    }
                }
            }
        }

        // 2. Training Paces Table (Daniels VDOT-based)
        val vdot = bundle.effectiveVdot ?: 45.0
        val paces = remember(vdot) { TrainingPaces(vdot) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionTitle("Training Paces (VDOT ${"%.1f".format(vdot)})")

                val paceBands = listOf(
                    "Easy (E)" to paces.range(PaceZone.EASY),
                    "Marathon (M)" to paces.range(PaceZone.MARATHON),
                    "Threshold (T)" to paces.range(PaceZone.THRESHOLD),
                    "Interval (I)" to paces.range(PaceZone.INTERVAL),
                    "Repetition (R)" to paces.range(PaceZone.REPETITION),
                )

                paceBands.forEachIndexed { idx, (label, range) ->
                    val (fastSec, slowSec) = range
                    val rowBg = if (idx % 2 == 1) MaterialTheme.colorScheme.surfaceContainer else Color.Transparent
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(rowBg, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            "${Format.pace(fastSec, unit)} – ${Format.pace(slowSec, unit)}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }

        // 3. Marathon Shape Card with Expandable Sub-Scores
        val shapeRes = bundle.marathonShapeResult
        val shapeScore = bundle.marathonShape?.roundToInt() ?: shapeRes?.shape ?: 0

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { marathonShapeExpanded = !marathonShapeExpanded },
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        SectionTitle("Marathon Shape")
                        Text(
                            if (shapeScore >= 80) "Optimal marathon readiness"
                            else if (shapeScore >= 50) "Building endurance base"
                            else "Insufficient volume for marathon",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        ProgressRing(
                            progress = (shapeScore / 100f).coerceIn(0f, 1f),
                            modifier = Modifier.size(44.dp),
                            color = if (shapeScore >= 70) sem.good else if (shapeScore >= 45) Color(0xFFFFA726) else MaterialTheme.colorScheme.error,
                        )
                        Text(
                            "$shapeScore%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Icon(
                            if (marathonShapeExpanded) Icons.Outlined.KeyboardArrowUp else Icons.Outlined.KeyboardArrowDown,
                            contentDescription = if (marathonShapeExpanded) "Collapse" else "Expand",
                        )
                    }
                }

                // Expandable sub-score breakdown
                AnimatedVisibility(visible = marathonShapeExpanded) {
                    Column(
                        Modifier.padding(top = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        // Sub-score 1: Mileage
                        val mileageScore = shapeRes?.mileageScore?.roundToInt() ?: (shapeScore * 0.6).roundToInt()
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Weekly Mileage (26w avg)", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                Text("$mileageScore / 100", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                            }
                            LinearProgressIndicator(
                                progress = { (mileageScore / 100f).coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                            )
                            if (shapeRes != null) {
                                Text(
                                    "Avg ${"%.1f".format(shapeRes.avgWeeklyKm)} km/wk vs target ${"%.1f".format(shapeRes.targetWeeklyKm)} km/wk",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        // Sub-score 2: Long Run
                        val longRunScore = shapeRes?.longRunScore?.roundToInt() ?: (shapeScore * 0.4).roundToInt()
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Long Run Progression (10w decay)", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                Text("$longRunScore / 100", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                            }
                            LinearProgressIndicator(
                                progress = { (longRunScore / 100f).coerceIn(0f, 1f) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                            if (shapeRes != null) {
                                Text(
                                    "${"%.1f".format(shapeRes.longRunPoints)} points earned from runs >= 15 km",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        // Sub-score 3: Cross-Training
                        if (shapeRes != null && shapeRes.crossTrainingScore > 0) {
                            val ctScore = shapeRes.crossTrainingScore.roundToInt()
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Aerobic Cross-Training", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                    Text("$ctScore / 100", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                                }
                                LinearProgressIndicator(
                                    progress = { (ctScore / 100f).coerceIn(0f, 1f) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp)),
                                    color = sem.streamPower,
                                )
                                Text(
                                    "${shapeRes.crossTrainingMinutes.roundToInt()} min total cross-training over 90 days",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        // 4. Running Pace MMP Curve (Personal Records across standard distances)
        if (bundle.bestEfforts.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionTitle("Running Best Efforts Curve")
                        Icon(
                            Icons.Outlined.EmojiEvents,
                            contentDescription = null,
                            tint = Color(0xFFFFD700),
                        )
                    }

                    bundle.bestEfforts.forEachIndexed { idx, effort ->
                        val rowBg = if (idx % 2 == 1) MaterialTheme.colorScheme.surfaceContainer else Color.Transparent
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(rowBg, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                effort.label,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    Format.duration(effort.timeSec.toLong()),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    Format.pace(effort.paceSecPerKm, unit),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }

        // 5. Weekly Run Volume (last 26 weeks)
        if (bundle.weeklyVolume.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(Modifier.padding(16.dp)) {
                    SectionTitle("Weekly Running Volume (26 Weeks)")
                    Spacer(Modifier.height(12.dp))
                    WeeklyVolumeBars(
                        weeks = bundle.weeklyVolume,
                        unitLabel = if (unit == DistanceUnit.IMPERIAL) "mi" else "km",
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
