package com.runflow2.app.ui.screens

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.TrainingPaces
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.model.PaceZone
import com.runflow2.app.ui.components.FitnessChart
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.Sparkline
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.components.ZoneDistribution
import com.runflow2.app.ui.components.color
import com.runflow2.app.ui.theme.ChartAtl
import com.runflow2.app.ui.theme.ChartCtl
import com.runflow2.app.ui.theme.ChartTsb
import kotlin.math.abs
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AnalyticsScreen(container: AppContainer) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val analytics by produceState<AnalyticsBundle?>(null, activities) {
        value = container.repository.analytics(365)
    }

    var rangeDays by remember { mutableStateOf(90) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }

    val a = analytics ?: return Scaffold { }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Analytics")
                        Text(
                            "Fitness · fatigue · form",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
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
            // ---- training status (web parity: % of all-time max) ----
            item {
                var showAbsoluteCtl by rememberSaveable { mutableStateOf(false) }
                var showAbsoluteAtl by rememberSaveable { mutableStateOf(false) }
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            StatTile(
                                label = "VO₂ max",
                                value = Format.oneDecimal(a.effectiveVdot),
                                icon = Icons.Outlined.MonitorHeart,
                                accent = MaterialTheme.colorScheme.primary,
                            )
                            if (a.marathonShape != null) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "${a.marathonShape.roundToInt()}%",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text(
                                            "Marathon shape",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.size(46.dp),
                                    ) {
                                        ProgressRing(
                                            progress = (a.marathonShape / 100.0)
                                                .coerceIn(0.0, 1.0).toFloat(),
                                            modifier = Modifier.fillMaxSize(),
                                            color = ChartCtl,
                                            strokeWidth = 6f,
                                        )
                                        Text(
                                            "${a.marathonShape.roundToInt()}",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = ChartCtl,
                                        )
                                    }
                                }
                            }
                        }

                        MetricBarRow(
                            label = "Fitness · CTL",
                            color = ChartCtl,
                            value = a.ctl,
                            max = a.maxCtl,
                            showAbsolute = showAbsoluteCtl,
                            onToggle = { showAbsoluteCtl = !showAbsoluteCtl },
                        )
                        MetricBarRow(
                            label = "Fatigue · ATL",
                            color = ChartAtl,
                            value = a.atl,
                            max = a.maxAtl,
                            showAbsolute = showAbsoluteAtl,
                            onToggle = { showAbsoluteAtl = !showAbsoluteAtl },
                        )

                        // Form: diverging bar around the center tick (±50 TSB = full half)
                        Column(
                            Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "Form · TSB",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Box(
                                        Modifier
                                            .size(10.dp)
                                            .background(a.tsbStatus.color(), CircleShape),
                                    )
                                    Text(
                                        a.tsbStatus.label,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = a.tsbStatus.color(),
                                    )
                                    Text(
                                        (if (a.tsb > 0) "+" else "") + Format.roundedIntOrDash(a.tsb),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = a.tsbStatus.color(),
                                    )
                                }
                            }
                            TsbBar(tsb = a.tsb)
                        }

                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            LabelValue("Weekly", Format.distance(a.currentWeekKm, unit))
                            LabelValue("12-wk avg", "${Format.distance(a.avgWeeklyKm12, unit)}/wk")
                        }
                    }
                }
            }

            // ---- fitness chart ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionTitle("Fitness & fatigue")
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf(30, 60, 90, 365).forEach { d ->
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
                                    Box(Modifier.size(8.dp).background(ChartCtl, CircleShape))
                                },
                            )
                            FilterChip(
                                selected = showAtl,
                                onClick = { showAtl = !showAtl },
                                label = { Text("ATL") },
                                leadingIcon = {
                                    Box(Modifier.size(8.dp).background(ChartAtl, CircleShape))
                                },
                            )
                            FilterChip(
                                selected = showTsb,
                                onClick = { showTsb = !showTsb },
                                label = { Text("TSB") },
                                leadingIcon = {
                                    Box(Modifier.size(8.dp).background(ChartTsb, CircleShape))
                                },
                            )
                        }
                        FitnessChart(
                            daily = a.daily.takeLast(rangeDays),
                            showCtl = showCtl,
                            showAtl = showAtl,
                            showTsb = showTsb,
                        )
                        Text(
                            "Drag on the chart to inspect a day",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // ---- weekly volume ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        SectionTitle("Weekly volume · last 26 weeks")
                        Spacer(Modifier.height(12.dp))
                        WeeklyVolumeBars(
                            weeks = a.weeklyVolume,
                            unitLabel = Format.distanceUnitLabel(unit),
                        )
                    }
                }
            }

            // ---- race predictions ----
            if (a.effectiveVdot != null) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            SectionTitle("Race predictions")
                            Text(
                                "From VO₂ max ${Format.oneDecimal(a.effectiveVdot)} (correction ×${Format.oneDecimal(a.vdotCorrection)})",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            VdotMath.predictionDistances.forEach { (label, distM) ->
                                val t = VdotMath.predictTimeSec(a.effectiveVdot, distM)
                                Row(
                                    Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Outlined.EmojiEvents, null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(18.dp),
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Text(label, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        t?.let { Format.duration(it.toInt()) } ?: "—",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }
                }

                // ---- training paces ----
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            SectionTitle("Training paces")
                            val paces = TrainingPaces(a.effectiveVdot)
                            PaceZone.entries.forEach { zone ->
                                val (fast, slow) = paces.range(zone)
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            Modifier
                                                .size(10.dp)
                                                .background(
                                                    when (zone) {
                                                        PaceZone.EASY -> ChartCtl
                                                        PaceZone.MARATHON -> ChartTsb
                                                        PaceZone.THRESHOLD -> ChartAtl
                                                        PaceZone.INTERVAL -> MaterialTheme.colorScheme.error
                                                        PaceZone.REPETITION -> MaterialTheme.colorScheme.tertiary
                                                    },
                                                    CircleShape,
                                                ),
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Text(
                                            "${zone.label} (${zone.short})",
                                            style = MaterialTheme.typography.titleSmall,
                                        )
                                        Spacer(Modifier.weight(1f))
                                        Text(
                                            Format.paceRange(fast, slow, unit) + " /" + Format.distanceUnitLabel(unit),
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                    Text(
                                        "${zone.hrBand} HRmax",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(start = 18.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ---- marathon shape ----
            if (a.marathonShape != null) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.size(84.dp),
                            ) {
                                ProgressRing(
                                    progress = ((a.marathonShape ?: 0.0) / 100.0).coerceIn(0.0, 1.0).toFloat(),
                                    modifier = Modifier.fillMaxSize(),
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                Text(
                                    "${a.marathonShape.toInt()}%",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Spacer(Modifier.width(16.dp))
                            Column(Modifier.weight(1f)) {
                                Text("Marathon shape", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    if ((a.marathonShape ?: 0.0) >= 100)
                                        "Race ready — hold this build"
                                    else if ((a.marathonShape ?: 0.0) >= 75)
                                        "Strong base — keep building CTL"
                                    else "Building — consistent weeks will raise this",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        if (a.vdotTrend.size > 3) {
                            Spacer(Modifier.height(4.dp))
                            Sparkline(
                                values = a.vdotTrend.map { it.vdot },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .padding(horizontal = 16.dp),
                            )
                        }
                    }
                }
            }

            // ---- HR zones ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionTitle("Heart-rate zones")
                        if (a.zoneSeconds.sum() > 0) {
                            ZoneDistribution(zonesSeconds = a.zoneSeconds)
                        } else {
                            Text(
                                "Zone data appears once activities include heart rate.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

/** Web-parity "Training Status" row: label, tap-to-toggle (% of max ⇄ absolute), bar to all-time max. */
@Composable
private fun MetricBarRow(
    label: String,
    color: Color,
    value: Double,
    max: Double,
    showAbsolute: Boolean,
    onToggle: () -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(5.dp)) {
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
                if (showAbsolute || max <= 0.0) Format.roundedIntOrDash(value)
                else "${((value / max) * 100).roundToInt()}%",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color,
                modifier = Modifier.clickable(onClick = onToggle),
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

/** Diverging TSB bar: center tick, bar grows right (fresh) or left (fatigued); ±50 TSB = full half. */
@Composable
private fun TsbBar(tsb: Double) {
    val color = com.runflow2.app.domain.model.TsbStatus.from(tsb).color()
    val half = (abs(tsb) / 50.0).coerceIn(0.0, 1.0).toFloat()
    Canvas(
        Modifier
            .fillMaxWidth()
            .height(8.dp),
    ) {
        val track = color.copy(alpha = 0.15f)
        drawRoundRect(track, cornerRadius = CornerRadius(size.height))
        // center tick
        drawRoundRect(
            color = color.copy(alpha = 0.45f),
            topLeft = Offset(size.width / 2f - 1.dp.toPx(), 0f),
            size = Size(2.dp.toPx(), size.height),
            cornerRadius = CornerRadius(1.dp.toPx()),
        )
        val barWidth = size.width / 2f * half
        if (barWidth > 0f) {
            val left = if (tsb >= 0) size.width / 2f else size.width / 2f - barWidth
            drawRoundRect(
                color = color,
                topLeft = Offset(left, 0f),
                size = Size(barWidth, size.height),
                cornerRadius = CornerRadius(size.height),
            )
        }
    }
}

@Composable
private fun LabelValue(label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
