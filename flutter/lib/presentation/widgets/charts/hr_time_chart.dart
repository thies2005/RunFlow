import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class HrTimeChart extends StatelessWidget {
  const HrTimeChart({
    required this.timeData,
    required this.hrData,
    super.key,
  });

  final List<double> timeData;
  final List<double> hrData;

  @override
  Widget build(BuildContext context) {
    if (timeData.isEmpty || hrData.isEmpty || timeData.length != hrData.length) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final maxHr = hrData.reduce((a, b) => a > b ? a : b);
    final minHr = hrData.reduce((a, b) => a < b ? a : b);
    final maxTime = timeData.last;

    final spots = <FlSpot>[];
    for (var i = 0; i < timeData.length; i++) {
      spots.add(FlSpot(timeData[i], hrData[i]));
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Heart Rate',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  minY: (minHr - 5).floorToDouble(),
                  maxY: (maxHr + 5).ceilToDouble(),
                  minX: 0,
                  maxX: maxTime,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 20,
                    getDrawingHorizontalLine: (value) => const FlLine(
                      color: AppColors.surfaceDarkVariant,
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text(
                          '${value.toInt()}',
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
                        reservedSize: 24,
                        interval: maxTime > 600 ? 600 : 120,
                        getTitlesWidget: (value, meta) {
                          final mins = (value / 60).floor();
                          return Text(
                            '${mins}m',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 10,
                            ),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppColors.error,
                      barWidth: 2,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          colors: [
                            AppColors.error.withValues(alpha: 0.3),
                            AppColors.error.withValues(alpha: 0.05),
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ],
                  lineTouchData: LineTouchData(
                    touchTooltipData: LineTouchTooltipData(
                      getTooltipItems: (spots) => spots
                          .map((s) => LineTooltipItem(
                                '${s.y.toInt()} bpm',
                                const TextStyle(color: Colors.white, fontSize: 12),
                              ))
                          .toList(),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
