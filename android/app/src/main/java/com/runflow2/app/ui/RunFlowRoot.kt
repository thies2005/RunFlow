package com.runflow2.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.collectAsState
import com.runflow2.app.AppContainer
import com.runflow2.app.data.repo.AppSettings
import com.runflow2.app.recording.RecStatus
import com.runflow2.app.ui.screens.ActivityDetailScreen
import com.runflow2.app.ui.screens.ActivitiesScreen
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

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.DASHBOARD, "Dashboard", Icons.Outlined.Insights),
    Tab(Routes.PLAN, "Plan", Icons.Outlined.CalendarMonth),
    Tab(Routes.RECORD, "Record", Icons.Outlined.RadioButtonChecked),
    Tab(Routes.ANALYTICS, "Analytics", Icons.Outlined.DirectionsRun),
    Tab(Routes.ATHLETE, "Athlete", Icons.Outlined.Person),
)

@Composable
fun RunFlowRoot(container: AppContainer) {
    val settings by container.settings.settings.collectAsState(initial = AppSettings())

    RunFlowTheme(
        darkTheme = when (settings.themeMode) {
            com.runflow2.app.data.repo.ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
            com.runflow2.app.data.repo.ThemeMode.LIGHT -> false
            com.runflow2.app.data.repo.ThemeMode.DARK -> true
        },
        dynamicColor = settings.dynamicColor,
    ) {
        val navController = rememberNavController()
        val backStack by navController.currentBackStackEntryAsState()
        val currentRoute = backStack?.destination?.route

        // recording state guards navigation away from the record tab
        val recState by container.recording.state.collectAsState()
        val recording = recState.status != RecStatus.IDLE

        // A Strava OAuth deep link landed while not on the login screen —
        // take the user there so the code exchange can complete.
        val pendingOAuthCode by container.authStore.pendingOAuthCode.collectAsState()
        androidx.compose.runtime.LaunchedEffect(pendingOAuthCode) {
            if (pendingOAuthCode != null && currentRoute != Routes.LOGIN) {
                navController.navigate(Routes.LOGIN) { launchSingleTop = true }
            }
        }

        val showBottomBar = currentRoute in tabs.map { it.route } && !recording

        // Each screen hosts its own Scaffold + TopAppBar, which apply the
        // status-bar inset themselves; the root must not pre-pad as well or
        // the top inset is counted twice.
        Scaffold(
            contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0, 0, 0, 0),
            bottomBar = {
                if (showBottomBar) {
                    NavigationBar {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = currentRoute == tab.route,
                                onClick = {
                                    // Already there: navigating would pop and
                                    // re-push around the start destination and
                                    // can strand the UI on the wrong screen.
                                    if (currentRoute == tab.route) return@NavigationBarItem
                                    // No saveState/restoreState here: this
                                    // graph's start destination is itself a
                                    // tab, and the saved-state restoration
                                    // misfires when the tab is re-entered over
                                    // a screen that was pushed onto it (the
                                    // dashboard's analytics cards) — the UI
                                    // strands on the old screen or worse.
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id)
                                        launchSingleTop = true
                                    }
                                },
                                icon = { Icon(tab.icon, contentDescription = tab.label) },
                                label = { Text(tab.label) },
                            )
                        }
                    }
                }
            },
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = if (settings.onboardingDone) Routes.DASHBOARD else Routes.ONBOARDING,
                modifier = Modifier.padding(padding),
            ) {
                composable(Routes.ONBOARDING) {
                    // The carousel no longer finishes onboarding itself —
                    // both exits lead to the data-source setup step.
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
                        // Cards deep-link to a specific analytics section.
                        // launchSingleTop only: the stack shape stays exactly
                        // [dashboard, analytics] so tab navigation behaves the
                        // same as after a tab tap (see tab onClick).
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
                    // One-shot section target set by dashboard cards before
                    // navigating; consumed (and cleared) exactly once.
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
                    // Entered from the data-source setup, login is the only
                    // back-stack entry — popping is impossible, so back and
                    // logged-in both fall through to the dashboard instead
                    // (onboardingDone is already set; the login nudge takes
                    // over from there).
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
