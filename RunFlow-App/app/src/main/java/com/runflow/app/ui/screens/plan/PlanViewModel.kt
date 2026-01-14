package com.runflow.app.ui.screens.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.model.Activity
import com.runflow.app.data.model.Goal
import com.runflow.app.data.model.Workout
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.ActivitiesRepository
import com.runflow.app.data.repository.GoalsRepository
import com.runflow.app.data.repository.WorkoutsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.time.temporal.WeekFields
import java.util.Locale
import javax.inject.Inject

@HiltViewModel
class PlanViewModel @Inject constructor(
    private val goalsRepository: GoalsRepository,
    private val workoutsRepository: WorkoutsRepository,
    private val activitiesRepository: ActivitiesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlanUiState>(PlanUiState.Loading)
    val uiState: StateFlow<PlanUiState> = _uiState.asStateFlow()

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()
    
    // We maintain a cache of loaded weeks to support scrolling
    // For now, we'll just ensure we have Current +/- 1 week loaded


    private val _selectedGoal = MutableStateFlow<Goal?>(null)
    val selectedGoal: StateFlow<Goal?> = _selectedGoal.asStateFlow()

    // Activities available for linking (unlinked activities)
    private val _availableActivities = MutableStateFlow<List<Activity>>(emptyList())
    val availableActivities: StateFlow<List<Activity>> = _availableActivities.asStateFlow()

    private val _isLoadingActivities = MutableStateFlow(false)
    val isLoadingActivities: StateFlow<Boolean> = _isLoadingActivities.asStateFlow()

    private var allGoals: List<Goal> = emptyList()
    private var allWorkouts: Map<String, List<Workout>> = emptyMap()
    private var allActivities: List<Activity> = emptyList()

    init {
        loadPlanData()
    }

    fun loadPlanData() {
        viewModelScope.launch {
            _uiState.value = PlanUiState.Loading
            
            // Fetch Activities first (parallel execution would be better but sequential is safer for now)
            val activitiesResult = activitiesRepository.getActivities(limit = 50)
            if (activitiesResult is ApiResult.Success) {
                allActivities = activitiesResult.data.activities
                _availableActivities.value = allActivities // Populate for linking dialog too
            }

            when (val result = goalsRepository.getGoals()) {
                is ApiResult.Success -> {
                    allGoals = result.data.goals
                    if (allGoals.isNotEmpty()) {
                        val activeGoal = allGoals.firstOrNull { it.isActive }
                        _selectedGoal.value = activeGoal ?: allGoals.first()
                    }
                    loadWorkoutsForSelectedGoal()
                }
                is ApiResult.Error -> {
                    _uiState.value = PlanUiState.Error(result.message)
                }
                is ApiResult.Loading -> {}
            }
        }
    }

    private fun loadWorkoutsForSelectedGoal() {
        val goal = _selectedGoal.value
        if (goal != null) {
            viewModelScope.launch {
                // Fetch a wide range to ensure we have past and future workouts
                // This fixes both "missing future workouts" and "duplicate/unlinked past activities"
                // (since we need the workout to know it's linked)
                val current = LocalDate.now()
                val start = current.minusMonths(6).format(DateTimeFormatter.ISO_LOCAL_DATE)
                val end = current.plusMonths(6).format(DateTimeFormatter.ISO_LOCAL_DATE)
                
                when (val result = workoutsRepository.getWorkouts(
                    goalId = goal.id,
                    weekStart = start,
                    weekEnd = end
                )) {
                    is ApiResult.Success -> {
                        allWorkouts = allWorkouts + (goal.id to result.data.workouts)
                        updateUiState()
                    }
                    is ApiResult.Error -> {
                        _uiState.value = PlanUiState.Error(result.message)
                    }
                    is ApiResult.Loading -> {}
                }
            }
        } else {
            updateUiState()
        }
    }
    
    private fun updateUiState() {
        val goal = _selectedGoal.value
        val workouts = if (goal != null) allWorkouts[goal.id] ?: emptyList() else emptyList()
        _uiState.value = PlanUiState.Success(
            goals = allGoals,
            workouts = workouts,
            selectedGoal = goal,
            weekPlanIds = getWeekPlanItems() // Pre-calculate for current week
        )
    }

    fun selectGoal(goal: Goal) {
        _selectedGoal.value = goal
        loadWorkoutsForSelectedGoal()
    }

    fun selectDate(date: LocalDate) {
        _selectedDate.value = date
        // No need to re-fetch if we have all data, but if we need to pagination, we would here.
        // For now, just update UI state with new week's items
        updateUiState()
    }

    // ... (getWeekDates, getWorkoutsForDate kept for legacy/helper) ...
    
    fun getWeekDates(): List<LocalDate> {
        val current = _selectedDate.value
        val startOfCurrentWeek = current.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val endOfCurrentWeek = startOfCurrentWeek.plusDays(6)
        
        // Show 3 days before current week, current week, and 3 days after
        // This gives users context without overwhelming them
        val start = startOfCurrentWeek.minusDays(3)
        val end = endOfCurrentWeek.plusDays(3)
        
        val dates = mutableListOf<LocalDate>()
        var date = start
        while (!date.isAfter(end)) {
            dates.add(date)
            date = date.plusDays(1)
        }
        return dates
    }

    private fun getWeekPlanItems(): Map<LocalDate, List<PlanItem>> {
        val dates = getWeekDates()
        val goal = _selectedGoal.value ?: return emptyMap()
        val workoutsForGoal = allWorkouts[goal.id] ?: emptyList()

        val rangeActivities = allActivities.filter { 
             try {
                 val date = LocalDate.parse(it.startDate.take(10))
                 !date.isBefore(dates.first()) && !date.isAfter(dates.last())
             } catch (e: Exception) { false }
        }
        
        // GLOBAL FILTER: Identify ALL linked activities across the entire loaded range
        // This prevents an activity linked to a workout on Day X from showing up as "Unlinked" on Day Y (if dates mismatch)
        // or just redundant display if local logic was flawed.
        val allLinkedActivityIds = workoutsForGoal
            .mapNotNull { it.linkedActivityId }
            .toSet()

        return dates.associateWith { date ->
            // 1. Get workouts for this date
            val daysWorkouts = workoutsForGoal.filter {
                 try {
                     LocalDate.parse(it.scheduledDate.take(10)).toEpochDay() == date.toEpochDay()
                 } catch (e: Exception) { false }
            }
            
            // 2. Get activities for this date
            val daysActivities = rangeActivities.filter {
                 try {
                     LocalDate.parse(it.startDate.take(10)).toEpochDay() == date.toEpochDay()
                 } catch (e: Exception) { false }
            }
            
            // 3. Create PlanItems for Workouts
            val workoutItems = daysWorkouts.map { workout ->
                val linkedActivity = if (workout.linkedActivityId != null) {
                    allActivities.find { it.id == workout.linkedActivityId } // Use allActivities lookup
                } else null
                PlanItem.PlannedWorkout(workout, linkedActivity)
            }
            
            // 4. Create PlanItems for Unlinked Activities
            // ONLY show if NOT in the global set of linked IDs
            val unlinkedActivityItems = daysActivities
                .filter { it.id !in allLinkedActivityIds }
                .map { PlanItem.UnlinkedActivity(it) }
                
            (workoutItems + unlinkedActivityItems).sortedBy { 
                when(it) {
                    is PlanItem.PlannedWorkout -> it.workout.order
                    is PlanItem.UnlinkedActivity -> 99 
                }
            }
        }
    }

    // ... (previousWeek, nextWeek) ...
    fun previousWeek() {
        _selectedDate.value = _selectedDate.value.minusWeeks(1)
        updateUiState()
    }

    fun nextWeek() {
        _selectedDate.value = _selectedDate.value.plusWeeks(1)
        updateUiState()
    }

    /**
     * Load activities that can be linked to workouts.
     * Filters to recent unlinked activities.
     */
    fun loadActivitiesForLinking() {
        viewModelScope.launch {
            _isLoadingActivities.value = true
            when (val result = activitiesRepository.getActivities(limit = 50)) {
                is ApiResult.Success -> {
                    allActivities = result.data.activities
                    _availableActivities.value = allActivities
                    updateUiState() // Ensure UI has latest activities too
                }
                is ApiResult.Error -> {
                    _availableActivities.value = emptyList()
                }
                is ApiResult.Loading -> {}
            }
            _isLoadingActivities.value = false
        }
    }

    /**
     * Link an activity to a workout.
     */
    fun linkActivityToWorkout(workoutId: String, activityId: String) {
        viewModelScope.launch {
            when (workoutsRepository.completeWorkout(workoutId, activityId)) {
                is ApiResult.Success -> {
                    loadWorkoutsForSelectedGoal()
                }
                else -> {}
            }
        }
    }
    
    fun addWorkout(
        goalId: String,
        workoutType: com.runflow.app.data.model.WorkoutType,
        description: String,
        targetDistance: Float?,
        targetDuration: Int?,
        targetPace: Float?,
        scheduledDate: String
    ) {
        viewModelScope.launch {
            val request = com.runflow.app.data.model.CreateWorkoutRequest(
                goalId = goalId,
                workoutType = workoutType,
                description = description,
                targetDistance = targetDistance,
                targetDuration = targetDuration,
                targetPace = targetPace,
                targetHrZone = null,
                scheduledDate = scheduledDate,
                notes = null
            )
            when (workoutsRepository.createWorkout(request)) {
                is ApiResult.Success -> {
                    loadWorkoutsForSelectedGoal()
                }
                is ApiResult.Error -> {
                    // Handle error
                }
                else -> {}
            }
        }
    }

    /**
     * Move a workout to a different date.
     */
    fun moveWorkoutToDate(workoutId: String, newDate: LocalDate) {
        viewModelScope.launch {
            val dateString = newDate.format(DateTimeFormatter.ISO_LOCAL_DATE) // append T00:00:00 if needed? Backend usually ISO.
            // Check current format. Assuming ISO Date or DateTime. 
            // Existing addWorkout uses "scheduledDate" string.
            val request = com.runflow.app.data.model.UpdateWorkoutRequest(
                scheduledDate = dateString // Backend should handle T00:00:00 or preserve time if possible, but safe to send date only?
                // If backend expects DateTime, we might need to append time. 
                // Let's check how existing workouts are formatted.
            )
            
            when (workoutsRepository.updateWorkout(workoutId, request)) {
                is ApiResult.Success -> {
                    loadWorkoutsForSelectedGoal()
                }
                else -> {} // Handle error
            }
        }
    }

}

sealed interface PlanItem {
    data class PlannedWorkout(
        val workout: Workout,
        val linkedActivity: Activity? = null
    ) : PlanItem
    
    data class UnlinkedActivity(
        val activity: Activity
    ) : PlanItem
}

sealed class PlanUiState {
    data object Loading : PlanUiState()
    data class Success(
        val goals: List<Goal>,
        val workouts: List<Workout>,
        val selectedGoal: Goal?,
        val weekPlanIds: Map<LocalDate, List<PlanItem>> = emptyMap()
    ) : PlanUiState()
    data class Error(val message: String) : PlanUiState()
}
