@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package com.runflow2.app.ui

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.material.icons.filled.SpaceDashboard
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material.icons.outlined.SpaceDashboard
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ShortNavigationBar
import androidx.compose.material3.ShortNavigationBarItem
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.runflow2.app.AppContainer
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.data.repo.ThemeMode
import com.runflow2.app.recording.RecStatus
import com.runflow2.app.ui.screens.ActivitiesScreen
import com.runflow2.app.ui.screens.ActivityDetailScreen
import com.runflow2.app.ui.screens.AiCoachScreen
import com.runflow2.app.ui.screens.AnalyticsScreen
import com.runflow2.app.ui.screens.AthleteScreen
import com.runflow2.app.ui.screens.DashboardScreen
import com.runflow2.app.ui.screens.DataSourceSetupScreen
import com.runflow2.app.ui.screens.EditProfileScreen
import com.runflow2.app.ui.screens.HrZonesScreen
import com.runflow2.app.ui.screens.LoginScreen
import com.runflow2.app.ui.screens.OnboardingScreen
import com.runflow2.app.ui.screens.PlanScreen
import com.runflow2.app.ui.screens.PlanWizardScreen
import com.runflow2.app.ui.screens.RecordScreen
import com.runflow2.app.ui.screens.SettingsScreen
import com.runflow2.app.ui.screens.StructuredEditorScreen
import com.runflow2.app.ui.theme.RunFlowTheme
import kotlinx.coroutines.launch

object Routes {
    const val ONBOARDING = "onboarding"
    const val DASHBOARD = "dashboard"
    const val PLAN = "plan"
    const val RECORD = "record"
    const val ANALYTICS = "analytics"
    const val ATHLETE = "athlete"
    const val WIZARD = "wizard"
    const val ACTIVITIES = "activities"
    const val SETTINGS = "settings"
    const val LOGIN = "login"
    const val DATA_SOURCE_SETUP = "data_source_setup"
    const val AI_COACH = "ai_coach"
    const val AI_COACH_ACTIVITY = "ai_coach/activity/{activityId}"
    fun aiCoachActivity(activityId: String) = "ai_coach/activity/$activityId"
    const val EDIT_PROFILE = "edit_profile"
    const val HR_ZONES = "hr_zones"
    const val ACTIVITY_DETAIL = "activity/{id}"
    fun activityDetail(id: String) = "activity/$id"
    const val STRUCTURED_EDITOR = "structured-editor/{workoutId}"
    fun structuredEditor(workoutId: String) = "structured-editor/$workoutId"
}

private data class Tab(
    val route: String,
    val label: String,
    val unselectedIcon: ImageVector,
    val selectedIcon: ImageVector,
)

private val tabs = listOf(
    Tab(Routes.DASHBOARD, "Today", Icons.Outlined.SpaceDashboard, Icons.Filled.SpaceDashboard),
    Tab(Routes.PLAN, "Plan", Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth),
    Tab(Routes.RECORD, "Record", Icons.Outlined.RadioButtonChecked, Icons.Filled.RadioButtonChecked),
    Tab(Routes.ANALYTICS, "Analytics", Icons.Outlined.Insights, Icons.Filled.Insights),
    Tab(Routes.ATHLETE, "Athlete", Icons.Outlined.Person, Icons.Filled.Person),
)

private val tabRoutes = tabs.map { it.route }.toSet()

@Composable
fun RunFlowRoot(container: AppContainer) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())

    RunFlowTheme(
        darkTheme = when (settings.themeMode) {
            ThemeMode.SYSTEM -> isSystemInDarkTheme()
            ThemeMode.LIGHT -> false
            ThemeMode.DARK -> true
        },
        dynamicColor = settings.dynamicColor,
        amoledBlack = settings.amoledBlack,
    ) {
        val navController = rememberNavController()
        val backStack by navController.currentBackStackEntryAsState()
        val currentRoute = backStack?.destination?.route

        val snackbarHostState = remember { SnackbarHostState() }
        val pendingCount by container.syncManager.pendingCount.collectAsState(initial = 0)
        val syncStatus by container.syncManager.status.collectAsState()

        LaunchedEffect(syncStatus.lastMessage) {
            val msg = syncStatus.lastMessage
            if (msg != null && (msg.contains("error", ignoreCase = true) || msg.contains("⚠") || msg.contains("failed", ignoreCase = true))) {
                val result = snackbarHostState.showSnackbar(
                    message = "Sync error: $msg",
                    actionLabel = "Retry",
                    duration = SnackbarDuration.Long,
                )
                if (result == SnackbarResult.ActionPerformed) {
                    container.appScope.launch {
                        container.syncManager.syncNow("user-retry")
                    }
                }
            }
        }

        // recording state guards navigation away from the record tab
        val recState by container.recording.state.collectAsState()
        val recording = recState.status != RecStatus.IDLE

        // A Strava OAuth deep link landed while not on the login screen —
        // take the user there so the code exchange can complete.
        val pendingOAuthCode by container.authStore.pendingOAuthCode.collectAsState()
        LaunchedEffect(pendingOAuthCode) {
            if (pendingOAuthCode != null && currentRoute != Routes.LOGIN) {
                navController.navigate(Routes.LOGIN) { launchSingleTop = true }
            }
        }

        val showBottomBar = currentRoute in tabRoutes && !recording

        // Each screen hosts its own Scaffold + TopAppBar, which apply the
        // status-bar inset themselves; the root must not pre-pad as well or
        // the top inset is counted twice. Consuming `padding` ensures child
        // Scaffolds do not re-apply the bottom system navigation bar inset.
        Scaffold(
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            snackbarHost = { SnackbarHost(snackbarHostState) },
            bottomBar = {
                Column {
                    if (pendingCount > 0 && !recording) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.95f))
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Icon(
                                    Icons.Outlined.Sync,
                                    contentDescription = null,
                                    modifier = Modifier.size(13.dp),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Text(
                                    if (syncStatus.running) "Syncing changes…" else "$pendingCount pending sync",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    if (showBottomBar) {
                        ShortNavigationBar(
                            containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        ) {
                            tabs.forEach { tab ->
                                val selected = currentRoute == tab.route
                                ShortNavigationBarItem(
                                    selected = selected,
                                    onClick = {
                                        if (currentRoute == tab.route) return@ShortNavigationBarItem
                                        navController.navigate(tab.route) {
                                            popUpTo(navController.graph.findStartDestination().id)
                                            launchSingleTop = true
                                        }
                                    },
                                    icon = {
                                        Icon(
                                            imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                            contentDescription = tab.label,
                                        )
                                    },
                                    label = {
                                        Text(
                                            text = tab.label,
                                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                        )
                                    },
                                )
                            }
                        }
                    }
                }
            },
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = if (settings.onboardingDone) Routes.DASHBOARD else Routes.ONBOARDING,
                modifier = Modifier
                    .padding(padding)
                    .consumeWindowInsets(padding),
                enterTransition = {
                    val isTabSwitch = initialState.destination.route in tabRoutes &&
                        targetState.destination.route in tabRoutes
                    if (isTabSwitch) {
                        fadeIn(tween(200))
                    } else {
                        fadeIn(tween(220)) + slideIntoContainer(
                            towards = AnimatedContentTransitionScope.SlideDirection.Start,
                            animationSpec = tween(260),
                        )
                    }
                },
                exitTransition = {
                    val isTabSwitch = initialState.destination.route in tabRoutes &&
                        targetState.destination.route in tabRoutes
                    if (isTabSwitch) {
                        fadeOut(tween(150))
                    } else {
                        fadeOut(tween(180)) + slideOutOfContainer(
                            towards = AnimatedContentTransitionScope.SlideDirection.Start,
                            animationSpec = tween(260),
                        )
                    }
                },
                popEnterTransition = {
                    fadeIn(tween(220)) + slideIntoContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(260),
                    )
                },
                popExitTransition = {
                    fadeOut(tween(180)) + slideOutOfContainer(
                        towards = AnimatedContentTransitionScope.SlideDirection.End,
                        animationSpec = tween(260),
                    )
                },
            ) {
                composable(Routes.ONBOARDING) {
                    OnboardingScreen(
                        onFinish = {
                            navController.navigate(Routes.DATA_SOURCE_SETUP) { launchSingleTop = true }
                        },
                    )
                }

                composable(Routes.DATA_SOURCE_SETUP) {
                    DataSourceSetupScreen(
                        container = container,
                        onDone = {
                            container.appScope.launch { container.settings.setOnboardingDone() }
                            if (!settings.onboardingDone) {
                                navController.navigate(Routes.DASHBOARD) {
                                    popUpTo(Routes.ONBOARDING) { inclusive = true }
                                }
                            }
                        },
                        onSignIn = {
                            container.appScope.launch { container.settings.setOnboardingDone() }
                            navController.navigate(Routes.LOGIN) {
                                popUpTo(Routes.ONBOARDING) { inclusive = true }
                                launchSingleTop = true
                            }
                        },
                    )
                }

                composable(Routes.DASHBOARD) {
                    DashboardScreen(
                        container = container,
                        onOpenActivity = { navController.navigate(Routes.activityDetail(it)) },
                        onOpenAnalyticsSection = { section ->
                            container.analyticsTargetSection = section
                            navController.navigate(Routes.ANALYTICS) {
                                launchSingleTop = true
                            }
                        },
                        onStartWorkout = { workoutId ->
                            container.recording.pendingWorkoutId = workoutId
                            navController.navigate(Routes.RECORD) {
                                launchSingleTop = true
                            }
                        },
                        onCreatePlan = { navController.navigate(Routes.WIZARD) },
                        onOpenActivities = { navController.navigate(Routes.ACTIVITIES) },
                        onLogin = { navController.navigate(Routes.LOGIN) },
                    )
                }

                composable(Routes.PLAN) {
                    PlanScreen(
                        container = container,
                        onCreatePlan = { navController.navigate(Routes.WIZARD) },
                        onOpenActivity = { navController.navigate(Routes.activityDetail(it)) },
                        onStartWorkout = { workoutId ->
                            container.recording.pendingWorkoutId = workoutId
                            navController.navigate(Routes.RECORD) { launchSingleTop = true }
                        },
                        onEditIntervals = { workoutId ->
                            navController.navigate(Routes.structuredEditor(workoutId))
                        },
                    )
                }

                composable(Routes.RECORD) {
                    RecordScreen(
                        container = container,
                        onOpenSaved = { id -> navController.navigate(Routes.activityDetail(id)) },
                    )
                }

                composable(Routes.ANALYTICS) {
                    val section = remember {
                        container.analyticsTargetSection.also { container.analyticsTargetSection = null }
                    }
                    AnalyticsScreen(container = container, targetSection = section)
                }

                composable(Routes.ATHLETE) {
                    AthleteScreen(
                        container = container,
                        onEditProfile = { navController.navigate(Routes.EDIT_PROFILE) },
                        onHrZones = { navController.navigate(Routes.HR_ZONES) },
                        onSettings = { navController.navigate(Routes.SETTINGS) },
                        onActivities = { navController.navigate(Routes.ACTIVITIES) },
                        onOpenActivity = { navController.navigate(Routes.activityDetail(it)) },
                        onAiCoach = { navController.navigate(Routes.AI_COACH) },
                        onCreatePlan = { navController.navigate(Routes.WIZARD) },
                    )
                }

                composable(Routes.WIZARD) {
                    PlanWizardScreen(
                        container = container,
                        onDone = {
                            navController.popBackStack()
                        },
                    )
                }

                composable(Routes.ACTIVITIES) {
                    ActivitiesScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onOpen = { navController.navigate(Routes.activityDetail(it)) },
                    )
                }

                composable(Routes.SETTINGS) {
                    SettingsScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onLogin = { navController.navigate(Routes.LOGIN) },
                    )
                }

                composable(Routes.LOGIN) {
                    fun exitLogin() {
                        if (!navController.popBackStack()) {
                            navController.navigate(Routes.DASHBOARD) {
                                popUpTo(Routes.LOGIN) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    }
                    LoginScreen(
                        container = container,
                        onBack = { exitLogin() },
                        onLoggedIn = { exitLogin() },
                    )
                }

                composable(Routes.AI_COACH) {
                    AiCoachScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onLogin = { navController.navigate(Routes.LOGIN) },
                    )
                }

                composable(Routes.AI_COACH_ACTIVITY) { entry ->
                    val id = entry.arguments?.getString("activityId") ?: return@composable
                    AiCoachScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onLogin = { navController.navigate(Routes.LOGIN) },
                        activityId = id,
                    )
                }

                composable(Routes.EDIT_PROFILE) {
                    EditProfileScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(Routes.HR_ZONES) {
                    HrZonesScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(Routes.ACTIVITY_DETAIL) { entry ->
                    val id = entry.arguments?.getString("id") ?: return@composable
                    ActivityDetailScreen(
                        container = container,
                        activityId = id,
                        onBack = { navController.popBackStack() },
                        onDiscuss = { navController.navigate(Routes.aiCoachActivity(it)) },
                    )
                }

                composable(Routes.STRUCTURED_EDITOR) { entry ->
                    val workoutId = entry.arguments?.getString("workoutId") ?: return@composable
                    StructuredEditorScreen(
                        container = container,
                        workoutId = workoutId,
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}
