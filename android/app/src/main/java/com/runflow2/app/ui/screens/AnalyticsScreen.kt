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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AnalyticsScreen(container: AppContainer) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val analytics by produceState<AnalyticsBundle?>(null, activities.size) {
        value = container.repository.analytics(365)
    }

    var rangeDays by remember { mutableStateOf(90) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }

    val a = analytics ?: return Scaffold { }

    Scaffold(
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text("Analytics") },
                subtitle = { Text("Fitness · fatigue · form") },
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
            // ---- metric tiles ----
            item {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile(
                                label = "VO₂ max",
                                value = Format.oneDecimal(a.effectiveVdot),
                                icon = Icons.Outlined.MonitorHeart,
                                accent = MaterialTheme.colorScheme.primary,
                            )
                            StatTile(
                                label = "Weekly",
                                value = Format.distance(a.currentWeekKm, unit),
                                icon = Icons.Outlined.DirectionsRun,
                                accent = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            StatTile(
                                label = "Fitness (CTL)",
                                value = Format.intOrDash(a.ctl),
                                icon = Icons.Outlined.Favorite,
                                accent = ChartCtl,
                            )
                            StatTile(
                                label = "Fatigue (ATL)",
                                value = Format.intOrDash(a.atl),
                                icon = Icons.Outlined.Speed,
                                accent = ChartAtl,
                            )
                            StatTile(
                                label = "Form (TSB)",
                                value = (if (a.tsb > 0) "+" else "") + Format.intOrDash(a.tsb),
                                icon = Icons.Outlined.Flag,
                                accent = a.tsbStatus.color(),
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(12.dp)
                                    .background(a.tsbStatus.color(), CircleShape),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "${a.tsbStatus.label} · 12-wk avg ${Format.distance(a.avgWeeklyKm12, unit)}/wk",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
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
