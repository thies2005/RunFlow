import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/analytics_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';

class Vo2ShapeTrendChart extends ConsumerWidget {
  const Vo2ShapeTrendChart({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(analyticsStatsProvider);
    final selectedDays = ref.watch(selectedDateRangeProvider);
    final historyAsync = ref.watch(analyticsHistoryProvider(days: selectedDays));

    return statsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (stats) => historyAsync.when(
        loading: () => const SizedBox.shrink(),
        error: (_, _) => const SizedBox.shrink(),
        data: (history) => _buildChart(context, history, stats),
      ),
    );
  }

  Widget _buildChart(BuildContext context, List<FitnessHistory> history, AnalyticsStats stats) {
    final theme = Theme.of(context);

    if (history.isEmpty) return const SizedBox.shrink();

    final vo2Spots = <FlSpot>[];
    final shapeSpots = <FlSpot>[];

    for (var i = 0; i < history.length; i++) {
      vo2Spots.add(FlSpot(i.toDouble(), stats.effectiveVO2max));
      shapeSpots.add(FlSpot(i.toDouble(), stats.marathonShape * 100));
    }

    final allY = [
      ...vo2Spots.map((e) => e.y),
      ...shapeSpots.map((e) => e.y),
    ];
    final minY = allY.reduce((a, b) => a < b ? a : b) - 5;
    final maxY = allY.reduce((a, b) => a > b ? a : b) + 5;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'VO2max & Shape Trend',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _legendItem(const Color(0xFFF59E0B), 'VO2max'),
                const SizedBox(width: 16),
                _legendItem(const Color(0xFF8B5CF6), 'Shape %'),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  minY: minY,
                  maxY: maxY,
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipItems: (spots) {
                        return spots.map((spot) {
                          final color = spot.barIndex == 0
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFF8B5CF6);
                          return LineTooltipItem(
                            spot.y.toStringAsFixed(1),
                            TextStyle(color: color, fontWeight: FontWeight.w600),
                          );
                        }).toList();
                      },
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.1),
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text(
                          value.toStringAsFixed(0),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: (history.length / 5).ceilToDouble(),
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= history.length) {
                            return const SizedBox.shrink();
                          }
                          final date = history[index].date;
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '${date.day}/${date.month}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 10,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    _buildLine(vo2Spots, const Color(0xFFF59E0B)),
                    _buildLine(shapeSpots, const Color(0xFF8B5CF6)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  LineChartBarData _buildLine(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      preventCurveOverShooting: true,
      color: color,
      barWidth: 2,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(
        show: true,
        color: color.withValues(alpha: 0.08),
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
