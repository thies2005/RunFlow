package com.runflow2.app.ui.screens.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.math.BestEffortsEngine
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.analytics.CyclingAnalyticsSummary
import com.runflow2.app.domain.analytics.WeekVolume
import com.runflow2.app.domain.analytics.ZoneBucket
import com.runflow2.app.ui.components.FitnessChart
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.Sparkline
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.TsbBar
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.components.themedColor
import com.runflow2.app.ui.theme.semanticColors
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun CyclingAnalyticsTab(
    bundle: AnalyticsBundle,
    unit: DistanceUnit,
    modifier: Modifier = Modifier,
    onOpenZones: () -> Unit = {},
) {
    val cycling = bundle.cycling
    val hasCyclingData = cycling != null && (
        cycling.recentRideNpSeries.isNotEmpty() ||
            cycling.totalBikeTss30d > 0 ||
            cycling.bikeFitnessSeries.any { it.load > 0 } ||
            bundle.powerMmpCurve1y.isNotEmpty()
    )

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (!hasCyclingData) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(
                    Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.DirectionsBike,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "No cycling activities yet",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "Record or sync your rides with Strava to view power metrics, MMP duration curves, PMC fitness chart, and weekly volume.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
            return@Column
        }

        // 1. Cycling Status Card: FTP, eFTP, CP, W', W/kg, Cycling VO2max
        CyclingStatusCard(cycling = cycling!!)

        // 2. Cycling Power MMP Curve (42d vs 1y)
        val mmp42d = cycling.mmpCurve42d.ifEmpty { bundle.powerMmpCurve42d }
        val mmp1y = cycling.mmpCurve1y.ifEmpty { bundle.powerMmpCurve1y }
        if (mmp1y.isNotEmpty() || mmp42d.isNotEmpty()) {
            CyclingMmpCurveCard(
                mmp42d = mmp42d,
                mmp1y = mmp1y,
                cpWatts = cycling.cpWatts,
                wPrimeKj = cycling.wPrimeKj,
            )
        }

        // 3. Cycling Load (PMC) Card
        CyclingPmcCard(cycling = cycling)

        // 4. Weekly Cycling Volume Card
        CyclingVolumeCard(cycling = cycling, unit = unit)

        // 5. 7-Zone Coggan Power Distribution Card
        if (cycling.powerZoneDistribution.isNotEmpty()) {
            CyclingPowerZoneDistributionCard(
                zones = cycling.powerZoneDistribution,
                onOpenZones = onOpenZones,
            )
        }

        // 6. Recent Rides Power Summary
        RecentRidesPowerCard(cycling = cycling)
    }
}

@Composable
private fun CyclingStatusCard(
    cycling: CyclingAnalyticsSummary,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionTitle("Cycling Threshold & Capacity")

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val ftpDisplay = if (cycling.ftpWatts > 0) "${cycling.ftpWatts} W" else (cycling.eFtpWatts?.let { "${it} W (eFTP)" } ?: "—")
                StatTile(
                    label = "Cycling FTP",
                    value = ftpDisplay,
                    icon = Icons.Outlined.Bolt,
                    accent = MaterialTheme.semanticColors.streamPower,
                    caption = cycling.wPerKg?.let { "$it W/kg" },
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(12.dp))
                StatTile(
                    label = "Cycling VO2max",
                    value = cycling.cyclingVo2max?.let { Format.oneDecimal(it) } ?: "—",
                    icon = Icons.Outlined.MonitorHeart,
                    accent = MaterialTheme.semanticColors.tsb,
                    caption = "ml/kg/min (ACSM)",
                    modifier = Modifier.weight(1f),
                )
            }

            // CP & W' row if available
            if (cycling.cpWatts != null || cycling.wPrimeKj != null) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    StatTile(
                        label = "Critical Power (CP)",
                        value = cycling.cpWatts?.let { "${it} W" } ?: "—",
                        icon = Icons.Outlined.Speed,
                        accent = MaterialTheme.colorScheme.primary,
                        caption = "2-parameter model",
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(12.dp))
                    StatTile(
                        label = "Anaerobic Cap (W')",
                        value = cycling.wPrimeKj?.let { "${Format.oneDecimal(it)} kJ" } ?: "—",
                        icon = Icons.Outlined.TrendingUp,
                        accent = MaterialTheme.colorScheme.tertiary,
                        caption = "Work capacity > CP",
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Cycling CTL / ATL / TSB metric bars
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Cycling Load · CTL ${cycling.ctlBike.roundToInt()} · ATL ${cycling.atlBike.roundToInt()} · Form ${if (cycling.tsbBike >= 0) "+" else ""}${cycling.tsbBike.roundToInt()}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                val maxLoad = maxOf(cycling.ctlBike, cycling.atlBike, 1.0)
                MetricBarRow(
                    label = "Fitness (CTL Bike)",
                    color = MaterialTheme.semanticColors.ctl,
                    value = cycling.ctlBike,
                    max = maxLoad,
                )
                MetricBarRow(
                    label = "Fatigue (ATL Bike)",
                    color = MaterialTheme.semanticColors.atl,
                    value = cycling.atlBike,
                    max = maxLoad,
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Form (TSB Bike)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "${if (cycling.tsbBike >= 0) "+" else ""}${cycling.tsbBike.roundToInt()}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.semanticColors.tsb,
                    )
                }
                TsbBar(tsb = cycling.tsbBike)
            }
        }
    }
}

@Composable
private fun CyclingMmpCurveCard(
    mmp42d: List<BestEffortsEngine.PowerEffort>,
    mmp1y: List<BestEffortsEngine.PowerEffort>,
    cpWatts: Int?,
    wPrimeKj: Double?,
    modifier: Modifier = Modifier,
) {
    val mmp42Map = remember(mmp42d) { mmp42d.associateBy { it.durationSec } }
    val mmp1yMap = remember(mmp1y) { mmp1y.associateBy { it.durationSec } }

    val durations = remember(mmp42d, mmp1y) {
        (mmp42Map.keys + mmp1yMap.keys).sorted()
    }
    var scrubIndex by remember { mutableStateOf<Int?>(null) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle(
                text = "Mean Maximal Power (MMP)",
                trailing = {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Box(Modifier.size(8.dp).background(MaterialTheme.semanticColors.streamPower, CircleShape))
                            Text("42d", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.outline, CircleShape))
                            Text("1Y Peak", style = MaterialTheme.typography.labelSmall, maxLines = 1)
                        }
                    }
                },
            )

            // Graphical MMP Curve Canvas
            if (durations.isNotEmpty()) {
                val p42Color = MaterialTheme.semanticColors.streamPower
                val p1yColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.7f)
                val gridColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
                val scrubLineColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)

                val allWatts = remember(durations, mmp42Map, mmp1yMap) {
                    durations.flatMap { listOfNotNull(mmp42Map[it]?.maxWatts, mmp1yMap[it]?.maxWatts) }.filter { it > 0.0 }
                }
                val minW = (allWatts.minOrNull() ?: 100.0) * 0.90
                val maxW = (allWatts.maxOrNull() ?: 400.0) * 1.06
                val rangeW = (maxW - minW).coerceAtLeast(1.0)

                // Scrubber live readout pill
                if (scrubIndex != null) {
                    val scrubDur = durations.getOrNull(scrubIndex!!)
                    if (scrubDur != null) {
                        val s42 = mmp42Map[scrubDur]?.maxWatts?.roundToInt()
                        val s1y = mmp1yMap[scrubDur]?.maxWatts?.roundToInt()
                        val readout = "${formatPowerDuration(scrubDur)} · 42d: ${s42?.let { "$it W" } ?: "—"} · 1Y Peak: ${s1y?.let { "$it W" } ?: "—"}"
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                text = readout,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                maxLines = 1,
                            )
                        }
                    }
                }

                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                    ) {
                        // Left-hand Y-axis column (38.dp wide)
                        Column(
                            modifier = Modifier
                                .width(38.dp)
                                .height(140.dp)
                                .padding(vertical = 4.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                "${maxW.roundToInt()}W",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                            )
                            Text(
                                "${((minW + maxW) / 2).roundToInt()}W",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                            )
                            Text(
                                "${minW.roundToInt()}W",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                            )
                        }

                        Canvas(
                            modifier = Modifier
                                .weight(1f)
                                .height(140.dp)
                                .padding(vertical = 4.dp)
                                .pointerInput(durations.size) {
                                    detectDragGestures(
                                        onDragStart = { offset ->
                                            if (durations.size > 1) {
                                                val frac = (offset.x / size.width).coerceIn(0f, 1f)
                                                scrubIndex = (frac * (durations.size - 1)).roundToInt()
                                            }
                                        },
                                        onDragEnd = { scrubIndex = null },
                                        onDragCancel = { scrubIndex = null },
                                        onDrag = { change, _ ->
                                            if (durations.size > 1) {
                                                val frac = (change.position.x / size.width).coerceIn(0f, 1f)
                                                scrubIndex = (frac * (durations.size - 1)).roundToInt()
                                                change.consume()
                                            }
                                        },
                                    )
                                },
                        ) {
                            val w = size.width
                            val h = size.height

                            // Grid lines
                            drawLine(gridColor, Offset(0f, 0f), Offset(w, 0f), strokeWidth = 1f)
                            drawLine(gridColor, Offset(0f, h * 0.5f), Offset(w, h * 0.5f), strokeWidth = 1f)
                            drawLine(gridColor, Offset(0f, h), Offset(w, h), strokeWidth = 1f)

                            if (durations.size >= 2) {
                                fun py(watts: Double): Float =
                                    (h - ((watts - minW) / rangeW).toFloat() * h).coerceIn(0f, h)

                                // 1Y Peak dashed curve
                                val path1y = Path()
                                durations.forEachIndexed { idx, dur ->
                                    val x = (idx.toFloat() / (durations.size - 1)) * w
                                    val watts = mmp1yMap[dur]?.maxWatts ?: minW
                                    val y = py(watts)
                                    if (idx == 0) path1y.moveTo(x, y) else path1y.lineTo(x, y)
                                }
                                drawPath(
                                    path1y,
                                    p1yColor,
                                    style = Stroke(
                                        width = 2.dp.toPx(),
                                        cap = StrokeCap.Round,
                                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx())),
                                    ),
                                )

                                // 42d curve with area fill
                                val path42 = Path()
                                val fill42 = Path()
                                durations.forEachIndexed { idx, dur ->
                                    val x = (idx.toFloat() / (durations.size - 1)) * w
                                    val watts = mmp42Map[dur]?.maxWatts ?: minW
                                    val y = py(watts)
                                    if (idx == 0) {
                                        path42.moveTo(x, y)
                                        fill42.moveTo(x, y)
                                    } else {
                                        path42.lineTo(x, y)
                                        fill42.lineTo(x, y)
                                    }
                                }
                                fill42.lineTo(w, h)
                                fill42.lineTo(0f, h)
                                fill42.close()

                                drawPath(
                                    fill42,
                                    Brush.verticalGradient(
                                        listOf(p42Color.copy(alpha = 0.22f), Color.Transparent),
                                    ),
                                )
                                drawPath(
                                    path42,
                                    p42Color,
                                    style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round),
                                )

                                // Circular markers
                                durations.forEachIndexed { idx, dur ->
                                    val x = (idx.toFloat() / (durations.size - 1)) * w
                                    mmp1yMap[dur]?.maxWatts?.let { watts ->
                                        drawCircle(p1yColor, radius = 2.5.dp.toPx(), center = Offset(x, py(watts)))
                                    }
                                    mmp42Map[dur]?.maxWatts?.let { watts ->
                                        drawCircle(p42Color, radius = 3.5.dp.toPx(), center = Offset(x, py(watts)))
                                    }
                                }

                                // Scrubber vertical line
                                scrubIndex?.let { sIdx ->
                                    val dur = durations.getOrNull(sIdx)
                                    if (dur != null) {
                                        val x = (sIdx.toFloat() / (durations.size - 1)) * w
                                        drawLine(
                                            color = scrubLineColor,
                                            start = Offset(x, 0f),
                                            end = Offset(x, h),
                                            strokeWidth = 1.5.dp.toPx(),
                                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx())),
                                        )
                                        mmp42Map[dur]?.maxWatts?.let { w42 ->
                                            drawCircle(p42Color, radius = 5.dp.toPx(), center = Offset(x, py(w42)))
                                            drawCircle(Color.White, radius = 2.dp.toPx(), center = Offset(x, py(w42)))
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Bottom X-axis label row displaying 5s, 30s, 2m, 10m, and 60m
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 38.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        listOf("5s", "30s", "2m", "10m", "60m").forEach { label ->
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }

            // Power Table (5s to 60m)
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                durations.forEach { dur ->
                    val w42 = mmp42Map[dur]?.maxWatts
                    val w1y = mmp1yMap[dur]?.maxWatts
                    val label = formatPowerDuration(dur)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.width(60.dp),
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            Text(
                                text = w42?.let { "${it.roundToInt()} W" } ?: "—",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.semanticColors.streamPower,
                            )
                            Text(
                                text = w1y?.let { "${it.roundToInt()} W (1y)" } ?: "—",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatPowerDuration(seconds: Int): String = when {
    seconds < 60 -> "${seconds}s"
    seconds % 60 == 0 -> "${seconds / 60}m"
    else -> "${seconds / 60}m ${seconds % 60}s"
}

@Composable
private fun CyclingPmcCard(
    cycling: CyclingAnalyticsSummary,
    modifier: Modifier = Modifier,
) {
    var rangeDays by remember { mutableStateOf(90) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle("Cycling Load (PMC)")
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(90, 180, 365).forEach { d ->
                    FilterChip(
                        selected = rangeDays == d,
                        onClick = { rangeDays = d },
                        label = { Text(if (d == 365) "1Y" else "${d}d") },
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = showCtl,
                    onClick = { showCtl = !showCtl },
                    label = { Text("CTL") },
                    leadingIcon = {
                        Box(Modifier.size(8.dp).background(MaterialTheme.semanticColors.ctl, CircleShape))
                    },
                )
                FilterChip(
                    selected = showAtl,
                    onClick = { showAtl = !showAtl },
                    label = { Text("ATL") },
                    leadingIcon = {
                        Box(Modifier.size(8.dp).background(MaterialTheme.semanticColors.atl, CircleShape))
                    },
                )
                FilterChip(
                    selected = showTsb,
                    onClick = { showTsb = !showTsb },
                    label = { Text("TSB") },
                    leadingIcon = {
                        Box(Modifier.size(8.dp).background(MaterialTheme.semanticColors.tsb, CircleShape))
                    },
                )
            }
            val dailyPoints = cycling.bikeFitnessSeries.map { it.toDailyLoad() }
            if (dailyPoints.isNotEmpty()) {
                FitnessChart(
                    daily = dailyPoints.takeLast(rangeDays),
                    showCtl = showCtl,
                    showAtl = showAtl,
                    showTsb = showTsb,
                    modifier = Modifier.fillMaxWidth(),
                )
            } else {
                Text(
                    "No cycling load data yet",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 24.dp),
                )
            }
        }
    }
}

@Composable
private fun CyclingVolumeCard(
    cycling: CyclingAnalyticsSummary,
    unit: DistanceUnit,
    modifier: Modifier = Modifier,
) {
    var showTss by rememberSaveable { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle(
                text = "Weekly Cycling Volume",
                trailing = {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(
                            selected = !showTss,
                            onClick = { showTss = false },
                            label = { Text(if (unit == DistanceUnit.IMPERIAL) "Miles" else "Km", maxLines = 1) },
                        )
                        FilterChip(
                            selected = showTss,
                            onClick = { showTss = true },
                            label = { Text("Bike TSS", maxLines = 1) },
                        )
                    }
                },
            )

            val bars = if (showTss) {
                cycling.weeklyBikeTss.map { it.toWeekVolume() }
            } else {
                cycling.weeklyBikeKm.map {
                    val dist = if (unit == DistanceUnit.IMPERIAL) it.value * 0.621371 else it.value
                    WeekVolume(it.weekStart, dist, it.count)
                }
            }
            val unitLabel = if (showTss) "TSS" else (if (unit == DistanceUnit.IMPERIAL) "mi" else "km")
            val barColor = if (showTss) MaterialTheme.semanticColors.streamPower else MaterialTheme.colorScheme.primary

            WeeklyVolumeBars(
                weeks = bars,
                unitLabel = unitLabel,
                barColor = barColor,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun CyclingPowerZoneDistributionCard(
    zones: List<ZoneBucket>,
    modifier: Modifier = Modifier,
    onOpenZones: () -> Unit = {},
) {
    val totalSec = zones.sumOf { it.seconds }.coerceAtLeast(1)

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionTitle(
                text = "7-Zone Coggan Power Distribution",
                trailing = {
                    TextButton(onClick = onOpenZones) {
                        Text("Edit Zones →", maxLines = 1)
                    }
                },
            )

            // Stacked horizontal bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(20.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape),
            ) {
                zones.forEachIndexed { i, z ->
                    val frac = z.seconds.toFloat() / totalSec
                    if (frac > 0.005f) {
                        Box(
                            modifier = Modifier
                                .weight(frac)
                                .fillMaxSize()
                                .background(MaterialTheme.semanticColors.zones[i]),
                        )
                    }
                }
            }

            // Zone details list (removed static watt boundary table, kept duration and %)
            zones.forEachIndexed { i, z ->
                val frac = (z.seconds.toDouble() / totalSec * 100.0).roundToInt()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .background(MaterialTheme.semanticColors.zones[i], CircleShape),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Z${z.zone} ${z.name}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "${Format.duration(z.seconds.toLong())} ($frac%)",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun RecentRidesPowerCard(
    cycling: CyclingAnalyticsSummary,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle("Recent Rides Power Summary")

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatTile(
                    label = "Avg Power",
                    value = cycling.avgWatts?.let { "$it W" } ?: "—",
                    icon = Icons.Outlined.Bolt,
                )
                StatTile(
                    label = "Avg NP",
                    value = cycling.avgNpWatts?.let { "$it W" } ?: "—",
                    icon = Icons.Outlined.Bolt,
                    accent = MaterialTheme.semanticColors.streamPower,
                )
                StatTile(
                    label = "30d Bike TSS",
                    value = "${cycling.totalBikeTss30d}",
                    icon = Icons.Outlined.Speed,
                    accent = MaterialTheme.colorScheme.tertiary,
                )
            }

            if (cycling.recentRideNpSeries.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "Recent Rides NP (Watts)",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Sparkline(
                        values = cycling.recentRideNpSeries,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        color = MaterialTheme.semanticColors.streamPower,
                    )
                }
            }
        }
    }
}

@Composable
private fun MetricBarRow(
    label: String,
    color: Color,
    value: Double,
    max: Double,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = color,
            )
            Text(
                Format.roundedIntOrDash(value),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color,
            )
        }
        val fraction = if (max > 0.0) (value / max).toFloat().coerceIn(0f, 1f) else 0f
        Box(
            Modifier
                .fillMaxWidth()
                .height(7.dp)
                .background(color.copy(alpha = 0.15f), CircleShape),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(fraction)
                    .height(7.dp)
                    .background(color, CircleShape),
            )
        }
    }
}


