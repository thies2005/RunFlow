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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Height
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.BuildConfig
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.theme.Vo2Accent

/** Repository shown by the About dialog (Custom Tab / browser). */
private const val GITHUB_URL = "https://github.com/thies2005/RunFlow"

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
    onCreatePlan: () -> Unit = {},
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC
    val profile by container.repository.profile.collectAsState(initial = null)
    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val activeGoal by container.repository.activeGoal.collectAsState(initial = null)
    val auth by container.authStore.state.collectAsState()
    val analytics by produceState<AnalyticsBundle?>(null, activities.size) {
        value = container.repository.analytics(365)
    }
    var showAbout by remember { mutableStateOf(false) }

    val p = profile
    // The signed-in account email is authoritative; Strava-only accounts may
    // not have one, so fall back to the account name. Signed out, NEVER show
    // the seeded demo address — it is a placeholder, not the user's account.
    val headerEmail = auth.email?.takeIf { it.isNotBlank() }
        ?: auth.name?.takeIf { it.isNotBlank() }
        ?: "Local athlete profile"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Athlete") },
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
                                    headerEmail,
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

            // ---- plan prompt: no active plan (post-login, plans sync — offer the wizard) ----
            if (activeGoal == null) {
                item {
                    Card(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onCreatePlan() },
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    ) {
                        Row(
                            Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                Icons.Outlined.CalendarMonth, null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                            Column(Modifier.weight(1f)) {
                                Text(
                                    "No training plan on this device",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                                Text(
                                    "Create one here in under a minute — it generates on this phone or, when you're signed in, with the same engine as the website and syncs both ways.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                            Icon(
                                Icons.Outlined.Add, null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
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
                        MenuRow(Icons.Outlined.Info, "About RunFlow", "v${BuildConfig.VERSION_NAME}") { showAbout = true }
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

    if (showAbout) {
        AboutRunFlowDialog(onDismiss = { showAbout = false })
    }
}

@Composable
private fun AboutRunFlowDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Outlined.Info, null) },
        title = { Text("RunFlow ${BuildConfig.VERSION_NAME}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Native Kotlin + Jetpack Compose. Training, planning and analytics run fully on-device; " +
                        "account sync and the AI coach use your RunFlow server.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    "Version ${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE})",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    "RunFlow is open source — report issues or contribute on GitHub.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onDismiss()
                    val tabs = androidx.browser.customtabs.CustomTabsIntent.Builder().build()
                    runCatching { tabs.launchUrl(context, android.net.Uri.parse(GITHUB_URL)) }
                },
            ) {
                Icon(Icons.Outlined.Code, null, Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Open GitHub")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        },
    )
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
