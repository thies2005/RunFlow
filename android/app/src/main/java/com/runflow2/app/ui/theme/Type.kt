@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)

package com.runflow2.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.runflow2.app.R

/*
 * Google Sans Flex (SIL OFL 1.1, licence in assets/licenses/) — the Pixel system
 * typeface. The bundled file is a Latin subset with only the weight and optical
 * size axes kept, so each FontWeight maps to a variation instance.
 */

private val Weights = listOf(300, 400, 500, 600, 700, 800)

private fun googleSans(opticalSize: Float): FontFamily = FontFamily(
    Weights.map { w ->
        Font(
            resId = R.font.google_sans_flex,
            weight = FontWeight(w),
            variationSettings = FontVariation.Settings(
                FontVariation.weight(w),
                FontVariation.Setting("opsz", opticalSize),
            ),
        )
    },
)

/** Text-size cut (body, labels, titles). */
val GoogleSansText: FontFamily = googleSans(opticalSize = 17f)

/** Display cut — tighter spacing & finer details for large numerals/headlines. */
val GoogleSansDisplay: FontFamily = googleSans(opticalSize = 48f)

/** Tabular figures so live timers, paces and split tables never jitter. */
private const val TNUM = "tnum"

private fun TextStyle.display(weight: Int = 400) =
    copy(fontFamily = GoogleSansDisplay, fontWeight = FontWeight(weight), fontFeatureSettings = TNUM)

private fun TextStyle.text(weight: Int, tracking: Float, tnum: Boolean = false) = copy(
    fontFamily = GoogleSansText,
    fontWeight = FontWeight(weight),
    letterSpacing = tracking.sp,
    fontFeatureSettings = if (tnum) TNUM else null,
)

internal val RunflowTypography: Typography = Typography().let { t ->
    Typography(
        displayLarge = t.displayLarge.display().copy(letterSpacing = (-0.5).sp),
        displayMedium = t.displayMedium.display(),
        displaySmall = t.displaySmall.display(),
        headlineLarge = t.headlineLarge.display(),
        headlineMedium = t.headlineMedium.display(),
        headlineSmall = t.headlineSmall.display(),
        titleLarge = t.titleLarge.text(weight = 400, tracking = 0f, tnum = true),
        titleMedium = t.titleMedium.text(weight = 500, tracking = 0.1f, tnum = true),
        titleSmall = t.titleSmall.text(weight = 500, tracking = 0.1f),
        bodyLarge = t.bodyLarge.text(weight = 400, tracking = 0.1f),
        bodyMedium = t.bodyMedium.text(weight = 400, tracking = 0.15f),
        bodySmall = t.bodySmall.text(weight = 400, tracking = 0.2f),
        labelLarge = t.labelLarge.text(weight = 500, tracking = 0.1f, tnum = true),
        labelMedium = t.labelMedium.text(weight = 500, tracking = 0.3f, tnum = true),
        labelSmall = t.labelSmall.text(weight = 500, tracking = 0.4f, tnum = true),
    )
}
