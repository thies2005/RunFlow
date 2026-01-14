package com.runflow.app.ui.screens.plans

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import javax.inject.Inject

@HiltViewModel
class PlanCreationViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(PlanCreationUiState())
    val uiState: StateFlow<PlanCreationUiState> = _uiState.asStateFlow()

    fun onRaceDistanceSelected(distance: String) {
        _uiState.value = _uiState.value.copy(selectedDistance = distance)
    }

    fun onTargetTimeChanged(time: String) {
        _uiState.value = _uiState.value.copy(targetTime = time)
    }

    fun createPlan() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            // Simulate API call
            delay(1000)
            _uiState.value = _uiState.value.copy(isLoading = false, planCreated = true)
        }
    }
}

data class PlanCreationUiState(
    val selectedDistance: String? = null,
    val targetTime: String = "",
    val isLoading: Boolean = false,
    val planCreated: Boolean = false
)
