package com.runflow.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = DarkPrimary,
    secondary = DarkSecondary,
    tertiary = DarkTertiary,
    background = DarkBackground,
    surface = DarkSurface,
    onPrimary = DarkOnPrimary,
    onSecondary = DarkOnPrimary,
    onTertiary = DarkOnPrimary,
    onBackground = DarkOnBackground,
    onSurface = DarkOnBackground,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    primaryContainer = AccentOrange.copy(alpha = 0.15f),
    secondaryContainer = AccentPink.copy(alpha = 0.15f),
    tertiaryContainer = AccentCyan.copy(alpha = 0.15f),
    onPrimaryContainer = AccentOrange,
    onSecondaryContainer = AccentPink,
    onTertiaryContainer = AccentCyan,
    error = Zone5Max,
    onError = DarkOnPrimary,
    errorContainer = Zone5Max.copy(alpha = 0.15f),
    onErrorContainer = Zone5Max
)

private val LightColorScheme = lightColorScheme(
    primary = LightPrimary,
    secondary = LightSecondary,
    tertiary = LightTertiary,
    background = LightBackground,
    surface = LightSurface,
    onPrimary = LightOnPrimary,
    onSecondary = LightOnPrimary,
    onTertiary = LightOnPrimary,
    onBackground = LightOnBackground,
    onSurface = LightOnBackground,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    primaryContainer = AccentOrange.copy(alpha = 0.1f),
    secondaryContainer = AccentPink.copy(alpha = 0.1f),
    tertiaryContainer = AccentCyan.copy(alpha = 0.1f),
    onPrimaryContainer = AccentOrange,
    onSecondaryContainer = AccentPink,
    onTertiaryContainer = AccentCyan,
    error = Zone5Max,
    onError = LightOnPrimary,
    errorContainer = Zone5Max.copy(alpha = 0.1f),
    onErrorContainer = Zone5Max
)

@Composable
fun RunFlowTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color disabled by default for brand consistency
    dynamicColor: Boolean = false, 
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
