package com.runflow.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.data.auth.StravaOAuthManager
import com.runflow.app.ui.navigation.Screen
import com.runflow.app.ui.screens.activities.ActivitiesScreen
import com.runflow.app.ui.screens.activities.ActivityDetailScreen
import com.runflow.app.ui.screens.analytics.AnalyticsScreen
import com.runflow.app.ui.screens.auth.OnboardingScreen
import com.runflow.app.ui.screens.auth.WelcomeScreen
import com.runflow.app.ui.screens.dashboard.DashboardScreen
import com.runflow.app.ui.screens.plan.PlanScreen
import com.runflow.app.ui.screens.profile.ProfileScreen
import com.runflow.app.ui.screens.MainScreen
import com.runflow.app.ui.theme.RunFlowTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var stravaOAuthManager: StravaOAuthManager

    private var oauthCallbackResult: ((Result<String>) -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if this intent is from OAuth callback
        handleOAuthIntent(intent)

        setContent {
            RunFlowTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    RunFlowAppNav()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleOAuthIntent(intent)
    }

    private fun handleOAuthIntent(intent: Intent?) {
        if (stravaOAuthManager.handleOAuthCallback(intent)) {
            // Callback was handled, OAuth result will be delivered via the callback
        }
    }

    fun setOAuthCallback(callback: (Result<String>) -> Unit) {
        this.oauthCallbackResult = callback
    }

    fun clearOAuthCallback() {
        this.oauthCallbackResult = null
    }

    fun deliverOAuthResult(result: Result<String>) {
        oauthCallbackResult?.invoke(result)
        oauthCallbackResult = null
    }

    fun launchStravaOAuth(callback: (Result<String>) -> Unit) {
        this.oauthCallbackResult = callback
        stravaOAuthManager.launchOAuthFlow(this) { result ->
            deliverOAuthResult(result)
        }
    }
}

@Composable
fun RunFlowAppNav() {
    val navController = rememberNavController()
    val activity = androidx.compose.ui.platform.LocalContext.current as? MainActivity
    val authViewModel: com.runflow.app.ui.screens.auth.AuthViewModel = hiltViewModel()
    val uiState by authViewModel.uiState.collectAsState()

    // OAuth callback handling
    var oauthResult by rememberSaveable { mutableStateOf<String?>(null) }
    var oauthError by rememberSaveable { mutableStateOf<String?>(null) }

    // Listen for OAuth results from MainActivity
    androidx.lifecycle.compose.LifecycleEventEffect(androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
        activity?.setOAuthCallback { result ->
            result.fold(
                onSuccess = { code -> oauthResult = code },
                onFailure = { error -> oauthError = error.message }
            )
        }
    }

    // Auto-login/logout check
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated) {
            navController.navigate(Screen.Dashboard.route) {
                popUpTo(Screen.Welcome.route) { inclusive = true }
            }
        } else {
            // User is not authenticated (or logged out), reset to Welcome
            navController.navigate(Screen.Welcome.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Welcome.route
    ) {
        // Welcome Screen
        composable(Screen.Welcome.route) {
            WelcomeScreen(
                onGetStartedClick = {
                    if (uiState.isAuthenticated) {
                        navController.navigate(Screen.Dashboard.route)
                    } else {
                        navController.navigate(Screen.Onboarding.route)
                    }
                }
            )
        }

        // Onboarding Screen (Auth)
        composable(Screen.Onboarding.route) {
            val coroutineScope = rememberCoroutineScope()

            OnboardingScreen(
                onLaunchStravaOAuth = {
                    activity?.launchStravaOAuth { result ->
                        result.fold(
                            onSuccess = { authCode ->
                                // Exchange the auth code for tokens
                                coroutineScope.launch {
                                    val loginResult = authViewModel.handleAuthCode(authCode)
                                    loginResult.fold(
                                        onSuccess = {
                                            // Navigate to dashboard on success
                                            navController.navigate(Screen.Dashboard.route) {
                                                popUpTo(Screen.Welcome.route) { inclusive = true }
                                            }
                                        },
                                        onFailure = { error ->
                                            oauthError = error.message ?: "Login failed"
                                        }
                                    )
                                }
                            },
                            onFailure = { error ->
                                oauthError = error.message
                            }
                        )
                    }
                },
                onLoginSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Welcome.route) { inclusive = true }
                    }
                },
                oauthError = oauthError,
                clearOAuthError = { oauthError = null }
            )
        }

        // Main Screen with Bottom Navigation (Dashboard, Activities, Plan, Analytics)
        composable(Screen.Dashboard.route) {
            MainScreen(
                navController = navController,
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onNavigateToActivityDetail = { activityId ->
                    navController.navigate(Screen.ActivityDetail.createRoute(activityId))
                }
            )
        }

        // Activity Detail Screen
        composable(
            route = Screen.ActivityDetail.route,
            arguments = listOf(navArgument("activityId") { type = NavType.StringType })
        ) {
            ActivityDetailScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Profile Screen
        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack = {
                    navController.popBackStack()
                    navController.navigate(Screen.Welcome.route) {
                        popUpTo(0)
                    }
                }
            )
        }
    }
}
