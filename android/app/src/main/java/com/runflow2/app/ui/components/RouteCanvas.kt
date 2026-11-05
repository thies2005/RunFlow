package com.runflow2.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.runflow2.app.ui.theme.semanticColors
import kotlin.math.roundToInt
import kotlin.math.abs

enum class RouteColorMode {
    ROUTE,
    PACE,
    HR,
}

/**
 * Pure vector GPS route canvas (100% on-device, no Google Maps / Mapbox SDK dependency).
 * Supports coloring polyline segments by Route, Pace gradient, or HR zone gradient,
 * and renders a synchronized scrub highlight dot along the GPS loop when scrubbing
 * [StreamsChart].
 */
@Composable
fun RouteCanvas(
    points: List<Pair<Double, Double>>,
    modifier: Modifier = Modifier,
    strokeColor: Color = MaterialTheme.colorScheme.primary,
    trailColor: Color = MaterialTheme.colorScheme.outlineVariant,
    mode: RouteColorMode = RouteColorMode.ROUTE,
    paceValues: List<Double>? = null,
    hrValues: List<Int>? = null,
    scrubFraction: Float? = null,
) {
    val startDot = MaterialTheme.semanticColors.good
    val endDot = MaterialTheme.colorScheme.error
    val scrubDot = MaterialTheme.colorScheme.primary
    val samples = remember(points) { routeSamples(points) }
    val routePoints = remember(samples) { samples.map { it.point } }

    Canvas(modifier.semantics { contentDescription = "GPS route from start to finish" }) {
        if (routePoints.size < 2) return@Canvas
        val projected = projectRoute(routePoints, size.width.toDouble(), size.height.toDouble())
        if (projected.size < 2) return@Canvas
        fun toOffset(index: Int): Offset {
            val coordinate = projected[index]
            return Offset(coordinate.first.toFloat(), coordinate.second.toFloat())
        }

        // 1. Draw background trail path for smooth joins
        val trailPath = Path()
        routePoints.forEachIndexed { i, _ ->
            val o = toOffset(i)
            if (i == 0) trailPath.moveTo(o.x, o.y) else trailPath.lineTo(o.x, o.y)
        }
        drawPath(trailPath, trailColor, style = Stroke(width = 7.dp.toPx(), cap = StrokeCap.Round))

        // 2. Draw foreground segments according to mode
        when (mode) {
            RouteColorMode.ROUTE -> {
                drawPath(trailPath, strokeColor, style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round))
            }
            RouteColorMode.PACE -> {
                val validPace = paceValues?.filter { it.isFinite() && it > 0.0 }.orEmpty()
                if (validPace.size >= 2) {
                    val sorted = validPace.sorted()
                    val p10 = sorted[(sorted.size * 0.10).toInt()]
                    val p90 = sorted[(sorted.size * 0.90).toInt()]
                    val pSpan = (p90 - p10).coerceAtLeast(1.0)

                    for (i in 0 until routePoints.size - 1) {
                        val sampleIdx = (samples[i].fraction * (paceValues!!.size - 1)).roundToInt()
                            .coerceIn(0, paceValues.size - 1)
                        val pace = paceValues[sampleIdx]
                        // Faster pace (lower sec/km) -> green/cyan; Slower pace (higher sec/km) -> orange/red
                        val norm = ((pace - p10) / pSpan).coerceIn(0.0, 1.0).toFloat()
                        val segColor = interpolatePaceColor(norm)
                        drawLine(
                            color = segColor,
                            start = toOffset(i),
                            end = toOffset(i + 1),
                            strokeWidth = 3.5.dp.toPx(),
                            cap = StrokeCap.Round,
                        )
                    }
                } else {
                    drawPath(trailPath, strokeColor, style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round))
                }
            }
            RouteColorMode.HR -> {
                val validHr = hrValues?.filter { it > 0 }.orEmpty()
                if (validHr.size >= 2) {
                    for (i in 0 until routePoints.size - 1) {
                        val sampleIdx = (samples[i].fraction * (hrValues!!.size - 1)).roundToInt()
                            .coerceIn(0, hrValues.size - 1)
                        val hr = hrValues[sampleIdx]
                        val segColor = hrZoneColor(hr)
                        drawLine(
                            color = segColor,
                            start = toOffset(i),
                            end = toOffset(i + 1),
                            strokeWidth = 3.5.dp.toPx(),
                            cap = StrokeCap.Round,
                        )
                    }
                } else {
                    drawPath(trailPath, strokeColor, style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round))
                }
            }
        }

        // 3. Start / finish markers
        drawCircle(startDot, 7.dp.toPx(), toOffset(0))
        drawCircle(endDot, 4.dp.toPx(), toOffset(routePoints.lastIndex))

        // 4. Synchronized chart scrubber dot
        if (scrubFraction != null && routePoints.isNotEmpty()) {
            val scrubIdx = samples.indices.minByOrNull { abs(samples[it].fraction - scrubFraction.coerceIn(0f, 1f)) } ?: 0
            val scrubCenter = toOffset(scrubIdx)
            // Outer glow halo
            drawCircle(Color.White.copy(alpha = 0.6f), radius = 10.dp.toPx(), center = scrubCenter)
            // Accent border
            drawCircle(scrubDot, radius = 6.5.dp.toPx(), center = scrubCenter)
            // White core dot
            drawCircle(Color.White, radius = 3.5.dp.toPx(), center = scrubCenter)
        }
    }
}

private fun interpolatePaceColor(ratio: Float): Color {
    // ratio: 0.0 = fast, 1.0 = slow
    return when {
        ratio < 0.25f -> {
            val t = ratio / 0.25f
            lerp(Color(0xFF29B6F6), Color(0xFF26A69A), t) // Cyan -> Teal
        }
        ratio < 0.50f -> {
            val t = (ratio - 0.25f) / 0.25f
            lerp(Color(0xFF26A69A), Color(0xFF66BB6A), t) // Teal -> Green
        }
        ratio < 0.75f -> {
            val t = (ratio - 0.50f) / 0.25f
            lerp(Color(0xFF66BB6A), Color(0xFFFFA726), t) // Green -> Orange
        }
        else -> {
            val t = (ratio - 0.75f) / 0.25f
            lerp(Color(0xFFFFA726), Color(0xFFEF5350), t) // Orange -> Red
        }
    }
}

private fun hrZoneColor(hr: Int): Color {
    return when {
        hr < 125 -> Color(0xFF42A5F5) // Blue (Recovery)
        hr < 145 -> Color(0xFF66BB6A) // Green (Aerobic Z2)
        hr < 160 -> Color(0xFFFFEE58) // Yellow (Tempo Z3)
        hr < 172 -> Color(0xFFFFA726) // Orange (Threshold Z4)
        else -> Color(0xFFEF5350)     // Red (Anaerobic / Max Z5)
    }
}

private fun lerp(start: Color, end: Color, fraction: Float): Color {
    val f = fraction.coerceIn(0f, 1f)
    return Color(
        red = start.red + f * (end.red - start.red),
        green = start.green + f * (end.green - start.green),
        blue = start.blue + f * (end.blue - start.blue),
        alpha = start.alpha + f * (end.alpha - start.alpha),
    )
}
