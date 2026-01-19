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
                    _uiState.value = _uiState.value.copy(
                        isLoading = false, 
                        isAuthenticated = true,
                        authMethod = "strava",
                        currentStep = 2 // Move to Sync Platform Step
                    )
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

    fun onEmailLogin(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.emailLogin(email, password)
            when (result) {
                is com.runflow.app.data.remote.ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false, 
                        isAuthenticated = true,
                        // If it's a new user (no created date check here yet, but simplistic assumes 
                        // sync might be needed or skip to profile if already set up. 
                        // For now consistent with web flow logic)
                        currentStep = 2 // Move to Sync Platform Step
                    )
                }
                is com.runflow.app.data.remote.ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is com.runflow.app.data.remote.ApiResult.Loading -> {}
            }
        }
    }

    fun onRegister(email: String, password: String, name: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.register(email, password, name)
            when (result) {
                is com.runflow.app.data.remote.ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false, 
                        isAuthenticated = true,
                        currentStep = 2 // Move to Sync Platform Step
                    )
                }
                is com.runflow.app.data.remote.ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = result.message)
                }
                is com.runflow.app.data.remote.ApiResult.Loading -> {}
            }
        }
    }

    fun setStep(step: Int) {
        _uiState.value = _uiState.value.copy(currentStep = step)
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
    val currentStep: Int = 0, // 0: Method Selection, 1: Auth (Strava/Email), 2: Sync, 3: Profile
    val authMethod: String? = null, // "strava" or "email"
    val error: String? = null
)
