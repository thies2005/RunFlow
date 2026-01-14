package com.runflow.app.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.auth.AuthRepository
import com.runflow.app.data.model.ActivitiesResponse
import com.runflow.app.data.model.Sex
import com.runflow.app.data.model.UpdateProfileRequest
import com.runflow.app.data.model.UserProfile
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository,
    private val activitiesRepository: com.runflow.app.data.repository.ActivitiesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = ProfileUiState.Loading
            
            // Parallel fetch
            val profileDeferred = async { userRepository.getUserProfile() }
            val activitiesDeferred = async { activitiesRepository.getActivities(limit = 20) }
            
            val profileResult = profileDeferred.await()
            val activitiesResult = activitiesDeferred.await()
            
            if (profileResult is ApiResult.Success<UserProfile>) {
                val activities = if (activitiesResult is ApiResult.Success<ActivitiesResponse>) {
                    activitiesResult.data.activities
                } else {
                    emptyList()
                }
                _uiState.value = ProfileUiState.Success(profileResult.data, activities)
            } else if (profileResult is ApiResult.Error) {
                _uiState.value = ProfileUiState.Error(profileResult.message)
            }
        }
    }

    fun updateProfile(
        name: String? = null,
        sex: Sex? = null,
        birthDate: String? = null,
        hrMax: Int? = null,
        hrRest: Int? = null,
        weight: Float? = null,
        height: Float? = null,
        hrZone1Max: Int? = null,
        hrZone2Max: Int? = null,
        hrZone3Max: Int? = null,
        hrZone4Max: Int? = null,
        hrZone5Max: Int? = null,
        hrZone6Max: Int? = null,
        thresholdHr: Int? = null,
        thresholdPace: Int? = null,
        vdotCorrectionFactor: Float? = null
    ) {
        viewModelScope.launch {
            val previousActivities = (_uiState.value as? ProfileUiState.Success)?.recentActivities ?: emptyList()
            _uiState.value = ProfileUiState.Saving
            when (val result = userRepository.updateUserProfile(
                UpdateProfileRequest(
                    name = name,
                    sex = sex,
                    birthDate = birthDate,
                    hrMax = hrMax,
                    hrRest = hrRest,
                    weight = weight,
                    height = height,
                    hrZone1Max = hrZone1Max,
                    hrZone2Max = hrZone2Max,
                    hrZone3Max = hrZone3Max,
                    hrZone4Max = hrZone4Max,
                    hrZone5Max = hrZone5Max,
                    hrZone6Max = hrZone6Max,
                    thresholdHr = thresholdHr,
                    thresholdPace = thresholdPace,
                    vdotCorrectionFactor = vdotCorrectionFactor
                )
            )) {
                is ApiResult.Success -> {
                    _uiState.value = ProfileUiState.Success(result.data, previousActivities)
                }
                is ApiResult.Error -> {
                    _uiState.value = ProfileUiState.Error(result.message)
                }
                is ApiResult.Loading -> {}
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = ProfileUiState.LoggedOut
        }
    }
}

sealed class ProfileUiState {
    data object Loading : ProfileUiState()
    data object Saving : ProfileUiState()
    data object LoggedOut : ProfileUiState()
    data class Success(
        val profile: UserProfile,
        val recentActivities: List<com.runflow.app.data.model.Activity> = emptyList()
    ) : ProfileUiState()
    data class Error(val message: String) : ProfileUiState()
}
