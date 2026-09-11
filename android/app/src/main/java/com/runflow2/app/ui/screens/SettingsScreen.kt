package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.BuildConfig
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.ThemeMode
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    container: AppContainer,
    onBack: () -> Unit,
    onLogin: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val auth by container.authStore.state.collectAsState()
    val syncStatus by container.syncManager.status.collectAsState()
    val pending by container.syncManager.pendingCount.collectAsState(initial = 0)
    var showResetDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            SettingSection("Account & sync") {
                if (!auth.loggedIn) {
                    Text(
                        "Sign in to sync activities with your RunFlow account — directly with email or via Strava. Everything keeps working offline — runs are stored locally first and uploaded when a connection is available.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(onClick = onLogin) { Text("Sign in") }
                } else {
                    Text(
                        auth.name ?: auth.email ?: "Signed in",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        listOfNotNull(
                            auth.email,
                            if (pending > 0) "$pending change${if (pending == 1) "" else "s"} queued" else null,
                        ).joinToString("  ·  "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    val lastSync = if (settings.lastSyncAt > 0) {
                        com.runflow2.app.core.util.FormatRelative.timeAgo(settings.lastSyncAt)
                    } else null
                    Text(
                        "Last sync: ${lastSync ?: "never"}" +
                            (settings.lastSyncSummary.takeIf { it.isNotBlank() }?.let { " — $it" } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { scope.launch { container.syncManager.syncNow("manual", forceStrava = true) } },
                            enabled = !syncStatus.running,
                        ) {
                            Text(if (syncStatus.running) "Syncing…" else "Sync now")
                        }
                        TextButton(onClick = { showLogoutDialog = true }) {
                            Text("Sign out", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }

            SettingSection("Diagnostics") {
                var logRevision by remember { mutableStateOf(0) }
                val logs = remember(logRevision, syncStatus.lastMessage, settings.lastSyncAt) {
                    com.runflow2.app.core.util.AppLog.recentNewestFirst(50)
                }
                Text(
                    "Recent app, sign-in and sync events (same lines appear in logcat under RunFlow/*).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Card(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier
                            .heightIn(max = 260.dp)
                            .verticalScroll(rememberScrollState())
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        if (logs.isEmpty()) {
                            Text(
                                "No events recorded yet.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        logs.forEach { entry ->
                            Text(
                                buildString {
                                    append("[")
                                    append(com.runflow2.app.core.util.FormatRelative.timeAgo(entry.at))
                                    append("] ")
                                    append(entry.tag)
                                    append(" · ")
                                    append(entry.message)
                                    entry.error?.let { append(" (").append(it.take(80)).append(")") }
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = if (entry.isError) MaterialTheme.colorScheme.error
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                TextButton(
                    onClick = {
                        com.runflow2.app.core.util.AppLog.clear()
                        logRevision++
                    },
                    enabled = logs.isNotEmpty(),
                ) { Text("Clear log") }
            }

            SettingSection("Units") {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(
                        selected = !settings.useImperial,
                        onClick = { scope.launch { container.settings.setUseImperial(false) } },
                        shape = SegmentedButtonDefaults.itemShape(0, 2),
                    ) { Text("Metric (km)") }
                    SegmentedButton(
                        selected = settings.useImperial,
                        onClick = { scope.launch { container.settings.setUseImperial(true) } },
                        shape = SegmentedButtonDefaults.itemShape(1, 2),
                    ) { Text("Imperial (mi)") }
                }
            }

            SettingSection("Export") {
                val goal by container.repository.activeGoal.collectAsState(initial = null)
                var exporting by remember { mutableStateOf(false) }
                var exportError by remember { mutableStateOf<String?>(null) }
                val context = androidx.compose.ui.platform.LocalContext.current

                Text(
                    "Save or share the active training plan as a PDF — one section per training week with every scheduled session.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedButton(
                    onClick = {
                        val g = goal ?: return@OutlinedButton
                        scope.launch {
                            exporting = true
                            exportError = null
                            try {
                                val workouts = container.repository.workoutsForGoal(g.id)
                                    .firstOrNull().orEmpty()
                                val unit = if (settings.useImperial) {
                                    com.runflow2.app.core.util.DistanceUnit.IMPERIAL
                                } else {
                                    com.runflow2.app.core.util.DistanceUnit.METRIC
                                }
                                val file = com.runflow2.app.core.export.PlanPdfExporter(unit)
                                    .exportToCache(context, g, workouts)
                                val uri = androidx.core.content.FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    file,
                                )
                                val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                    type = "application/pdf"
                                    putExtra(android.content.Intent.EXTRA_STREAM, uri)
                                    putExtra(android.content.Intent.EXTRA_SUBJECT, g.name)
                                    addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(android.content.Intent.createChooser(send, "Share training plan"))
                            } catch (e: Exception) {
                                exportError = e.message ?: "export failed"
                            } finally {
                                exporting = false
                            }
                        }
                    },
                    enabled = goal != null && !exporting,
                ) { Text(if (exporting) "Exporting…" else "Export plan as PDF") }
                if (goal == null) {
                    Text(
                        "No active plan — create one first.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                exportError?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            SettingSection("Theme") {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    val options = listOf(
                        "System" to ThemeMode.SYSTEM,
                        "Light" to ThemeMode.LIGHT,
                        "Dark" to ThemeMode.DARK,
                    )
                    options.forEachIndexed { i, (label, mode) ->
                        SegmentedButton(
                            selected = settings.themeMode == mode,
                            onClick = { scope.launch { container.settings.setThemeMode(mode) } },
                            shape = SegmentedButtonDefaults.itemShape(i, options.size),
                        ) { Text(label) }
                    }
                }
                SwitchRow(
                    title = "Dynamic color",
                    subtitle = "Use Material You wallpaper colors (Android 12+)",
                    checked = settings.dynamicColor,
                    onChecked = { scope.launch { container.settings.setDynamicColor(it) } },
                )
            }

            SettingSection("Workout recording") {
                SwitchRow(
                    title = "Voice coach",
                    subtitle = "Km splits, pace warnings, structured-step cues",
                    checked = settings.voiceCoach,
                    onChecked = { scope.launch { container.settings.setVoiceCoach(it) } },
                )
                SwitchRow(
                    title = "Auto-pause",
                    subtitle = "Pause the timer automatically when you stop",
                    checked = settings.autoPause,
                    onChecked = { scope.launch { container.settings.setAutoPause(it) } },
                )
                SwitchRow(
                    title = "GPS-Smoothing (Kalman)",
                    subtitle = "Smooth noisy fixes and drop GPS spikes from distance & route",
                    checked = settings.gpsSmoothing,
                    onChecked = { scope.launch { container.settings.setGpsSmoothing(it) } },
                )
            }

            SettingSection("Health Connect") {
                val hc = container.healthConnect
                val availability = remember { hc.availability() }
                var importRunning by remember { mutableStateOf(false) }
                var permissionGranted by remember { mutableStateOf(false) }

                LaunchedEffect(availability) {
                    if (availability is com.runflow2.app.data.health.HealthConnectManager.Availability.Available) {
                        hc.clientOrNull()?.let { client ->
                            permissionGranted = hc.hasAllPermissions(client)
                        }
                    }
                }

                if (availability is com.runflow2.app.data.health.HealthConnectManager.Availability.Unavailable) {
                    Text(
                        "Health Connect is not available on this device. It is built into Android 14+ and available as the \"Health Connect by Android\" app on older versions.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                        androidx.health.connect.client.PermissionController.createRequestPermissionResultContract(),
                    ) { granted ->
                        permissionGranted = granted.containsAll(hc.permissions)
                        if (permissionGranted) {
                            scope.launch {
                                container.settings.setHealthConnectImportEnabled(true)
                                importRunning = true
                                hc.importRuns()
                                importRunning = false
                            }
                        }
                    }
                    SwitchRow(
                        title = "Import runs from Health Connect",
                        subtitle = "Pull runs recorded in other apps and watches (Strava, Garmin, Fitbit…) into RunFlow on every sync",
                        checked = settings.healthConnectImportEnabled,
                        onChecked = { on ->
                            if (!on) {
                                scope.launch { container.settings.setHealthConnectImportEnabled(false) }
                            } else if (permissionGranted) {
                                scope.launch {
                                    container.settings.setHealthConnectImportEnabled(true)
                                    importRunning = true
                                    hc.importRuns()
                                    importRunning = false
                                }
                            } else {
                                permissionLauncher.launch(hc.permissions)
                            }
                        },
                    )
                    if (settings.healthConnectImportEnabled && !permissionGranted) {
                        Text(
                            "Read permission missing — turn the toggle off and on to grant it in Health Connect.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    OutlinedButton(
                        onClick = {
                            scope.launch {
                                importRunning = true
                                hc.importRuns()
                                importRunning = false
                            }
                        },
                        enabled = permissionGranted && !importRunning,
                    ) { Text(if (importRunning) "Importing…" else "Import now") }
                    if (settings.healthConnectLastImportAt > 0) {
                        Text(
                            "Last import: ${settings.healthConnectLastImportSummary.ifBlank { "no new runs" }} · " +
                                com.runflow2.app.core.util.FormatRelative.timeAgo(settings.healthConnectLastImportAt),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            SettingSection("Advanced") {
                val normalized = com.runflow2.app.data.net.Api.normalizeServerUrl(settings.serverUrl)
                var serverUrl by remember(normalized) {
                    mutableStateOf(normalized)
                }
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("Server URL") },
                    placeholder = { Text(com.runflow2.app.data.net.Api.DEFAULT_BASE_URL) },
                    supportingText = {
                        Text(
                            if (serverUrl.trim() == normalized) "Sync, sign-in and Strava use: $normalized"
                            else "Unsaved — tap Apply to switch servers"
                        )
                    },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                TextButton(onClick = {
                    scope.launch {
                        container.settings.setServerUrl(serverUrl)
                        container.syncManager.syncNow("server-changed")
                        // reflect the normalized stored value in the field
                        serverUrl = com.runflow2.app.data.net.Api.normalizeServerUrl(serverUrl)
                    }
                }) { Text("Apply server URL") }
                Text(
                    "The default is your RunFlow server (${com.runflow2.app.data.net.Api.DEFAULT_BASE_URL}). Only change this for a self-hosted or staging instance — all data on this device syncs with the server configured here.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            SettingSection("Data") {
                Text(
                    "RunFlow v${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}) — native Kotlin rewrite. " +
                        "Training, planning and analytics run fully on-device; account sync and the AI coach use your RunFlow server. " +
                        "Source code: github.com/thies2005/RunFlow",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(onClick = { showResetDialog = true }) {
                    Text("Reset demo data & restart", color = MaterialTheme.colorScheme.error)
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign out?") },
            text = { Text("Your data stays on this device. Runs recorded while signed out are uploaded the next time you sign in.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        scope.launch { container.authStore.clear() }
                    },
                ) { Text("Sign out") }
            },
            dismissButton = { TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") } },
        )
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Reset all data?") },
            text = { Text("Deletes all activities, plans and profile data on this device and reseeds the demo dataset.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showResetDialog = false
                        scope.launch {
                            container.database.clearAllTables()
                            container.settings.setSeeded() // keep flag true; reseed manually
                            container.settings.setDemoCleanedFalseForReset()
                            // trigger reseed by writing profile anew
                            com.runflow2.app.data.seed.DemoSeeder(
                                container.database.profileDao(),
                                container.database.workoutDao(),
                            ).seed(
                                insertActivity = { container.database.activityDao().upsert(it.copy(isDemo = true)) },
                                insertGoal = { container.database.goalDao().upsert(it.copy(isDemo = true)) },
                            )
                        }
                    },
                ) { Text("Reset") }
            },
            dismissButton = { TextButton(onClick = { showResetDialog = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SettingSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        content()
    }
}

@Composable
private fun SwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChecked)
    }
}
