package com.runflow2.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.analytics.AnalyticsEngine
import com.runflow2.app.domain.analytics.ZoneBucket
import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.ui.components.PixelLoadingBox
import com.runflow2.app.ui.components.PixelSwitch
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.theme.semanticColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HrZonesScreen(
    container: AppContainer,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val profile by container.repository.profile.collectAsState(initial = null)
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val analytics by produceState<AnalyticsBundle?>(null) {
        value = container.repository.analytics(365)
    }

    var selectedTab by rememberSaveable { mutableIntStateOf(0) }

    val p = profile ?: return Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Heart Rate & Power Zones") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        PixelLoadingBox(Modifier.padding(padding), message = "Loading zones…")
    }

    var z1 by rememberSaveable(p.id) { mutableStateOf(p.hrZone1Max.toFloat()) }
    var z2 by rememberSaveable(p.id) { mutableStateOf(p.hrZone2Max.toFloat()) }
    var z3 by rememberSaveable(p.id) { mutableStateOf(p.hrZone3Max.toFloat()) }
    var z4 by rememberSaveable(p.id) { mutableStateOf(p.hrZone4Max.toFloat()) }
    var z5 by rememberSaveable(p.id) { mutableStateOf(p.hrZone5Max.toFloat()) }
    var z6 by rememberSaveable(p.id) { mutableStateOf(p.hrZone6Max.toFloat()) }

    var auto by remember(p) { mutableStateOf(p.hrZonesAuto) }
    val autoZones = if (auto) Personalization.karvonenZoneMaxes(p.hrMax, p.hrRest) else null

    val bounds = listOf(z1, z2, z3, z4, z5, z6)
    val valid = bounds.zipWithNext().all { (a, b) -> b > a } && z6 < p.hrMax

    // Cycling FTP calculations
    val estimatedFtp = analytics?.cycling?.eFtpWatts
        ?: AnalyticsEngine.estimateBikeFtpFromVdot(analytics?.effectiveVdot ?: 0.0, p.weightKg)
    val activeFtp = if (settings.ftpWatts > 0) settings.ftpWatts else (estimatedFtp ?: 200)
    val wPerKg = if (activeFtp > 0 && p.weightKg > 0.0) activeFtp / p.weightKg else 0.0
    val cogganZones = remember(activeFtp) { AnalyticsEngine.calculateCogganZones(activeFtp) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Heart Rate & Power Zones", fontWeight = FontWeight.SemiBold) },
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
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Top 2-tab segmented button row
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                    icon = { Icon(Icons.Outlined.MonitorHeart, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    label = { Text("Heart Rate") },
                )
                SegmentedButton(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                    icon = { Icon(Icons.Outlined.Bolt, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    label = { Text("Cycling Power") },
                )
            }

            if (selectedTab == 0) {
                // ==================== TAB 0: HEART RATE ZONES ====================
                // Max HR & Resting HR quick-edit row
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Base Heart Rate Thresholds", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            var maxHrInput by remember(p.hrMax) { mutableStateOf(p.hrMax.toString()) }
                            var restHrInput by remember(p.hrRest) { mutableStateOf(p.hrRest.toString()) }

                            OutlinedTextField(
                                value = maxHrInput,
                                onValueChange = { str ->
                                    maxHrInput = str.filter(Char::isDigit).take(3)
                                    val v = maxHrInput.toIntOrNull()
                                    if (v != null && v in 100..250 && v != p.hrMax) {
                                        scope.launch { container.repository.saveProfile(p.copy(hrMax = v)) }
                                    }
                                },
                                label = { Text("Max HR (bpm)") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                            )
                            OutlinedTextField(
                                value = restHrInput,
                                onValueChange = { str ->
                                    restHrInput = str.filter(Char::isDigit).take(3)
                                    val v = restHrInput.toIntOrNull()
                                    if (v != null && v in 30..120 && v != p.hrRest) {
                                        scope.launch { container.repository.saveProfile(p.copy(hrRest = v)) }
                                    }
                                },
                                label = { Text("Resting HR (bpm)") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }

                // Karvonen Auto toggle
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Auto · from max & resting HR", style = MaterialTheme.typography.titleSmall)
                        Text(
                            "Zones follow the Karvonen model and refresh as you run",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = auto,
                        onCheckedChange = { on ->
                            auto = on
                            scope.launch { container.repository.saveProfile(p.copy(hrZonesAuto = on)) }
                        },
                    )
                }

                if (autoZones != null) {
                    // Auto preview
                    Text(
                        "Boundaries update automatically from your max and resting HR.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text("7-Zone HR Preview", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    ZonePreview(
                        starts = listOf(
                            0f,
                            autoZones[0].toFloat(),
                            autoZones[1].toFloat(),
                            autoZones[2].toFloat(),
                            autoZones[3].toFloat(),
                            autoZones[4].toFloat(),
                        ),
                        ends = autoZones.map { it.toFloat() },
                        hrMax = p.hrMax,
                    )
                    Text(
                        "Z6 ends at your max HR, so the auto model has no separate Z7 band.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    // Manual mode
                    if (auto) {
                        Text(
                            "Max and resting HR don't form a valid Karvonen range right now — adjust them above, or set your boundaries manually below.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        "Zone 1 runs up to the first boundary, zone 7 is everything above the last boundary. Values must increase and stay below max HR (${p.hrMax}).",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    val labels = listOf(
                        "Z1 · Recovery" to 100f,
                        "Z2 · Easy" to z1,
                        "Z3 · Aerobic" to z2,
                        "Z4 · Tempo" to z3,
                        "Z5 · Threshold" to z4,
                        "Z6 · VO₂" to z5,
                    )
                    val zoneSliders = listOf<(Float) -> Unit>(
                        { v -> z1 = v }, { v -> z2 = v }, { v -> z3 = v },
                        { v -> z4 = v }, { v -> z5 = v }, { v -> z6 = v },
                    )
                    labels.forEachIndexed { i, (label, min) ->
                        val color = MaterialTheme.semanticColors.zones[i]
                        val value = bounds[i]
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(label, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall, color = color)
                                Text(
                                    "≤ ${value.toInt()} bpm",
                                    style = MaterialTheme.typography.titleSmall,
                                )
                            }
                            Slider(
                                value = value,
                                onValueChange = zoneSliders[i],
                                valueRange = min..(p.hrMax - 2).toFloat(),
                                colors = androidx.compose.material3.SliderDefaults.colors(
                                    thumbColor = color,
                                    activeTrackColor = color,
                                ),
                            )
                        }
                    }

                    // zone preview bars
                    Text("7-Zone HR Preview", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    val starts = listOf(0f, z1, z2, z3, z4, z5)
                    val ends = bounds + p.hrMax.toFloat()
                    ZonePreview(starts = starts, ends = ends, hrMax = p.hrMax)

                    if (!valid) {
                        Text(
                            "Each boundary must be higher than the previous, and Z6 below max HR.",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                container.repository.saveProfile(
                                    p.copy(
                                        hrZone1Max = z1.toInt(),
                                        hrZone2Max = z2.toInt(),
                                        hrZone3Max = z3.toInt(),
                                        hrZone4Max = z4.toInt(),
                                        hrZone5Max = z5.toInt(),
                                        hrZone6Max = z6.toInt(),
                                        hrZonesAuto = auto,
                                    ),
                                )
                                onBack()
                            }
                        },
                        enabled = valid,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Save zones")
                    }
                }
            } else {
                // ==================== TAB 1: POWER & FTP ZONES ====================
                // 1. Cycling FTP Configuration Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            "Cycling Functional Threshold Power",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )

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
                                    scope.launch {
                                        container.repository.updateCyclingFtp(settings.ftpWatts, checked)
                                    }
                                },
                            )
                        }

                        // Manual FTP (Watts) inline OutlinedTextField + [ Save FTP ] button
                        var ftpInputText by rememberSaveable(settings.ftpWatts) {
                            mutableStateOf(if (settings.ftpWatts > 0) settings.ftpWatts.toString() else "")
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            OutlinedTextField(
                                value = ftpInputText,
                                onValueChange = { ftpInputText = it.filter(Char::isDigit).take(4) },
                                label = { Text("Manual FTP (Watts)") },
                                placeholder = { Text("0 for auto") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                            )
                            Button(
                                onClick = {
                                    val w = ftpInputText.toIntOrNull() ?: 0
                                    scope.launch {
                                        container.repository.updateCyclingFtp(w, settings.autoEstimateFtp)
                                    }
                                },
                                enabled = (ftpInputText.toIntOrNull() ?: 0) != settings.ftpWatts,
                            ) {
                                Text("Save FTP")
                            }
                        }
                    }
                }

                // 2. Coggan 7-Zone Power Model Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Coggan 7-Zone Power Model",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "FTP: $activeFtp W",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            "Power zones are scaled to your Functional Threshold Power (FTP) for bike workouts and interval pacing.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        PowerZonePreview(zones = cogganZones, ftpWatts = activeFtp)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

/** The colored zone bars shared by the manual editor and the auto preview. */
@Composable
private fun ZonePreview(
    starts: List<Float>,
    ends: List<Float>,
    hrMax: Int,
) {
    val zones = MaterialTheme.semanticColors.zones
    starts.zip(ends).forEachIndexed { i, (s, e) ->
        val zoneColor = zones[i]
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Z${i + 1}", Modifier.padding(end = 4.dp), color = zoneColor, fontWeight = FontWeight.Bold)
            androidx.compose.foundation.Canvas(
                Modifier
                    .weight(1f)
                    .height(16.dp),
            ) {
                drawRoundRect(
                    zoneColor.copy(alpha = 0.3f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                )
                val frac = ((e - s) / hrMax).coerceIn(0.02f, 1f)
                drawRoundRect(
                    zoneColor,
                    size = androidx.compose.ui.geometry.Size(size.width * frac, size.height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                )
            }
            Text("${s.toInt()}–${e.toInt()}", style = MaterialTheme.typography.labelSmall)
        }
    }
}

/** Coggan 7-Zone proportional visual preview bars and watt boundaries. */
@Composable
private fun PowerZonePreview(
    zones: List<ZoneBucket>,
    ftpWatts: Int,
) {
    val semanticZones = MaterialTheme.semanticColors.zones
    val maxRefWatts = (ftpWatts * 1.75f).coerceAtLeast(100f)
    zones.forEachIndexed { i, zb ->
        val color = semanticZones.getOrElse(i) { MaterialTheme.colorScheme.primary }
        val rangeStr = when (zb.zone) {
            1 -> "< ${zb.maxWatts} W"
            7 -> "> ${zb.minWatts} W"
            else -> "${zb.minWatts}–${zb.maxWatts} W"
        }
        val pctStr = when (zb.zone) {
            1 -> "< 55%"
            2 -> "56–75%"
            3 -> "76–90%"
            4 -> "91–105%"
            5 -> "106–120%"
            6 -> "121–150%"
            else -> "> 150%"
        }
        Column(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .background(color, CircleShape),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Z${zb.zone}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = color,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        zb.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        pctStr,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        rangeStr,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            androidx.compose.foundation.Canvas(
                Modifier
                    .fillMaxWidth()
                    .height(10.dp),
            ) {
                drawRoundRect(
                    color.copy(alpha = 0.2f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(5.dp.toPx()),
                )
                val startFrac = (zb.minWatts.toFloat() / maxRefWatts).coerceIn(0f, 0.95f)
                val endFrac = if (zb.zone == 7) 1.0f else (zb.maxWatts.toFloat() / maxRefWatts).coerceIn(0.05f, 1f)
                val barWidth = ((endFrac - startFrac) * size.width).coerceAtLeast(8.dp.toPx())
                val left = startFrac * size.width
                drawRoundRect(
                    color,
                    topLeft = androidx.compose.ui.geometry.Offset(left, 0f),
                    size = androidx.compose.ui.geometry.Size(barWidth.coerceAtMost(size.width - left), size.height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(5.dp.toPx()),
                )
            }
        }
    }
}
