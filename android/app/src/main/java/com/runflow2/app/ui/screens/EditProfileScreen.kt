package com.runflow2.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.runflow2.app.AppContainer
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ProfileEntity
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    container: AppContainer,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val profile by container.repository.profile.collectAsState(initial = null)
    val p = profile ?: return

    var name by remember(p) { mutableStateOf(p.name) }
    var sex by remember(p) { mutableStateOf(p.sex) }
    var birthYear by remember(p) { mutableStateOf(p.birthYear.toString()) }
    var weight by remember(p) { mutableStateOf(p.weightKg.toString()) }
    var height by remember(p) { mutableStateOf(p.heightCm.toString()) }
    var hrMax by remember(p) { mutableStateOf(p.hrMax.toString()) }
    var hrRest by remember(p) { mutableStateOf(p.hrRest.toString()) }
    var thresholdHr by remember(p) { mutableStateOf(p.thresholdHr.toString()) }
    var thresholdPace by remember(p) { mutableStateOf(Format.pace(p.thresholdPaceSecPerKm.toDouble())) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit profile") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Sex", style = MaterialTheme.typography.titleSmall)
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                listOf("MALE", "FEMALE", "OTHER").forEachIndexed { i, s ->
                    SegmentedButton(
                        selected = sex == s,
                        onClick = { sex = s },
                        shape = SegmentedButtonDefaults.itemShape(i, 3),
                    ) {
                        Text(
                            when (s) {
                                "MALE" -> "Male"
                                "FEMALE" -> "Female"
                                else -> "Other"
                            },
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = birthYear,
                    onValueChange = { birthYear = it.filter(Char::isDigit).take(4) },
                    label = { Text("Birth year") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = it },
                    label = { Text("Weight (kg)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
            }
            OutlinedTextField(
                value = height,
                onValueChange = { height = it },
                label = { Text("Height (cm)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Heart rate", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = hrMax,
                    onValueChange = { hrMax = it.filter(Char::isDigit).take(3) },
                    label = { Text("Max HR") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = hrRest,
                    onValueChange = { hrRest = it.filter(Char::isDigit).take(3) },
                    label = { Text("Resting HR") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
            }
            OutlinedTextField(
                value = thresholdHr,
                onValueChange = { thresholdHr = it.filter(Char::isDigit).take(3) },
                label = { Text("Threshold HR (bpm)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = thresholdPace,
                onValueChange = { thresholdPace = it },
                label = { Text("Threshold pace (m:ss /km)") },
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = {
                    val updated = p.copy(
                        name = name.ifBlank { p.name },
                        sex = sex,
                        birthYear = birthYear.toIntOrNull() ?: p.birthYear,
                        weightKg = weight.toDoubleOrNull() ?: p.weightKg,
                        heightCm = height.toDoubleOrNull() ?: p.heightCm,
                        hrMax = hrMax.toIntOrNull() ?: p.hrMax,
                        hrRest = hrRest.toIntOrNull() ?: p.hrRest,
                        thresholdHr = thresholdHr.toIntOrNull() ?: p.thresholdHr,
                        thresholdPaceSecPerKm = parsePace(thresholdPace) ?: p.thresholdPaceSecPerKm,
                    )
                    scope.launch {
                        container.repository.saveProfile(updated)
                        onBack()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save profile")
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
