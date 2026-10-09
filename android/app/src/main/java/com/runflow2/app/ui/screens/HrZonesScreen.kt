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
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.domain.person.Personalization
import com.runflow2.app.ui.theme.ZoneColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HrZonesScreen(
    container: AppContainer,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val profile by container.repository.profile.collectAsState(initial = null)
    val p = profile ?: return

    var z1 by remember(p) { mutableStateOf(p.hrZone1Max.toFloat()) }
    var z2 by remember(p) { mutableStateOf(p.hrZone2Max.toFloat()) }
    var z3 by remember(p) { mutableStateOf(p.hrZone3Max.toFloat()) }
    var z4 by remember(p) { mutableStateOf(p.hrZone4Max.toFloat()) }
    var z5 by remember(p) { mutableStateOf(p.hrZone5Max.toFloat()) }
    var z6 by remember(p) { mutableStateOf(p.hrZone6Max.toFloat()) }

    // Auto mode follows the profile row; the local state keeps the switch
    // responsive while the save round-trips. The sliders remember(p), so
    // leaving auto re-inits them from the stored (possibly auto-computed)
    // boundaries.
    var auto by remember(p) { mutableStateOf(p.hrZonesAuto) }

    // Auto preview: the Karvonen boundaries the engine keeps the profile at.
    // Null (hrRest >= hrMax) falls back to the manual editor with a hint.
    val autoZones = if (auto) Personalization.karvonenZoneMaxes(p.hrMax, p.hrRest) else null

    val bounds = listOf(z1, z2, z3, z4, z5, z6)
    val valid = bounds.zipWithNext().all { (a, b) -> b > a } && z6 < p.hrMax

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Heart-rate zones") },
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
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
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
            Spacer(Modifier.height(6.dp))

            if (autoZones != null) {
                // ---- auto: read-only preview of the computed boundaries ----
                Text(
                    "Boundaries update automatically from your max and resting HR.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Text("Preview", style = MaterialTheme.typography.titleSmall)
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
                if (auto) {
                    Text(
                        "Max and resting HR don't form a valid Karvonen range right now — adjust them on the body screen, or set your boundaries manually below.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    "Zone 1 runs up to the first boundary, zone 7 is everything above the last boundary. Values must increase and stay below max HR (${p.hrMax}).",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))

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
                    val color = ZoneColors[i]
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
                Spacer(Modifier.height(8.dp))
                Text("Preview", style = MaterialTheme.typography.titleSmall)
                val starts = listOf(0f, z1, z2, z3, z4, z5)
                val ends = bounds + p.hrMax.toFloat()
                ZonePreview(starts = starts, ends = ends, hrMax = p.hrMax)

                Spacer(Modifier.height(12.dp))
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
                                    // Manual edits opt out of auto zones (the
                                    // switch state is written here explicitly).
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
    starts.zip(ends).forEachIndexed { i, (s, e) ->
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Z${i + 1}", Modifier.padding(end = 4.dp), color = ZoneColors[i])
            androidx.compose.foundation.Canvas(
                Modifier
                    .weight(1f)
                    .height(16.dp),
            ) {
                drawRoundRect(
                    ZoneColors[i].copy(alpha = 0.3f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                )
                val frac = ((e - s) / hrMax).coerceIn(0.02f, 1f)
                drawRoundRect(
                    ZoneColors[i],
                    size = androidx.compose.ui.geometry.Size(size.width * frac, size.height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                )
            }
            Text("${s.toInt()}–${e.toInt()}", style = MaterialTheme.typography.labelSmall)
        }
    }
}
