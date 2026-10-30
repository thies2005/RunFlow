package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsBike
import androidx.compose.material.icons.automirrored.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.screens.analytics.CyclingAnalyticsTab
import com.runflow2.app.ui.screens.analytics.OverviewAnalyticsTab
import com.runflow2.app.ui.screens.analytics.RecoveryAnalyticsTab
import com.runflow2.app.ui.screens.analytics.RunningAnalyticsTab

enum class AnalyticsTab {
    OVERVIEW,
    RUNNING,
    CYCLING,
    RECOVERY,
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnalyticsScreen(
    container: AppContainer,
    targetSection: String? = null,
    onOpenZones: () -> Unit = {},
) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())
    val unit = if (settings.useImperial) DistanceUnit.IMPERIAL else DistanceUnit.METRIC

    val activities by container.repository.activities.collectAsState(initial = emptyList())
    val analytics by produceState<AnalyticsBundle?>(null, activities) {
        value = container.repository.analytics(365)
    }

    var selectedTab by rememberSaveable { mutableStateOf(AnalyticsTab.OVERVIEW) }
    val scrollState = rememberScrollState()
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()

    // Handle deep linking from dashboard cards
    LaunchedEffect(targetSection, analytics) {
        when (targetSection) {
            "form" -> {
                selectedTab = AnalyticsTab.OVERVIEW
                scrollState.scrollTo(0)
            }
            "recovery" -> {
                selectedTab = AnalyticsTab.RECOVERY
                scrollState.scrollTo(0)
            }
            "volume" -> {
                selectedTab = AnalyticsTab.RUNNING
                scrollState.scrollTo(0)
            }
        }
    }

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
                CircularProgressIndicator()
            }
        }
        return
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // ---- 4-Tab Top Segment Selector ----
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier.fillMaxWidth(),
            ) {
                SegmentedButton(
                    selected = selectedTab == AnalyticsTab.OVERVIEW,
                    onClick = { selectedTab = AnalyticsTab.OVERVIEW },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 4),
                    icon = {
                        Icon(
                            Icons.Outlined.Insights,
                            contentDescription = null,
                            modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                        )
                    },
                    label = { Text("Overview") },
                )
                SegmentedButton(
                    selected = selectedTab == AnalyticsTab.RUNNING,
                    onClick = { selectedTab = AnalyticsTab.RUNNING },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 4),
                    icon = {
                        Icon(
                            Icons.AutoMirrored.Outlined.DirectionsRun,
                            contentDescription = null,
                            modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                        )
                    },
                    label = { Text("Run") },
                )
                SegmentedButton(
                    selected = selectedTab == AnalyticsTab.CYCLING,
                    onClick = { selectedTab = AnalyticsTab.CYCLING },
                    shape = SegmentedButtonDefaults.itemShape(index = 2, count = 4),
                    icon = {
                        Icon(
                            Icons.AutoMirrored.Outlined.DirectionsBike,
                            contentDescription = null,
                            modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                        )
                    },
                    label = { Text("Bike") },
                )
                SegmentedButton(
                    selected = selectedTab == AnalyticsTab.RECOVERY,
                    onClick = { selectedTab = AnalyticsTab.RECOVERY },
                    shape = SegmentedButtonDefaults.itemShape(index = 3, count = 4),
                    icon = {
                        Icon(
                            Icons.Outlined.Favorite,
                            contentDescription = null,
                            modifier = Modifier.size(SegmentedButtonDefaults.IconSize),
                        )
                    },
                    label = { Text("Recovery") },
                )
            }

            // ---- Tab Content ----
            when (selectedTab) {
                AnalyticsTab.OVERVIEW -> {
                    OverviewAnalyticsTab(
                        bundle = a,
                        activities = activities,
                        unit = unit,
                        onOpenZones = onOpenZones,
                    )
                }
                AnalyticsTab.RUNNING -> {
                    RunningAnalyticsTab(
                        bundle = a,
                        unit = unit,
                        onOpenZones = onOpenZones,
                    )
                }
                AnalyticsTab.CYCLING -> {
                    CyclingAnalyticsTab(
                        bundle = a,
                        unit = unit,
                        onOpenZones = onOpenZones,
                    )
                }
                AnalyticsTab.RECOVERY -> {
                    RecoveryAnalyticsTab(
                        container = container,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
