package com.runflow.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.auth.AuthRepository
import com.runflow.app.data.model.DashboardResponse
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.DashboardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val dashboardRepository: DashboardRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    val isAuthenticated = authRepository.isAuthenticated
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )

    private val _uiEvent = Channel<DashboardEvent>()
    val uiEvent = _uiEvent.receiveAsFlow()

    // Track if we've already triggered initial sync to avoid duplicate calls
    private var hasTriggeredInitialSync = false

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            when (val result = dashboardRepository.getDashboard()) {
                is ApiResult.Success -> {
                    _uiState.value = DashboardUiState.Success(result.data)

                    // Trigger initial sync for new users or users with no activities
                    // Check if user has never synced or has no recent activities
                    val needsInitialSync = result.data.syncStatus.lastSyncAt == null ||
                            result.data.syncStatus.totalActivities == 0

                    if (needsInitialSync && !hasTriggeredInitialSync && !result.data.syncStatus.syncInProgress) {
                        hasTriggeredInitialSync = true
                        // Trigger sync in background without blocking UI
                        syncData()
                    }
                }
                is ApiResult.Error -> {
                    _uiState.value = DashboardUiState.Error(result.message)
                }
                is ApiResult.Loading -> {
                    _uiState.value = DashboardUiState.Loading
                }
            }
        }
    }

    fun syncData() {
        viewModelScope.launch {
            // Optimistically show sync progress or keep current state
            val currentState = _uiState.value
            if (currentState is DashboardUiState.Success) {
                 // Update the sync status in the current data to show spinner
                 _uiState.value = DashboardUiState.Success(
                     currentState.data.copy(
                         syncStatus = currentState.data.syncStatus.copy(syncInProgress = true)
                     )
                 )
            }

            when (val result = dashboardRepository.syncData()) {
                is ApiResult.Success -> {
                    loadDashboard()
                }
                is ApiResult.Error -> {
                    _uiEvent.send(DashboardEvent.ShowMessage("Sync failed: ${result.message}"))
                    // Revert sync spinner if needed, or just reload dashboard to get fresh state
                    loadDashboard()
                }
                else -> {}
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = DashboardUiState.LoggedOut
        }
    }
}

sealed class DashboardEvent {
    data class ShowMessage(val message: String) : DashboardEvent()
}

sealed class DashboardUiState {
    data object Loading : DashboardUiState()
    data object LoggedOut : DashboardUiState()
    data class Success(val data: DashboardResponse) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}
