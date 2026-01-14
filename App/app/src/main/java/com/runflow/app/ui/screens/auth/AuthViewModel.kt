package com.runflow.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.auth.AuthRepository
import com.runflow.app.data.auth.AuthTokenManager
import com.runflow.app.data.local.PreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val authTokenManager: AuthTokenManager,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthState())
    val uiState: StateFlow<AuthState> = _uiState.asStateFlow()

    init {
        // Check if user is already authenticated
        viewModelScope.launch {
            val token = authTokenManager.accessToken.firstOrNull()
            val userId = authTokenManager.userId.firstOrNull()
            if (token != null && userId != null) {
                _uiState.value = _uiState.value.copy(isAuthenticated = true, currentStep = 3)
            }
        }
    }

    fun onConnectStrava() {
        // OAuth is handled via MainActivity
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
        }
    }

    fun onProfileSubmit(hrMax: String, hrRest: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            // Save heart rate settings to DataStore
            preferencesManager.saveHeartRateSettings(hrMax, hrRest)
            _uiState.value = _uiState.value.copy(isLoading = false, currentStep = 3, isAuthenticated = true)
        }
    }

    suspend fun handleAuthCode(code: String): Result<Unit> {
        return try {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = authRepository.login(code)
            when (result) {
                is com.runflow.app.data.remote.ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, isAuthenticated = true)
                    Result.success(Unit)
                }
                is com.runflow.app.data.remote.ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                    Result.failure(Exception(result.message))
                }
                is com.runflow.app.data.remote.ApiResult.Loading -> Result.success(Unit) // Should not happen
            }
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Authentication failed")
            Result.failure(e)
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            preferencesManager.clearAuth()
            _uiState.value = AuthState()
        }
    }

    // Notification settings (exposed for SettingsScreen)
    val notificationsEnabled = preferencesManager.notificationsEnabled
    val syncNotifications = preferencesManager.syncNotifications

    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            preferencesManager.setNotificationsEnabled(enabled)
        }
    }

    fun setSyncNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            preferencesManager.setSyncNotificationsEnabled(enabled)
        }
    }
}

data class AuthState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val currentStep: Int = 1, // 1: Connect, 2: Profile, 3: Complete
    val error: String? = null
)
