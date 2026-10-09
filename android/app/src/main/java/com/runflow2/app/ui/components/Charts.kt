package com.runflow2.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.math.TrainingLoad
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.DailyEntryEntity
import com.runflow2.app.domain.analytics.WeekVolume
import com.runflow2.app.ui.theme.ChartAtl
import com.runflow2.app.ui.theme.ChartCtl
import com.runflow2.app.ui.theme.ChartTsb
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

private val monthFmt = DateTimeFormatter.ofPattern("MMM d")

/**
 * CTL / ATL / TSB line chart with a drag scrubber.
 */
@Composable
fun FitnessChart(
    daily: List<TrainingLoad.DailyLoad>,
    showCtl: Boolean,
    showAtl: Boolean,
    showTsb: Boolean,
    modifier: Modifier = Modifier,
    height: Int = 220,
) {
    var scrubIndex by remember { mutableStateOf<Int?>(null) }
    val lineColor = MaterialTheme.colorScheme.outlineVariant
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val ctlColor = ChartCtl
    val atlColor = ChartAtl
    val tsbColor = ChartTsb
    val scrubColor = MaterialTheme.colorScheme.primary

    val point = scrubIndex?.let { daily.getOrNull(it) }

    Column(modifier = modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp),
        ) {
            val legend = buildList {
                if (showCtl) add("CTL" to ctlColor)
                if (showAtl) add("ATL" to atlColor)
                if (showTsb) add("TSB" to tsbColor)
            }
            if (point != null) {
                Text(
                    text = buildString {
                        append(point.date.format(monthFmt))
                        if (showCtl) append("   CTL ${point.ctl.roundToInt()}")
                        if (showAtl) append("   ATL ${point.atl.roundToInt()}")
                        if (showTsb) append("   TSB ${point.tsb.roundToInt()}")
                    },
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                )
            } else {
                legend.forEachIndexed { i, (label, color) ->
                    if (i > 0) Spacer(Modifier.width(12.dp))
                    Canvas(Modifier.size(8.dp)) { drawCircle(color) }
                    Spacer(Modifier.width(4.dp))
                    Text(label, style = MaterialTheme.typography.labelMedium, color = labelColor)
                }
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height.dp)
                .pointerInput(daily.size) {
                    detectDragGestures { change, _ ->
                        val x = change.position.x
                        val w = size.width.toFloat()
                        val frac = (x / w).coerceIn(0f, 1f)
                        scrubIndex = (frac * (daily.size - 1)).roundToInt()
                        change.consume()
                    }
                },
        ) {
            if (daily.size < 2) return@Canvas
            val w = size.width
            val h = size.height
            val padTop = 8f
            val padBottom = 6f

            var minV = 0.0
            var maxV = 1.0
            daily.forEach { d ->
                if (showCtl) { minV = minOf(minV, d.ctl); maxV = maxOf(maxV, d.ctl) }
                if (showAtl) { minV = minOf(minV, d.atl); maxV = maxOf(maxV, d.atl) }
                if (showTsb) { minV = minOf(minV, d.tsb); maxV = maxOf(maxV, d.tsb) }
            }
            val range = (maxV - minV).coerceAtLeast(1.0)

            fun px(i: Int) = i.toFloat() / (daily.size - 1) * w
            fun py(v: Double) = (padTop + (1f - ((v - minV) / range).toFloat()) * (h - padTop - padBottom))

            // gridlines at 0 and max/2
            listOf(0.0, minV + range / 2, maxV).forEach { v ->
                if (showTsb || v >= 0) {
                    drawLine(
                        lineColor.copy(alpha = 0.5f),
                        Offset(0f, py(v)),
                        Offset(w, py(v)),
                        strokeWidth = 1f,
                    )
                }
            }

            fun drawSeries(selector: (TrainingLoad.DailyLoad) -> Double, color: Color) {
                val path = Path()
                val fillPath = Path()
                daily.forEachIndexed { i, d ->
                    val x = px(i)
                    val y = py(selector(d))
                    if (i == 0) {
                        path.moveTo(x, y)
                        fillPath.moveTo(x, y)
                    } else {
                        path.lineTo(x, y)
                        fillPath.lineTo(x, y)
                    }
                }
                drawPath(
                    fillPath,
                    Brush.verticalGradient(
                        listOf(color.copy(alpha = 0.10f), Color.Transparent),
                    ),
                )
                drawPath(path, color, style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round))
            }

            if (showAtl) drawSeries({ it.atl }, atlColor)
            if (showCtl) drawSeries({ it.ctl }, ctlColor)
            if (showTsb) drawSeries({ it.tsb }, tsbColor)

            // scrubber
            scrubIndex?.let { i ->
                val x = px(i.coerceIn(0, daily.size - 1))
                drawLine(
                    scrubColor.copy(alpha = 0.8f),
                    Offset(x, 0f),
                    Offset(x, h),
                    strokeWidth = 1.5.dp.toPx(),
                )
                listOf(
                    daily[i].ctl to ctlColor,
                    daily[i].atl to atlColor,
                    daily[i].tsb to tsbColor,
                ).forEach { (v, c) ->
                    drawCircle(c, radius = 5.dp.toPx(), center = Offset(x, py(v)))
                }
            }
        }
        // x-axis labels
        Row(Modifier.fillMaxWidth()) {
            val first = daily.firstOrNull()?.date
            val last = daily.lastOrNull()?.date
            if (first != null && last != null) {
                Text(
                    first.format(monthFmt),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    last.format(monthFmt),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                )
            }
        }
    }
}

/** Weekly volume bar chart. */
@Composable
fun WeeklyVolumeBars(
    weeks: List<WeekVolume>,
    unitLabel: String,
    modifier: Modifier = Modifier,
    barColor: Color = MaterialTheme.colorScheme.primary,
) {
    val maxKm = (weeks.maxOfOrNull { it.km } ?: 1.0).coerceAtLeast(1.0)
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val outline = MaterialTheme.colorScheme.outlineVariant
    Column(modifier) {
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(120.dp),
        ) {
            val n = weeks.size.coerceAtLeast(1)
            val gap = 3.dp.toPx()
            val bw = (size.width - gap * (n - 1)) / n
            val base = size.height
            weeks.forEachIndexed { i, wk ->
                val frac = (wk.km / maxKm).toFloat().coerceIn(0f, 1f)
                val bh = frac * (base - 8f)
                drawRoundRect(
                    color = if (i == weeks.size - 1) barColor else barColor.copy(alpha = 0.45f),
                    topLeft = Offset(i * (bw + gap), base - bh),
                    size = androidx.compose.ui.geometry.Size(bw, bh),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(bw / 3f),
                )
            }
            drawLine(outline, Offset(0f, base), Offset(size.width, base), 1f)
        }
        Row(Modifier.fillMaxWidth()) {
            Text(
                "%.0f %s".format(weeks.lastOrNull()?.km ?: 0.0, unitLabel),
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
            Spacer(Modifier.weight(1f))
            Text(
                "max %.0f".format(maxKm),
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
        }
    }
}

/** 7-zone HR distribution as horizontal bars. */
@Composable
fun ZoneDistribution(zonesSeconds: List<Int>, modifier: Modifier = Modifier) {
    val total = zonesSeconds.sum().coerceAtLeast(1)
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    Column(modifier, verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(6.dp)) {
        zonesSeconds.forEachIndexed { i, sec ->
            val frac = sec.toFloat() / total
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text(
                    "Z${i + 1}",
                    style = MaterialTheme.typography.labelMedium,
                    color = labelColor,
                    modifier = Modifier.width(24.dp),
                )
                Canvas(
                    Modifier
                        .weight(1f)
                        .height(14.dp),
                ) {
                    drawRoundRect(
                        com.runflow2.app.ui.theme.ZoneColors[i].copy(alpha = 0.25f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(7.dp.toPx()),
                    )
                    if (frac > 0.005f) {
                        drawRoundRect(
                            com.runflow2.app.ui.theme.ZoneColors[i],
                            size = androidx.compose.ui.geometry.Size(size.width * frac, size.height),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(7.dp.toPx()),
                        )
                    }
                }
                Text(
                    Format.duration(sec.toLong()),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                    modifier = Modifier
                        .width(56.dp)
                        .padding(start = 8.dp),
                )
            }
        }
    }
}

/** Draws a GPS route polyline normalized to the canvas. */
@Composable
fun RouteCanvas(
    points: List<Pair<Double, Double>>,
    modifier: Modifier = Modifier,
    strokeColor: Color = MaterialTheme.colorScheme.primary,
    trailColor: Color = MaterialTheme.colorScheme.outlineVariant,
) {
    Canvas(modifier) {
        if (points.size < 2) return@Canvas
        val lats = points.map { it.first }
        val lngs = points.map { it.second }
        val minLat = lats.min(); val maxLat = lats.max()
        val minLng = lngs.min(); val maxLng = lngs.max()
        val latRange = (maxLat - minLat).coerceAtLeast(1e-5)
        val lngRange = (maxLng - minLng).coerceAtLeast(1e-5)
        val scale = minOf(size.width / lngRange, size.height / latRange) * 0.86f
        val offsetX = (size.width - (lngRange * scale).toFloat()) / 2f
        val offsetY = (size.height - (latRange * scale).toFloat()) / 2f

        fun toOffset(p: Pair<Double, Double>) = Offset(
            offsetX + ((p.second - minLng) * scale).toFloat(),
            offsetY + ((maxLat - p.first) * scale).toFloat(),
        )

        val path = Path()
        points.forEachIndexed { i, p ->
            val o = toOffset(p)
            if (i == 0) path.moveTo(o.x, o.y) else path.lineTo(o.x, o.y)
        }
        drawPath(path, trailColor, style = Stroke(width = 7.dp.toPx(), cap = StrokeCap.Round))
        drawPath(path, strokeColor, style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round))
        // start / finish markers
        drawCircle(Color(0xFF4CAF50), 5.dp.toPx(), toOffset(points.first()))
        drawCircle(Color(0xFFE53935), 5.dp.toPx(), toOffset(points.last()))
    }
}

/** Circular progress ring on canvas. */
@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    trackColor: Color = MaterialTheme.colorScheme.surfaceContainerHighest,
    strokeWidth: Float = 10f,
) {
    Canvas(modifier) {
        val stroke = strokeWidth.dp.toPx().coerceAtMost(size.minDimension / 6f)
        val inset = stroke / 2
        drawArc(
            trackColor,
            0f,
            360f,
            false,
            androidx.compose.ui.geometry.Offset(inset, inset),
            androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke),
            style = Stroke(stroke, cap = StrokeCap.Round),
        )
        drawArc(
            color,
            -90f,
            360f * progress.coerceIn(0f, 1f),
            false,
            androidx.compose.ui.geometry.Offset(inset, inset),
            androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke),
            style = Stroke(stroke, cap = StrokeCap.Round),
        )
    }
}

/** Small inline sparkline. */
@Composable
fun Sparkline(
    values: List<Double>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
) {
    Canvas(modifier) {
        if (values.size < 2) return@Canvas
        val minV = values.min()
        val maxV = values.max()
        val range = (maxV - minV).coerceAtLeast(1e-6)
        val path = Path()
        values.forEachIndexed { i, v ->
            val x = i.toFloat() / (values.size - 1) * size.width
            val y = (1f - ((v - minV) / range).toFloat()) * (size.height - 4f) + 2f
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(path, color, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
    }
}

/** Parses the daily-entry yyyy-MM-dd key; null on malformed rows. */
private fun parseDay(date: String): LocalDate? = runCatching { LocalDate.parse(date) }.getOrNull()

/** Normalizes [v] against the series min/max; flat series spread over 1.0. */
private fun normFrac(values: List<Double>, v: Double): Float {
    val range = (values.max() - values.min()).coerceAtLeast(1.0)
    return ((v - values.min()) / range).toFloat().coerceIn(0f, 1f)
}

/** Visual style for the recovery/readiness trend charts. */
enum class GraphStyle {
    /** Data points only. */
    DOTS,

    /** Line through the points, points on top. */
    LINE_DOTS,

    /** Line with a soft gradient fill under it, points on top. */
    LINE_FILL,

    /** Smoothed curve (midpoint quadratics) with gradient fill, points on top. */
    SMOOTH_FILL,
}

/** Builds the through-line for a series: polyline, or midpoint-quadratic smoothing when [smooth]. */
private fun seriesPath(offsets: List<Offset>, smooth: Boolean): Path {
    val path = Path()
    if (offsets.isEmpty()) return path
    path.moveTo(offsets.first().x, offsets.first().y)
    if (!smooth || offsets.size < 3) {
        offsets.drop(1).forEach { path.lineTo(it.x, it.y) }
    } else {
        for (i in 1 until offsets.size) {
            val prev = offsets[i - 1]
            val curr = offsets[i]
            path.quadraticTo((prev.x + curr.x) / 2f, prev.y, curr.x, (prev.y + curr.y) / 2f)
        }
        path.lineTo(offsets.last().x, offsets.last().y)
    }
    return path
}

/** [seriesPath] closed down to [bottomY] — the shape a gradient fill paints. */
private fun seriesFillPath(offsets: List<Offset>, smooth: Boolean, bottomY: Float): Path {
    val path = seriesPath(offsets, smooth)
    if (offsets.isNotEmpty()) {
        path.lineTo(offsets.last().x, bottomY)
        path.lineTo(offsets.first().x, bottomY)
        path.close()
    }
    return path
}

/** Fill (per style), line (per style), then points on top. Callers handle the 0/1-point cases. */
private fun DrawScope.drawTrendSeries(
    offsets: List<Offset>,
    color: Color,
    style: GraphStyle,
    pointRadiusDp: Float,
    lineStrokeDp: Float = 2f,
) {
    if (offsets.isEmpty()) return
    if (style == GraphStyle.LINE_FILL || style == GraphStyle.SMOOTH_FILL) {
        val fill = seriesFillPath(offsets, style == GraphStyle.SMOOTH_FILL, size.height)
        drawPath(fill, Brush.verticalGradient(listOf(color.copy(alpha = 0.16f), Color.Transparent)))
    }
    if (style != GraphStyle.DOTS) {
        drawPath(
            seriesPath(offsets, style == GraphStyle.SMOOTH_FILL),
            color,
            style = Stroke(lineStrokeDp.dp.toPx(), cap = StrokeCap.Round),
        )
    }
    offsets.forEach { drawCircle(color, radius = pointRadiusDp.dp.toPx(), center = it) }
}

/**
 * Window min/max expanded 12% of the span to each side, then rounded outward
 * to [step] — dots never pin to the plot edges and the axis labels get round
 * numbers. Flat series still spread over at least one step.
 */
private fun paddedRange(values: List<Double>, step: Double): Pair<Double, Double> {
    if (values.isEmpty()) return 0.0 to step
    val lo = values.min()
    val hi = values.max()
    val pad = ((hi - lo).coerceAtLeast(step)) * 0.12
    val loPadded = Math.floor((lo - pad) / step) * step
    val hiPadded = Math.ceil((hi + pad) / step) * step
    return loPadded to hiPadded
}

/** Three small y-axis value labels (top/middle/bottom) beside a chart of [height] dp. */
@Composable
private fun AxisLabels(top: String, mid: String, bottom: String, height: Int) {
    Column(
        Modifier
            .width(34.dp)
            .height(height.dp)
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(top, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(mid, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(bottom, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** One labelled single-series gradient chart — a stacked half of [HealthTrendChart]. */
@Composable
private fun MiniTrend(
    label: String,
    color: Color,
    values: List<Double>,
    baseline: Double?,
    step: Double,
    height: Int,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val (lo, hi) = paddedRange(values, step = step)

    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = labelColor)
        Row(Modifier.fillMaxWidth()) {
            if (values.isNotEmpty()) {
                AxisLabels(
                    top = hi.roundToInt().toString(),
                    mid = ((lo + hi) / 2).roundToInt().toString(),
                    bottom = lo.roundToInt().toString(),
                    height = height,
                )
            }
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .height(height.dp),
            ) {
                val w = size.width
                val h = size.height
                val padTop = 6f
                val padBottom = 4f
                val plotH = h - padTop - padBottom
                if (values.isEmpty()) return@Canvas
                val maxX = (values.size - 1).coerceAtLeast(1)

                fun px(i: Int) = i.toFloat() / maxX * w
                fun py(v: Double) = padTop + (1f - ((v - lo) / (hi - lo)).toFloat().coerceIn(0f, 1f)) * plotH

                val offsets = values.mapIndexed { i, v -> Offset(px(i), py(v)) }
                drawPath(
                    seriesFillPath(offsets, smooth = false, bottomY = h),
                    Brush.verticalGradient(listOf(color.copy(alpha = 0.14f), Color.Transparent)),
                )
                drawPath(seriesPath(offsets, smooth = false), color, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
                baseline?.let { b ->
                    val y = py(b).coerceIn(padTop, padTop + plotH)
                    drawLine(
                        color.copy(alpha = 0.55f),
                        Offset(0f, y),
                        Offset(w, y),
                        1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 6.dp.toPx())),
                    )
                }
            }
            Spacer(Modifier.width(34.dp))
        }
    }
}

/**
 * Dual recovery trend as two stacked single-series charts — resting HR on
 * top, HRV below, each with its own padded y-range, real-value axis legend
 * and a dashed trailing-7-day-mean baseline. Normal axes everywhere (up =
 * higher value); the daily dots were dropped in favor of clean trend lines
 * with gradient fill.
 */
@Composable
fun HealthTrendChart(
    entries: List<DailyEntryEntity>,
    rhrBaseline: Double?,
    hrvBaseline: Double?,
    modifier: Modifier = Modifier,
    height: Int = 200,
) {
    val rhrColor = MaterialTheme.colorScheme.primary
    val hrvColor = MaterialTheme.colorScheme.tertiary

    Column(modifier) {
        MiniTrend(
            label = "Resting HR · bpm",
            color = rhrColor,
            values = entries.mapNotNull { it.restingHr?.toDouble() },
            baseline = rhrBaseline,
            step = 1.0,
            height = (height - 12) / 2,
        )
        Spacer(Modifier.height(8.dp))
        MiniTrend(
            label = "HRV · ms",
            color = hrvColor,
            values = entries.mapNotNull { it.hrvMs },
            baseline = hrvBaseline,
            step = 5.0,
            height = (height - 12) / 2,
        )

        // sparse x-axis labels: first / middle / last
        Row(Modifier.fillMaxWidth()) {
            val first = entries.firstOrNull()?.date?.let(::parseDay)
            val mid = entries.getOrNull(entries.size / 2)?.date?.let(::parseDay)
            val last = entries.lastOrNull()?.date?.let(::parseDay)
            if (first != null && last != null) {
                Text(first.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                if (entries.size >= 3 && mid != null) {
                    Text(mid.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.weight(1f))
                Text(last.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/**
 * Readiness score (0..100) rendered as data points, with subtle guide lines
 * at 65 / 80. Simpler sibling of [FitnessChart]: fixed scale, no series
 * toggles, no scrub.
 */
@Composable
fun ReadinessScoreChart(
    entries: List<DailyEntryEntity>,
    modifier: Modifier = Modifier,
    height: Int = 160,
    style: GraphStyle = GraphStyle.LINE_DOTS,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val scoreColor = ChartTsb

    val pts = entries.mapIndexedNotNull { i, e -> e.score?.let { i to it } }

    Column(modifier) {
        Row(Modifier.fillMaxWidth()) {
            AxisLabels(top = "100", mid = "50", bottom = "0", height = height)
        Canvas(
            modifier = Modifier
                .weight(1f)
                .height(height.dp),
        ) {
            val w = size.width
            val h = size.height
            val padTop = 8f
            val padBottom = 6f
            val plotH = h - padTop - padBottom
            val maxX = (entries.size - 1).coerceAtLeast(1)

            fun px(i: Int) = (if (entries.size <= 1) w / 2f else i.toFloat() / maxX * w)
            fun py(v: Double) = padTop + (1f - (v / 100.0).toFloat()) * plotH

            // guide lines at 65 / 80
            listOf(65.0, 80.0).forEach { g ->
                drawLine(
                    gridColor.copy(alpha = 0.6f),
                    Offset(0f, py(g)),
                    Offset(w, py(g)),
                    strokeWidth = 1f,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 6.dp.toPx())),
                )
            }

            if (pts.size < 2) {
                pts.forEach { (i, v) ->
                    drawCircle(scoreColor, radius = 3.5.dp.toPx(), center = Offset(px(i), py(v)))
                }
            } else {
                drawTrendSeries(
                    pts.map { (i, v) -> Offset(px(i), py(v)) },
                    scoreColor,
                    style,
                    pointRadiusDp = 3.5f,
                    lineStrokeDp = 2.2f,
                )
            }
        }

        // right-side spacer mirroring the label column so the plot stays centered
        Spacer(Modifier.width(34.dp))
        }
        // x-axis labels
        Row(Modifier.fillMaxWidth()) {
            val first = entries.firstOrNull()?.date?.let(::parseDay)
            val last = entries.lastOrNull()?.date?.let(::parseDay)
            if (first != null && last != null) {
                Text(
                    first.format(monthFmt),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    last.format(monthFmt),
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                )
            }
        }
    }
}

/**
 * Nightly sleep duration as a clean gradient trend line (same language as
 * the split recovery charts), with a dashed trailing-7-night-mean baseline
 * when available. Y axis is sleep minutes on a padded 30-minute-stepped
 * scale with real-value side labels; captions show the window in hours and
 * the baseline. Safe on 0/1 points (a lone point centers mid-height).
 */
@Composable
fun SleepDurationChart(
    entries: List<DailyEntryEntity>,
    baselineMinutes: Double?,
    modifier: Modifier = Modifier,
    height: Int = 160,
    style: GraphStyle = GraphStyle.LINE_DOTS,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val sleepColor = MaterialTheme.colorScheme.secondary

    val pts = entries.mapIndexedNotNull { i, e -> e.sleepMinutes?.let { i to it.toDouble() } }
    val values = pts.map { it.second }
    val (sleepLo, sleepHi) = paddedRange(values, step = 30.0)

    Column(modifier) {
        Row(Modifier.fillMaxWidth()) {
            AxisLabels(
                top = "${Format.oneDecimal(sleepHi / 60.0)}h",
                mid = "${Format.oneDecimal((sleepLo + sleepHi) / 2 / 60.0)}h",
                bottom = "${Format.oneDecimal(sleepLo / 60.0)}h",
                height = height,
            )
        Canvas(
            modifier = Modifier
                .weight(1f)
                .height(height.dp),
        ) {
            val w = size.width
            val h = size.height
            val padTop = 8f
            val padBottom = 6f
            val plotH = h - padTop - padBottom
            val maxX = (entries.size - 1).coerceAtLeast(1)

            fun px(i: Int) = (if (entries.size <= 1) w / 2f else i.toFloat() / maxX * w)
            fun py(v: Double) = padTop + (1f - ((v - sleepLo) / (sleepHi - sleepLo)).toFloat().coerceIn(0f, 1f)) * plotH

            // dashed baseline line (trailing 7-night mean)
            if (values.isNotEmpty()) {
                baselineMinutes?.let { b ->
                    val y = py(b).coerceIn(padTop, padTop + plotH)
                    drawLine(
                        sleepColor.copy(alpha = 0.55f),
                        Offset(0f, y),
                        Offset(w, y),
                        1.2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 6.dp.toPx())),
                    )
                }
            }

            when {
                pts.isEmpty() -> Unit
                pts.size == 1 -> drawCircle(
                    sleepColor,
                    radius = 3.dp.toPx(),
                    center = Offset(
                        if (entries.size <= 1) w / 2f else px(pts[0].first),
                        padTop + plotH / 2,
                    ),
                )
                else -> {
                    // same gradient-trend language as the split recovery charts
                    val offsets = pts.map { (i, v) -> Offset(px(i), py(v)) }
                    drawPath(
                        seriesFillPath(offsets, smooth = false, bottomY = h),
                        Brush.verticalGradient(listOf(sleepColor.copy(alpha = 0.14f), Color.Transparent)),
                    )
                    drawPath(seriesPath(offsets, smooth = false), sleepColor, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
                }
            }
        }

        // right-side spacer mirroring the label column so the plot stays centered
        Spacer(Modifier.width(34.dp))
        }

        // y-range captions: window min–max on the left, baseline on the right
        Row(Modifier.fillMaxWidth()) {
            Text(
                if (values.isEmpty()) ""
                else "${Format.oneDecimal(values.min() / 60.0)}–${Format.oneDecimal(values.max() / 60.0)} h",
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
            Spacer(Modifier.weight(1f))
            Text(
                baselineMinutes?.let { "ø ${Format.oneDecimal(it / 60.0)} h" } ?: "",
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
        }

        // sparse x-axis labels: first / middle / last
        Row(Modifier.fillMaxWidth()) {
            val first = entries.firstOrNull()?.date?.let(::parseDay)
            val mid = entries.getOrNull(entries.size / 2)?.date?.let(::parseDay)
            val last = entries.lastOrNull()?.date?.let(::parseDay)
            if (first != null && last != null) {
                Text(first.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
                Spacer(Modifier.weight(1f))
                if (entries.size >= 3 && mid != null) {
                    Text(mid.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
                }
                Spacer(Modifier.weight(1f))
                Text(last.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
            }
        }
    }
}

/** Mean share of a night's light+deep+rem total for one stage, in percent. */
private fun meanStageShare(
    nights: List<DailyEntryEntity>,
    selector: (DailyEntryEntity) -> Int?,
): Double? = nights.takeIf { it.isNotEmpty() }?.map { r ->
    val total = ((r.lightMinutes ?: 0) + (r.deepMinutes ?: 0) + (r.remMinutes ?: 0)).coerceAtLeast(1)
    (selector(r) ?: 0).toDouble() / total * 100.0
}?.average()

/**
 * Stacked sleep-stage bars for the last [nights] nights that report both a
 * total and at least one stage: LIGHT at the bottom, DEEP in the middle, REM
 * on top, each segment proportional to its minutes and bars scaled to the
 * tallest night (60% of the slot width). Sparse first/middle/last x labels
 * and a caption with the mean deep/REM share across the shown nights;
 * renders just the legend when no night qualifies.
 */
@Composable
fun SleepStagesChart(
    entries: List<DailyEntryEntity>,
    nights: Int = 14,
    modifier: Modifier = Modifier,
    height: Int = 150,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val lightColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.45f)
    val deepColor = MaterialTheme.colorScheme.primary
    val remColor = MaterialTheme.colorScheme.tertiary

    val rows = entries
        .filter {
            it.sleepMinutes != null &&
                (it.deepMinutes != null || it.remMinutes != null || it.lightMinutes != null)
        }
        .takeLast(nights)
    val totals = rows.map { (it.lightMinutes ?: 0) + (it.deepMinutes ?: 0) + (it.remMinutes ?: 0) }
    val maxTotal = (totals.maxOrNull() ?: 0).coerceAtLeast(1)
    val deepMeanPct = meanStageShare(rows) { it.deepMinutes }?.roundToInt()
    val remMeanPct = meanStageShare(rows) { it.remMinutes }?.roundToInt()

    Column(modifier) {
        // legend (mirrors HealthTrendChart)
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp),
        ) {
            listOf("Light" to lightColor, "Deep" to deepColor, "REM" to remColor)
                .forEachIndexed { i, (label, color) ->
                    if (i > 0) Spacer(Modifier.width(12.dp))
                    Canvas(Modifier.size(8.dp)) { drawCircle(color) }
                    Spacer(Modifier.width(4.dp))
                    Text(label, style = MaterialTheme.typography.labelMedium, color = labelColor)
                }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height.dp),
        ) {
            if (rows.isEmpty()) return@Canvas
            val plotH = size.height - 10f
            val slot = size.width / rows.size
            val bw = slot * 0.46f
            val corner = androidx.compose.ui.geometry.CornerRadius(3.dp.toPx())
            // faint baseline under the bars
            drawLine(
                gridColor.copy(alpha = 0.5f),
                Offset(0f, size.height - 3f),
                Offset(size.width, size.height - 3f),
                strokeWidth = 1f,
            )
            rows.forEachIndexed { i, r ->
                var y = size.height - 4f
                val x = i * slot + (slot - bw) / 2f
                // stacked bottom-up: LIGHT, then DEEP, then REM on top —
                // rounded rects with a 1.5px seam so the stages read apart
                listOf(
                    r.lightMinutes to lightColor,
                    r.deepMinutes to deepColor,
                    r.remMinutes to remColor,
                ).forEach { (minutes, color) ->
                    val m = minutes ?: 0
                    if (m > 0) {
                        val seg = m.toFloat() / maxTotal * plotH
                        y -= seg
                        drawRoundRect(
                            color,
                            topLeft = Offset(x, y),
                            size = androidx.compose.ui.geometry.Size(bw, (seg - 1.5f).coerceAtLeast(2f)),
                            cornerRadius = corner,
                        )
                    }
                }
            }
        }

        if (deepMeanPct != null && remMeanPct != null) {
            Text(
                "Deep ø $deepMeanPct% · REM ø $remMeanPct%",
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
        }

        // sparse x-axis labels: first / middle / last
        Row(Modifier.fillMaxWidth()) {
            val first = rows.firstOrNull()?.date?.let(::parseDay)
            val mid = rows.getOrNull(rows.size / 2)?.date?.let(::parseDay)
            val last = rows.lastOrNull()?.date?.let(::parseDay)
            if (first != null && last != null) {
                Text(first.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
                Spacer(Modifier.weight(1f))
                if (rows.size >= 3 && mid != null) {
                    Text(mid.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
                }
                Spacer(Modifier.weight(1f))
                Text(last.format(monthFmt), style = MaterialTheme.typography.labelSmall, color = labelColor)
            }
        }
    }
}
