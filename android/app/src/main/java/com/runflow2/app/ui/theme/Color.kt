package com.runflow2.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

// Seed brand & domain colors (used as inputs to LCh hue harmonization)
val BrandOrange = Color(0xFFFF6B35)
val BrandOrangeDark = Color(0xFFE55A25)
val BrandOrangeLight = Color(0xFFFF8B5E)

val ChartCtl = Color(0xFF34A853)
val ChartAtl = Color(0xFFFB8C00)
val ChartTsb = Color(0xFF00ACC1)
val Vo2Accent = Color(0xFFF59E0B)
val MarathonBlue = Color(0xFF4285F4)

val StatusPeaked = Color(0xFF00ACC1)
val StatusFresh = Color(0xFF34A853)
val StatusNeutral = Color(0xFFFBBC04)
val StatusFatigued = Color(0xFFFB8C00)
val StatusVeryFatigued = Color(0xFFEA4335)

val SuccessGreen = Color(0xFF34A853)
val WarningAmber = Color(0xFFFBBC04)

// Seed HR / Power zone colors Z1..Z7
val ZoneColors = listOf(
    Color(0xFF78909C), // Z1 Recovery (Slate)
    Color(0xFF26A69A), // Z2 Endurance (Teal)
    Color(0xFF34A853), // Z3 Tempo (Green)
    Color(0xFFFBBC04), // Z4 Threshold (Amber)
    Color(0xFFFB8C00), // Z5 VO2max (Orange)
    Color(0xFFF4511E), // Z6 Anaerobic (Deep Orange)
    Color(0xFFEA4335), // Z7 Neuromuscular (Red)
)

@Immutable
data class ColorPair(
    val accent: Color,
    val onAccent: Color,
    val container: Color,
    val onContainer: Color,
)

@Immutable
data class RunFlowSemanticColors(
    val isDark: Boolean,
    val ctl: Color,
    val atl: Color,
    val tsb: Color,
    val vo2: Color,
    val marathon: Color,
    val statusPeaked: Color,
    val statusFresh: Color,
    val statusNeutral: Color,
    val statusFatigued: Color,
    val statusVeryFatigued: Color,
    val good: Color,
    val warn: Color,
    val zones: List<Color>,
    val zonePairs: List<ColorPair>,
    val streamHr: Color,
    val streamPace: Color,
    val streamGap: Color,
    val streamElev: Color,
    val streamCadence: Color,
    val streamPower: Color,
) {
    fun harmonizePair(seed: Color): ColorPair = buildPair(seed, primaryLch, isDark)
    internal var primaryLch: Lch = BrandOrange.toLch()
}

private fun buildPair(seed: Color, primaryLch: Lch, isDark: Boolean): ColorPair {
    val h = seed.toLch().harmonizedToward(primaryLch)
    return if (isDark) {
        ColorPair(
            accent = h.atTone(78f, maxChroma = 64f),
            onAccent = h.atTone(18f, maxChroma = 36f),
            container = h.atTone(26f, maxChroma = 40f),
            onContainer = h.atTone(90f, maxChroma = 36f),
        )
    } else {
        ColorPair(
            accent = h.atTone(44f, maxChroma = 68f),
            onAccent = Color.White,
            container = h.atTone(92f, maxChroma = 32f),
            onContainer = h.atTone(20f, maxChroma = 42f),
        )
    }
}

internal fun createSemanticColors(scheme: ColorScheme): RunFlowSemanticColors {
    val isDark = scheme.surface.luminance() < 0.5f
    val primaryLch = scheme.primary.toLch()

    fun accent(seed: Color): Color {
        val h = seed.toLch().harmonizedToward(primaryLch)
        return if (isDark) h.atTone(76f, maxChroma = 64f) else h.atTone(46f, maxChroma = 68f)
    }

    val zonePairs = ZoneColors.map { buildPair(it, primaryLch, isDark) }
    val zones = zonePairs.map { it.accent }

    return RunFlowSemanticColors(
        isDark = isDark,
        ctl = accent(ChartCtl),
        atl = accent(ChartAtl),
        tsb = accent(ChartTsb),
        vo2 = accent(Vo2Accent),
        marathon = accent(MarathonBlue),
        statusPeaked = accent(StatusPeaked),
        statusFresh = accent(StatusFresh),
        statusNeutral = accent(StatusNeutral),
        statusFatigued = accent(StatusFatigued),
        statusVeryFatigued = accent(StatusVeryFatigued),
        good = accent(SuccessGreen),
        warn = accent(WarningAmber),
        zones = zones,
        zonePairs = zonePairs,
        streamHr = accent(Color(0xFFEA4335)),
        streamPace = accent(Color(0xFF4285F4)),
        streamGap = accent(Color(0xFF00ACC1)),
        streamElev = accent(Color(0xFF34A853)),
        streamCadence = accent(Color(0xFFFBBC04)),
        streamPower = accent(Color(0xFFFB8C00)),
    ).also { it.primaryLch = primaryLch }
}

val LocalRunFlowColors = staticCompositionLocalOf {
    createSemanticColors(androidx.compose.material3.darkColorScheme())
}

val MaterialTheme.semanticColors: RunFlowSemanticColors
    @Composable
    @ReadOnlyComposable
    get() = LocalRunFlowColors.current
