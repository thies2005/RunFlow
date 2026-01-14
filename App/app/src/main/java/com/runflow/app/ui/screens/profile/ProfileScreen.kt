package com.runflow.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.data.model.Sex

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        if (uiState !is ProfileUiState.Success) {
            viewModel.loadProfile()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is ProfileUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is ProfileUiState.Success -> {
                ProfileContent(
                    profile = state.profile,
                    onLogout = { viewModel.logout() },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    recentActivities = state.recentActivities,
                    onSave = { name, sex, birthDate, hrMax, hrRest, weight, height,
                                hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max,
                                thresholdHr, thresholdPace, vdotCorrection ->
                        viewModel.updateProfile(name, sex, birthDate, hrMax, hrRest, weight, height,
                            hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max,
                            thresholdHr, thresholdPace, vdotCorrection)
                    }
                )
            }
            is ProfileUiState.Saving -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        CircularProgressIndicator()
                        Text("Saving...")
                    }
                }
            }
            is ProfileUiState.LoggedOut -> {
                // Navigation will be handled by parent
            }
            is ProfileUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.error)
                        Text("Error: ${state.message}")
                        Button(onClick = { viewModel.loadProfile() }) {
                            Text("Retry")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileContent(
    profile: com.runflow.app.data.model.UserProfile,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    recentActivities: List<com.runflow.app.data.model.Activity> = emptyList(),
    onSave: (
        name: String?, sex: Sex?, birthDate: String?, hrMax: Int?, hrRest: Int?,
        weight: Float?, height: Float?, hrZone1Max: Int?, hrZone2Max: Int?,
        hrZone3Max: Int?, hrZone4Max: Int?, hrZone5Max: Int?, hrZone6Max: Int?,
        thresholdHr: Int?, thresholdPace: Int?, vdotCorrection: Float?
    ) -> Unit
) {
    var name by remember { mutableStateOf(profile.name ?: "") }
    var sex by remember { mutableStateOf(profile.sex) }
    var birthDate by remember { mutableStateOf(profile.birthDate ?: "") }
    var hrMax by remember { mutableStateOf(profile.hrMax?.toString() ?: "") }
    var hrRest by remember { mutableStateOf(profile.hrRest?.toString() ?: "") }
    var weight by remember { mutableStateOf(profile.weight?.toString() ?: "") }
    var height by remember { mutableStateOf(profile.height?.toString() ?: "") }
    
    var thresholdHr by remember { mutableStateOf(profile.thresholdHr?.toString() ?: "") }
    
    // Threshold Pace split into Min/Sec
    val initialPaceSeconds = profile.thresholdPace ?: 0
    var thresholdPaceMin by remember { mutableStateOf(if (initialPaceSeconds > 0) (initialPaceSeconds / 60).toString() else "") }
    var thresholdPaceSec by remember { mutableStateOf(if (initialPaceSeconds > 0) (initialPaceSeconds % 60).toString() else "") }
    var hrZone1Max by remember { mutableStateOf(profile.hrZone1Max.toString()) }
    var hrZone2Max by remember { mutableStateOf(profile.hrZone2Max.toString()) }
    var hrZone3Max by remember { mutableStateOf(profile.hrZone3Max.toString()) }
    var hrZone4Max by remember { mutableStateOf(profile.hrZone4Max.toString()) }
    var hrZone5Max by remember { mutableStateOf(profile.hrZone5Max.toString()) }
    var hrZone6Max by remember { mutableStateOf(profile.hrZone6Max.toString()) }
    
    var vdotCorrection by remember { mutableStateOf(profile.vdotCorrectionFactor.toString()) }

    var showLogoutDialog by remember { mutableStateOf(false) }
    var showCalibrationDialog by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }

    // Date Picker State
    val datePickerState = rememberDatePickerState()
    
    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val formatter = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                            birthDate = formatter.format(java.util.Date(millis))
                        }
                        showDatePicker = false
                    }
                ) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancel") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // Auto-calculate zones logic
    fun calculateZones(threshold: Int) {
        if (threshold > 0) {
            hrZone1Max = (threshold * 0.75).toInt().toString()
            hrZone2Max = (threshold * 0.87).toInt().toString()
            hrZone3Max = (threshold * 0.94).toInt().toString()
            hrZone4Max = (threshold * 1.00).toInt().toString()
            hrZone5Max = (threshold * 1.05).toInt().toString()
            hrZone6Max = (threshold * 1.10).toInt().toString()
        }
    }

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Profile Header
        ProfileHeader(profile)

        // Personal Info Section
        SectionCard(title = "Personal Information") {
            ProfileTextField(
                value = name,
                onValueChange = { name = it },
                label = "Name",
                icon = Icons.Default.Person
            )

            SexDropdown(
                selectedSex = sex,
                onSexSelected = { sex = it }
            )

             // Date Picker Field
            OutlinedTextField(
                value = birthDate,
                onValueChange = {},
                readOnly = true,
                label = { Text("Birth Date (YYYY-MM-DD)") },
                leadingIcon = { Icon(Icons.Default.Cake, null) },
                trailingIcon = {
                    IconButton(onClick = { showDatePicker = true }) {
                        Icon(Icons.Default.DateRange, null)
                    }
                },
                modifier = Modifier.fillMaxWidth().clickable { showDatePicker = true },
                singleLine = true
            )
        }

        // Physical Stats Section
        SectionCard(title = "Physical Stats") {
            ProfileTextField(
                value = weight,
                onValueChange = { weight = it },
                label = "Weight (kg)",
                icon = Icons.Default.FitnessCenter,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
            )

            ProfileTextField(
                value = height,
                onValueChange = { height = it },
                label = "Height (cm)",
                icon = Icons.Default.Height,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )
        }

        // Heart Rate Section
        SectionCard(title = "Heart Rate Zones") {
            ProfileTextField(
                value = hrMax,
                onValueChange = { hrMax = it },
                label = "Max Heart Rate (bpm)",
                icon = Icons.Default.Favorite,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )

            ProfileTextField(
                value = hrRest,
                onValueChange = { hrRest = it },
                label = "Resting Heart Rate (bpm)",
                icon = Icons.Default.FavoriteBorder,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Training Zones",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )
            
            // Threshold Input with Auto-Calc
            OutlinedTextField(
                value = thresholdHr,
                onValueChange = { 
                    thresholdHr = it
                    it.toIntOrNull()?.let { input -> calculateZones(input) }
                },
                label = { Text("Threshold Heart Rate (LTHR)") },
                leadingIcon = { Icon(Icons.Default.Speed, null) },
                supportingText = { Text("Enter LTHR to auto-calculate zones") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                singleLine = true
            )

            // Threshold Pace Input (Min:Sec)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = thresholdPaceMin,
                    onValueChange = { thresholdPaceMin = it },
                    label = { Text("Pace (min)") },
                    leadingIcon = { Icon(Icons.Default.Timer, null) },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = thresholdPaceSec,
                    onValueChange = { thresholdPaceSec = it },
                    label = { Text("Pace (sec)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    singleLine = true
                )
            }
            Text(
                text = "Functional Threshold Pace (approx 1h race pace)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 16.dp, top = 4.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(modifier = Modifier.weight(1f)) {
                    ProfileTextField(
                        value = hrZone1Max,
                        onValueChange = { hrZone1Max = it },
                        label = "Z1 (<75%) Max",
                        icon = Icons.Default.LooksOne,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                     ProfileTextField(
                        value = hrZone2Max,
                        onValueChange = { hrZone2Max = it },
                        label = "Z2 (76-87%) Max",
                        icon = Icons.Default.LooksTwo,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(modifier = Modifier.weight(1f)) {
                    ProfileTextField(
                        value = hrZone3Max,
                        onValueChange = { hrZone3Max = it },
                        label = "Z3 (88-94%) Max",
                        icon = Icons.Default.Looks3,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                     ProfileTextField(
                        value = hrZone4Max,
                        onValueChange = { hrZone4Max = it },
                        label = "Z4 (95-100%) Max",
                        icon = Icons.Default.Looks4,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
            }
            
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(modifier = Modifier.weight(1f)) {
                    ProfileTextField(
                        value = hrZone5Max,
                        onValueChange = { hrZone5Max = it },
                        label = "Z5 (101-105%) Max",
                        icon = Icons.Default.Looks5,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                     ProfileTextField(
                        value = hrZone6Max,
                        onValueChange = { hrZone6Max = it },
                        label = "Z6 (106-110%) Max",
                        icon = Icons.Default.Looks6,
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
            }
        }

        // VDOT Calibration Section
        SectionCard(title = "VDOT Settings") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Correction Factor: ${String.format(java.util.Locale.US, "%.2f", vdotCorrection.toFloatOrNull() ?: 1f)}",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Calibrate your VDOT based on actual race performance",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Button(
                    onClick = { showCalibrationDialog = true }
                ) {
                    Icon(Icons.Default.Speed, null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Calibrate")
                }
            }
        }

        // Save Button
        Button(
            onClick = {
                onSave(
                    name.ifBlank { null },
                    sex,
                    birthDate.ifBlank { null },
                    hrMax.toIntOrNull(),
                    hrRest.toIntOrNull(),
                    weight.toFloatOrNull(),
                    height.toFloatOrNull(),
                    hrZone1Max.toIntOrNull(),
                    hrZone2Max.toIntOrNull(),
                    hrZone3Max.toIntOrNull(),
                    hrZone4Max.toIntOrNull(),
                    hrZone5Max.toIntOrNull(),
                    hrZone6Max.toIntOrNull(),
                    thresholdHr.toIntOrNull(),
                    // Recombine Min:Sec to Total Seconds
                    if (thresholdPaceMin.isNotBlank() || thresholdPaceSec.isNotBlank()) {
                        val min = thresholdPaceMin.toIntOrNull() ?: 0
                        val sec = thresholdPaceSec.toIntOrNull() ?: 0
                        (min * 60) + sec
                    } else null,
                    vdotCorrection.toFloatOrNull()
                )
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Save, null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Save Changes")
        }

        // Logout Button
        OutlinedButton(
            onClick = { showLogoutDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Logout")
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Logout", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // VDOT Calibration Dialog
    if (showCalibrationDialog) {
        com.runflow.app.ui.components.VDOTCalibrationDialog(
            recentActivities = recentActivities,
            currentCorrectionFactor = vdotCorrection.toFloatOrNull() ?: 1f,
            thresholdPace = ((thresholdPaceMin.toIntOrNull() ?: 0) * 60) + (thresholdPaceSec.toIntOrNull() ?: 0),
            onDismiss = { showCalibrationDialog = false },
            onApplyCalibration = { factor, _, _ ->
                vdotCorrection = factor.toString()
                showCalibrationDialog = false
                // Could call API to update correction factor
            }
        )
    }
}

@Composable
fun ProfileHeader(profile: com.runflow.app.data.model.UserProfile) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                if (profile.image != null) {
                    // Would load image here with Coil
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(
                    text = profile.name ?: "Runner",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                profile.email?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

@Composable
fun SectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
fun ProfileTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    keyboardType: androidx.compose.ui.text.input.KeyboardType = androidx.compose.ui.text.input.KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType),
        singleLine = true
    )
    Spacer(modifier = Modifier.height(8.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SexDropdown(
    selectedSex: Sex?,
    onSexSelected: (Sex) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it }
    ) {
        OutlinedTextField(
            value = selectedSex?.displayName ?: "Not specified",
            onValueChange = {},
            readOnly = true,
            label = { Text("Sex") },
            leadingIcon = { Icon(Icons.Default.Wc, null) },
            trailingIcon = {
                Icon(Icons.Default.ArrowDropDown, null)
            },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor()
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            Sex.entries.forEach { sex ->
                DropdownMenuItem(
                    text = { Text(sex.displayName) },
                    onClick = {
                        onSexSelected(sex)
                        expanded = false
                    },
                    leadingIcon = if (selectedSex == sex) {
                        { Icon(Icons.Default.Check, null) }
                    } else null
                )
            }
        }
    }
    Spacer(modifier = Modifier.height(8.dp))
}

val Sex.displayName: String
    get() = when (this) {
        Sex.MALE -> "Male"
        Sex.FEMALE -> "Female"
        Sex.OTHER -> "Other"
    }
