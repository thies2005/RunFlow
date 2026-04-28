import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class PaceChart extends StatelessWidget {
  const PaceChart({
    required this.timeData,
    required this.velocityData,
    super.key,
  });

  final List<double> timeData;
  final List<double> velocityData;

  @override
  Widget build(BuildContext context) {
    if (timeData.isEmpty || velocityData.isEmpty || timeData.length != velocityData.length) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final maxTime = timeData.last;

    final paceSpots = <FlSpot>[];
    for (var i = 0; i < timeData.length; i++) {
      if (velocityData[i] > 0.5) {
        paceSpots.add(FlSpot(timeData[i], velocityData[i] * 3.6));
      }
    }

    if (paceSpots.isEmpty) return const SizedBox.shrink();

    final speeds = paceSpots.map((s) => s.y).toList();
    final minSpeed = speeds.reduce((a, b) => a < b ? a : b);
    final maxSpeed = speeds.reduce((a, b) => a > b ? a : b);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Speed',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  minY: (minSpeed * 0.8).floorToDouble(),
                  maxY: (maxSpeed * 1.2).ceilToDouble(),
                  minX: 0,
                  maxX: maxTime,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text(
                          value.toStringAsFixed(1),
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
                      spots: paceSpots,
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 2,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary.withValues(alpha: 0.2),
                            AppColors.primary.withValues(alpha: 0.02),
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
                                '${s.y.toStringAsFixed(1)} km/h',
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
