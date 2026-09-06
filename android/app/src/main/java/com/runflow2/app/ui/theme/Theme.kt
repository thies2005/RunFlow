@file:OptIn(androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package com.runflow2.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.expressiveLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** RunFlow brand dark scheme — OLED black surfaces with the signature orange. */
private fun runflowDark(): ColorScheme = darkColorScheme().copy(
    primary = Color(0xFFFF8B5E),
    onPrimary = Color(0xFF4E1B00),
    primaryContainer = Color(0xFF6E370D),
    onPrimaryContainer = Color(0xFFFFDBC7),
    secondary = Color(0xFFE3BFB0),
    onSecondary = Color(0xFF40291D),
    secondaryContainer = Color(0xFF593F32),
    onSecondaryContainer = Color(0xFFFFDBCB),
    tertiary = Color(0xFF82D5C5),
    onTertiary = Color(0xFF003730),
    tertiaryContainer = Color(0xFF005047),
    onTertiaryContainer = Color(0xFFA0F2E0),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF000000),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF000000),
    onSurface = Color(0xFFE0E0E0),
    surfaceVariant = Color(0xFF1E1E1E),
    onSurfaceVariant = Color(0xFF9E9E9E),
    surfaceContainerLowest = Color(0xFF000000),
    surfaceContainerLow = Color(0xFF0D0D0D),
    surfaceContainer = Color(0xFF121212),
    surfaceContainerHigh = Color(0xFF1A1A1A),
    surfaceContainerHighest = Color(0xFF1F1F1F),
    outline = Color(0xFF5A5A5A),
    outlineVariant = Color(0xFF2A2A2A),
    inverseSurface = Color(0xFFE6E0DB),
    inverseOnSurface = Color(0xFF151311),
    inversePrimary = Color(0xFF8C4A1F),
)

/** RunFlow brand light scheme. */
private fun runflowLight(): ColorScheme = expressiveLightColorScheme().copy(
    primary = Color(0xFFE55A25),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFFDBCB),
    onPrimaryContainer = Color(0xFF380D00),
    secondary = Color(0xFF77574A),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFFFDBCB),
    onSecondaryContainer = Color(0xFF2C1509),
    tertiary = Color(0xFF006B5D),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFF9EF2E0),
    onTertiaryContainer = Color(0xFF00201B),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFFFFFFF),
    onBackground = Color(0xFF201A17),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF201A17),
    surfaceVariant = Color(0xFFF0E9E5),
    onSurfaceVariant = Color(0xFF52443C),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFBF4F0),
    surfaceContainer = Color(0xFFF5EFEA),
    surfaceContainerHigh = Color(0xFFEFE9E4),
    surfaceContainerHighest = Color(0xFFE9E3DE),
    outline = Color(0xFF85736A),
    outlineVariant = Color(0xFFD7C2B8),
    inverseSurface = Color(0xFF362F2B),
    inverseOnSurface = Color(0xFFFBF1EA),
    inversePrimary = Color(0xFFFFB691),
)

private val RunflowShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(22.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

private val RunflowTypography = Typography().let { t ->
    t.copy(
        headlineMedium = t.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
        headlineSmall = t.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
        titleLarge = t.titleLarge.copy(fontWeight = FontWeight.SemiBold),
        titleMedium = t.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        labelLarge = t.labelLarge.copy(fontWeight = FontWeight.Medium),
    )
}

@Composable
fun RunFlowTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> runflowDark()
        else -> runflowLight()
    }
    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        shapes = RunflowShapes,
        typography = RunflowTypography,
        content = content,
    )
}
