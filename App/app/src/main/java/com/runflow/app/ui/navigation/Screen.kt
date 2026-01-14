package com.runflow.app.ui.navigation

sealed class Screen(val route: String) {
    // Auth Flow
    object Welcome : Screen("welcome")
    object Onboarding : Screen("onboarding")
    object Login : Screen("login")

    // Main Tabs
    object Dashboard : Screen("dashboard")
    object Activities : Screen("activities")
    object Plan : Screen("plan")
    object Analytics : Screen("analytics")
    object Profile : Screen("profile")

    // Detail Screens
    object ActivityDetail : Screen("activity/{activityId}") {
        fun createRoute(activityId: String) = "activity/$activityId"
    }

    // Legacy (to be removed)
    object PlanCreation : Screen("plan_creation")
    object Settings : Screen("settings")
}
