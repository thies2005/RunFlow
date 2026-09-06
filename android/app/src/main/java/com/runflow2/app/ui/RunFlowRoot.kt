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
import com.runflow2.app.ui.screens.EditProfileScreen
import com.runflow2.app.ui.screens.HrZonesScreen
import com.runflow2.app.ui.screens.LoginScreen
import com.runflow2.app.ui.screens.OnboardingScreen
import com.runflow2.app.ui.screens.PlanScreen
import com.runflow2.app.ui.screens.PlanWizardScreen
import com.runflow2.app.ui.screens.RecordScreen
import com.runflow2.app.ui.screens.SettingsScreen
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
    const val AI_COACH = "ai_coach"
    const val EDIT_PROFILE = "edit_profile"
    const val HR_ZONES = "hr_zones"
    const val ACTIVITY_DETAIL = "activity/{id}"
    fun activityDetail(id: String) = "activity/$id"
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

        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    NavigationBar {
                        tabs.forEach { tab ->
                            NavigationBarItem(
                                selected = currentRoute == tab.route,
                                onClick = {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
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
                    OnboardingScreen(
                        onDone = {
                            container.appScope.launch { container.settings.setOnboardingDone() }
                            if (!settings.onboardingDone) {
                                navController.navigate(Routes.DASHBOARD) {
                                    popUpTo(Routes.ONBOARDING) { inclusive = true }
                                }
                            }
                        },
                    )
                }

                composable(Routes.DASHBOARD) {
                    DashboardScreen(
                        container = container,
                        onOpenActivity = { navController.navigate(Routes.activityDetail(it)) },
                        onOpenAnalytics = { navController.navigate(Routes.ANALYTICS) },
                        onStartWorkout = { workoutId ->
                            container.recording.pendingWorkoutId = workoutId
                            navController.navigate(Routes.RECORD) {
                                launchSingleTop = true
                            }
                        },
                        onCreatePlan = { navController.navigate(Routes.WIZARD) },
                        onOpenActivities = { navController.navigate(Routes.ACTIVITIES) },
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
                    )
                }

                composable(Routes.RECORD) {
                    RecordScreen(
                        container = container,
                        onOpenSaved = { id -> navController.navigate(Routes.activityDetail(id)) },
                    )
                }

                composable(Routes.ANALYTICS) {
                    AnalyticsScreen(container = container)
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
                    LoginScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onLoggedIn = { navController.popBackStack() },
                    )
                }

                composable(Routes.AI_COACH) {
                    AiCoachScreen(
                        container = container,
                        onBack = { navController.popBackStack() },
                        onLogin = { navController.navigate(Routes.LOGIN) },
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
                    )
                }
            }
        }
    }
}
