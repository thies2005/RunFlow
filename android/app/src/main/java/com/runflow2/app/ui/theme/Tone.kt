package com.runflow2.app.ui.theme

import androidx.compose.ui.graphics.Color
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cbrt
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.pow
import kotlin.math.sin

/**
 * Minimal CIE-LCh (D65) colour math used to derive theme-aware colours.
 *
 * L* is identical to Material's HCT "tone", so `tone(...)` produces the same
 * lightness steps as the Material colour system; hue/chroma are close enough to
 * HCT for harmonizing data colours toward the scheme primary.
 */
internal data class Lch(val l: Float, val c: Float, val h: Float)

private const val EPS = 216f / 24389f
private const val KAPPA = 24389f / 27f
private const val WX = 0.95047f
private const val WY = 1f
private const val WZ = 1.08883f

private fun toLinear(c: Float): Float =
    if (c <= 0.04045f) c / 12.92f else ((c + 0.055f) / 1.055f).toDouble().pow(2.4).toFloat()

private fun fromLinear(c: Float): Float {
    val v = c.coerceIn(0f, 1f)
    return if (v <= 0.0031308f) v * 12.92f else (1.055f * v.toDouble().pow(1 / 2.4).toFloat() - 0.055f)
}

private fun f(t: Float): Float = if (t > EPS) cbrt(t) else (KAPPA * t + 16f) / 116f
private fun fInv(t: Float): Float = (t * t * t).let { if (it > EPS) it else (116f * t - 16f) / KAPPA }

internal fun Color.toLch(): Lch {
    val r = toLinear(red)
    val g = toLinear(green)
    val b = toLinear(blue)
    val x = (0.4124564f * r + 0.3575761f * g + 0.1804375f * b) / WX
    val y = (0.2126729f * r + 0.7151522f * g + 0.0721750f * b) / WY
    val z = (0.0193339f * r + 0.1191920f * g + 0.9503041f * b) / WZ
    val fx = f(x)
    val fy = f(y)
    val fz = f(z)
    val l = 116f * fy - 16f
    val a = 500f * (fx - fy)
    val bb = 200f * (fy - fz)
    var h = Math.toDegrees(atan2(bb, a).toDouble()).toFloat()
    if (h < 0) h += 360f
    return Lch(l, hypot(a, bb), h)
}

/** Linear sRGB for an LCh triple, or null when it is outside the sRGB gamut. */
private fun lchToLinear(l: Float, c: Float, h: Float): FloatArray? {
    val hr = Math.toRadians(h.toDouble())
    val a = (c * cos(hr)).toFloat()
    val b = (c * sin(hr)).toFloat()
    val fy = (l + 16f) / 116f
    val fx = fy + a / 500f
    val fz = fy - b / 200f
    val x = fInv(fx) * WX
    val y = (if (l > KAPPA * EPS) fy * fy * fy else l / KAPPA) * WY
    val z = fInv(fz) * WZ
    val r = 3.2404542f * x - 1.5371385f * y - 0.4985314f * z
    val g = -0.9692660f * x + 1.8760108f * y + 0.0415560f * z
    val bl = 0.0556434f * x - 0.2040259f * y + 1.0572252f * z
    val tol = 0.0005f
    if (r < -tol || r > 1 + tol || g < -tol || g > 1 + tol || bl < -tol || bl > 1 + tol) return null
    return floatArrayOf(r, g, bl)
}

/** Builds a colour from lightness/chroma/hue, reducing chroma until it fits sRGB. */
internal fun lchColor(l: Float, c: Float, h: Float): Color {
    val lc = l.coerceIn(0f, 100f)
    lchToLinear(lc, c, h)?.let { return Color(fromLinear(it[0]), fromLinear(it[1]), fromLinear(it[2])) }
    var lo = 0f
    var hi = c
    repeat(18) {
        val mid = (lo + hi) / 2f
        if (lchToLinear(lc, mid, h) != null) lo = mid else hi = mid
    }
    val rgb = lchToLinear(lc, lo, h) ?: floatArrayOf(lc / 100f, lc / 100f, lc / 100f)
    return Color(fromLinear(rgb[0]), fromLinear(rgb[1]), fromLinear(rgb[2]))
}

/**
 * Material-style hue harmonization: rotates [this] toward [source]'s hue by
 * half the hue distance, capped at 15°, keeping chroma and tone.
 */
internal fun Lch.harmonizedToward(source: Lch): Lch {
    var diff = source.h - h
    if (diff > 180f) diff -= 360f
    if (diff < -180f) diff += 360f
    val rotation = minOf(abs(diff) * 0.5f, 15f) * (if (diff < 0) -1f else 1f)
    var nh = h + rotation
    if (nh < 0) nh += 360f
    if (nh >= 360f) nh -= 360f
    return copy(h = nh)
}

/** Same hue & chroma (capped), new tone. */
internal fun Lch.atTone(tone: Float, maxChroma: Float = c): Color = lchColor(tone, minOf(c, maxChroma), h)
