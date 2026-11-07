package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
    fun finishOfflineSetup(granted: Set<String> = emptySet()) {
        container.appScope.launch {
            if (granted.any { it in hc.permissions }) container.settings.observeHealthConnectGrant()
            container.settings.setHealthConnectImportEnabled(androidx.health.connect.client.permission.HealthPermission.getReadPermission(androidx.health.connect.client.records.ExerciseSessionRecord::class) in granted)
            container.settings.setHcRestingHrEnabled(androidx.health.connect.client.permission.HealthPermission.getReadPermission(androidx.health.connect.client.records.RestingHeartRateRecord::class) in granted)
            container.settings.setHcHrvEnabled(androidx.health.connect.client.permission.HealthPermission.getReadPermission(androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord::class) in granted)
            container.settings.setHcSleepEnabled(androidx.health.connect.client.permission.HealthPermission.getReadPermission(androidx.health.connect.client.records.SleepSessionRecord::class) in granted)
            container.settings.setOfflineModeChosen(true)
        }
        onDone()
    }

    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.health.connect.client.PermissionController.createRequestPermissionResultContract(),
    ) { granted -> finishOfflineSetup(granted) }

    Scaffold { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding)
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
                "Training plans and recording work on this phone. You can optionally connect Health Connect or your own server.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
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

            Spacer(Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                ),
            ) {
                Column(
                    Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        "Optional self-hosted server",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        "Connect your own RunFlow server for optional sync, Strava and AI coach. Training plans already work locally.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = onSignIn,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Configure server") }
                }
            }

            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onDone) { Text("Decide later") }
            Spacer(Modifier.height(24.dp))
        }
    }
}
