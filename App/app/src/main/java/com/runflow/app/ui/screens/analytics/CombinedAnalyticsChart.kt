package com.runflow.app.ui.screens.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.runflow.app.data.model.AnalyticsStats
import com.runflow.app.data.model.TimeRange
import com.runflow.app.ui.theme.FatigueOrange
import com.runflow.app.ui.theme.FitnessGreen
import com.runflow.app.ui.theme.FormCyan
import com.runflow.app.ui.theme.FormRed
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.abs

@Composable
fun CombinedAnalyticsChart(
    data: AnalyticsStats,
    selectedTimeRange: TimeRange,
    onTimeRangeSelected: (TimeRange) -> Unit,
    modifier: Modifier = Modifier
) {
    // Metric visibility states
    var showVo2max by remember { mutableStateOf(true) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }
    var showVolume by remember { mutableStateOf(false) }
    var showDuration by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Combined Analytics Overview",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                
                // Time Range Selector
                Row(
                    modifier = Modifier
                        .border(1.dp, Color.Gray.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .clip(RoundedCornerShape(8.dp))
                ) {
                    listOf(
                        TimeRange.MONTH to "1M",
                        TimeRange.THREE_MONTHS to "3M",
                        TimeRange.SIX_MONTHS to "6M",
                        TimeRange.YEAR to "1Y",
                        TimeRange.ALL to "ALL"
                    ).forEachIndexed { index, (range, label) ->
                        if (index > 0) {
                            VerticalDivider(
                                modifier = Modifier
                                    .height(24.dp)
                                    .width(1.dp),
                                color = Color.Gray.copy(alpha = 0.5f)
                            )
                        }
                        Box(
                            modifier = Modifier
                                .background(
                                    if (selectedTimeRange == range) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                                    else Color.Transparent
                                )
                                .clickable { onTimeRangeSelected(range) }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = if (selectedTimeRange == range) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedTimeRange == range) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Metric Toggles
            @OptIn(ExperimentalLayoutApi::class)
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricToggle("VO2max", showVo2max, Color(0xFFFFC107)) { showVo2max = it }
                MetricToggle("Fitness (CTL)", showCtl, FitnessGreen) { showCtl = it }
                MetricToggle("Fatigue (ATL)", showAtl, FatigueOrange) { showAtl = it }
                MetricToggle("Form (TSB)", showTsb, FormCyan) { showTsb = it }
                MetricToggle("Weekly Volume (km)", showVolume, Color.Gray) { showVolume = it }
                MetricToggle("Training Time (h)", showDuration, Color.DarkGray) { showDuration = it }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Chart
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            ) {
                RobustMultiAxisChartCanvas(
                    data = data,
                    showVo2max = showVo2max,
                    showCtl = showCtl,
                    showAtl = showAtl,
                    showTsb = showTsb,
                    showVolume = showVolume,
                    showDuration = showDuration
                )
            }
        }
    }
}

@Composable
fun MetricToggle(
    label: String,
    isSelected: Boolean,
    color: Color,
    onToggle: (Boolean) -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = { onToggle(!isSelected) },
        label = { Text(label) },
        leadingIcon = {
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(color)
                )
            }
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Color.Transparent, 
            selectedLabelColor = MaterialTheme.colorScheme.onSurface,
            selectedLeadingIconColor = color,
            disabledContainerColor = Color.Transparent,
            containerColor = Color.Transparent
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = true,
            selected = isSelected,
            borderColor = if (isSelected) color else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
        )
    )
}

@Composable
fun MultiAxisChartCanvas(
    data: AnalyticsStats,
    showVo2max: Boolean,
    showCtl: Boolean,
    showAtl: Boolean,
    showTsb: Boolean,
    showVolume: Boolean,
    showDuration: Boolean
) {
    val textMeasurer = androidx.compose.ui.text.rememberTextMeasurer()
    val axisLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    
    Canvas(modifier = Modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val paddingStart = 40.dp.toPx()
        val paddingEnd = 40.dp.toPx()
        val paddingBottom = 30.dp.toPx()
        val paddingTop = 10.dp.toPx()
        
        val chartWidth = width - paddingStart - paddingEnd
        val chartHeight = height - paddingTop - paddingBottom
        
        // --- 1. Filter and Prepare Points ---
        // For simplicity, assuming data.*History lists are aligned by date or covering same range
        // In reality, we might need to unify dates. 
        // Using CTL history as "master" timeline if available, else others.
        
        val ctlPoints = data.ctlHistory
        if (ctlPoints.isEmpty()) return@Canvas // Or handle empty state
        
        val dates = ctlPoints.map { it.date }
        val dateCount = dates.size
        
        // --- 2. Determine Y-Axis Ranges ---
        // Left Axis: CTL, ATL, VO2max
        val leftValues = mutableListOf<Float>()
        if (showCtl) leftValues.addAll(data.ctlHistory.map { it.value })
        if (showAtl) leftValues.addAll(data.atlHistory.map { it.value })
        if (showVo2max) leftValues.addAll(data.vo2maxHistory.map { it.vo2max })
        // TSB also fits here usually, but user asked for dual axis styling often putting TSB on right or separate.
        // Let's put TSB on Right Axis.
        
        val rightValues = mutableListOf<Float>()
        if (showTsb) rightValues.addAll(data.tsbHistory.map { it.value })
        
        val leftMin = (leftValues.minOrNull() ?: 0f) * 0.9f
        val leftMax = (leftValues.maxOrNull() ?: 100f) * 1.1f
        val leftRange = (leftMax - leftMin).coerceAtLeast(1f)

        // Symmetric TSB range usually looks best centered at 0
        val tsbMaxAbs = rightValues.map { abs(it) }.maxOrNull() ?: 20f
        val rightMin = -tsbMaxAbs * 1.5f // give some headroom
        val rightMax = tsbMaxAbs * 1.5f
        val rightRange = (rightMax - rightMin).coerceAtLeast(1f)

        // Volume / Duration (Bars?) - Scale to full height but drawn at bottom/overlay
        // Let's normalize them to chart height 0-1
        val volValues = if(showVolume) data.weeklyMileageHistory.map { it.mileage } else emptyList()
        val durValues = if(showDuration) data.totalTimeHistory.map { it.seconds / 3600f } else emptyList()
        
        val volMax = (volValues.maxOrNull() ?: 1f) * 1.2f
        val durMax = (durValues.maxOrNull() ?: 1f) * 1.2f

        // --- 3. Draw Grid & Axes ---
        // Draw horizontal grid lines based on Left Axis
        val gridSteps = 5
        for (i in 0..gridSteps) {
            val ratio = i.toFloat() / gridSteps
            val y = height - paddingBottom - (ratio * chartHeight)
            val leftVal = leftMin + ratio * leftRange
            val rightVal = rightMin + ratio * rightRange
            
            // Grid line
            drawLine(
                color = Color.Gray.copy(alpha = 0.1f),
                start = Offset(paddingStart, y),
                end = Offset(width - paddingEnd, y)
            )
            
            // Left Label
            val leftLabel = String.format("%.0f", leftVal)
            drawContext.canvas.nativeCanvas.drawText(
                leftLabel,
                paddingStart - 10f,
                y + 10f,
                android.graphics.Paint().apply {
                    color = axisLabelColor.toArgb()
                    textAlign = android.graphics.Paint.Align.RIGHT
                    textSize = 10.sp.toPx()
                }
            )
            
            // Right Label (TSB)
            if (showTsb) {
                 val rightLabel = String.format("%.0f", rightVal)
                 drawContext.canvas.nativeCanvas.drawText(
                    rightLabel,
                    width - paddingEnd + 10f,
                    y + 10f,
                    android.graphics.Paint().apply {
                        color = axisLabelColor.toArgb() // Could use TSB color
                        textAlign = android.graphics.Paint.Align.LEFT
                        textSize = 10.sp.toPx()
                    }
                )
            }
        }

        // --- 4. Draw Date Labels (X-Axis) ---
        // Show ~5 labels
        val dateStep = (dateCount / 5).coerceAtLeast(1)
        for (i in 0 until dateCount step dateStep) {
            val dateStr = dates[i] // "YYYY-MM-DD"
            val parsedDate = try { LocalDate.parse(dateStr) } catch(e:Exception) { null }
            val label = parsedDate?.format(DateTimeFormatter.ofPattern("MMM d")) ?: dateStr
            
            val x = paddingStart + (i.toFloat() / (dateCount - 1)) * chartWidth
            
            drawContext.canvas.nativeCanvas.drawText(
                label,
                x,
                height - 5f,
                android.graphics.Paint().apply {
                    color = axisLabelColor.toArgb()
                    textAlign = android.graphics.Paint.Align.CENTER
                    textSize = 10.sp.toPx()
                }
            )
        }

        // --- 5. Draw Charts ---
        
        // Helper to get X coordinate
        fun getX(index: Int): Float = paddingStart + (index.toFloat() / (dateCount - 1)) * chartWidth
        
        // Helper to draw line
        fun drawLineChart(data: List<Float>, min: Float, range: Float, color: Color) {
            if (data.isEmpty()) return
            val path = Path()
            data.forEachIndexed { index, value ->
                val x = getX(index)
                val y = height - paddingBottom - ((value - min) / range) * chartHeight
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(
                path = path,
                color = color,
                style = Stroke(width = 2.dp.toPx())
            )
        }

        // Weekly Volume (Bars)
        if (showVolume && data.weeklyMileageHistory.isNotEmpty()) {
            val barWidth = (chartWidth / data.weeklyMileageHistory.size) * 0.6f
            data.weeklyMileageHistory.forEachIndexed { index, item ->
                 val x = getX(index) // This is centered if matching dates
                 // NOTE: Weekly data might not match daily data points 1:1. 
                 // Assuming here we are overlaying approx. 
                 // Ideally we'd map dates correctly. For now, drawing spread out.
                 
                 val barHeight = (item.mileage / volMax) * chartHeight
                 drawRect(
                     color = Color.Gray.copy(alpha = 0.3f),
                     topLeft = Offset(x - barWidth/2, height - paddingBottom - barHeight),
                     size = Size(barWidth, barHeight)
                 )
            }
        }
        
        // TSB (Right Axis) - Filled area often looks nice, or line
        if (showTsb) {
            val tsbPath = Path()
            val zeroY = height - paddingBottom - ((0 - rightMin) / rightRange) * chartHeight
            
            data.tsbHistory.forEachIndexed { index, item ->
                val x = getX(index)
                val y = height - paddingBottom - ((item.value - rightMin) / rightRange) * chartHeight
                if (index == 0) tsbPath.moveTo(x, y) else tsbPath.lineTo(x, y)
            }
            // Optional: Draw Line
            drawPath(
                path = tsbPath,
                color = FormCyan,
                style = Stroke(width = 2.dp.toPx())
            )
        }

        if (showCtl) {
            drawLineChart(data.ctlHistory.map { it.value }, leftMin, leftRange, FitnessGreen)
        }
        if (showAtl) {
            drawLineChart(data.atlHistory.map { it.value }, leftMin, leftRange, FatigueOrange)
        }
        if (showVo2max) {
             drawLineChart(data.vo2maxHistory.map { it.vo2max }, leftMin, leftRange, Color(0xFFFFC107))
        }
    }
}

@Composable
fun RobustMultiAxisChartCanvas(
    data: AnalyticsStats,
    showVo2max: Boolean,
    showCtl: Boolean,
    showAtl: Boolean,
    showTsb: Boolean,
    showVolume: Boolean,
    showDuration: Boolean
) {
    val axisLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    
    Canvas(modifier = Modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height
        val paddingStart = 40.dp.toPx()
        val paddingEnd = 40.dp.toPx()
        val paddingBottom = 30.dp.toPx()
        val paddingTop = 10.dp.toPx()
        
        val chartWidth = width - paddingStart - paddingEnd
        val chartHeight = height - paddingTop - paddingBottom
        
        // --- 1. Filter and Prepare Points ---
        // Collect ALL dates from enabled datasets to form the master timeline
        val allDates = mutableSetOf<String>()
        if (showCtl) allDates.addAll(data.ctlHistory.map { it.date })
        if (showAtl) allDates.addAll(data.atlHistory.map { it.date })
        if (showTsb) allDates.addAll(data.tsbHistory.map { it.date })
        if (showVo2max) allDates.addAll(data.vo2maxHistory.map { it.date })
        
        // Sort unique dates to create the X-axis
        val sortedDates = allDates.toList().sorted()
        
        val dateCount = sortedDates.size.coerceAtLeast(1)
        val dateToIndex = sortedDates.mapIndexed { index, date -> date to index }.toMap()


        // --- 2. Determine Y-Axis Ranges ---
        // Left Axis: CTL, ATL, VO2max
        val leftValues = mutableListOf<Float>()
        if (showCtl) leftValues.addAll(data.ctlHistory.map { it.value })
        if (showAtl) leftValues.addAll(data.atlHistory.map { it.value })
        if (showVo2max) leftValues.addAll(data.vo2maxHistory.map { it.vo2max })
        
        val leftMin = (leftValues.minOrNull() ?: 0f) * 0.9f
        val leftMax = (leftValues.maxOrNull() ?: 100f) * 1.1f
        val leftRange = (leftMax - leftMin).coerceAtLeast(1f)

        // Right Axis: TSB
        val rightValues = mutableListOf<Float>()
        if (showTsb) rightValues.addAll(data.tsbHistory.map { it.value })
        
        val tsbMaxAbs = rightValues.map { abs(it) }.maxOrNull() ?: 20f
        val safeTsbMax = if(tsbMaxAbs < 1f) 20f else tsbMaxAbs
        val rightMin = -safeTsbMax * 1.5f 
        val rightMax = safeTsbMax * 1.5f
        val rightRange = (rightMax - rightMin).coerceAtLeast(1f)


        // --- 3. Draw Grid & Axes ---
        val gridSteps = 5
        for (i in 0..gridSteps) {
            val ratio = i.toFloat() / gridSteps
            val y = height - paddingBottom - (ratio * chartHeight)
            val leftVal = leftMin + ratio * leftRange
            val rightVal = rightMin + ratio * rightRange
            
            // Grid line
            drawLine(
                color = Color.Gray.copy(alpha = 0.1f),
                start = Offset(paddingStart, y),
                end = Offset(width - paddingEnd, y)
            )
            
            // Left Label
            val leftLabel = String.format("%.0f", leftVal)
            drawContext.canvas.nativeCanvas.drawText(
                leftLabel,
                paddingStart - 10f,
                y + 10f,
                android.graphics.Paint().apply {
                    color = axisLabelColor.toArgb()
                    textAlign = android.graphics.Paint.Align.RIGHT
                    textSize = 30f // approx 10.sp
                }
            )
            
            // Right Label (TSB)
            if (showTsb) {
                 val rightLabel = String.format("%.0f", rightVal)
                 drawContext.canvas.nativeCanvas.drawText(
                    rightLabel,
                    width - paddingEnd + 10f,
                    y + 10f,
                    android.graphics.Paint().apply {
                        color = axisLabelColor.toArgb()
                        textAlign = android.graphics.Paint.Align.LEFT
                        textSize = 30f
                    }
                )
            }
        }

        // --- 4. Draw Date Labels (X-Axis) ---
        if (sortedDates.isNotEmpty()) {
            val dateStep = (dateCount / 5).coerceAtLeast(1)
            for (i in 0 until dateCount step dateStep) {
                val dateStr = sortedDates[i] 
                val parsedDate = try { LocalDate.parse(dateStr) } catch(e:Exception) { null }
                val label = parsedDate?.format(DateTimeFormatter.ofPattern("MMM d")) ?: dateStr
                
                val x = paddingStart + (i.toFloat() / (dateCount - 1)) * chartWidth
                
                drawContext.canvas.nativeCanvas.drawText(
                    label,
                    x,
                    height - 5f,
                    android.graphics.Paint().apply {
                        color = axisLabelColor.toArgb()
                        textAlign = android.graphics.Paint.Align.CENTER
                        textSize = 30f
                    }
                )
            }
        }

        // --- 5. Draw Charts ---
        fun getX(dateLabel: String): Float? {
            val index = dateToIndex[dateLabel] ?: return null
            if (dateCount <= 1) return paddingStart + chartWidth / 2
            return paddingStart + (index.toFloat() / (dateCount - 1)) * chartWidth
        }
        
        // TSB (Right Axis)
        if (showTsb && data.tsbHistory.isNotEmpty()) {
             val path = Path()
             var isFirst = true
             data.tsbHistory
                 .filter { dateToIndex.containsKey(it.date) }
                 .sortedBy { dateToIndex[it.date] }
                 .forEach { point ->
                     val x = getX(point.date)
                     if (x != null) {
                         val y = height - paddingBottom - ((point.value - rightMin) / rightRange) * chartHeight
                         if (isFirst) { path.moveTo(x, y); isFirst = false } else path.lineTo(x, y)
                     }
                 }
             if (!isFirst) {
                drawPath(path = path, color = FormCyan, style = Stroke(width = 5f))
             }
        }

        // Left Axis Lines
        if (showCtl && data.ctlHistory.isNotEmpty()) {
             val path = Path()
             var isFirst = true
             data.ctlHistory
                 .filter { dateToIndex.containsKey(it.date) }
                 .sortedBy { dateToIndex[it.date] }
                 .forEach { point ->
                    val x = getX(point.date)
                     if (x != null) {
                         val y = height - paddingBottom - ((point.value - leftMin) / leftRange) * chartHeight
                         if (isFirst) { path.moveTo(x, y); isFirst = false } else path.lineTo(x, y)
                     }
                 }
             if (!isFirst) {
                drawPath(path = path, color = FitnessGreen, style = Stroke(width = 5f))
             }
        }
        
        if (showAtl && data.atlHistory.isNotEmpty()) {
             val path = Path()
             var isFirst = true
             data.atlHistory
                 .filter { dateToIndex.containsKey(it.date) }
                 .sortedBy { dateToIndex[it.date] }
                 .forEach { point ->
                    val x = getX(point.date)
                     if (x != null) {
                         val y = height - paddingBottom - ((point.value - leftMin) / leftRange) * chartHeight
                         if (isFirst) { path.moveTo(x, y); isFirst = false } else path.lineTo(x, y)
                     }
                 }
             if (!isFirst) {
                drawPath(path = path, color = FatigueOrange, style = Stroke(width = 5f))
             }
        }
        
        if (showVo2max && data.vo2maxHistory.isNotEmpty()) {
             val path = Path()
             var isFirst = true
             data.vo2maxHistory
                 .filter { dateToIndex.containsKey(it.date) }
                 .sortedBy { dateToIndex[it.date] }
                 .forEach { point ->
                    val x = getX(point.date)
                     if (x != null) {
                         val y = height - paddingBottom - ((point.vo2max - leftMin) / leftRange) * chartHeight
                         if (isFirst) { path.moveTo(x, y); isFirst = false } else path.lineTo(x, y)
                     }
                 }
             if (!isFirst) {
                drawPath(path = path, color = Color(0xFFFFC107), style = Stroke(width = 5f))
             }
        }
        
        // --- 6. Empty State Message ---
        if (sortedDates.isEmpty()) {
            val msg = "No chart data available"
            val paint = android.graphics.Paint().apply {
                color = axisLabelColor.toArgb()
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = 40f
            }
            drawContext.canvas.nativeCanvas.drawText(
                msg,
                width / 2,
                height / 2,
                paint
            )
        }
    }
}
