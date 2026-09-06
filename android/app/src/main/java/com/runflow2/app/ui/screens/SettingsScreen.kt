package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.AlertDialog
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
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.ThemeMode
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
                            onClick = { scope.launch { container.syncManager.syncNow("manual") } },
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
            }

            SettingSection("Advanced") {
                val effective = settings.serverUrl.ifEmpty { com.runflow2.app.data.net.Api.DEFAULT_BASE_URL }
                var serverUrl by remember(settings.serverUrl) {
                    mutableStateOf(settings.serverUrl)
                }
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text("Server URL") },
                    placeholder = { Text(com.runflow2.app.data.net.Api.DEFAULT_BASE_URL) },
                    supportingText = {
                        Text(
                            if (serverUrl.trim() == settings.serverUrl) "Sync, sign-in and Strava use: $effective"
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
                    "RunFlow v2.2 — native Kotlin rewrite. Training, planning and analytics run fully on-device; account sync and the AI coach use your RunFlow server. Health & nutrition features arrive in a future update.",
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
