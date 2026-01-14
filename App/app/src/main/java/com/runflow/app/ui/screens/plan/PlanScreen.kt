package com.runflow.app.ui.screens.plan

import com.runflow.app.ui.common.*

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import com.runflow.app.data.model.PlanPhase
import com.runflow.app.data.model.Workout
import com.runflow.app.data.model.WorkoutType
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import java.time.temporal.TemporalAdjusters
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.ExperimentalFoundationApi

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanScreen(
    onNavigateBack: () -> Unit,
    viewModel: PlanViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val availableActivities by viewModel.availableActivities.collectAsState()
    val isLoadingActivities by viewModel.isLoadingActivities.collectAsState()
    
    var showAddWorkoutDialog by remember { mutableStateOf<LocalDate?>(null) }
    var showLinkActivityDialog by remember { mutableStateOf(false) }
    var selectedWorkoutForLinking by remember { mutableStateOf<Workout?>(null) }
    
    // State for moving workout
    var workoutToMove by remember { mutableStateOf<Workout?>(null) }
    val context = LocalContext.current

    if (workoutToMove != null) {
        val currentScheduled = try {
            LocalDate.parse(workoutToMove!!.scheduledDate.take(10))
        } catch (e: Exception) { LocalDate.now() }
        
        DisposableEffect(workoutToMove) {
            val dialog = android.app.DatePickerDialog(
                context,
                { _, year, month, day ->
                    val newDate = LocalDate.of(year, month + 1, day)
                    viewModel.moveWorkoutToDate(workoutToMove!!.id, newDate)
                    workoutToMove = null
                },
                currentScheduled.year,
                currentScheduled.monthValue - 1,
                currentScheduled.dayOfMonth
            )
            
            dialog.setOnCancelListener { workoutToMove = null }
            dialog.show()
            
            onDispose {
                dialog.dismiss()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Plan", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is PlanUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is PlanUiState.Success -> {
                PlanContent(
                    weekDates = viewModel.getWeekDates(),
                    weekPlanItems = state.weekPlanIds,
                    selectedGoal = state.selectedGoal,
                    goals = state.goals,
                    onGoalSelected = { viewModel.selectGoal(it) },
                    onPreviousWeek = { viewModel.previousWeek() },
                    onNextWeek = { viewModel.nextWeek() },
                    onAddWorkoutClick = { date -> showAddWorkoutDialog = date },
                    onWorkoutClick = { workout ->
                        if (workout.linkedActivityId == null) {
                            selectedWorkoutForLinking = workout
                            viewModel.loadActivitiesForLinking()
                            showLinkActivityDialog = true
                        }
                    },
                    onMoveWorkout = { workout -> workoutToMove = workout },
                    onActivityClick = { /* Navigate to activity detail? */ },
                    modifier = Modifier.fillMaxSize().padding(padding)
                )
            }
            is PlanUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text("Error: ${state.message}")
                    Button(onClick = { viewModel.loadPlanData() }) { Text("Retry") }
                }
            }
        }
    }
    
    // Add Workout Dialog
    if (showAddWorkoutDialog != null && uiState is PlanUiState.Success) {
        val goalId = (uiState as PlanUiState.Success).selectedGoal?.id
        if (goalId != null) {
            com.runflow.app.ui.components.AddWorkoutDialog(
                selectedDate = showAddWorkoutDialog!!,
                goalId = goalId,
                onDismiss = { showAddWorkoutDialog = null },
                onAddWorkout = { type, desc, dist, dur, pace, date ->
                    viewModel.addWorkout(goalId, type, desc, dist, dur, pace, date)
                    showAddWorkoutDialog = null
                }
            )
        }
    }
    
    // Link Activity Dialog
    if (showLinkActivityDialog && selectedWorkoutForLinking != null) {
        com.runflow.app.ui.components.LinkActivityDialog(
            workout = selectedWorkoutForLinking!!,
            activities = availableActivities,
            isLoading = isLoadingActivities,
            onDismiss = { 
                showLinkActivityDialog = false
                selectedWorkoutForLinking = null
            },
            onActivitySelected = { activity ->
                viewModel.linkActivityToWorkout(selectedWorkoutForLinking!!.id, activity.id)
                showLinkActivityDialog = false
                selectedWorkoutForLinking = null
            }
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PlanContent(
    weekDates: List<LocalDate>,
    weekPlanItems: Map<LocalDate, List<PlanItem>>,
    selectedGoal: com.runflow.app.data.model.Goal?,
    goals: List<com.runflow.app.data.model.Goal>,
    onGoalSelected: (com.runflow.app.data.model.Goal) -> Unit,
    onPreviousWeek: () -> Unit,
    onNextWeek: () -> Unit,
    onAddWorkoutClick: (LocalDate) -> Unit,
    onWorkoutClick: (Workout) -> Unit,
    onMoveWorkout: (Workout) -> Unit,
    onActivityClick: (com.runflow.app.data.model.Activity) -> Unit,
    modifier: Modifier = Modifier
) {
    // Group dates into weeks dynamically based on week of year
    // This handles partial weeks (like 3 days before/after) correctly
    val weekFields = WeekFields.of(Locale.getDefault())
    val weeks = weekDates.groupBy { date ->
        date.get(weekFields.weekOfWeekBasedYear())
    }.toSortedMap().values.toList()
    
    Column(modifier = modifier) {


        // Vertical List of Days with Sticky Week Headers
        LazyColumn(
            contentPadding = PaddingValues(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp) // Spacing handled by padding in items
        ) {
            weeks.forEach { week ->
                item {
                     WeekHeaderRow(week, onPreviousWeek, onNextWeek, showNav = false) // Nav handled by scroll mostly, but could keep buttons
                }
                
                items(week) { date ->
                    DayPlanSection(
                        date = date,
                        items = weekPlanItems[date] ?: emptyList(),
                        isToday = date == LocalDate.now(),
                        onAddWorkoutClick = { onAddWorkoutClick(date) },
                        onWorkoutClick = onWorkoutClick,
                        onMoveWorkout = onMoveWorkout,
                        onActivityClick = onActivityClick
                    )
                    Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                }
            }
            
            // Add navigation buttons at bottom/top?
            // "Load More" logic is implicit in typical infinite scroll, 
            // but here we just show 3 weeks.
            // User can click Floating buttons to nav? 
            // Stick to the requested "weeks before and after".
            item {
                 Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                 ) {
                     TextButton(onClick = onPreviousWeek) { Text("Load Previous Weeks") }
                     TextButton(onClick = onNextWeek) { Text("Load Next Weeks") }
                 }
            }
        }
    }
}

@Composable
fun WeekHeaderRow(
    weekDates: List<LocalDate>,
    onPreviousWeek: () -> Unit,
    onNextWeek: () -> Unit,
    showNav: Boolean = true
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            getHorizontalArrangement(showNav),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (showNav) {
                IconButton(onClick = onPreviousWeek) {
                    Icon(Icons.Default.ChevronLeft, "Previous")
                }
            }
            
            if (weekDates.isNotEmpty()) {
                 Column(horizontalAlignment = if(showNav) Alignment.CenterHorizontally else Alignment.Start) {
                    val weekNum = weekDates.first().get(WeekFields.of(Locale.getDefault()).weekOfYear())
                    Text(
                        text = "Week $weekNum",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "${weekDates.first().format(DateTimeFormatter.ofPattern("MMM d"))} - ${weekDates.last().format(DateTimeFormatter.ofPattern("MMM d"))}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (showNav) {
                IconButton(onClick = onNextWeek) {
                    Icon(Icons.Default.ChevronRight, "Next")
                }
            }
        }
    }
}

private fun getHorizontalArrangement(showNav: Boolean) = 
    if (showNav) Arrangement.SpaceBetween else Arrangement.Start


@Composable
fun DayPlanSection(
    date: LocalDate,
    items: List<PlanItem>,
    isToday: Boolean,
    onAddWorkoutClick: () -> Unit,
    onWorkoutClick: (Workout) -> Unit,
    onMoveWorkout: (Workout) -> Unit,
    onActivityClick: (com.runflow.app.data.model.Activity) -> Unit
) {
    Row(modifier = Modifier.fillMaxWidth()) {
        // Left Column: Date
        Column(
            modifier = Modifier.width(56.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = date.format(DateTimeFormatter.ofPattern("EEE")).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = date.format(DateTimeFormatter.ofPattern("dd")),
                style = MaterialTheme.typography.titleLarge,
                color = if (isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal
            )
            if (isToday) {
                Box(
                    modifier = Modifier
                        .padding(top = 4.dp)
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                )
            }
             IconButton(
                onClick = onAddWorkoutClick,
                modifier = Modifier.size(24.dp).padding(top = 8.dp)
            ) {
                Icon(Icons.Default.Add, "Add", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Right Column: Items
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (items.isEmpty()) {
                 Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), modifier = Modifier.padding(top = 12.dp))
            } else {
                items.forEach { item ->
                    when (item) {
                        is PlanItem.PlannedWorkout -> {
                            PlannedWorkoutCard(
                                workout = item.workout,
                                linkedActivity = item.linkedActivity,
                                onClick = { onWorkoutClick(item.workout) },
                                onMoveClick = { onMoveWorkout(item.workout) }
                            )
                        }
                        is PlanItem.UnlinkedActivity -> {
                            UnlinkedActivityCard(
                                activity = item.activity,
                                onClick = { onActivityClick(item.activity) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
fun PlannedWorkoutCard(
    workout: Workout,
    linkedActivity: com.runflow.app.data.model.Activity?,
    onClick: () -> Unit,
    onMoveClick: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
             containerColor = if (workout.isCompleted || linkedActivity != null) 
                 MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f) 
             else MaterialTheme.colorScheme.surface
        )
    ) {
         Box {
             Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                 // Icon
                 Icon(
                    imageVector = workout.workoutType.icon,
                    contentDescription = null,
                    tint = workout.workoutType.color,
                    modifier = Modifier.size(24.dp)
                )
                 
                 Spacer(modifier = Modifier.width(12.dp))
                 
                 // Content
                 Column(modifier = Modifier.weight(1f)) {
                     Text(
                         text = workout.workoutType.displayName,
                         style = MaterialTheme.typography.titleMedium,
                         fontWeight = FontWeight.SemiBold
                     )
                     if (workout.description.isNotEmpty()) {
                         Text(
                             text = workout.description,
                             style = MaterialTheme.typography.bodySmall,
                             color = MaterialTheme.colorScheme.onSurfaceVariant,
                             maxLines = 1
                         )
                     }
                     
                     // Stats Row
                     Row(
                         horizontalArrangement = Arrangement.spacedBy(8.dp),
                         verticalAlignment = Alignment.CenterVertically,
                         modifier = Modifier.padding(top = 4.dp)
                     ) {
                        if (workout.targetDistance != null) {
                             Text(
                                 text = "${workout.targetDistance.toInt()}m",
                                 style = MaterialTheme.typography.bodySmall
                             )
                         }
                         if (linkedActivity != null) {
                              // Linked Activity Info
                              Icon(Icons.Default.Link, "Linked", modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.primary)
                              Text(
                                  text = formatDistance(linkedActivity.distance),
                                  style = MaterialTheme.typography.bodySmall,
                                  color = MaterialTheme.colorScheme.primary,
                                  fontWeight = FontWeight.Bold
                              )
                         }
                     }
                 }
                 
                 // Status & Menu
                 Row(verticalAlignment = Alignment.CenterVertically) {
                     if (linkedActivity != null || workout.isCompleted) {
                          Icon(Icons.Default.Check, "Done", tint = Color(0xFF4CAF50))
                          Spacer(modifier = Modifier.width(8.dp))
                     } else if (workout.targetDistance != null) {
                          Text(
                              text = "${(workout.targetDistance / 1000f)}k", 
                              style = MaterialTheme.typography.bodyMedium,
                              color = MaterialTheme.colorScheme.onSurfaceVariant
                          )
                          Spacer(modifier = Modifier.width(8.dp))
                     }
                     
                     // More Menu
                     Box {
                         IconButton(onClick = { showMenu = true }, modifier = Modifier.size(24.dp)) {
                             Icon(Icons.Default.MoreVert, "More", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                         }
                         DropdownMenu(
                             expanded = showMenu,
                             onDismissRequest = { showMenu = false }
                         ) {
                             DropdownMenuItem(
                                 text = { Text("Move to Date") },
                                 onClick = { 
                                     showMenu = false
                                     onMoveClick() 
                                 },
                                 leadingIcon = { Icon(Icons.Default.EditCalendar, null) }
                             )
                         }
                     }
                 }
            }
            
            // Progress Bar if linked
            if (linkedActivity != null && workout.targetDistance != null && workout.targetDistance > 0) {
                 val progress = (linkedActivity.distance / workout.targetDistance).coerceIn(0f, 1f)
                 // Ensure valid float
                 val safeProgress = if (progress.isNaN()) 0f else progress
                 
                 LinearProgressIndicator(
                     progress = safeProgress,
                     modifier = Modifier.fillMaxWidth().height(2.dp),
                     color = if (safeProgress >= 1f) Color(0xFF4CAF50) else MaterialTheme.colorScheme.primary,
                     trackColor = Color.Transparent
                 )
            }
         }
    }
}

@Composable
fun UnlinkedActivityCard(
    activity: com.runflow.app.data.model.Activity,
    onClick: () -> Unit
) {
     Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
             containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f), // Distinct look
        )
    ) {
         Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
             Icon(
                imageVector = Icons.Default.DirectionsRun,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
             Spacer(modifier = Modifier.width(12.dp))
             
             Column(modifier = Modifier.weight(1f)) {
                 Text(
                     text = activity.name,
                     style = MaterialTheme.typography.bodyMedium,
                     fontWeight = FontWeight.Medium
                 )
                 Text(
                     text = formatDistance(activity.distance),
                     style = MaterialTheme.typography.bodySmall,
                     color = MaterialTheme.colorScheme.onSurfaceVariant
                 )
             }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalSelector(
    goals: List<com.runflow.app.data.model.Goal>,
    selectedGoal: com.runflow.app.data.model.Goal?,
    onGoalSelected: (com.runflow.app.data.model.Goal) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Active Goal",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = selectedGoal?.name ?: "Select a goal",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (selectedGoal != null) {
                    Text(
                        text = "${selectedGoal.raceType.displayName} · ${formatDate(selectedGoal.raceDate)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Icon(Icons.Default.ArrowDropDown, null)
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.9f)
        ) {
            goals.forEach { goal ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(goal.name, fontWeight = if (goal == selectedGoal) FontWeight.Bold else FontWeight.Normal)
                            Text(
                                "${goal.raceType.displayName} · ${formatDate(goal.raceDate)}",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    },
                    onClick = {
                        onGoalSelected(goal)
                        expanded = false
                    },
                    leadingIcon = if (goal.isActive) {
                        { Icon(Icons.Default.Star, null, tint = Color(0xFFFFC107)) }
                    } else null
                )
            }
        }
    }
}


// Extensions

private fun formatDistance(distanceMeters: Float): String {
    return if (distanceMeters >= 1000) {
        String.format("%.1fkm", distanceMeters / 1000f)
    } else {
        "${distanceMeters.toInt()}m"
    }
}


