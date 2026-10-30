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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Code
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.EmojiEvents
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.BuildConfig
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.ui.components.PixelSwitch
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.theme.SegmentedCardShapes
import com.runflow2.app.ui.theme.semanticColors
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

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
    val scope = rememberCoroutineScope()
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

    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Athlete", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                ),
                scrollBehavior = scrollBehavior,
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
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
                        // Full width so the long two-metric label never
                        // truncates against the neighboring tiles.
                        StatTile(
                            label = "VDOT (Training Paces)",
                            value = Format.oneDecimal(analytics?.effectiveVdot),
                            icon = Icons.Outlined.MonitorHeart,
                            accent = MaterialTheme.semanticColors.vo2,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile(
                                label = "Runs",
                                value = "${analytics?.totalRuns ?: 0}",
                                icon = Icons.Outlined.DirectionsRun,
                            )
                            StatTile(
                                label = "Weight",
                                value = Format.weight(p?.weightKg, unit),
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricLine(Icons.Outlined.Favorite, "Max HR", p?.let { "${it.hrMax} bpm" } ?: "—")
                        MetricLine(Icons.Outlined.MonitorHeart, "Resting HR", p?.let { "${it.hrRest} bpm" } ?: "—")
                        MetricLine(Icons.Outlined.Speed, "Threshold pace", p?.let { Format.paceWithUnit(it.thresholdPaceSecPerKm.toDouble(), unit) } ?: "—")
                        MetricLine(Icons.Outlined.Height, "Height", Format.height(p?.heightCm, unit))
                        MetricLine(Icons.Outlined.DirectionsWalk, "Weight", Format.weight(p?.weightKg, unit))
                    }
                }
            }

            // ---- cycling FTP & power zones ----
            item {
                SectionTitle("Cycling FTP & Power Zones")
            }
            item {
                CyclingFtpCard(
                    settings = settings,
                    weightKg = p?.weightKg ?: 70.0,
                    estimatedFtp = analytics?.cycling?.eFtpWatts ?: AnalyticsEngine.estimateBikeFtpFromVdot(analytics?.effectiveVdot ?: 0.0, p?.weightKg ?: 70.0),
                    onUpdateFtp = { watts, autoEstimate ->
                        scope.launch {
                            container.repository.updateCyclingFtp(watts, autoEstimate)
                        }
                    },
                )
            }

            // ---- personal records trophy grid ----
            item {
                SectionTitle("Personal Records (PRs)")
            }
            item {
                PrTrophyGridCard(
                    bundle = analytics,
                    weightKg = p?.weightKg,
                    unit = unit,
                )
            }

            // ---- menu ----
            item {
                SectionTitle("More")
            }
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
                    Column {
                        MenuRow(Icons.Outlined.CalendarMonth, "All activities", "${activities.size} recorded", onActivities)
                        MenuRow(Icons.Outlined.MonitorHeart, "Heart Rate & Power Zones", "7-zone HR & Coggan models", onHrZones)
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                ) {
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
                                        "${Format.distance(latest.distanceKm, unit)} · ${Format.duration(latest.movingTimeSec)} · ${
                                            Format.activityPaceLabel(latest.type, latest.paceSecPerKm, unit) ?: "—"
                                        }",
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

@Composable
private fun CyclingFtpCard(
    settings: AppSettings,
    weightKg: Double,
    estimatedFtp: Int?,
    onUpdateFtp: (Int, Boolean) -> Unit,
) {
    var showFtpDialog by remember { mutableStateOf(false) }

    val activeFtp = if (settings.ftpWatts > 0) {
        settings.ftpWatts
    } else {
        estimatedFtp ?: 200
    }
    val wPerKg = if (activeFtp > 0 && weightKg > 0.0) activeFtp / weightKg else 0.0
    val cogganZones = remember(activeFtp) { AnalyticsEngine.calculateCogganZones(activeFtp) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            // Header stats: FTP and W/kg
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatTile(
                    label = if (settings.ftpWatts > 0) "Manual FTP" else "Active FTP (eFTP)",
                    value = if (activeFtp > 0) "$activeFtp W" else "—",
                    icon = Icons.Outlined.Bolt,
                    accent = MaterialTheme.semanticColors.streamPower,
                )
                StatTile(
                    label = "Power / Weight",
                    value = if (wPerKg > 0.0) "%.2f W/kg".format(wPerKg) else "—",
                    icon = Icons.Outlined.DirectionsWalk,
                    accent = MaterialTheme.colorScheme.primary,
                )
            }

            // Auto-estimate FTP toggle
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "Auto-estimate FTP",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        if (settings.autoEstimateFtp) "Derives FTP from rides and running VDOT" else "Using manual FTP setting",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                PixelSwitch(
                    checked = settings.autoEstimateFtp,
                    onCheckedChange = { checked ->
                        onUpdateFtp(settings.ftpWatts, checked)
                    },
                )
            }

            // Edit manual FTP row
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { showFtpDialog = true }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "Manual FTP Setting",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        if (settings.ftpWatts > 0) "${settings.ftpWatts} Watts" else "Not set (set to 0 for auto)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    Icons.Outlined.Edit,
                    contentDescription = "Edit manual FTP",
                    tint = MaterialTheme.colorScheme.primary,
                )
            }

            // 7 Coggan Power Zones Table
            Spacer(Modifier.height(2.dp))
            Text(
                "Coggan 7-Zone Power Model",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )

            val zoneNames = listOf(
                "Active Recovery" to "< 55%",
                "Endurance" to "56 – 75%",
                "Tempo" to "76 – 90%",
                "Lactate Threshold" to "91 – 105%",
                "VO2 Max" to "106 – 120%",
                "Anaerobic Capacity" to "121 – 150%",
                "Neuromuscular" to "> 150%",
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                cogganZones.forEachIndexed { i, zb ->
                    val color = MaterialTheme.semanticColors.zones.getOrElse(i) { MaterialTheme.colorScheme.primary }
                    val (name, pct) = zoneNames[i]
                    val rangeStr = when (zb.zone) {
                        1 -> "< ${zb.maxWatts} W"
                        7 -> "> ${zb.minWatts} W"
                        else -> "${zb.minWatts} – ${zb.maxWatts} W"
                    }

                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier
                                .size(12.dp)
                                .background(color, CircleShape),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Z${i + 1}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = color,
                            modifier = Modifier.width(28.dp),
                        )
                        Column(Modifier.weight(1f)) {
                            Text(name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(pct, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(
                            rangeStr,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }

    if (showFtpDialog) {
        var textVal by remember { mutableStateOf(if (settings.ftpWatts > 0) settings.ftpWatts.toString() else "") }
        AlertDialog(
            onDismissRequest = { showFtpDialog = false },
            title = { Text("Set Cycling FTP") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Enter your Functional Threshold Power in watts. Enter 0 or leave empty to auto-estimate from your rides and running VDOT.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    OutlinedTextField(
                        value = textVal,
                        onValueChange = { textVal = it.filter { c -> c.isDigit() }.take(4) },
                        label = { Text("FTP (Watts)") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showFtpDialog = false
                        val w = textVal.toIntOrNull() ?: 0
                        onUpdateFtp(w, settings.autoEstimateFtp)
                    },
                ) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showFtpDialog = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun PrTrophyGridCard(
    bundle: AnalyticsBundle?,
    weightKg: Double?,
    unit: DistanceUnit,
    modifier: Modifier = Modifier,
) {
    val bestEfforts = bundle?.bestEfforts.orEmpty()
    val powerMmp = bundle?.powerMmpCurve1y?.ifEmpty { bundle.cycling?.mmpCurve1y.orEmpty() }.orEmpty()

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Outlined.EmojiEvents,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        "Personal Records (PRs)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            // Running PRs Grid
            Text(
                "Running Distances",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            val runTargets = listOf("400m", "1k", "1mi", "5k", "10k", "Half", "Marathon")
            val runMap = remember(bestEfforts) { bestEfforts.associateBy { it.label } }

            val runChunks = runTargets.chunked(2)
            runChunks.forEach { pair ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    pair.forEach { label ->
                        val effort = runMap[label]
                        TrophyTile(
                            title = label,
                            primaryValue = effort?.let { Format.duration(it.timeSec.toLong()) } ?: "—",
                            subtitle = effort?.let {
                                val paceSec = it.paceSecPerKm
                                Format.paceWithUnit(paceSec, unit)
                            } ?: "No effort yet",
                            icon = Icons.Outlined.DirectionsRun,
                            accent = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (pair.size == 1) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }

            // Cycling Peak Powers
            if (powerMmp.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Cycling Peak Powers (1Y Best)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                val powerTargets = listOf(
                    5 to "5s",
                    60 to "1m",
                    300 to "5m",
                    1200 to "20m",
                    3600 to "60m",
                )
                val powerMap = remember(powerMmp) { powerMmp.associateBy { it.durationSec } }

                val powerChunks = powerTargets.chunked(2)
                powerChunks.forEach { pair ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        pair.forEach { (durSec, label) ->
                            val effort = powerMap[durSec]
                            val wKg = if (effort != null && weightKg != null && weightKg > 0) {
                                "%.1f W/kg".format(effort.maxWatts / weightKg)
                            } else null

                            TrophyTile(
                                title = label,
                                primaryValue = effort?.let { "${it.maxWatts.roundToInt()} W" } ?: "—",
                                subtitle = wKg ?: (if (effort != null) "Peak power" else "No effort yet"),
                                icon = Icons.Outlined.Bolt,
                                accent = MaterialTheme.semanticColors.streamPower,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (pair.size == 1) {
                            Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TrophyTile(
    title: String,
    primaryValue: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    accent: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Row(
            Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier
                    .size(34.dp)
                    .background(accent.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = accent,
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(
                    title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    primaryValue,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}


