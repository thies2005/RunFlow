package com.runflow2.app.ui.screens.analytics

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsBike
import androidx.compose.material.icons.automirrored.outlined.DirectionsRun
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.runflow2.app.core.util.DistanceUnit
import com.runflow2.app.core.util.Format
import com.runflow2.app.data.db.ActivityEntity
import com.runflow2.app.domain.analytics.ActivityInput
import com.runflow2.app.domain.analytics.AnalyticsBundle
import com.runflow2.app.ui.components.PmcChart
import com.runflow2.app.ui.components.SectionTitle
import com.runflow2.app.ui.components.StatTile
import com.runflow2.app.ui.components.themedColor
import com.runflow2.app.ui.theme.semanticColors
import java.time.DayOfWeek
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun OverviewAnalyticsTab(
    bundle: AnalyticsBundle,
    activities: List<ActivityEntity>,
    unit: DistanceUnit,
    modifier: Modifier = Modifier,
) {
    var rangeDays by remember { mutableStateOf(90) }
    var showCtl by remember { mutableStateOf(true) }
    var showAtl by remember { mutableStateOf(true) }
    var showTsb by remember { mutableStateOf(true) }

    val today = remember { LocalDate.now() }
    val sem = MaterialTheme.semanticColors

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // 1. Combined Multi-Sport KPI Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SectionTitle("Training Volume")
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    StatTile(
                        label = "Run Distance",
                        value = Format.distance(bundle.totalRunKm, unit, 0),
                        icon = Icons.AutoMirrored.Outlined.DirectionsRun,
                        accent = MaterialTheme.colorScheme.primary,
                    )
                    StatTile(
                        label = "Bike Distance",
                        value = Format.distance(bundle.totalBikeKm, unit, 0),
                        icon = Icons.AutoMirrored.Outlined.DirectionsBike,
                        accent = MaterialTheme.semanticColors.streamPower,
                    )
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    StatTile(
                        label = "Activities",
                        value = "${bundle.totalActivities}",
                        icon = Icons.Outlined.Insights,
                    )
                    StatTile(
                        label = "Moving Time",
                        value = "${bundle.totalMovingHours.roundToInt()}h",
                        icon = Icons.Outlined.Timer,
                        accent = MaterialTheme.colorScheme.tertiary,
                    )
                }
            }
        }

        // 2. Performance Management Chart (PMC) with Future Race-Day Projection
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SectionTitle("Fitness & Form (PMC)")
                    Surface(
                        color = bundle.tsbStatus.themedColor(),
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            bundle.tsbStatus.label,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.surface,
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))

                // Metric Toggle Chips
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    FilterChip(
                        selected = showCtl,
                        onClick = { showCtl = !showCtl },
                        label = { Text("CTL ${bundle.ctl.roundToInt()}") },
                    )
                    FilterChip(
                        selected = showAtl,
                        onClick = { showAtl = !showAtl },
                        label = { Text("ATL ${bundle.atl.roundToInt()}") },
                    )
                    FilterChip(
                        selected = showTsb,
                        onClick = { showTsb = !showTsb },
                        label = { Text("TSB ${if (bundle.tsb >= 0) "+" else ""}${bundle.tsb.roundToInt()}") },
                    )
                }

                Spacer(Modifier.height(12.dp))

                val windowDaily = remember(bundle.daily, rangeDays) {
                    if (bundle.daily.size > rangeDays) {
                        bundle.daily.takeLast(rangeDays)
                    } else bundle.daily
                }

                PmcChart(
                    daily = windowDaily,
                    showCtl = showCtl,
                    showAtl = showAtl,
                    showTsb = showTsb,
                    futureDaily = bundle.futureDaily,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        // 3. Load & Overuse Risk Card (Ramp Rate, Monotony, Strain, ACWR)
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.TrendingUp,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            "Load & Injury Risk",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    val isHighRisk = bundle.acwr > 1.5 || bundle.ctlRampRate7d > 8.0 || bundle.fosterMonotony > 2.0
                    Surface(
                        color = if (isHighRisk) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            if (isHighRisk) "Elevated Risk" else "Optimal Load",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isHighRisk) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    val rampColor = when {
                        bundle.ctlRampRate7d > 8.0 -> MaterialTheme.colorScheme.error
                        bundle.ctlRampRate7d > 5.0 -> Color(0xFFFFA726)
                        else -> sem.good
                    }
                    StatTile(
                        label = "7d CTL Ramp",
                        value = "${if (bundle.ctlRampRate7d >= 0) "+" else ""}${"%.1f".format(bundle.ctlRampRate7d)} /wk",
                        icon = Icons.Outlined.TrendingUp,
                        accent = rampColor,
                    )

                    val acwrColor = when {
                        bundle.acwr > 1.5 -> MaterialTheme.colorScheme.error
                        bundle.acwr > 1.3 -> Color(0xFFFFA726)
                        bundle.acwr < 0.8 -> Color(0xFF42A5F5)
                        else -> sem.good
                    }
                    StatTile(
                        label = "ACWR (ATL/CTL)",
                        value = "%.2f".format(bundle.acwr),
                        icon = Icons.Outlined.Speed,
                        accent = acwrColor,
                    )
                }

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    val monotonyColor = when {
                        bundle.fosterMonotony > 2.0 -> MaterialTheme.colorScheme.error
                        bundle.fosterMonotony > 1.5 -> Color(0xFFFFA726)
                        else -> sem.good
                    }
                    StatTile(
                        label = "Monotony",
                        value = "%.2f".format(bundle.fosterMonotony),
                        icon = Icons.Outlined.Warning,
                        accent = monotonyColor,
                    )
                    StatTile(
                        label = "Foster Strain",
                        value = "${bundle.fosterStrain.roundToInt()}",
                        icon = Icons.Outlined.Bolt,
                        accent = MaterialTheme.colorScheme.tertiary,
                    )
                }

                Text(
                    text = when {
                        bundle.acwr > 1.5 -> "⚠️ High acute load spike (ACWR > 1.5). Consider an active recovery day to prevent overuse injury."
                        bundle.ctlRampRate7d > 8.0 -> "⚠️ Aggressive ramp rate (+8 CTL/wk). Monitor sleep and muscle soreness closely."
                        bundle.fosterMonotony > 2.0 -> "⚠️ High training monotony. Introduce polarized variation between easy and hard days."
                        else -> "✓ Training load progression is in the optimal adaptation zone."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // 4. Period Summaries with Year-over-Year (YoY) Deltas
        val periods = remember(activities, today) {
            calculatePeriodSummaries(activities, today)
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
            ),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionTitle("Period Summaries & YoY")

                periods.forEach { period ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(10.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                period.name,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (period.yoyDeltaPercent != null) {
                                val isPositive = period.yoyDeltaPercent >= 0
                                Surface(
                                    color = if (isPositive) sem.good.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(6.dp),
                                ) {
                                    Text(
                                        "${if (isPositive) "+" else ""}${"%.0f".format(period.yoyDeltaPercent)}% YoY",
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isPositive) sem.good else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                "${Format.distance(period.currentKm, unit, 1)}  ·  ${Format.duration(period.currentSec.toLong())}",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(
                                "${period.currentTss.roundToInt()} TSS",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        }
                    }
                }
            }
        }
    }
}

private data class PeriodSummary(
    val name: String,
    val currentKm: Double,
    val currentSec: Int,
    val currentTss: Double,
    val yoyDeltaPercent: Double?,
)

private fun calculatePeriodSummaries(
    activities: List<ActivityEntity>,
    today: LocalDate,
): List<PeriodSummary> {
    fun ActivityEntity.localDate(): LocalDate = Format.localDate(startDate)

    // 1. This Week (Monday to today) vs same week last year
    val weekStart = today.with(DayOfWeek.MONDAY)
    val lastYearWeekStart = weekStart.minusYears(1)
    val lastYearWeekEnd = lastYearWeekStart.plusDays(6)

    val thisWeekActs = activities.filter { !it.localDate().isBefore(weekStart) && !it.localDate().isAfter(today) }
    val lastYearWeekActs = activities.filter { !it.localDate().isBefore(lastYearWeekStart) && !it.localDate().isAfter(lastYearWeekEnd) }

    val thisWeekKm = thisWeekActs.sumOf { it.distanceKm }
    val thisWeekSec = thisWeekActs.sumOf { it.movingTimeSec }
    val thisWeekTss = thisWeekActs.sumOf { (it.bikeTss ?: 0.0).takeIf { t -> t > 0 } ?: (it.trimp * 0.85) }
    val lastYearWeekKm = lastYearWeekActs.sumOf { it.distanceKm }
    val weekYoy = if (lastYearWeekKm > 0.0) ((thisWeekKm - lastYearWeekKm) / lastYearWeekKm) * 100.0 else null

    // 2. This Month vs same month last year
    val monthStart = today.withDayOfMonth(1)
    val lastYearMonthStart = monthStart.minusYears(1)
    val lastYearMonthEnd = lastYearMonthStart.plusMonths(1).minusDays(1)

    val thisMonthActs = activities.filter { !it.localDate().isBefore(monthStart) && !it.localDate().isAfter(today) }
    val lastYearMonthActs = activities.filter { !it.localDate().isBefore(lastYearMonthStart) && !it.localDate().isAfter(lastYearMonthEnd) }

    val thisMonthKm = thisMonthActs.sumOf { it.distanceKm }
    val thisMonthSec = thisMonthActs.sumOf { it.movingTimeSec }
    val thisMonthTss = thisMonthActs.sumOf { (it.bikeTss ?: 0.0).takeIf { t -> t > 0 } ?: (it.trimp * 0.85) }
    val lastYearMonthKm = lastYearMonthActs.sumOf { it.distanceKm }
    val monthYoy = if (lastYearMonthKm > 0.0) ((thisMonthKm - lastYearMonthKm) / lastYearMonthKm) * 100.0 else null

    // 3. This Year (YTD) vs last year
    val yearStart = today.withDayOfYear(1)
    val lastYearStart = yearStart.minusYears(1)
    val lastYearSameDay = today.minusYears(1)

    val thisYearActs = activities.filter { !it.localDate().isBefore(yearStart) && !it.localDate().isAfter(today) }
    val lastYearActs = activities.filter { !it.localDate().isBefore(lastYearStart) && !it.localDate().isAfter(lastYearSameDay) }

    val thisYearKm = thisYearActs.sumOf { it.distanceKm }
    val thisYearSec = thisYearActs.sumOf { it.movingTimeSec }
    val thisYearTss = thisYearActs.sumOf { (it.bikeTss ?: 0.0).takeIf { t -> t > 0 } ?: (it.trimp * 0.85) }
    val lastYearKm = lastYearActs.sumOf { it.distanceKm }
    val yearYoy = if (lastYearKm > 0.0) ((thisYearKm - lastYearKm) / lastYearKm) * 100.0 else null

    return listOf(
        PeriodSummary("This Week", thisWeekKm, thisWeekSec, thisWeekTss, weekYoy),
        PeriodSummary("This Month", thisMonthKm, thisMonthSec, thisMonthTss, monthYoy),
        PeriodSummary("Year to Date", thisYearKm, thisYearSec, thisYearTss, yearYoy),
    )
}
