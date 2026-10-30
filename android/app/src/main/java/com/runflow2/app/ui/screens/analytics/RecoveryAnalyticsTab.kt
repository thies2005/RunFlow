package com.runflow2.app.ui.screens.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bedtime
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Mood
import androidx.compose.material.icons.outlined.RemoveRedEye
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.domain.readiness.ComponentScoreJson
import com.runflow2.app.domain.readiness.DataConfidence
import com.runflow2.app.domain.readiness.ReadinessJson
import com.runflow2.app.domain.readiness.ReadinessState
import com.runflow2.app.ui.components.DailyFormSheet
import com.runflow2.app.ui.components.HealthTrendChart
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.ReadinessScoreChart
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.SleepDurationChart
import com.runflow2.app.ui.components.SleepStagesChart
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.theme.semanticColors
import java.time.LocalDate
import kotlin.math.roundToInt

@Composable
fun RecoveryAnalyticsTab(
    container: AppContainer,
    modifier: Modifier = Modifier,
) {
    var healthRange by rememberSaveable { mutableStateOf(90) }
    var sleepRange by rememberSaveable { mutableStateOf(90) }

    val today = remember { LocalDate.now() }
    val maxLookback = maxOf(healthRange, sleepRange).toLong()

    val entries by produceState<List<DailyEntryEntity>>(emptyList(), maxLookback) {
        container.repository.dailyEntryRangeFlow(today.minusDays(maxLookback), today)
            .collect { value = it }
    }

    val todayEntry = remember(entries, today) {
        entries.find { it.date == today.toString() } ?: entries.lastOrNull()
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // 1. Daily Readiness Composite Card with State & Confidence
        DailyReadinessCompositeCard(entry = todayEntry, container = container)

        // 2. 5-Component Breakdown Bars
        ComponentScoresBreakdownCard(entry = todayEntry)

        // 3. Resting HR & HRV Trends Card
        val healthEntries = remember(entries, healthRange) {
            val start = today.minusDays(healthRange.toLong()).toString()
            entries.filter { it.date >= start }
        }
        RecoveryTrendsCard(
            entries = healthEntries,
            healthRange = healthRange,
            onRangeChange = { healthRange = it },
        )

        // 4. Sleep Analysis Card
        val sleepEntries = remember(entries, sleepRange) {
            val start = today.minusDays(sleepRange.toLong()).toString()
            entries.filter { it.date >= start }
        }
        SleepAnalysisCard(
            entries = sleepEntries,
            sleepRange = sleepRange,
            onRangeChange = { sleepRange = it },
        )
    }
}

@Composable
private fun DailyReadinessCompositeCard(
    entry: DailyEntryEntity?,
    container: AppContainer,
    modifier: Modifier = Modifier,
) {
    var showDailyForm by rememberSaveable { mutableStateOf(false) }
    val score = entry?.score
    val state = ReadinessJson.readinessStateFromWire(entry?.state)
    val confidence = ReadinessJson.dataConfidenceFromWire(entry?.confidence)

    val sem = MaterialTheme.semanticColors
    val stateColor = when (state) {
        ReadinessState.EXCELLENT -> sem.good
        ReadinessState.GOOD -> sem.good
        ReadinessState.MODERATE -> sem.statusNeutral
        ReadinessState.REDUCED -> sem.warn
        ReadinessState.REST -> sem.statusVeryFatigued
        ReadinessState.UNAVAILABLE -> MaterialTheme.colorScheme.outline
    }

    val stateTitle = when (state) {
        ReadinessState.EXCELLENT -> "Optimal Recovery"
        ReadinessState.GOOD -> "Good Recovery"
        ReadinessState.MODERATE -> "Moderate Readiness"
        ReadinessState.REDUCED -> "Reduced Readiness"
        ReadinessState.REST -> "Rest Recommended"
        ReadinessState.UNAVAILABLE -> "Recovery Unavailable"
    }

    val recommendation = when {
        score == null -> "Log daily wellness or sync wearable sleep & HRV to generate readiness."
        score >= 80.0 -> "Body is primed for optimal performance, quality workouts, or long endurance sessions."
        score >= 65.0 -> "Good recovery foundation. Planned training volume and normal intensity are well tolerated."
        score >= 50.0 -> "Moderate fatigue accumulated. Keep intensity aerobic or consider moderate workout volume."
        score >= 35.0 -> "Recovery capacity is impaired. An easy recovery jog, mobility, or reduced effort is recommended."
        else -> "High acute fatigue or physiological strain. Prioritize rest, sleep, nutrition, and hydration."
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionTitle(
                text = "Daily Readiness",
                trailing = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (confidence != DataConfidence.UNAVAILABLE) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerHighest,
                            ) {
                                Text(
                                    "${confidence.name.lowercase().replaceFirstChar { it.uppercase() }} data",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                )
                            }
                        }
                        TextButton(onClick = { showDailyForm = true }) {
                            Text("Log / Edit", maxLines = 1)
                        }
                    }
                },
            )

            if (showDailyForm) {
                DailyFormSheet(
                    container = container,
                    onDismiss = { showDailyForm = false },
                )
            }

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(76.dp),
                ) {
                    ProgressRing(
                        progress = ((score ?: 0.0) / 100.0).coerceIn(0.0, 1.0).toFloat(),
                        modifier = Modifier.size(76.dp),
                        color = stateColor,
                    )
                    Text(
                        score?.let { "${it.roundToInt()}" } ?: "—",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (score != null) stateColor else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        stateTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = stateColor,
                    )
                    Text(
                        recommendation,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun ComponentScoresBreakdownCard(
    entry: DailyEntryEntity?,
    modifier: Modifier = Modifier,
) {
    val scoresMap = remember(entry?.componentScoresJson) {
        entry?.componentScoresJson?.let {
            ReadinessJson.decodePayload("""{"componentScores":$it}""")?.componentScores
        }.orEmpty()
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionTitle("5-Component Readiness Breakdown")

            if (scoresMap.isEmpty()) {
                Text(
                    "No component score breakdown available for this date.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                val components = listOf(
                    ComponentDisplaySpec("hrr", "Resting Heart Rate", Icons.Outlined.Favorite),
                    ComponentDisplaySpec("hrv", "Heart Rate Variability (HRV)", Icons.Outlined.Bolt),
                    ComponentDisplaySpec("sleep", "Sleep Quality & Duration", Icons.Outlined.Bedtime),
                    ComponentDisplaySpec("load", "Acute Training Load", Icons.Outlined.FitnessCenter),
                    ComponentDisplaySpec("subjective", "Subjective Wellness", Icons.Outlined.Mood),
                )

                components.forEach { spec ->
                    val componentScore = scoresMap[spec.wireKey]
                    ComponentScoreRow(
                        title = spec.title,
                        icon = spec.icon,
                        component = componentScore,
                    )
                }
            }
        }
    }
}

private data class ComponentDisplaySpec(
    val wireKey: String,
    val title: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

@Composable
private fun ComponentScoreRow(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    component: ComponentScoreJson?,
) {
    val sem = MaterialTheme.semanticColors
    val score = component?.score
    val available = component?.isAvailable ?: false

    val barColor = when {
        score == null || !available -> MaterialTheme.colorScheme.outlineVariant
        score >= 80.0 -> sem.good
        score >= 60.0 -> MaterialTheme.colorScheme.primary
        score >= 40.0 -> sem.warn
        else -> sem.statusVeryFatigued
    }

    Column(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f),
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                )
            }
            Text(
                if (available && score != null) "${score.roundToInt()}" else "—",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = barColor,
            )
        }

        LinearProgressIndicator(
            progress = { if (available && score != null) (score / 100.0).toFloat().coerceIn(0f, 1f) else 0f },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(CircleShape),
            color = barColor,
            trackColor = barColor.copy(alpha = 0.15f),
        )

        component?.reason?.takeIf { it.isNotBlank() }?.let { reason ->
            Text(
                reason,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun RecoveryTrendsCard(
    entries: List<DailyEntryEntity>,
    healthRange: Int,
    onRangeChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val rhrValues = entries.mapNotNull { it.restingHr?.toDouble() }
    val hrvValues = entries.mapNotNull { it.hrvMs }
    val scoreValues = entries.mapNotNull { it.score }
    val rhrBaseline = rhrValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()
    val hrvBaseline = hrvValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle(
                text = "Resting HR & HRV Trends",
                trailing = {
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        listOf(30, 90, 365).forEach { d ->
                            FilterChip(
                                selected = healthRange == d,
                                onClick = { onRangeChange(d) },
                                label = { Text(if (d == 365) "1Y" else "${d}d", maxLines = 1) },
                            )
                        }
                    }
                },
            )

            if (entries.isEmpty()) {
                Text(
                    "No recovery entries in this window yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                HealthTrendChart(
                    entries = entries,
                    rhrBaseline = rhrBaseline,
                    hrvBaseline = hrvBaseline,
                )

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    StatTile(
                        label = "Resting HR",
                        value = Format.heartRate(rhrValues.lastOrNull()),
                        icon = Icons.Outlined.Favorite,
                        accent = MaterialTheme.colorScheme.primary,
                        caption = if (rhrValues.size >= 2) {
                            "range ${rhrValues.min().roundToInt()}–${rhrValues.max().roundToInt()} bpm"
                        } else null,
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        label = "HRV",
                        value = hrvValues.lastOrNull()?.let { "${it.roundToInt()} ms" } ?: "—",
                        icon = Icons.Outlined.Bolt,
                        accent = MaterialTheme.colorScheme.tertiary,
                        caption = if (hrvValues.size >= 2) {
                            "range ${hrvValues.min().roundToInt()}–${hrvValues.max().roundToInt()} ms"
                        } else null,
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        label = "Readiness",
                        value = Format.roundedIntOrDash(scoreValues.lastOrNull()),
                        icon = Icons.Outlined.Speed,
                        accent = MaterialTheme.semanticColors.tsb,
                        caption = if (scoreValues.size >= 2) {
                            "avg ${scoreValues.average().roundToInt()}"
                        } else null,
                        modifier = Modifier.weight(1f),
                    )
                }

                val scoredEntries = entries.filter { it.score != null }
                if (scoredEntries.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            "Readiness score history",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        ReadinessScoreChart(entries = scoredEntries)
                    }
                }
            }
        }
    }
}

@Composable
private fun SleepAnalysisCard(
    entries: List<DailyEntryEntity>,
    sleepRange: Int,
    onRangeChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val sleepValues = entries.mapNotNull { it.sleepMinutes?.toDouble() }
    val sleepBaseline = sleepValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()

    val stageNights = entries.filter {
        it.sleepMinutes != null &&
            (it.deepMinutes != null || it.remMinutes != null || it.lightMinutes != null)
    }
    val deepShare = stageNights
        .map { e ->
            val total = ((e.lightMinutes ?: 0) + (e.deepMinutes ?: 0) + (e.remMinutes ?: 0)).coerceAtLeast(1)
            (e.deepMinutes ?: 0).toDouble() / total * 100.0
        }
        .takeIf { it.isNotEmpty() }?.average()
    val remShare = stageNights
        .map { e ->
            val total = ((e.lightMinutes ?: 0) + (e.deepMinutes ?: 0) + (e.remMinutes ?: 0)).coerceAtLeast(1)
            (e.remMinutes ?: 0).toDouble() / total * 100.0
        }
        .takeIf { it.isNotEmpty() }?.average()

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle(
                text = "Sleep Analysis",
                trailing = {
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        listOf(30, 90, 365).forEach { d ->
                            FilterChip(
                                selected = sleepRange == d,
                                onClick = { onRangeChange(d) },
                                label = { Text(if (d == 365) "1Y" else "${d}d", maxLines = 1) },
                            )
                        }
                    }
                },
            )

            if (sleepValues.isEmpty()) {
                Text(
                    "No sleep data in this window yet. Connect Health Connect or log sleep in the daily form.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                SleepDurationChart(
                    entries = entries,
                    baselineMinutes = sleepBaseline,
                )

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    StatTile(
                        label = "Avg duration",
                        value = sleepDurationLabel(sleepValues.average()),
                        icon = Icons.Outlined.Bedtime,
                        accent = MaterialTheme.colorScheme.secondary,
                        caption = if (sleepValues.size >= 2) {
                            "range ${Format.oneDecimal(sleepValues.min() / 60.0)}–${Format.oneDecimal(sleepValues.max() / 60.0)} h"
                        } else null,
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        label = "Deep ø",
                        value = deepShare?.let { "${it.roundToInt()}%" } ?: "—",
                        icon = Icons.Outlined.DarkMode,
                        accent = MaterialTheme.colorScheme.primary,
                        caption = "target 13–23%",
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        label = "REM ø",
                        value = remShare?.let { "${it.roundToInt()}%" } ?: "—",
                        icon = Icons.Outlined.RemoveRedEye,
                        accent = MaterialTheme.colorScheme.tertiary,
                        caption = "target 18–25%",
                        modifier = Modifier.weight(1f),
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "Stages · last 14 nights",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    SleepStagesChart(entries = entries, nights = 14)
                }
            }
        }
    }
}

private fun sleepDurationLabel(minutes: Double): String {
    val total = minutes.roundToInt()
    return "${total / 60}h ${total % 60}m"
}
