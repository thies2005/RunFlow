package com.runflow.app.ui.screens.activities

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.model.Activity
import com.runflow.app.data.model.ActivitiesResponse
import com.runflow.app.data.model.ManualActivityRequest
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.ActivitiesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ActivitiesViewModel @Inject constructor(
    private val activitiesRepository: ActivitiesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ActivitiesUiState>(ActivitiesUiState.Loading)
    val uiState: StateFlow<ActivitiesUiState> = _uiState.asStateFlow()

    private val _selectedActivity = MutableStateFlow<Activity?>(null)
    val selectedActivity: StateFlow<Activity?> = _selectedActivity.asStateFlow()

    private var allActivities: List<Activity> = emptyList()
    private var currentFilter: ActivityTypeFilter = ActivityTypeFilter.ALL
    private var currentPage = 0
    private val pageSize = 20

    init {
        loadActivities()
    }

    fun loadActivities(refresh: Boolean = false) {
        if (refresh) {
            currentPage = 0
            allActivities = emptyList()
        }

        viewModelScope.launch {
            _uiState.value = ActivitiesUiState.Loading
            when (val result = activitiesRepository.getActivities(
                limit = pageSize,
                offset = currentPage * pageSize
            )) {
                is ApiResult.Success -> {
                    if (refresh) {
                        allActivities = result.data.activities
                    } else {
                        allActivities = allActivities + result.data.activities
                    }
                    currentPage++
                    applyFilter()
                }
                is ApiResult.Error -> {
                    _uiState.value = ActivitiesUiState.Error(result.message)
                }
                is ApiResult.Loading -> {
                    _uiState.value = ActivitiesUiState.Loading
                }
            }
        }
    }

    fun setFilter(filter: ActivityTypeFilter) {
        currentFilter = filter
        applyFilter()
    }

    private fun applyFilter() {
        val filtered = when (currentFilter) {
            ActivityTypeFilter.ALL -> allActivities
            ActivityTypeFilter.RUN -> allActivities.filter { it.type == com.runflow.app.data.model.ActivityType.RUN }
            ActivityTypeFilter.RIDE -> allActivities.filter { it.type == com.runflow.app.data.model.ActivityType.RIDE }
            ActivityTypeFilter.RACE_ELIGIBLE -> allActivities.filter { it.isRaceEligible }
        }
        _uiState.value = ActivitiesUiState.Success(filtered)
    }

    fun selectActivity(activity: Activity) {
        _selectedActivity.value = activity
    }

    fun clearSelectedActivity() {
        _selectedActivity.value = null
    }

    fun loadMoreActivities() {
        loadActivities()
    }

    fun createManualActivity(request: ManualActivityRequest) {
        viewModelScope.launch {
            _uiState.value = ActivitiesUiState.Loading
            when (val result = activitiesRepository.createActivity(request)) {
                is ApiResult.Success -> {
                    loadActivities(refresh = true)
                }
                is ApiResult.Error -> {
                    _uiState.value = ActivitiesUiState.Error(result.message)
                }
                is ApiResult.Loading -> {}
            }
        }
    }
}

sealed class ActivitiesUiState {
    data object Loading : ActivitiesUiState()
    data class Success(val activities: List<Activity>) : ActivitiesUiState()
    data class Error(val message: String) : ActivitiesUiState()
}

enum class ActivityTypeFilter {
    ALL, RUN, RIDE, RACE_ELIGIBLE
}
