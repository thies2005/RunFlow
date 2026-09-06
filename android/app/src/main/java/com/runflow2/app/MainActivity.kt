package com.runflow2.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.runflow2.app.data.net.StravaAuth
import com.runflow2.app.ui.RunFlowRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as RunFlowApp).container
        // Cold start via a runflow2:// deep link (singleTask keeps warm
        // restarts in onNewIntent instead).
        handleDeepLink(intent, container)
        setContent {
            RunFlowRoot(container = container)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent, (application as RunFlowApp).container)
    }

    private fun handleDeepLink(intent: Intent?, container: AppContainer) {
        val data = intent?.data?.toString() ?: return
        val result = StravaAuth.parseCallback(data)
        container.authStore.offerOAuthResult(result)
    }
}
