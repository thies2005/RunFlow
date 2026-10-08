package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import kotlinx.coroutines.launch

/**
 * Final onboarding step: pick how RunFlow gets its data. Reached from the
 * onboarding carousel; [onDone] completes onboarding into the dashboard,
 * [onSignIn] completes it into the login flow.
 */
@Composable
fun DataSourceSetupScreen(
    container: AppContainer,
    onDone: () -> Unit,
    onSignIn: () -> Unit,
) {
    val hc = container.healthConnect
    val availability = remember { hc.availability() }
    val hcUnavailable =
        availability is com.runflow2.app.data.health.HealthConnectManager.Availability.Unavailable

    /**
     * Offline choice: turn on every Health Connect import and hide the
     * sign-in hints. Writes run on the app scope so navigation (which
     * disposes this screen's composition and its coroutine scopes) can't
     * cancel them midway.
     */
    fun finishOfflineSetup() {
        container.appScope.launch {
            container.settings.setHealthConnectImportEnabled(true)
            container.settings.setHcRestingHrEnabled(true)
            container.settings.setHcHrvEnabled(true)
            container.settings.setHcSleepEnabled(true)
            container.settings.setOfflineModeChosen(true)
        }
        onDone()
    }

    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.health.connect.client.PermissionController.createRequestPermissionResultContract(),
    ) { _ ->
        // Granted or not — continue either way; imports simply no-op
        // until the permissions are granted.
        finishOfflineSetup()
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            "Choose your data sources",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "RunFlow works fully offline, or signs in to sync with the web. You can change this any time in Settings → Data sources.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))

        Card(Modifier.fillMaxWidth()) {
            Column(
                Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    "Offline with Health Connect",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "Keep everything on this phone: activities and health metrics are read on-device from Health Connect — no account needed.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (hcUnavailable) {
                    Text(
                        "Health Connect isn't available on this device — runs can still be recorded with RunFlow.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.tertiary,
                    )
                }
                Button(
                    onClick = {
                        if (hcUnavailable) finishOfflineSetup() else permissionLauncher.launch(hc.permissions)
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Set up offline") }
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(
                Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    "Sign in · Strava & cloud",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "Sync runs and health metrics through your RunFlow account, import activities from Strava, and get training plans and the AI coach on the server.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = onSignIn,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Sign in") }
            }
        }

        TextButton(onClick = onDone) { Text("Decide later") }
        Spacer(Modifier.height(24.dp))
    }
}
