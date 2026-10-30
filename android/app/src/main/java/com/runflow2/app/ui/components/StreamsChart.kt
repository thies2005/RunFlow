package com.runflow2.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.math.StreamMath
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.ui.theme.semanticColors
import kotlin.math.roundToInt

private class MetricToggle(
    val key: String,
    val label: String,
    val color: Color,
    val enabled: Boolean,
)

/**
 * Interactive multi-series chart over activity streams — heart rate, pace,
 * GAP (grade-adjusted pace), elevation, cadence and power — the Android twin of the
 * web's InteractiveStreamsChart. Every series is normalized to its own domain
 * (the web hides one Y-axis per metric; here exact values surface in the
 * scrub readout instead). Tap or drag to scrub.
 */
@Composable
fun StreamsChart(
    series: StreamMath.Series,
    modifier: Modifier = Modifier,
    unit: DistanceUnit = DistanceUnit.METRIC,
    isRide: Boolean = false,
    height: Int = 220,
    onScrubChange: ((Float?) -> Unit)? = null,
) {
    val sem = MaterialTheme.semanticColors
    val hrColor = sem.streamHr
    val paceColor = sem.streamPace
    val gapColor = sem.streamGap
    val elevColor = sem.streamElev
    val cadenceColor = sem.streamCadence
    val powerColor = sem.streamPower

    val cadenceUnit = if (isRide || series.hasWatts) "rpm" else "spm"
    var showHr by remember { mutableStateOf(true) }
    var showPace by remember { mutableStateOf(true) }
    var showGap by remember { mutableStateOf(true) }
    var showElev by remember { mutableStateOf(true) }
    var showCadence by remember { mutableStateOf(false) }
    var showWatts by remember { mutableStateOf(true) }
    var scrubIndex by remember { mutableStateOf<Int?>(null) }

    val toggles = buildList {
        if (series.hasWatts) add(MetricToggle("watts", "Power", powerColor, showWatts))
        if (series.hasHr) add(MetricToggle("hr", "HR", hrColor, showHr))
        if (series.hasPace) add(MetricToggle("pace", "Pace", paceColor, showPace))
        if (series.hasGap) add(MetricToggle("gap", "GAP", gapColor, showGap))
        if (series.hasElevation) add(MetricToggle("elev", "Elevation", elevColor, showElev))
        if (series.hasCadence) add(MetricToggle("cadence", "Cadence", cadenceColor, showCadence))
    }

    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    val scrubColor = MaterialTheme.colorScheme.primary
    val n = series.time.size
    val idx = scrubIndex?.coerceIn(0, n - 1)

    Column(modifier = modifier) {
        // metric toggles
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(bottom = 8.dp),
        ) {
            items(toggles) { t ->
                FilterChip(
                    selected = t.enabled,
                    onClick = {
                        when (t.key) {
                            "watts" -> showWatts = !showWatts
                            "hr" -> showHr = !showHr
                            "pace" -> showPace = !showPace
                            "gap" -> showGap = !showGap
                            "elev" -> showElev = !showElev
                            "cadence" -> showCadence = !showCadence
                        }
                    },
                    label = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Canvas(Modifier.size(8.dp)) { drawCircle(t.color) }
                            Spacer(Modifier.width(6.dp))
                            Text(t.label)
                        }
                    },
                )
            }
        }

        // scrub readout (replaces the legend while scrubbing)
        Row(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (idx != null) {
                Text(
                    text = buildString {
                        append(Format.duration(series.time[idx].toLong()))
                        if (showWatts) series.watts?.getOrNull(idx)?.let { append("   Power ${it.roundToInt()} W") }
                        if (showHr) series.heartrate?.getOrNull(idx)?.let { append("   HR ${it.roundToInt()}") }
                        if (showPace) series.pace.getOrNull(idx)?.let { append("   Pace ${Format.pace(it * 60.0, unit)}") }
                        if (showGap) series.gap.getOrNull(idx)?.let { append("   GAP ${Format.pace(it * 60.0, unit)}") }
                        if (showElev) series.altitude?.getOrNull(idx)?.let { append("   ${it.roundToInt()} m") }
                        if (showCadence) series.cadence?.getOrNull(idx)?.let { append("   ${it.roundToInt()} $cadenceUnit") }
                    },
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                )
            } else {
                toggles.filter { it.enabled }.forEachIndexed { i, t ->
                    if (i > 0) Spacer(Modifier.width(12.dp))
                    Canvas(Modifier.size(8.dp)) { drawCircle(t.color) }
                    Spacer(Modifier.width(4.dp))
                    Text(t.label, style = MaterialTheme.typography.labelMedium, color = labelColor)
                }
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height.dp)
                .pointerInput(n) {
                    detectTapGestures { offset ->
                        val frac = (offset.x / size.width).coerceIn(0f, 1f)
                        scrubIndex = (frac * (n - 1)).roundToInt()
                        onScrubChange?.invoke(frac)
                    }
                }
                .pointerInput(n) {
                    detectDragGestures(
                        onDragEnd = {
                            scrubIndex = null
                            onScrubChange?.invoke(null)
                        },
                        onDragCancel = {
                            scrubIndex = null
                            onScrubChange?.invoke(null)
                        },
                    ) { change, _ ->
                        val frac = (change.position.x / size.width).coerceIn(0f, 1f)
                        scrubIndex = (frac * (n - 1)).roundToInt()
                        onScrubChange?.invoke(frac)
                        change.consume()
                    }
                },
        ) {
            if (n < 2) return@Canvas
            val w = size.width
            val h = size.height
            val padTop = 8f
            val padBottom = 6f

            fun px(i: Int) = i.toFloat() / (n - 1) * w

            /** min/max of a series with 8 % padding, or null when it has no spread. */
            fun domainOf(values: List<Double?>): Pair<Double, Double>? {
                var lo = Double.MAX_VALUE
                var hi = -Double.MAX_VALUE
                values.forEach { v ->
                    if (v != null && v.isFinite()) {
                        if (v < lo) lo = v
                        if (v > hi) hi = v
                    }
                }
                if (hi <= lo) return null
                val pad = (hi - lo) * 0.08
                return (lo - pad) to (hi + pad)
            }

            fun py(v: Double, dom: Pair<Double, Double>) =
                padTop + (1f - ((v - dom.first) / (dom.second - dom.first)).toFloat()) * (h - padTop - padBottom)

            fun drawValues(values: List<Double?>, color: Color, dom: Pair<Double, Double>, dashed: Boolean) {
                val path = Path()
                var started = false
                values.forEachIndexed { i, v ->
                    if (v == null || !v.isFinite()) return@forEachIndexed
                    val x = px(i)
                    val y = py(v, dom)
                    if (!started) {
                        path.moveTo(x, y)
                        started = true
                    } else {
                        path.lineTo(x, y)
                    }
                }
                if (!started) return
                drawPath(
                    path,
                    color,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        cap = StrokeCap.Round,
                        pathEffect = if (dashed) {
                            PathEffect.dashPathEffect(floatArrayOf(7.dp.toPx(), 5.dp.toPx()))
                        } else null,
                    ),
                )
            }

            // gridlines
            listOf(0.25f, 0.5f, 0.75f).forEach { frac ->
                val y = padTop + frac * (h - padTop - padBottom)
                drawLine(gridColor.copy(alpha = 0.5f), Offset(0f, y), Offset(w, y), strokeWidth = 1f)
            }

            // domains, one per enabled+available series
            val elevDom = if (showElev) series.altitude?.let { domainOf(it) } else null
            val paceDom = if (showPace) domainOf(series.pace) else null
            val gapDom = if (showGap) domainOf(series.gap) else null
            val cadDom = if (showCadence) series.cadence?.let { domainOf(it) } else null
            val hrDom = if (showHr) series.heartrate?.let { domainOf(it) } else null
            val wattsDom = if (showWatts) series.watts?.let { domainOf(it) } else null

            // z-order back to front, matching the web
            elevDom?.let { drawValues(series.altitude!!, elevColor, it, dashed = false) }
            paceDom?.let { drawValues(series.pace, paceColor, it, dashed = false) }
            gapDom?.let { drawValues(series.gap, gapColor, it, dashed = true) }
            cadDom?.let { drawValues(series.cadence!!, cadenceColor, it, dashed = true) }
            hrDom?.let { drawValues(series.heartrate!!, hrColor, it, dashed = false) }
            wattsDom?.let { drawValues(series.watts!!, powerColor, it, dashed = false) }

            // scrubber line + per-series dots
            idx?.let { i ->
                val x = px(i)
                drawLine(
                    scrubColor.copy(alpha = 0.8f),
                    Offset(x, 0f),
                    Offset(x, h),
                    strokeWidth = 1.5.dp.toPx(),
                )
                fun dot(v: Double?, dom: Pair<Double, Double>?, color: Color) {
                    if (dom == null || v == null || !v.isFinite()) return
                    drawCircle(color, radius = 5.dp.toPx(), center = Offset(x, py(v, dom)))
                }
                dot(series.altitude?.getOrNull(i), elevDom, elevColor)
                dot(series.pace.getOrNull(i), paceDom, paceColor)
                dot(series.gap.getOrNull(i), gapDom, gapColor)
                dot(series.cadence?.getOrNull(i), cadDom, cadenceColor)
                dot(series.heartrate?.getOrNull(i), hrDom, hrColor)
                dot(series.watts?.getOrNull(i), wattsDom, powerColor)
            }
        }

        // x-axis labels
        Row(Modifier.fillMaxWidth()) {
            Text(
                Format.duration(series.time.first().toLong()),
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
            Spacer(Modifier.weight(1f))
            Text(
                Format.duration(series.time.last().toLong()),
                style = MaterialTheme.typography.labelSmall,
                color = labelColor,
            )
        }
    }
}
