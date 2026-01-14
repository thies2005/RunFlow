package com.runflow.app.ui.screens.activities

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.model.Activity
import com.runflow.app.data.model.ActivityType
import com.runflow.app.data.model.WorkoutType
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.ActivitiesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ActivityDetailViewModel @Inject constructor(
    private val activitiesRepository: ActivitiesRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val activityId: String = checkNotNull(savedStateHandle["activityId"])

    private val _uiState = MutableStateFlow<ActivityDetailUiState>(ActivityDetailUiState.Loading)
    val uiState: StateFlow<ActivityDetailUiState> = _uiState.asStateFlow()

    init {
        loadActivity()
    }

    fun loadActivity() {
        viewModelScope.launch {
            _uiState.value = ActivityDetailUiState.Loading
            when (val result = activitiesRepository.getActivity(activityId)) {
                is ApiResult.Success -> {
                    _uiState.value = ActivityDetailUiState.Success(result.data)
                }
                is ApiResult.Error -> {
                    _uiState.value = ActivityDetailUiState.Error(result.message)
                }
                is ApiResult.Loading -> {}
            }
        }
    }
}

sealed class ActivityDetailUiState {
    data object Loading : ActivityDetailUiState()
    data class Success(val activity: Activity) : ActivityDetailUiState()
    data class Error(val message: String) : ActivityDetailUiState()
}
