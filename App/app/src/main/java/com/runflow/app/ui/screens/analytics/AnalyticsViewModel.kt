package com.runflow.app.ui.screens.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runflow.app.data.model.AnalyticsStats
import com.runflow.app.data.model.TimeRange
import com.runflow.app.data.remote.ApiResult
import com.runflow.app.data.repository.AnalyticsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsRepository: AnalyticsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AnalyticsUiState>(AnalyticsUiState.Loading)
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    private val _selectedTimeRange = MutableStateFlow(TimeRange.THREE_MONTHS)
    val selectedTimeRange: StateFlow<TimeRange> = _selectedTimeRange.asStateFlow()

    private val _analyticsData = MutableStateFlow<AnalyticsStats?>(null)

    init {
        loadAnalytics()
    }

    fun loadAnalytics() {
        viewModelScope.launch {
            _uiState.value = AnalyticsUiState.Loading
            
            // 1. Fetch Scalars
            val statsResult = analyticsRepository.getAnalyticsStats()
            if (statsResult is ApiResult.Success) {
                // Initialize with scalars and calculate local metrics
                val rawStats = statsResult.data
                val paces = com.runflow.app.data.util.VdotCalculator.calculateTrainingPaces(rawStats.effectiveVO2max)
                val marathonDist = com.runflow.app.data.util.VdotCalculator.DISTANCE_MARATHON
                val optimal = com.runflow.app.data.util.VdotCalculator.predictRaceTime(rawStats.effectiveVO2max.toDouble(), marathonDist)
                
                // For predicted, we arguably should adjust by shape, but for now using optimal as base
                // or if backend sends prediction in future use that.
                val derivedStats = rawStats.copy(
                    trainingPaces = paces,
                    optimalTime = optimal,
                    predictedTime = optimal // Placeholder: Implement shape-based prediction if needed
                )
                
                _analyticsData.value = derivedStats
                
                // 2. Fetch History based on current range
                fetchHistoryForRange(_selectedTimeRange.value)
            } else if (statsResult is ApiResult.Error) {
                _uiState.value = AnalyticsUiState.Error(statsResult.message)
            }
        }
    }

    fun setTimeRange(timeRange: TimeRange) {
        _selectedTimeRange.value = timeRange
        // Re-fetch history when range changes
        viewModelScope.launch {
             fetchHistoryForRange(timeRange)
        }
    }

    private suspend fun fetchHistoryForRange(range: TimeRange) {
        val currentStats = _analyticsData.value ?: return
        
        // Calculate dates
        val endDate = java.time.LocalDate.now()
        val startDate = when {
            range.days != null -> endDate.minusDays(range.days.toLong())
            else -> endDate.minusYears(2) // "ALL" - use 2 years as reasonable max
        }
        
        val startStr = startDate.toString()
        val endStr = endDate.toString()
        
        // We set UI to loading? Or just keep showing old data + loading indicator?
        // For now, let's just keep current state until update.
        
        when (val historyResult = analyticsRepository.getAnalyticsHistory(startStr, endStr)) {
            is ApiResult.Success -> {
                val history = historyResult.data
                
                // Merge history into stats
                val mergedData = currentStats.copy(
                    vo2maxHistory = history.vo2max,
                    ctlHistory = history.ctl,
                    atlHistory = history.atl,
                    tsbHistory = history.tsb,
                    weeklyMileageHistory = history.weeklyMileage,
                    totalTimeHistory = history.totalTime
                )
                
                _analyticsData.value = mergedData
                _uiState.value = AnalyticsUiState.Success(mergedData)
            }
            is ApiResult.Error -> {
                // Keep showing scalars, maybe show toast?
                // For now, just show what we have (scalars)
                 _uiState.value = AnalyticsUiState.Success(currentStats)
            }
            is ApiResult.Loading -> {}
        }
    }
}

sealed class AnalyticsUiState {
    data object Loading : AnalyticsUiState()
    data class Success(val data: AnalyticsStats) : AnalyticsUiState()
    data class Error(val message: String) : AnalyticsUiState()
}
