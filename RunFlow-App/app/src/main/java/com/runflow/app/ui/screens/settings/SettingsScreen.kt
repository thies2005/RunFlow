package com.runflow.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.ui.screens.auth.AuthViewModel

@Composable
fun SettingsScreen(
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val notificationsEnabled by authViewModel.notificationsEnabled.collectAsState(initial = true)
    val syncNotifications by authViewModel.syncNotifications.collectAsState(initial = true)

    Column(modifier = Modifier.padding(16.dp)) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(24.dp))

        Text("Notifications", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Daily Workout Reminders")
            Switch(
                checked = notificationsEnabled,
                onCheckedChange = { authViewModel.setNotificationsEnabled(it) }
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Sync Completion Updates")
            Switch(
                checked = syncNotifications,
                onCheckedChange = { authViewModel.setSyncNotificationsEnabled(it) }
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = { authViewModel.logout() },
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
        ) {
            Text("Logout")
        }
    }
}
