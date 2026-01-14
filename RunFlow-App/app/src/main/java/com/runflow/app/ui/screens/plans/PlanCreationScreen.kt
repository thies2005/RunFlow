package com.runflow.app.ui.screens.plans

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.ui.screens.plan.PlanViewModel

@Composable
fun PlanCreationScreen(
    onPlanCreated: () -> Unit,
    viewModel: PlanCreationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Auto-navigate if plan created - using LaunchedEffect to prevent multiple calls
    LaunchedEffect(uiState.planCreated) {
        if (uiState.planCreated) {
            onPlanCreated()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("Create New Plan", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(24.dp))
        
        Text("Select Race Distance", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))
        
        val distances = listOf("5K", "10K", "Half Marathon", "Marathon")
        distances.forEach { distance ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = (uiState.selectedDistance == distance),
                        onClick = { viewModel.onRaceDistanceSelected(distance) }
                    )
                    .padding(vertical = 12.dp)
            ) {
                RadioButton(
                    selected = (uiState.selectedDistance == distance),
                    onClick = { viewModel.onRaceDistanceSelected(distance) }
                )
                Text(
                    text = distance,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(start = 16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        Text("Target Time (Optional)", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = uiState.targetTime,
            onValueChange = { viewModel.onTargetTimeChanged(it) },
            label = { Text("e.g. 1:45:00") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.weight(1f))
        Button(
            onClick = { viewModel.createPlan() },
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isLoading && uiState.selectedDistance != null
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Generate Plan")
            }
        }
    }
}
