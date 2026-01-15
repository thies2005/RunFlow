package com.runflow.app.ui.util

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.view.Surface
import android.view.Window
import android.view.WindowManager
import androidx.annotation.RequiresApi
import androidx.compose.runtime.compositionLocalOf
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Frame rate modes for adaptive display refresh rate control.
 */
enum class FrameRateMode {
    /** Use maximum refresh rate (e.g., 120Hz) for smoothest animations */
    HIGH_PERFORMANCE,
    /** Use balanced refresh rate (e.g., 60-90Hz) - default behavior */
    BALANCED,
    /** Use minimum refresh rate (e.g., 60Hz) for maximum battery savings */
    POWER_SAVER
}

/**
 * CompositionLocal to provide frame rate mode to composables.
 */
val LocalFrameRateMode = compositionLocalOf { FrameRateMode.BALANCED }

// DataStore for persisting frame rate preferences
private val Context.frameRateDataStore by preferencesDataStore(name = "frame_rate_prefs")

private val FRAME_RATE_MODE_KEY = stringPreferencesKey("frame_rate_mode")
private val ADAPTIVE_FRAME_RATE_KEY = stringPreferencesKey("adaptive_frame_rate_enabled")

/**
 * Manages adaptive frame rate based on user preferences and battery state.
 * 
 * Features:
 * - User-selectable frame rate modes (HIGH_PERFORMANCE, BALANCED, POWER_SAVER)
 * - Automatic adjustment based on battery level
 * - Integration with Android's display refresh rate APIs
 */
class FrameRateManager(private val context: Context) {
    
    private val scope = CoroutineScope(Dispatchers.Main)
    
    private val _currentMode = MutableStateFlow(FrameRateMode.BALANCED)
    val currentMode: StateFlow<FrameRateMode> = _currentMode.asStateFlow()
    
    private val _userSelectedMode = MutableStateFlow(FrameRateMode.BALANCED)
    val userSelectedMode: StateFlow<FrameRateMode> = _userSelectedMode.asStateFlow()
    
    private val _isAdaptiveEnabled = MutableStateFlow(true)
    val isAdaptiveEnabled: StateFlow<Boolean> = _isAdaptiveEnabled.asStateFlow()
    
    private var batteryReceiver: BroadcastReceiver? = null
    private var currentBatteryLevel: Int = 100
    private var isPowerSaveMode: Boolean = false
    
    init {
        loadPreferences()
        registerBatteryReceiver()
    }
    
    private fun loadPreferences() {
        scope.launch {
            // Load user-selected mode
            context.frameRateDataStore.data.map { prefs ->
                prefs[FRAME_RATE_MODE_KEY]?.let { 
                    try { FrameRateMode.valueOf(it) } catch (_: Exception) { FrameRateMode.BALANCED }
                } ?: FrameRateMode.BALANCED
            }.first().also { mode ->
                _userSelectedMode.value = mode
                updateEffectiveMode()
            }
            
            // Load adaptive setting
            context.frameRateDataStore.data.map { prefs ->
                prefs[ADAPTIVE_FRAME_RATE_KEY] != "false"
            }.first().also { enabled ->
                _isAdaptiveEnabled.value = enabled
                updateEffectiveMode()
            }
        }
    }
    
    /**
     * Flow to observe frame rate mode changes from preferences.
     */
    val frameRateModeFlow: Flow<FrameRateMode> = context.frameRateDataStore.data.map { prefs ->
        prefs[FRAME_RATE_MODE_KEY]?.let {
            try { FrameRateMode.valueOf(it) } catch (_: Exception) { FrameRateMode.BALANCED }
        } ?: FrameRateMode.BALANCED
    }
    
    /**
     * Flow to observe adaptive frame rate setting.
     */
    val adaptiveEnabledFlow: Flow<Boolean> = context.frameRateDataStore.data.map { prefs ->
        prefs[ADAPTIVE_FRAME_RATE_KEY] != "false"
    }
    
    private fun registerBatteryReceiver() {
        batteryReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    Intent.ACTION_BATTERY_CHANGED -> {
                        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                        currentBatteryLevel = if (level >= 0 && scale > 0) {
                            (level * 100 / scale)
                        } else 100
                        updateEffectiveMode()
                    }
                    "android.os.action.POWER_SAVE_MODE_CHANGED" -> {
                        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                        isPowerSaveMode = powerManager?.isPowerSaveMode == true
                        updateEffectiveMode()
                    }
                }
            }
        }
        
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_BATTERY_CHANGED)
            addAction("android.os.action.POWER_SAVE_MODE_CHANGED")
        }
        context.registerReceiver(batteryReceiver, filter)
        
        // Get initial power save mode state
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
        isPowerSaveMode = powerManager?.isPowerSaveMode == true
    }
    
    /**
     * Updates the effective frame rate mode based on user preference and battery state.
     */
    private fun updateEffectiveMode() {
        val effectiveMode = if (_isAdaptiveEnabled.value) {
            when {
                isPowerSaveMode -> FrameRateMode.POWER_SAVER
                currentBatteryLevel <= 15 -> FrameRateMode.POWER_SAVER
                currentBatteryLevel <= 30 -> FrameRateMode.BALANCED
                else -> _userSelectedMode.value
            }
        } else {
            _userSelectedMode.value
        }
        
        _currentMode.value = effectiveMode
    }
    
    /**
     * Sets the user-preferred frame rate mode.
     */
    fun setFrameRateMode(mode: FrameRateMode) {
        scope.launch {
            context.frameRateDataStore.edit { prefs ->
                prefs[FRAME_RATE_MODE_KEY] = mode.name
            }
            _userSelectedMode.value = mode
            updateEffectiveMode()
        }
    }
    
    /**
     * Enables or disables adaptive frame rate based on battery.
     */
    fun setAdaptiveEnabled(enabled: Boolean) {
        scope.launch {
            context.frameRateDataStore.edit { prefs ->
                prefs[ADAPTIVE_FRAME_RATE_KEY] = enabled.toString()
            }
            _isAdaptiveEnabled.value = enabled
            updateEffectiveMode()
        }
    }
    
    /**
     * Applies the current frame rate mode to the given window.
     * Should be called from MainActivity when mode changes.
     */
    fun applyToWindow(window: Window) {
        val mode = _currentMode.value
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            applyFrameRateApi30(window, mode)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            applyFrameRateApi23(window, mode)
        }
    }
    
    @RequiresApi(Build.VERSION_CODES.R)
    private fun applyFrameRateApi30(window: Window, mode: FrameRateMode) {
        val display = window.context.display ?: return
        val supportedModes = display.supportedModes
        
        if (supportedModes.isEmpty()) return
        
        // Sort modes by refresh rate
        val sortedModes = supportedModes.sortedBy { it.refreshRate }
        
        val targetMode = when (mode) {
            FrameRateMode.HIGH_PERFORMANCE -> sortedModes.lastOrNull()
            FrameRateMode.POWER_SAVER -> sortedModes.firstOrNull()
            FrameRateMode.BALANCED -> {
                // Pick a mode around 60-90Hz if available
                sortedModes.find { it.refreshRate in 60f..90f } 
                    ?: sortedModes.firstOrNull()
            }
        }
        
        targetMode?.let { displayMode ->
            window.attributes = window.attributes.apply {
                preferredDisplayModeId = displayMode.modeId
            }
        }
    }
    
    @Suppress("DEPRECATION")
    private fun applyFrameRateApi23(window: Window, mode: FrameRateMode) {
        // For older APIs, use preferred refresh rate hint
        val targetRefreshRate = when (mode) {
            FrameRateMode.HIGH_PERFORMANCE -> 120f
            FrameRateMode.BALANCED -> 60f
            FrameRateMode.POWER_SAVER -> 60f
        }
        
        window.attributes = window.attributes.apply {
            preferredRefreshRate = targetRefreshRate
        }
    }
    
    /**
     * Gets the frame rate value for the current mode (for display purposes).
     */
    fun getFrameRateLabel(mode: FrameRateMode): String {
        return when (mode) {
            FrameRateMode.HIGH_PERFORMANCE -> "High (up to 120Hz)"
            FrameRateMode.BALANCED -> "Balanced (60-90Hz)"
            FrameRateMode.POWER_SAVER -> "Power Saver (60Hz)"
        }
    }
    
    /**
     * Cleanup when the manager is no longer needed.
     */
    fun cleanup() {
        batteryReceiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (_: Exception) {
                // Receiver may not be registered
            }
        }
        batteryReceiver = null
    }
}
