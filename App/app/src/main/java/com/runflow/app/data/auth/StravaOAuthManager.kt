package com.runflow.app.data.auth

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.browser.customtabs.CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION
import com.runflow.app.BuildConfig
import dagger.hilt.android.qualifiers.ActivityContext
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import kotlin.coroutines.resume

@Singleton
class StravaOAuthManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val clientId = BuildConfig.STRAVA_CLIENT_ID
    
    // Use server callback URL - server will redirect to mobile app via deep link
    private val serverCallbackUrl = "${BuildConfig.API_BASE_URL}auth/strava/callback"
    
    // Deep link scheme/host for receiving redirects from the server
    private val appRedirectScheme = BuildConfig.STRAVA_REDIRECT_SCHEME
    private val appRedirectHost = BuildConfig.STRAVA_REDIRECT_HOST

    private var pendingAuthResult: ((Result<String>) -> Unit)? = null

    /**
     * Check if Chrome Custom Tabs is available
     */
    private fun isChromeCustomTabsAvailable(): Boolean {
        val pm = context.packageManager
        val intent = Intent(ACTION_CUSTOM_TABS_CONNECTION)
        val list = pm.queryIntentServices(intent, 0)
        return list.isNotEmpty()
    }

    /**
     * Launch Strava OAuth flow using Chrome Custom Tabs
     */
    fun launchOAuthFlow(activity: Activity, callback: (Result<String>) -> Unit) {
        pendingAuthResult = callback

        val authUrl = buildStravaAuthUrl()

        if (isChromeCustomTabsAvailable()) {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .setShowTitle(true)
                .build()

            try {
                customTabsIntent.launchUrl(activity, android.net.Uri.parse(authUrl))
            } catch (e: Exception) {
                // Fallback to regular browser if Custom Tabs fails
                openInExternalBrowser(activity, authUrl)
            }
        } else {
            openInExternalBrowser(activity, authUrl)
        }
    }

    /**
     * Handle the OAuth callback from deep link
     */
    fun handleOAuthCallback(intent: Intent?): Boolean {
        val code = extractCodeFromIntent(intent) ?: return false

        pendingAuthResult?.invoke(Result.success(code))
        pendingAuthResult = null
        return true
    }

    /**
     * Cancel the pending OAuth flow
     */
    fun cancelOAuthFlow() {
        pendingAuthResult?.invoke(Result.failure(AuthException("OAuth flow cancelled")))
        pendingAuthResult = null
    }

    private fun buildStravaAuthUrl(): String {
        // Generate a unique state with platform identifier
        // The server will parse this to know to redirect to the mobile app
        val state = "android_${System.currentTimeMillis()}"
        
        // URL Encode parameters to handle special characters (:, /, etc.)
        val encodedRedirectUri = URLEncoder.encode(serverCallbackUrl, StandardCharsets.UTF_8.toString())
        val encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8.toString())
        val encodedScope = URLEncoder.encode("activity:read_all,activity:write,read,read_all,profile:read_all,profile:write", StandardCharsets.UTF_8.toString())
        
        return "https://www.strava.com/oauth/authorize?" +
                "client_id=$clientId" +
                "&redirect_uri=$encodedRedirectUri" +
                "&response_type=code" +
                "&approval_prompt=auto" +
                "&scope=$encodedScope" +
                "&state=$encodedState"
    }

    private fun openInExternalBrowser(activity: Activity, url: String) {
        val intent = Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
        activity.startActivity(intent)
    }

    private fun extractCodeFromIntent(intent: Intent?): String? {
        if (intent?.data == null) return null
        val data = intent.data!!

        // Verify this is our deep link callback from the server
        if (data.scheme != appRedirectScheme || data.host != appRedirectHost) {
            return null
        }

        // Check for errors from the server
        val error = data.getQueryParameter("error")
        if (error != null) {
            pendingAuthResult?.invoke(Result.failure(AuthException(error)))
            pendingAuthResult = null
            return null
        }

        return data.getQueryParameter("code")
    }

    companion object {
        const val OAUTH_REQUEST_CODE = 1001
    }
}

class AuthException(message: String) : Exception(message)
