@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package com.runflow2.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.expressiveLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * RunFlow fallback dark scheme — authentic Google Pixel Material 3 tonal slate
 * surfaces (`#111316`..`#2B2F35`) with harmonized warm accents when Dynamic Color
 * is turned off.
 */
private fun runflowDark(): ColorScheme = darkColorScheme(
    primary = Color(0xFFFFB59A),
    onPrimary = Color(0xFF561F00),
    primaryContainer = Color(0xFF79310B),
    onPrimaryContainer = Color(0xFFFFDBCF),
    secondary = Color(0xFFE7BDB0),
    onSecondary = Color(0xFF442A20),
    secondaryContainer = Color(0xFF5D4035),
    onSecondaryContainer = Color(0xFFFFDBCF),
    tertiary = Color(0xFF8AD6C6),
    onTertiary = Color(0xFF00382F),
    tertiaryContainer = Color(0xFF005145),
    onTertiaryContainer = Color(0xFFA6F2E2),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF111316),
    onBackground = Color(0xFFE3E2E6),
    surface = Color(0xFF111316),
    onSurface = Color(0xFFE3E2E6),
    surfaceVariant = Color(0xFF43474E),
    onSurfaceVariant = Color(0xFFC4C6D0),
    surfaceContainerLowest = Color(0xFF0C0E11),
    surfaceContainerLow = Color(0xFF191C20),
    surfaceContainer = Color(0xFF1D2024),
    surfaceContainerHigh = Color(0xFF282A2F),
    surfaceContainerHighest = Color(0xFF33353A),
    outline = Color(0xFF8E9099),
    outlineVariant = Color(0xFF35383F),
    inverseSurface = Color(0xFFE3E2E6),
    inverseOnSurface = Color(0xFF2E3035),
    inversePrimary = Color(0xFF9C4319),
)

/**
 * RunFlow fallback light scheme — clean Pixel alabaster/neutral surfaces with
 * subtle tonal warmth when Dynamic Color is turned off.
 */
private fun runflowLight(): ColorScheme = expressiveLightColorScheme().copy(
    primary = Color(0xFFC84B17),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFFDBCF),
    onPrimaryContainer = Color(0xFF380D00),
    secondary = Color(0xFF77574B),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFFFDBCF),
    onSecondaryContainer = Color(0xFF2C160D),
    tertiary = Color(0xFF006B5D),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFA6F2E2),
    onTertiaryContainer = Color(0xFF00201B),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFF8F9FB),
    onBackground = Color(0xFF191C20),
    surface = Color(0xFFF8F9FB),
    onSurface = Color(0xFF191C20),
    surfaceVariant = Color(0xFFE0E2EC),
    onSurfaceVariant = Color(0xFF44474E),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF2F3F7),
    surfaceContainer = Color(0xFFECEEF2),
    surfaceContainerHigh = Color(0xFFE6E8EC),
    surfaceContainerHighest = Color(0xFFE1E2E7),
    outline = Color(0xFF74777F),
    outlineVariant = Color(0xFFC4C6D0),
    inverseSurface = Color(0xFF2E3035),
    inverseOnSurface = Color(0xFFF0F0F5),
    inversePrimary = Color(0xFFFFB59A),
)

/**
 * Converts a dark [ColorScheme] into an AMOLED pitch-black scheme while preserving
 * the wallpaper Monet tint across `surfaceContainer*` elevation tiers.
 */
fun ColorScheme.withAmoledBlack(enabled: Boolean): ColorScheme {
    if (!enabled) return this
    return copy(
        background = Color.Black,
        surface = Color.Black,
        surfaceContainerLowest = Color.Black,
        surfaceContainerLow = lerp(surfaceContainerLow, Color.Black, 0.55f),
        surfaceContainer = lerp(surfaceContainer, Color.Black, 0.45f),
        surfaceContainerHigh = lerp(surfaceContainerHigh, Color.Black, 0.35f),
        surfaceContainerHighest = lerp(surfaceContainerHighest, Color.Black, 0.25f),
    )
}

val RunflowShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/**
 * Android 15/16 Pixel Settings segmented card geometry:
 * 24dp outer corners, 4dp inner corners, 2dp vertical spacing between items.
 */
object SegmentedCardShapes {
    val ItemGap: Dp = 2.dp

    fun shapeForIndex(
        index: Int,
        count: Int,
        outerRadius: Dp = 24.dp,
        innerRadius: Dp = 4.dp,
    ): RoundedCornerShape = when {
        count <= 1 -> RoundedCornerShape(outerRadius)
        index == 0 -> RoundedCornerShape(
            topStart = outerRadius,
            topEnd = outerRadius,
            bottomStart = innerRadius,
            bottomEnd = innerRadius,
        )
        index == count - 1 -> RoundedCornerShape(
            topStart = innerRadius,
            topEnd = innerRadius,
            bottomStart = outerRadius,
            bottomEnd = outerRadius,
        )
        else -> RoundedCornerShape(innerRadius)
    }
}

@Composable
fun RunFlowTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    amoledBlack: Boolean = false,
    content: @Composable () -> Unit,
) {
    val baseScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> runflowDark()
        else -> runflowLight()
    }
    val colorScheme = if (darkTheme) baseScheme.withAmoledBlack(amoledBlack) else baseScheme
    val semanticColors = remember(colorScheme) { createSemanticColors(colorScheme) }

    CompositionLocalProvider(LocalRunFlowColors provides semanticColors) {
        MaterialExpressiveTheme(
            colorScheme = colorScheme,
            shapes = RunflowShapes,
            typography = RunflowTypography,
            content = content,
        )
    }
}
