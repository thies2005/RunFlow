package com.runflow2.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
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

/**
 * Dual-axis recovery trend over one shared date axis: resting HR (drawn
 * INVERTED — a lower RHR plots higher) and HRV, each normalized to its own
 * window min/max, with dashed trailing-7-day-mean baseline lines when
 * available. Draws whichever series has data; safe on 0/1 points.
 */
@Composable
fun HealthTrendChart(
    entries: List<DailyEntryEntity>,
    rhrBaseline: Double?,
    hrvBaseline: Double?,
    modifier: Modifier = Modifier,
    height: Int = 200,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val rhrColor = MaterialTheme.colorScheme.primary
    val hrvColor = MaterialTheme.colorScheme.tertiary

    val rhrPts = entries.mapIndexedNotNull { i, e -> e.restingHr?.let { i to it.toDouble() } }
    val hrvPts = entries.mapIndexedNotNull { i, e -> e.hrvMs?.let { i to it } }
    val rhrValues = rhrPts.map { it.second }
    val hrvValues = hrvPts.map { it.second }

    Column(modifier) {
        // legend (mirrors FitnessChart)
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp),
        ) {
            buildList {
                if (rhrValues.isNotEmpty()) add("RHR" to rhrColor)
                if (hrvValues.isNotEmpty()) add("HRV" to hrvColor)
            }.forEachIndexed { i, (label, color) ->
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
            val w = size.width
            val h = size.height
            val padTop = 10f
            val padBottom = 8f
            val plotH = h - padTop - padBottom
            val maxX = (entries.size - 1).coerceAtLeast(1)

            fun px(i: Int) = i.toFloat() / maxX * w
            // inverted: min RHR at the top, max at the bottom
            fun rhrPy(v: Double) = padTop + normFrac(rhrValues, v) * plotH
            fun hrvPy(v: Double) = padTop + (1f - normFrac(hrvValues, v)) * plotH

            // subtle mid gridline
            drawLine(
                gridColor.copy(alpha = 0.35f),
                Offset(0f, padTop + plotH / 2),
                Offset(w, padTop + plotH / 2),
                strokeWidth = 1f,
            )

            fun drawSeries(pts: List<Pair<Int, Double>>, py: (Double) -> Float, color: Color, strokeDp: Float) {
                when {
                    pts.isEmpty() -> Unit
                    pts.size == 1 -> drawCircle(
                        color,
                        radius = 3.dp.toPx(),
                        center = Offset(
                            if (entries.size <= 1) w / 2f else px(pts[0].first),
                            padTop + plotH / 2,
                        ),
                    )
                    else -> {
                        val path = Path()
                        pts.forEachIndexed { k, (i, v) ->
                            val o = Offset(px(i), py(v))
                            if (k == 0) path.moveTo(o.x, o.y) else path.lineTo(o.x, o.y)
                        }
                        drawPath(path, color, style = Stroke(width = strokeDp.dp.toPx(), cap = StrokeCap.Round))
                    }
                }
            }

            // dashed baseline lines (trailing 7-day means)
            val dash = PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 6.dp.toPx()))
            if (rhrValues.isNotEmpty()) {
                rhrBaseline?.let { b ->
                    val y = rhrPy(b).coerceIn(padTop, padTop + plotH)
                    drawLine(rhrColor.copy(alpha = 0.55f), Offset(0f, y), Offset(w, y), 1.2.dp.toPx(), pathEffect = dash)
                }
            }
            if (hrvValues.isNotEmpty()) {
                hrvBaseline?.let { b ->
                    val y = hrvPy(b).coerceIn(padTop, padTop + plotH)
                    drawLine(hrvColor.copy(alpha = 0.55f), Offset(0f, y), Offset(w, y), 1.2.dp.toPx(), pathEffect = dash)
                }
            }

            drawSeries(hrvPts, ::hrvPy, hrvColor, strokeDp = 1.8f)
            drawSeries(rhrPts, ::rhrPy, rhrColor, strokeDp = 2.2f)
        }

        // y-range captions: RHR window on the left, HRV window on the right
        Row(Modifier.fillMaxWidth()) {
            Text(
                if (rhrValues.isEmpty()) "" else "RHR ${rhrValues.min().roundToInt()}–${rhrValues.max().roundToInt()}",
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
            Spacer(Modifier.weight(1f))
            Text(
                if (hrvValues.isEmpty()) "" else "HRV ${hrvValues.min().roundToInt()}–${hrvValues.max().roundToInt()}",
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

/**
 * Readiness score (0..100) line chart with subtle guide lines at 65 / 80.
 * Simpler sibling of [FitnessChart]: fixed scale, no series toggles, no scrub.
 */
@Composable
fun ReadinessScoreChart(
    entries: List<DailyEntryEntity>,
    modifier: Modifier = Modifier,
    height: Int = 160,
) {
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val scoreColor = ChartTsb

    val pts = entries.mapIndexedNotNull { i, e -> e.score?.let { i to it } }

    Column(modifier) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
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

            if (pts.isNotEmpty()) {
                val path = Path()
                val fillPath = Path()
                pts.forEachIndexed { k, (i, v) ->
                    val o = Offset(px(i), py(v))
                    if (k == 0) {
                        path.moveTo(o.x, o.y)
                        fillPath.moveTo(o.x, o.y)
                    } else {
                        path.lineTo(o.x, o.y)
                        fillPath.lineTo(o.x, o.y)
                    }
                }
                drawPath(
                    fillPath,
                    Brush.verticalGradient(listOf(scoreColor.copy(alpha = 0.10f), Color.Transparent)),
                )
                drawPath(path, scoreColor, style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round))
                if (pts.size == 1) {
                    drawCircle(scoreColor, radius = 4.dp.toPx(), center = Offset(px(pts[0].first), py(pts[0].second)))
                }
            }
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
