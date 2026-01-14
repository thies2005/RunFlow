package com.runflow.app.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.automirrored.outlined.DirectionsRun
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.runflow.app.ui.navigation.Screen
import com.runflow.app.ui.screens.activities.ActivitiesScreen
import com.runflow.app.ui.screens.analytics.AnalyticsScreen
import com.runflow.app.ui.screens.dashboard.DashboardScreen
import com.runflow.app.ui.screens.plan.PlanScreen
import kotlinx.coroutines.launch

/**
 * Main navigation items for the bottom bar.
 */
enum class MainNavItem(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val route: String
) {
    HOME("Home", Icons.Filled.Home, Icons.Outlined.Home, Screen.Dashboard.route),
    ACTIVITIES("Activities", Icons.AutoMirrored.Filled.DirectionsRun, Icons.AutoMirrored.Outlined.DirectionsRun, Screen.Activities.route),
    PLAN("Plan", Icons.Filled.CalendarMonth, Icons.Outlined.CalendarMonth, Screen.Plan.route),
    ANALYTICS("Analytics", Icons.Filled.Analytics, Icons.Outlined.Analytics, Screen.Analytics.route)
}

/**
 * Main screen with bottom navigation bar and swipe support between tabs.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MainScreen(
    navController: NavController,
    onNavigateToProfile: () -> Unit,
    onNavigateToActivityDetail: (String) -> Unit,
    planViewModel: com.runflow.app.ui.screens.plan.PlanViewModel = hiltViewModel()
) {
    val pagerState = rememberPagerState(initialPage = 0) { MainNavItem.entries.size }
    val coroutineScope = rememberCoroutineScope()
    
    Scaffold(
        bottomBar = {
            NavigationBar {
                MainNavItem.entries.forEachIndexed { index, item ->
                    NavigationBarItem(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(index)
                                // If switching to Plan, optionally reset to today if coming from another tab?
                                // User feedback suggests they might get lost, but standard behavior implies state retention.
                                // However, explicit navigation from Dashboard ("Today's Workout") MUST reset date.
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = if (pagerState.currentPage == index) {
                                    item.selectedIcon
                                } else {
                                    item.unselectedIcon
                                },
                                contentDescription = item.label
                            )
                        },
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            userScrollEnabled = true
        ) { page ->
            when (MainNavItem.entries[page]) {
                MainNavItem.HOME -> {
                    DashboardScreen(
                        onNavigateToActivities = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.ACTIVITIES.ordinal)
                            }
                        },
                        onNavigateToPlan = {
                            // When navigating from "Today's Workout", explicitly jump to today
                            planViewModel.selectDate(java.time.LocalDate.now())
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.PLAN.ordinal)
                            }
                        },
                        onNavigateToAnalytics = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.ANALYTICS.ordinal)
                            }
                        },
                        onNavigateToProfile = onNavigateToProfile,
                        onNavigateToActivityDetail = onNavigateToActivityDetail
                    )
                }
                MainNavItem.ACTIVITIES -> {
                    ActivitiesScreen(
                        onActivityClick = onNavigateToActivityDetail,
                        onNavigateBack = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.HOME.ordinal)
                            }
                        }
                    )
                }
                MainNavItem.PLAN -> {
                    PlanScreen(
                        viewModel = planViewModel,
                        onNavigateBack = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.HOME.ordinal)
                            }
                        }
                    )
                }
                MainNavItem.ANALYTICS -> {
                    AnalyticsScreen(
                        onNavigateBack = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(MainNavItem.HOME.ordinal)
                            }
                        }
                    )
                }
            }
        }
    }
}
