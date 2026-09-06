package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Height
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.theme.Vo2Accent

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AthleteScreen(
    container: AppContainer,
    onEditProfile: () -> Unit,
    onHrZones: () -> Unit,
    onSettings: () -> Unit,
    onActivities: () -> Unit,
    onOpenActivity: (String) -> Unit,
    onAiCoach: () -> Unit,
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val profile by container.repository.profile.collectAsState(initial = null)
    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val analytics by produceState<AnalyticsBundle?>(null, activities.size) {
        value = container.repository.analytics(365)
    }

    val p = profile

    Scaffold(
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text("Athlete") },
                scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior(),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ---- profile header ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(64.dp)
                                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    (p?.name ?: "A").trim().take(1).uppercase(),
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(p?.name ?: "Athlete", style = MaterialTheme.typography.titleLarge)
                                Text(
                                    p?.email?.ifBlank { "Local athlete profile" } ?: "Local athlete profile",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Icon(
                                Icons.Outlined.Edit, "Edit profile",
                                Modifier.clickable { onEditProfile() },
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile(
                                label = "VO₂ max",
                                value = Format.oneDecimal(analytics?.effectiveVdot),
                                icon = Icons.Outlined.MonitorHeart,
                                accent = Vo2Accent,
                            )
                            StatTile(
                                label = "Runs",
                                value = "${analytics?.totalRuns ?: 0}",
                                icon = Icons.Outlined.DirectionsRun,
                            )
                            StatTile(
                                label = "Weight",
                                value = p?.let { "${it.weightKg.toInt()} kg" } ?: "—",
                                icon = Icons.Outlined.MonitorHeart,
                                accent = MaterialTheme.colorScheme.tertiary,
                            )
                        }
                    }
                }
            }

            // ---- body metrics ----
            item {
                SectionTitle("Body & thresholds")
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricLine(Icons.Outlined.Favorite, "Max HR", p?.let { "${it.hrMax} bpm" } ?: "—")
                        MetricLine(Icons.Outlined.MonitorHeart, "Resting HR", p?.let { "${it.hrRest} bpm" } ?: "—")
                        MetricLine(Icons.Outlined.Speed, "Threshold pace", p?.let { Format.paceWithUnit(it.thresholdPaceSecPerKm.toDouble(), unit) } ?: "—")
                        MetricLine(Icons.Outlined.Height, "Height", p?.let { "${it.heightCm.toInt()} cm" } ?: "—")
                        MetricLine(Icons.Outlined.DirectionsWalk, "Weight", p?.let { "${it.weightKg} kg" } ?: "—")
                    }
                }
            }

            // ---- menu ----
            item {
                SectionTitle("More")
            }
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column {
                        MenuRow(Icons.Outlined.CalendarMonth, "All activities", "${activities.size} recorded", onActivities)
                        MenuRow(Icons.Outlined.MonitorHeart, "HR zones", "7-zone model", onHrZones)
                        MenuRow(Icons.Outlined.Settings, "Settings", "Units, theme, coaching", onSettings)
                        MenuRow(
                            Icons.AutoMirrored.Outlined.Chat,
                            "AI coach",
                            "Ask anything about your training",
                            onAiCoach,
                        )
                        MenuRow(Icons.Outlined.Info, "About RunFlow", "v2.0 · Kotlin rewrite") { }
                    }
                }
            }

            // ---- recent PRs style quick stats ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle("Latest activity")
                        activities.firstOrNull()?.let { latest ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clickable { onOpenActivity(latest.id) },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(latest.name, style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        "${Format.distance(latest.distanceKm, unit)} · ${Format.duration(latest.movingTimeSec)} · ${Format.paceWithUnit(latest.paceSecPerKm, unit)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Icon(
                                    Icons.AutoMirrored.Outlined.ArrowForward, null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        } ?: Text(
                            "No activities yet — record your first run!",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricLine(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
        Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun MenuRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(
            Icons.AutoMirrored.Outlined.ArrowForward, null,
            tint = MaterialTheme.colorScheme.outline,
        )
    }
}
