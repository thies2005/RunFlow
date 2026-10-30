package com.runflow2.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.BuildConfig
import com.runflow2.app.core.export.LocalBackupManager
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.ThemeMode
import com.runflow2.app.ui.components.PixelSwitch
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

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
    val context = LocalContext.current
    var backupStatusMessage by remember { mutableStateOf<String?>(null) }
    var importSummaryDialog by remember { mutableStateOf<LocalBackupManager.Summary?>(null) }
    var importErrorDialog by remember { mutableStateOf<String?>(null) }

    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                        LocalBackupManager(container.database).exportTo(outputStream)
                    }
                }.onSuccess {
                    backupStatusMessage = "Backup exported successfully."
                }.onFailure { err ->
                    backupStatusMessage = "Backup export failed: ${err.message}"
                }
            }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { inputStream ->
                        LocalBackupManager(container.database).importFrom(inputStream).getOrThrow()
                    }
                }.onSuccess { summary ->
                    importSummaryDialog = summary
                    backupStatusMessage = "Restored ${summary?.totalCount ?: 0} records."
                }.onFailure { err ->
                    importErrorDialog = err.message ?: "Unknown import error"
                }
            }
        }
    }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                ),
                scrollBehavior = scrollBehavior,
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                ) {
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
                var exporting by remember { mutableStateOf<String?>(null) }
                var exportNote by remember { mutableStateOf<String?>(null) }
                var exportError by remember { mutableStateOf<String?>(null) }
                val context = androidx.compose.ui.platform.LocalContext.current

                Text(
                    "Save or share the active training plan — one section per training week with every scheduled session. " +
                        "Signed in, the PDF is rendered by the server with the website's layout; offline it is rendered on this phone.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                /**
                 * Runs [format] ("pdf"|"csv"): signed in, the export comes from
                 * the server's layout engine; any failure (offline, local-only
                 * plan) falls back to the on-device renderer.
                 */
                suspend fun export(format: String) {
                    val g = goal ?: return
                    exporting = format
                    exportNote = null
                    exportError = null
                    try {
                        val workouts = container.repository.workoutsForGoal(g.id).firstOrNull().orEmpty()
                        var note: String? = null
                        val file = if (auth.loggedIn) {
                            runCatching {
                                val body = container.network.api().exportPlan(g.id, format)
                                val dir = java.io.File(context.cacheDir, "exports").apply { mkdirs() }
                                val f = java.io.File(dir, "runflow-${g.raceType.lowercase()}-plan.$format")
                                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                                    body.byteStream().use { input -> f.outputStream().use { input.copyTo(it) } }
                                }
                                f
                            }.getOrElse {
                                note = when {
                                    it is retrofit2.HttpException && it.code() == 404 ->
                                        "This plan hasn't been synced to your account yet — rendered it on this phone."
                                    else ->
                                        "Couldn't reach the server — rendered the plan on this phone."
                                }
                                if (format == "pdf") {
                                    val unit = if (settings.useImperial) {
                                        com.runflow2.app.core.util.DistanceUnit.IMPERIAL
                                    } else {
                                        com.runflow2.app.core.util.DistanceUnit.METRIC
                                    }
                                    com.runflow2.app.core.export.PlanPdfExporter(unit).exportToCache(context, g, workouts)
                                } else {
                                    com.runflow2.app.core.export.exportCsvToCache(context, g, workouts)
                                }
                            }
                        } else {
                            if (format == "pdf") {
                                val unit = if (settings.useImperial) {
                                    com.runflow2.app.core.util.DistanceUnit.IMPERIAL
                                } else {
                                    com.runflow2.app.core.util.DistanceUnit.METRIC
                                }
                                com.runflow2.app.core.export.PlanPdfExporter(unit).exportToCache(context, g, workouts)
                            } else {
                                com.runflow2.app.core.export.exportCsvToCache(context, g, workouts)
                            }
                        }
                        note?.let { exportNote = it }
                        val mime = if (format == "pdf") "application/pdf" else "text/csv"
                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file,
                        )
                        val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = mime
                            putExtra(android.content.Intent.EXTRA_STREAM, uri)
                            putExtra(android.content.Intent.EXTRA_SUBJECT, g.name)
                            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(android.content.Intent.createChooser(send, "Share training plan"))
                    } catch (e: Exception) {
                        exportError = e.message ?: "export failed"
                    } finally {
                        exporting = null
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = { scope.launch { export("pdf") } },
                        enabled = goal != null && exporting == null,
                    ) { Text(if (exporting == "pdf") "Exporting…" else "Export as PDF") }
                    OutlinedButton(
                        onClick = { scope.launch { export("csv") } },
                        enabled = goal != null && exporting == null,
                    ) { Text(if (exporting == "csv") "Exporting…" else "Export as CSV") }
                }
                if (goal == null) {
                    Text(
                        "No active plan — create one first.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                exportNote?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.tertiary,
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
                SwitchRow(
                    title = "AMOLED pure black",
                    subtitle = "Pitch-black background in dark mode while keeping tonal card tints",
                    checked = settings.amoledBlack,
                    onCheckedChange = { scope.launch { container.settings.setAmoledBlack(it) } },
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

            // The cycling FTP card itself lives on the athlete screen; the
            // MyWhoosh matching toggle is a plain app setting, so it gets its
            // own cycling section here.
            SettingSection("Cycling") {
                SwitchRow(
                    title = "Match to MyWhoosh",
                    subtitle = "Match cycling workouts to closest MyWhoosh workout & enable custom .zwo export",
                    checked = settings.matchToMyWhoosh,
                    onChecked = { scope.launch { container.settings.setMatchToMyWhoosh(it) } },
                )
            }

            SettingSection("Running & fitness") {
                SwitchRow(
                    title = "Include Cross-Training in Marathon Shape",
                    subtitle = "Rides, swims and workouts count toward the shape's cross-training component",
                    checked = settings.includeCrossTraining,
                    onChecked = { checked ->
                        scope.launch {
                            container.settings.setIncludeCrossTraining(checked)
                            // keep the server in sync so web stats use the same preference
                            container.repository.saveProfile(container.repository.profileOnce())
                        }
                    },
                )
                // Effective VO2max correction: 0.85x–1.15x in 0.01 steps (default 1.00x).
                val correction = ((settings.effectiveVo2maxCorrection * 100).roundToInt().toDouble() / 100.0)
                    .coerceIn(0.85, 1.15)
                Text(
                    "Effective VO2max Correction Factor: ${"%.2f".format(correction)}×",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Slider(
                    value = correction.toFloat(),
                    onValueChange = { raw ->
                        scope.launch {
                            container.settings.setEffectiveVo2maxCorrection(
                                (raw * 100).roundToInt().toDouble() / 100.0,
                            )
                        }
                    },
                    onValueChangeFinished = {
                        // mirror the finished value into the profile outbox so the
                        // server (and with it the web dashboard) stays in sync
                        scope.launch {
                            val factor = container.settings.settingsOnce().effectiveVo2maxCorrection
                            container.repository.saveProfile(
                                container.repository.profileOnce().copy(effectiveVo2maxCorrection = factor)
                            )
                        }
                    },
                    valueRange = 0.85f..1.15f,
                    steps = 29,
                )
                Text(
                    "Scales the HR-based aerobic VO2max (and with it race predictions and marathon-shape penalties). 1.00× = uncorrected.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                // VDOT (training paces) correction: 0.85x–1.15x in 0.01 steps (default 1.00x).
                // Lives on the profile row (like the race-result calibration on the
                // plan screen) so it syncs through the profile outbox.
                val profile by container.repository.profile.collectAsState(initial = null)
                var vdotSlider by remember { mutableStateOf<Float?>(null) }
                val vdotCorrection = (vdotSlider ?: profile?.vdotCorrection?.toFloat() ?: 1.0f)
                    .coerceIn(0.85f, 1.15f)
                Text(
                    "VDOT (Training Paces) Correction Factor: ${"%.2f".format(vdotCorrection)}×",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Slider(
                    value = vdotCorrection,
                    onValueChange = { raw -> vdotSlider = raw },
                    onValueChangeFinished = {
                        val finished = ((vdotCorrection * 100).roundToInt().toDouble() / 100.0)
                        scope.launch {
                            container.repository.saveProfile(
                                container.repository.profileOnce().copy(vdotCorrection = finished)
                            )
                            vdotSlider = null // fall back to the persisted profile value
                        }
                    },
                    valueRange = 0.85f..1.15f,
                    steps = 29,
                )
                Text(
                    "Scales the performance-based VDOT that drives training paces. 1.00× = uncorrected; race-result calibration on the plan screen sets this too.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            SettingSection("Training load & effort") {
                Text(
                    "Primary Effort Metric",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "Select which metric drives your Performance Management Chart (PMC), fitness/fatigue calculations, and daily load tracking.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                SingleChoiceSegmentedButtonRow(
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    val currentMetric = settings.primaryLoadMetric
                    SegmentedButton(
                        selected = currentMetric == "TSS",
                        onClick = { scope.launch { container.repository.setPrimaryLoadMetric("TSS") } },
                        shape = SegmentedButtonDefaults.itemShape(index = 0, count = 3),
                        label = { Text("Unified TSS") },
                    )
                    SegmentedButton(
                        selected = currentMetric == "DUAL",
                        onClick = { scope.launch { container.repository.setPrimaryLoadMetric("DUAL") } },
                        shape = SegmentedButtonDefaults.itemShape(index = 1, count = 3),
                        label = { Text("Dual TSS + TRIMP") },
                    )
                    SegmentedButton(
                        selected = currentMetric == "TRIMP",
                        onClick = { scope.launch { container.repository.setPrimaryLoadMetric("TRIMP") } },
                        shape = SegmentedButtonDefaults.itemShape(index = 2, count = 3),
                        label = { Text("TRIMP") },
                    )
                }
                Text(
                    when (settings.primaryLoadMetric) {
                        "DUAL" -> "Dual mode: uses TSS when power or pace/HR is calibrated, TRIMP as fallback."
                        "TRIMP" -> "TRIMP: Banister heart rate reserve exponential impulse."
                        else -> "Unified TSS: rTSS for runs, bike TSS for rides, 36 TSS/hr for strength, and TRIMP fallback."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            SettingSection("Data sources") {
                val hc = container.healthConnect
                val availability = remember { hc.availability() }
                val hcUnavailable =
                    availability is com.runflow2.app.data.health.HealthConnectManager.Availability.Unavailable
                var importRunning by remember { mutableStateOf(false) }
                var permissionGranted by remember { mutableStateOf(false) }
                var importError by remember { mutableStateOf<String?>(null) }

                LaunchedEffect(availability) {
                    if (availability is com.runflow2.app.data.health.HealthConnectManager.Availability.Available) {
                        hc.clientOrNull()?.let { client ->
                            permissionGranted = hc.hasAllPermissions(client)
                        }
                    }
                }

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

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Web & Strava",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (auth.loggedIn) {
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Connected · ${auth.name ?: auth.email ?: "signed in"}",
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f),
                            )
                            TextButton(
                                onClick = { scope.launch { container.syncManager.syncNow("manual", forceStrava = true) } },
                                enabled = !syncStatus.running,
                            ) { Text(if (syncStatus.running) "Syncing…" else "Sync now") }
                        }
                    } else {
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Not connected",
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f),
                            )
                            Button(onClick = onLogin) { Text("Connect") }
                        }
                        if (!settings.offlineModeChosen) {
                            TextButton(
                                onClick = { scope.launch { container.settings.setOfflineModeChosen(true) } },
                            ) { Text("Stay offline") }
                        } else {
                            Text(
                                "Sign-in hints hidden",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            TextButton(
                                onClick = { scope.launch { container.settings.setOfflineModeChosen(false) } },
                            ) { Text("Show hints again") }
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Health Connect",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (hcUnavailable) {
                        Text(
                            "Health Connect is not available on this device. It is built into Android 14+ and available as the \"Health Connect by Android\" app on older versions — the imports below stay off until it is installed.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                if (permissionGranted) "Access granted"
                                else "Grant read access to import your data",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f),
                            )
                            if (!permissionGranted) {
                                OutlinedButton(onClick = { permissionLauncher.launch(hc.permissions) }) {
                                    Text("Grant access")
                                }
                            }
                        }
                    }
                    SwitchRow(
                        title = "Runs",
                        subtitle = "Import runs recorded by other apps",
                        checked = settings.healthConnectImportEnabled,
                        enabled = !hcUnavailable,
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
                    if (settings.healthConnectImportEnabled && !permissionGranted && !hcUnavailable) {
                        Text(
                            "Read permission missing — turn the toggle off and on to grant it in Health Connect.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    SwitchRow(
                        title = "Resting heart rate",
                        subtitle = "Daily resting HR from wearable data",
                        checked = settings.hcRestingHrEnabled,
                        enabled = !hcUnavailable,
                        onChecked = { scope.launch { container.settings.setHcRestingHrEnabled(it) } },
                    )
                    SwitchRow(
                        title = "Heart-rate variability",
                        subtitle = "RMSSD values from wearable data",
                        checked = settings.hcHrvEnabled,
                        enabled = !hcUnavailable,
                        onChecked = { scope.launch { container.settings.setHcHrvEnabled(it) } },
                    )
                    SwitchRow(
                        title = "Sleep",
                        subtitle = "Nightly sleep sessions and stages",
                        checked = settings.hcSleepEnabled,
                        enabled = !hcUnavailable,
                        onChecked = { scope.launch { container.settings.setHcSleepEnabled(it) } },
                    )
                    OutlinedButton(
                        onClick = {
                            scope.launch {
                                importRunning = true
                                importError = null
                                when (val result = hc.importIfEnabled()) {
                                    is com.runflow2.app.data.health.HealthConnectManager.ImportResult.NoPermission ->
                                        importError = "Health Connect permission is missing — grant access and try again."
                                    is com.runflow2.app.data.health.HealthConnectManager.ImportResult.Failed ->
                                        importError = "Import failed: ${result.message}"
                                    else -> Unit
                                }
                                importRunning = false
                            }
                        },
                        enabled = !hcUnavailable && !importRunning,
                    ) { Text(if (importRunning) "Importing…" else "Import now") }
                    importError?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    if (settings.healthConnectLastImportAt > 0) {
                        Text(
                            "Last import: ${settings.healthConnectLastImportSummary.ifBlank { "no new runs" }} · " +
                                com.runflow2.app.core.util.FormatRelative.timeAgo(settings.healthConnectLastImportAt),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Sync",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    SwitchRow(
                        title = "Sync health metrics to web",
                        subtitle = "Pushes daily readiness to your account when signed in",
                        checked = settings.healthMetricsSyncEnabled,
                        onChecked = { scope.launch { container.settings.setHealthMetricsSyncEnabled(it) } },
                    )
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

            SettingSection("Data & backups") {
                Text(
                    "Local .runflow.json Backup",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "Export a full offline backup of all your activities, plans, workouts, daily readiness entries, and profile. Restore anytime without server dependency.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = {
                            val filename = "runflow-backup-${java.time.LocalDate.now()}.runflow.json"
                            exportLauncher.launch(filename)
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Outlined.Upload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Export backup")
                    }
                    OutlinedButton(
                        onClick = {
                            importLauncher.launch(arrayOf("application/json", "*/*"))
                        },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Outlined.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Restore backup")
                    }
                }

                backupStatusMessage?.let { msg ->
                    Text(
                        msg,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                Spacer(Modifier.height(8.dp))
                Text(
                    "RunFlow v${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}) — native Kotlin rewrite. " +
                        "Training, planning and analytics run fully on-device; account sync and the AI coach use your RunFlow server. " +
                        "Source code: github.com/thies2005/RunFlow",
                    style = MaterialTheme.typography.bodySmall,
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
        var keepLocalCopy by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign out?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Signing out revokes this device's session token on the server.")
                    SwitchRow(
                        title = "Keep local copy of activities",
                        subtitle = "Turn off when switching to a different account on this phone",
                        checked = keepLocalCopy,
                        onChecked = { keepLocalCopy = it },
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        scope.launch {
                            if (keepLocalCopy) {
                                runCatching { container.network.api().logout() }
                                container.authStore.clear()
                            } else {
                                container.repository.signOutAndClearUserData()
                            }
                        }
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

    importSummaryDialog?.let { summary ->
        AlertDialog(
            onDismissRequest = { importSummaryDialog = null },
            icon = { Icon(Icons.Outlined.CheckCircle, null) },
            title = { Text("Backup restored") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Successfully imported ${summary.totalCount} records into RunFlow:")
                    Text("• ${summary.activitiesCount} activities")
                    Text("• ${summary.workoutsCount} planned workouts")
                    Text("• ${summary.dailyEntriesCount} daily readiness entries")
                    Text("• ${summary.goalsCount} goals")
                    Text("• ${summary.planSnapshotsCount} plan snapshots")
                    if (summary.profilesCount > 0) Text("• Profile restored")
                }
            },
            confirmButton = {
                TextButton(onClick = { importSummaryDialog = null }) { Text("OK") }
            },
        )
    }

    importErrorDialog?.let { err ->
        AlertDialog(
            onDismissRequest = { importErrorDialog = null },
            title = { Text("Restore failed") },
            text = { Text("Could not restore backup: $err") },
            confirmButton = {
                TextButton(onClick = { importErrorDialog = null }) { Text("OK") }
            },
        )
    }
}

@Composable
private fun SettingSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                content()
            }
        }
    }
}

@Composable
private fun SwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)? = null,
    onChecked: ((Boolean) -> Unit)? = null,
    enabled: Boolean = true,
) {
    val handler = onCheckedChange ?: onChecked ?: {}
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        PixelSwitch(checked = checked, onCheckedChange = handler, enabled = enabled)
    }
}
