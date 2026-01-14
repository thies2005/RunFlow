package com.runflow.app.ui.screens.profile

import androidx.compose.foundation.background

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
                    recentActivities = state.recentActivities,
                    onSave = { name, sex, birthDate, hrMax, hrRest, weight, height,
                                hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, vdotCorrection ->
                        viewModel.updateProfile(name, sex, birthDate, hrMax, hrRest, weight, height,
                            hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, vdotCorrection)
                    },
                    onLogout = { viewModel.logout() },
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
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

@Composable
fun ProfileContent(
    profile: com.runflow.app.data.model.UserProfile,
    recentActivities: List<com.runflow.app.data.model.Activity> = emptyList(),
    onSave: (
        name: String?, sex: Sex?, birthDate: String?, hrMax: Int?, hrRest: Int?,
        weight: Float?, height: Float?, hrZone1Max: Int?, hrZone2Max: Int?,
        hrZone3Max: Int?, hrZone4Max: Int?, vdotCorrection: Float?
    ) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var name by remember { mutableStateOf(profile.name ?: "") }
    var sex by remember { mutableStateOf(profile.sex) }
    var birthDate by remember { mutableStateOf(profile.birthDate ?: "") }
    var hrMax by remember { mutableStateOf(profile.hrMax?.toString() ?: "") }
    var hrRest by remember { mutableStateOf(profile.hrRest?.toString() ?: "") }
    var weight by remember { mutableStateOf(profile.weight?.toString() ?: "") }
    var height by remember { mutableStateOf(profile.height?.toString() ?: "") }
    var hrZone1Max by remember { mutableStateOf(profile.hrZone1Max.toString()) }
    var hrZone2Max by remember { mutableStateOf(profile.hrZone2Max.toString()) }
    var hrZone3Max by remember { mutableStateOf(profile.hrZone3Max.toString()) }
    var hrZone4Max by remember { mutableStateOf(profile.hrZone4Max.toString()) }
    var vdotCorrection by remember { mutableStateOf(profile.vdotCorrectionFactor.toString()) }

    var showLogoutDialog by remember { mutableStateOf(false) }
    var showCalibrationDialog by remember { mutableStateOf(false) }

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

            ProfileTextField(
                value = birthDate,
                onValueChange = { birthDate = it },
                label = "Birth Date (YYYY-MM-DD)",
                icon = Icons.Default.Cake
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
            Text(
                text = "Heart Rate Zone Thresholds",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )

            ProfileTextField(
                value = hrZone1Max,
                onValueChange = { hrZone1Max = it },
                label = "Zone 1 Max (bpm)",
                icon = Icons.Default.LooksOne,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )

            ProfileTextField(
                value = hrZone2Max,
                onValueChange = { hrZone2Max = it },
                label = "Zone 2 Max (bpm)",
                icon = Icons.Default.LooksTwo,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )

            ProfileTextField(
                value = hrZone3Max,
                onValueChange = { hrZone3Max = it },
                label = "Zone 3 Max (bpm)",
                icon = Icons.Default.Looks3,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )

            ProfileTextField(
                value = hrZone4Max,
                onValueChange = { hrZone4Max = it },
                label = "Zone 4 Max (bpm)",
                icon = Icons.Default.Looks4,
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
            )
        }

        // VDOT Calibration Section
        SectionCard(title = "VDOT Settings") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Correction Factor: ${String.format("%.2f", vdotCorrection.toFloatOrNull() ?: 1f)}",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Calibrate your VDOT based on actual race performance",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
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
            onDismiss = { showCalibrationDialog = false },
            onApplyCalibration = { factor, calibrationTime, calibrationDistance ->
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
