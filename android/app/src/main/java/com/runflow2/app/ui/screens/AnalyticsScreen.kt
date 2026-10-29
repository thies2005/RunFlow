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
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsBike
import androidx.compose.material.icons.automirrored.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Bedtime
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.RemoveRedEye
import androidx.compose.material.icons.outlined.Speed
import com.runflow2.app.domain.analytics.CyclingAnalyticsSummary
import com.runflow2.app.domain.analytics.WeekVolume
import com.runflow2.app.domain.analytics.ZoneBucket
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.math.TrainingPaces
import com.runflow2.app.core.math.VdotMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.domain.model.PaceZone
import com.runflow2.app.ui.components.FitnessChart
import com.runflow2.app.ui.components.HealthTrendChart
import com.runflow2.app.ui.components.ProgressRing
import com.runflow2.app.ui.components.ReadinessScoreChart
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.SleepDurationChart
import com.runflow2.app.ui.components.SleepStagesChart
import com.runflow2.app.ui.components.Sparkline
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.WeeklyVolumeBars
import com.runflow2.app.ui.components.ZoneDistribution
import com.runflow2.app.ui.components.themedColor
import com.runflow2.app.ui.theme.semanticColors
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AnalyticsScreen(container: AppContainer, targetSection: String? = null) {
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
    var selectedTab by rememberSaveable { mutableStateOf(AnalyticsSportTab.COMBINED) }
    // Multi-sport PMC view mode on the Combined tab (web parity: the
    // SplitPmcChart view switcher Combined | Running | Cycling | Split).
    var pmcMode by rememberSaveable { mutableStateOf("combined") }

    val listState = rememberLazyListState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    val a = analytics
    if (a == null) {
        Scaffold(
            modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("Analytics", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Fitness · fatigue · form",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
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
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                androidx.compose.material3.CircularProgressIndicator()
            }
        }
        return
    }

    // Sport presence drives which header chips render: Combined always
    // exists (load/form + health data); Running/Cycling only appear when
    // that sport has activities.
    val hasRunActivities = (a.totalRuns > 0) || a.weeklyVolume.any { it.km > 0.0 }
    val hasCyclingActivities = a.cycling?.let { c ->
        c.totalBikeTss30d > 0 ||
            c.recentRideNpSeries.isNotEmpty() ||
            c.bikeFitnessSeries.any { it.load > 0 } ||
            c.weeklyBikeKm.any { it.value > 0.0 }
    } == true

    // Deep-link from the dashboard squares: jump to the requested section.
    // Re-runs when analytics loads so the first composition (empty scaffold)
    // still lands on the section once items exist.
    LaunchedEffect(targetSection, analytics) {
        when (targetSection) {
            "form" -> {
                selectedTab = AnalyticsSportTab.COMBINED
                listState.scrollToItem(0)
            }
            "recovery" -> {
                selectedTab = AnalyticsSportTab.COMBINED
                listState.scrollToKeyedItem("sec-recovery")
            }
            "volume" -> {
                if (hasRunActivities) selectedTab = AnalyticsSportTab.RUNNING
                listState.scrollToKeyedItem("sec-volume")
            }
        }
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Analytics", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Fitness · fatigue · form",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
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
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ---- Combined | Running | Cycling sport switcher ----
            item(key = "tab-selector") {
                SingleChoiceSegmentedButtonRow(
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    SegmentedButton(
                        selected = selectedTab == AnalyticsSportTab.COMBINED,
                        onClick = { selectedTab = AnalyticsSportTab.COMBINED },
                        shape = SegmentedButtonDefaults.itemShape(index = 0, count = 3),
                        icon = {
                            Icon(
                                Icons.Outlined.Insights,
                                contentDescription = null,
                                modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                            )
                        },
                        label = { Text("Combined") },
                    )
                    SegmentedButton(
                        selected = selectedTab == AnalyticsSportTab.RUNNING,
                        onClick = { selectedTab = AnalyticsSportTab.RUNNING },
                        shape = SegmentedButtonDefaults.itemShape(index = 1, count = 3),
                        icon = {
                            Icon(
                                Icons.AutoMirrored.Outlined.DirectionsRun,
                                contentDescription = null,
                                modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                            )
                        },
                        label = { Text("Running") },
                    )
                    SegmentedButton(
                        selected = selectedTab == AnalyticsSportTab.CYCLING,
                        onClick = { selectedTab = AnalyticsSportTab.CYCLING },
                        shape = SegmentedButtonDefaults.itemShape(index = 2, count = 3),
                        icon = {
                            Icon(
                                Icons.AutoMirrored.Outlined.DirectionsBike,
                                contentDescription = null,
                                modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                            )
                        },
                        label = { Text("Cycling") },
                    )
                }
            }

            if (selectedTab == AnalyticsSportTab.COMBINED) {
            // ---- combined multi-sport overview KPI tiles ----
            item(key = "sec-combined-overview") {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionTitle("Combined overview")
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    "Combined Fitness",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    "${Format.roundedIntOrDash(a.ctl)} CTL",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    "ATL ${Format.roundedIntOrDash(a.atl)} · TSB " +
                                        (if (a.tsb > 0) "+" else "") + Format.roundedIntOrDash(a.tsb),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = a.tsbStatus.themedColor(),
                                )
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    "Running Volume",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    Format.distance(a.totalRunKm, unit),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    "${a.totalRuns} runs recorded",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    "Cycling Distance",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    Format.distance(a.totalBikeKm, unit),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    "${a.totalRides} rides recorded",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    "Total Training Time",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    "${Format.roundedIntOrDash(a.totalMovingHours)} h",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    "${a.totalActivities} total activities",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }

            // ---- combined load & form (CTL / ATL / TSB) ----
            item(key = "sec-load") {
                var showAbsoluteCtl by rememberSaveable { mutableStateOf(false) }
                var showAbsoluteAtl by rememberSaveable { mutableStateOf(false) }
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        MetricBarRow(
                            label = "Fitness · CTL",
                            color = MaterialTheme.semanticColors.ctl,
                            value = a.ctl,
                            max = a.maxCtl,
                            showAbsolute = showAbsoluteCtl,
                            onToggle = { showAbsoluteCtl = !showAbsoluteCtl },
                        )
                        MetricBarRow(
                            label = "Fatigue · ATL",
                            color = MaterialTheme.semanticColors.atl,
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
                                            .background(a.tsbStatus.themedColor(), CircleShape),
                                    )
                                    Text(
                                        a.tsbStatus.label,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = a.tsbStatus.themedColor(),
                                    )
                                    Text(
                                        (if (a.tsb > 0) "+" else "") + Format.roundedIntOrDash(a.tsb),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = a.tsbStatus.themedColor(),
                                    )
                                }
                            }
                            TsbBar(tsb = a.tsb)
                        }
                    }
                }
            }

            // ---- multi-sport PMC (Combined | Running | Cycling | Split) ----
            item(key = "sec-pmc") {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionTitle("Multi-Sport Performance Management (PMC)")
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf(
                                "combined" to "Combined",
                                "running" to "Running",
                                "cycling" to "Cycling",
                                "split" to "Split",
                            ).forEach { (mode, label) ->
                                FilterChip(
                                    selected = pmcMode == mode,
                                    onClick = { pmcMode = mode },
                                    label = { Text(label) },
                                )
                            }
                        }
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
                        if (pmcMode != "split") {
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
                            val series = when (pmcMode) {
                                "running" -> a.runFitnessSeries.map { it.toDailyLoad() }
                                "cycling" -> a.cycling?.bikeFitnessSeries?.map { it.toDailyLoad() } ?: emptyList()
                                else -> a.daily
                            }
                            if (series.isEmpty()) {
                                Text(
                                    if (pmcMode == "cycling") "No cycling load in this range" else "No load data yet",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            } else {
                                FitnessChart(
                                    daily = series.takeLast(rangeDays),
                                    showCtl = showCtl,
                                    showAtl = showAtl,
                                    showTsb = showTsb,
                                )
                            }
                        } else {
                            // Split overlay: running and cycling CTL side by side
                            // (FitnessChart draws one series, so split stacks the two)
                            Text(
                                "Running CTL",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (a.runFitnessSeries.isEmpty()) {
                                Text(
                                    "No running load yet",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            } else {
                                FitnessChart(
                                    daily = a.runFitnessSeries.map { it.toDailyLoad() }.takeLast(rangeDays),
                                    showCtl = true,
                                    showAtl = false,
                                    showTsb = false,
                                )
                            }
                            Text(
                                "Cycling CTL",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            val bikeSeries = a.cycling?.bikeFitnessSeries?.map { it.toDailyLoad() } ?: emptyList()
                            if (bikeSeries.isEmpty()) {
                                Text(
                                    "No cycling load yet",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            } else {
                                FitnessChart(
                                    daily = bikeSeries.takeLast(rangeDays),
                                    showCtl = true,
                                    showAtl = false,
                                    showTsb = false,
                                )
                            }
                        }
                        Text(
                            "Drag on the chart to inspect a day",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // ---- sport highlights with tap-through ----
            if (hasRunActivities || hasCyclingActivities) {
                item(key = "sec-combined-highlights") {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (hasRunActivities) {
                            Card(
                                Modifier
                                    .weight(1f)
                                    .clickable { selectedTab = AnalyticsSportTab.RUNNING },
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        "Running Highlights",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    LabelValue("VDOT", Format.oneDecimal(a.effectiveVdot))
                                    LabelValue("Aerobic VO2max", Format.oneDecimal(a.aerobicVo2max))
                                    LabelValue("Marathon Shape", a.marathonShape?.roundToInt()?.let { "$it%" } ?: "-")
                                    Text(
                                        "Open full running analytics →",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }
                        if (hasCyclingActivities) {
                            Card(
                                Modifier
                                    .weight(1f)
                                    .clickable { selectedTab = AnalyticsSportTab.CYCLING },
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    val c = a.cycling
                                    val activeFtp = c?.ftpWatts?.takeIf { it > 0 } ?: c?.eFtpWatts
                                    Text(
                                        "Cycling Highlights",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    LabelValue("FTP", activeFtp?.let { "$it W" } ?: "-")
                                    LabelValue("30d Bike TSS", c?.totalBikeTss30d?.toString() ?: "-")
                                    LabelValue("Avg NP", c?.avgNpWatts?.let { "$it W" } ?: "-")
                                    Text(
                                        "Open full cycling analytics →",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            } else if (selectedTab == AnalyticsSportTab.RUNNING) {
            // ---- running status: VDOT, marathon-shape ring, aerobic VO2max ----
            item(key = "sec-fitness") {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            // weight(1f): the tile owns the space left of the
                            // marathon-shape column, so the long two-metric
                            // label wraps instead of ellipsizing.
                            StatTile(
                                label = "VDOT (Training Paces)",
                                value = Format.oneDecimal(a.effectiveVdot),
                                icon = Icons.Outlined.MonitorHeart,
                                accent = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.weight(1f),
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
                                            color = MaterialTheme.semanticColors.ctl,
                                            strokeWidth = 6f,
                                        )
                                        Text(
                                            "${a.marathonShape.roundToInt()}",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.semanticColors.ctl,
                                        )
                                    }
                                }
                            }
                        }

                        // Aerobic Fitness (VO2max) — the HR-based trend metric
                        // (display only; it never feeds paces — that is VDOT
                        // above). Computed on device and replaced by a fresh
                        // server value when one exists.
                        a.aerobicVo2max?.let { aerobic ->
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "Aerobic Fitness (VO2max)",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    Format.oneDecimal(aerobic),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
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

            // ---- running distance (weekly volume) ----
            item(key = "sec-volume") {
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
                                "From VDOT ${Format.oneDecimal(a.effectiveVdot)} (correction ×${Format.oneDecimal(a.vdotCorrection)})",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            // Primary race-prediction VO2max: the HR-based
                            // aerobic VO2max when present, else training VDOT —
                            // penalised by the current marathon shape.
                            val predVo2 = a.aerobicVo2max ?: a.effectiveVdot
                            VdotMath.predictionDistances.forEach { (label, distM) ->
                                val t = VdotMath.predictTimeWithShapeSec(
                                    predVo2,
                                    distM,
                                    a.marathonShape?.roundToInt() ?: 100,
                                )
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
                                                        PaceZone.EASY -> MaterialTheme.semanticColors.ctl
                                                        PaceZone.MARATHON -> MaterialTheme.semanticColors.tsb
                                                        PaceZone.THRESHOLD -> MaterialTheme.semanticColors.atl
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
            } // end Running tab

            // ---- health data (recovery + sleep) lives on the Combined tab ----
            if (selectedTab == AnalyticsSportTab.COMBINED) {

            // ---- recovery · RHR & HRV ----
            item(key = "sec-recovery") {
                var healthRange by rememberSaveable { mutableStateOf(90) }
                val today = remember { LocalDate.now() }
                val healthEntries by produceState<List<DailyEntryEntity>>(emptyList(), healthRange) {
                    container.repository.dailyEntryRangeFlow(today.minusDays(healthRange.toLong()), today)
                        .collect { value = it }
                }

                val rhrValues = healthEntries.mapNotNull { it.restingHr?.toDouble() }
                val hrvValues = healthEntries.mapNotNull { it.hrvMs }
                val scoreValues = healthEntries.mapNotNull { it.score }
                // dashed baselines = trailing 7 non-null values per metric
                val rhrBaseline = rhrValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()
                val hrvBaseline = hrvValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()

                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionTitle("Recovery · RHR & HRV")
                        if (healthEntries.isEmpty()) {
                            Text(
                                "No recovery entries in this window yet.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                listOf(30, 90, 365).forEach { d ->
                                    FilterChip(
                                        selected = healthRange == d,
                                        onClick = { healthRange = d },
                                        label = { Text(if (d == 365) "1Y" else "${d}d") },
                                    )
                                }
                            }
                            HealthTrendChart(
                                entries = healthEntries,
                                rhrBaseline = rhrBaseline,
                                hrvBaseline = hrvBaseline,
                            )
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                // latest value + personal range per metric
                                StatTile(
                                    label = "Resting HR",
                                    value = Format.heartRate(rhrValues.lastOrNull()),
                                    icon = Icons.Outlined.Favorite,
                                    accent = MaterialTheme.colorScheme.primary,
                                    caption = if (rhrValues.size >= 2) {
                                        "range ${rhrValues.min().roundToInt()}–${rhrValues.max().roundToInt()} bpm"
                                    } else null,
                                    modifier = Modifier.weight(1f),
                                )
                                StatTile(
                                    label = "HRV",
                                    value = hrvValues.lastOrNull()?.let { "${it.roundToInt()} ms" } ?: "—",
                                    icon = Icons.Outlined.Bolt,
                                    accent = MaterialTheme.colorScheme.tertiary,
                                    caption = if (hrvValues.size >= 2) {
                                        "range ${hrvValues.min().roundToInt()}–${hrvValues.max().roundToInt()} ms"
                                    } else null,
                                    modifier = Modifier.weight(1f),
                                )
                                StatTile(
                                    label = "Readiness",
                                    value = Format.roundedIntOrDash(scoreValues.lastOrNull()),
                                    icon = Icons.Outlined.Speed,
                                    accent = MaterialTheme.semanticColors.tsb,
                                    caption = if (scoreValues.size >= 2) {
                                        "avg ${scoreValues.average().roundToInt()}"
                                    } else null,
                                    modifier = Modifier.weight(1f),
                                )
                            }

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    "Readiness score",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                val scoredEntries = healthEntries.filter { it.score != null }
                                if (scoredEntries.isEmpty()) {
                                    Text(
                                        "Log recovery in the dashboard to see trends",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                } else {
                                    Text(
                                        "Latest ${scoreValues.last().roundToInt()} · range " +
                                            "${scoreValues.min().roundToInt()}–${scoreValues.max().roundToInt()} · " +
                                            "avg ${scoreValues.average().roundToInt()}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    ReadinessScoreChart(entries = scoredEntries)
                                }
                            }
                        }
                    }
                }
            }

            // ---- sleep analysis ----
            item {
                var sleepRange by rememberSaveable { mutableStateOf(90) }
                val today = remember { LocalDate.now() }
                val sleepEntries by produceState<List<DailyEntryEntity>>(emptyList(), sleepRange) {
                    container.repository.dailyEntryRangeFlow(today.minusDays(sleepRange.toLong()), today)
                        .collect { value = it }
                }

                val sleepValues = sleepEntries.mapNotNull { it.sleepMinutes?.toDouble() }
                // dashed baseline = trailing 7 non-null sleep nights
                val sleepBaseline = sleepValues.takeLast(7).takeIf { it.isNotEmpty() }?.average()
                val stageNights = sleepEntries.filter {
                    it.sleepMinutes != null &&
                        (it.deepMinutes != null || it.remMinutes != null || it.lightMinutes != null)
                }
                val deepShare = stageNights
                    .map { e ->
                        val total =
                            ((e.lightMinutes ?: 0) + (e.deepMinutes ?: 0) + (e.remMinutes ?: 0))
                                .coerceAtLeast(1)
                        (e.deepMinutes ?: 0).toDouble() / total * 100.0
                    }
                    .takeIf { it.isNotEmpty() }?.average()
                val remShare = stageNights
                    .map { e ->
                        val total =
                            ((e.lightMinutes ?: 0) + (e.deepMinutes ?: 0) + (e.remMinutes ?: 0))
                                .coerceAtLeast(1)
                        (e.remMinutes ?: 0).toDouble() / total * 100.0
                    }
                    .takeIf { it.isNotEmpty() }?.average()

                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionTitle("Sleep")
                        if (sleepValues.isEmpty()) {
                            Text(
                                "No sleep data in this window yet. Connect Health Connect or log sleep in the daily form.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                listOf(30, 90, 365).forEach { d ->
                                    FilterChip(
                                        selected = sleepRange == d,
                                        onClick = { sleepRange = d },
                                        label = { Text(if (d == 365) "1Y" else "${d}d") },
                                    )
                                }
                            }
                            SleepDurationChart(
                                entries = sleepEntries,
                                baselineMinutes = sleepBaseline,
                            )
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                StatTile(
                                    label = "Avg duration",
                                    value = sleepDurationLabel(sleepValues.average()),
                                    icon = Icons.Outlined.Bedtime,
                                    accent = MaterialTheme.colorScheme.secondary,
                                    caption = if (sleepValues.size >= 2) {
                                        "range ${Format.oneDecimal(sleepValues.min() / 60.0)}–" +
                                            "${Format.oneDecimal(sleepValues.max() / 60.0)} h"
                                    } else null,
                                    modifier = Modifier.weight(1f),
                                )
                                StatTile(
                                    label = "Deep ø",
                                    value = deepShare?.let { "${it.roundToInt()}%" } ?: "—",
                                    icon = Icons.Outlined.DarkMode,
                                    accent = MaterialTheme.colorScheme.primary,
                                    caption = "healthy 13–23%",
                                    modifier = Modifier.weight(1f),
                                )
                                StatTile(
                                    label = "REM ø",
                                    value = remShare?.let { "${it.roundToInt()}%" } ?: "—",
                                    icon = Icons.Outlined.RemoveRedEye,
                                    accent = MaterialTheme.colorScheme.tertiary,
                                    caption = "healthy 18–25%",
                                    modifier = Modifier.weight(1f),
                                )
                            }

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    "Stages · last 14 nights",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                SleepStagesChart(entries = sleepEntries, nights = 14)
                            }
                        }
                    }
                }
            }
        }

        // ---- cycling analytics ----
        if (selectedTab == AnalyticsSportTab.CYCLING) {
                val cycling = a.cycling
                if (cycling != null && (cycling.recentRideNpSeries.isNotEmpty() || cycling.totalBikeTss30d > 0 || cycling.bikeFitnessSeries.any { it.load > 0 })) {
                    item(key = "sec-cycling-status") {
                        CyclingStatusCard(cycling = cycling)
                    }
                    item(key = "sec-cycling-pmc") {
                        CyclingPmcCard(cycling = cycling)
                    }
                    item(key = "sec-cycling-volume") {
                        CyclingVolumeCard(cycling = cycling, unit = unit)
                    }
                    item(key = "sec-cycling-zones") {
                        CyclingPowerZoneDistributionCard(zones = cycling.powerZoneDistribution)
                    }
                    item(key = "sec-cycling-recent") {
                        RecentRidesPowerCard(cycling = cycling)
                    }
                } else if (cycling != null) {
                    item(key = "sec-cycling-status") {
                        CyclingStatusCard(cycling = cycling)
                    }
                    item(key = "sec-cycling-zones") {
                        CyclingPowerZoneDistributionCard(zones = cycling.powerZoneDistribution)
                    }
                    item(key = "sec-cycling-empty") {
                        Card(Modifier.fillMaxWidth()) {
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
                                    "Record or sync your rides with Strava to view power metrics, PMC fitness chart, and weekly volume.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                            }
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

private enum class AnalyticsSportTab { COMBINED, RUNNING, CYCLING }

@Composable
private fun CyclingStatusCard(
    cycling: CyclingAnalyticsSummary,
    modifier: Modifier = Modifier,
) {
    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
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
                    caption = "ml/kg/min",
                    modifier = Modifier.weight(1f),
                )
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
                    showAbsolute = true,
                    onToggle = {},
                )
                MetricBarRow(
                    label = "Fatigue (ATL Bike)",
                    color = MaterialTheme.semanticColors.atl,
                    value = cycling.atlBike,
                    max = maxLoad,
                    showAbsolute = true,
                    onToggle = {},
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
private fun CyclingPmcCard(
    cycling: CyclingAnalyticsSummary,
    modifier: Modifier = Modifier,
) {
    var rangeDays by remember { mutableStateOf(90) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }

    Card(modifier.fillMaxWidth()) {
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

    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SectionTitle("Weekly Cycling Volume")
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(
                        selected = !showTss,
                        onClick = { showTss = false },
                        label = { Text(if (unit == DistanceUnit.IMPERIAL) "Miles" else "Km") },
                    )
                    FilterChip(
                        selected = showTss,
                        onClick = { showTss = true },
                        label = { Text("Bike TSS") },
                    )
                }
            }

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
) {
    val totalSec = zones.sumOf { it.seconds }.coerceAtLeast(1)

    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionTitle("7-Zone Coggan Power Distribution")

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

            // Zone details list
            zones.forEachIndexed { i, z ->
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
                    val rangeText = if (z.zone == 7) ">${z.minWatts}W" else "${z.minWatts}–${z.maxWatts}W"
                    Text(
                        rangeText,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(end = 8.dp),
                    )
                    Text(
                        Format.duration(z.seconds.toLong()),
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
    Card(modifier.fillMaxWidth()) {
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
    Column(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle)
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
                if (showAbsolute || max <= 0.0) Format.roundedIntOrDash(value)
                else "${((value / max) * 100).roundToInt()}%",
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

/** Diverging TSB bar: center tick, bar grows right (fresh) or left (fatigued); ±50 TSB = full half. */
@Composable
private fun TsbBar(tsb: Double) {
    val color = com.runflow2.app.domain.model.TsbStatus.from(tsb).themedColor()
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

/** Sleep minutes as "7h 32m" (Format.duration is h:mm:ss for seconds — wrong shape here). */
private fun sleepDurationLabel(minutes: Double): String {
    val total = minutes.roundToInt()
    return "${total / 60}h ${total % 60}m"
}

/**
 * Scrolls so the item with [key] sits at the top of the viewport. Lazy lists
 * only know about composed (visible) items — there is no key-to-index lookup
 * in current Compose — so this walks the list viewport by viewport until the
 * keyed item appears, then lines it up. Cheap here: a handful of frames.
 */
private suspend fun LazyListState.scrollToKeyedItem(key: Any) {
    // Time budget instead of a frame counter: on a cold start the first
    // analytics computation can outlast any fixed number of frames.
    val deadline = System.nanoTime() + 4_000_000_000L
    while (System.nanoTime() < deadline) {
        val info = layoutInfo
        info.visibleItemsInfo.firstOrNull { it.key == key }?.let { target ->
            // final placement can be shifted by later measure passes — settle
            var tries = 0
            while (firstVisibleItemIndex != target.index && tries++ < 5) {
                scrollToItem(target.index, scrollOffset = -24)
                withFrameNanos { }
            }
            return
        }
        // the list may not have had its first measure pass yet — wait, don't give up
        val last = info.visibleItemsInfo.maxByOrNull { it.index }
        if (last == null || info.totalItemsCount == 0) {
            withFrameNanos { }
            continue
        }
        if (last.index >= info.totalItemsCount - 1) return
        // every currently visible index has been checked — skip past them all
        scrollToItem((last.index + 1).coerceAtMost(info.totalItemsCount - 1))
        withFrameNanos { }; withFrameNanos { }
    }
}
